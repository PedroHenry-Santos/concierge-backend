import { type INestApplication, Logger, ShutdownSignal } from '@nestjs/common';

import {
  onSigint,
  onSigterm,
  onUncaught,
  onUnhandled,
} from '@/infra/utils/handlers';
import type {
  GracefulShutdownOptions,
  GracefulShutdownResponse,
} from '@/infra/utils/types';

export function registerGracefulShutdown(
  app: INestApplication,
  options: GracefulShutdownOptions = {},
): GracefulShutdownResponse {
  const logger: Logger = options.logger ?? new Logger('GracefulShutdown');
  const timeoutMs = options.timeoutMs ?? 10_000;
  const cleanupTasks = options.cleanupTasks ?? [];
  const shutdownState = { isShuttingDown: false };
  const handlerOptions = {
    logger,
    timeoutMs,
    cleanupTasks,
    shutdownState,
    app,
  };

  process.on(ShutdownSignal.SIGINT, onSigint(handlerOptions));
  process.on(ShutdownSignal.SIGTERM, onSigterm(handlerOptions));
  process.on('uncaughtException', onUncaught(handlerOptions));
  process.on('unhandledRejection', onUnhandled(handlerOptions));

  return () => {
    process.off(ShutdownSignal.SIGINT, onSigint(handlerOptions));
    process.off(ShutdownSignal.SIGTERM, onSigterm(handlerOptions));
    process.off('uncaughtException', onUncaught(handlerOptions));
    process.off('unhandledRejection', onUnhandled(handlerOptions));
  };
}
