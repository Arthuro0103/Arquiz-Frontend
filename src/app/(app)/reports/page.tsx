'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  FileText,
  Download,
  Search,
  Eye,
  Clock,
  Target,
  Trophy,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';

interface RoomReport {
  id: string;
  name: string;
  quizTitle: string;
  status: 'pending' | 'active' | 'finished' | 'cancelled';
  totalParticipants: number;
  completedParticipants: number;
  averageScore: number;
  averageTime: number; // in seconds
  createdAt: string;
  finishedAt?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalQuestions: number;
}

interface ReportStats {
  totalRooms: number;
  totalParticipants: number;
  averageScore: number;
  completionRate: number;
  topQuiz: {
    title: string;
    score: number;
  };
  recentActivity: number;
}

export default function ReportsPage() {
  const router = useRouter();
  
  const [reports, setReports] = useState<RoomReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<RoomReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Mock data - In real app, this would come from API
  const mockReports = useMemo(() => [
    {
      id: '1',
      name: 'Competição de React',
      quizTitle: 'React Fundamentals',
      status: 'finished' as const,
      totalParticipants: 25,
      completedParticipants: 23,
      averageScore: 87.5,
      averageTime: 480,
      createdAt: '2024-01-15T10:00:00Z',
      finishedAt: '2024-01-15T11:30:00Z',
      difficulty: 'medium' as const,
      totalQuestions: 20
    },
    {
      id: '2',
      name: 'Quiz JavaScript Avançado',
      quizTitle: 'Advanced JavaScript',
      status: 'finished' as const,
      totalParticipants: 18,
      completedParticipants: 16,
      averageScore: 92.3,
      averageTime: 360,
      createdAt: '2024-01-14T14:00:00Z',
      finishedAt: '2024-01-14T15:00:00Z',
      difficulty: 'hard' as const,
      totalQuestions: 15
    },
    {
      id: '3',
      name: 'Fundamentos Web',
      quizTitle: 'HTML & CSS Basics',
      status: 'active' as const,
      totalParticipants: 12,
      completedParticipants: 8,
      averageScore: 76.8,
      averageTime: 300,
      createdAt: '2024-01-16T09:00:00Z',
      difficulty: 'easy' as const,
      totalQuestions: 25
    },
    {
      id: '4',
      name: 'TypeScript Challenge',
      quizTitle: 'TypeScript Advanced Types',
      status: 'pending' as const,
      totalParticipants: 0,
      completedParticipants: 0,
      averageScore: 0,
      averageTime: 0,
      createdAt: '2024-01-17T16:00:00Z',
      difficulty: 'hard' as const,
      totalQuestions: 18
    }
  ], []);

  const mockStats = useMemo(() => ({
    totalRooms: 4,
    totalParticipants: 55,
    averageScore: 85.2,
    completionRate: 89.1,
    topQuiz: {
      title: 'Advanced JavaScript',
      score: 92.3
    },
    recentActivity: 3
  }), []);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setReports(mockReports);
        setStats(mockStats);
      } catch (err) {
        setError('Erro ao carregar relatórios');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [mockReports, mockStats]);

  // Filter reports based on search and filters
  useEffect(() => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.quizTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Period filter
    if (selectedPeriod !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedPeriod) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(report => 
        new Date(report.createdAt) >= filterDate
      );
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, statusFilter, selectedPeriod]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'finished':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'active':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finished':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}min`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Relatórios</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando relatórios...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Relatórios</h1>
        </div>
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Erro ao Carregar Relatórios</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada do desempenho das suas competições
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Salas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRooms}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recentActivity} ativas recentemente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participantes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">
                Média de {Math.round(stats.totalParticipants / stats.totalRooms)} por sala
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nota Média</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Taxa de conclusão: {stats.completionRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Melhor Quiz</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topQuiz.score.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground truncate">
                {stats.topQuiz.title}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome da sala ou quiz..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="finished">Finalizadas</option>
                <option value="active">Ativas</option>
                <option value="pending">Pendentes</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Período</Label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="today">Hoje</option>
                <option value="week">Última Semana</option>
                <option value="month">Último Mês</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios das Competições</CardTitle>
          <CardDescription>
            {filteredReports.length} de {reports.length} competições
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(report.status)}
                          <h3 className="font-semibold text-lg">{report.name}</h3>
                        </div>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status === 'finished' && 'Finalizada'}
                          {report.status === 'active' && 'Ativa'}
                          {report.status === 'pending' && 'Pendente'}
                          {report.status === 'cancelled' && 'Cancelada'}
                        </Badge>
                        <Badge className={getDifficultyColor(report.difficulty)}>
                          {report.difficulty === 'easy' && 'Fácil'}
                          {report.difficulty === 'medium' && 'Médio'}
                          {report.difficulty === 'hard' && 'Difícil'}
                        </Badge>
                      </div>
                      
                      <p className="text-muted-foreground">{report.quizTitle}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {report.completedParticipants}/{report.totalParticipants} participantes
                          </span>
                        </div>
                        
                        {report.status !== 'pending' && (
                          <>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span>{report.averageScore.toFixed(1)}% média</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatTime(report.averageTime)} médio</span>
                            </div>
                          </>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{report.totalQuestions} questões</span>
                        </div>
                      </div>
                      
                      {report.status === 'finished' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Taxa de Conclusão</span>
                            <span>{((report.completedParticipants / report.totalParticipants) * 100).toFixed(1)}%</span>
                          </div>
                          <Progress 
                            value={(report.completedParticipants / report.totalParticipants) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          <span>Criada: {formatDate(report.createdAt)}</span>
                          {report.finishedAt && (
                            <span className="ml-4">Finalizada: {formatDate(report.finishedAt)}</span>
                          )}
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/reports/${report.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              
              {filteredReports.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum relatório encontrado</h3>
                  <p className="text-muted-foreground">
                    Tente ajustar os filtros ou criar uma nova competição.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 