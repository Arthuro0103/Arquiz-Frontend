# Caso de Uso: Registro e Autenticação de Alunos

## Identificação
**UC-07**: Registro e Autenticação de Alunos/Participantes

## Atores
- **Ator Principal**: Aluno/Participante
- **Atores Secundários**: Sistema de E-mail, Sistema de Autenticação

## Descrição
Este caso de uso descreve como um aluno ou participante pode se registrar no sistema, autenticar-se e participar de competições. O processo é otimizado para facilitar a entrada rápida em competições, com opções de registro simplificado e participação como convidado.

## Pré-condições
1. O sistema está operacional
2. O serviço de e-mail está funcionando (para verificação e recuperação de senha)

## Fluxo Principal - Registro Completo
1. O usuário acessa a página inicial do sistema
2. O usuário seleciona a opção "Registrar como Aluno"
3. O sistema exibe o formulário de registro com campos:
   - Nome completo
   - E-mail
   - Senha (com requisitos de segurança)
   - Confirmação de senha
   - Instituição/Escola (opcional)
   - Termos de serviço (checkbox)
4. O usuário preenche os dados e submete o formulário (`POST /api/auth/student/register`)
5. O sistema valida os dados:
   - Verifica se o e-mail não está em uso
   - Confirma se as senhas coincidem
   - Verifica se a senha atende aos requisitos mínimos
   - Confirma aceitação dos termos de serviço
6. O sistema cria a conta com status "não verificado"
7. O sistema envia e-mail de verificação com link seguro
8. O sistema exibe mensagem solicitando verificação do e-mail
9. O sistema oferece opção para entrar em uma competição imediatamente

## Fluxo Alternativo - Participação com Registro Simplificado
1. O usuário recebe um código de convite para uma competição
2. O usuário acessa a página de entrada com o código
3. O sistema valida o código e exibe o formulário simplificado:
   - Nome para exibição
   - E-mail (opcional)
   - Senha (opcional)
   - Criar conta permanente (checkbox)
4. O usuário preenche pelo menos o nome de exibição
5. Se o usuário marcar "Criar conta permanente":
   - O sistema solicita e-mail e senha
   - O sistema cria uma conta completa (`POST /api/auth/student/register/simplified`)
   - O sistema envia e-mail de verificação
6. Se o usuário não marcar "Criar conta permanente":
   - O sistema cria um registro temporário para a competição (`POST /api/auth/student/guest/join`)
7. O sistema direciona o usuário para a sala de espera da competição

## Fluxo Alternativo - Participação como Convidado
1. O usuário recebe um código de convite para uma competição
2. O usuário acessa a página de entrada com o código
3. O sistema valida o código e exibe o formulário simplificado
4. O usuário preenche apenas o nome para exibição
5. O usuário seleciona "Continuar como Convidado" (`POST /api/auth/student/guest/join`)
6. O sistema cria um registro temporário associado à sessão
7. O sistema direciona o usuário para a sala de espera da competição
8. Após a competição, o sistema oferece a opção de salvar o progresso criando uma conta (`POST /api/auth/student/guest/convert`)

## Fluxo Principal - Login
1. O usuário acessa a página de login
2. O sistema exibe formulário com campos:
   - E-mail
   - Senha
   - Opção "Lembrar-me"
3. O usuário preenche os dados e submete o formulário (`POST /api/auth/student/login`)
4. O sistema valida as credenciais:
   - Verifica se o e-mail existe
   - Verifica se a senha está correta
5. O sistema gera token JWT com:
   - ID do usuário
   - Perfil (aluno)
   - Data de expiração (conforme configuração)
6. O sistema registra data/hora do login
7. O sistema redireciona para o dashboard de aluno ou para a competição pendente

## Fluxo Alternativo - Login Social
1. Na tela de login ou registro, o usuário seleciona "Entrar com Google"
2. O sistema redireciona para autenticação do provedor
3. O usuário autentica-se no provedor
4. O provedor retorna token de autenticação
5. O sistema verifica se o e-mail já está registrado (`POST /api/auth/student/social/google`):
   - Se sim, vincula a conta social à existente
   - Se não, cria nova conta com dados do perfil social
6. O sistema gera token JWT 
7. O sistema redireciona para o dashboard ou competição pendente

## Fluxo Alternativo - Recuperação de Senha
1. Na tela de login, o usuário seleciona "Esqueci minha senha"
2. O sistema exibe formulário solicitando e-mail
3. O usuário informa o e-mail e submete (`POST /api/auth/student/forgot-password`)
4. O sistema verifica se o e-mail está registrado
5. O sistema gera token de recuperação com expiração (1 hora)
6. O sistema envia e-mail com link para redefinição de senha
7. O usuário acessa o link recebido
8. O sistema valida o token de recuperação
9. O sistema exibe formulário para nova senha
10. O usuário preenche e submete o formulário (`POST /api/auth/student/reset-password`)
11. O sistema atualiza a senha do usuário
12. O sistema redireciona para página de login com mensagem de sucesso

## Fluxo Alternativo - Edição de Perfil
1. O usuário autenticado acessa "Meu Perfil" no dashboard
2. O sistema exibe formulário com dados atuais (`GET /api/auth/student/profile`):
   - Nome completo
   - Nome de exibição (para competições)
   - E-mail
   - Instituição/Escola
   - Foto de perfil (upload)
3. O usuário realiza as alterações desejadas
4. O sistema valida os dados atualizados
5. O sistema atualiza o perfil (`PATCH /api/auth/student/profile`)
6. O sistema exibe mensagem de sucesso

## Exceções

