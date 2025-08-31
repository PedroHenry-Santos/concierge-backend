/**
 * Centralized constants for OpenTelemetry instrumentation names
 * Following OpenTelemetry best practices for consistent naming
 *
 * These values serve as FALLBACK/DEFAULT values when no configuration is provided
 * to the TelemetryModule. To customize, use TelemetryModule.forRoot({ serviceName: 'your-app' })
 */
export const TELEMETRY_CONSTANTS = {
  /**
   * Default instrumentation name - used when no serviceName is provided
   * Can be overridden via TelemetryModuleOptions.serviceName
   */
  INSTRUMENTATION_NAME: 'whatsapp-backend',

  /**
   * Default instrumentation version - used when no serviceVersion is provided
   * Can be overridden via TelemetryModuleOptions.serviceVersion
   */
  INSTRUMENTATION_VERSION: '1.0.0',

  /**
   * Semantic conventions for custom attributes
   */
  ATTRIBUTES: {
    SERVICE_NAME: 'whatsapp-backend',
    SERVICE_VERSION: '1.0.0',
    DEPLOYMENT_ENVIRONMENT: process.env.NODE_ENV ?? 'development',
  } as const,

  /**
   * Metric names following OpenTelemetry semantic conventions
   */
  METRICS: {
    HTTP_REQUESTS_TOTAL: 'http_requests_total',
    HTTP_REQUEST_DURATION: 'http_request_duration',
    DATABASE_OPERATIONS_TOTAL: 'db_operations_total',
    DATABASE_OPERATION_DURATION: 'db_operation_duration',
    QUEUE_OPERATIONS_TOTAL: 'messaging_operations_total',
    QUEUE_OPERATION_DURATION: 'messaging_operation_duration',
    QUEUE_OPERATION_ERRORS: 'queue_operations_errors_total',
    WHATSAPP_OPERATIONS_TOTAL: 'whatsapp_operations_total',
    WHATSAPP_OPERATION_ERRORS: 'whatsapp_operation_errors_total',
  } as const,

  /**
   * Span names following OpenTelemetry semantic conventions
   */
  SPANS: {
    HTTP_REQUEST: 'http_request',
    DATABASE_QUERY: 'db_query',
    DATABASE_TRANSACTION: 'db_transaction',
    MESSAGING_SEND: 'messaging_send',
    MESSAGING_RECEIVE: 'messaging_receive',
    MESSAGING_PROCESS: 'messaging_process',
    WHATSAPP_MESSAGE_SEND: 'whatsapp_message_send',
    WHATSAPP_MESSAGE_RECEIVE: 'whatsapp_message_receive',
  } as const,
} as const;
