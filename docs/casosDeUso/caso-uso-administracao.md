# Caso de Uso: Administração do Sistema

## Identificação
**UC-08**: Administração do Sistema

## Atores
- **Ator Principal**: Administrador do Sistema
- **Atores Secundários**: Professores, Alunos, Sistema de Monitoramento

## Descrição
Este caso de uso descreve como um administrador gerencia o sistema MasterPlan, incluindo gerenciamento de usuários, monitoramento de recursos, análise de uso e configuração global do sistema.

## Pré-condições
1. O administrador está autenticado no sistema com permissões de administração
2. O administrador possui acesso ao painel administrativo

## Fluxo Principal - Acesso ao Painel Administrativo
1. O administrador acessa a URL do painel administrativo
2. O sistema solicita credenciais de administrador (e-mail e senha)
3. O administrador fornece as credenciais
4. O sistema valida as credenciais e verifica permissões
5. O sistema exibe o dashboard administrativo (`GET /api/admin/dashboard`) com:
   - Métricas gerais (usuários ativos, competições em andamento)
   - Gráficos de uso (últimos 7/30 dias)
   - Alertas e notificações de sistema
   - Menu de navegação para áreas administrativas

## Fluxo Alternativo - Gerenciamento de Usuários
1. No dashboard administrativo, o administrador seleciona "Gerenciar Usuários"
2. O sistema exibe lista paginada de usuários (`GET /api/admin/users`) com:
   - Nome
   - E-mail
   - Tipo (professor/aluno)
   - Status (ativo/inativo/bloqueado)
   - Data de criação
   - Último acesso
3. O administrador pode filtrar, ordenar e buscar usuários
4. O administrador seleciona um usuário específico (`GET /api/admin/users/:id`)
5. O sistema exibe detalhes do usuário e opções:
   - Editar informações básicas
   - Alterar status (ativar/desativar/bloquear) (`PATCH /api/admin/users/:id/status`)
   - Redefinir senha (`POST /api/admin/users/:id/reset-password`)
   - Verificar atividades
   - Remover usuário
6. O administrador realiza ação desejada
7. O sistema executa a ação e registra em log de auditoria
8. O sistema exibe confirmação de sucesso

## Fluxo Alternativo - Monitoramento de Sistema
1. No dashboard administrativo, o administrador seleciona "Monitoramento"
2. O sistema exibe painel com:
   - Uso de recursos (`GET /api/admin/monitoring/resources`)
   - Performance da API (tempos de resposta, requisições)
   - Logs de erro (`GET /api/admin/monitoring/logs`)
   - Uso de serviços externos (IA, e-mail)
   - Status de filas de processamento
3. O administrador pode:
   - Filtrar logs por nível (erro, aviso, informação)
   - Configurar alertas automáticos
   - Reiniciar serviços específicos (`POST /api/admin/services/:service/restart`)
   - Analisar tendências de performance

## Fluxo Alternativo - Configurações Globais
1. No dashboard administrativo, o administrador seleciona "Configurações"
2. O sistema exibe formulário com configurações globais (`GET /api/admin/settings`):
   - Limites por plano (número de competições, participantes)
   - Parâmetros de segurança (complexidade de senha, duração de tokens)
   - Configurações de e-mail (templates, remetente)
   - Configurações de integração com IA (chaves API, parâmetros)
   - Localização e idiomas
3. O administrador realiza alterações desejadas
4. O sistema valida as alterações
5. O sistema aplica as configurações (`PATCH /api/admin/settings`)
6. O sistema registra alterações em log de auditoria
7. O sistema exibe confirmação de sucesso

## Fluxo Alternativo - Gerenciamento de Planos e Cobranças
1. No dashboard administrativo, o administrador seleciona "Planos e Cobranças"
2. O sistema exibe (`GET /api/admin/billing`):
   - Lista de planos disponíveis
   - Estatísticas de assinantes por plano
   - Histórico de receitas
   - Configurações de processador de pagamento
3. O administrador pode:
   - Criar/editar/desativar planos (`POST /api/admin/billing/plans`)
   - Visualizar histórico de pagamentos (`GET /api/admin/billing/payments`)
   - Gerenciar descontos e promoções (`POST /api/admin/billing/promotions`)
   - Processar reembolsos (`POST /api/admin/billing/refunds`)
   - Configurar gateway de pagamento (`PATCH /api/admin/billing/gateway`)

## Fluxo Alternativo - Análise de Uso e Relatórios
1. No dashboard administrativo, o administrador seleciona "Análise e Relatórios"
2. O sistema exibe opções de relatórios (`GET /api/admin/reports`):
   - Usuários (crescimento, retenção, engajamento)
   - Competições (quantidade, participação média)
   - Uso de recursos (CPU, API, IA)
   - Financeiros (receita, conversão)