### EX01 - Código de Convite Inválido
1. Nos fluxos de participação simplificada ou como convidado, se o código for inválido:
   - O sistema exibe mensagem informando que o código não existe ou expirou
   - O sistema oferece campo para inserir outro código

### EX02 - E-mail já em Uso
1. No fluxo principal de registro, se o e-mail já estiver em uso:
   - O sistema exibe mensagem informando que o e-mail já está registrado
   - O sistema oferece opção de login com este e-mail

### EX03 - Falha na Autenticação
1. No fluxo principal de login, se as credenciais forem inválidas:
   - O sistema incrementa contador de tentativas falhas
   - O sistema exibe mensagem de credenciais inválidas
   - Após 5 tentativas falhas, o sistema implementa atraso progressivo

### EX04 - Falha na Autenticação Social
1. No fluxo de login social, se ocorrer erro na autenticação:
   - O sistema exibe mensagem informando o problema
   - O sistema oferece alternativas de login convencional

## Pós-condições
1. O aluno está registrado e/ou autenticado no sistema
2. O aluno pode participar das competições e acessar seu histórico

## Requisitos Não-funcionais
1. **Usabilidade**: O processo de registro simplificado deve ser concluído em menos de 30 segundos
2. **Performance**: O login deve ser processado em menos de 1 segundo
3. **Compatibilidade**: O acesso deve funcionar em dispositivos móveis e desktops
4. **Armazenamento**: Dados de convidados não vinculados a contas são anonimizados após 30 dias

## Regras de Negócio
1. **RN01**: Alunos podem participar como convidados com apenas um nome de exibição
2. **RN02**: Contas temporárias de convidados são mantidas por 30 dias
3. **RN03**: Alunos registrados podem acessar histórico completo de participações
4. **RN04**: Um mesmo e-mail não pode ser usado para conta de professor e aluno simultaneamente
5. **RN05**: Nome de exibição deve ter entre 3 e 50 caracteres
6. **RN06**: O sistema deve garantir nomes de exibição únicos dentro de cada competição

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller StudentAuthController
 * @route POST /api/auth/register/student
 * @description Registra um novo aluno
 */
async registerStudent(@Body() dto: RegisterStudentDto): Promise<{ message: string }>

/**
 * @route POST /api/auth/login/student
 * @description Autentica um aluno
 */
async loginStudent(@Body() dto: LoginDto): Promise<AuthResponseDto>

/**
 * @route POST /api/auth/social/google
 * @description Processa login com Google
 */
async googleLogin(@Body() dto: SocialLoginDto): Promise<AuthResponseDto>

/**
 * @route POST /api/auth/guest/join
 * @description Participa como convidado
 */
async joinAsGuest(@Body() dto: GuestJoinDto): Promise<GuestSessionDto>

/**
 * @route POST /api/auth/guest/convert
 * @description Converte conta de convidado para permanente
 */
async convertGuestAccount(@Body() dto: ConvertGuestDto): Promise<AuthResponseDto>

/**
 * @route POST /api/auth/register/simplified
 * @description Registro simplificado durante entrada em competição
 */
async simplifiedRegister(@Body() dto: SimplifiedRegisterDto): Promise<AuthResponseDto>

/**
 * @route GET /api/auth/student/profile
 * @description Obtém perfil do aluno autenticado
 * @security JWT
 */
async getStudentProfile(@GetUser() user: User): Promise<StudentProfileDto>

/**
 * @route PATCH /api/auth/student/profile
 * @description Atualiza perfil do aluno
 * @security JWT
 */
async updateStudentProfile(
  @GetUser() user: User,
  @Body() dto: UpdateStudentProfileDto
): Promise<StudentProfileDto>

/**
 * @route GET /api/auth/student/participations
 * @description Lista histórico de participações do aluno
 * @security JWT
 */
async getParticipationHistory(
  @GetUser() user: User,
  @Query() query: PaginationDto
): Promise<ParticipationHistoryDto>
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para registro de aluno
 */
export class RegisterStudentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  displayName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/)
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  institution?: string;

  @IsBoolean()
  @IsTrue({ message: 'Você deve aceitar os termos de serviço' })
  termsAccepted: boolean;
}

/**
 * DTO para login social
 */
export class SocialLoginDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}

/**
 * DTO para participação como convidado
 */
export class GuestJoinDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]+$/)
  inviteCode: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  displayName: string;
}

/**
 * DTO para sessão de convidado
 */
export class GuestSessionDto {
  @IsString()
  sessionToken: string;

  @IsString()
  displayName: string;

  @IsString()
  inviteCode: string;

  @IsObject()
  roomInfo: {
    id: string;
    title: string;
  };
}

/**
 * DTO para converter conta de convidado
 */
export class ConvertGuestDto {
  @IsString()
  @IsNotEmpty()
  sessionToken: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;

  @IsBoolean()
  @IsTrue()
  termsAccepted: boolean;
}

/**
 * DTO para registro simplificado
 */
export class SimplifiedRegisterDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[A-Z0-9]+$/)
  inviteCode: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  displayName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  createPermanentAccount?: boolean;

  @IsOptional()
  @IsBoolean()
  termsAccepted?: boolean;
}

/**
 * DTO para perfil de aluno
 */
export class StudentProfileDto {
  @IsUUID()
  id: string;

  @IsString()
  fullName: string;

  @IsString()
  displayName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsDate()
  createdAt: Date;

  @IsOptional()
  @IsObject()
  stats?: {
    totalParticipations: number;
    averageScore: number;
    bestRanking: number;
  };
}

/**
 * DTO para atualização de perfil de aluno
 */
export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(3, 50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  institution?: string;

  @IsOptional()
  @IsBase64()
  profilePicture?: string;
}
```
