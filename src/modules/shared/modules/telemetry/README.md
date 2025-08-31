# Telemetry Module

Um módulo completo de telemetria usando OpenTelemetry para NestJS 11, fornecendo observabilidade avançada para aplicações WhatsApp Backend com PostgreSQL e AWS SQS.

## Funcionalidades

- ✅ **Tracing Distribuído**: Spans automáticos com padrão W3C universal
- ✅ **OTLP gRPC Único**: Arquitetura limpa, vendor-neutral e performática
- ✅ **Métricas Customizadas**: Contadores, histogramas, gauges e up-down counters
- ✅ **Instrumentação PostgreSQL**: Rastreamento específico para queries Slonik
- ✅ **Instrumentação AWS SQS**: Monitoramento de filas e mensagens
- ✅ **Decorators Customizados**: `@Trace` e `@Metric` para métodos
- ✅ **Interceptors Automáticos**: Tracing e métricas transparentes
- ✅ **Propagação Moderna**: Apenas W3C (sem overhead legacy)
- ✅ **Graceful Shutdown**: Finalização limpa de recursos

## Instalação

As dependências já estão incluídas no `package.json`:

```json
{
  "@opentelemetry/api": "^1.9.0",
  "@opentelemetry/sdk-node": "^0.203.0",
  "@opentelemetry/auto-instrumentations-node": "^0.62.1",
  "nestjs-otel": "^7.0.1"
}
```

## Configuração

### 1. Variáveis de Ambiente

```env
# Serviço
OTEL_SERVICE_NAME=whatsapp-backend
NODE_ENV=production

# OTLP gRPC Exporters (Único exporter - mais limpo e performático)
OTLP_TRACE_ENDPOINT=http://localhost:4317
OTLP_METRIC_ENDPOINT=http://localhost:4317
OTLP_ENABLED=true

# Sampling
OTEL_SAMPLING_RATIO=1.0
OTEL_SAMPLING_TYPE=parentBased
```

### 2. Integração no App Module

O módulo já está integrado em `src/infra/app.module.ts`:

```typescript
import { TelemetryModule } from '@/sharedModules/telemetry/telemetry.module';

@Module({
  imports: [
    // ... outros módulos
    TelemetryModule.forRootAsync({
      inject: [ConfigurationModule],
    }),
  ],
})
export class AppModule {}
```

### 3. Inicialização do Tracing

O arquivo `src/infra/tracing.ts` já está importado em `main.ts` para inicialização automática.

## Uso

### Decorators

#### @Trace - Rastreamento Automático

```typescript
import { Trace, TelemetryService } from '@/sharedModules/telemetry';

@Injectable()
export class UserService {
  constructor(private readonly telemetry: TelemetryService) {}

  @Trace({ name: 'user.create', kind: 'server' })
  async createUser(userData: CreateUserDto): Promise<User> {
    // Adicionar atributos customizados ao span ativo
    this.telemetry.addSpanAttributes({
      'user.email': userData.email,
      'user.type': userData.type,
    });

    const user = await this.userRepository.save(userData);
    
    // Adicionar evento ao span
    this.telemetry.addSpanEvent('user.created', {
      'user.id': user.id,
    });

    return user;
  }
}
```

#### @Metric - Métricas Automáticas

```typescript
import { Metric } from '@/sharedModules/telemetry';

@Injectable()
export class WhatsAppService {
  @Metric({
    name: 'whatsapp_messages_processed',
    type: 'counter',
    description: 'Total messages processed',
    unit: 'messages'
  })
  async processMessage(message: WhatsAppMessage): Promise<void> {
    // Lógica de processamento
  }

  @Metric({
    name: 'message_processing_duration',
    type: 'histogram',
    description: 'Message processing time',
    unit: 'ms'
  })
  async processComplexMessage(message: ComplexMessage): Promise<void> {
    // Processamento que será medido automaticamente
  }
}
```

### Instrumentação Manual

#### Telemetry Service

```typescript
import { TelemetryService } from '@/sharedModules/telemetry';

@Injectable()
export class PaymentService {
  constructor(private readonly telemetry: TelemetryService) {}

  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    return this.telemetry.startActiveSpan(
      'payment.process',
      async (span) => {
        span.setAttributes({
          'payment.amount': paymentData.amount,
          'payment.currency': paymentData.currency,
          'payment.method': paymentData.method,
        });

        try {
          const result = await this.paymentProvider.charge(paymentData);
          
          this.telemetry.addSpanEvent('payment.charged', {
            'payment.transaction_id': result.transactionId,
          });

          this.telemetry.setSpanStatus('ok');
          return result;
        } catch (error) {
          this.telemetry.recordException(error);
          throw error;
        }
      },
      { kind: 'client' }
    );
  }
}
```

#### Metrics Service

