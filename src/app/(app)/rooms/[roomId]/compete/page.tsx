'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Trophy, AlertCircle, Target, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { toast } from 'sonner';
import { getRoomDetails } from '@/actions/competitionActions';

// Backend API URL configuration
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:7777";

// Types for competition room
interface Answer {
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  question: string;
  answers: Answer[];
  timeLimit: number;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
}

interface Participant {
  id: string;
  name: string;
  score: number;
  status: 'waiting' | 'answering' | 'answered';
  avatar?: string;
}

interface CompetitionState {
  status: 'waiting' | 'active' | 'paused' | 'finished';
  currentQuestionIndex: number;
  questions: Question[];
  participants: Participant[];
  timeRemaining: number;
  totalTime: number;
  userScore: number;
  isSubmitted: boolean;
  showResults: boolean;
}

interface RoomCompetitionData {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'finished';
  quiz: {
    id: string;
    title: string;
    description?: string;
    questions: Question[];
  };
  participants: Participant[];
  currentQuestionIndex: number;
  timeRemaining: number;
  totalTime: number;
  timeMode?: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  showAnswersWhen?: 'immediately' | 'end_of_quiz';
  shuffleQuestions?: boolean;
}

// WebSocket event data types
interface WebSocketEventData {
  roomId?: string;
  questionIndex?: number;
  timeLimit?: number;
  [key: string]: unknown;
}

const DEFAULT_QUESTION_TIME_LIMIT = 30; // seconds

// Helper function to get authentication token
async function getAuthToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) return null;
    
    const session = await response.json();
    return session?.accessToken || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Function to fetch quiz questions from backend
async function fetchQuizQuestions(quizId: string): Promise<Question[]> {
  try {
    console.log('[fetchQuizQuestions] Buscando questões para quiz:', quizId);
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Token de autenticação não encontrado');
    }

    const response = await fetch(`${BACKEND_API_URL}/quizzes/${quizId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar quiz: ${response.status}`);
    }

    const quiz = await response.json();
    console.log('[fetchQuizQuestions] Quiz recebido:', quiz);

    // Transform backend quiz questions to frontend format
    const questions: Question[] = [];
    
    if (quiz.quizQuestions && Array.isArray(quiz.quizQuestions)) {
      quiz.quizQuestions.forEach((qq: { question?: { id: string; text: string; options?: { id: string; text: string; isCorrect: boolean }[]; difficulty?: string } }) => {
        if (qq.question) {
          const question = qq.question;

          questions.push({
            id: question.id,
            question: question.text,
            answers: question.options || [],
            timeLimit: question.difficulty === 'easy' ? 30 : question.difficulty === 'medium' ? 60 : 120,
            type: question.difficulty === 'easy' ? 'multiple_choice' : question.difficulty === 'medium' ? 'multiple_choice' : 'open_ended',
          });
        }
      });
    }

    console.log('[fetchQuizQuestions] Questões transformadas:', questions.length);
    return questions;

  } catch (error) {
    console.error('[fetchQuizQuestions] Erro ao buscar questões:', error);
    throw error;
  }
}

