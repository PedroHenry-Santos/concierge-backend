import type { InjectionToken, OptionalFactoryDependency } from '@nestjs/common';

export interface TelemetryModuleOptions {
  serviceName?: string;
  serviceVersion?: string;
  environment?: string;
  otlp?: {
    traceEndpoint?: string;
    metricEndpoint?: string;
    enabled?: boolean;
  };
  sampling?: {
    ratio?: number;
    type?: 'always' | 'never' | 'ratio' | 'parentBased';
  };
}

export interface TelemetryModuleAsyncOptions<T = TelemetryModuleOptions> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory?: (...arguments_: any[]) => T | Promise<T>;
  useClass?: new () => TelemetryOptionsFactory;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
}

export interface TelemetryOptionsFactory {
  createTelemetryOptions():
    | TelemetryModuleOptions
    | Promise<TelemetryModuleOptions>;
}

export interface TraceOptions {
  name?: string;
  attributes?: Record<string, string | number | boolean>;
  kind?: 'server' | 'client' | 'producer' | 'consumer' | 'internal';
}

export interface MetricOptions {
  name: string;
  description?: string;
  unit?: string;
  attributes?: Record<string, string | number | boolean>;
}
