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
import { useUnifiedWebSocket } from '@/contexts/UnifiedWebSocketContext';
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
  id: string;
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
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const websocket = useUnifiedWebSocket();

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

  // Pre-fill room code from URL params
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setRoomCode(code);
    }
  }, [searchParams]);

  // Pre-fill student name if logged in
  useEffect(() => {
    if (session?.user?.name) {
      setStudentName(session.user.name);
    }
  }, [session]);

  const validateRoomCode = useCallback(async (code: string) => {
    try {
      setIsValidating(true);
      setCurrentStep('validating');
      setJoinProgress(25);
      
      const roomData = await getRoomByAccessCode(code);
      
             if (roomData) {
         // Transform the response to match RoomData interface
         const transformedRoomData: RoomData = {
           id: roomData.id,
           name: roomData.name,
           description: roomData.description,
           status: roomData.status as 'pending' | 'active' | 'finished',
           participantCount: roomData.participantCount || 0,
           maxParticipants: roomData.maxParticipants || 50,
           timeMode: roomData.timeMode,
           quizTitle: roomData.quizTitle,
           roomType: roomData.roomType,
           accessCode: roomData.accessCode,
           quizDifficulty: roomData.quizDifficulty as 'easy' | 'medium' | 'hard' | undefined,
           estimatedDuration: 0,
           category: '',
           tags: [],
           hostName: roomData.hostName,
           createdAt: roomData.createdAt,
         };
         
         setRoomData(transformedRoomData);
         setValidationHistory(prev => [...prev, {
           code,
           timestamp: new Date(),
           success: true
         }]);
         return true;
       }
      
      throw new Error('Sala não encontrada');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao validar código';
      setValidationHistory(prev => [...prev, {
        code,
        timestamp: new Date(),
        success: false,
        error: errorMessage
      }]);
      throw err;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || !roomCode.trim() || !studentName.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setJoinProgress(0);
    setCurrentStep('input');

    try {
      // Step 1: Validate room code
      await validateRoomCode(roomCode.trim());
      
      // Step 2: Connect to WebSocket
      setCurrentStep('connecting');
      setJoinProgress(50);
      
      if (!websocket.connectionState.isConnected) {
        setConnectionAttempts(prev => prev + 1);
        setLastAttemptTime(new Date());
        await websocket.connect();
      }
      
      // Step 3: Join room
      setCurrentStep('joining');
      setJoinProgress(75);
      
      const joinResult = await websocket.joinRoom({
        roomId: roomData!.id,
        accessCode: roomCode.trim(),
        displayName: studentName.trim(),
      });
      
      if (joinResult.success) {
        setCurrentStep('success');
        setJoinProgress(100);
        toast.success('Entrou na sala com sucesso!');
        
        // Redirect to room lobby
        setTimeout(() => {
          router.push(`/rooms/${roomData!.id}/lobby`);
        }, 1500);
      } else {
        throw new Error(joinResult.error || 'Falha ao entrar na sala');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao entrar na sala';
      setError(errorMessage);
      setCurrentStep('input');
      setJoinProgress(0);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-blue-600 bg-blue-50';
      case 'finished': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderStepIndicator = () => {
    const currentStepIndex = joinSteps.findIndex(step => step.id === currentStep);
    
    return (
      <div className="flex items-center justify-between mb-6">
        {joinSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={`flex items-center ${
              index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                index <= currentStepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}>
                {step.icon}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
            {index < joinSteps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-4 ${
                index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Entrar na Sala</h1>
          <p className="text-gray-600">Digite o código da sala para participar do quiz</p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Main Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">
              {currentStep === 'success' ? 'Sucesso!' : 'Detalhes da Entrada'}
            </CardTitle>
            <CardDescription className="text-center">
              {currentStep === 'success' 
                ? 'Redirecionando para a sala...' 
                : 'Preencha as informações para entrar na sala'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>{joinProgress}%</span>
                </div>
                <Progress value={joinProgress} className="h-2" />
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomCode">Código da Sala</Label>
                <Input
                  id="roomCode"
                  type="text"
                  placeholder="Digite o código da sala"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  disabled={isSubmitting}
                  required
                  className="text-center text-lg font-mono tracking-wider"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentName">Seu Nome</Label>
                <Input
                  id="studentName"
                  type="text"
                  placeholder="Digite seu nome"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Room Information */}
              {roomData && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-blue-900">{roomData.name}</h3>
                      <Badge className={getStatusColor(roomData.status)}>
                        {roomData.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">Quiz:</span>
                        <span className="text-blue-900 font-medium">{roomData.quizTitle}</span>
                      </div>
                      
                      {roomData.quizDifficulty && (
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700">Dificuldade:</span>
                          <Badge className={getDifficultyColor(roomData.quizDifficulty)}>
                            {roomData.quizDifficulty}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">Participantes:</span>
                        <span className="text-blue-900">
                          {roomData.participantCount || 0}/{roomData.maxParticipants || '∞'}
                        </span>
                      </div>
                      
                      {roomData.estimatedDuration && (
                        <div className="flex items-center justify-between">
                          <span className="text-blue-700">Duração:</span>
                          <span className="text-blue-900">{roomData.estimatedDuration} min</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isSubmitting || !roomCode.trim() || !studentName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {currentStep === 'validating' && 'Validando...'}
                    {currentStep === 'connecting' && 'Conectando...'}
                    {currentStep === 'joining' && 'Entrando...'}
                    {currentStep === 'success' && 'Sucesso!'}
                  </>
                ) : (
                  <>
                    <UserCheck className="h-5 w-5 mr-2" />
                    Entrar na Sala
                  </>
                )}
              </Button>
            </form>

            {/* Advanced Info Toggle */}
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
                className="w-full"
              >
                {showAdvancedInfo ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showAdvancedInfo ? 'Ocultar' : 'Mostrar'} Informações Avançadas
              </Button>
              
              {showAdvancedInfo && (
                <div className="mt-4 space-y-3">
                  {/* WebSocket Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status WebSocket:</span>
                    <div className={`flex items-center gap-2 ${
                      websocket.connectionState.isConnected ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {websocket.connectionState.isConnected ? (
                        <Wifi className="h-4 w-4" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span>{websocket.connectionState.isConnected ? 'Conectado' : 'Desconectado'}</span>
                    </div>
                  </div>

                  {/* Connection Attempts */}
                  {connectionAttempts > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tentativas de Conexão:</span>
                      <span className="text-gray-900">{connectionAttempts}</span>
                    </div>
                  )}

                  {/* Last Attempt Time */}
                  {lastAttemptTime && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Última Tentativa:</span>
                      <span className="text-gray-900">{lastAttemptTime.toLocaleTimeString()}</span>
                    </div>
                  )}

                  {/* Validation History */}
                  {validationHistory.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-gray-700">Histórico de Validação:</span>
                      <div className="max-h-20 overflow-y-auto space-y-1">
                        {validationHistory.slice(-3).map((entry, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="font-mono">{entry.code}</span>
                            <div className="flex items-center gap-1">
                              {entry.success ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-gray-500">
                                {entry.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => router.push('/rooms')}>
            <Home className="h-4 w-4 mr-2" />
            Voltar para Salas
          </Button>
        </div>
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