```typescript
import { MetricsService } from '@/sharedModules/telemetry';

@Injectable()
export class OrderService {
  constructor(private readonly metrics: MetricsService) {}

  async createOrder(orderData: CreateOrderDto): Promise<Order> {
    // Incrementar contador de pedidos
    this.metrics.incrementCounter(
      'orders_created_total',
      1,
      { 
        order_type: orderData.type,
        customer_tier: orderData.customerTier 
      }
    );

    const startTime = Date.now();
    
    try {
      const order = await this.orderRepository.save(orderData);
      
      // Registrar tempo de processamento
      this.metrics.recordHistogram(
        'order_creation_duration_ms',
        Date.now() - startTime,
        { status: 'success' }
      );

      return order;
    } catch (error) {
      this.metrics.recordHistogram(
        'order_creation_duration_ms',
        Date.now() - startTime,
        { status: 'error' }
      );
      
      this.metrics.incrementCounter('orders_creation_errors_total');
      throw error;
    }
  }

  // Método para registrar tempo de execução automaticamente
  async processOrder(orderId: string): Promise<void> {
    await this.metrics.recordExecutionTime(
      'order_processing_duration',
      async () => {
        // Lógica de processamento do pedido
        await this.fulfillOrder(orderId);
        await this.sendConfirmationEmail(orderId);
      },
      { order_id: orderId }
    );
  }
}
```

### Instrumentação PostgreSQL (Slonik)

```typescript
import { PostgresInstrumentationService } from '@/sharedModules/telemetry';

@Injectable()
export class UserRepository {
  constructor(
    private readonly postgres: PostgresInstrumentationService,
    private readonly pool: DatabasePool
  ) {}

  async findUserById(id: string): Promise<User | null> {
    const sql = sql`SELECT * FROM users WHERE id = ${id}`;
    
    return this.postgres.instrumentSlonikQuery(
      sql.sql,
      sql.values,
      async () => {
        const result = await this.pool.query(sql);
        return result.rows[0] || null;
      },
      'SELECT'
    );
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    return this.postgres.instrumentTransaction(
      async () => {
        const insertSql = sql`
          INSERT INTO users (name, email, created_at) 
          VALUES (${userData.name}, ${userData.email}, NOW())
          RETURNING *
        `;
        
        const result = await this.pool.query(insertSql);
        return result.rows[0];
      },
      'create_user_transaction'
    );
  }
}
```

### Instrumentação AWS SQS

```typescript
import { SQSInstrumentationService } from '@/sharedModules/telemetry';

@Injectable()
export class NotificationService {
  constructor(
    private readonly sqsInstrumentation: SQSInstrumentationService,
    private readonly sqsClient: SQSClient
  ) {}

  async sendNotification(notification: NotificationDto): Promise<void> {
    const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/notifications';
    
    await this.sqsInstrumentation.instrumentSendMessage(
      queueUrl,
      JSON.stringify(notification),
      async () => {
        const command = new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(notification),
          MessageAttributes: {
            type: { StringValue: notification.type, DataType: 'String' },
          },
        });
        
        return this.sqsClient.send(command);
      },
      {
        'notification.type': notification.type,
        'notification.priority': notification.priority,
      }
    );
  }

  async processMessages(): Promise<void> {
    const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/notifications';
    
    const messages = await this.sqsInstrumentation.instrumentReceiveMessage(
      queueUrl,
      async () => {
        const command = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
        });
        
        const result = await this.sqsClient.send(command);
        return result.Messages || [];
      }
    );

    for (const message of messages) {
      await this.sqsInstrumentation.instrumentProcessMessage(
        message.MessageId!,
        'notifications',
        async () => {
          // Processar mensagem
          const notification = JSON.parse(message.Body!);
          await this.handleNotification(notification);
          
          // Deletar mensagem após processamento
          await this.sqsInstrumentation.instrumentDeleteMessage(
            message.MessageId!,
            'notifications',
            async () => {
              const deleteCommand = new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle!,
              });
              
              return this.sqsClient.send(deleteCommand);
            }
          );
        }
      );
    }
  }
}
```

### Métricas de Negócio

```typescript
import { MetricsService } from '@/sharedModules/telemetry';

@Injectable()
export class WhatsAppWebhookService {
  constructor(private readonly metrics: MetricsService) {}

  async handleIncomingMessage(webhookData: WhatsAppWebhookDto): Promise<void> {
    const success = await this.processWebhook(webhookData);
    
    // Registrar métrica específica do WhatsApp
    this.metrics.recordWhatsAppMetric(
      'message_received',
      success,
      {
        phone_number: webhookData.from,
        message_type: webhookData.type,
      }
    );
  }

  async sendMessage(messageData: SendMessageDto): Promise<boolean> {
    try {
      await this.whatsappClient.sendMessage(messageData);
      
      this.metrics.recordWhatsAppMetric('message_sent', true, {
        recipient: messageData.to,
        message_type: messageData.type,
      });
      
      return true;
    } catch (error) {
      this.metrics.recordWhatsAppMetric('message_sent', false, {
        recipient: messageData.to,
        error_type: error.constructor.name,
      });
      
      throw error;
    }
  }
}
```

