# Variáveis de Ambiente para ArQuiz

Este documento lista todas as variáveis de ambiente necessárias para executar a aplicação ArQuiz.

## Como Usar

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
# Configurações de Banco de Dados
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=arquiz
DATABASE_PASSWORD=arquiz
DATABASE_NAME=arquiz
DATABASE_URL=postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}

# Configurações de Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}

# Configurações de RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=arquiz
RABBITMQ_PASSWORD=arquiz
RABBITMQ_URL=amqp://${RABBITMQ_USER}:${RABBITMQ_PASSWORD}@${RABBITMQ_HOST}:${RABBITMQ_PORT}

# Configurações da Aplicação
NODE_ENV=development
PORT=3000
JWT_SECRET=seu_jwt_secret_aqui
JWT_EXPIRATION=7d

# Configurações do OpenAI
OPENAI_API_KEY=sua_chave_api_aqui
```

## Descrição das Variáveis

### Banco de Dados
- `DATABASE_HOST`: Host do servidor PostgreSQL (padrão: localhost)
- `DATABASE_PORT`: Porta do servidor PostgreSQL (padrão: 5432)
- `DATABASE_USER`: Usuário do PostgreSQL (padrão: arquiz)
- `DATABASE_PASSWORD`: Senha do PostgreSQL (padrão: arquiz)
- `DATABASE_NAME`: Nome do banco de dados (padrão: arquiz)
- `DATABASE_URL`: URL de conexão completa com o PostgreSQL

### Redis
- `REDIS_HOST`: Host do servidor Redis (padrão: localhost)
- `REDIS_PORT`: Porta do servidor Redis (padrão: 6379)
- `REDIS_URL`: URL de conexão completa com o Redis

### RabbitMQ
- `RABBITMQ_HOST`: Host do servidor RabbitMQ (padrão: localhost)
- `RABBITMQ_PORT`: Porta do servidor RabbitMQ (padrão: 5672)
- `RABBITMQ_USER`: Usuário do RabbitMQ (padrão: arquiz)
- `RABBITMQ_PASSWORD`: Senha do RabbitMQ (padrão: arquiz)
- `RABBITMQ_URL`: URL de conexão completa com o RabbitMQ

### Aplicação
- `NODE_ENV`: Ambiente de execução (development, production, test)
- `PORT`: Porta em que a aplicação será executada
- `JWT_SECRET`: Segredo usado para assinar tokens JWT
- `JWT_EXPIRATION`: Tempo de expiração dos tokens JWT

### API Externa
- `OPENAI_API_KEY`: Chave de API da OpenAI para geração de perguntas

## Desenvolvimento Local

Para desenvolvimento local, as configurações padrão funcionarão diretamente com os serviços Docker configurados. Apenas substitua os valores sensíveis como `JWT_SECRET` e `OPENAI_API_KEY`. 