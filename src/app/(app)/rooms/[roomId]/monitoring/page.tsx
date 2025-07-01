'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Clock, 
  BarChart3, 
  Pause, 
  Play, 
  Square, 
  SkipForward,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Settings,
  TrendingUp,
  Activity,
  Wifi,
  WifiOff,
  Trophy,
  Target,
  UserX
} from 'lucide-react';
import { toast } from 'sonner';
import { useEnhancedWebSocketContext } from '@/contexts/EnhancedWebSocketContext';
import { getRoomDetails } from '@/actions/competitionActions';

// Enhanced types for monitoring
interface Participant {
  id: string;
  name: string;
  email: string;
  score: number;
  currentQuestionIndex: number;
  status: 'waiting' | 'playing' | 'finished' | 'disconnected';
  timeSpent: number; // in seconds
  correctAnswers: number;
  totalAnswers: number;
  lastActivity: Date;
  averageResponseTime: number; // in seconds
  joinedAt: Date;
}

interface QuestionStats {
  questionIndex: number;
  questionText: string;
  totalAnswers: number;
  correctAnswers: number;
  averageResponseTime: number;
  optionStats: {
    optionText: string;
    count: number;
    percentage: number;
  }[];
}

interface MonitoringState {
  roomId: string;
  roomName: string;
  quizTitle: string;
  status: 'waiting' | 'in-progress' | 'paused' | 'finished';
  participants: Participant[];
  totalQuestions: number;
  currentQuestionIndex: number;
  timeElapsed: number; // in seconds
  timeRemaining?: number; // in seconds for timed quizzes
  questionStats: QuestionStats[];
  averageScore: number;
  completionRate: number;
}

