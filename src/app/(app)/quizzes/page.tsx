'use client';

import React, { useState, useEffect, useCallback, useMemo, useTransition, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit,
  Play,
  BookOpen,
  Clock,
  AlertCircle,
  RefreshCw,
  SortAsc,
  SortDesc,
  FileText,
  TrendingUp,
  Filter,
  X,
  MoreVertical,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
// Import quiz actions for real API calls
import { getQuizzesByUserId, deleteQuiz } from '@/actions/quiz.actions';

// Enhanced TypeScript interfaces with strict typing
interface QuizCreator {
  readonly id: string;
  readonly name: string;
  readonly email?: string;
}

interface QuizStats {
  readonly averageScore?: number;
  readonly timesUsed?: number;
  readonly lastUsed?: string;
  readonly completionRate?: number;
}

interface Quiz {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly questionCount: number;
  readonly difficulty: 'easy' | 'medium' | 'hard';
  readonly timeLimit?: number;
  readonly tags: readonly string[];
  readonly isPublic: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: 'draft' | 'published' | 'archived';
  readonly createdBy: QuizCreator;
  readonly stats?: QuizStats;
}

interface QuizFilters {
  readonly search: string;
  readonly difficulty: string;
  readonly status: string;
  readonly sortBy: 'title' | 'createdAt' | 'updatedAt' | 'difficulty' | 'usage' | 'popularity';
  readonly sortOrder: 'asc' | 'desc';
  readonly tags: readonly string[];
}

interface QuizOperation {
  readonly id: string;
  readonly type: 'edit' | 'duplicate' | 'delete' | 'archive' | 'publish';
  readonly title: string;
}

// Custom hooks for better separation of concerns
const useQuizFiltering = (quizzes: Quiz[], filters: QuizFilters) => {
  const deferredFilters = useDeferredValue(filters);
  
  return useMemo(() => {
    let filtered = [...quizzes];

    // Search filter with improved performance
    if (deferredFilters.search) {
      const searchLower = deferredFilters.search.toLowerCase();
      filtered = filtered.filter(quiz => {
        const searchableText = `${quiz.title} ${quiz.description} ${quiz.tags.join(' ')}`.toLowerCase();
        return searchableText.includes(searchLower);
      });
    }

    // Difficulty filter
    if (deferredFilters.difficulty !== 'all') {
      filtered = filtered.filter(quiz => quiz.difficulty === deferredFilters.difficulty);
    }

    // Status filter
    if (deferredFilters.status !== 'all') {
      filtered = filtered.filter(quiz => quiz.status === deferredFilters.status);
    }

    // Tags filter
    if (deferredFilters.tags.length > 0) {
      filtered = filtered.filter(quiz => 
        deferredFilters.tags.some(tag => quiz.tags.includes(tag))
      );
    }

    // Enhanced sorting with more options
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;
      
      switch (deferredFilters.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
          break;
        case 'difficulty':
          const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 } as const;
          aValue = difficultyOrder[a.difficulty];
          bValue = difficultyOrder[b.difficulty];
          break;
        case 'usage':
          aValue = a.stats?.timesUsed || 0;
          bValue = b.stats?.timesUsed || 0;
          break;
        case 'popularity':
          // Popularity based on usage and average score
          aValue = (a.stats?.timesUsed || 0) * (a.stats?.averageScore || 0) / 100;
          bValue = (b.stats?.timesUsed || 0) * (b.stats?.averageScore || 0) / 100;
          break;
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
      }

      if (aValue < bValue) return deferredFilters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return deferredFilters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [quizzes, deferredFilters]);
};

const useQuizOperations = () => {
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  
  const executeOperation = useCallback(async (
    operation: QuizOperation,
    handler: () => Promise<void>
  ) => {
    setPendingOperations(prev => new Set(prev).add(operation.id));
    
    try {
      await handler();
      toast.success(`${operation.title} realizada com sucesso!`);
    } catch (error) {
      console.error(`Error in ${operation.type}:`, error);
      toast.error(`Erro ao ${operation.title.toLowerCase()}. Tente novamente.`);
    } finally {
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operation.id);
        return newSet;
      });
    }
  }, []);

  return { pendingOperations, executeOperation };
};

// Enhanced error boundary component
interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4 max-w-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Erro ao Carregar Quizzes</h3>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Button onClick={onRetry} variant="default">
        <RefreshCw className="mr-2 h-4 w-4" />
        Tentar Novamente
      </Button>
    </div>
  </div>
);

