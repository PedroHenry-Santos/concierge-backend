import { formatUnknown } from '@/infra/utils/format-unknown';
import type { ShutdownOptions, ShutdownReason } from '@/infra/utils/types';

export async function performShutdown(
  reason: ShutdownReason,
  exitCode: number,
  { timeoutMs, cleanupTasks, logger, app }: ShutdownOptions,
): Promise<void> {
  let finalExitCode = exitCode;

  const timer = setTimeout(() => {
    logger.fatal(
      `Forced shutdown timeout after ${timeoutMs}ms (reason: ${reason})`,
    );
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
  }, timeoutMs);

  timer.unref();

  try {
    logger.warn(`Starting graceful shutdown (reason: ${reason})`);

    for (const task of cleanupTasks) {
      try {
        await task(reason);
      } catch (error) {
        logger.error(`Error in cleanup task: ${formatUnknown(error)}`);
        finalExitCode = 1;
      }
    }

    await app.close();
    logger.log('Application closed successfully');
  } catch (error) {
    logger.fatal(`Error during shutdown: ${formatUnknown(error)}`);
    finalExitCode = 1;
  } finally {
    clearTimeout(timer);
    logger.log(
      `Process exiting with code ${finalExitCode} (reason: ${reason})`,
    );
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(finalExitCode);
  }
}
