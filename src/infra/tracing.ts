import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  ParentBasedSampler,
  Sampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
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

export interface OpenTelemetryOptions {
  serviceName?: string;
  serviceVersion?: string;
}

function createSampler(): Sampler {
  const samplingType = process.env.OTEL_SAMPLING_TYPE ?? 'parentBased';
  const samplingRatio = Number(
    process.env.OTEL_SAMPLING_RATIO ?? (isProduction ? '0.1' : '1'),
  );

  switch (samplingType) {
    case 'always': {
      return new AlwaysOnSampler();
    }
    case 'never': {
      return new AlwaysOffSampler();
    }
    case 'ratio': {
      return new TraceIdRatioBasedSampler(samplingRatio);
    }
    case 'parentBased': {
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(samplingRatio),
      });
    }
    default: {
      return new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(samplingRatio),
      });
    }
  }
}

export function initOpenTelemetry(options?: OpenTelemetryOptions): void {
  const otlpEnabled = process.env.OTLP_ENABLED !== 'false';
  if (!otlpEnabled) {
    console.log('OpenTelemetry initialization skipped: OTLP_ENABLED=false');
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  }

  if (process.env.NODE_ENV === 'test' || sdk) {
    return;
  }

  const otlpTraceExporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? 'http://localhost:4317',
  });
  const debugExporter = new ConsoleSpanExporter();

  const otlpMetricExporter = new OTLPMetricExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_METRIC_ENDPOINT ?? 'http://localhost:4317',
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: otlpMetricExporter,
    exportIntervalMillis: 60_000,
  });

  sdk = new NodeSDK({
    sampler: createSampler(),
    spanProcessors: [
      new BatchSpanProcessor(otlpTraceExporter, {
        maxExportBatchSize: isProduction ? 200 : 50,
        exportTimeoutMillis: isProduction ? 5000 : 2000,
        scheduledDelayMillis: isProduction ? 2000 : 1000,
      }),
      ...(process.env.NODE_ENV === 'development'
        ? [new BatchSpanProcessor(debugExporter)]
        : []),
    ],
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
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (request) => {
            return (
              (request.url?.includes('/health') ?? false) ||
              (request.url?.includes('/metrics') ?? false)
            );
          },
        },
        '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
        '@opentelemetry/instrumentation-pg': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-aws-sdk': {
          enabled: true,
          suppressInternalInstrumentation: true,
          sqsExtractContextPropagationFromPayload: false,
        },
        '@opentelemetry/instrumentation-pino': {
          enabled: true,
          logHook: (_span, record) => {
            const spanContext = _span.spanContext();
            if (spanContext) {
              record['trace_id'] = spanContext.traceId;
              record['span_id'] = spanContext.spanId;
              record['trace_flags'] = `0${spanContext.traceFlags.toString(16)}`;
              record['trace_sampled'] = Boolean(spanContext.traceFlags & 0x01);
            }
          },
        },
      }),
    ],
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]:
        options?.serviceName ?? process.env.OTEL_SERVICE_NAME,
      [ATTR_SERVICE_VERSION]:
        options?.serviceVersion ?? process.env.npm_package_version,
      [ATTR_SERVICE_NAMESPACE]: 'concierge',
      [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
    }),
  });

  sdk.start();
}

export function getSdk(): NodeSDK | undefined {
  return sdk;
}

export function isTelemetryEnabled(): boolean {
  return process.env.OTLP_ENABLED !== 'false';
}
