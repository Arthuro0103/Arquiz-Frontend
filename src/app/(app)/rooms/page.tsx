'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Users, Clock, Trophy, AlertCircle, RefreshCw, Settings, LogOut, Filter, Search, MoreVertical, Copy, ExternalLink, Share, Zap, Play } from 'lucide-react';
import Link from 'next/link';
import { getCompetitionRooms, testBackendConnectivity } from '@/actions/competitionActions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

// Enhanced TypeScript interfaces with strict typing
interface CompetitionRoom {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly quizId: string;
  readonly quizTitle: string;
  readonly quizDifficulty: string;
  readonly shuffleQuestions: boolean;
  readonly timeMode: 'per_question' | 'per_quiz';
  readonly timePerQuestion?: number;
  readonly timePerQuiz?: number;
  readonly showAnswersWhen: 'immediately' | 'end_of_quiz';
  readonly roomType: 'public' | 'private';
  readonly accessCode: string;
  readonly shareableLink?: string;
  readonly status: 'pending' | 'active' | 'finished';
  readonly createdBy: string;
  readonly hostName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly maxParticipants?: number;
  readonly participantCount: number;
  readonly isActive: boolean;
  readonly averageScore?: number;
  readonly completionRate?: number;
}

interface DiagnosticDetails {
  readonly serverReachable?: boolean;
  readonly authStatus?: 'valid' | 'expired' | 'missing' | 'unknown';
  readonly tokenInfo?: {
    readonly expiredAt?: string;
    readonly currentTime?: string;
  };
  readonly error?: string;
}

interface DiagnosticResult {
  readonly success: boolean;
  readonly message: string;
  readonly details?: DiagnosticDetails;
}

interface RoomFilters {
  readonly search: string;
  readonly status: string;
  readonly difficulty: string;
  readonly sortBy: 'name' | 'createdAt' | 'status' | 'participants' | 'difficulty';
  readonly sortOrder: 'asc' | 'desc';
}

// Custom hooks for better separation of concerns
const useRoomFiltering = (rooms: CompetitionRoom[], filters: RoomFilters) => {
  return useMemo(() => {
    let filtered = [...rooms];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchLower) ||
        room.description?.toLowerCase().includes(searchLower) ||
        room.quizTitle.toLowerCase().includes(searchLower) ||
        room.hostName.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(room => room.status === filters.status);
    }

    // Difficulty filter
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(room => room.quizDifficulty === filters.difficulty);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'status':
          const statusOrder = { 'active': 1, 'pending': 2, 'finished': 3 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        case 'participants':
          aValue = a.participantCount;
          bValue = b.participantCount;
          break;
        case 'difficulty':
          const difficultyOrder: Record<string, number> = { 'easy': 1, 'medium': 2, 'hard': 3 };
          aValue = difficultyOrder[a.quizDifficulty] || 4;
          bValue = difficultyOrder[b.quizDifficulty] || 4;
          break;
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [rooms, filters]);
};

// Enhanced error boundary component
interface ErrorFallbackProps {
  error: string;
  onRetry: () => void;
  showDiagnostic?: boolean;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry, showDiagnostic = false }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold">Salas de Competição</h1>
      <Button disabled>
        <Plus className="mr-2 h-4 w-4" />
        Criar Nova Sala
      </Button>
    </div>
    
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Erro ao Carregar Salas</h3>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
          {showDiagnostic && <BackendDiagnosticButton />}
        </div>
      </div>
    </div>
  </div>
);

