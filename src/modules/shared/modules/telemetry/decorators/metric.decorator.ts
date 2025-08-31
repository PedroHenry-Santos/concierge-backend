import { applyDecorators, SetMetadata } from '@nestjs/common';

export const METRIC_METADATA_KEY = Symbol('METRIC_METADATA_KEY');

export interface MetricMetadata {
  name?: string;
  type: 'counter' | 'histogram' | 'upDownCounter';
  description?: string;
  unit?: string;
  attributes?: Record<string, string | number | boolean>;
}

export function Metric(options: MetricMetadata): MethodDecorator {
  return applyDecorators(SetMetadata(METRIC_METADATA_KEY, options));
}
