import { getSdk, initOpenTelemetry } from './tracing';
initOpenTelemetry();

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from '@/infra/app.module';
import { registerGracefulShutdown } from '@/infra/utils';
import { ConfigurationService } from '@/sharedModules/configuration/services';
import { LoggerService } from '@/sharedModules/logger/services/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  const logger = app.get(LoggerService);
  const configuration = app.get(ConfigurationService);

  app.useLogger(logger);
  app.enableShutdownHooks();

  registerGracefulShutdown(app, {
    timeoutMs: 15_000,
    cleanupTasks: [
      async () => {
        const sdk = getSdk();
        if (sdk) {
          try {
            await sdk.shutdown();
            logger.log('OpenTelemetry SDK shutdown successfully', 'Shutdown');
          } catch (error: unknown) {
            logger.error(
              'Error shutting down OpenTelemetry SDK',
              (error as Error).message,
              'Shutdown',
            );
          }
        }
      },
    ],
  });

  const port = configuration.get('port');
  await app.listen(port, () => {
    logger.log(`Server is listening on Port: ${String(port)}`, 'Bootstrap');
    logger.log(`Process ID: ${process.pid}`, 'Bootstrap');
  });
}

try {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void bootstrap();
} catch (error) {
  console.error('Failed to start the application:', error);
  throw error;
}
