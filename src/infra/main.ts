import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from '@/infra/app.module';
import { setupGracefulShutdown } from '@/infra/graceful-shutdown';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
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
