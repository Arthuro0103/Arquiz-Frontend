# Caso de Uso: Geração e Visualização de Relatórios

## Identificação
**UC-05**: Geração e Visualização de Relatórios

## Atores
- **Ator Principal**: Professor/Apresentador
- **Atores Secundários**: Sistema de Processamento Assíncrono

## Descrição
Este caso de uso descreve como um professor pode gerar e visualizar relatórios detalhados sobre as competições realizadas, analisando o desempenho dos participantes, eficácia das perguntas e tendências gerais de aprendizado.

## Pré-condições
1. O professor está autenticado no sistema
2. O professor possui pelo menos uma sala de competição encerrada

## Fluxo Principal
1. O professor acessa a seção "Relatórios" no dashboard
2. O sistema exibe as opções de relatórios disponíveis (`GET /api/reports/types`):
   - Relatórios por Sala
   - Relatórios por Participante
   - Relatórios por Questionário
   - Relatórios Consolidados
3. O professor seleciona "Relatórios por Sala"
4. O sistema exibe a lista de salas encerradas (`GET /api/reports/rooms`) com:
   - Título da sala
   - Data de realização
   - Número de participantes
   - Pontuação média
5. O professor seleciona uma sala específica
6. O sistema gera e exibe o relatório detalhado (`GET /api/reports/rooms/:id`) com:
   - Resumo da competição (data, duração, participantes)
   - Ranking completo de participantes
   - Estatísticas gerais (média, mediana, desvio padrão)
   - Gráfico de desempenho por pergunta
   - Análise de tempo de resposta
   - Distribuição de pontuação
7. O professor pode filtrar, ordenar ou exportar os dados (`GET /api/reports/rooms/:id/export`)

## Fluxos Alternativos

### FA01 - Relatório por Participante
1. No passo 2 do fluxo principal, o professor seleciona "Relatórios por Participante"
2. O sistema exibe campo de busca para localizar participantes (`GET /api/reports/participants/search`)
3. O professor busca e seleciona um participante específico
4. O sistema gera e exibe o relatório (`GET /api/reports/participants/:id`) com:
   - Histórico de participações
   - Pontuação média e total
   - Perguntas com melhor/pior desempenho
   - Evolução de desempenho ao longo do tempo (se houver múltiplas participações)
   - Comparação com média geral

### FA02 - Relatório por Questionário
1. No passo 2 do fluxo principal, o professor seleciona "Relatórios por Questionário"
2. O sistema exibe a lista de questionários utilizados em competições (`GET /api/reports/quizzes`)
3. O professor seleciona um questionário específico
4. O sistema gera e exibe o relatório (`GET /api/reports/quizzes/:id`) com:
   - Número de vezes que o questionário foi utilizado
   - Análise de dificuldade por pergunta
   - Perguntas mais acertadas/erradas
   - Tempo médio de resposta por pergunta
   - Sugestões de melhoria (baseadas em padrões de erro)

### FA03 - Relatórios Consolidados
1. No passo 2 do fluxo principal, o professor seleciona "Relatórios Consolidados"
2. O sistema apresenta opções de filtros:
   - Período de tempo
   - Transcrições específicas
   - Grupos de participantes
3. O professor configura os filtros desejados
4. O sistema processa os dados assincronamente (`POST /api/reports/consolidated`) e notifica quando pronto
5. O sistema exibe o relatório consolidado (`GET /api/reports/consolidated/:id`) com:
   - Métricas gerais de participação
   - Tendências de desempenho
   - Eficácia comparativa entre questionários
   - Insights sobre tópicos com maior dificuldade
   - Recomendações para próximas competições

### FA04 - Exportação de Relatórios
1. Em qualquer tela de relatório, o professor seleciona "Exportar"
2. O sistema apresenta opções de formato:
   - PDF
   - CSV
   - Excel
3. O professor seleciona o formato desejado
4. O sistema gera o arquivo e disponibiliza para download (`GET /api/reports/:type/:id/export?format=:format`)

## Exceções

### EX01 - Sem Dados Suficientes
1. Se não houver dados suficientes para gerar estatísticas significativas:
   - O sistema exibe mensagem informando a limitação
   - O sistema oferece visualizações alternativas ou sugestões

### EX02 - Erro na Geração de Relatórios Complexos
1. No fluxo alternativo FA03, se ocorrer erro no processamento:
   - O sistema registra o erro em log
   - O sistema notifica o professor sobre o problema
   - O sistema oferece opção de relatório simplificado como alternativa

## Pós-condições
1. O relatório é gerado e exibido para o professor
2. Dados exportados são disponibilizados no formato selecionado (se aplicável)

