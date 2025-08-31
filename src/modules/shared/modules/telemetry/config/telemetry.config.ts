import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  TelemetryModuleOptions,
  TelemetryOptionsFactory,
} from '../types/telemetry.interface';

@Injectable()
export class TelemetryConfigService implements TelemetryOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTelemetryOptions(): TelemetryModuleOptions {
    return {
      serviceName: this.configService.get<string>(
        'OTEL_SERVICE_NAME',
        'whatsapp-backend',
      ),
      serviceVersion: this.configService.get<string>(
        'npm_package_version',
        '1.0.0',
      ),
      environment: this.configService.get<string>('NODE_ENV', 'development'),

      otlp: {
        traceEndpoint: this.configService.get<string>(
          'OTLP_TRACE_ENDPOINT',
          'http://localhost:4317',
        ),
        metricEndpoint: this.configService.get<string>(
          'OTLP_METRIC_ENDPOINT',
          'http://localhost:4317',
        ),
        enabled: this.configService.get<boolean>('OTLP_ENABLED', true),
      },

      sampling: {
        ratio: this.configService.get<number>('OTEL_SAMPLING_RATIO', 1),
        type: this.configService.get<
          'always' | 'never' | 'ratio' | 'parentBased'
        >('OTEL_SAMPLING_TYPE', 'parentBased'),
      },
    };
  }
}
