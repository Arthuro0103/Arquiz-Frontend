# Caso de Uso: Geração e Gerenciamento de Questionários

## Identificação
**UC-02**: Geração e Gerenciamento de Questionários

## Atores
- **Ator Principal**: Professor/Apresentador
- **Atores Secundários**: Sistema de IA (OpenAI)

## Descrição
Este caso de uso descreve como um professor pode gerar questionários a partir de transcrições existentes, configurando parâmetros como número de perguntas e nível de dificuldade, além de poder revisar e editar as perguntas geradas automaticamente.

## Pré-condições
1. O professor está autenticado no sistema
2. O professor possui pelo menos uma transcrição cadastrada
3. A integração com o serviço de IA está funcional

## Fluxo Principal
1. O professor acessa a seção "Meus Questionários" no dashboard
2. O sistema exibe a lista de questionários existentes (`GET /api/quizzes`) com:
   - Título
   - Data de criação
   - Número de perguntas
   - Status (rascunho, ativo, encerrado)
3. O professor seleciona a opção "Novo Questionário"
4. O sistema apresenta o formulário de criação com campos:
   - Título do questionário
   - Seleção da transcrição (dropdown)
   - Número de perguntas (slider: 5-30)
   - Nível de dificuldade (fácil, médio, difícil)
   - Tipo de temporizador (Ilimitado, tempo total do quiz, todas as questões terem o mesmo tempo, ou configurar manualmente)
5. O professor preenche os dados e seleciona "Gerar Perguntas" (`POST /api/quizzes/generate`)
6. O sistema inicia o processamento assíncrono e exibe indicador de progresso
7. O sistema utiliza a API de IA para gerar as perguntas de múltipla escolha
8. Após a conclusão, o sistema exibe a lista de perguntas geradas com:
   - Texto da pergunta
   - Opções de resposta (4 alternativas)
   - Resposta correta destacada
9. O professor revisa as perguntas e pode:
   - Editar o texto de perguntas/respostas (`PATCH /api/quizzes/:id/questions/:questionId`)
   - Alterar a alternativa correta
   - Remover perguntas (`DELETE /api/quizzes/:id/questions/:questionId`)
   - Adicionar novas perguntas manualmente (`POST /api/quizzes/:id/questions`)
10. O professor seleciona "Salvar Questionário" (`POST /api/quizzes`)
11. O sistema salva o questionário com status "rascunho"
12. O sistema retorna à lista de questionários atualizada

## Fluxos Alternativos

### FA01 - Editar Questionário Existente
1. No passo 2 do fluxo principal, o professor seleciona "Editar" em um questionário com status "rascunho"
2. O sistema carrega o formulário preenchido com os dados do questionário (`GET /api/quizzes/:id`)
3. O sistema exibe a lista de perguntas existentes
4. O professor realiza as alterações desejadas (mesmas opções dos passos 9-10 do fluxo principal)
5. O professor submete o formulário atualizado (`PUT /api/quizzes/:id`)
6. O sistema atualiza o questionário e exibe mensagem de sucesso
7. O sistema retorna à lista de questionários atualizada

### FA02 - Ativar Questionário
1. No passo 2 do fluxo principal, o professor seleciona "Ativar" em um questionário com status "rascunho"
2. O sistema verifica se o questionário possui pelo menos 5 perguntas
3. O sistema altera o status do questionário para "ativo" (`PATCH /api/quizzes/:id/status`)
4. O sistema exibe mensagem de sucesso
5. O sistema retorna à lista de questionários atualizada

### FA03 - Duplicar Questionário
1. No passo 2 do fluxo principal, o professor seleciona "Duplicar" em um questionário
2. O sistema cria uma cópia do questionário com título "Cópia de [título original]" (`POST /api/quizzes/:id/duplicate`)
3. O sistema define o status como "rascunho"
4. O sistema exibe mensagem de sucesso
5. O sistema retorna à lista de questionários atualizada

### FA04 - Regenerar Perguntas Específicas
1. No passo 9 do fluxo principal, o professor seleciona "Regenerar" em uma pergunta específica
2. O sistema solicita confirmação
3. O professor confirma a regeneração (`POST /api/quizzes/:id/questions/:questionId/regenerate`)
4. O sistema utiliza a API de IA para gerar uma nova versão da pergunta
5. O sistema atualiza a pergunta na interface

## Exceções