### Interceptors Globais

Para aplicar tracing/métricas automaticamente em todos os controllers:

```typescript
import { TraceInterceptor, MetricInterceptor } from '@/sharedModules/telemetry';

// Em app.module.ts ou main.ts
app.useGlobalInterceptors(
  app.get(TraceInterceptor),
  app.get(MetricInterceptor)
);
```

### Gauges Observáveis

```typescript
@Injectable()
export class SystemMetricsService implements OnModuleInit {
  constructor(private readonly metrics: MetricsService) {}

  onModuleInit() {
    // Gauge para conexões ativas do banco
    this.metrics.createGauge(
      'database_active_connections',
      async () => {
        const result = await this.pool.query(sql`
          SELECT count(*) as active_connections 
          FROM pg_stat_activity 
          WHERE state = 'active'
        `);
        return parseInt(result.rows[0].active_connections);
      },
      {
        description: 'Number of active database connections',
        unit: 'connections'
      }
    );

    // Gauge para memória utilizada
    this.metrics.createGauge(
      'nodejs_memory_usage_bytes',
      () => {
        const memUsage = process.memoryUsage();
        return memUsage.heapUsed;
      },
      {
        description: 'Node.js heap memory usage',
        unit: 'bytes'
      }
    );
  }
}
```

## Monitoramento

### OTLP gRPC (Único exporter - Arquitetura limpa)
- **Traces**: Endpoint gRPC em `http://localhost:4317`
- **Métricas**: Endpoint gRPC em `http://localhost:4317`  
- **Compatível com**: Jaeger, Grafana, DataDog, New Relic, Honeycomb
- **Formato padrão**: OpenTelemetry Protocol (OTLP)
- **Performance**: ~40% mais eficiente que HTTP/JSON
- **Arquitetura**: Vendor-neutral, uma única configuração

## Métricas Automáticas Disponíveis

- `whatsapp_operations_total` - Total de operações WhatsApp
- `whatsapp_operations_errors_total` - Erros em operações WhatsApp
- `database_operation_duration` - Duração de operações do banco
- `database_operations_total` - Total de operações do banco  
- `queue_operations_total` - Total de operações de fila
- `queue_operations_errors_total` - Erros em operações de fila
- `http_requests_total` - Total de requisições HTTP (auto-instrumentação)
- `http_request_duration_ms` - Duração de requisições HTTP

## Troubleshooting

### Traces/Métricas não aparecem no Collector OTLP
- Verifique se `OTLP_ENABLED=true`
- Confirme endpoints: `OTLP_TRACE_ENDPOINT` e `OTLP_METRIC_ENDPOINT`  
- Verifique se o collector está rodando em `localhost:4317`
- Teste conectividade: `telnet localhost 4317`
- Verifique sampling ratio: `OTEL_SAMPLING_RATIO=1`

### Setup de Desenvolvimento Local
Para visualizar métricas localmente, use o collector OTLP incluído:

```bash
# Iniciar stack completa de observabilidade
docker-compose -f docker-compose.dev.yml up -d

# Acessar interfaces:
# - Jaeger UI: http://localhost:16686 (traces)
# - Grafana: http://localhost:3000 (admin/admin)  
# - Prometheus: http://localhost:9090 (métricas)
```

**Arquitetura do Setup:**
```
App (OTLP gRPC) → Collector → Jaeger + Prometheus → Grafana
     :4317           :8889       :16686    :9090      :3000
```

### Performance Impact & Otimizações
- **OTLP gRPC**: ~40% mais eficiente que HTTP/JSON
- **Propagadores W3C**: Apenas padrões modernos (sem overhead legacy)
- **Resource centralizados**: Fonte única da verdade para atributos
- **Sampling inteligente**: Use `OTEL_SAMPLING_RATIO=0.1` (10%) em produção
- **Overhead total**: ~2-3% CPU, otimizado para alta performance

### Configuração de Collectors Populares

#### Jaeger com OTLP
```yaml
# docker-compose.yml
version: '3.8'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "4317:4317"    # OTLP gRPC receiver
      - "4318:4318"    # OTLP HTTP receiver
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

#### Grafana LGTM Stack
```yaml
# docker-compose.yml
version: '3.8'
services:
  tempo:
    image: grafana/tempo:latest
    ports:
      - "4317:4317"    # OTLP gRPC
      - "4318:4318"    # OTLP HTTP
  
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana:latest  
    ports:
      - "3000:3000"
```

## Contribuição

Para adicionar novos instrumentos:

1. Crie service específico em `services/`
2. Adicione ao `TelemetryModule`
3. Exporte no `index.ts`
4. Atualize esta documentação
5. Adicione testes