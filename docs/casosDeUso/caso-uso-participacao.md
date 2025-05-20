# Caso de Uso: Participação em Competição

## Identificação
**UC-04**: Participação em Competição

## Atores
- **Ator Principal**: Aluno/Participante
- **Atores Secundários**: Sistema de WebSockets

## Descrição
Este caso de uso descreve como um aluno/participante entra em uma sala de competição, responde às perguntas, visualiza seu progresso e resultados durante e após a competição.

## Pré-condições
1. O participante possui o código de convite para uma sala
2. A sala está no status "aguardando" ou "em andamento" (se permitir entrada tardia)

## Fluxo Principal
1. O participante acessa a página inicial do sistema
2. O sistema exibe campo para inserção do código de convite
3. O participante insere o código de 6 caracteres
4. O sistema valida o código (`GET /api/rooms/validate/:code`):
   - Verifica se o código existe
   - Verifica se a sala está ativa ou aguardando
   - Verifica se permite entrada tardia (caso já iniciada)
5. O sistema solicita nome/identificação do participante
6. O participante fornece seu nome
7. O sistema registra o participante na sala (`POST /api/rooms/join`)
8. O sistema exibe a sala de espera com:
   - Nome da competição
   - Número de participantes
   - Mensagem para aguardar o início
9. Quando o professor inicia a competição:
   - O sistema notifica todos os participantes
   - O sistema exibe a primeira pergunta com temporizador (`GET /api/rooms/:id/questions/current`)
   - O sistema exibe as 4 alternativas de resposta
10. O participante seleciona uma resposta ou o tempo acaba (`POST /api/rooms/:id/answers`)
11. O sistema registra a resposta e o tempo utilizado
12. O sistema exibe a próxima pergunta (repete os passos 9-11 para cada pergunta)
13. Após a última pergunta, o sistema exibe a tela de conclusão (`GET /api/rooms/:id/results/me`) com:
    - Mensagem de agradecimento
    - Pontuação obtida
    - Posição no ranking (se configurado para exibir)

## Fluxos Alternativos

### FA01 - Entrada em Competição já Iniciada
1. Após o passo 7 do fluxo principal, se a competição já estiver em andamento e permitir entrada tardia:
   - O sistema exibe mensagem informando que a competição já começou
   - O sistema direciona o participante diretamente para a pergunta atual (`GET /api/rooms/:id/questions/current`)
   - O sistema não concede pontos pelas perguntas anteriores
   - O fluxo continua a partir do passo 10

### FA02 - Visualização de Resultados Imediatos
1. Após o passo 11 do fluxo principal, se configurado para feedback imediato:
   - O sistema indica se a resposta está correta ou incorreta (`GET /api/rooms/:id/answers/:answerId/feedback`)
   - O sistema exibe a resposta correta (destacada)
   - O sistema exibe explicação breve (se disponível)
   - O sistema mostra pontos obtidos na pergunta
   - O participante seleciona "Continuar" para prosseguir

### FA03 - Visualização de Ranking Durante a Competição
1. Entre perguntas, se configurado:
   - O sistema exibe ranking parcial atualizado (`GET /api/rooms/:id/ranking`)
   - O sistema destaca a posição do participante
   - O sistema mostra pontuação dos líderes
   - O participante seleciona "Continuar" para prosseguir

### FA04 - Visualização de Resultados Detalhados
1. Após a tela de conclusão, o participante pode selecionar "Ver Detalhes"
2. O sistema exibe relatório detalhado (`GET /api/rooms/:id/results/me/details`) com:
   - Número de acertos e erros
   - Perguntas respondidas corretamente
   - Perguntas respondidas incorretamente (com resposta correta)
   - Tempo médio de resposta
   - Comparação com a média dos participantes

## Exceções

### EX01 - Código de Convite Inválido
1. No passo 4 do fluxo principal, se o código for inválido:
   - O sistema exibe mensagem de erro informando que o código não existe
   - O sistema mantém o campo para tentativa com outro código

### EX02 - Sala não Disponível
1. No passo 4 do fluxo principal, se a sala não estiver disponível:
   - Se a sala estiver encerrada, o sistema informa que a competição já foi concluída
   - Se a sala estiver em andamento e não permitir entrada tardia, o sistema informa que não é possível entrar

