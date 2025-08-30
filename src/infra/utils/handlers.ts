import { formatUnknown } from '@/infra/utils/format-unknown';
import { shutdown } from '@/infra/utils/shutdown';
import type { ShutdownOptions } from '@/infra/utils/types';

export const onUncaught = (options: ShutdownOptions) => {
  return (error: Error) => {
    options.logger.fatal(`uncaughtException: ${formatUnknown(error)}`);
    void shutdown(options)('uncaughtException', 1);
  };
};

export const onUnhandled = (options: ShutdownOptions) => {
  return (reason: unknown) => {
    options.logger.fatal(`unhandledRejection: ${formatUnknown(reason)}`);
    void shutdown(options)('unhandledRejection', 1);
  };
};

export const onSigint = (options: ShutdownOptions) => {
  return () => void shutdown(options)('signal:SIGINT', 0);
};

export const onSigterm = (options: ShutdownOptions) => {
  return () => void shutdown(options)('signal:SIGTERM', 0);
};
