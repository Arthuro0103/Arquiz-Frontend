# Escopo Backend para MVP do MasterPlan

Arquitetura backend modular usando NestJS para o MVP do aplicativo de avaliação por competição. A proposta segue uma abordagem cloud-native e considera os requisitos mínimos para validar o produto.

## Estrutura de Módulos

```
src/
├── main.ts
├── app.module.ts
├── config/
├── common/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── transcriptions/
│   ├── questions/
│   ├── quizzes/
│   ├── rooms/
│   ├── participation/
│   └── reports/
└── infrastructure/
    ├── cache/
    ├── queue/
    ├── database/
    └── observability/
```

## Implementação dos Módulos do MVP

### 1. Módulo de Autenticação (auth)

```typescript
/**
 * @file src/modules/auth/auth.service.ts
 * @description Serviço responsável pela autenticação e autorização de usuários
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Valida credenciais do usuário e gera token JWT.
   * 
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   * @returns {Promise<IAuthResponse>} Token e dados do usuário
   * @throws {UnauthorizedException} Quando credenciais são inválidas
   */
  async login(email: string, password: string): Promise<IAuthResponse> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !this.comparePasswords(password, user.password)) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    
    return {
      token: this.jwtService.sign(payload),
      user: this.usersService.sanitizeUser(user),
    };
  }
}
```

### 2. Módulo de Usuários (users)

```typescript
/**
 * @file src/modules/users/entities/user.entity.ts
 * @description Entidade principal para usuários do sistema
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date;
}
```

### 3. Módulo de Transcrições (transcriptions)

```typescript
/**
 * @file src/modules/transcriptions/transcriptions.service.ts
 * @description Serviço para gerenciamento de transcrições
 */
@Injectable()
export class TranscriptionsService {
  constructor(
    @InjectRepository(Transcription)
    private readonly transcriptionRepository: Repository<Transcription>,
    private readonly cacheManager: CacheManager,
  ) {}

  /**
   * Cria uma nova transcrição no sistema.
   * 
   * @param {CreateTranscriptionDto} dto - Dados da transcrição
   * @param {string} userId - ID do professor
   * @returns {Promise<Transcription>} Transcrição criada
   */
  async create(
    dto: CreateTranscriptionDto, 
    userId: string
  ): Promise<Transcription> {
    const transcription = this.transcriptionRepository.create({
      ...dto,
      userId,
    });
    
    await this.cacheManager.del(`transcriptions:user:${userId}`);
    return this.transcriptionRepository.save(transcription);
  }
}
```

### 4. Módulo de Geração de Perguntas (questions)

```typescript
/**
 * @file src/modules/questions/questions.service.ts
 * @description Serviço para geração de perguntas usando IA
 */
@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    private readonly aiService: AiService,
    @InjectQueue('questions-generation')
    private readonly questionsQueue: Queue,
  ) {}

  /**
   * Solicita geração de perguntas de forma assíncrona.
   * 
   * @param {GenerateQuestionsDto} dto - Parâmetros para geração
   * @param {string} quizId - ID do questionário relacionado
   * @returns {Promise<void>} Confirmação de processamento iniciado
   */
  async requestQuestionsGeneration(
    dto: GenerateQuestionsDto,
    quizId: string,
  ): Promise<void> {
    await this.questionsQueue.add(
      'generate',
      { transcriptionId: dto.transcriptionId, quizId, count: dto.count },
      { 
        attempts: 3,
        backoff: 5000,
      },
    );
  }
}
```

### 5. Processador de Fila para Geração de Perguntas

