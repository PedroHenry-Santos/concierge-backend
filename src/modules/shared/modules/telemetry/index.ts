// Main module
export { TelemetryModule } from './telemetry.module';

// Services
export { MetricsService } from './services/metrics.service';
export { PostgresInstrumentationService } from './services/postgres.instrumentation';
export { SQSInstrumentationService } from './services/sqs.instrumentation';
export { TelemetryService } from './services/telemetry.service';

// Configuration
export { TelemetryConfigService } from './config/telemetry.config';

// Decorators
export { Metric, MetricMetadata } from './decorators/metric.decorator';
export { Trace, TraceMetadata } from './decorators/trace.decorator';

// Interceptors
export { MetricInterceptor } from './interceptors/metric.interceptor';
export { TraceInterceptor } from './interceptors/trace.interceptor';

// Types
export * from './types/telemetry.interface';
export * from './types/telemetry.types';
