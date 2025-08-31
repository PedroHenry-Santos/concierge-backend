export const TELEMETRY_MODULE_OPTIONS = Symbol('TELEMETRY_MODULE_OPTIONS');

export type SpanKind =
  | 'server'
  | 'client'
  | 'producer'
  | 'consumer'
  | 'internal';

export type SamplingType = 'always' | 'never' | 'ratio' | 'parentBased';

export type AttributeValue = string | number | boolean;

export type Attributes = Record<string, AttributeValue>;