3. O administrador seleciona tipo de relatório e período
4. O sistema gera relatório com visualizações gráficas (`GET /api/admin/reports/:type`)
5. O administrador pode exportar em diversos formatos (CSV, PDF, Excel)

## Exceções

### EX01 - Ação Bloqueada por Permissões
1. Se o administrador tentar executar ação sem permissão adequada:
   - O sistema exibe mensagem informando permissão insuficiente
   - O sistema registra tentativa em log de segurança
   - A ação não é executada

### EX02 - Falha em Operação Crítica
1. Se ocorrer erro em operação crítica (alteração de configurações, reinicio de serviço):
   - O sistema reverte alterações para estado anterior
   - O sistema registra detalhes do erro em log
   - O sistema notifica administradores por e-mail/SMS
   - O sistema exibe mensagem detalhada do erro

## Pós-condições
1. As alterações administrativas são aplicadas ao sistema
2. As ações são registradas em logs de auditoria para rastreabilidade
3. O sistema continua operando de acordo com as configurações atualizadas

## Requisitos Não-funcionais
1. **Segurança**: Acesso administrativo requer autenticação de dois fatores
2. **Auditoria**: Todas as ações administrativas são registradas com detalhes
3. **Isolamento**: Alterações administrativas não interrompem operações em andamento
4. **Performance**: Painel administrativo deve carregar em menos de 3 segundos

## Regras de Negócio
1. **RN01**: Administradores podem ter diferentes níveis de permissão
2. **RN02**: Operações críticas requerem confirmação explícita
3. **RN03**: O sistema mantém histórico de alterações de configuração por 1 ano
4. **RN04**: Ações administrativas em usuários geram notificações aos afetados
5. **RN05**: Remoção de usuário é lógica, não física (preserva dados históricos)
6. **RN06**: Administradores não podem alterar suas próprias permissões

## Interfaces do Sistema

### API Endpoints

```typescript
/**
 * @controller AdminController
 * @route GET /api/admin/dashboard
 * @description Obtém dados do dashboard administrativo
 * @security JWT + Admin
 */
async getDashboard(@GetUser() user: User): Promise<AdminDashboardDto>

/**
 * @route GET /api/admin/users
 * @description Lista usuários com paginação e filtros
 * @security JWT + Admin
 */
async getUsers(
  @Query() query: AdminUsersQueryDto,
  @GetUser() user: User
): Promise<PaginatedResponseDto<UserAdminDto>>

/**
 * @route GET /api/admin/users/:id
 * @description Obtém detalhes de um usuário específico
 * @security JWT + Admin
 */
async getUserDetails(
  @Param('id') id: string,
  @GetUser() user: User
): Promise<UserDetailAdminDto>

/**
 * @route PATCH /api/admin/users/:id/status
 * @description Altera status de um usuário
 * @security JWT + Admin
 */
async updateUserStatus(
  @Param('id') id: string,
  @Body() dto: UpdateUserStatusDto,
  @GetUser() user: User
): Promise<UserAdminDto>

/**
 * @route POST /api/admin/users/:id/reset-password
 * @description Redefine senha de um usuário
 * @security JWT + Admin
 */
async resetUserPassword(
  @Param('id') id: string,
  @GetUser() user: User
): Promise<{ message: string }>

/**
 * @route GET /api/admin/monitoring/resources
 * @description Obtém dados de uso de recursos
 * @security JWT + Admin
 */
async getResourcesUsage(@GetUser() user: User): Promise<ResourcesUsageDto>

/**
 * @route GET /api/admin/monitoring/logs
 * @description Obtém logs do sistema com filtros
 * @security JWT + Admin
 */
async getLogs(
  @Query() query: LogsQueryDto,
  @GetUser() user: User
): Promise<PaginatedResponseDto<LogEntryDto>>

/**
 * @route POST /api/admin/services/:service/restart
 * @description Reinicia um serviço específico
 * @security JWT + Admin
 */
async restartService(
  @Param('service') service: string,
  @GetUser() user: User
): Promise<{ message: string; status: string }>

/**
 * @route GET /api/admin/settings
 * @description Obtém configurações globais do sistema
 * @security JWT + Admin
 */
async getSettings(@GetUser() user: User): Promise<SystemSettingsDto>

/**
 * @route PATCH /api/admin/settings
 * @description Atualiza configurações globais do sistema
 * @security JWT + Admin
 */
async updateSettings(
  @Body() dto: UpdateSystemSettingsDto,
  @GetUser() user: User
): Promise<SystemSettingsDto>

/**
 * @route GET /api/admin/plans
 * @description Lista planos disponíveis
 * @security JWT + Admin
 */
async getPlans(@GetUser() user: User): Promise<Plan[]>

/**
 * @route POST /api/admin/plans
 * @description Cria novo plano
 * @security JWT + Admin
 */
async createPlan(
  @Body() dto: CreatePlanDto,
  @GetUser() user: User
): Promise<Plan>

/**
 * @route GET /api/admin/reports/:type
 * @description Gera relatório administrativo
 * @security JWT + Admin
 */
async generateReport(
  @Param('type') type: AdminReportType,
  @Query() query: ReportQueryDto,
  @GetUser() user: User
): Promise<AdminReportDto>

/**
 * @route GET /api/admin/audit-log
 * @description Obtém logs de auditoria para ações administrativas
 * @security JWT + Admin
 */
async getAuditLog(
  @Query() query: AuditLogQueryDto,
  @GetUser() user: User
): Promise<PaginatedResponseDto<AuditLogEntryDto>>
```

