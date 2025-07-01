'use client';

import React, { Suspense, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Star,
  Award,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Enhanced TypeScript interfaces
interface DashboardStats {
  readonly totalQuizzes: number;
  readonly totalRooms: number;
  readonly totalParticipants: number;
  readonly averageScore: number;
  readonly completionRate: number;
  readonly weeklyGrowth: number;
  readonly monthlyGrowth: number;
}

interface QuickAction {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly color: string;
  readonly bgColor: string;
  readonly badge?: string;
}

interface ActivityItem {
  readonly id: string;
  readonly type: 'quiz_created' | 'room_completed' | 'high_score' | 'milestone';
  readonly title: string;
  readonly description: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

// Enhanced loading skeleton
const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
    
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Enhanced stats card component
interface StatsCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly description: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly trend?: {
    readonly value: number;
    readonly label: string;
    readonly isPositive: boolean;
  };
  readonly color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  color = "text-blue-500" 
}) => (
  <Card className="transition-all duration-200 hover:shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={cn("h-4 w-4", color)} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className={cn(
            "flex items-center text-xs",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}>
            <TrendingUp className={cn(
              "h-3 w-3 mr-1",
              !trend.isPositive && "rotate-180"
            )} />
            {trend.value}% {trend.label}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// Enhanced quick action card
interface QuickActionCardProps {
  readonly action: QuickAction;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ action }) => (
  <Link href={action.href}>
    <Card className="transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={cn("p-2 rounded-lg", action.bgColor)}>
            <action.icon className={cn("h-6 w-6", action.color)} />
          </div>
          {action.badge && (
            <Badge variant="secondary" className="text-xs">
              {action.badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg group-hover:text-primary transition-colors">
          {action.title}
        </CardTitle>
        <CardDescription>{action.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" className="w-full group-hover:bg-primary/90">
          Começar
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  </Link>
);

// Enhanced activity feed
interface ActivityFeedProps {
  readonly activities: ActivityItem[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'quiz_created':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'room_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'high_score':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'milestone':
        return <Star className="h-4 w-4 text-purple-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m atrás`;
    } else if (diffInMinutes < 1440) { // 24 hours
      return `${Math.floor(diffInMinutes / 60)}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex-shrink-0 mt-0.5">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{activity.title}</p>
            <p className="text-xs text-muted-foreground">{activity.description}</p>
          </div>
          <div className="flex-shrink-0 text-xs text-muted-foreground">
            {formatTimestamp(activity.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  
  // Mock data - replace with actual API calls
  const stats: DashboardStats = useMemo(() => ({
    totalQuizzes: 24,
    totalRooms: 8,
    totalParticipants: 156,
    averageScore: 78.5,
    completionRate: 89.2,
    weeklyGrowth: 12.3,
    monthlyGrowth: 24.7
  }), []);

  const quickActions: QuickAction[] = useMemo(() => [
    {
      title: 'Criar Quiz',
      description: 'Desenvolva novos quizzes para seus estudantes',
      href: '/quizzes/create',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      badge: 'Popular'
    },
    {
      title: 'Nova Sala',
      description: 'Inicie uma nova sala de competição',
      href: '/rooms/create',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900'
    },
    {
      title: 'Ver Relatórios',
      description: 'Analise performance e estatísticas',
      href: '/reports',
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900'
    },
    {
      title: 'Biblioteca de Quizzes',
      description: 'Explore e gerencie seus quizzes',
      href: '/quizzes',
      icon: BookOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900'
    },
    {
      title: 'Salas Ativas',
      description: 'Monitore competições em andamento',
      href: '/rooms',
      icon: PlayCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
      badge: '3 ativas'
    },
    {
      title: 'Configurações',
      description: 'Ajuste preferências da conta',
      href: '/settings',
      icon: Target,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-900'
    }
  ], []);

  const recentActivities: ActivityItem[] = useMemo(() => [
    {
      id: '1',
      type: 'quiz_created',
      title: 'Novo quiz criado',
      description: 'Quiz "História do Brasil" foi adicionado',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
    },
    {
      id: '2',
      type: 'room_completed',
      title: 'Sala finalizada',
      description: '23 estudantes participaram da competição',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
    },
    {
      id: '3',
      type: 'high_score',
      title: 'Novo recorde!',
      description: 'Ana Silva alcançou 98% de acerto',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
    },
    {
      id: '4',
      type: 'milestone',
      title: 'Meta alcançada',
      description: '100+ estudantes utilizaram a plataforma',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString()
    }
  ], []);

  const isTeacher = session?.user?.role === 'teacher';

  if (status === 'loading') {
    return <DashboardSkeleton />;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você precisa estar logado para acessar o dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      {/* Enhanced Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              Bem-vindo{session?.user?.name ? `, ${session.user.name}` : ''}!
            </h1>
            <p className="text-muted-foreground">
              {isTeacher 
                ? 'Gerencie seus quizzes e acompanhe o progresso dos estudantes'
                : 'Participe de quizzes e competições interativas'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Zap className="h-3 w-3" />
            {isTeacher ? 'Professor' : 'Estudante'}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Calendar className="h-3 w-3" />
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Badge>
        </div>
      </div>

      {/* Enhanced Stats Section */}
      {isTeacher && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Estatísticas</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total de Quizzes"
              value={stats.totalQuizzes}
              description="Quizzes criados"
              icon={FileText}
              color="text-blue-500"
              trend={{
                value: stats.weeklyGrowth,
                label: "esta semana",
                isPositive: true
              }}
            />
            <StatsCard
              title="Salas Criadas"
              value={stats.totalRooms}
              description="Competições organizadas"
              icon={Users}
              color="text-green-500"
            />
            <StatsCard
              title="Participantes"
              value={stats.totalParticipants}
              description="Estudantes engajados"
              icon={Trophy}
              color="text-purple-500"
              trend={{
                value: stats.monthlyGrowth,
                label: "este mês",
                isPositive: true
              }}
            />
            <StatsCard
              title="Pontuação Média"
              value={`${stats.averageScore}%`}
              description="Performance geral"
              icon={Award}
              color="text-orange-500"
            />
          </div>
        </div>
      )}

      {/* Enhanced Quick Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Ações Rápidas</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions
            .filter(action => isTeacher || !['criar-quiz', 'nova-sala', 'relatorios'].includes(action.href.split('/').pop() || ''))
            .map((action) => (
              <QuickActionCard key={action.title} action={action} />
            ))}
        </div>
      </div>

      {/* Enhanced Recent Activity */}
      {isTeacher && recentActivities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Atividade Recente</h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/activity">
                Ver Todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimas Atualizações</CardTitle>
              <CardDescription>
                Acompanhe as atividades mais recentes da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Carregando atividades...</div>}>
                <ActivityFeed activities={recentActivities} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Getting Started for Students */}
      {!isTeacher && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Como Começar</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Participar de uma Competição
                </CardTitle>
                <CardDescription>
                  Use um código de acesso para entrar em uma sala de quiz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/join">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Entrar em Sala
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Explorar Quizzes
                </CardTitle>
                <CardDescription>
                  Descubra quizzes públicos disponíveis para praticar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/explore">
                    <Target className="mr-2 h-4 w-4" />
                    Explorar
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
