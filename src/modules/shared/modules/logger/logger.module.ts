import path from 'node:path';

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { LoggerService } from '@/sharedModules/logger/services/logger.service';
import { customRequestId } from '@/sharedModules/logger/utils/custom-request-id';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          autoLogging: false,
          genReqId: customRequestId,
          transport: {
            target: path.resolve(__dirname, 'utils/custom-pino-pretty'),
          },
        },
      }),
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
