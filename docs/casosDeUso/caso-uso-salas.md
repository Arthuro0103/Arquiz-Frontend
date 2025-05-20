# Caso de Uso: Criação e Gerenciamento de Salas de Competição

## Identificação
**UC-03**: Criação e Gerenciamento de Salas de Competição

## Atores
- **Ator Principal**: Professor/Apresentador
- **Atores Secundários**: Alunos/Participantes

## Descrição
Este caso de uso descreve como um professor pode criar e gerenciar salas de competição a partir de questionários ativos, controlar o início e término das competições, e monitorar a participação dos alunos em tempo real.

## Pré-condições
1. O professor está autenticado no sistema
2. O professor possui pelo menos um questionário com status "ativo"

## Fluxo Principal
1. O professor acessa a seção "Minhas Salas" no dashboard
2. O sistema exibe a lista de salas existentes (`GET /api/rooms`) com:
   - Título da sala (herdado do questionário)
   - Código de convite
   - Status (aguardando, em andamento, encerrada)
   - Número de participantes
   - Data de criação
3. O professor seleciona a opção "Nova Sala"
4. O sistema apresenta o formulário de criação com campos:
   - Seleção do questionário (dropdown com questionários ativos)
   - Opção para personalizar título da sala (preenchido automaticamente com título do questionário)
   - Configurações da sala:
     - Data de expiração (opcional)
     - Permitir entrada tardia (sim/não)
     - Visualização de resultados (imediata ou no final)
5. O professor preenche os dados e confirma a criação (`POST /api/rooms`)
6. O sistema gera um código único de convite de 6 caracteres
7. O sistema cria a sala com status "aguardando"
8. O sistema exibe a página de detalhes da sala (`GET /api/rooms/:id`) com:
   - Código de convite
   - Link de convite (QR Code opcional)
   - Lista de participantes (vazia inicialmente)
   - Botão para iniciar competição

## Fluxos Alternativos

### FA01 - Gerenciar Sala em Espera
1. No passo 2 do fluxo principal, o professor seleciona uma sala com status "aguardando"
2. O sistema exibe a página de gerenciamento (`GET /api/rooms/:id`) com:
   - Código e link de convite
   - Lista de participantes atual
   - Opções de configuração da sala
3. O professor pode:
   - Editar configurações da sala (`PATCH /api/rooms/:id`)
   - Remover participantes (`DELETE /api/rooms/:id/participants/:participantId`)
   - Iniciar a competição (`POST /api/rooms/:id/start`)
   - Cancelar a sala (`DELETE /api/rooms/:id`)

### FA02 - Monitorar Sala em Andamento
1. No passo 2 do fluxo principal, o professor seleciona uma sala com status "em andamento"
2. O sistema exibe em tempo real (`GET /api/rooms/:id/status`):
   - Lista de participantes e status
   - Progresso geral (questão atual)
   - Ranking parcial
   - Tempo restante
3. O professor pode:
   - Pausar a competição (`POST /api/rooms/:id/pause`)
   - Retomar a competição (`POST /api/rooms/:id/resume`)
   - Encerrar a competição (`POST /api/rooms/:id/end`)
   - Remover participante (`DELETE /api/rooms/:id/participants/:participantId`)

### FA03 - Visualizar Resultados
1. No passo 2 do fluxo principal, o professor seleciona uma sala com status "encerrada"
2. O sistema exibe a tela de resultados (`GET /api/rooms/:id/results`) com:
   - Ranking final dos participantes
   - Estatísticas detalhadas de acertos/erros
   - Gráficos de desempenho
   - Métricas por pergunta
3. O professor pode:
   - Exportar resultados (CSV/PDF) (`GET /api/rooms/:id/results/export`)
   - Compartilhar ranking com participantes (`POST /api/rooms/:id/results/share`)
   - Arquivar a sala (`PATCH /api/rooms/:id/archive`)

## Exceções

### EX01 - Nenhum Participante na Sala
1. No fluxo alternativo FA02, se não houver participantes na sala:
   - O sistema exibe mensagem informando que é necessário pelo menos 1 participante
   - A sala permanece com status "aguardando"

### EX02 - Falha de Comunicação em Tempo Real
1. Durante uma competição em andamento, se ocorrer falha na comunicação WebSocket:
   - O sistema tenta restabelecer a conexão automaticamente
   - O sistema registra as respostas dos participantes mesmo offline
   - O sistema sincroniza dados quando a conexão é restabelecida
   - Em caso de falha persistente, o professor pode pausar a competição