## Requisitos Não-funcionais
1. **Performance**: Relatórios simples devem ser gerados em menos de 5 segundos
2. **Escalabilidade**: O sistema deve processar relatórios complexos de forma assíncrona
3. **Disponibilidade**: O serviço de relatórios deve estar disponível 99% do tempo
4. **Segurança**: Apenas o professor responsável pode acessar os dados detalhados

## Regras de Negócio
1. **RN01**: Dados pessoais de participantes devem ser anonimizados em relatórios exportados (quando necessário)
2. **RN02**: Relatórios complexos com grandes volumes de dados são processados assincronamente
3. **RN03**: O sistema deve manter cache de relatórios frequentes para melhorar performance
4. **RN04**: Estatísticas avançadas só são calculadas com um mínimo de 5 participantes
5. **RN05**: Insights e recomendações são gerados apenas com base em dados estatisticamente significativos

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller ReportsController
 * @route GET /api/reports/rooms
 * @description Lista salas disponíveis para relatórios
 * @security JWT
 */
async getRoomsForReports(
  @Query() query: RoomsReportFilterDto,
  @GetUser() user: User
): Promise<RoomReportListItem[]>

/**
 * @route GET /api/reports/rooms/:id
 * @description Obtém relatório detalhado de uma sala
 * @security JWT
 */
async getRoomReport(
  @Param('id') id: string,
  @GetUser() user: User
): Promise<RoomDetailedReport>

/**
 * @route GET /api/reports/participants
 * @description Lista participantes para relatórios
 * @security JWT
 */
async getParticipantsForReports(
  @Query() query: ParticipantsReportFilterDto,
  @GetUser() user: User
): Promise<ParticipantReportListItem[]>

/**
 * @route GET /api/reports/participants/:id
 * @description Obtém relatório detalhado de um participante
 * @security JWT
 */
async getParticipantReport(
  @Param('id') id: string,
  @GetUser() user: User
): Promise<ParticipantDetailedReport>

/**
 * @route GET /api/reports/quizzes
 * @description Lista questionários para relatórios
 * @security JWT
 */
async getQuizzesForReports(
  @Query() query: QuizzesReportFilterDto,
  @GetUser() user: User
): Promise<QuizReportListItem[]>

/**
 * @route GET /api/reports/quizzes/:id
 * @description Obtém relatório detalhado de um questionário
 * @security JWT
 */
async getQuizReport(
  @Param('id') id: string,
  @GetUser() user: User
): Promise<QuizDetailedReport>

/**
 * @route POST /api/reports/consolidated
 * @description Solicita geração de relatório consolidado
 * @security JWT
 */
async requestConsolidatedReport(
  @Body() dto: ConsolidatedReportRequestDto,
  @GetUser() user: User
): Promise<{ jobId: string }>

/**
 * @route GET /api/reports/consolidated/status/:jobId
 * @description Verifica status de geração de relatório consolidado
 * @security JWT
 */
async checkConsolidatedReportStatus(
  @Param('jobId') jobId: string,
  @GetUser() user: User
): Promise<{ status: string; progress: number; reportId?: string }>

/**
 * @route GET /api/reports/consolidated/:id
 * @description Obtém relatório consolidado
 * @security JWT
 */
async getConsolidatedReport(
  @Param('id') id: string,
  @GetUser() user: User
): Promise<ConsolidatedReport>

/**
 * @route GET /api/reports/:type/:id/export
 * @description Exporta relatório em formato específico
 * @security JWT
 */
async exportReport(
  @Param('type') type: ReportType,
  @Param('id') id: string,
  @Query('format') format: ExportFormat,
  @GetUser() user: User
): Promise<StreamableFile>
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para filtro de relatórios de salas
 */
export class RoomsReportFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  minParticipants?: number;
}

/**
 * DTO para solicitação de relatório consolidado
 */
export class ConsolidatedReportRequestDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  quizIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  transcriptionIds?: string[];

  @IsOptional()
  @IsBoolean()
  includeParticipantDetails?: boolean;

  @IsOptional()
  @IsBoolean()
  includeQuestionAnalysis?: boolean;

  @IsOptional()
  @IsEnum(ReportDetailLevel)
  detailLevel?: ReportDetailLevel;
}

/**
 * Enums para relatórios
 */
export enum ReportType {
  ROOM = 'room',
  PARTICIPANT = 'participant',
  QUIZ = 'quiz',
  CONSOLIDATED = 'consolidated',
}

export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'excel',
}

export enum ReportDetailLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  DETAILED = 'detailed',
}
```
