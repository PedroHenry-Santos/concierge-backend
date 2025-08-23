import type { INestApplication } from '@nestjs/common';

export function setupGracefulShutdown(app: INestApplication): void {
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    void app.close().then(() => {
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    void app.close().then(() => {
      process.exit(0);
    });
  });
}