```typescript
/**
 * @file src/modules/questions/processors/questions-generator.processor.ts
 * @description Processador assíncrono para geração de perguntas
 */
@Processor('questions-generation')
export class QuestionsGeneratorProcessor {
  private readonly logger = new Logger(QuestionsGeneratorProcessor.name);

  constructor(
    private readonly transcriptionsService: TranscriptionsService,
    private readonly aiService: AiService,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  /**
   * Processa a tarefa de geração de perguntas.
   * 
   * @param {Job} job - Tarefa com dados necessários
   * @returns {Promise<void>}
   */
  @Process('generate')
  async processQuestionsGeneration(job: Job): Promise<void> {
    const { transcriptionId, quizId, count } = job.data;
    
    const transcription = await this.transcriptionsService
      .findById(transcriptionId);
    
    if (!transcription) {
      this.logger.error(`Transcription ${transcriptionId} not found`);
      throw new Error('Transcription not found');
    }
    
    try {
      const generatedQuestions = await this.aiService
        .generateQuestions(transcription.content, count);
      
      const questions = generatedQuestions.map(q => 
        this.questionRepository.create({
          ...q,
          quizId,
        })
      );
      
      await this.questionRepository.save(questions);
    } catch (error) {
      this.logger.error(
        `Failed to generate questions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
```

### 6. Módulo de Questionários (quizzes)

```typescript
/**
 * @file src/modules/quizzes/entities/quiz.entity.ts
 * @description Entidade para questionários
 */
