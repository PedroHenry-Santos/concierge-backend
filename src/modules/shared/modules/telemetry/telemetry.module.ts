import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { TelemetryConfigService } from './config/telemetry.config';
import { MetricsService } from './services/metrics.service';
import { PostgresInstrumentationService } from './services/postgres.instrumentation';
import { SQSInstrumentationService } from './services/sqs.instrumentation';
import { TelemetryService } from './services/telemetry.service';
import {
  TelemetryModuleAsyncOptions,
  TelemetryModuleOptions,
} from './types/telemetry.interface';
import { TELEMETRY_MODULE_OPTIONS } from './types/telemetry.types';

@Global()
@Module({})
export class TelemetryModule {
  static forRoot(options: TelemetryModuleOptions): DynamicModule {
    return {
      module: TelemetryModule,
      providers: [
        {
          provide: TELEMETRY_MODULE_OPTIONS,
          useValue: options,
        },
        TelemetryService,
        MetricsService,
        PostgresInstrumentationService,
        SQSInstrumentationService,
      ],
      exports: [
        TelemetryService,
        MetricsService,
        PostgresInstrumentationService,
        SQSInstrumentationService,
      ],
    };
  }

  static forRootAsync(options: TelemetryModuleAsyncOptions): DynamicModule {
    return {
      module: TelemetryModule,
      imports: [ConfigModule],
      providers: [
        ...(options?.useFactory
          ? [
              {
                provide: TELEMETRY_MODULE_OPTIONS,
                useFactory: options.useFactory,
                inject: options?.inject ?? [],
              },
            ]
          : []),
        options.useClass ?? TelemetryConfigService,
        TelemetryService,
        MetricsService,
        PostgresInstrumentationService,
        SQSInstrumentationService,
      ],
      exports: [
        TelemetryService,
        MetricsService,
        PostgresInstrumentationService,
        SQSInstrumentationService,
      ],
    };
  }
}