## Pós-condições
1. A sala é criada com código de convite único
2. Quando iniciada, todos os participantes recebem as perguntas simultaneamente
3. Ao encerrar, o sistema calcula automaticamente o ranking final
4. Os resultados ficam disponíveis para consulta posterior

## Requisitos Não-funcionais
1. **Performance**: O sistema deve suportar até 100 participantes simultâneos por sala
2. **Escalabilidade**: O sistema deve escalar horizontalmente para suportar múltiplas salas ativas
3. **Tempo Real**: As atualizações de ranking devem ser propagadas em menos de 1 segundo
4. **Resiliência**: O sistema deve manter integridade mesmo com falhas de conexão temporárias

## Regras de Negócio
1. **RN01**: O código de convite deve ser único em todo o sistema
2. **RN02**: Uma sala só pode ser iniciada pelo professor que a criou
3. **RN03**: Uma vez encerrada, a competição não pode ser reiniciada
4. **RN04**: O sistema deve armazenar todas as respostas mesmo em caso de desconexão
5. **RN05**: Se configurado, o sistema só permite entrada de participantes antes do início
6. **RN06**: O professor pode encerrar uma competição a qualquer momento

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller RoomsController
 * @route GET /api/rooms
 * @description Lista todas as salas do professor autenticado
 * @security JWT
 */
async findAll(@GetUser() user: User): Promise<Room[]>

/**
 * @route POST /api/rooms
 * @description Cria uma nova sala de competição
 * @security JWT
 */
async create(@Body() dto: CreateRoomDto, @GetUser() user: User): Promise<Room>

/**
 * @route GET /api/rooms/:id
 * @description Obtém uma sala específica
 * @security JWT
 */
async findOne(@Param('id') id: string, @GetUser() user: User): Promise<Room>

/**
 * @route GET /api/rooms/:id/participants
 * @description Lista participantes de uma sala
 * @security JWT
 */
async getParticipants(@Param('id') id: string, @GetUser() user: User): Promise<Participant[]>

/**
 * @route PATCH /api/rooms/:id/start
 * @description Inicia a competição
 * @security JWT
 */
async startCompetition(@Param('id') id: string, @GetUser() user: User): Promise<Room>

/**
 * @route PATCH /api/rooms/:id/end
 * @description Encerra a competição
 * @security JWT
 */
async endCompetition(@Param('id') id: string, @GetUser() user: User): Promise<Room>

/**
 * @route POST /api/rooms/join
 * @description Participante entra em uma sala pelo código
 * @security JWT
 */
async joinRoom(@Body() dto: JoinRoomDto, @GetUser() user: User): Promise<Participation>

/**
 * @route DELETE /api/rooms/:id/participants/:participantId
 * @description Remove um participante da sala
 * @security JWT
 */
async removeParticipant(
  @Param('id') id: string,
  @Param('participantId') participantId: string,
  @GetUser() user: User
): Promise<void>
```

### WebSocket Gateway

```typescript
/**
 * @gateway RoomsGateway
 * @description Gateway para comunicação em tempo real nas salas
 */
@WebSocketGateway({
  namespace: 'rooms',
  cors: true,
})
export class RoomsGateway {
  /**
   * Manipula conexão de cliente
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; accessToken: string },
    @ConnectedSocket() client: Socket
  ): Promise<void>

  /**
   * Propaga evento de início de competição
   */
  @SubscribeMessage('startCompetition')
  async handleStartCompetition(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket
  ): Promise<void>

  /**
   * Recebe e processa respostas dos participantes
   */
  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @MessageBody() data: { roomId: string; questionId: string; answer: number; time: number },
    @ConnectedSocket() client: Socket
  ): Promise<void>

  /**
   * Emite atualização de ranking
   */
  async emitRankingUpdate(roomId: string, ranking: RankingItem[]): Promise<void>
}
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para criação de salas
 */
export class CreateRoomDto {
  @IsUUID()
  @IsNotEmpty()
  quizId: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customTitle?: string;

  @IsOptional()
  @IsDate()
  expirationDate?: Date;

  @IsBoolean()
  allowLateJoin: boolean;

  @IsEnum(ResultsVisibility)
  resultsVisibility: ResultsVisibility;
}

/**
 * DTO para entrada em sala
 */
export class JoinRoomDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]+$/)
  inviteCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
```
