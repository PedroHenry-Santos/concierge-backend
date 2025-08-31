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
    // HTTP metrics
    HTTP_REQUESTS_TOTAL: 'http_requests_total',
    HTTP_REQUEST_DURATION: 'http_request_duration',
    HTTP_REQUEST_SIZE: 'http_request_size',
    HTTP_RESPONSE_SIZE: 'http_response_size',

    // Database metrics
    DATABASE_OPERATIONS_TOTAL: 'db_operations_total',
    DATABASE_OPERATION_DURATION: 'db_operation_duration',
    DATABASE_CONNECTIONS_ACTIVE: 'db_connections_active',
    DATABASE_CONNECTIONS_POOL_SIZE: 'db_connections_pool_size',

    // Queue/Messaging metrics
    QUEUE_OPERATIONS_TOTAL: 'messaging_operations_total',
    QUEUE_OPERATION_DURATION: 'messaging_operation_duration',
    QUEUE_OPERATION_ERRORS: 'queue_operations_errors_total',
    QUEUE_MESSAGE_SIZE: 'messaging_message_size',
    QUEUE_PROCESSING_TIME: 'messaging_processing_time',

    // WhatsApp specific metrics
    WHATSAPP_OPERATIONS_TOTAL: 'whatsapp_operations_total',
    WHATSAPP_OPERATION_ERRORS: 'whatsapp_operation_errors_total',
    WHATSAPP_MESSAGE_SIZE: 'whatsapp_message_size',
    WHATSAPP_WEBHOOK_DURATION: 'whatsapp_webhook_duration',

    // Application metrics
    APP_STARTUP_DURATION: 'app_startup_duration',
    APP_MEMORY_USAGE: 'app_memory_usage',
    APP_CPU_USAGE: 'app_cpu_usage',
    APP_ACTIVE_CONNECTIONS: 'app_active_connections',

    // Error metrics
    ERRORS_TOTAL: 'errors_total',
    EXCEPTIONS_TOTAL: 'exceptions_total',

    // Performance metrics
    EXECUTION_TIME: 'execution_time',
    OPERATION_COUNT: 'operation_count',

    // Business metrics (pre-approved names to avoid high cardinality)
    BUSINESS_EVENT_COUNT: 'business_event_count',
    USER_ACTION_COUNT: 'user_action_count',
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
