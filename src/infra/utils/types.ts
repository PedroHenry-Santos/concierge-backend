import type { INestApplication, Logger } from '@nestjs/common';

export type ShutdownReason =
  | 'signal:SIGINT'
  | 'signal:SIGTERM'
  | 'uncaughtException'
  | 'unhandledRejection'
  | 'manual';

export interface MinimalLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, trace?: string): void;
  fatal: (message: string, trace?: string) => void;
}

export type GracefulShutdownResponse = () => void;

export type CleanupTask = (reason: ShutdownReason) => void | Promise<void>;

/**
 * State object for tracking shutdown process
 */
export interface ShutdownState {
  isShuttingDown: boolean;
}

export type ShutdownOptions = {
  shutdownState: ShutdownState;
  timeoutMs: number;
  cleanupTasks: ReadonlyArray<CleanupTask>;
  logger: Logger;
  app: INestApplication;
};

export interface GracefulShutdownOptions {
  /**
   * Logger instance for shutdown events (default: new Logger('GracefulShutdown'))
   */
  readonly logger?: Logger;
  /**
   * Timeout in milliseconds to force shutdown (default: 10000 ms)
   * After this timeout, the process will be forcefully terminated
   */
  readonly timeoutMs?: number;
  /**
   * Array of cleanup tasks to be executed on shutdown
   * Each task receives the shutdown reason and can be async
   */
  readonly cleanupTasks?: ReadonlyArray<CleanupTask>;
}
