import { Injectable, Logger } from '@nestjs/common';
import { Meter } from '@opentelemetry/api';

import { TELEMETRY_CONSTANTS } from '../constants/telemetry.constants';
import { Attributes } from '../types/telemetry.types';
import { AttributeValidator } from '../utils/attribute-validator.utility';
import { TelemetryService } from './telemetry.service';

/**
 * Valid metric names from constants - prevents high cardinality metrics
 */
type ValidMetricName =
  (typeof TELEMETRY_CONSTANTS.METRICS)[keyof typeof TELEMETRY_CONSTANTS.METRICS];

/**
 * Options for metric creation
 */
interface MetricOptions {
  description?: string;
  unit?: string;
}

/**
 * Gauge callback options
 */
interface GaugeOptions extends MetricOptions {
  attributes?: Attributes;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly meter: Meter;
  private readonly attributeValidator = new AttributeValidator();

  constructor(private readonly telemetryService: TelemetryService) {
    this.meter = this.telemetryService.getMeter();
  }

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
   * Increment a counter metric - only accepts predefined metric names
   */
  incrementCounter(
    name: ValidMetricName,
    value = 1,
    attributes?: Attributes,
    options?: MetricOptions,
  ): void {
    this.validateMetricName(name);
    const validatedAttributes =
      this.attributeValidator.validateAndSanitize(attributes);

    let counter = this.counters.get(name);

    if (!counter) {
      counter = this.meter.createCounter(name, {
        description: options?.description ?? `Counter metric: ${name}`,
        unit: options?.unit,
      });
      this.counters.set(name, counter);
      this.logger.debug(`Created new counter metric: ${name}`);
    }

    counter.add(value, validatedAttributes);
  }

  /**
   * Record a histogram value - only accepts predefined metric names
   */
  recordHistogram(
    name: ValidMetricName,
    value: number,
    attributes?: Attributes,
    options?: MetricOptions,
  ): void {
    this.validateMetricName(name);
    const validatedAttributes =
      this.attributeValidator.validateAndSanitize(attributes);

    let histogram = this.histograms.get(name);

    if (!histogram) {
      histogram = this.meter.createHistogram(name, {
        description: options?.description ?? `Histogram metric: ${name}`,
        unit: options?.unit,
      });
      this.histograms.set(name, histogram);
      this.logger.debug(`Created new histogram metric: ${name}`);
    }

    histogram.record(value, validatedAttributes);
  }

  /**
   * Update an up-down counter - only accepts predefined metric names
   */
  updateUpDownCounter(
    name: ValidMetricName,
    value: number,
    attributes?: Attributes,
    options?: MetricOptions,
  ): void {
    this.validateMetricName(name);
    const validatedAttributes =
      this.attributeValidator.validateAndSanitize(attributes);

    let upDownCounter = this.upDownCounters.get(name);

    if (!upDownCounter) {
      upDownCounter = this.meter.createUpDownCounter(name, {
        description: options?.description ?? `UpDownCounter metric: ${name}`,
        unit: options?.unit,
      });
      this.upDownCounters.set(name, upDownCounter);
      this.logger.debug(`Created new upDownCounter metric: ${name}`);
    }

    upDownCounter.add(value, validatedAttributes);
  }

  /**
   * Create an observable gauge metric - only accepts predefined metric names
   */
  createGauge(
    name: ValidMetricName,
    callback: () => number | Promise<number>,
    options?: GaugeOptions,
  ): void {
    this.validateMetricName(name);

    if (this.gauges.has(name)) {
      this.logger.warn(`Gauge metric ${name} already exists`);
      return;
    }

    const validatedAttributes = this.attributeValidator.validateAndSanitize(
      options?.attributes,
    );

    const gauge = this.meter.createObservableGauge(name, {
      description: options?.description ?? `Gauge metric: ${name}`,
      unit: options?.unit,
    });

    gauge.addCallback(async (observableResult) => {
      try {
        const value = await callback();
        observableResult.observe(value, validatedAttributes);
      } catch (error) {
        this.logger.error(`Error in gauge callback for ${name}:`, error);
      }
    });

    this.gauges.set(name, gauge);
    this.logger.debug(`Created new gauge metric: ${name}`);
  }

