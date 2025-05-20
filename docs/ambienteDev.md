# Ambiente de Desenvolvimento para o Backend do MasterPlan

## Estrutura do Ambiente

Para o desenvolvimento do backend do MasterPlan, vou propor um ambiente completo baseado em Docker que facilite o desenvolvimento local, testes e depuração. Este ambiente seguirá as diretrizes técnicas estabelecidas anteriormente.

### 1. Estrutura de Diretórios

```
masterplan/
├── .vscode/                    # Configurações do VSCode
├── .github/                    # Workflows do GitHub Actions
├── docker/                     # Arquivos Docker específicos
│   ├── database/               # Scripts de inicialização do PostgreSQL  
│   ├── rabbitmq/               # Configurações do RabbitMQ
│   └── observability/          # Configurações do stack de observabilidade
├── src/                        # Código-fonte do NestJS
├── test/                       # Testes automatizados
├── .env.example                # Template para variáveis de ambiente
├── .eslintrc.js                # Configuração do ESLint
├── .prettierrc                 # Configuração do Prettier
├── docker-compose.yml          # Configuração principal de contêineres
├── docker-compose.dev.yml      # Configuração específica para desenvolvimento
├── docker-compose.test.yml     # Configuração para ambiente de testes
├── Dockerfile                  # Para build de produção
├── Dockerfile.dev              # Para ambiente de desenvolvimento
└── package.json
```

### 2. Docker Compose para Desenvolvimento

```yaml
# docker-compose.yml (base)
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: masterplan-postgres
    environment:
      POSTGRES_USER: ${DB_USERNAME:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-masterplan}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - masterplan-network

  redis:
    image: redis:7-alpine
    container_name: masterplan-redis
    ports:
      - "${REDIS_PORT:-6379}:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - masterplan-network

  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: masterplan-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-guest}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-guest}
    ports:
      - "${RABBITMQ_PORT:-5672}:5672"
      - "${RABBITMQ_MANAGEMENT_PORT:-15672}:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      - ./docker/rabbitmq/rabbitmq.conf:/etc/rabbitmq/rabbitmq.conf:ro
    healthcheck:
      test: ["CMD", "rabbitmqctl", "status"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - masterplan-network

networks:
  masterplan-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
```

```yaml
# docker-compose.dev.yml (específico para desenvolvimento)
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: masterplan-api
    command: npm run start:dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "${API_PORT:-3000}:3000"
      - "${DEBUG_PORT:-9229}:9229" # Para debugging
    env_file:
      - .env.dev
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - masterplan-network

  # Stack de observabilidade
  elasticsearch:
    image: elasticsearch:8.7.0
    container_name: masterplan-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "${ELASTICSEARCH_PORT:-9200}:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - masterplan-network

  logstash:
    image: logstash:8.7.0
    container_name: masterplan-logstash
    volumes:
      - ./docker/observability/logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "${LOGSTASH_PORT:-5044}:5044"
    depends_on:
      - elasticsearch
    networks:
      - masterplan-network

  kibana:
    image: kibana:8.7.0
    container_name: masterplan-kibana
    ports:
      - "${KIBANA_PORT:-5601}:5601"
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - masterplan-network

  prometheus:
    image: prom/prometheus:v2.45.0
    container_name: masterplan-prometheus
    volumes:
      - ./docker/observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "${PROMETHEUS_PORT:-9090}:9090"
    networks:
      - masterplan-network

  grafana:
    image: grafana/grafana:10.0.0
    container_name: masterplan-grafana
    ports:
      - "${GRAFANA_PORT:-3001}:3000"
    volumes:
      - ./docker/observability/grafana/provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    depends_on:
      - prometheus
    networks:
      - masterplan-network

  jaeger:
    image: jaegertracing/all-in-one:1.47.0
    container_name: masterplan-jaeger
    ports:
      - "${JAEGER_UI_PORT:-16686}:16686"
      - "${JAEGER_COLLECTOR_PORT:-14268}:14268"
    networks:
      - masterplan-network

volumes:
  elasticsearch_data:
  prometheus_data:
  grafana_data:
```

### 3. Dockerfile para Desenvolvimento

```dockerfile
# Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# Instalação de ferramentas úteis para desenvolvimento
RUN apk add --no-cache git curl jq

# Variáveis de ambiente para NestJS
ENV NODE_ENV=development

# Instalação global de dependências de desenvolvimento
RUN npm install -g @nestjs/cli typescript ts-node nodemon rimraf

# Cópia dos arquivos de package.json e instalação de dependências
COPY package*.json ./
RUN npm install

# Configuração para entrada no container
CMD ["npm", "run", "start:dev"]
```

### 4. Arquivo `.env.example`

