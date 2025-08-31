import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import {
  METRIC_METADATA_KEY,
  MetricMetadata,
} from '../decorators/metric.decorator';
import { TelemetryService } from '../services/telemetry.service';

type MetricInstance =
  | ReturnType<typeof TelemetryService.prototype.createCounter>
  | ReturnType<typeof TelemetryService.prototype.createHistogram>
  | ReturnType<typeof TelemetryService.prototype.createUpDownCounter>;

@Injectable()
export class MetricInterceptor implements NestInterceptor {
  private readonly metrics = new Map<string, MetricInstance>();

  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metricMetadata = this.reflector.get<MetricMetadata>(
      METRIC_METADATA_KEY,
      context.getHandler(),
    );

    if (!metricMetadata) {
      return next.handle();
    }

    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const metricName = metricMetadata.name ?? `${className}.${methodName}`;

    let metric = this.metrics.get(metricName);

    if (!metric) {
      switch (metricMetadata.type) {
        case 'counter': {
          metric = this.telemetryService.createCounter(
            metricName,
            metricMetadata.description,
            metricMetadata.unit,
          );
          break;
        }
        case 'histogram': {
          metric = this.telemetryService.createHistogram(
            metricName,
            metricMetadata.description,
            metricMetadata.unit,
          );
          break;
        }
        case 'upDownCounter': {
          metric = this.telemetryService.createUpDownCounter(
            metricName,
            metricMetadata.description,
            metricMetadata.unit,
          );
          break;
        }
        default: {
          return next.handle();
        }
      }

      this.metrics.set(metricName, metric);
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const attributes = {
          ...metricMetadata.attributes,
          method: methodName,
          class: className,
        };

        if (
          metricMetadata.type === 'counter' ||
          metricMetadata.type === 'upDownCounter'
        ) {
          if ('add' in metric) {
            metric.add(1, attributes);
          }
        } else if (metricMetadata.type === 'histogram' && 'record' in metric) {
          metric.record(duration, attributes);
        }
      }),
    );
  }
}
