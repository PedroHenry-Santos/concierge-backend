# Graceful Shutdown Implementation

This module provides a robust graceful shutdown mechanism for NestJS applications with comprehensive error handling and race condition prevention.

## Overview

The graceful shutdown system handles application termination signals (SIGINT, SIGTERM) and unexpected errors (uncaught exceptions, unhandled rejections) by:

1. **Preventing multiple shutdown executions** - Uses singleton pattern to ensure only one shutdown process runs
2. **Executing cleanup tasks** - Runs user-defined cleanup functions before termination  
3. **Forcing termination on timeout** - Prevents hanging processes with configurable timeout
4. **Proper resource cleanup** - Closes NestJS application and logs shutdown progress

## Fixed Issues

This implementation resolves critical security and reliability issues from the previous version:

### ✅ Race Condition Prevention
- **Problem**: Multiple signals could trigger simultaneous shutdown processes
- **Solution**: Singleton pattern with atomic shutdown promise prevents duplicate executions

### ✅ Proper State Management  
- **Problem**: `shuttingDown` flag as primitive didn't share state between references
- **Solution**: Immutable `ShutdownState` object allows shared mutable state

### ✅ Reliable Process Termination
- **Problem**: Errors in shutdown logic didn't terminate the process
- **Solution**: `process.exit()` guaranteed in `finally` block with proper exit codes

### ✅ Timeout Handling
- **Problem**: Timeout errors didn't force process termination
- **Solution**: Direct `process.exit(1)` in timeout handler with `timer.unref()`

### ✅ Handler Registration Protection
- **Problem**: Multiple registrations could create memory leaks
- **Solution**: Global flags prevent duplicate handler registration

## Usage

```typescript
import { registerGracefulShutdown } from '@/infra/utils/graceful-shutdown';
import type { CleanupTask } from '@/infra/utils/types';

// Basic usage
const cleanup = registerGracefulShutdown(app);

// Advanced usage with options
const cleanup = registerGracefulShutdown(app, {
  logger: customLogger,
  timeoutMs: 15000, // 15 second timeout
  cleanupTasks: [
    async (reason) => {
      console.log(`Cleaning up due to: ${reason}`);
      await database.close();
    },
    async (reason) => {
      await cache.disconnect();
    }
  ]
});

// Call cleanup function to remove handlers (optional)
cleanup();
```

## Configuration Options

```typescript
interface GracefulShutdownOptions {
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
```

## Shutdown Reasons

The system handles different shutdown scenarios:

```typescript
type ShutdownReason =
  | 'signal:SIGINT'        // Ctrl+C or process interrupt
  | 'signal:SIGTERM'       // Process termination signal
  | 'uncaughtException'    // Unhandled JavaScript exceptions
  | 'unhandledRejection'   // Unhandled Promise rejections
  | 'manual';              // Programmatic shutdown
```

## Signal Handlers

The system automatically registers handlers for:

- **SIGINT** (Ctrl+C): Graceful shutdown with exit code 0
- **SIGTERM**: Graceful shutdown with exit code 0  
- **uncaughtException**: Immediate shutdown with exit code 1
- **unhandledRejection**: Immediate shutdown with exit code 1

## Cleanup Task Guidelines

Cleanup tasks should be designed to handle failures gracefully:

```typescript
const cleanupTasks: CleanupTask[] = [
  // ✅ Good: Handle errors internally
  async (reason) => {
    try {
      await database.close();
    } catch (error) {
      console.error('Failed to close database:', error);
      // Don't throw - let shutdown continue
    }
  },
  
  // ❌ Bad: Throwing errors stops other cleanup tasks
  async (reason) => {
    await riskyOperation(); // If this throws, other tasks won't run
  }
];
```

## Implementation Details

### Race Condition Prevention

```typescript
let shutdownPromise: Promise<void> | undefined;

export function shutdown(options: ShutdownOptions) {
  return async function (reason: ShutdownReason, exitCode: number) {
    // First check: return existing promise if shutdown in progress
    if (shutdownPromise) {
      return shutdownPromise;
    }
    
    // Second check: state-based prevention  
    if (shutdownState.isShuttingDown) {
      return;
    }
    
    shutdownState.isShuttingDown = true;
    shutdownPromise = performShutdown(reason, exitCode, options);
    return shutdownPromise;
  };
}
```

### Handler Deduplication

```typescript
let handlersRegistered = false;
let existingCleanupFunction: GracefulShutdownResponse | undefined;

export function registerGracefulShutdown(app, options) {
  if (handlersRegistered && existingCleanupFunction) {
    return existingCleanupFunction; // Return existing cleanup function
  }
  
  // Register handlers only once
  handlersRegistered = true;
  // ... register process handlers
}
```

### Guaranteed Process Exit

```typescript
async function performShutdown(reason, exitCode, options) {
  let finalExitCode = exitCode;
  
  const timer = setTimeout(() => {
    logger.fatal(`Forced shutdown timeout after ${timeoutMs}ms`);
    process.exit(1); // Force exit on timeout
  }, timeoutMs);
  
  timer.unref(); // Don't keep process alive
  
  try {
    // Execute cleanup tasks
    // Close application
  } catch (error) {
    finalExitCode = 1; // Set error exit code
  } finally {
    clearTimeout(timer);
    process.exit(finalExitCode); // Guaranteed exit
  }
}
```

## Logging Output

The system provides comprehensive logging throughout the shutdown process:

```
[GracefulShutdown] Starting graceful shutdown (reason: signal:SIGTERM)
[GracefulShutdown] Application closed successfully  
[GracefulShutdown] Process exiting with code 0 (reason: signal:SIGTERM)
```

In error scenarios:

```
[GracefulShutdown] Error in cleanup task: [Error details]
[GracefulShutdown] Error during shutdown: [Error details]
[GracefulShutdown] Process exiting with code 1 (reason: signal:SIGTERM)
```

For forced shutdowns:

```
[GracefulShutdown] Forced shutdown timeout after 10000ms (reason: signal:SIGTERM)
```

## Best Practices

1. **Set appropriate timeouts**: Balance between allowing cleanup time and preventing hanging processes
2. **Design idempotent cleanup**: Tasks should handle being called multiple times safely
3. **Don't throw in cleanup tasks**: Let the shutdown process continue even if individual tasks fail
4. **Use the cleanup function**: In tests or dynamic scenarios, call the returned cleanup function
5. **Monitor shutdown logs**: Use logs to debug shutdown issues and optimize cleanup timing

## Security Considerations

- Process termination is guaranteed via `process.exit()`
- Timeout prevents indefinite hanging that could be exploited
- Race condition prevention stops resource exhaustion from duplicate shutdowns
- Error isolation prevents single failing cleanup task from stopping entire shutdown