```
# Configurações do Aplicativo
NODE_ENV=development
API_PORT=3000
DEBUG_PORT=9229
LOG_LEVEL=debug
API_PREFIX=/api
JWT_SECRET=masterplan_secret_key_change_in_production
JWT_EXPIRATION=1d

# Configurações do Banco de Dados
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=masterplan
DB_SCHEMA=public
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis
REDIS_TTL=3600

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_QUEUE_PREFIX=masterplan

# OpenAI (para geração de perguntas via IA)
OPENAI_API_KEY=your_openai_api_key

# Observabilidade
ELASTICSEARCH_HOST=elasticsearch
ELASTICSEARCH_PORT=9200
KIBANA_PORT=5601
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
JAEGER_HOST=jaeger
JAEGER_PORT=14268
TRACE_SAMPLE_RATE=1.0
```

### 5. Scripts para o arquivo `package.json`

```json
{
  "scripts": {
    "dev:up": "docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d",
    "dev:down": "docker-compose -f docker-compose.yml -f docker-compose.dev.yml down",
    "dev:logs": "docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f api",
    "dev:rebuild": "docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build",
    "dev:ps": "docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps",
    "dev:shell": "docker exec -it masterplan-api sh",
    "db:studio": "npx prisma studio",
    "db:migrate": "npx prisma migrate dev",
    "db:reset": "npx prisma migrate reset --force",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d && jest --config ./test/jest-e2e.json --runInBand && docker-compose -f docker-compose.yml -f docker-compose.test.yml down",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"
  }
}
```

### 6. Configuração do VSCode

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "typescript"
  ],
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.tsdk": "node_modules\\typescript\\lib",
  "sqltools.connections": [
    {
      "name": "MasterPlan DB",
      "driver": "PostgreSQL",
      "server": "localhost",
      "port": 5432,
      "database": "masterplan",
      "username": "postgres",
      "password": "postgres"
    }
  ],
  "material-icon-theme.activeIconPack": "nest",
  "jest.autoRun": "off",
  "jest.jestCommandLine": "npm run test --"
}
```

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Debug NestJS",
      "port": 9229,
      "restart": true,
      "sourceMaps": true,
      "remoteRoot": "/app",
      "localRoot": "${workspaceFolder}"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Current File",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "${fileBasename}",
        "--config",
        "jest.config.ts"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true
    }
  ]
}
```

### 7. Scripts de Inicialização de Banco de Dados

```sql
-- docker/database/init.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Esquema para auditoria
CREATE SCHEMA IF NOT EXISTS audit;

-- Função para registrar alterações
CREATE OR REPLACE FUNCTION audit.create_audit_trigger(target_table regclass) RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TRIGGER audit_trigger_row
    AFTER INSERT OR UPDATE OR DELETE ON %s
    FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();
    ', target_table);
END;
$$ LANGUAGE plpgsql;

-- Função que popula a tabela de auditoria
CREATE OR REPLACE FUNCTION audit.audit_trigger_func() RETURNS trigger AS $$
DECLARE
  audit_row audit.logged_actions;
BEGIN
  IF TG_WHEN <> 'AFTER' THEN
    RAISE EXCEPTION 'audit.audit_trigger_func() must be triggered AFTER INSERT/UPDATE/DELETE';
  END IF;

  audit_row = ROW(
    nextval('audit.logged_actions_event_id_seq'),     -- event_id
    TG_TABLE_SCHEMA::text,                            -- schema_name
    TG_TABLE_NAME::text,                              -- table_name
    TG_RELID,                                         -- relation OID
    session_user::text,                               -- session_user_name
    current_timestamp,                                -- action_timestamp
    statement_timestamp(),                            -- statement_timestamp
    clock_timestamp(),                                -- clock_timestamp
    current_setting('application_name'),              -- client_application
    current_setting('application.user_id', true),     -- application_user_id
    TG_OP,                                            -- action
    NULL, NULL,                                       -- row_data, changed_fields
    'f'                                               -- statement_only
  );

  IF TG_OP = 'UPDATE' THEN
    audit_row.row_data = to_jsonb(OLD.*);
    audit_row.changed_fields = jsonb_diff_val(to_jsonb(OLD.*), to_jsonb(NEW.*));
  ELSIF TG_OP = 'DELETE' THEN
    audit_row.row_data = to_jsonb(OLD.*);
  ELSIF TG_OP = 'INSERT' THEN
    audit_row.row_data = to_jsonb(NEW.*);
  ELSE
    RAISE EXCEPTION '[audit.audit_trigger_func] - Trigger func added as trigger for unhandled case: %, %', TG_OP, TG_LEVEL;
  END IF;

  INSERT INTO audit.logged_actions VALUES (audit_row.*);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criação da tabela de auditoria
CREATE TABLE IF NOT EXISTS audit.logged_actions (
  event_id bigserial PRIMARY KEY,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  relid oid NOT NULL,
  session_user_name text,
  action_timestamp timestamp with time zone NOT NULL,
  statement_timestamp timestamp with time zone NOT NULL,
  clock_timestamp timestamp with time zone NOT NULL,
  client_application text,
  application_user_id text,
  action text NOT NULL CHECK (action IN ('I','D','U','T')),
  row_data jsonb,
  changed_fields jsonb,
  statement_only boolean NOT NULL
);

-- Índices para otimização de consultas de auditoria
CREATE INDEX IF NOT EXISTS logged_actions_action_idx ON audit.logged_actions(action);
CREATE INDEX IF NOT EXISTS logged_actions_table_name_idx ON audit.logged_actions(table_name);
CREATE INDEX IF NOT EXISTS logged_actions_application_user_id_idx ON audit.logged_actions(application_user_id);
CREATE INDEX IF NOT EXISTS logged_actions_action_timestamp_idx ON audit.logged_actions(action_timestamp);
```