### DTO (Data Transfer Objects)

```typescript
/**
 * DTO para resposta do dashboard administrativo
 */
export class AdminDashboardDto {
  @IsObject()
  metrics: {
    totalUsers: number;
    activeUsers: number;
    totalRooms: number;
    activeRooms: number;
    totalQuizzes: number;
    totalTranscriptions: number;
  };

  @IsArray()
  userGrowth: {
    date: string;
    count: number;
  }[];

  @IsArray()
  roomActivity: {
    date: string;
    created: number;
    active: number;
    completed: number;
  }[];

  @IsArray()
  alerts: {
    type: string;
    message: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high';
  }[];

  @IsObject()
  systemHealth: {
    apiStatus: 'healthy' | 'degraded' | 'unhealthy';
    databaseStatus: 'healthy' | 'degraded' | 'unhealthy';
    queueStatus: 'healthy' | 'degraded' | 'unhealthy';
    cacheStatus: 'healthy' | 'degraded' | 'unhealthy';
    aiServiceStatus: 'healthy' | 'degraded' | 'unhealthy';
  };
}

/**
 * DTO para query de usuários administrativos
 */
export class AdminUsersQueryDto {
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * DTO para usuário na visão administrativa
 */
export class UserAdminDto {
  @IsUUID()
  id: string;

  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsEnum(UserType)
  type: UserType;

  @IsEnum(UserStatus)
  status: UserStatus;

  @IsBoolean()
  emailVerified: boolean;

  @IsDate()
  createdAt: Date;

  @IsOptional()
  @IsDate()
  lastLoginAt?: Date;

  @IsObject()
  stats: {
    totalLogins: number;
    contentCount: number;
    activeRooms: number;
  };
}

/**
 * DTO para atualização de status de usuário
 */
export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsBoolean()
  notifyUser: boolean;
}

/**
 * DTO para configurações do sistema
 */
export class SystemSettingsDto {
  @IsObject()
  security: {
    @IsInt()
    @Min(1)
    @Max(60)
    tokenExpirationHours: number;

    @IsBoolean()
    requireEmailVerification: boolean;

    @IsInt()
    @Min(1)
    @Max(10)
    maxLoginAttempts: number;

    @IsInt()
    @Min(8)
    @Max(32)
    minPasswordLength: number;

    @IsBoolean()
    requirePasswordComplexity: boolean;

    @IsBoolean()
    enableTwoFactorAuth: boolean;
  };

  @IsObject()
  email: {
    @IsString()
    senderName: string;

    @IsEmail()
    senderEmail: string;

    @IsString()
    welcomeTemplate: string;

    @IsString()
    passwordResetTemplate: string;

    @IsString()
    verificationTemplate: string;
  };

  @IsObject()
  aiService: {
    @IsString()
    provider: string;

    @IsString()
    @IsNotEmpty()
    apiKey: string;

    @IsString()
    model: string;

    @IsNumber()
    @Min(0)
    @Max(1)
    temperature: number;

    @IsInt()
    @Min(1)
    maxQuestionsPerRequest: number;
  };

  @IsObject()
  limits: {
    @IsInt()
    @Min(1)
    freeTranscriptionsCount: number;

    @IsInt()
    @Min(1)
    freeRoomsCount: number;

    @IsInt()
    @Min(1)
    maxParticipantsPerRoom: number;

    @IsInt()
    @Min(1)
    maxQuestionsPerQuiz: number;
  };

  @IsObject()
  localization: {
    @IsArray()
    availableLanguages: string[];

    @IsString()
    defaultLanguage: string;

    @IsString()
    timezone: string;
  };
}

/**
 * Enums para administração
 */
export enum UserType {
  TEACHER = 'teacher',
  STUDENT = 'student',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  PENDING = 'pending',
}

export enum AdminReportType {
  USERS = 'users',
  ROOMS = 'rooms',
  QUIZZES = 'quizzes',
  RESOURCES = 'resources',
  FINANCIAL = 'financial',
}
```