@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'transcription_id' })
  transcriptionId: string;

  @ManyToOne(() => Transcription)
  @JoinColumn({ name: 'transcription_id' })
  transcription: Transcription;

  @Column({
    type: 'enum',
    enum: QuizStatus,
    default: QuizStatus.DRAFT,
  })
  status: QuizStatus;

  @Column({ name: 'questions_count', default: 10 })
  questionsCount: number;

  @OneToMany(() => Question, question => question.quiz)
  questions: Question[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 7. Módulo de Salas (rooms)

```typescript
/**
 * @file src/modules/rooms/rooms.service.ts
 * @description Serviço para criação e gerenciamento de salas de competição
 */
@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    private readonly cacheManager: CacheManager,
  ) {}

  /**
   * Gera um código de convite único para a sala.
   * 
   * @returns {string} Código de 6 caracteres alfanuméricos
   */
  private generateInviteCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  /**
   * Cria uma nova sala de competição.
   * 
   * @param {CreateRoomDto} dto - Dados da sala
   * @param {string} userId - ID do professor
   * @returns {Promise<Room>} Sala criada
   */
  async create(dto: CreateRoomDto, userId: string): Promise<Room> {
    const room = this.roomRepository.create({
      ...dto,
      userId,
      inviteCode: this.generateInviteCode(),
      status: RoomStatus.WAITING,
    });
    
    const createdRoom = await this.roomRepository.save(room);
    
    // Armazena o código de convite em cache para acesso rápido
    await this.cacheManager.set(
      `room:code:${createdRoom.inviteCode}`,
      createdRoom.id,
      { ttl: 60 * 60 * 24 }, // 24 horas
    );
    
    return createdRoom;
  }
}
```

### 8. Módulo de Participação (participation)

```typescript
/**
 * @file src/modules/participation/participation.service.ts
 * @description Serviço para gerenciar participação em salas
 */
@Injectable()
export class ParticipationService {
  constructor(
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    private readonly roomsService: RoomsService,
  ) {}

  /**
   * Registra a resposta de um participante.
   * 
   * @param {string} participationId - ID da participação
   * @param {SubmitAnswerDto} dto - Dados da resposta
   * @returns {Promise<Answer>} Resposta registrada com pontuação
   */
  async submitAnswer(
    participationId: string,
    dto: SubmitAnswerDto,
  ): Promise<Answer> {
    const participation = await this.participationRepository.findOne({
      where: { id: participationId },
      relations: ['room'],
    });
    
    if (!participation) {
      throw new NotFoundException('Participação não encontrada');
    }
    
    const question = await this.questionsService.findById(dto.questionId);
    
    const isCorrect = question.correctOptionIndex === dto.selectedOptionIndex;
    const points = isCorrect ? this.calculatePoints(dto.responseTimeMs) : 0;
    
    const answer = this.answerRepository.create({
      participationId,
      questionId: dto.questionId,
      selectedOptionIndex: dto.selectedOptionIndex,
      responseTimeMs: dto.responseTimeMs,
      isCorrect,
      points,
    });
    
    return this.answerRepository.save(answer);
  }
}
```

### 9. Módulo de Relatórios (reports)

```typescript
/**
 * @file src/modules/reports/reports.service.ts
 * @description Serviço para geração de relatórios básicos
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Participation)
    private readonly participationRepository: Repository<Participation>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    private readonly cacheManager: CacheManager,
  ) {}

  /**
   * Gera relatório de desempenho para uma sala específica.
   * 
   * @param {string} roomId - ID da sala
   * @returns {Promise<RoomReportDto>} Relatório de desempenho
   */
  async getRoomReport(roomId: string): Promise<RoomReportDto> {
    const cacheKey = `report:room:${roomId}`;
    const cachedReport = await this.cacheManager.get<RoomReportDto>(cacheKey);
    
    if (cachedReport) {
      return cachedReport;
    }

    const participations = await this.participationRepository.find({
      where: { roomId },
      relations: ['user', 'answers'],
    });
    
    const report = {
      roomId,
      participantsCount: participations.length,
      averageScore: this.calculateAverageScore(participations),
      topPerformers: this.getTopPerformers(participations, 5),
      questionsStats: await this.getQuestionsStats(roomId),
    };
    
    await this.cacheManager.set(cacheKey, report, { ttl: 60 * 30 }); // 30 min
    
    return report;
  }
}
```

## Infraestrutura

### 1. Configuração de Banco de Dados

```typescript
/**
 * @file src/infrastructure/database/database.module.ts
 * @description Configuração do TypeORM com PostgreSQL
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/../../modules/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: true,
        logging: configService.get('NODE_ENV') !== 'production',
        synchronize: configService.get('NODE_ENV') !== 'production',
        ssl: configService.get('DB_SSL') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
```

### 2. Configuração de Cache

```typescript
/**
 * @file src/infrastructure/cache/cache.module.ts
 * @description Configuração do Redis como cache distribuído
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        password: configService.get('REDIS_PASSWORD'),
        ttl: 60 * 60, // 1 hora padrão
        max: 100, // Máximo de itens em cache
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
```

### 3. Configuração de Filas

```typescript
/**
 * @file src/infrastructure/queue/queue.module.ts
 * @description Configuração das filas com RabbitMQ
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'questions-generation' },
      { name: 'reports-generation' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

### 4. Configuração de Observabilidade

```typescript
/**
 * @file src/infrastructure/observability/logger.middleware.ts
 * @description Middleware para logging de requisições HTTP
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const requestId = uuid();
    
    req['requestId'] = requestId;
    res.locals.startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const responseTime = Date.now() - res.locals.startTime;
      
      const message = `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms`;
      
      if (statusCode >= 500) {
        this.logger.error(message, { 
          requestId, statusCode, ip, userAgent, responseTime 
        });
      } else if (statusCode >= 400) {
        this.logger.warn(message, { 
          requestId, statusCode, ip, userAgent, responseTime 
        });
      } else {
        this.logger.log(message, { 
          requestId, statusCode, ip, userAgent, responseTime 
        });
      }
    });

    next();
  }
}
```

## Docker & Kubernetes

### 1. Dockerfile

```dockerfile
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

ENV NODE_ENV=production
ENV TZ=UTC

USER node

CMD ["node", "dist/main"]
```

### 2. docker-compose.yml para desenvolvimento

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    env_file:
      - .env.dev
    depends_on:
      - postgres
      - redis
      - rabbitmq

  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: masterplan
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3.12-management
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  pg_data:
```

## Considerações de Implementação

1. **Segurança**:
   - Implementar rate-limiting para endpoints de autenticação
   - Utilizar helmet para proteção contra ataques comuns
   - Validação rigorosa de inputs com class-validator

2. **Performance**:
   - Uso de cache distribuído para queries frequentes
   - Processamento assíncrono para operações intensivas
   - Paginação em todas as listagens

3. **Observabilidade**:
   - Request tracing com correlation IDs
   - Monitoramento de filas e consumo de recursos
   - Alertas para falhas em operações críticas

4. **Infraestrutura**:
   - Configuração com variáveis de ambiente
   - Healthchecks para todos os serviços
   - Estratégia de retentativas para operações assíncronas

Este escopo contempla todos os requisitos para o MVP conforme descrito no documento, utilizando as tecnologias modernas especificadas nas diretrizes técnicas. A arquitetura proposta é escalável, permitindo a adição de novos recursos nas fases posteriores de desenvolvimento.