export default function RoomMonitoringPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const roomId = params.roomId as string;
  
  // Use WebSocket context for real-time features
  const websocket = useEnhancedWebSocketContext();
  
  const [monitoringState, setMonitoringState] = useState<MonitoringState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Session authentication check
  useEffect(() => {
    if (sessionStatus === 'loading') {
      return; // Wait for session to load
    }
    
    if (sessionStatus === 'unauthenticated') {
      toast.error('Você precisa estar logado para acessar o monitoramento');
      router.push('/auth/signin');
      return;
    }
    
    if (!session?.user) {
      toast.error('Sessão inválida');
      router.push('/auth/signin');
      return;
    }
  }, [sessionStatus, session, router]);

  // Initialize monitoring data with proper access control
  useEffect(() => {
    const initializeMonitoring = async () => {
      // Wait for session to load
      if (sessionStatus === 'loading') {
        return;
      }

      // Check authentication
      if (sessionStatus === 'unauthenticated' || !session?.user) {
        setError('Você precisa estar logado para acessar o monitoramento');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[Monitoring] Initializing monitoring for room:', roomId);
        
        // Fetch room details to verify access and status
        const details = await getRoomDetails(roomId);
        if (!details) {
          setError('Sala não encontrada ou acesso negado');
          setIsLoading(false);
          return;
        }

        console.log('[Monitoring] Room details loaded:', details);

        // Verify user is the host
        const currentUserId = session?.user?.id || session?.user?.email;
        const isHost = details.createdBy === currentUserId || details.hostName === session?.user?.name;
        
        if (!isHost) {
          console.log('[Monitoring] User is not host, redirecting to lobby');
          toast.info('Apenas o host pode acessar o monitoramento');
          router.push(`/rooms/${roomId}/lobby`);
          return;
        }

        // Check room status - redirect to manage if still pending
        if (details.status === 'pending') {
          console.log('[Monitoring] Room is still pending, redirecting to manage');
          router.push(`/rooms/${roomId}/manage`);
          return;
        }

        console.log('[Monitoring] Access verified, initializing monitoring for room:', details.id);
        
        // Initialize monitoring state with room data
        const monitoringData: MonitoringState = {
          roomId: details.id,
          roomName: details.name,
          quizTitle: details.quizTitle,
          status: details.status === 'active' ? 'in-progress' : 
                  details.status === 'finished' ? 'finished' : 'waiting',
          participants: [],
          totalQuestions: 0,
          currentQuestionIndex: 0,
          timeElapsed: 0,
          timeRemaining: details.timePerQuiz,
          averageScore: 0,
          completionRate: 0,
          questionStats: []
        };

        setMonitoringState(monitoringData);
        setIsLoading(false);
        toast.success('Monitoramento inicializado com sucesso');

      } catch (err) {
        console.error('[Monitoring] Error initializing monitoring:', err);
        
        if (err instanceof Error) {
          if (err.message.includes('expired') || err.message.includes('invalid')) {
            setError('Sua sessão expirou. Por favor, faça login novamente.');
            setTimeout(() => {
              router.push('/auth/signin');
            }, 3000);
          } else {
            setError(`Erro ao carregar dados de monitoramento: ${err.message}`);
          }
        } else {
          setError('Erro desconhecido ao carregar monitoramento');
        }
        
        setIsLoading(false);
      }
    };

    if (roomId) {
      initializeMonitoring();
    }
  }, [roomId, sessionStatus, session, router]);

  // Set up WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!websocket.isConnected || !roomId) return;

    // Listen for participant events
    const unsubscribeParticipantJoined = websocket.addEventListener('participant_joined', (data: unknown) => {
      console.log('[WebSocket] Participant joined:', data);
      const eventData = data as { name?: string; username?: string; participant?: { name?: string; username?: string } };
      const participantName = eventData.name || eventData.username || eventData.participant?.name || eventData.participant?.username || 'Usuário Convidado';
      toast.success(`${participantName} entrou na sala`);
      setLastUpdate(new Date());
    });

    const unsubscribeParticipantLeft = websocket.addEventListener('participant_left', (data: unknown) => {
      console.log('[WebSocket] Participant left:', data);
      const eventData = data as { name?: string; username?: string; participant?: { name?: string; username?: string } };
      const participantName = eventData.name || eventData.username || eventData.participant?.name || eventData.participant?.username || 'Usuário Convidado';
      toast.info(`${participantName} saiu da sala`);
      setLastUpdate(new Date());
    });

    const unsubscribeParticipantAnswered = websocket.addEventListener('participant_answered', (data: unknown) => {
      console.log('[WebSocket] Participant answered:', data);
      const eventData = data as { 
        participantId?: string; 
        score?: number; 
        questionIndex?: number; 
        isCorrect?: boolean; 
        responseTime?: number 
      };
      setMonitoringState(prev => {
        if (!prev) return null;
        
        const updatedParticipants = prev.participants.map(p => {
          if (p.id === eventData.participantId) {
            return {
              ...p,
              score: eventData.score || p.score,
              currentQuestionIndex: eventData.questionIndex || p.currentQuestionIndex,
              totalAnswers: p.totalAnswers + 1,
              correctAnswers: eventData.isCorrect ? p.correctAnswers + 1 : p.correctAnswers,
              lastActivity: new Date(),
              timeSpent: p.timeSpent + (eventData.responseTime || 0)
            };
          }
          return p;
        });

        return {
          ...prev,
          participants: updatedParticipants
        };
      });
      setLastUpdate(new Date());
    });

    const unsubscribeQuizStarted = websocket.addEventListener('quiz_started', (data: unknown) => {
      console.log('[WebSocket] Quiz started:', data);
      setMonitoringState(prev => prev ? { ...prev, status: 'in-progress' } : null);
      setLastUpdate(new Date());
    });

    const unsubscribeQuizPaused = websocket.addEventListener('quiz_paused', (data: unknown) => {
      console.log('[WebSocket] Quiz paused:', data);
      setMonitoringState(prev => prev ? { ...prev, status: 'paused' } : null);
      setLastUpdate(new Date());
    });

    const unsubscribeQuizResumed = websocket.addEventListener('quiz_resumed', (data: unknown) => {
      console.log('[WebSocket] Quiz resumed:', data);
      setMonitoringState(prev => prev ? { ...prev, status: 'in-progress' } : null);
      setLastUpdate(new Date());
    });

    const unsubscribeQuizFinished = websocket.addEventListener('quiz_finished', (data: unknown) => {
      console.log('[WebSocket] Quiz finished:', data);
      setMonitoringState(prev => prev ? { ...prev, status: 'finished' } : null);
      setLastUpdate(new Date());
    });

    const unsubscribeQuestionChanged = websocket.addEventListener('question_changed', (data: unknown) => {
      console.log('[WebSocket] Question changed:', data);
      const eventData = data as { questionIndex?: number; timeLimit?: number };
      if (eventData.questionIndex !== undefined) {
      setMonitoringState(prev => prev ? { 
        ...prev, 
          currentQuestionIndex: eventData.questionIndex!,
          timeRemaining: eventData.timeLimit
      } : null);
      }
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribeParticipantJoined();
      unsubscribeParticipantLeft();
      unsubscribeParticipantAnswered();
      unsubscribeQuizStarted();
      unsubscribeQuizPaused();
      unsubscribeQuizResumed();
      unsubscribeQuizFinished();
      unsubscribeQuestionChanged();
    };
  }, [websocket.isConnected, roomId, websocket]);

  // Sync WebSocket participants with monitoring state
  useEffect(() => {
    if (websocket.participants && websocket.participants.length > 0) {
      console.log('[Monitoring] Syncing WebSocket participants:', websocket.participants);
      
      setMonitoringState(prev => {
        if (!prev) return null;
        
        // Convert WebSocket participants to monitoring participants
        const monitoringParticipants: Participant[] = websocket.participants.map(wsParticipant => ({
          id: wsParticipant.id,
          name: wsParticipant.name,
          email: wsParticipant.email,
          score: wsParticipant.score,
          currentQuestionIndex: wsParticipant.currentQuestionIndex,
          status: wsParticipant.status === 'connected' ? 'waiting' as const :
                  wsParticipant.status === 'disconnected' ? 'disconnected' as const :
                  wsParticipant.status === 'answering' ? 'playing' as const :
                  wsParticipant.status === 'finished' ? 'finished' as const : 'waiting' as const,
          timeSpent: 0, // Default values for monitoring-specific fields
          correctAnswers: 0,
          totalAnswers: 0,
          lastActivity: new Date(wsParticipant.lastActivity),
          averageResponseTime: 0,
          joinedAt: new Date(wsParticipant.lastActivity)
        }));
        
        console.log('[Monitoring] Converted participants:', monitoringParticipants);
        
        return {
          ...prev,
          participants: monitoringParticipants
        };
      });
    }
  }, [websocket.participants]);

  // Handle room control actions
  const handleRoomControl = async (action: 'pause' | 'resume' | 'finish' | 'next_question') => {
    if (!websocket.isConnected || !monitoringState) {
      toast.error('Conexão perdida. Não é possível controlar a sala.');
      return;
    }

    try {
      switch (action) {
        case 'pause':
          websocket.pauseQuiz({ roomId: monitoringState.roomId });
          break;
        case 'resume':
          websocket.resumeQuiz({ roomId: monitoringState.roomId });
          break;
        case 'finish':
          websocket.endQuiz({ roomId: monitoringState.roomId });
          break;
        case 'next_question':
          websocket.nextQuestion({ roomId: monitoringState.roomId });
          break;
      }
    } catch (error) {
      console.error('Error controlling room:', error);
      toast.error('Erro ao controlar a sala');
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'in-progress': return 'default';
      case 'paused': return 'secondary';
      case 'finished': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'waiting': return 'Aguardando';
      case 'in-progress': return 'Em Andamento';
      case 'paused': return 'Pausada';
      case 'finished': return 'Finalizada';
      default: return status;
    }
  };

  const getParticipantStatusIcon = (status: string) => {
    switch (status) {
      case 'playing': return <Activity className="h-3 w-3 text-green-500" />;
      case 'waiting': return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'finished': return <CheckCircle2 className="h-3 w-3 text-blue-500" />;
      case 'disconnected': return <WifiOff className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const getParticipantStatusLabel = (status: string): string => {
    switch (status) {
      case 'waiting': return 'Aguardando';
      case 'playing': return 'Jogando';
      case 'finished': return 'Finalizado';
      case 'disconnected': return 'Desconectado';
      default: return status;
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle kicking a participant
  const handleKickParticipant = (participantId: string, participantName: string) => {
    console.log('[Monitoring] ========== KICK PARTICIPANT START ==========');
    console.log('[Monitoring] Attempting to kick participant:', { participantId, participantName });
    console.log('[Monitoring] WebSocket connection status:', websocket.isConnected);
    console.log('[Monitoring] Current room ID:', roomId);
    
    if (!websocket.isConnected) {
      console.error('[Monitoring] Cannot kick participant - WebSocket not connected');
      toast.error('Não é possível remover participante - conexão perdida');
      return;
    }

    // Find the participant in WebSocket participants to ensure we have the correct ID
    const wsParticipant = websocket.participants.find(p => p.id === participantId || p.name === participantName);
    console.log('[Monitoring] Found WebSocket participant:', wsParticipant);
    console.log('[Monitoring] All WebSocket participants:', websocket.participants.map(p => ({ id: p.id, name: p.name })));
    
    if (!wsParticipant) {
      console.error('[Monitoring] Participant not found in WebSocket participants list');
      console.error('[Monitoring] Looking for ID:', participantId, 'or name:', participantName);
      toast.error('Participante não encontrado');
      return;
    }

    // Confirm before kicking
    if (confirm(`Tem certeza que deseja remover ${wsParticipant.name} da sala?`)) {
      console.log('[Monitoring] User confirmed kick, proceeding...');
      console.log('[Monitoring] Calling websocket.kickParticipant with:', {
        roomId,
        participantId: wsParticipant.id,
        reason: 'Removido pelo professor'
      });
      
      try {
        websocket.kickParticipant({
          roomId,
          participantId: wsParticipant.id,
          reason: 'Removido pelo professor'
        });
        console.log('[Monitoring] Kick request sent successfully');
        toast.success(`${wsParticipant.name} foi removido da sala`);
      } catch (error) {
        console.error('[Monitoring] Error calling kickParticipant:', error);
        toast.error('Erro ao remover participante');
      }
    } else {
      console.log('[Monitoring] User cancelled kick operation');
    }
    
    console.log('[Monitoring] ========== KICK PARTICIPANT END ==========');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando monitoramento...</p>
        </div>
      </div>
    );
  }

  if (error || !monitoringState) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="rounded-full bg-destructive/10 p-3 w-fit mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Erro</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Link href="/rooms">
                <Button>Voltar para Salas</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Monitoramento em Tempo Real
          </h1>
          <p className="text-muted-foreground mt-1">
            {monitoringState.roomName} - {monitoringState.quizTitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={websocket.isConnected ? 'default' : 'destructive'} className="flex items-center gap-1">
            {websocket.isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {websocket.isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
          <Link href={`/rooms/${roomId}/manage`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar
            </Button>
          </Link>
        </div>
      </div>

      {/* Connection Status Banner */}
      {!websocket.isConnected && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span>Erro na conexão em tempo real: {websocket.lastError ? String(websocket.lastError) : 'Desconhecido'}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status and Controls */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participantes</p>
                <p className="text-xl font-bold">{monitoringState.participants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 p-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontuação Média</p>
                <p className="text-xl font-bold">{monitoringState.averageScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 p-2">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                <p className="text-xl font-bold">{monitoringState.completionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-100 p-2">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Decorrido</p>
                <p className="text-xl font-bold">{formatTime(monitoringState.timeElapsed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Room Status and Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                Status da Competição
                <Badge variant={getStatusBadgeVariant(monitoringState.status)}>
                  {getStatusLabel(monitoringState.status)}
                </Badge>
              </CardTitle>
              <CardDescription>
                Questão {monitoringState.currentQuestionIndex} de {monitoringState.totalQuestions}
                {monitoringState.timeRemaining && ` • Tempo restante: ${formatTime(monitoringState.timeRemaining)}`}
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {monitoringState.status === 'in-progress' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRoomControl('pause')}
                  disabled={!websocket.isConnected}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pausar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRoomControl('next_question')}
                  disabled={monitoringState.currentQuestionIndex >= monitoringState.totalQuestions || !websocket.isConnected}
                >
                  <SkipForward className="h-4 w-4 mr-2" />
                  Próxima Questão
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRoomControl('finish')}
                  disabled={!websocket.isConnected}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              </>
            )}
            
            {monitoringState.status === 'paused' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleRoomControl('resume')}
                disabled={!websocket.isConnected}
              >
                <Play className="h-4 w-4 mr-2" />
                Retomar
              </Button>
            )}

            {monitoringState.status === 'finished' && (
              <Link href={`/rooms/${roomId}/results`}>
                <Button>
                  <Trophy className="h-4 w-4 mr-2" />
                  Ver Resultados
                </Button>
              </Link>
            )}

            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ranking e Progresso dos Participantes
          </CardTitle>
          <CardDescription>
            Acompanhe o desempenho individual em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Progresso</TableHead>
                <TableHead className="text-center">Desempenho</TableHead>
                <TableHead className="text-center">Tempo</TableHead>
                <TableHead className="text-right">Pontuação</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monitoringState.participants.map((participant, index) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {index + 1}
                      {index === 0 && <Trophy className="h-3 w-3 text-yellow-500" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-xs text-muted-foreground">{participant.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getParticipantStatusIcon(participant.status)}
                      <span className="text-xs">{getParticipantStatusLabel(participant.status)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs">{participant.currentQuestionIndex}/{monitoringState.totalQuestions}</span>
                      <Progress 
                        value={(participant.currentQuestionIndex / monitoringState.totalQuestions) * 100} 
                        className="w-16 h-2" 
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs">
                      <div>{participant.correctAnswers}/{participant.totalAnswers}</div>
                      <div className="text-muted-foreground">
                        {participant.totalAnswers > 0 ? `${Math.round((participant.correctAnswers / participant.totalAnswers) * 100)}%` : '0%'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs">
                      <div>{formatTime(participant.timeSpent)}</div>
                      <div className="text-muted-foreground">
                        ~{participant.averageResponseTime.toFixed(1)}s/resp
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-bold text-lg">{participant.score}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleKickParticipant(participant.id, participant.name)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 