export default function QuizzesPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isPending, startTransition] = useTransition();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<QuizFilters>({
    search: '',
    difficulty: 'all',
    status: 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    tags: []
  });

  const { pendingOperations, executeOperation } = useQuizOperations();
  const filteredQuizzes = useQuizFiltering(quizzes, filters);

  // Session check with proper loading state
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated') {
      console.log('[Quizzes] User not authenticated, redirecting to login');
      router.replace('/login');
      return;
    }

    if (!session?.user) {
      console.log('[Quizzes] No user in session, redirecting to login');
      router.replace('/login');
      return;
    }

    console.log('[Quizzes] User authenticated:', session.user.email);
  }, [session, sessionStatus, router]);

  // Enhanced data loading with retry logic and error handling
  const loadQuizzes = useCallback(async (attempt = 0) => {
    if (!session?.user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('[Quizzes] Loading real quizzes from API, attempt:', attempt + 1);
      
      // Call real API to get user's quizzes
      const userQuizzes = await getQuizzesByUserId(session.user.id);
      
      console.log('[Quizzes] API Response:', userQuizzes);
      
      // Transform API data to match frontend interface
      const transformedQuizzes: Quiz[] = userQuizzes.map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || '',
        questionCount: quiz.questions?.length || 0,
        difficulty: (quiz.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        timeLimit: quiz.timeLimit || 30,
        tags: [], // API quizzes don't have tags yet, set as empty array
        isPublic: true, // Default to public for now
        createdAt: new Date().toISOString(), // Default to current date since API doesn't have this
        updatedAt: new Date().toISOString(), // Default to current date since API doesn't have this
        status: (quiz.status as 'draft' | 'published' | 'archived') || 'draft',
        createdBy: {
          id: session.user?.id || '',
          name: session.user?.name || 'Unknown User'
        },
        stats: {
          timesUsed: 0,
          averageScore: 0,
          completionRate: 0
        }
      }));
      
      setQuizzes(transformedQuizzes);
      setRetryCount(0);
      console.log('[Quizzes] Successfully loaded', transformedQuizzes.length, 'real quizzes');
      
    } catch (err) {
      console.error('[Quizzes] Error loading quizzes from API:', err);
      const error = err instanceof Error ? err : new Error('Failed to load quizzes from server');
      setError(error);
      setRetryCount(attempt + 1);
      
      // Show user-friendly error message
      if (attempt === 0) {
        toast.error('Erro ao carregar quizzes. Tentando novamente...');
      } else {
        toast.error('Falha ao carregar quizzes. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  // Get unique tags for filtering
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    quizzes.forEach(quiz => quiz.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [quizzes]);

  // Initial load
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user) {
      loadQuizzes();
    }
  }, [sessionStatus, session?.user, loadQuizzes]);

  // Enhanced filter update with transitions
  const updateFilters = useCallback((updates: Partial<QuizFilters>) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, ...updates }));
    });
  }, []);

  // Quiz actions with enhanced error handling
  const handleEditQuiz = useCallback((quizId: string) => {
    console.log('[Quizzes] Editing quiz:', quizId);
    router.push(`/quizzes/${quizId}/editar`);
  }, [router]);

  const handleUseQuiz = useCallback((quizId: string) => {
    console.log('[Quizzes] Using quiz for competition:', quizId);
    router.push(`/rooms/create?quizId=${quizId}`);
  }, [router]);

  // Bulk operations
  const handleBulkDelete = useCallback(async () => {
    if (selectedQuizzes.size === 0) return;
    
    if (!confirm(`Tem certeza que deseja excluir ${selectedQuizzes.size} quiz(zes) selecionado(s)?`)) {
      return;
    }

    await executeOperation(
      { id: 'bulk-delete', type: 'delete', title: 'Exclusão em lote' },
      async () => {
        // Delete each quiz using real API calls
        const deletePromises = Array.from(selectedQuizzes).map(async (quizId) => {
          try {
            await deleteQuiz(quizId);
            console.log('[Quizzes] Successfully deleted quiz:', quizId);
          } catch (error) {
            console.error('[Quizzes] Failed to delete quiz:', quizId, error);
            throw error;
          }
        });

        await Promise.all(deletePromises);
        
        // Remove deleted quizzes from state
        setQuizzes(prev => prev.filter(q => !selectedQuizzes.has(q.id)));
        setSelectedQuizzes(new Set());
        
        toast.success(`${selectedQuizzes.size} quiz(zes) excluído(s) com sucesso!`);
      }
    );
  }, [selectedQuizzes, executeOperation]);

  // Utility functions
  const getDifficultyColor = useCallback((difficulty: string) => {
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
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'archived':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  const formatStats = useCallback((stats?: QuizStats) => {
    if (!stats) return 'Sem dados';
    
    const parts: string[] = [];
    if (stats.timesUsed) parts.push(`${stats.timesUsed} usos`);
    if (stats.averageScore) parts.push(`${stats.averageScore.toFixed(1)}% média`);
    if (stats.completionRate) parts.push(`${stats.completionRate.toFixed(1)}% conclusão`);
    
    return parts.length > 0 ? parts.join(' • ') : 'Sem dados';
  }, []);

  // Retry handler
  const handleRetry = useCallback(() => {
    console.log('[Quizzes] Retrying to load quizzes...');
    loadQuizzes(retryCount);
  }, [loadQuizzes, retryCount]);

  // Loading state with skeleton
  if (sessionStatus === 'loading' || (loading && retryCount === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && retryCount > 0) {
    return <ErrorFallback error={error} onRetry={handleRetry} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Meus Quizzes</h1>
          <p className="text-muted-foreground">
            Gerencie seus quizzes e crie novas competições
          </p>
        </div>
        <div className="flex gap-2">
          {selectedQuizzes.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleBulkDelete}
              disabled={pendingOperations.has('bulk-delete')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Selecionados ({selectedQuizzes.size})
            </Button>
          )}
          <Button onClick={() => router.push('/quizzes/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Quiz
          </Button>
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
              placeholder="Buscar por título, descrição ou tags..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value as QuizFilters['sortBy'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt">Última atualização</SelectItem>
                  <SelectItem value="createdAt">Data de criação</SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                  <SelectItem value="difficulty">Dificuldade</SelectItem>
                  <SelectItem value="usage">Uso</SelectItem>
                  <SelectItem value="popularity">Popularidade</SelectItem>
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
                {filters.sortOrder === 'asc' ? (
                  <>
                    <SortAsc className="mr-2 h-4 w-4" />
                    Crescente
                  </>
                ) : (
                  <>
                    <SortDesc className="mr-2 h-4 w-4" />
                    Decrescente
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const newTags = filters.tags.includes(tag)
                        ? filters.tags.filter(t => t !== tag)
                        : [...filters.tags, tag];
                      updateFilters({ tags: newTags });
                    }}
                  >
                    {tag}
                    {filters.tags.includes(tag) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(filters.search || filters.difficulty !== 'all' || filters.status !== 'all' || filters.tags.length > 0) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Busca: {filters.search}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilters({ search: '' })} 
                  />
                </Badge>
              )}
              {filters.difficulty !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {filters.difficulty}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilters({ difficulty: 'all' })} 
                  />
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {filters.status}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilters({ status: 'all' })} 
                  />
                </Badge>
              )}
              {filters.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => updateFilters({ tags: filters.tags.filter(t => t !== tag) })} 
                  />
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateFilters({
                  search: '',
                  difficulty: 'all',
                  status: 'all',
                  tags: []
                })}
              >
                Limpar todos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isPending ? 'Filtrando...' : `${filteredQuizzes.length} de ${quizzes.length} quizzes`}
        </span>
        {filteredQuizzes.length > 0 && (
          <span>
            Última atualização: {formatDate(Math.max(...filteredQuizzes.map(q => new Date(q.updatedAt).getTime())).toString())}
          </span>
        )}
      </div>

      {/* Quiz Grid */}
      {filteredQuizzes.length === 0 && !loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {quizzes.length === 0 ? 'Nenhum quiz encontrado' : 'Nenhum quiz corresponde aos filtros'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {quizzes.length === 0 
                  ? 'Comece criando seu primeiro quiz para fazer competições incríveis!'
                  : 'Tente ajustar os filtros para encontrar o que procura.'
                }
              </p>
              {quizzes.length === 0 ? (
                <Button onClick={() => router.push('/quizzes/novo')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Quiz
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => updateFilters({
                    search: '',
                    difficulty: 'all',
                    status: 'all',
                    tags: []
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
          isPending && "opacity-50"
        )}>
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-all duration-200 group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedQuizzes.has(quiz.id)}
                      onChange={(e) => {
                        setSelectedQuizzes(prev => {
                          const newSet = new Set(prev);
                          if (e.target.checked) {
                            newSet.add(quiz.id);
                          } else {
                            newSet.delete(quiz.id);
                          }
                          return newSet;
                        });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {quiz.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {quiz.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className={getDifficultyColor(quiz.difficulty)}>
                    {quiz.difficulty}
                  </Badge>
                  <Badge className={getStatusColor(quiz.status)}>
                    {quiz.status}
                  </Badge>
                  {quiz.isPublic && (
                    <Badge variant="outline">
                      <Share2 className="mr-1 h-3 w-3" />
                      Público
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{quiz.questionCount} questões</span>
                  </div>
                  {quiz.timeLimit && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{quiz.timeLimit}min</span>
                    </div>
                  )}
                </div>

                {/* Performance Stats */}
                {quiz.stats && (quiz.stats.timesUsed || quiz.stats.averageScore) && (
                  <div className="text-sm text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">Estatísticas</span>
                    </div>
                    <p>{formatStats(quiz.stats)}</p>
                  </div>
                )}

                {/* Tags */}
                {quiz.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {quiz.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {quiz.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{quiz.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    size="sm" 
                    onClick={() => handleEditQuiz(quiz.id)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  
                  {quiz.status === 'published' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleUseQuiz(quiz.id)}
                      className="flex-1"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Usar
                    </Button>
                  )}

                  {/* More actions dropdown */}
                  <Button size="sm" variant="outline" className="px-2">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
