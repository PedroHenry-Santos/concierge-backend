import { Injectable, Logger } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

import { Attributes } from '../types/telemetry.types';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly meter = metrics.getMeter('whatsapp-backend-custom-metrics');

  private readonly counters = new Map<
    string,
    ReturnType<typeof this.meter.createCounter>
  >();
  private readonly histograms = new Map<
    string,
    ReturnType<typeof this.meter.createHistogram>
  >();
  private readonly upDownCounters = new Map<
    string,
    ReturnType<typeof this.meter.createUpDownCounter>
  >();
  private readonly gauges = new Map<
    string,
    ReturnType<typeof this.meter.createObservableGauge>
  >();

  /**
   * Increment a counter metric
   */
  incrementCounter(
    name: string,
    value = 1,
    attributes?: Attributes,
    options?: { description?: string; unit?: string },
  ): void {
    let counter = this.counters.get(name);

    if (!counter) {
      counter = this.meter.createCounter(name, {
        description: options?.description ?? `Counter metric: ${name}`,
        unit: options?.unit,
      });
      this.counters.set(name, counter);
      this.logger.debug(`Created new counter metric: ${name}`);
    }

    counter.add(value, attributes);
  }

  /**
   * Record a histogram value
   */
  recordHistogram(
    name: string,
    value: number,
    attributes?: Attributes,
    options?: { description?: string; unit?: string },
  ): void {
    let histogram = this.histograms.get(name);

    if (!histogram) {
      histogram = this.meter.createHistogram(name, {
        description: options?.description ?? `Histogram metric: ${name}`,
        unit: options?.unit,
      });
      this.histograms.set(name, histogram);
      this.logger.debug(`Created new histogram metric: ${name}`);
    }

    histogram.record(value, attributes);
  }

  /**
   * Update an up-down counter
   */
  updateUpDownCounter(
    name: string,
    value: number,
    attributes?: Attributes,
    options?: { description?: string; unit?: string },
  ): void {
    let upDownCounter = this.upDownCounters.get(name);

    if (!upDownCounter) {
      upDownCounter = this.meter.createUpDownCounter(name, {
        description: options?.description ?? `UpDownCounter metric: ${name}`,
        unit: options?.unit,
      });
      this.upDownCounters.set(name, upDownCounter);
      this.logger.debug(`Created new upDownCounter metric: ${name}`);
    }

    upDownCounter.add(value, attributes);
  }

  /**
   * Create an observable gauge metric
   */
  createGauge(
    name: string,
    callback: () => number | Promise<number>,
    options?: { description?: string; unit?: string; attributes?: Attributes },
  ): void {
    if (this.gauges.has(name)) {
      this.logger.warn(`Gauge metric ${name} already exists`);
      return;
    }

    const gauge = this.meter.createObservableGauge(name, {
      description: options?.description ?? `Gauge metric: ${name}`,
      unit: options?.unit,
    });

    gauge.addCallback(async (observableResult) => {
      try {
        const value = await callback();
        observableResult.observe(value, options?.attributes);
      } catch (error) {
        this.logger.error(`Error in gauge callback for ${name}:`, error);
      }
    });

    this.gauges.set(name, gauge);
    this.logger.debug(`Created new gauge metric: ${name}`);
  }

  /**
   * Record execution time for a function
   */
  async recordExecutionTime<T>(
    metricName: string,
    operation: () => Promise<T> | T,
    attributes?: Attributes,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.recordHistogram(
        metricName,
        duration,
        { ...attributes, status: 'success' },
        { description: `Execution time for ${metricName}`, unit: 'ms' },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordHistogram(
        metricName,
        duration,
        { ...attributes, status: 'error' },
        { description: `Execution time for ${metricName}`, unit: 'ms' },
      );

      throw error;
    }
  }

  /**
   * Create business metrics for WhatsApp operations
   */
  recordWhatsAppMetric(
    operation: 'message_sent' | 'message_received' | 'webhook_processed',
    success: boolean,
    attributes?: Attributes,
  ): void {
    const baseAttributes = {
      operation,
      success: success.toString(),
      ...attributes,
    };

    this.incrementCounter('whatsapp_operations_total', 1, baseAttributes, {
      description: 'Total WhatsApp operations',
      unit: 'operations',
    });

    if (!success) {
      this.incrementCounter(
        'whatsapp_operations_errors_total',
        1,
        baseAttributes,
        { description: 'Total WhatsApp operation errors', unit: 'errors' },
      );
    }
  }

  /**
   * Create database operation metrics
   */
  recordDatabaseMetric(
    operation: 'query' | 'transaction' | 'connection',
    duration: number,
    success: boolean,
    attributes?: Attributes,
  ): void {
    const baseAttributes = {
      operation,
      success: success.toString(),
      ...attributes,
    };

    this.recordHistogram(
      'database_operation_duration',
      duration,
      baseAttributes,
      { description: 'Database operation duration', unit: 'ms' },
    );

    this.incrementCounter('database_operations_total', 1, baseAttributes, {
      description: 'Total database operations',
      unit: 'operations',
    });
  }

  /**
   * Create queue operation metrics
   */
  recordQueueMetric(
    operation: 'send' | 'receive' | 'process',
    queueName: string,
    success: boolean,
    attributes?: Attributes,
  ): void {
    const baseAttributes = {
      operation,
      queue_name: queueName,
      success: success.toString(),
      ...attributes,
    };

    this.incrementCounter('queue_operations_total', 1, baseAttributes, {
      description: 'Total queue operations',
      unit: 'operations',
    });

    if (!success) {
      this.incrementCounter(
        'queue_operations_errors_total',
        1,
        baseAttributes,
        { description: 'Total queue operation errors', unit: 'errors' },
      );
    }
  }
}
