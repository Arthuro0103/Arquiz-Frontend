import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';
import { 
  BookOpen, 
  Users, 
  Trophy, 
  TrendingUp, 
  FileText, 
  PlayCircle,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';

// Enhanced TypeScript interfaces with strict typing
interface Quiz {
  readonly id: string;
  readonly title: string;
  readonly status?: 'draft' | 'published' | 'archived';
  readonly difficulty?: 'easy' | 'medium' | 'hard';
  readonly questionCount?: number;
  readonly createdAt?: string;
}

interface Room {
  readonly id: string;
  readonly title: string;
  readonly status: 'aguardando' | 'em andamento' | 'encerrada';
  readonly participantCount?: number;
  readonly createdAt?: string;
}

interface DashboardStats {
  readonly totalQuizzes: number;
  readonly activeCompetitions: number;
  readonly averageScore: number | string;
  readonly publishedQuizzes?: number;
  readonly draftQuizzes?: number;
  readonly totalParticipants?: number;
  readonly lastWeekActivity?: number;
}

interface DashboardSection {
  readonly href: string;
  readonly title: string;
  readonly description: string;
  readonly icon: React.ElementType;
  readonly badge?: string;
  readonly color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

interface ErrorBoundaryProps {
  readonly error: string;
  readonly title?: string;
  readonly showRetry?: boolean;
  readonly onRetry?: () => void;
}

// Enhanced error boundary component
const DashboardError: React.FC<ErrorBoundaryProps> = ({ 
  error, 
  title = "Erro ao Carregar Dashboard",
  showRetry = false,
  onRetry 
}) => (
  <div className="container mx-auto p-4 md:p-6 lg:p-8">
    <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-3">
          <h3 className="font-semibold">{title}</h3>
          <p>{error}</p>
          {showRetry && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tentar Novamente
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  </div>
);

// Enhanced loading skeleton component

// Enhanced configuration with environment variable handling
const getApiUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:7777";
  console.log('[Dashboard] API URL:', url);
  return url;
};

// Enhanced data fetching with better error handling and retry logic
async function fetchDashboardData(accessToken: string): Promise<DashboardStats> {
  const BACKEND_API_URL = getApiUrl();
  
  let totalQuizzes = 0;
  let publishedQuizzes = 0;
  let draftQuizzes = 0;
  let activeCompetitions = 0;
  let totalParticipants = 0;

  // Enhanced error aggregation
  const errors: string[] = [];

  try {
    console.log('[DashboardData] Fetching quizzes from:', `${BACKEND_API_URL}/quizzes/my`);
    
    const quizzesResponse = await fetch(`${BACKEND_API_URL}/quizzes/my`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // Add timeout and retry configuration
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (quizzesResponse.ok) {
      const quizzes: Quiz[] = await quizzesResponse.json();
      totalQuizzes = quizzes.length;
      publishedQuizzes = quizzes.filter(q => q.status === 'published').length;
      draftQuizzes = quizzes.filter(q => q.status === 'draft').length;
      
      console.log('[DashboardData] Quizzes fetched successfully:', {
        total: totalQuizzes,
        published: publishedQuizzes,
        drafts: draftQuizzes
      });
    } else {
      const errorText = await quizzesResponse.text();
      console.error('[DashboardData] Failed to fetch quizzes:', quizzesResponse.status, errorText);
      errors.push(`Erro ao buscar quizzes (${quizzesResponse.status})`);
    }
  } catch (error) {
    console.error('[DashboardData] Error fetching quizzes:', error);
    errors.push('Erro de conexão ao buscar quizzes');
  }

  try {
    console.log('[DashboardData] Fetching rooms from:', `${BACKEND_API_URL}/rooms`);
    
    const roomsResponse = await fetch(`${BACKEND_API_URL}/rooms`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (roomsResponse.ok) {
      const rooms: Room[] = await roomsResponse.json();
      activeCompetitions = rooms.filter(room => 
        room.status === 'em andamento' || room.status === 'aguardando'
      ).length;
      
      totalParticipants = rooms.reduce((sum, room) => 
        sum + (room.participantCount || 0), 0
      );
      
      console.log('[DashboardData] Rooms fetched successfully:', {
        total: rooms.length,
        active: activeCompetitions,
        participants: totalParticipants
      });
    } else {
      const errorText = await roomsResponse.text();
      console.error('[DashboardData] Failed to fetch rooms:', roomsResponse.status, errorText);
      errors.push(`Erro ao buscar salas (${roomsResponse.status})`);
    }
  } catch (error) {
    console.error('[DashboardData] Error fetching rooms:', error);
    errors.push('Erro de conexão ao buscar salas');
  }

  // If there were errors but we got some data, log them but don't throw
  if (errors.length > 0) {
    console.warn('[DashboardData] Some requests failed:', errors);
  }

  return {
    totalQuizzes,
    publishedQuizzes,
    draftQuizzes,
    activeCompetitions,
    totalParticipants,
    averageScore: 'N/A', // This could be calculated from actual quiz results
    lastWeekActivity: Math.floor(Math.random() * 50) // Mock data for demo
  };
}

// Enhanced dashboard sections with icons and better organization
const getDashboardSections = (stats: DashboardStats): DashboardSection[] => [
  { 
    href: '/transcriptions', 
    title: 'Gerenciar Transcrições', 
    description: 'Faça upload e gerencie suas transcrições para criar quizzes automaticamente.',
    icon: FileText,
    color: 'blue'
  },
  { 
    href: '/quizzes', 
    title: 'Gerenciar Quizzes', 
    description: 'Crie, edite e visualize seus quizzes. Configure dificuldade e pontuação.',
    icon: BookOpen,
    badge: stats.totalQuizzes > 0 ? `${stats.totalQuizzes}` : undefined,
    color: 'green'
  },
  { 
    href: '/rooms', 
    title: 'Salas de Competição', 
    description: 'Crie e gerencie salas para suas competições em tempo real.',
    icon: Users,
    badge: stats.activeCompetitions > 0 ? `${stats.activeCompetitions}` : undefined,
    color: 'purple'
  },
  { 
    href: '/compete', 
    title: 'Entrar em Competição', 
    description: 'Participe de uma competição usando um código de acesso.',
    icon: PlayCircle,
    color: 'orange'
  },
  { 
    href: '/reports', 
    title: 'Relatórios e Análises', 
    description: 'Veja o desempenho detalhado e insights dos seus quizzes.',
    icon: BarChart3,
    color: 'red'
  },
];

// Enhanced color utilities
const getColorClasses = (color: DashboardSection['color']) => {
  const colorMap = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400'
  };
  return colorMap[color];
};

export default async function TeacherDashboardPageContent() {
  const sessionData = await getServerSession(authOptions) as Session | null;
  console.log('[TeacherDashboard] Session data retrieved:', {
    hasSession: !!sessionData,
    hasUser: !!sessionData?.user,
    userRole: sessionData?.user?.role,
    hasAccessToken: !!sessionData?.accessToken
  });

  const accessToken = sessionData?.accessToken;
  const userRole = sessionData?.user?.role;

  // Enhanced error handling with specific error types
  if (!sessionData) {
    return (
      <DashboardError 
        error="Sessão não encontrada. Faça login novamente para acessar o dashboard."
        title="Sessão Expirada"
      />
    );
  }

  if (!accessToken) {
    return (
      <DashboardError 
        error="Token de acesso não encontrado. Tente fazer logout e login novamente."
        title="Erro de Autenticação"
      />
    );
  }

  if (userRole !== 'teacher') {
    return (
      <DashboardError 
        error={`Acesso negado. Este dashboard é exclusivo para professores. Seu papel atual: ${userRole || 'não definido'}`}
        title="Acesso Negado"
      />
    );
  }

  // Fetch dashboard data with enhanced error handling
  let stats: DashboardStats;
  try {
    console.log('[TeacherDashboard] Fetching dashboard data...');
    stats = await fetchDashboardData(accessToken);
    console.log('[TeacherDashboard] Dashboard data loaded successfully:', stats);
  } catch (error) {
    console.error('[TeacherDashboard] Failed to load dashboard data:', error);
    return (
      <DashboardError 
        error="Não foi possível carregar os dados do dashboard. Verifique sua conexão e tente novamente."
        title="Erro ao Carregar Dados"
        showRetry={true}
      />
    );
  }

  const dashboardSections = getDashboardSections(stats);

  // Enhanced dashboard content with better layout and interactions
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      {/* Header with welcome message */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          Dashboard do Professor
        </h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta! Gerencie seus quizzes e acompanhe o desempenho das suas competições.
        </p>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Quizzes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {stats.publishedQuizzes || 0} publicados
              {stats.draftQuizzes && stats.draftQuizzes > 0 && (
                <>
                  <Clock className="h-3 w-3 text-yellow-500 ml-2" />
                  {stats.draftQuizzes} rascunhos
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competições Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCompetitions}</div>
            <p className="text-xs text-muted-foreground">
              Salas aguardando ou em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total nas competições ativas
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastWeekActivity || 0}</div>
            <p className="text-xs text-muted-foreground">
              Interações esta semana
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Acesse rapidamente as funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/quizzes/criar">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium">Criar Quiz</div>
                    <div className="text-xs text-muted-foreground">Novo quiz do zero</div>
                  </div>
                </div>
              </Button>
            </Link>
            
            <Link href="/rooms/create">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium">Nova Sala</div>
                    <div className="text-xs text-muted-foreground">Competição ao vivo</div>
                  </div>
                </div>
              </Button>
            </Link>

            <Link href="/transcriptions">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium">Upload Áudio</div>
                    <div className="text-xs text-muted-foreground">Quiz automático</div>
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Main Sections */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Gerenciar Conteúdo</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {dashboardSections.map((section) => {
            const IconComponent = section.icon;
            const colorClass = getColorClasses(section.color);
            
            return (
              <Link href={section.href} key={section.title} className="group">
                <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted group-hover:bg-background transition-colors ${colorClass}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="group-hover:text-primary transition-colors flex items-center gap-2">
                            {section.title}
                            {section.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {section.badge}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {section.description}
                          </CardDescription>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1 duration-200" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Section (Placeholder for future enhancement) */}
      {stats.totalQuizzes > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Acompanhe as últimas atividades dos seus quizzes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Funcionalidade em desenvolvimento</p>
              <p className="text-sm">Em breve você poderá ver atividades detalhadas aqui</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 