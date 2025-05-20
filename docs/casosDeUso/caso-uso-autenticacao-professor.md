# Caso de Uso: Registro e Autenticação de Professores

## Identificação
**UC-06**: Registro e Autenticação de Professores/Apresentadores

## Atores
- **Ator Principal**: Professor/Apresentador
- **Atores Secundários**: Sistema de E-mail, Sistema de Autenticação

## Descrição
Este caso de uso descreve como um professor ou apresentador pode se registrar no sistema, autenticar-se, gerenciar seu perfil e recuperar sua senha quando necessário.

## Pré-condições
1. O sistema está operacional
2. O serviço de e-mail está funcionando (para verificação e recuperação de senha)

## Fluxo Principal - Registro
1. O usuário acessa a página inicial do sistema
2. O usuário seleciona a opção "Registrar como Professor"
3. O sistema exibe o formulário de registro com campos:
   - Nome completo
   - E-mail institucional/profissional
   - Senha (com requisitos de segurança)
   - Confirmação de senha
   - Instituição/Organização (opcional)
   - Área de atuação (opcional)
   - Termos de serviço (checkbox)
4. O usuário preenche os dados e submete o formulário (`POST /api/auth/register/teacher`)
5. O sistema valida os dados:
   - Verifica se o e-mail não está em uso
   - Confirma se as senhas coincidem
   - Verifica se a senha atende aos requisitos mínimos
   - Confirma aceitação dos termos de serviço
6. O sistema cria a conta com status "não verificado"
7. O sistema envia e-mail de verificação com link seguro
8. O sistema exibe mensagem solicitando verificação do e-mail

## Fluxo Alternativo - Verificação de E-mail
1. O usuário acessa o link de verificação recebido por e-mail
2. O sistema valida o token de verificação (`GET /api/auth/verify-email`):
   - Verifica se o token é válido
   - Verifica se o token não expirou (24 horas)
3. O sistema atualiza o status da conta para "verificado"
4. O sistema redireciona para página de login com mensagem de sucesso

## Fluxo Principal - Login
1. O usuário acessa a página de login
2. O sistema exibe formulário com campos:
   - E-mail
   - Senha
   - Opção "Lembrar-me"
3. O usuário preenche os dados e submete o formulário (`POST /api/auth/login`)
4. O sistema valida as credenciais:
   - Verifica se o e-mail existe
   - Verifica se a senha está correta
   - Confirma se a conta está verificada
5. O sistema gera token JWT com:
   - ID do usuário
   - Perfil (professor)
   - Data de expiração (conforme configuração)
6. O sistema registra data/hora do login
7. O sistema redireciona para o dashboard de professor

## Fluxo Alternativo - Recuperação de Senha
1. Na tela de login, o usuário seleciona "Esqueci minha senha"
2. O sistema exibe formulário solicitando e-mail
3. O usuário informa o e-mail e submete (`POST /api/auth/forgot-password`)
4. O sistema verifica se o e-mail está registrado
5. O sistema gera token de recuperação com expiração (1 hora)
6. O sistema envia e-mail com link para redefinição de senha
7. O usuário acessa o link recebido
8. O sistema valida o token de recuperação
9. O sistema exibe formulário para nova senha:
   - Nova senha
   - Confirmação de nova senha
10. O usuário preenche e submete o formulário (`POST /api/auth/reset-password`)
11. O sistema atualiza a senha do usuário
12. O sistema redireciona para página de login com mensagem de sucesso

## Fluxo Alternativo - Edição de Perfil
1. O usuário autenticado acessa "Meu Perfil" no dashboard
2. O sistema exibe formulário com dados atuais (`GET /api/auth/profile`):
   - Nome completo
   - E-mail (não editável)
   - Instituição/Organização
   - Área de atuação
   - Foto de perfil (upload)
   - Opção para alterar senha
3. O usuário realiza as alterações desejadas
4. O sistema valida os dados atualizados
5. O sistema atualiza o perfil (`PATCH /api/auth/profile`)
6. O sistema exibe mensagem de sucesso

## Fluxo Alternativo - Alteração de Senha
1. Na tela de perfil, o usuário seleciona "Alterar Senha"
2. O sistema exibe formulário com campos:
   - Senha atual
   - Nova senha
   - Confirmação de nova senha
3. O usuário preenche e submete o formulário (`PATCH /api/auth/change-password`)
4. O sistema valida:
   - Se a senha atual está correta
   - Se a nova senha atende aos requisitos
   - Se a confirmação coincide com a nova senha
5. O sistema atualiza a senha
6. O sistema exibe mensagem de sucesso

## Fluxo Alternativo - Logout
1. O usuário seleciona a opção "Sair" no menu
2. O sistema invalida o token JWT no cliente (`POST /api/auth/logout`)
3. O sistema redireciona para a página inicial

