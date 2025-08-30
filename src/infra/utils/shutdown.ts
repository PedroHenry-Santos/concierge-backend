import { performShutdown } from '@/infra/utils/perform-shutdown';
import type { ShutdownOptions, ShutdownReason } from '@/infra/utils/types';

let shutdownPromise: Promise<void> | undefined;

export function shutdown({
  timeoutMs,
  cleanupTasks,
  shutdownState,
  logger,
  app,
}: ShutdownOptions) {
  return async function (
    reason: ShutdownReason,
    exitCode: number,
  ): Promise<void> {
    if (shutdownPromise) {
      logger.log(`Shutdown already in progress, waiting for completion...`);
      return shutdownPromise;
    }

    if (shutdownState.isShuttingDown) {
      logger.log(`Shutdown already completed or in progress`);
      return;
    }

    shutdownState.isShuttingDown = true;
    shutdownPromise = performShutdown(reason, exitCode, {
      timeoutMs,
      cleanupTasks,
      shutdownState,
      logger,
      app,
    });

    return shutdownPromise;
  };
}
