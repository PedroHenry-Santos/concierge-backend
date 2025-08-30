# Graceful Shutdown Implementation

A modular, robust graceful shutdown system for NestJS applications with comprehensive error handling and race condition prevention.

## Overview

The graceful shutdown system provides reliable application termination by handling signals (SIGINT, SIGTERM) and unexpected errors (uncaught exceptions, unhandled rejections) with:

1. **Race condition prevention** - Single shutdown promise prevents duplicate execution
2. **Cleanup task execution** - User-defined cleanup functions run before termination
3. **Timeout protection** - Configurable timeout prevents hanging processes
4. **Guaranteed termination** - Process exit ensured via `finally` block
5. **Comprehensive logging** - Detailed shutdown process visibility

## Architecture

The implementation is split into focused modules:

- **`graceful-shutdown.ts`** - Main registration function and handler setup
- **`handlers.ts`** - Signal and error event handlers  
- **`shutdown.ts`** - Shutdown orchestration with race condition prevention
- **`perform-shutdown.ts`** - Actual shutdown execution logic
- **`types.ts`** - TypeScript interfaces and types
- **`format-unknown.ts`** - Error formatting utility

## Quick Start

```typescript
import { registerGracefulShutdown } from '@/infra/utils';
import type { CleanupTask } from '@/infra/utils';

// Basic usage
const cleanup = registerGracefulShutdown(app);

// Advanced usage with cleanup tasks
const cleanup = registerGracefulShutdown(app, {
  timeoutMs: 15000,
  cleanupTasks: [
    async (reason) => {
      console.log(`Shutting down due to: ${reason}`);
      await database.close();
    },
    async (reason) => {
      await redis.disconnect();
    }
  ]
});

// Cleanup handlers when needed (e.g., in tests)
cleanup();
```

## Configuration Options

```typescript
interface GracefulShutdownOptions {
  /**
   * Logger instance for shutdown events 
   * Default: new Logger('GracefulShutdown')
   */
  readonly logger?: Logger;
  
  /**
   * Timeout in milliseconds to force shutdown
   * Default: 10000ms (10 seconds)
   * After timeout, process is forcefully terminated
   */
  readonly timeoutMs?: number;
  
  /**
   * Cleanup tasks executed during shutdown
   * Each task receives the shutdown reason and can be async
   */
  readonly cleanupTasks?: ReadonlyArray<CleanupTask>;
}
```

## Shutdown Events

The system handles these termination scenarios:

```typescript
type ShutdownReason =
  | 'signal:SIGINT'        // Ctrl+C or interrupt signal
  | 'signal:SIGTERM'       // Termination signal
  | 'uncaughtException'    // Unhandled JavaScript exceptions
  | 'unhandledRejection'   // Unhandled Promise rejections
  | 'manual';              // Manual/programmatic shutdown
```

**Signal handling:**
- **SIGINT/SIGTERM**: Graceful shutdown with exit code 0
- **uncaughtException/unhandledRejection**: Immediate shutdown with exit code 1

## Implementation Details

### Race Condition Prevention

The shutdown process uses a singleton promise pattern:

```typescript
// shutdown.ts
let shutdownPromise: Promise<void> | undefined;

export function shutdown(options: ShutdownOptions) {
  return async function (reason: ShutdownReason, exitCode: number) {
    // Return existing promise if shutdown already started
    if (shutdownPromise) {
      logger.log(`Shutdown already in progress, waiting for completion...`);
      return shutdownPromise;
    }

    // Check state flag for additional protection
    if (shutdownState.isShuttingDown) {
      logger.log(`Shutdown already completed or in progress`);
      return;
    }

    shutdownState.isShuttingDown = true;
    shutdownPromise = performShutdown(reason, exitCode, options);
    return shutdownPromise;
  };
}
```

### Handler Registration

Signal handlers are registered without deduplication logic:

