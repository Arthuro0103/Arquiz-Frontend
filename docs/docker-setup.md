# Configuração do Ambiente Docker para ArQuiz

Este documento descreve como configurar o ambiente de desenvolvimento Docker para o projeto ArQuiz.

## Serviços Incluídos

- **PostgreSQL**: Banco de dados principal (porta 5432)
- **Redis**: Cache e gerenciamento de sessões (porta 6379)
- **RabbitMQ**: Sistema de mensageria (portas 5672 e 15672 para administração)

## Requisitos

- Docker e Docker Compose instalados
- Pelo menos 2GB de RAM disponível para os containers

## Instruções de Uso

### Iniciar Todos os Serviços

```bash
docker-compose up -d
```

### Verificar Status dos Serviços

```bash
docker-compose ps
```

### Parar Todos os Serviços

```bash
docker-compose down
```

### Reiniciar um Serviço Específico

```bash
docker-compose restart [nome-do-serviço]
```

Exemplo:
```bash
docker-compose restart postgres
```

## Credenciais de Acesso

### PostgreSQL
- **Usuário**: arquiz
- **Senha**: arquiz
- **Database**: arquiz
- **String de Conexão**: `postgresql://arquiz:arquiz@localhost:5432/arquiz`

### Redis
- **Porta**: 6379
- **URL de Conexão**: `redis://localhost:6379`

### RabbitMQ
- **Usuário**: arquiz
- **Senha**: arquiz
- **URL de Conexão**: `amqp://arquiz:arquiz@localhost:5672`
- **Interface Admin**: http://localhost:15672 (usuário: arquiz, senha: arquiz)

## Persistência de Dados

Todos os dados são armazenados em volumes Docker nomeados:
- `arquiz-postgres-data`
- `arquiz-redis-data`
- `arquiz-rabbitmq-data`

Para limpar os dados e começar do zero:

```bash
docker-compose down
docker volume rm arquiz-postgres-data arquiz-redis-data arquiz-rabbitmq-data
docker-compose up -d
```

## Verificação de Integridade

Os serviços estão configurados com health checks para garantir que estejam funcionando corretamente. 
Para verificar o status de saúde:

```bash
docker inspect --format='{{.State.Health.Status}}' arquiz-postgres
docker inspect --format='{{.State.Health.Status}}' arquiz-redis
docker inspect --format='{{.State.Health.Status}}' arquiz-rabbitmq
```

Um script de teste automatizado também está disponível em `tests/infrastructure/verify-services.sh`. 