### EX03 - Desconexão Durante a Competição
1. Se o participante perder conexão durante a competição:
   - O sistema tenta restabelecer a conexão automaticamente
   - O sistema mantém o estado da competição para o participante
   - Se reconectado antes do final da pergunta atual, o participante pode continuar normalmente
   - Se não reconectado a tempo, o sistema marca a pergunta como não respondida
   - Ao reconectar, o sistema sincroniza o estado e exibe a pergunta atual (ou próxima)

## Pós-condições
1. A participação do aluno é registrada no sistema
2. As respostas são armazenadas para análise posterior
3. A pontuação e ranking ficam disponíveis para visualização

## Requisitos Não-funcionais
1. **Performance**: As perguntas devem ser carregadas em menos de 1 segundo
2. **Responsividade**: A interface deve ser utilizável em dispositivos móveis e desktops
3. **Baixa Latência**: O registro de respostas deve ocorrer em menos de 500ms
4. **Disponibilidade**: O sistema deve manter 99.9% de disponibilidade durante competições ativas

## Regras de Negócio
1. **RN01**: A pontuação por resposta é calculada considerando:
   - Acerto da resposta (principal fator)
   - Tempo de resposta (quanto mais rápido, mais pontos)
2. **RN02**: Participantes não recebem pontos por perguntas não respondidas
3. **RN03**: Participantes com entrada tardia não recebem pontos por perguntas perdidas
4. **RN04**: O ranking é calculado pela soma de pontos, com desempate por tempo total
5. **RN05**: Cada dispositivo/navegador representa um participante único

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller ParticipationController
 * @route POST /api/participation/join
 * @description Participante entra em uma sala pelo código
 */
async joinRoom(@Body() dto: JoinRoomDto): Promise<Participation>

/**
 * @route GET /api/participation/:id
 * @description Obtém detalhes da participação
 * @security JWT
 */
async getParticipation(@Param('id') id: string, @GetUser() user: User): Promise<Participation>

/**
 * @route POST /api/participation/:id/answers
 * @description Registra resposta do participante
 * @security JWT
 */
async submitAnswer(
  @Param('id') id: string,
  @Body() dto: SubmitAnswerDto,
  @GetUser() user: User
): Promise<Answer>

/**
 * @route GET /api/participation/:id/results
 * @description Obtém resultados da participação
 * @security JWT
 */
async getResults(@Param('id') id: string, @GetUser() user: User): Promise<ParticipationResult>

/**
 * @route GET /api/rooms/:inviteCode/status
 * @description Verifica status da sala pelo código de convite
 */
async getRoomStatus(@Param('inviteCode') inviteCode: string): Promise<RoomStatusResponse>
```

### WebSocket Gateway

```typescript
/**
 * @gateway ParticipationGateway
 * @description Gateway para comunicação em tempo real das participações
 */
@WebSocketGateway({
  namespace: 'participation',
  cors: true,
})
export class ParticipationGateway {
  /**
   * Manipula conexão de participante
   */
  @SubscribeMessage('joinParticipation')
  async handleJoinParticipation(
    @MessageBody() data: { participationId: string; accessToken: string },
    @ConnectedSocket() client: Socket
  ): Promise<void>

  /**
   * Recebe e processa respostas dos participantes
   */
  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @MessageBody() data: { participationId: string; questionId: string; selectedOptionIndex: number; responseTimeMs: number },
    @ConnectedSocket() client: Socket
  ): Promise<void>

  /**
   * Recebe eventos de alteração de estado
   */
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @MessageBody() data: { participationId: string },
    @ConnectedSocket() client: Socket
  ): Promise<void>
}
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para entrada em sala
 */
export class JoinRoomDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]+$/)
  inviteCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;
}

/**
 * DTO para envio de resposta
 */
export class SubmitAnswerDto {
  @IsUUID()
  @IsNotEmpty()
  questionId: string;

  @IsInt()
  @Min(0)
  @Max(3)
  selectedOptionIndex: number;

  @IsNumber()
  @Min(0)
  responseTimeMs: number;
}

/**
 * Resposta de status da sala
 */
export class RoomStatusResponse {
  @IsString()
  inviteCode: string;

  @IsEnum(RoomStatus)
  status: RoomStatus;

  @IsString()
  title: string;

  @IsInt()
  participantsCount: number;

  @IsBoolean()
  allowLateJoin: boolean;
}
```