### EX01 - Falha na Geração de Perguntas
1. No passo 7 do fluxo principal, se ocorrer um erro na API de IA:
   - O sistema registra o erro em log
   - O sistema exibe mensagem de erro informando o problema
   - O sistema permite que o professor tente novamente ou continue com as perguntas já geradas (se houver)

### EX02 - Número Insuficiente de Perguntas
1. No fluxo alternativo FA02, se o questionário tiver menos de 5 perguntas:
   - O sistema exibe mensagem de erro informando o requisito mínimo
   - O questionário permanece com status "rascunho"

## Pós-condições
1. O questionário é armazenado no banco de dados
2. O questionário fica disponível para criação de salas de competição (se ativo)

## Requisitos Não-funcionais
1. **Performance**: A geração de perguntas deve ser concluída em menos de 30 segundos para 20 perguntas
2. **Escalabilidade**: O sistema deve suportar processamento paralelo de múltiplas solicitações de geração
3. **Disponibilidade**: O serviço de geração deve estar disponível 99% do tempo
4. **Custos**: O sistema deve implementar cache para minimizar chamadas à API de IA

## Regras de Negócio
1. **RN01**: Apenas o professor que criou o questionário pode visualizá-lo, editá-lo ou ativá-lo
2. **RN02**: Um questionário deve ter no mínimo 5 perguntas para ser ativado
3. **RN03**: Um questionário ativo pode ser desativado, mas não pode ser editado
4. **RN04**: Cada pergunta deve ter exatamente 4 alternativas, com apenas 1 correta
5. **RN05**: O sistema deve armazenar métricas de geração para melhorar o algoritmo ao longo do tempo

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller QuizzesController
 * @route GET /api/quizzes
 * @description Lista todos os questionários do professor autenticado
 * @security JWT
 */
async findAll(@GetUser() user: User): Promise<Quiz[]>

/**
 * @route POST /api/quizzes
 * @description Cria um novo questionário
 * @security JWT
 */
async create(@Body() dto: CreateQuizDto, @GetUser() user: User): Promise<Quiz>

/**
 * @route GET /api/quizzes/:id
 * @description Obtém um questionário específico
 * @security JWT
 */
async findOne(@Param('id') id: string, @GetUser() user: User): Promise<Quiz>

/**
 * @route PATCH /api/quizzes/:id
 * @description Atualiza um questionário existente
 * @security JWT
 */
async update(
  @Param('id') id: string,
  @Body() dto: UpdateQuizDto,
  @GetUser() user: User
): Promise<Quiz>

/**
 * @route PATCH /api/quizzes/:id/status
 * @description Atualiza o status de um questionário
 * @security JWT
 */
async updateStatus(
  @Param('id') id: string,
  @Body() dto: UpdateQuizStatusDto,
  @GetUser() user: User
): Promise<Quiz>

/**
 * @route POST /api/quizzes/:id/questions
 * @description Gera perguntas para um questionário
 * @security JWT
 */
async generateQuestions(
  @Param('id') id: string,
  @Body() dto: GenerateQuestionsDto,
  @GetUser() user: User
): Promise<{ jobId: string }>

/**
 * @route GET /api/quizzes/:id/questions/status/:jobId
 * @description Verifica o status de geração de perguntas
 * @security JWT
 */
async checkGenerationStatus(
  @Param('id') id: string,
  @Param('jobId') jobId: string,
  @GetUser() user: User
): Promise<{ status: string; progress: number; questions?: Question[] }>

/**
 * @route POST /api/quizzes/:id/duplicate
 * @description Duplica um questionário existente
 * @security JWT
 */
async duplicate(@Param('id') id: string, @GetUser() user: User): Promise<Quiz>
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para criação de questionários
 */
export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsUUID()
  @IsNotEmpty()
  transcriptionId: string;

  @IsInt()
  @Min(5)
  @Max(30)
  questionsCount: number;

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsInt()
  @Min(10)
  @Max(300)
  timePerQuestionSeconds: number;
}

/**
 * DTO para geração de perguntas
 */
export class GenerateQuestionsDto {
  @IsUUID()
  @IsNotEmpty()
  transcriptionId: string;

  @IsInt()
  @Min(1)
  @Max(30)
  count: number;

  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;
}

/**
 * DTO para atualização de status do questionário
 */
export class UpdateQuizStatusDto {
  @IsEnum(QuizStatus)
  @IsNotEmpty()
  status: QuizStatus;
}
```