  /**
   * Record execution time for a function using predefined execution time metric
   */
  async recordExecutionTime<T>(
    operation: () => Promise<T> | T,
    attributes?: Attributes & { operation_name: string },
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      this.recordHistogram(
        TELEMETRY_CONSTANTS.METRICS.EXECUTION_TIME,
        duration,
        { ...attributes, status: 'success' },
        { description: 'Execution time for operations', unit: 'ms' },
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordHistogram(
        TELEMETRY_CONSTANTS.METRICS.EXECUTION_TIME,
        duration,
        { ...attributes, status: 'error' },
        { description: 'Execution time for operations', unit: 'ms' },
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

    this.incrementCounter(
      TELEMETRY_CONSTANTS.METRICS.WHATSAPP_OPERATIONS_TOTAL,
      1,
      baseAttributes,
      {
        description: 'Total WhatsApp operations',
        unit: 'operations',
      },
    );

    if (!success) {
      this.incrementCounter(
        TELEMETRY_CONSTANTS.METRICS.WHATSAPP_OPERATION_ERRORS,
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
      TELEMETRY_CONSTANTS.METRICS.DATABASE_OPERATION_DURATION,
      duration,
      baseAttributes,
      { description: 'Database operation duration', unit: 'ms' },
    );

    this.incrementCounter(
      TELEMETRY_CONSTANTS.METRICS.DATABASE_OPERATIONS_TOTAL,
      1,
      baseAttributes,
      {
        description: 'Total database operations',
        unit: 'operations',
      },
    );
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

    this.incrementCounter(
      TELEMETRY_CONSTANTS.METRICS.QUEUE_OPERATIONS_TOTAL,
      1,
      baseAttributes,
      {
        description: 'Total queue operations',
        unit: 'operations',
      },
    );

    if (!success) {
      this.incrementCounter(
        TELEMETRY_CONSTANTS.METRICS.QUEUE_OPERATION_ERRORS,
        1,
        baseAttributes,
        { description: 'Total queue operation errors', unit: 'errors' },
      );
    }
  }

  /**
   * Validates that the metric name is predefined to prevent high cardinality
   */
  private validateMetricName(name: string): asserts name is ValidMetricName {
    const validNames = Object.values(TELEMETRY_CONSTANTS.METRICS);
    if (!validNames.includes(name as ValidMetricName)) {
      const errorMessage = `Invalid metric name: ${name}. Only predefined metrics are allowed to prevent high cardinality. Valid names: ${validNames.join(', ')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all registered metric names (for debugging)
   */
  getRegisteredMetrics(): {
    counters: string[];
    histograms: string[];
    upDownCounters: string[];
    gauges: string[];
  } {
    return {
      counters: [...this.counters.keys()],
      histograms: [...this.histograms.keys()],
      upDownCounters: [...this.upDownCounters.keys()],
      gauges: [...this.gauges.keys()],
    };
  }

  /**
   * Clear all cached metrics (useful for testing)
   */
  clearMetrics(): void {
    this.counters.clear();
    this.histograms.clear();
    this.upDownCounters.clear();
    this.gauges.clear();
    this.logger.debug('All cached metrics cleared');
  }

  /**
   * Get attribute validation guidelines (for debugging and documentation)
   */
  getAttributeGuidelines(): {
    allowedKeys: string[];
    sanitizationRules: Record<string, string>;
    limits: {
      maxAttributes: number;
      maxValueLength: number;
    };
  } {
    return {
      allowedKeys: this.attributeValidator.getAllowedKeys(),
      sanitizationRules: this.attributeValidator.getSanitizationRules(),
      limits: {
        maxAttributes: TELEMETRY_CONSTANTS.ATTRIBUTE_GUIDELINES.MAX_ATTRIBUTES,
        maxValueLength:
          TELEMETRY_CONSTANTS.ATTRIBUTE_GUIDELINES.MAX_VALUE_LENGTH,
      },
    };
  }
}
