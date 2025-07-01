'use client'

import React, { useState, FormEvent, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { getRoomByAccessCode } from '@/actions/competitionActions';
import { toast } from 'sonner';
import { WebSocketStatus } from '@/components/WebSocketStatus';
import { 
  Wifi, 
  Users, 
  Clock, 
  Play, 
  CheckCircle,
  RefreshCw,
  UserCheck,
  Lock,
  Unlock,
  AlertTriangle,
  Timer,
  Trophy,
  Target,
  Eye,
  EyeOff,
  Settings,
  Home,
  Search,
  Loader2,
  AlertCircle,
  XCircle,
  Star,
  Crown,
  GraduationCap
} from 'lucide-react';

interface RoomData {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'active' | 'finished';
  participantCount?: number;
  maxParticipants?: number;
  timeMode?: 'per_question' | 'per_quiz';
  quizTitle: string;
  roomType: 'public' | 'private';
  accessCode: string;
  quizDifficulty?: 'easy' | 'medium' | 'hard';
  estimatedDuration?: number;
  category?: string;
  tags?: string[];
  hostName?: string;
  createdAt?: string;
}

interface JoinStep {
  id: 'input' | 'validating' | 'connecting' | 'joining' | 'success';
  title: string;
  description: string;
  icon: React.ReactNode;
}

function JoinRoomForm() {
  const [roomCode, setRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [joinProgress, setJoinProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'input' | 'validating' | 'connecting' | 'joining' | 'success'>('input');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<Date | null>(null);
  const [validationHistory, setValidationHistory] = useState<Array<{
    code: string;
    timestamp: Date;
    success: boolean;
    error?: string;
  }>>([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const websocket = useWebSocket();

  // Join steps configuration
  const joinSteps: JoinStep[] = [
    {
      id: 'input',
      title: 'Inserir Código',
      description: 'Digite o código da sala',
      icon: <Search className="h-5 w-5" />
    },
    {
      id: 'validating',
      title: 'Validando',
      description: 'Verificando se a sala existe',
      icon: <Loader2 className="h-5 w-5 animate-spin" />
    },
    {
      id: 'connecting',
      title: 'Conectando',
      description: 'Estabelecendo conexão WebSocket',
      icon: <Wifi className="h-5 w-5" />
    },
    {
      id: 'joining',
      title: 'Entrando',
      description: 'Ingressando na sala',
      icon: <UserCheck className="h-5 w-5" />
    },
    {
      id: 'success',
      title: 'Sucesso',
      description: 'Bem-vindo à sala!',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />
    }
  ];

  // Enhanced validation with detailed logging
  const validateRoom = useCallback(async (code: string) => {
    if (code.length !== 6) return;
    
    setIsValidating(true);
    setError(null);
    setCurrentStep('validating');
    setJoinProgress(25);

    console.log('[JoinRoom] 🔍 Validating room code:', { code, timestamp: new Date().toISOString() });

    // Log the outgoing request
    console.log('[JoinRoom] 📤 API REQUEST - validateRoom:', {
      timestamp: new Date().toISOString(),
      operation: 'getRoomByAccessCode',
      parameters: {
        accessCode: code
      },
      sessionInfo: {
        hasSession: !!session,
        hasAccessToken: !!session?.accessToken,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      }
    });

    const requestStartTime = Date.now();
    
    try {
      const response = await getRoomByAccessCode(code);
      const requestDuration = Date.now() - requestStartTime;
      
      console.log('[JoinRoom] 📥 API RESPONSE - validateRoom:', {
        timestamp: new Date().toISOString(),
        operation: 'getRoomByAccessCode',
        parameters: {
          accessCode: code
        },
        success: !!response,
        duration: `${requestDuration}ms`,
        response: response ? {
          id: response.id,
          name: response.name,
          status: response.status,
          participantCount: response.participantCount,
          maxParticipants: response.maxParticipants,
          roomType: response.roomType,
          quizTitle: response.quizTitle,
          quizDifficulty: response.quizDifficulty,
          estimatedDuration: (response as { estimatedDuration?: number }).estimatedDuration,
          category: (response as { category?: string }).category,
          hostName: (response as { hostName?: string }).hostName,
          createdAt: (response as { createdAt?: string }).createdAt
        } : null
      });

      if (response) {
        const roomInfo: RoomData = {
          id: response.id,
          name: response.name,
          description: response.description,
          status: response.status,
          participantCount: response.participantCount || 0,
          maxParticipants: response.maxParticipants || 50,
          timeMode: response.timeMode,
          quizTitle: response.quizTitle,
          roomType: response.roomType,
          accessCode: response.accessCode,
          quizDifficulty: response.quizDifficulty as 'easy' | 'medium' | 'hard' | undefined,
          estimatedDuration: (response as { estimatedDuration?: number }).estimatedDuration,
          category: (response as { category?: string }).category,
          tags: (response as { tags?: string[] }).tags,
          hostName: (response as { hostName?: string }).hostName,
          createdAt: (response as { createdAt?: string }).createdAt
        };

        setRoomData(roomInfo);
        setJoinProgress(50);
        setCurrentStep('input');

        // Add to validation history
        setValidationHistory(prev => [
          ...prev.slice(-4), // Keep last 5 entries
          {
            code,
            timestamp: new Date(),
            success: true
          }
        ]);

        console.log('[JoinRoom] ✅ VALIDATION SUCCESS:', {
          timestamp: new Date().toISOString(),
          code,
          roomName: roomInfo.name,
          duration: `${requestDuration}ms`,
          roomInfo
        });

        toast.success(`Sala "${response.name}" encontrada!`);
      } else {
        throw new Error('Sala não encontrada');
      }
    } catch (err) {
      const requestDuration = Date.now() - requestStartTime;
      
      console.error('[JoinRoom] 📥 API RESPONSE ERROR - validateRoom:', {
        timestamp: new Date().toISOString(),
        operation: 'getRoomByAccessCode',
        parameters: {
          accessCode: code
        },
        success: false,
        duration: `${requestDuration}ms`,
        error: {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          type: err instanceof Error ? err.constructor.name : typeof err
        }
      });

      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar sala';
      setError(errorMessage);
      setRoomData(null);
      setJoinProgress(0);
      setCurrentStep('input');

      // Add to validation history
      setValidationHistory(prev => [
        ...prev.slice(-4),
        {
          code,
          timestamp: new Date(),
          success: false,
          error: errorMessage
        }
      ]);

      console.log('[JoinRoom] ❌ VALIDATION FAILED:', {
        timestamp: new Date().toISOString(),
        code,
        error: errorMessage,
        duration: `${requestDuration}ms`
      });

      toast.error('Código de sala inválido');
    } finally {
      setIsValidating(false);
    }
  }, [session]);

  // Enhanced join room with comprehensive tracking
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setConnectionAttempts(prev => prev + 1);
    setLastAttemptTime(new Date());

    console.log('[JoinRoom] 🚀 Starting join process:', {
      roomCode,
      studentName,
      roomData: roomData?.id,
      websocketConnected: websocket.isConnected,
      attempt: connectionAttempts + 1,
      timestamp: new Date().toISOString()
    });

    if (!studentName.trim()) {
      setError('Por favor, insira seu nome no jogo');
      setIsSubmitting(false);
      return;
    }

    if (!roomData) {
      setError('Por favor, insira um código de sala válido');
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Check WebSocket connection
      setCurrentStep('connecting');
      setJoinProgress(60);

      if (!websocket.isConnected) {
        console.log('[JoinRoom] ⚡ WebSocket not connected, attempting to reconnect');
        websocket.forceReconnect();
        
        // Wait for connection with timeout
        let connectionWait = 0;
        const maxWait = 10000; // 10 seconds
        const checkInterval = 500; // 500ms

        while (!websocket.isConnected && connectionWait < maxWait) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          connectionWait += checkInterval;
          
          console.log('[JoinRoom] ⏳ Waiting for WebSocket connection...', {
            waited: connectionWait,
            connected: websocket.isConnected
          });
        }

        if (!websocket.isConnected) {
          throw new Error('Não foi possível estabelecer conexão. Verifique sua internet.');
        }
      }

      console.log('[JoinRoom] ✅ WebSocket connected, proceeding to join');

      // Step 2: Join room via WebSocket
      setCurrentStep('joining');
      setJoinProgress(80);

      const joinData = {
        roomId: roomData.id,
        accessCode: roomData.accessCode,
        name: studentName.trim(),
        role: 'student' as const
      };

      console.log('[JoinRoom] 📤 Sending join room request:', joinData);

      const joinSuccess = await websocket.joinRoom(joinData);

      if (joinSuccess) {
        console.log('[JoinRoom] ✅ Successfully joined room');
        
        setCurrentStep('success');
        setJoinProgress(100);
        
        // Store student name in localStorage for future use
        localStorage.setItem('studentName', studentName.trim());
        
        toast.success(`Bem-vindo à sala "${roomData.name}"!`);
        
        // Wait a moment before redirecting to show success state
        setTimeout(() => {
          router.push(`/rooms/${roomData.id}/lobby`);
        }, 1500);
      } else {
        throw new Error('Falha ao entrar na sala. Tente novamente.');
      }

    } catch (err) {
      console.error('[JoinRoom] ❌ Join failed:', {
        error: err,
        roomCode,
        studentName,
        attempt: connectionAttempts + 1,
        timestamp: new Date().toISOString()
      });

      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao entrar na sala';
      setError(errorMessage);
      setCurrentStep('input');
      setJoinProgress(0);
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-fill and validation effects
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      const upperCode = codeFromUrl.toUpperCase();
      setRoomCode(upperCode);
      validateRoom(upperCode);
    }
  }, [searchParams, validateRoom]);

  useEffect(() => {
    if (session?.user?.name && !studentName) {
      setStudentName(session.user.name);
    } else {
      const storedName = localStorage.getItem('studentName');
      if (storedName && !studentName) {
        setStudentName(storedName);
      }
    }
  }, [session, studentName]);

  useEffect(() => {
    if (roomCode.length === 6) {
      const timeoutId = setTimeout(() => {
        validateRoom(roomCode);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setRoomData(null);
      setError(null);
    }
  }, [roomCode, validateRoom]);

  // Utility functions
  const formatDifficulty = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return { text: 'Fácil', color: 'bg-green-500' };
      case 'medium': return { text: 'Médio', color: 'bg-yellow-500' };
      case 'hard': return { text: 'Difícil', color: 'bg-red-500' };
      default: return { text: 'N/A', color: 'bg-gray-500' };
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const getStepIcon = (stepId: string) => {
    const step = joinSteps.find(s => s.id === stepId);
    return step?.icon || <AlertCircle className="h-5 w-5" />;
  };

  const getCurrentStepIndex = () => {
    return joinSteps.findIndex(step => step.id === currentStep);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Entrar na Competição
          </h1>
          <p className="text-muted-foreground">
            Digite o código da sala para participar de uma competição de quiz
          </p>
        </div>

        {/* Connection Status */}
        <WebSocketStatus variant="compact" className="w-full" />

        {/* Progress Steps */}
        {(currentStep !== 'input' || isSubmitting) && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Progresso da Entrada</h3>
                <span className="text-sm text-muted-foreground">{Math.round(joinProgress)}%</span>
              </div>
              
              <Progress value={joinProgress} className="mb-4" />
              
              <div className="flex items-center justify-between">
                {joinSteps.map((step, index) => (
                  <div key={step.id} className="flex flex-col items-center space-y-1">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                      ${getCurrentStepIndex() === index 
                        ? 'bg-blue-600 text-white' 
                        : getCurrentStepIndex() > index 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-600'}
                    `}>
                      {getCurrentStepIndex() > index ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        getStepIcon(step.id)
                      )}
                    </div>
                    <span className="text-xs text-center max-w-16">{step.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Join Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Código da Sala
            </CardTitle>
            <CardDescription>
              Insira o código de 6 caracteres fornecido pelo professor
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Room Code Input */}
              <div className="space-y-2">
                <Label htmlFor="roomCode">Código da Sala</Label>
                <div className="relative">
                  <Input
                    id="roomCode"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC123"
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-wider uppercase"
                    disabled={isSubmitting || isValidating}
                  />
                  {isValidating && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
                {roomCode.length > 0 && roomCode.length < 6 && (
                  <p className="text-xs text-muted-foreground">
                    Digite {6 - roomCode.length} caracteres restantes
                  </p>
                )}
              </div>

              {/* Student Name Input */}
              <div className="space-y-2">
                <Label htmlFor="studentName">Seu Nome no Jogo</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Digite seu nome"
                  maxLength={50}
                  disabled={isSubmitting}
                />
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Room Information */}
              {roomData && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{roomData.name}</h3>
                      {roomData.description && (
                        <p className="text-sm text-muted-foreground">{roomData.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {roomData.roomType === 'private' ? (
                        <Lock className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-600" />
                      )}
                      <Badge variant={roomData.status === 'active' ? 'default' : 'secondary'}>
                        {roomData.status === 'active' ? 'Ativa' : 
                         roomData.status === 'pending' ? 'Aguardando' : 'Finalizada'}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Quiz:</span>
                      </div>
                      <p className="text-muted-foreground">{roomData.quizTitle}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Participantes:</span>
                      </div>
                      <p className="text-muted-foreground">
                        {roomData.participantCount || 0} / {roomData.maxParticipants || 50}
                      </p>
                    </div>

                    {roomData.quizDifficulty && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Dificuldade:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${formatDifficulty(roomData.quizDifficulty).color}`} />
                          <span className="text-muted-foreground">
                            {formatDifficulty(roomData.quizDifficulty).text}
                          </span>
                        </div>
                      </div>
                    )}

                    {roomData.estimatedDuration && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Duração:</span>
                        </div>
                        <p className="text-muted-foreground">
                          {formatDuration(roomData.estimatedDuration)}
                        </p>
                      </div>
                    )}

                    {roomData.hostName && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Professor:</span>
                        </div>
                        <p className="text-muted-foreground">{roomData.hostName}</p>
                      </div>
                    )}

                    {roomData.timeMode && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Modo:</span>
                        </div>
                        <p className="text-muted-foreground">
                          {roomData.timeMode === 'per_question' ? 'Por pergunta' : 'Quiz completo'}
                        </p>
                      </div>
                    )}
                  </div>

                  {roomData.tags && roomData.tags.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Categorias:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {roomData.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || isValidating || !roomData || !studentName.trim() || !websocket.isConnected}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {currentStep === 'connecting' ? 'Conectando...' :
                     currentStep === 'joining' ? 'Entrando na sala...' :
                     currentStep === 'success' ? 'Redirecionando...' : 'Processando...'}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Entrar na Competição
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          {/* Advanced Info Panel */}
          <CardFooter className="bg-muted/30">
            <div className="w-full space-y-4">
              <Button
                variant="ghost"
                onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Informações Avançadas
                </span>
                {showAdvancedInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>

              {showAdvancedInfo && (
                <div className="space-y-4 text-xs">
                  <Separator />
                  
                  {/* Connection Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium mb-2">Estado da Conexão</p>
                      <div className="space-y-1 text-muted-foreground">
                        <div>WebSocket: {websocket.isConnected ? '✅ Conectado' : '❌ Desconectado'}</div>
                        <div>Estado: {websocket.connectionState}</div>
                        <div>Qualidade: {websocket.connectionQuality}</div>
                        <div>Tentativas: {connectionAttempts}</div>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium mb-2">Tentativas de Validação</p>
                      <div className="space-y-1">
                        {validationHistory.slice(-3).map((attempt, index) => (
                          <div key={index} className="flex items-center gap-2 text-muted-foreground">
                            {attempt.success ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-600" />
                            )}
                            <span>{attempt.code}</span>
                            <span className="text-xs">
                              {attempt.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                        {validationHistory.length === 0 && (
                          <div className="text-muted-foreground">Nenhuma tentativa ainda</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {lastAttemptTime && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Última tentativa:</span>
                        <span className="text-muted-foreground">
                          {lastAttemptTime.toLocaleTimeString()}
                        </span>
                      </div>
                    </>
                  )}

                  <Separator />
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/')}
                    >
                      <Home className="h-3 w-3 mr-2" />
                      Voltar ao Início
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={websocket.forceReconnect}
                      disabled={websocket.isConnected}
                    >
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Reconectar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Carregando página de entrada...</p>
        </div>
      </div>
    }>
      <JoinRoomForm />
    </Suspense>
  );
}