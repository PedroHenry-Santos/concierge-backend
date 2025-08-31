import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

import {
  ATTR_DEPLOYMENT_ENVIRONMENT,
  ATTR_SERVICE_NAMESPACE,
} from '@/infra/semconv';

const isProduction = process.env.NODE_ENV === 'production';
let sdk: NodeSDK | undefined;

export function initOpenTelemetry(): void {
  if (process.env.NODE_ENV === 'test' || sdk) {
    return;
  }

  const otlpTraceExporter = new OTLPTraceExporter({
    url: process.env.OTLP_TRACE_ENDPOINT ?? 'http://localhost:4317',
  });

  const otlpMetricExporter = new OTLPMetricExporter({
    url: process.env.OTLP_METRIC_ENDPOINT ?? 'http://localhost:4317',
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: otlpMetricExporter,
    exportIntervalMillis: 60_000,
  });

  sdk = new NodeSDK({
    traceExporter: otlpTraceExporter,
    metricReader: metricReader,
    contextManager: new AsyncLocalStorageContextManager(),
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-net': {
          enabled: false,
        },
      }),
      new NestInstrumentation(),
      new PgInstrumentation({
        enhancedDatabaseReporting: !isProduction,
        requireParentSpan: false,
        requestHook: (span) => {
          if (!isProduction) {
            span.setAttribute('db.slonik', true);
          }
        },
        responseHook: (span, response) => {
          if (
            response &&
            !isProduction &&
            typeof response === 'object' &&
            'rowCount' in response
          ) {
            span.setAttribute(
              'db.row_count',
              (response.rowCount as number) ?? 0,
            );
          }
        },
      }),
      new AwsInstrumentation({
        suppressInternalInstrumentation: true,
        preRequestHook: (span, request) => {
          if (
            request &&
            typeof request === 'object' &&
            'commandInput' in request
          ) {
            const commandInput = request.commandInput as Record<
              string,
              unknown
            >;
            const constructorName = (
              commandInput?.constructor as { name?: string }
            )?.name;
            if (constructorName?.includes('SQS')) {
              span.setAttribute('messaging.system', 'aws_sqs');
              span.setAttribute('messaging.whatsapp_backend', true);
            }
          }
        },
        sqsProcessHook: (span, message) => {
          if (message && typeof message === 'object') {
            const messageData = message as unknown as Record<string, unknown>;
            span.setAttribute(
              'sqs.message.id',
              (messageData.MessageId as string) ?? '',
            );
            span.setAttribute(
              'sqs.receipt.handle',
              (messageData.ReceiptHandle as string) ?? '',
            );

            const messageAttributes =
              (messageData.MessageAttributes as Record<string, unknown>) ?? {};
            const webhookType = messageAttributes.webhook_type as
              | { StringValue?: string }
              | undefined;
            if (webhookType?.StringValue) {
              span.setAttribute(
                'whatsapp.webhook.type',
                webhookType.StringValue ?? '',
              );
            }
          }
        },
        sqsExtractContextPropagationFromPayload: true,
      }),
      new PinoInstrumentation({
        logHook: (_span, record) => {
          const recordObject = record as Record<string, unknown>;
          recordObject['trace.correlation'] = true;
        },
      }),
    ],
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'whatsapp-backend',
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
      [ATTR_SERVICE_NAMESPACE]: 'concierge',
      [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
    }),
  });

  sdk.start();
}

export function getSdk(): NodeSDK | undefined {
  return sdk;
}
