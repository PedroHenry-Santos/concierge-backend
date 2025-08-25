import path from 'node:path';

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { LoggerService } from '@/sharedModules/logger/services/logger.service';
import { customRequestId } from '@/sharedModules/logger/utils/custom-request-id';
import { ConfigurationService } from '@/sharedModules/configuration/services/configuration.service';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: (configuration: ConfigurationService) => ({
        pinoHttp: {
          autoLogging: configuration.get('env') === 'production',
          level: configuration.get('env') === 'development' ? 'trace' : 'info',
          genReqId: customRequestId,
          transport: configuration.get('env') === 'development' ? {
            target: path.resolve(__dirname, 'utils/custom-pino-pretty'),
          } : undefined,
        },
      }),
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