### 8. Configuração do ESLint

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint/eslint-plugin',
    'prettier',
    'import',
    'simple-import-sort',
  ],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'max-len': ['error', { 'code': 100, 'ignoreComments': true, 'ignoreStrings': true }],
    'max-lines-per-function': ['error', { 'max': 20, 'skipBlankLines': true, 'skipComments': true }],
    'complexity': ['error', 10],
    'max-params': ['error', 4],
    'max-depth': ['error', 3],
  },
};
```

### 9. Configuração do Prettier

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 10. Configuração para Observabilidade

```yaml
# docker/observability/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'masterplan-api'
    metrics_path: /metrics
    static_configs:
      - targets: ['api:3000']
```

```yaml
# docker/observability/grafana/provisioning/datasources/datasource.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
  
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    isDefault: false

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "[masterplan-logs-]YYYY.MM.DD"
    isDefault: false
```

## Instalação e Uso

### 1. Pré-requisitos

- Docker e Docker Compose
- Node.js (v18+) e npm (recomendado para execução de comandos fora do container)
- Git

### 2. Passos de Configuração Inicial

1. Clone o repositório
   ```bash
   git clone https://github.com/seu-usuario/masterplan.git
   cd masterplan
   ```

2. Copie o arquivo de exemplo de variáveis de ambiente
   ```bash
   cp .env.example .env.dev
   ```

3. Inicie o ambiente de desenvolvimento
   ```bash
   npm run dev:up
   ```

4. Acesse os serviços
   - API NestJS: http://localhost:3000
   - Adminer (gerenciador do PostgreSQL): http://localhost:8080
   - RabbitMQ Management: http://localhost:15672
   - Kibana: http://localhost:5601
   - Grafana: http://localhost:3001
   - Jaeger UI: http://localhost:16686

### 3. Fluxo de Desenvolvimento

1. Modifique o código-fonte em sua máquina local
2. O nodemon dentro do container detectará as alterações e reiniciará automaticamente o servidor
3. Use `npm run dev:logs` para visualizar os logs da aplicação em tempo real
4. Para acessar o shell dentro do container: `npm run dev:shell`
5. Execute testes unitários: `npm test`
6. Execute testes E2E: `npm run test:e2e`

### 4. Debugging

1. Use o VS Code para depuração:
   - Adicione breakpoints no código
   - Inicie a sessão de debugging com F5 (ou use o painel de debugging)
   - O VS Code se conectará ao container em execução

### 5. Banco de Dados

1. Para visualizar o banco de dados:
   - Execute `npm run db:studio` para iniciar o Prisma Studio
   - Acesse http://localhost:5555
   
2. Para aplicar migrações:
   - Execute `npm run db:migrate` para gerar e aplicar migrações
   - Execute `npm run db:reset` para resetar o banco de dados (⚠️ cuidado em desenvolvimento)

## Integração com IDEs

### VS Code

Extensões recomendadas:
- ESLint
- Prettier
- Docker
- REST Client
- PostgreSQL
- Thunder Client (para testes de API)
- NestJS Snippets
- TypeScript Hero
- Todo Tree
- GitLens

## Observabilidade

### 1. Logs

- Todos os logs da aplicação são enviados para o ElasticSearch através do Logstash
- Visualize e analise os logs pelo Kibana: http://localhost:5601
- Padrão de logs estruturados em JSON com context, trace_id, e outros metadados

### 2. Métricas

- Métricas de aplicação expostas em `/metrics` no formato Prometheus
- Dashboard predefinidos no Grafana para:
  - Métricas de NestJS (requisições, latência, erros)
  - Métricas de Node.js (memória, CPU, event loop)
  - Métricas de PostgreSQL e Redis

### 3. Tracing

- Rastreamento distribuído com Jaeger
- Cada requisição recebe um ID único de rastreamento
- Visualize a propagação de requisições através de múltiplos serviços
- Identifique gargalos de performance com timelines detalhados

## Conclusão

Este ambiente de desenvolvimento completo facilita o trabalho da equipe ao:

- Garantir consistência de ambiente entre desenvolvedores
- Fornecer ferramentas para debugging e observabilidade
- Automatizar tarefas comuns de desenvolvimento
- Isolar dependências em containers
- Facilitar testes locais antes do CI/CD
- Permitir simulação de condições próximas à produção

Com esta configuração, a equipe pode focar no desenvolvimento das funcionalidades centrais do MVP do MasterPlan, mantendo padrões elevados de qualidade de código e observabilidade desde o início do projeto.