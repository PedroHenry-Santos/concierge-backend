import { applyDecorators, SetMetadata } from '@nestjs/common';

import { SpanKind } from '../types/telemetry.types';

export const TRACE_METADATA_KEY = Symbol('TRACE_METADATA_KEY');

export interface TraceMetadata {
  name?: string;
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
}

export function Trace(options: TraceMetadata = {}): MethodDecorator {
  return applyDecorators(SetMetadata(TRACE_METADATA_KEY, options));
}
