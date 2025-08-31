import { Module } from '@nestjs/common';

import { ConfigurationModule } from '@/sharedModules/configuration/configuration.module';
import { ConfigurationService } from '@/sharedModules/configuration/services';
import { LoggerModule } from '@/sharedModules/logger/logger.module';
import { TelemetryConfigService } from '@/sharedModules/telemetry/config/telemetry.config';
import { TelemetryModule } from '@/sharedModules/telemetry/telemetry.module';

@Module({
  imports: [
    LoggerModule,
    ConfigurationModule.forRoot(),
    TelemetryModule.forRootAsync({
      useFactory: (configService: ConfigurationService) => {
        const telemetryConfig = new TelemetryConfigService(configService);
        return telemetryConfig.createTelemetryOptions();
      },
      inject: [ConfigurationService],
    }),
  ],
})
export class AppModule {}
