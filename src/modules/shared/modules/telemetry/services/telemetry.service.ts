import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  context,
  Meter,
  metrics,
  SpanKind,
  SpanStatusCode,
  trace,
  Tracer,
} from '@opentelemetry/api';

import { TELEMETRY_CONSTANTS } from '../constants/telemetry.constants';
import { TelemetryModuleOptions } from '../types/telemetry.interface';
import {
  Attributes,
  SpanKind as CustomSpanKind,
  TELEMETRY_MODULE_OPTIONS,
} from '../types/telemetry.types';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly tracer: Tracer;
  private readonly meter: Meter;
  private readonly instrumentationName: string;
  private readonly instrumentationVersion: string;

  constructor(
    @Optional()
    @Inject(TELEMETRY_MODULE_OPTIONS)
    private readonly options?: TelemetryModuleOptions,
  ) {
    // Use dynamic service name or fallback to default
    this.instrumentationName =
      this.options?.serviceName ?? TELEMETRY_CONSTANTS.INSTRUMENTATION_NAME;

    // Use dynamic service version or fallback to default
    this.instrumentationVersion =
      this.options?.serviceVersion ??
      TELEMETRY_CONSTANTS.INSTRUMENTATION_VERSION;

    // Create tracer and meter with dynamic or default names
    this.tracer = trace.getTracer(
      this.instrumentationName,
      this.instrumentationVersion,
    );

    this.meter = metrics.getMeter(
      this.instrumentationName,
      this.instrumentationVersion,
    );

    this.logger.debug(
      `Telemetry initialized with service: ${this.instrumentationName}@${this.instrumentationVersion}`,
    );
  }

  /**
   * Get the centralized tracer instance
   * Use this instead of creating new tracers in other services
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Get the centralized meter instance
   * Use this instead of creating new meters in other services
   */
  getMeter(): Meter {
    return this.meter;
  }

  /**
   * Start a new span with optional attributes
   */
  startSpan(
    name: string,
    options?: {
      kind?: CustomSpanKind;
      attributes?: Attributes;
      parent?: unknown;
    },
  ) {
    const spanKind = this.mapSpanKind(options?.kind);

    const span = this.tracer.startSpan(
      name,
      {
        kind: spanKind,
        attributes: options?.attributes,
      },
      options?.parent ? context.active() : undefined,
    );

    return span;
  }

  /**
   * Start an active span that will be set as the current active span
   */
  startActiveSpan<T>(
    name: string,
    callback: (span: ReturnType<typeof this.tracer.startSpan>) => T,
    options?: {
      kind?: CustomSpanKind;
      attributes?: Attributes;
    },
  ): T {
    const spanKind = this.mapSpanKind(options?.kind);

    return this.tracer.startActiveSpan(
      name,
      {
        kind: spanKind,
        attributes: options?.attributes,
      },
      callback,
    );
  }

  /**
   * Get the current active span
   */
  getCurrentSpan() {
    return trace.getActiveSpan();
  }

  /**
   * Add attributes to the current active span
   */
  addSpanAttributes(attributes: Attributes) {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    } else {
      this.logger.warn('No active span found to add attributes');
    }
  }

  /**
   * Add an event to the current active span
   */
  addSpanEvent(name: string, attributes?: Attributes) {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    } else {
      this.logger.warn('No active span found to add event');
    }
  }

  /**
   * Set the status of the current active span
   */
  setSpanStatus(code: 'ok' | 'error', message?: string) {
    const span = trace.getActiveSpan();
    if (span) {
      const statusCode =
        code === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR;
      span.setStatus({ code: statusCode, message });
    } else {
      this.logger.warn('No active span found to set status');
    }
  }

  /**
   * Record an exception in the current active span
   */
  recordException(exception: Error, attributes?: Attributes) {
    const span = trace.getActiveSpan();
    if (span) {
      if (attributes) span.setAttributes(attributes);
      span.recordException(exception);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: exception.message,
      });
    } else {
      this.logger.warn('No active span found to record exception');
    }
  }

  /**
   * Create a counter metric
   */
  createCounter(name: string, description?: string, unit?: string) {
    return this.meter.createCounter(name, {
      description,
      unit,
    });
  }

  /**
   * Create a histogram metric
   */
  createHistogram(name: string, description?: string, unit?: string) {
    return this.meter.createHistogram(name, {
      description,
      unit,
    });
  }

  /**
   * Create an up-down counter metric
   */
  createUpDownCounter(name: string, description?: string, unit?: string) {
    return this.meter.createUpDownCounter(name, {
      description,
      unit,
    });
  }

  /**
   * Map custom span kind to OpenTelemetry SpanKind
   */
  private mapSpanKind(kind?: CustomSpanKind): SpanKind {
    switch (kind) {
      case 'client': {
        return SpanKind.CLIENT;
      }
      case 'server': {
        return SpanKind.SERVER;
      }
      case 'producer': {
        return SpanKind.PRODUCER;
      }
      case 'consumer': {
        return SpanKind.CONSUMER;
      }
      default: {
        return SpanKind.INTERNAL;
      }
    }
  }
}