// Enhanced loading skeleton
const RoomsPageSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2 mt-4">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Enhanced backend diagnostic component
function BackendDiagnosticButton() {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = useCallback(async () => {
    setIsRunning(true);
    setDiagnosticResult(null);
    
    try {
      console.log('[Diagnostic] Running backend connectivity test...');
      const result = await testBackendConnectivity();
      console.log('[Diagnostic] Result:', result);
      setDiagnosticResult(result);
      
      if (result.success) {
        toast.success('Conectividade OK! O backend está funcionando corretamente.');
      } else {
        toast.error('Problema de conectividade detectado.');
      }
    } catch (error) {
      console.error('[Diagnostic] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setDiagnosticResult({
        success: false,
        message: `Erro ao executar diagnóstico: ${errorMessage}`,
        details: { error: errorMessage }
      });
      toast.error('Falha no diagnóstico de conectividade.');
    } finally {
      setIsRunning(false);
    }
  }, []);

  const handleReLogin = useCallback(async () => {
    console.log('[Diagnostic] User requested re-login');
    toast.info('Redirecionando para login...');
    await signOut({ callbackUrl: '/login' });
  }, []);

  return (
    <div className="space-y-4">
      <Button 
        onClick={runDiagnostic} 
        disabled={isRunning}
        variant="outline"
        size="sm"
      >
        {isRunning ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Testando...
          </>
        ) : (
          <>
            <Settings className="mr-2 h-4 w-4" />
            Diagnóstico
          </>
        )}
      </Button>

      {diagnosticResult && (
        <Alert variant={diagnosticResult.success ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{diagnosticResult.message}</p>
              
              {diagnosticResult.details && (
                <div className="text-sm space-y-1">
                  {diagnosticResult.details.serverReachable !== undefined && (
                    <p>Servidor: {diagnosticResult.details.serverReachable ? '✅ Acessível' : '❌ Inacessível'}</p>
                  )}
                  
                  {diagnosticResult.details.authStatus && (
                    <p>Autenticação: {
                      diagnosticResult.details.authStatus === 'valid' ? '✅ Válida' :
                      diagnosticResult.details.authStatus === 'expired' ? '⚠️ Expirada' :
                      diagnosticResult.details.authStatus === 'missing' ? '❌ Ausente' : '❓ Desconhecida'
                    }</p>
                  )}
                  
                  {diagnosticResult.details.tokenInfo?.expiredAt && (
                    (() => {
                      try {
                        const details = diagnosticResult.details!;
                        if (details.tokenInfo?.expiredAt && details.tokenInfo?.currentTime) {
                          const expiredAt = new Date(details.tokenInfo.expiredAt);
                          const currentTime = new Date(details.tokenInfo.currentTime);
                          const diffMinutes = Math.floor((expiredAt.getTime() - currentTime.getTime()) / (1000 * 60));
                          
                          return (
                            <p>Token expira em: {diffMinutes > 0 ? `${diffMinutes} minutos` : 'Expirado'}</p>
                          );
                        }
                        return null;
                      } catch {
                        return <p>Token: Informação indisponível</p>;
                      }
                    })()
                  )}
                </div>
              )}
              
              {!diagnosticResult.success && diagnosticResult.details?.authStatus === 'expired' && (
                <Button 
                  onClick={handleReLogin}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Fazer Login Novamente
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function CompetitionRoomsListPage() {
  const { data: session } = useSession();
  
  const [rooms, setRooms] = useState<CompetitionRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const [filters, setFilters] = useState<RoomFilters>({
    search: '',
    status: 'all',
    difficulty: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const filteredRooms = useRoomFiltering(rooms, filters);
  const isTeacher = session?.user?.role === 'teacher';
  
  // Enhanced data loading with retry logic
  const loadRooms = useCallback(async (attempt = 0) => {
    try {
      console.log('[Rooms Page] Loading rooms, attempt:', attempt + 1);
      setLoading(true);
      setError(null);
      
      const roomsData = await getCompetitionRooms();
      console.log('[Rooms Page] Rooms loaded successfully:', roomsData.length);
      
      setRooms(roomsData);
      setRetryCount(0);
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error('[Rooms Page] Error loading rooms:', errorObj);
      setRetryCount(attempt + 1);
      
      // Enhanced error handling for different error types
      if (errorObj.message === 'SESSION_EXPIRED') {
        setError('Sua sessão expirou. É necessário fazer login novamente.');
        setShowDiagnostic(true);
      } else if (errorObj.message === 'BACKEND_ERROR') {
        setError('Erro interno do servidor. Tente novamente em alguns minutos.');
        setShowDiagnostic(true);
      } else if (errorObj.message === 'NETWORK_ERROR') {
        setError('Erro de conectividade. Verifique sua conexão com a internet.');
        setShowDiagnostic(true);
      } else {
        setError('Falha ao carregar salas de competição. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, []);

  // Enhanced filter update with transitions
  const updateFilters = useCallback((updates: Partial<RoomFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  // Room utility functions
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
      case 'active': return 'default';
          case 'pending': return 'secondary';
          case 'finished': return 'outline';
          default: return 'secondary';
      }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'pending': return 'Aguardando';
      case 'finished': return 'Finalizada';
      default: return status;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
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

  // Room actions
  const copyAccessCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Código de acesso copiado!');
    } catch (error) {
      console.error('Failed to copy access code:', error);
      toast.error('Falha ao copiar código de acesso');
    }
  }, []);

  const copyShareableLink = useCallback(async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link compartilhável copiado!');
    } catch (error) {
      console.error('Failed to copy shareable link:', error);
      toast.error('Falha ao copiar link');
    }
  }, []);

  // Retry handler
  const handleRetry = useCallback(() => {
    loadRooms(retryCount);
  }, [retryCount]);

  // Loading state
  if (loading && retryCount === 0) {
    return <RoomsPageSkeleton />;
  }

  // Error state
  if (error) {
    return <ErrorFallback error={error} onRetry={handleRetry} showDiagnostic={showDiagnostic} />;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-blue-500" />
            Salas de Competição
          </h1>
          <p className="text-muted-foreground">Gerencie suas salas de quiz competitivo em tempo real</p>
        </div>
        <div className="flex gap-2">
          <BackendDiagnosticButton />
        {isTeacher && (
        <Link href="/rooms/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Sala
            </Button>
        </Link>
        )}
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição, quiz ou host..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Difficulty Filter */}
            <div className="space-y-2">
              <Label>Dificuldade</Label>
              <Select value={filters.difficulty} onValueChange={(value) => updateFilters({ difficulty: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="easy">Fácil</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="hard">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value as RoomFilters['sortBy'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Data de criação</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="participants">Participantes</SelectItem>
                  <SelectItem value="difficulty">Dificuldade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              >
                {filters.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredRooms.length} de {rooms.length} salas
        </span>
        {filteredRooms.length > 0 && (
          <span>
            Última atualização: {formatDate(Math.max(...filteredRooms.map(r => new Date(r.updatedAt).getTime())).toString())}
          </span>
        )}
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 && !loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {rooms.length === 0 ? 'Nenhuma sala encontrada' : 'Nenhuma sala corresponde aos filtros'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {rooms.length === 0 
                  ? 'Comece criando sua primeira sala de competição!'
                  : 'Tente ajustar os filtros para encontrar o que procura.'
                }
              </p>
              {rooms.length === 0 && isTeacher ? (
                <Link href="/rooms/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Sala
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => updateFilters({
                    search: '',
                    status: 'all',
                    difficulty: 'all'
                  })}
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          "grid gap-6 transition-opacity duration-200",
          "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          loading && "opacity-50"
        )}>
          {filteredRooms.map((room) => (
            <Card key={room.id} className="hover:shadow-lg transition-all duration-200 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {room.name}
                    </CardTitle>
                        {room.description && (
                      <CardDescription className="line-clamp-2">
                        {room.description}
                      </CardDescription>
                        )}
                      </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Only show copy code option for public rooms OR if user is a teacher */}
                      {(room.roomType === 'public' || isTeacher) && (
                        <DropdownMenuItem onClick={() => copyAccessCode(room.accessCode)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar Código
                        </DropdownMenuItem>
                      )}
                      {room.shareableLink && (
                        <DropdownMenuItem onClick={() => copyShareableLink(room.shareableLink!)}>
                          <Share className="mr-2 h-4 w-4" />
                          Copiar Link
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={
                          room.status === 'active' ? (
                            isTeacher ? `/rooms/${room.id}/monitoring` : `/rooms/${room.id}/lobby`
                          ) :
                          room.status === 'pending' ? (
                            isTeacher ? `/rooms/${room.id}/manage` : `/rooms/${room.id}/lobby`
                          ) :
                          `/rooms/${room.id}/results`
                        }>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {isTeacher ? 'Ver Detalhes' : 'Entrar'}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                      </div>

                <div className="flex flex-wrap gap-2">
                        <Badge variant={getStatusVariant(room.status)}>
                          {getStatusLabel(room.status)}
                        </Badge>
                  <Badge className={getDifficultyColor(room.quizDifficulty)}>
                    {room.quizDifficulty}
                  </Badge>
                  <Badge variant="outline">
                    {room.roomType === 'public' ? 'Público' : 'Privado'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Quiz Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{room.quizTitle}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Host: {room.hostName}
                  </div>
                      </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{room.participantCount} participantes</span>
                  </div>
                  {room.timePerQuestion && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{room.timePerQuestion}s/questão</span>
                    </div>
                        )}
                      </div>

                {/* Performance Stats */}
                {(room.averageScore || room.completionRate) && (
                  <div className="text-sm text-muted-foreground border-t pt-3">
                    {room.averageScore && (
                      <p>Pontuação média: {room.averageScore.toFixed(1)}%</p>
                    )}
                    {room.completionRate && (
                      <p>Taxa de conclusão: {room.completionRate.toFixed(1)}%</p>
                    )}
                        </div>
                )}

                {/* Access Info */}
                <div className="space-y-2 border-t pt-3">
                  {/* Only show access code for public rooms OR if user is a teacher */}
                  {(room.roomType === 'public' || isTeacher) && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Código:</span>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {room.accessCode}
                      </code>
                    </div>
                  )}
                  {/* For private rooms, show a notice to students that they need the code from teacher */}
                  {room.roomType === 'private' && !isTeacher && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Acesso:</span>
                      <span className="text-xs text-muted-foreground italic">
                        🔒 Código privado &#40;solicite ao professor&#41;
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Criado em: {formatDate(room.createdAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {room.status === 'active' ? (
                    // Active rooms: Teachers monitor, Students join the live quiz
                    isTeacher ? (
                      <Link href={`/rooms/${room.id}/monitoring`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Play className="mr-2 h-4 w-4" />
                          Monitorar
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/rooms/${room.id}/lobby`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Play className="mr-2 h-4 w-4" />
                          Entrar no Quiz
                        </Button>
                      </Link>
                    )
                  ) : room.status === 'pending' ? (
                    // Pending rooms: Teachers manage, Students join lobby
                    isTeacher ? (
                      <Link href={`/rooms/${room.id}/manage`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          Gerenciar
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/rooms/${room.id}/lobby`} className="flex-1">
                        <Button size="sm" className="w-full">
                          <Users className="mr-2 h-4 w-4" />
                          Entrar na Sala
                        </Button>
                      </Link>
                    )
                  ) : (
                    // Finished rooms: Everyone can see results
                    <Link href={`/rooms/${room.id}/results`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Trophy className="mr-2 h-4 w-4" />
                        Resultados
                      </Button>
                    </Link>
                  )}
                  
                  {/* Only show copy button for public rooms OR if user is a teacher */}
                  {(room.roomType === 'public' || isTeacher) && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyAccessCode(room.accessCode)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
        </CardContent>
      </Card>
          ))}
        </div>
      )}
    </div>
  );
} 