export default function RoomCompetePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const roomId = params.roomId as string;
  
  // Use WebSocket for real-time competition features
  const websocket = useWebSocket();
  
  const [competitionState, setCompetitionState] = useState<CompetitionState>({
    status: 'waiting',
    currentQuestionIndex: 0,
    questions: [],
    participants: [],
    timeRemaining: 0,
    totalTime: 0,
    userScore: 0,
    isSubmitted: false,
    showResults: false
  });

  const [roomData, setRoomData] = useState<RoomCompetitionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation?: string } | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Helper functions moved before useEffect that might use them
  const moveToNextQuestion = useCallback(() => {
    setSelectedAnswer('');
    setFeedback(null);
    setCompetitionState(prev => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex + 1,
      isSubmitted: false,
      timeRemaining: roomData?.timeMode === 'per_question' 
        ? (roomData.timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT)
        : Math.floor((roomData?.timePerQuiz || 600) / prev.questions.length)
    }));
  }, [roomData]);

  const handleAnswerSubmit = useCallback(async (answerText: string) => {
    if (competitionState.isSubmitted || !answerText || !roomData) {
      return;
    }

    if (!websocket.isConnected) {
      toast.error('Conexão perdida. Não é possível enviar resposta.');
      return;
    }

    if (!websocket.isConnectionReady) {
      toast.error('Aguarde a conexão ser estabelecida antes de enviar a resposta.');
      return;
    }

    try {
      const responseTime = roomData.timeMode === 'per_question'
        ? (roomData.timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT) - competitionState.timeRemaining
        : Math.floor((roomData.timePerQuiz || 600) / competitionState.questions.length) - competitionState.timeRemaining;

      const answerData = {
        roomId: roomId as string,
        questionIndex: competitionState.currentQuestionIndex,
        selectedOption: answerText,
        responseTime: Math.max(0, responseTime), // Ensure non-negative
        submittedAt: new Date().toISOString()
      };

      console.log('[Competition] Submitting answer:', answerData);

      // Send answer via WebSocket
      websocket.sendEvent({
        type: 'participant_answered',
        data: answerData,
        timestamp: Date.now(),
        roomId: roomId as string
      });
      
      setCompetitionState(prev => ({ ...prev, isSubmitted: true }));
      
      // Show feedback if configured to do so
      if (roomData.showAnswersWhen === 'immediately') {
        const question = competitionState.questions[competitionState.currentQuestionIndex];
        const correctAnswer = question?.answers.find((a: Answer) => a.isCorrect);
        setFeedback({
          isCorrect: answerText === correctAnswer?.text,
          explanation: correctAnswer?.text
        });
      }

      toast.success('Resposta enviada com sucesso!');
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Erro ao enviar resposta');
      setSubmissionError('Falha ao enviar resposta. Tente novamente.');
    }
  }, [roomData, competitionState.isSubmitted, competitionState.currentQuestionIndex, competitionState.timeRemaining, competitionState.questions, roomId, websocket]);

  const handleTimeUp = useCallback(() => {
    console.log('[Competition] Time up for question:', competitionState.currentQuestionIndex);
    
    // If an answer was selected, submit it; otherwise, mark as unanswered
    if (selectedAnswer) {
      handleAnswerSubmit(selectedAnswer);
    } else {
      // Move to next question without scoring
      moveToNextQuestion();
    }
  }, [selectedAnswer, competitionState.currentQuestionIndex, handleAnswerSubmit, moveToNextQuestion]);

  // Session authentication check
  useEffect(() => {
    if (sessionStatus === 'loading') {
      return; // Wait for session to load
    }
    
    if (sessionStatus === 'unauthenticated') {
      toast.error('Você precisa estar logado para participar da competição');
      router.push('/auth/signin');
      return;
    }
    
    if (!session?.user) {
      toast.error('Sessão inválida');
      router.push('/auth/signin');
      return;
    }
  }, [sessionStatus, session, router]);

  // Auto-rejoin room if WebSocket connection is lost
  useEffect(() => {
    if (!websocket.isConnected && roomData?.id && session?.user && connectionAttempts < 3) {
      const timer = setTimeout(() => {
        console.log('[Compete] Auto-rejoining room after connection loss...');
        setConnectionAttempts(prev => prev + 1);
        websocket.joinRoom({
          roomId: roomData.id,
          accessCode: '', // May need to store this
          name: session.user?.name || 'Participante',
          role: 'student'
        });
      }, 2000 * (connectionAttempts + 1)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [websocket, roomData?.id, session?.user, connectionAttempts]);

  // Reset connection attempts when successfully connected
  useEffect(() => {
    if (websocket.isConnected && connectionAttempts > 0) {
      setConnectionAttempts(0);
    }
  }, [websocket.isConnected, connectionAttempts]);

  const handleAnswerSelect = (optionId: string) => {
    if (competitionState.status !== 'active' || feedback !== null) {
      return; // Don't allow selection if paused or already answered
    }
    
    setSelectedAnswer(optionId);
    setSubmissionError(null);
  };

  // Initialize competition and room data
  useEffect(() => {
    const initializeCompetition = async () => {
      // Wait for session to load
      if (sessionStatus === 'loading') {
        return;
      }

      // Check authentication
      if (sessionStatus === 'unauthenticated' || !session?.user) {
        setError('Você precisa estar logado para participar da competição');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('[Compete] Initializing competition for room:', roomId);
        
        // Get room details first
        const roomDetails = await getRoomDetails(roomId);
        if (!roomDetails) {
          setError('Sala não encontrada ou acesso negado');
          setLoading(false);
          return;
        }

        console.log('[Compete] Room details loaded:', roomDetails);

        // Set room data
        const roomCompetitionData: RoomCompetitionData = {
          id: roomDetails.id,
          name: roomDetails.name,
          status: roomDetails.status === 'active' ? 'active' : 
                  roomDetails.status === 'finished' ? 'finished' : 'waiting',
          quiz: {
            id: roomDetails.quizId,
            title: roomDetails.quizTitle,
            description: roomDetails.description,
            questions: [], // Will be filled by fetchQuizQuestions
          },
          participants: [], // Will be populated from WebSocket
          currentQuestionIndex: 0, // Start from first question
          timeRemaining: 0, // Will be set based on time mode
          totalTime: 0, // Will be set based on time mode
          timeMode: roomDetails.timeMode,
          timePerQuestion: roomDetails.timePerQuestion,
          timePerQuiz: roomDetails.timePerQuiz,
          showAnswersWhen: roomDetails.showAnswersWhen,
          shuffleQuestions: roomDetails.shuffleQuestions,
        };

        setRoomData(roomCompetitionData);

        // Fetch real quiz questions from backend
        let questions = await fetchQuizQuestions(roomDetails.quizId);
        
        if (questions.length === 0) {
          setError('Nenhuma questão encontrada para este quiz');
          setLoading(false);
          return;
        }

        console.log('[Compete] Questions loaded:', questions.length);

        // Shuffle questions if configured
        if (roomCompetitionData.shuffleQuestions) {
          questions = questions.sort(() => Math.random() - 0.5);
          console.log('[Compete] Questions shuffled');
        }

        const timeLimit = roomCompetitionData.timeMode === 'per_question' 
          ? (roomCompetitionData.timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT)
          : Math.floor((roomCompetitionData.timePerQuiz || 600) / questions.length);

        setCompetitionState(prev => ({
          ...prev,
          questions,
          totalTime: timeLimit,
          timeRemaining: timeLimit,
          status: 'active',
        }));

        setLoading(false);
        toast.success('Competição carregada! Boa sorte!');

      } catch (err) {
        console.error('[Compete] Error initializing competition:', err);
        
        if (err instanceof Error) {
          if (err.message.includes('expired') || err.message.includes('invalid')) {
            setError('Sua sessão expirou. Por favor, faça login novamente.');
            setTimeout(() => {
              router.push('/auth/signin');
            }, 3000);
          } else {
            setError(`Erro ao carregar competição: ${err.message}`);
          }
        } else {
          setError('Erro desconhecido ao carregar competição');
        }
        
        setLoading(false);
      }
    };

    if (roomId) {
      initializeCompetition();
    }
  }, [roomId, router, sessionStatus, session]);

  // Set up WebSocket event listeners for real-time competition updates
  useEffect(() => {
    if (!websocket.isConnected || !roomId) return;

    // Listen for competition control events
    const unsubscribeQuizStarted = websocket.addEventListener('quiz_started', (data: unknown) => {
      console.log('[WebSocket] Quiz started:', data);
      setCompetitionState(prev => ({ ...prev, status: 'active' }));
      toast.success('Competição iniciada!');
    });

    const unsubscribeQuizPaused = websocket.addEventListener('quiz_paused', (data: unknown) => {
      console.log('[WebSocket] Quiz paused:', data);
      setCompetitionState(prev => ({ ...prev, status: 'paused' }));
      toast.info('Competição pausada pelo professor');
    });

    const unsubscribeQuizResumed = websocket.addEventListener('quiz_resumed', (data: unknown) => {
      console.log('[WebSocket] Quiz resumed:', data);
      setCompetitionState(prev => ({ ...prev, status: 'active' }));
      toast.success('Competição retomada!');
    });

    const unsubscribeQuizFinished = websocket.addEventListener('quiz_finished', (data: unknown) => {
      console.log('[WebSocket] Quiz finished:', data);
      setCompetitionState(prev => ({ ...prev, status: 'finished' }));
      toast.success('Competição finalizada!');
      
      // Redirect to results after a delay
      setTimeout(() => {
        router.push(`/rooms/${roomId}/results`);
      }, 3000);
    });

    const unsubscribeQuestionChanged = websocket.addEventListener('question_changed', (data: unknown) => {
      console.log('[WebSocket] Question changed:', data);
      const eventData = data as WebSocketEventData;
      if (eventData.questionIndex !== undefined) {
        setCompetitionState(prev => ({
          ...prev,
          currentQuestionIndex: eventData.questionIndex!,
          timeRemaining: eventData.timeLimit || prev.timeRemaining,
        }));
        setSelectedAnswer('');
        setFeedback(null);
      }
    });

    // Cleanup function
    return () => {
      unsubscribeQuizStarted();
      unsubscribeQuizPaused();
      unsubscribeQuizResumed();
      unsubscribeQuizFinished();
      unsubscribeQuestionChanged();
    };
  }, [websocket, roomId, router]);

  // Timer countdown effect
  useEffect(() => {
    if (competitionState.status !== 'active' || competitionState.timeRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCompetitionState(prev => {
        const newTimeRemaining = prev.timeRemaining - 1;
        
        if (newTimeRemaining <= 0) {
          // Time's up - auto submit current answer or move to next question
          handleTimeUp();
          return { ...prev, timeRemaining: 0 };
        }
        
        return { ...prev, timeRemaining: newTimeRemaining };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [competitionState.status, competitionState.timeRemaining, handleTimeUp]);
    
  // Manual reconnection handler
  const handleManualReconnect = useCallback(async () => {
    if (isReconnecting) return;
    
    setIsReconnecting(true);
    setConnectionAttempts(0);
    
    try {
      console.log('[Compete] Manual reconnection attempt...');
      
      if (roomData?.id && session?.user) {
        await websocket.joinRoom({
          roomId: roomData.id,
          accessCode: '', // May need to store this
          name: session.user.name || 'Participante',
          role: 'student'
        });
        
        toast.success('Reconectado com sucesso!');
    }
    } catch (error) {
      console.error('[Compete] Manual reconnection failed:', error);
      toast.error('Falha na reconexão');
    } finally {
      setIsReconnecting(false);
    }
  }, [isReconnecting, roomData?.id, session?.user, websocket]);

  // Session loading state
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              {sessionStatus === 'loading' ? 'Verificando autenticação...' : 'Carregando competição...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg text-red-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => router.push('/rooms')} variant="outline">
                Voltar às Salas
              </Button>
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state (original)
  if (competitionState.status === 'waiting') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando competição...</p>
          </div>
        </div>
      </div>
    );
  }

  // Finished state
  if (competitionState.status === 'finished') {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Competição Finalizada!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{competitionState.totalTime}</div>
                <div className="text-sm text-muted-foreground">Pontuação</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {Math.round((competitionState.totalTime / competitionState.totalTime) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Precisão</div>
              </div>
            </div>
            <p className="text-muted-foreground">
              Redirecionando para os resultados...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = competitionState.questions[competitionState.currentQuestionIndex];
  const progress = ((competitionState.currentQuestionIndex + 1) / competitionState.questions.length) * 100;

  if (!currentQuestion) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Nenhuma questão disponível.</p>
          <Button onClick={() => router.push('/rooms')} className="mt-4">
            Voltar às Salas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{roomData?.quiz.title}</h1>
            <p className="text-muted-foreground">
              Questão {competitionState.currentQuestionIndex + 1} de {competitionState.questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {websocket.isConnected ? (
                <Badge variant="default" className="bg-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <>
                  <Badge variant="destructive">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Desconectado
                  </Badge>
                  <Button 
                    onClick={handleManualReconnect}
                    disabled={isReconnecting}
                    size="sm"
                    variant="outline"
                  >
                    {isReconnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isReconnecting ? 'Reconectando...' : 'Reconectar'}
                  </Button>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="font-medium">{competitionState.userScore} pontos</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={`font-medium ${competitionState.timeRemaining <= 10 ? 'text-red-500' : ''}`}>
                {Math.floor(competitionState.timeRemaining / 60)}:{(competitionState.timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>

      {/* Status Messages */}
      {competitionState.status === 'paused' && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Competição pausada pelo professor</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentQuestion.answers.map((option) => {
              const isSelected = selectedAnswer === option.text;
              const isCorrect = option.isCorrect;
              const showFeedback = feedback !== null && roomData?.showAnswersWhen === 'immediately';
              
              let buttonVariant: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link' = 'outline';
              let buttonClass = '';
              
              if (isSelected && !showFeedback) {
                buttonVariant = 'default';
                buttonClass = 'ring-2 ring-primary';
              } else if (showFeedback) {
                if (isCorrect) {
                  buttonVariant = 'secondary';
                  buttonClass = 'bg-green-100 border-green-300 text-green-800';
                } else if (isSelected && !isCorrect) {
                  buttonVariant = 'destructive';
                  buttonClass = 'bg-red-100 border-red-300 text-red-800';
                }
              }

              return (
                <Button
                  key={option.text}
                  variant={buttonVariant}
                  className={`w-full justify-start text-left h-auto p-4 ${buttonClass}`}
                  onClick={() => handleAnswerSelect(option.text)}
                  disabled={competitionState.status !== 'active' || feedback !== null}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option.text}</span>
                    {showFeedback && isCorrect && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
          
          {submissionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{submissionError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      {selectedAnswer && feedback === null && (
        <div className="text-center">
          <Button 
            onClick={() => handleAnswerSubmit(selectedAnswer)}
            size="lg"
            disabled={competitionState.status !== 'active'}
          >
            Confirmar Resposta
          </Button>
        </div>
      )}
    </div>
  );
} 