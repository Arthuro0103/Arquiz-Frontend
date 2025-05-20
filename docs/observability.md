# Sistema de Observabilidade do ArQuiz

Este documento descreve a implementação do sistema de observabilidade do ArQuiz, que utiliza práticas modernas para monitorar, rastrear e analisar o comportamento da aplicação.

## Componentes

O sistema de observabilidade do ArQuiz é composto pelos seguintes componentes:

### 1. Logs (Logging)

- **Biblioteca**: Pino
- **Formato**: JSON estruturado
- **Níveis**: error, warn, info, debug, trace
- **Contexto**: Cada log contém metadados como requestId, timestamp, nível, contexto e dados adicionais
- **Transporte**: Console em desenvolvimento, Elasticsearch em produção

#### Características

- Logs estruturados para facilitar a pesquisa e análise
- Correlação entre logs através de requestId
- Redação automática de informações sensíveis
- Logs personalizados para diferentes contextos (HTTP, WebSockets, serviços)

### 2. Métricas (Metrics)

- **Biblioteca**: OpenTelemetry
- **Exportador**: Prometheus
- **Visualização**: Grafana

#### Métricas coletadas

- **Contadores**:
  - Requisições HTTP por método e rota
  - Perguntas geradas por dificuldade
  - Conclusões de quiz
  - Conexões e mensagens WebSocket
  - Erros por tipo

- **Medidores (Gauges)**:
  - Usuários ativos
  - Quizzes ativos
  - Salas ativas

- **Histogramas**:
  - Tempo de resposta da API
  - Tempo de geração de perguntas
  - Tempo de conclusão de quiz

### 3. Rastreamento (Tracing)

- **Biblioteca**: OpenTelemetry
- **Exportador**: Jaeger
- **Visualização**: Jaeger UI

#### Características

- Rastreamento distribuído de requisições
- Visibilidade de fim a fim das operações
- Decorador `@Trace()` para rastrear métodos e funções importantes
- Instrumentação automática para HTTP, WebSockets, banco de dados

### 4. Dashboards

O ArQuiz possui dashboards pré-configurados no Grafana que mostram:

1. **Visão geral da API**:
   - Taxa de requisições
   - Tempos de resposta
   - Códigos de status HTTP

2. **Geração de Perguntas**:
   - Quantidade de perguntas geradas
   - Tempo médio de geração por dificuldade
   - Taxa de erros

3. **WebSockets**:
   - Conexões ativas
   - Mensagens por segundo
   - Erros de conexão

4. **Recursos do Sistema**:
   - Uso de CPU
   - Uso de memória
   - Utilização de disco

## Como acessar

- **Logs**: Kibana em <http://localhost:5601>
- **Métricas**: Grafana em <http://localhost:3001>
- **Rastreamento**: Jaeger UI em <http://localhost:16686>

## Endpoints de saúde (Health)

A aplicação expõe os seguintes endpoints de saúde:

- `/health`: Verificação básica de saúde (retorna 200 OK se a aplicação estiver funcional)
- `/health/details`: Informações detalhadas sobre o estado da aplicação (memória, CPU, tempo de atividade)
- `/metrics`: Endpoint Prometheus para coleta de métricas (somente interno)

## Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Aplicação      │─────▶  OpenTelemetry  │─────▶  Exportadores   │
│  (NestJS)       │     │     SDK         │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│     Pino        │─────▶  Elasticsearch  │◀────▶     Kibana      │
│   (Logging)     │     │                 │     │                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Prometheus    │◀────▶     Grafana     │     │     Alerts      │
│   (Métricas)    │     │  (Dashboards)   │─────▶                 │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘

┌─────────────────┐
│                 │
│     Jaeger      │
│  (Tracing)      │
│                 │
└─────────────────┘
```

## Considerações para produção

Em um ambiente de produção, recomenda-se:

1. Configurar alertas no Grafana para notificar sobre problemas
2. Estabelecer políticas de retenção de logs e métricas
3. Usar uma solução centralizada de logs como ELK ou Loki
4. Considerar o uso do OpenTelemetry Collector para enviar telemetria para múltiplos destinos
5. Implementar monitoramento de endpoints externos (API OpenAI, banco de dados, etc.)

## Ampliando a observabilidade

Para melhorar ainda mais a observabilidade:

1. **Log de auditoria**: Implementar logs específicos para ações críticas dos usuários
2. **Métricas de negócio**: Adicionar métricas relacionadas a KPIs e objetivos de negócio
3. **Monitoramento sintético**: Criar testes automatizados que verificam periodicamente a funcionalidade da aplicação
4. **RUM (Real User Monitoring)**: Implementar monitoramento real de usuários no frontend
5. **Profiling**: Adicionar profiling de CPU e memória para identificar gargalos de performance