## Exceções

### EX01 - E-mail já em Uso
1. No fluxo principal de registro, se o e-mail já estiver em uso:
   - O sistema exibe mensagem informando que o e-mail já está registrado
   - O sistema sugere recuperação de senha ou login

### EX02 - Falha na Validação de Dados
1. Em qualquer fluxo, se a validação de dados falhar:
   - O sistema exibe mensagens específicas para cada campo inválido
   - O sistema mantém os dados válidos já inseridos
   - O usuário corrige os campos e tenta novamente

### EX03 - Falha na Autenticação
1. No fluxo principal de login, se as credenciais forem inválidas:
   - O sistema incrementa contador de tentativas falhas
   - O sistema exibe mensagem genérica de erro
   - Após 5 tentativas falhas em 30 minutos, o sistema bloqueia temporariamente o login por 15 minutos

### EX04 - Token Expirado
1. Nos fluxos de verificação de e-mail ou recuperação de senha, se o token estiver expirado:
   - O sistema exibe mensagem informando expiração
   - O sistema oferece opção para reenviar e-mail

## Pós-condições
1. O professor está registrado e/ou autenticado no sistema
2. O professor pode acessar todas as funcionalidades relacionadas ao seu perfil

## Requisitos Não-funcionais
1. **Segurança**: Senhas são armazenadas com hash bcrypt e salt
2. **Performance**: O processo de login deve completar em menos de 1 segundo
3. **Disponibilidade**: O serviço de autenticação deve estar disponível 99.9% do tempo
4. **Acessibilidade**: As interfaces seguem padrões WCAG 2.1 nível AA

## Regras de Negócio
1. **RN01**: A senha deve conter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais
2. **RN02**: O token JWT tem validade de 24 horas (configurável)
3. **RN03**: E-mails de verificação expiram em 24 horas
4. **RN04**: E-mails de recuperação de senha expiram em 1 hora
5. **RN05**: A conta deve ter e-mail verificado para acessar funcionalidades completas
6. **RN06**: Após 5 tentativas falhas de login, a conta é temporariamente bloqueada

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller AuthController
 * @route POST /api/auth/register/teacher
 * @description Registra um novo professor
 */
async registerTeacher(@Body() dto: RegisterTeacherDto): Promise<{ message: string }>

/**
 * @route GET /api/auth/verify-email
 * @description Verifica e-mail através de token
 */
async verifyEmail(@Query('token') token: string): Promise<{ message: string }>

/**
 * @route POST /api/auth/login
 * @description Autentica um usuário
 */
async login(@Body() dto: LoginDto): Promise<AuthResponseDto>

/**
 * @route POST /api/auth/forgot-password
 * @description Solicita recuperação de senha
 */
async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }>

/**
 * @route POST /api/auth/reset-password
 * @description Redefine a senha com token de recuperação
 */
async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }>

/**
 * @route GET /api/auth/profile
 * @description Obtém perfil do usuário autenticado
 * @security JWT
 */
async getProfile(@GetUser() user: User): Promise<UserProfileDto>

/**
 * @route PATCH /api/auth/profile
 * @description Atualiza perfil do usuário
 * @security JWT
 */
async updateProfile(
  @GetUser() user: User,
  @Body() dto: UpdateProfileDto
): Promise<UserProfileDto>

/**
 * @route PATCH /api/auth/change-password
 * @description Altera senha do usuário
 * @security JWT
 */
async changePassword(
  @GetUser() user: User,
  @Body() dto: ChangePasswordDto
): Promise<{ message: string }>

/**
 * @route POST /api/auth/logout
 * @description Invalida token no servidor (opcional)
 * @security JWT
 */
async logout(@GetUser() user: User): Promise<{ message: string }>

/**
 * @route POST /api/auth/refresh-token
 * @description Atualiza token JWT
 * @security Refresh Token
 */
async refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto>
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para registro de professor
 */
export class RegisterTeacherDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'A senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  institution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldOfWork?: string;

  @IsBoolean()
  @IsTrue({ message: 'Você deve aceitar os termos de serviço' })
  termsAccepted: boolean;
}

/**
 * DTO para login
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

/**
 * DTO para resposta de autenticação
 */
export class AuthResponseDto {
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsObject()
  user: UserProfileDto;

  @IsNumber()
  expiresIn: number;
}

/**
 * DTO para recuperação de senha
 */
export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * DTO para redefinição de senha
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  password: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;
}

/**
 * DTO para atualização de perfil
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  institution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldOfWork?: string;

  @IsOptional()
  @IsBase64()
  profilePicture?: string;
}

/**
 * DTO para alteração de senha
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;
}
```
