import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import {
  TRACE_METADATA_KEY,
  TraceMetadata,
} from '../decorators/trace.decorator';
import { TelemetryService } from '../services/telemetry.service';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const traceMetadata = this.reflector.get<TraceMetadata>(
      TRACE_METADATA_KEY,
      context.getHandler(),
    );

    if (!traceMetadata) {
      return next.handle();
    }

    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const spanName = traceMetadata.name ?? `${className}.${methodName}`;

    return this.telemetryService.startActiveSpan(
      spanName,
      (span) => {
        if (traceMetadata.attributes) {
          span.setAttributes(traceMetadata.attributes);
        }

        this.telemetryService.addSpanAttributes({
          'code.function': methodName,
          'code.namespace': className,
        });

        return next.handle().pipe(
          tap(() => {
            this.telemetryService.setSpanStatus('ok');
          }),
          catchError((error: unknown) => {
            const errorInstance =
              error instanceof Error ? error : new Error(String(error));
            this.telemetryService.recordException(errorInstance);
            return throwError(() => error);
          }),
        );
      },
      {
        kind: traceMetadata.kind,
        attributes: traceMetadata.attributes,
      },
    );
  }
}
