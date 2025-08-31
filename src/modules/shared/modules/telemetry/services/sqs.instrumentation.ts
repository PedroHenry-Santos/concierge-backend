import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

import { TelemetryService } from './telemetry.service';

@Injectable()
export class SQSInstrumentationService {
  private readonly logger = new Logger(SQSInstrumentationService.name);
  private readonly tracer = trace.getTracer('aws-sqs-instrumentation');

  constructor(private readonly telemetryService: TelemetryService) {}

  /**
   * Instrument SQS message sending
   */
  instrumentSendMessage<T>(
    queueUrl: string,
    messageBody: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const queueName = this.extractQueueName(queueUrl);

    return this.telemetryService.startActiveSpan(
      `sqs.send.${queueName}`,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'aws_sqs',
          'messaging.destination': queueName,
          'messaging.destination_kind': 'queue',
          'messaging.url': queueUrl,
          'messaging.operation': 'send',
          'messaging.message.body.size': messageBody.length,
          'cloud.provider': 'aws',
          'cloud.service.name': 'sqs',
          ...attributes,
        });

        const startTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'messaging.operation.duration_ms': duration,
            'messaging.operation.success': true,
          });

          this.telemetryService.setSpanStatus('ok');
          this.logger.debug(
            `SQS message sent to ${queueName} in ${duration}ms`,
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'messaging.operation.duration_ms': duration,
              'messaging.operation.success': false,
              'messaging.operation.error': errorMessage,
              'messaging.destination': queueName,
              'messaging.operation': 'send',
            },
          );

          this.logger.error(
            `SQS send failed for ${queueName} after ${duration}ms:`,
            error,
          );
          throw error;
        }
      },
      {
        kind: 'producer',
        attributes: {
          component: 'aws-sqs',
          'messaging.system': 'aws_sqs',
        },
      },
    );
  }

  /**
   * Instrument SQS message receiving/polling
   */
  instrumentReceiveMessage<T>(
    queueUrl: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const queueName = this.extractQueueName(queueUrl);

    return this.telemetryService.startActiveSpan(
      `sqs.receive.${queueName}`,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'aws_sqs',
          'messaging.destination': queueName,
          'messaging.destination_kind': 'queue',
          'messaging.url': queueUrl,
          'messaging.operation': 'receive',
          'cloud.provider': 'aws',
          'cloud.service.name': 'sqs',
          ...attributes,
        });

        const startTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'messaging.operation.duration_ms': duration,
            'messaging.operation.success': true,
          });

          this.telemetryService.setSpanStatus('ok');
          this.logger.debug(
            `SQS messages received from ${queueName} in ${duration}ms`,
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'messaging.operation.duration_ms': duration,
              'messaging.operation.success': false,
              'messaging.operation.error': errorMessage,
              'messaging.destination': queueName,
              'messaging.operation': 'receive',
            },
          );

          this.logger.error(
            `SQS receive failed for ${queueName} after ${duration}ms:`,
            error,
          );
          throw error;
        }
      },
      {
        kind: 'consumer',
        attributes: {
          component: 'aws-sqs',
          'messaging.system': 'aws_sqs',
        },
      },
    );
  }

  /**
   * Instrument SQS message processing
   */
  instrumentProcessMessage<T>(
    messageId: string,
    queueName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this.telemetryService.startActiveSpan(
      `sqs.process.${queueName}`,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'aws_sqs',
          'messaging.destination': queueName,
          'messaging.destination_kind': 'queue',
          'messaging.operation': 'process',
          'messaging.message.id': messageId,
          'cloud.provider': 'aws',
          'cloud.service.name': 'sqs',
          ...attributes,
        });

        const startTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'messaging.operation.duration_ms': duration,
            'messaging.operation.success': true,
          });

          this.telemetryService.setSpanStatus('ok');
          this.logger.debug(
            `SQS message ${messageId} processed from ${queueName} in ${duration}ms`,
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'messaging.operation.duration_ms': duration,
              'messaging.operation.success': false,
              'messaging.operation.error': errorMessage,
              'messaging.destination': queueName,
              'messaging.message.id': messageId,
              'messaging.operation': 'process',
            },
          );

          this.logger.error(
            `SQS message processing failed for ${messageId} in ${queueName} after ${duration}ms:`,
            error,
          );
          throw error;
        }
      },
      {
        kind: 'consumer',
        attributes: {
          component: 'aws-sqs',
          'messaging.system': 'aws_sqs',
        },
      },
    );
  }

  /**
   * Instrument SQS message deletion (acknowledgment)
   */
  instrumentDeleteMessage<T>(
    messageId: string,
    queueName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this.telemetryService.startActiveSpan(
      `sqs.delete.${queueName}`,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'aws_sqs',
          'messaging.destination': queueName,
          'messaging.destination_kind': 'queue',
          'messaging.operation': 'delete',
          'messaging.message.id': messageId,
          'cloud.provider': 'aws',
          'cloud.service.name': 'sqs',
          ...attributes,
        });

        const startTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'messaging.operation.duration_ms': duration,
            'messaging.operation.success': true,
          });

          this.telemetryService.setSpanStatus('ok');
          this.logger.debug(
            `SQS message ${messageId} deleted from ${queueName} in ${duration}ms`,
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'messaging.destination': queueName,
              'messaging.message.id': messageId,
              'messaging.operation': 'delete',
              'messaging.operation.duration_ms': duration,
              'messaging.operation.success': false,
              'messaging.operation.error': errorMessage,
            },
          );

          this.logger.error(
            `SQS message deletion failed for ${messageId} in ${queueName} after ${duration}ms:`,
            error,
          );
          throw error;
        }
      },
      {
        kind: 'client',
        attributes: {
          component: 'aws-sqs',
          'messaging.system': 'aws_sqs',
        },
      },
    );
  }

  /**
   * Instrument batch SQS operations
   */
  instrumentBatchOperation<T>(
    operation: 'send' | 'receive' | 'delete',
    queueName: string,
    batchSize: number,
    callback: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    return this.telemetryService.startActiveSpan(
      `sqs.batch.${operation}.${queueName}`,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'aws_sqs',
          'messaging.destination': queueName,
          'messaging.destination_kind': 'queue',
          'messaging.operation': `batch_${operation}`,
          'messaging.batch.size': batchSize,
          'cloud.provider': 'aws',
          'cloud.service.name': 'sqs',
          ...attributes,
        });

        const startTime = Date.now();

        try {
          const result = await callback();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'messaging.operation.duration_ms': duration,
            'messaging.operation.success': true,
            'messaging.batch.processed': batchSize,
          });

          this.telemetryService.setSpanStatus('ok');
          this.logger.debug(
            `SQS batch ${operation} completed for ${queueName} (${batchSize} messages) in ${duration}ms`,
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'messaging.operation.duration_ms': duration,
              'messaging.operation.success': false,
              'messaging.operation.error': errorMessage,
              'messaging.destination': queueName,
              'messaging.operation': `batch_${operation}`,
              'messaging.batch.size': batchSize,
            },
          );

          this.logger.error(
            `SQS batch ${operation} failed for ${queueName} (${batchSize} messages) after ${duration}ms:`,
            error,
          );
          throw error;
        }
      },
      {
        kind: operation === 'send' ? 'producer' : 'consumer',
        attributes: {
          component: 'aws-sqs',
          'messaging.system': 'aws_sqs',
        },
      },
    );
  }

  /**
   * Extract queue name from SQS URL for better observability
   */
  private extractQueueName(queueUrl: string): string {
    try {
      const urlParts = queueUrl.split('/');
      return urlParts.at(-1) ?? 'unknown_queue';
    } catch {
      return 'unknown_queue';
    }
  }
}
