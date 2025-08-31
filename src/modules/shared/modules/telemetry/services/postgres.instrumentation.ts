import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

import { TelemetryService } from './telemetry.service';

@Injectable()
export class PostgresInstrumentationService {
  private readonly logger = new Logger(PostgresInstrumentationService.name);
  private readonly tracer = trace.getTracer('postgres-slonik-instrumentation');

  constructor(private readonly telemetryService: TelemetryService) {}

  /**
   * Instrument Slonik database queries
   */
  instrumentSlonikQuery<T>(
    sql: string,
    values: readonly unknown[] = [],
    operation: () => Promise<T>,
    queryType:
      | 'SELECT'
      | 'INSERT'
      | 'UPDATE'
      | 'DELETE'
      | 'TRANSACTION' = 'SELECT',
  ): Promise<T> {
    return this.telemetryService.startActiveSpan(
      `db.query.${queryType.toLowerCase()}`,
      async (span) => {
        span.setAttributes({
          'db.system': 'postgresql',
          'db.statement': sql,
          'db.operation': queryType.toLowerCase(),
          'db.sql.table': this.extractTableName(sql),
          'db.connection_string': 'postgresql://[REDACTED]', // Don't expose real connection
          'db.user': '[REDACTED]',
        });

        if (values.length > 0) {
          span.setAttributes({
            'db.statement.parameters_count': values.length,
          });
        }

        const startTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'db.query.duration_ms': duration,
            'db.query.success': true,
            'db.query.duration': duration,
          });

          this.telemetryService.setSpanStatus('ok');
          this.logger.debug(
            `Database query completed successfully in ${duration}ms`,
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'db.query.duration_ms': duration,
              'db.query.success': false,
              'db.query.error': errorMessage,
              'db.statement': sql,
              'db.operation': queryType,
            },
          );

          this.logger.error(
            `Database query failed after ${duration}ms:`,
            error,
          );
          throw error;
        }
      },
      {
        kind: 'client',
        attributes: {
          component: 'database',
          'db.type': 'postgresql',
        },
      },
    );
  }

  /**
   * Instrument database transactions
   */
  instrumentTransaction<T>(
    operation: () => Promise<T>,
    transactionName = 'database_transaction',
  ): Promise<T> {
    return this.telemetryService.startActiveSpan(
      `db.transaction.${transactionName}`,
      async (span) => {
        span.setAttributes({
          'db.system': 'postgresql',
          'db.operation': 'transaction',
          'transaction.name': transactionName,
        });

        const startTime = Date.now();

        try {
          const result = await operation();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'transaction.duration_ms': duration,
            'transaction.success': true,
          });

          this.telemetryService.setSpanStatus('ok');
          this.logger.debug(
            `Database transaction ${transactionName} completed in ${duration}ms`,
          );

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'transaction.duration_ms': duration,
              'transaction.success': false,
              'transaction.error': errorMessage,
              'transaction.name': transactionName,
            },
          );

          this.logger.error(
            `Database transaction ${transactionName} failed after ${duration}ms:`,
            error,
          );
          throw error;
        }
      },
      {
        kind: 'client',
        attributes: {
          component: 'database',
          'db.type': 'postgresql',
        },
      },
    );
  }

  /**
   * Instrument database connection pool operations
   */
  instrumentConnectionPool<T>(
    operation: 'acquire' | 'release' | 'destroy',
    callback: () => Promise<T>,
  ): Promise<T> {
    return this.telemetryService.startActiveSpan(
      `db.pool.${operation}`,
      async (span) => {
        span.setAttributes({
          'db.system': 'postgresql',
          'db.pool.operation': operation,
        });

        const startTime = Date.now();

        try {
          const result = await callback();
          const duration = Date.now() - startTime;

          span.setAttributes({
            'db.pool.duration_ms': duration,
            'db.pool.success': true,
          });

          this.telemetryService.setSpanStatus('ok');
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          this.telemetryService.recordException(
            error instanceof Error ? error : new Error(errorMessage),
            {
              'db.pool.duration_ms': duration,
              'db.pool.success': false,
              'db.pool.error': errorMessage,
            },
          );

          throw error;
        }
      },
      {
        kind: 'client',
        attributes: {
          component: 'database-pool',
        },
      },
    );
  }

  /**
   * Extract table name from SQL query for better observability
   */
  private extractTableName(sql: string): string {
    const normalizedSql = sql.toUpperCase().trim();

    // Simple regex patterns to extract table names
    const patterns = [
      /from\s+([\w"]+)/i, // SELECT ... FROM table
      /update\s+([\w"]+)/i, // UPDATE table ...
      /insert\s+into\s+([\w"]+)/i, // INSERT INTO table ...
      /delete\s+from\s+([\w"]+)/i, // DELETE FROM table ...
    ];

    for (const pattern of patterns) {
      const match = normalizedSql.match(pattern);
      if (match?.[1]) {
        return match[1].replaceAll('"', ''); // Remove quotes
      }
    }

    return 'unknown_table';
  }
}
