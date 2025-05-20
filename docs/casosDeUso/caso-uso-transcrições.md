# Caso de Uso: Gerenciamento de Transcrições

## Identificação
**UC-01**: Gerenciamento de Transcrições

## Atores
- **Ator Principal**: Professor/Apresentador
- **Atores Secundários**: Sistema de IA (OpenAI)

## Descrição
Este caso de uso descreve como um professor pode gerenciar transcrições de aulas, palestras ou treinamentos no sistema, desde o upload até a visualização e edição.

## Pré-condições
1. O professor está autenticado no sistema
2. O professor possui permissões para gerenciar transcrições

## Fluxo Principal
1. O professor acessa a seção "Minhas Transcrições" no dashboard
2. O sistema exibe a lista de transcrições existentes do professor (`GET /api/transcriptions`) com:
   - Título
   - Data de criação
   - Duração estimada
   - Status (processada/não processada)
3. O professor seleciona a opção "Nova Transcrição"
4. O sistema apresenta o formulário de criação com campos:
   - Título da transcrição
   - Área para inserção do texto da transcrição
   - Opção para estimar duração automaticamente
5. O professor preenche os dados e submete o formulário (`POST /api/transcriptions`)
6. O sistema valida os dados:
   - Verifica se o título não está vazio
   - Verifica se o conteúdo tem pelo menos 300 caracteres
7. O sistema armazena a transcrição e exibe mensagem de sucesso
8. O sistema retorna à lista de transcrições atualizada

## Fluxos Alternativos

### FA01 - Editar Transcrição Existente
1. No passo 2 do fluxo principal, o professor seleciona "Editar" em uma transcrição
2. O sistema carrega o formulário preenchido com os dados da transcrição (`GET /api/transcriptions/:id`)
3. O professor realiza as alterações desejadas
4. O professor submete o formulário atualizado (`PUT /api/transcriptions/:id`)
5. O sistema valida as alterações
6. O sistema atualiza a transcrição e exibe mensagem de sucesso
7. O sistema retorna à lista de transcrições atualizada

### FA02 - Excluir Transcrição
1. No passo 2 do fluxo principal, o professor seleciona "Excluir" em uma transcrição
2. O sistema solicita confirmação para exclusão
3. O professor confirma a exclusão (`DELETE /api/transcriptions/:id`)
4. O sistema verifica se a transcrição está associada a questionários ativos
   - Se estiver, o sistema exibe mensagem de erro informando que não é possível excluir
   - Se não estiver, o sistema exclui a transcrição e exibe mensagem de sucesso
5. O sistema atualiza a lista de transcrições

### FA03 - Visualizar Detalhes da Transcrição
1. No passo 2 do fluxo principal, o professor seleciona "Visualizar" em uma transcrição
2. O sistema exibe a página de detalhes (`GET /api/transcriptions/:id`) com:
   - Informações básicas (título, data, duração)
   - Conteúdo completo da transcrição
   - Estatísticas (número de questionários gerados a partir dela)
   - Lista de questionários associados
3. O professor pode retornar à lista de transcrições ou editar a transcrição

## Exceções

### EX01 - Validação de Dados
1. No passo 6 do fluxo principal, se a validação falhar:
   - O sistema exibe mensagens de erro específicas para cada campo inválido
   - O sistema mantém os dados inseridos pelo professor
   - O professor corrige os dados e tenta submeter novamente

### EX02 - Falha de Armazenamento
1. No passo 7 do fluxo principal, se ocorrer um erro ao armazenar a transcrição:
   - O sistema registra o erro em log
   - O sistema exibe mensagem de erro informando o problema
   - O sistema permite que o professor tente novamente

## Pós-condições
1. A transcrição é armazenada no banco de dados
2. A transcrição fica disponível para geração de questionários

## Requisitos Não-funcionais
1. **Performance**: O upload e processamento da transcrição deve ser concluído em menos de 3 segundos para textos de até 10.000 palavras
2. **Disponibilidade**: O serviço de transcrições deve estar disponível 99.5% do tempo
3. **Segurança**: As transcrições devem ser armazenadas com criptografia em repouso

## Regras de Negócio
1. **RN01**: Apenas o professor que criou a transcrição pode visualizá-la, editá-la ou excluí-la
2. **RN02**: Uma transcrição não pode ser excluída se estiver associada a um questionário ativo
3. **RN03**: O sistema deve limitar o tamanho da transcrição a 50.000 palavras
4. **RN04**: O sistema deve validar e sanitizar o conteúdo para evitar injeção de código ou XSS

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller TranscriptionsController
 * @route GET /api/transcriptions
 * @description Lista todas as transcrições do professor autenticado
 * @security JWT
 */
async findAll(@GetUser() user: User): Promise<Transcription[]>

/**
 * @route POST /api/transcriptions
 * @description Cria uma nova transcrição
 * @security JWT
 */
async create(@Body() dto: CreateTranscriptionDto, @GetUser() user: User): Promise<Transcription>

/**
 * @route GET /api/transcriptions/:id
 * @description Obtém uma transcrição específica
 * @security JWT
 */
async findOne(@Param('id') id: string, @GetUser() user: User): Promise<Transcription>

/**
 * @route PATCH /api/transcriptions/:id
 * @description Atualiza uma transcrição existente
 * @security JWT
 */
async update(
  @Param('id') id: string,
  @Body() dto: UpdateTranscriptionDto,
  @GetUser() user: User
): Promise<Transcription>

/**
 * @route DELETE /api/transcriptions/:id
 * @description Exclui uma transcrição
 * @security JWT
 */
async remove(@Param('id') id: string, @GetUser() user: User): Promise<void>
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para criação de transcrições
 */
export class CreateTranscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(300)
  content: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;
}

/**
 * DTO para atualização de transcrições
 */
export class UpdateTranscriptionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(300)
  content?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;
}
```