```typescript
// graceful-shutdown.ts  
export function registerGracefulShutdown(app, options = {}) {
  const handlerOptions = { logger, timeoutMs, cleanupTasks, shutdownState, app };

  // Register all process handlers
  process.on(ShutdownSignal.SIGINT, onSigint(handlerOptions));
  process.on(ShutdownSignal.SIGTERM, onSigterm(handlerOptions));
  process.on('uncaughtException', onUncaught(handlerOptions));
  process.on('unhandledRejection', onUnhandled(handlerOptions));

  // Return cleanup function to remove handlers
  return () => {
    process.off(ShutdownSignal.SIGINT, onSigint(handlerOptions));
    process.off(ShutdownSignal.SIGTERM, onSigterm(handlerOptions));
    process.off('uncaughtException', onUncaught(handlerOptions));
    process.off('unhandledRejection', onUnhandled(handlerOptions));
  };
}
```

### Shutdown Execution

The `performShutdown` function guarantees process termination:

```typescript
// perform-shutdown.ts
export async function performShutdown(reason, exitCode, options) {
  let finalExitCode = exitCode;

  // Timeout handler forces exit
  const timer = setTimeout(() => {
    logger.fatal(`Forced shutdown timeout after ${timeoutMs}ms (reason: ${reason})`);
    process.exit(1);
  }, timeoutMs);

  timer.unref(); // Don't keep process alive

  try {
    logger.warn(`Starting graceful shutdown (reason: ${reason})`);

    // Execute cleanup tasks
    for (const task of cleanupTasks) {
      try {
        await task(reason);
      } catch (error) {
        logger.error(`Error in cleanup task: ${formatUnknown(error)}`);
        finalExitCode = 1;
      }
    }

    // Close NestJS application
    await app.close();
    logger.log('Application closed successfully');
  } catch (error) {
    logger.fatal(`Error during shutdown: ${formatUnknown(error)}`);
    finalExitCode = 1;
  } finally {
    clearTimeout(timer);
    logger.log(`Process exiting with code ${finalExitCode} (reason: ${reason})`);
    process.exit(finalExitCode);
  }
}
```

## Logging Output

Standard shutdown logs:

```
Starting graceful shutdown (reason: signal:SIGTERM)
Application closed successfully
Process exiting with code 0 (reason: signal:SIGTERM)
```

Error scenarios:

```
Error in cleanup task: [Error details]
Error during shutdown: [Error details]  
Process exiting with code 1 (reason: signal:SIGTERM)
```

Timeout scenarios:

```
Forced shutdown timeout after 10000ms (reason: signal:SIGTERM)
```

## Cleanup Task Best Practices

Design cleanup tasks to handle errors gracefully:

```typescript
const cleanupTasks: CleanupTask[] = [
  // ✅ Good: Internal error handling
  async (reason) => {
    try {
      await database.close();
      console.log('Database closed successfully');
    } catch (error) {
      console.error('Database close failed:', error);
      // Don't throw - allow shutdown to continue
    }
  },
  
  // ❌ Avoid: Throwing errors prevents other cleanup tasks
  async (reason) => {
    await cache.disconnect(); // If this throws, shutdown stops
  },

  // ✅ Better: Wrap in try-catch
  async (reason) => {
    try {
      await cache.disconnect();
    } catch (error) {
      console.error('Cache disconnect failed:', error);
    }
  }
];
```

## Error Handling

The `formatUnknown` utility safely formats any error type:

```typescript
// format-unknown.ts
export function formatUnknown(value: unknown): string {
  if (value instanceof Error) return `${value.message}\n${value.stack ?? ''}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
```

## Best Practices

1. **Set reasonable timeouts** - Balance cleanup time vs. hanging prevention (default: 10s)
2. **Handle cleanup errors** - Use try-catch in cleanup tasks to prevent shutdown interruption
3. **Test cleanup functions** - Call the returned cleanup function in test teardown
4. **Monitor logs** - Use shutdown logs to optimize cleanup timing and debug issues
5. **Keep cleanup tasks focused** - Each task should handle one resource/connection type
6. **Avoid blocking operations** - Use timeouts in cleanup tasks for external dependencies

## Security Considerations

- **Guaranteed termination**: `process.exit()` in `finally` block prevents hanging
- **Timeout protection**: Forced exit prevents DoS via hanging cleanup tasks  
- **Race condition safety**: Single shutdown promise prevents resource exhaustion
- **Error isolation**: Individual cleanup task failures don't stop entire shutdown
- **Resource cleanup**: Proper connection/resource disposal prevents leaks