import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from '@/infra/app.module';
import { setupGracefulShutdown } from '@/infra/graceful-shutdown';
import { ConfigurationService } from '@/sharedModules/configuration/services';
import { LoggerService } from '@/sharedModules/logger/services/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  const logger = app.get(LoggerService);
  const configuration = app.get(ConfigurationService);

  app.useLogger(logger);
  app.enableShutdownHooks();

  const port = configuration.get('port');
  await app.listen(port, () => {
    console.log(`Server is listening on port ${String(port)}`);
  });

  setupGracefulShutdown(app);
}

try {
  // eslint-disable-next-line unicorn/prefer-top-level-await
  void bootstrap();
} catch (error) {
  console.error('Failed to start the application:', error);
  throw error;
}
