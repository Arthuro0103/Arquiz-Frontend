'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Trophy, AlertCircle, Target, Clock, Wifi, WifiOff, RefreshCw, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';
import { useUnifiedWebSocket } from '@/contexts/UnifiedWebSocketContext';
import { toast } from 'sonner';
import { getRoomDetails } from '@/actions/competitionActions';

// Backend API URL configuration
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:7777";

// Default time limit constants
const DEFAULT_QUESTION_TIME_LIMIT = 30; // 30 seconds default per question

// Types
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

// Enhanced answer tracking for reports
interface AnswerHistory {
  questionIndex: number;
  selectedAnswers: string[];
  timestamps: Date[];
  finalAnswer: string;
  responseTime: number;
  changesCount: number;
}

interface CompetitionState {
  status: 'waiting' | 'active' | 'paused' | 'finished';
  currentQuestionIndex: number;
  questions: Question[];
  timeRemaining: number;
  totalQuizTime: number;
  userScore: number;
  isSubmitted: boolean;
  showResults: boolean;
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  startTime: Date | null;
  // Enhanced answer tracking
  selectedAnswers: Map<number, string>; // questionIndex -> selectedAnswer
  answerHistory: Map<number, AnswerHistory>; // questionIndex -> history
  submittedAnswers: Set<number>; // track which questions have been submitted
}

interface RoomData {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'finished';
  quizId: string;
  quizTitle: string;
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  showAnswersWhen?: 'immediately' | 'after_quiz';
  shuffleQuestions?: boolean;
}

const BASE_TIME_PER_QUESTION = 60; // Enhanced base time: 60 seconds per question

// Local storage keys for persistence
const QUIZ_STATE_KEY = 'arquiz_competition_state';
const ANSWER_HISTORY_KEY = 'arquiz_answer_history';

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
    console.log('[fetchQuizQuestions] Fetching questions for quiz:', quizId);
    
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${BACKEND_API_URL}/quizzes/${quizId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching quiz: ${response.status}`);
    }

    const quiz = await response.json();
    console.log('[fetchQuizQuestions] Quiz received:', quiz);

    // Transform backend quiz questions to frontend format
    const questions: Question[] = [];
    
    if (quiz.quizQuestions && Array.isArray(quiz.quizQuestions)) {
      quiz.quizQuestions.forEach((qq: { question?: { id: string; text: string; options?: { id: string; text: string; isCorrect: boolean }[]; difficulty?: string } }) => {
        if (qq.question) {
          const question = qq.question;
          const options = question.options || [];

          questions.push({
            id: question.id,
            question: question.text,
            answers: options.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            })),
            timeLimit: question.difficulty === 'easy' ? 30 : question.difficulty === 'medium' ? 60 : 120,
            type: 'multiple_choice',
          });
        }
      });
    }

    console.log('[fetchQuizQuestions] Questions transformed:', questions.length);
    return questions;

  } catch (error) {
    console.error('[fetchQuizQuestions] Error fetching questions:', error);
    throw error;
  }
}

// Enhanced time calculation based on questions and mode
function calculateQuizTime(questions: Question[], timeMode: string, timePerQuestion?: number, timePerQuiz?: number): number {
  if (timeMode === 'per_question') {
    return timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT;
  } else {
    // Enhanced base time calculation: 60 seconds × question quantity
    const enhancedBaseTime = questions.length * BASE_TIME_PER_QUESTION;
    return timePerQuiz || enhancedBaseTime;
  }
}

// Persistence helpers
function saveQuizState(roomId: string, state: CompetitionState) {
  try {
    const stateToSave = {
      ...state,
      selectedAnswers: Array.from(state.selectedAnswers.entries()),
      answerHistory: Array.from(state.answerHistory.entries()),
      submittedAnswers: Array.from(state.submittedAnswers),
      roomId,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`${QUIZ_STATE_KEY}_${roomId}`, JSON.stringify(stateToSave));
    console.log('[Persistence] Quiz state saved for room:', roomId);
  } catch (error) {
    console.error('[Persistence] Error saving quiz state:', error);
  }
}

function loadQuizState(roomId: string): Partial<CompetitionState> | null {
  try {
    const saved = localStorage.getItem(`${QUIZ_STATE_KEY}_${roomId}`);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    
    // Reconstruct Maps and Sets
    const restoredState = {
      ...parsed,
      selectedAnswers: new Map(parsed.selectedAnswers || []),
      answerHistory: new Map(parsed.answerHistory || []),
      submittedAnswers: new Set(parsed.submittedAnswers || []),
      startTime: parsed.startTime ? new Date(parsed.startTime) : null,
    };

    console.log('[Persistence] Quiz state loaded for room:', roomId, restoredState);
    return restoredState;
  } catch (error) {
    console.error('[Persistence] Error loading quiz state:', error);
    return null;
  }
}

function clearQuizState(roomId: string) {
  try {
    localStorage.removeItem(`${QUIZ_STATE_KEY}_${roomId}`);
    console.log('[Persistence] Quiz state cleared for room:', roomId);
  } catch (error) {
    console.error('[Persistence] Error clearing quiz state:', error);
  }
}

export default function RoomCompetePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const roomId = params.roomId as string;
  const websocket = useUnifiedWebSocket();
  const isMountedRef = useRef(true);

  // Simplified state management with enhanced answer tracking
  const [competitionState, setCompetitionState] = useState<CompetitionState>({
    status: 'waiting',
    currentQuestionIndex: 0,
    questions: [],
    timeRemaining: 0,
    totalQuizTime: 0,
    userScore: 0,
    isSubmitted: false,
    showResults: false,
    timeMode: 'per_question',
    startTime: null,
    selectedAnswers: new Map(),
    answerHistory: new Map(),
    submittedAnswers: new Set(),
  });

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track answer changes for each question
  const updateAnswerHistory = useCallback((questionIndex: number, newAnswer: string) => {
    setCompetitionState(prev => {
      const newAnswerHistory = new Map(prev.answerHistory);
      const currentHistory = newAnswerHistory.get(questionIndex) || {
        questionIndex,
        selectedAnswers: [],
        timestamps: [],
        finalAnswer: '',
        responseTime: 0,
        changesCount: 0,
      };

      // Add the new answer to history
      currentHistory.selectedAnswers.push(newAnswer);
      currentHistory.timestamps.push(new Date());
      currentHistory.finalAnswer = newAnswer;
      currentHistory.changesCount = currentHistory.selectedAnswers.length - 1; // Don't count first selection as change

      newAnswerHistory.set(questionIndex, currentHistory);

      // Also update selected answers
      const newSelectedAnswers = new Map(prev.selectedAnswers);
      newSelectedAnswers.set(questionIndex, newAnswer);

      const newState = {
        ...prev,
        selectedAnswers: newSelectedAnswers,
        answerHistory: newAnswerHistory,
      };

      // Save state to localStorage
      saveQuizState(roomId, newState);

      return newState;
    });
  }, [roomId]);

  // Handle answer selection with change tracking
  const handleAnswerSelect = useCallback((answerText: string) => {
    const currentIndex = competitionState.currentQuestionIndex;
    
    // Don't allow changes if already submitted (for per_question mode)
    if (competitionState.timeMode === 'per_question' && competitionState.submittedAnswers.has(currentIndex)) {
      toast.warning('Resposta já foi enviada para esta pergunta');
      return;
    }

    setSelectedAnswer(answerText);
    updateAnswerHistory(currentIndex, answerText);

    console.log(`[Answer] Question ${currentIndex}: Selected "${answerText}"`);
  }, [competitionState.currentQuestionIndex, competitionState.timeMode, competitionState.submittedAnswers, updateAnswerHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Authentication check
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated' || !session?.user) {
      toast.error('Você precisa estar logado para participar');
      router.push('/auth/signin');
      return;
    }
  }, [sessionStatus, session, router]);

  // Handle answer submission with enhanced tracking
  const handleAnswerSubmit = useCallback(async (answerText: string) => {
    if (!answerText || !websocket.connectionState.isConnected) {
      return;
    }

    const currentIndex = competitionState.currentQuestionIndex;

    // Check if already submitted (for per_question mode)
    if (competitionState.timeMode === 'per_question' && competitionState.submittedAnswers.has(currentIndex)) {
      toast.warning('Resposta já foi enviada para esta pergunta');
      return;
    }

    try {
      // Calculate response time
      const startTime = competitionState.startTime || new Date();
      const responseTime = competitionState.timeMode === 'per_question' 
        ? (competitionState.timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT) - competitionState.timeRemaining
        : (new Date().getTime() - startTime.getTime()) / 1000;

      // Get answer history for this question
      const history = competitionState.answerHistory.get(currentIndex);

      const answerData = {
        roomId,
        questionIndex: currentIndex,
        selectedOption: answerText,
        responseTime,
        submittedAt: new Date().toISOString(),
        // Enhanced data for reports
        answerChanges: history?.changesCount || 0,
        answerHistory: history?.selectedAnswers || [],
        totalSelectionTime: responseTime,
      };

      // Send answer via WebSocket
      if (websocket.socket) {
        websocket.socket.emit('participant_answered', answerData);
        
        // Mark as submitted
        setCompetitionState(prev => {
          const newSubmittedAnswers = new Set(prev.submittedAnswers);
          newSubmittedAnswers.add(currentIndex);
          
          const newState = {
            ...prev,
            isSubmitted: true,
            submittedAnswers: newSubmittedAnswers,
          };

          // Save state
          saveQuizState(roomId, newState);
          return newState;
        });
        
        toast.success('Resposta enviada!');
        console.log(`[Submit] Question ${currentIndex}: Submitted "${answerText}" with ${history?.changesCount || 0} changes`);
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Erro ao enviar resposta');
    }
  }, [competitionState.currentQuestionIndex, competitionState.timeRemaining, competitionState.timeMode, competitionState.timePerQuestion, competitionState.startTime, competitionState.answerHistory, competitionState.submittedAnswers, roomId, websocket]);

  // Manual navigation for per_quiz mode with answer restoration
  const goToNextQuestion = useCallback(() => {
    if (competitionState.timeMode !== 'per_quiz') return;
    
    const nextIndex = competitionState.currentQuestionIndex + 1;
    if (nextIndex < competitionState.questions.length) {
      setCompetitionState(prev => {
        const newState = {
          ...prev,
          currentQuestionIndex: nextIndex,
          isSubmitted: prev.submittedAnswers.has(nextIndex),
        };
        saveQuizState(roomId, newState);
        return newState;
      });
      
      // Restore selected answer for this question
      const savedAnswer = competitionState.selectedAnswers.get(nextIndex);
      setSelectedAnswer(savedAnswer || '');
      setFeedback(null);
    }
  }, [competitionState.timeMode, competitionState.currentQuestionIndex, competitionState.questions.length, competitionState.selectedAnswers, competitionState.submittedAnswers, roomId]);

  const goToPreviousQuestion = useCallback(() => {
    if (competitionState.timeMode !== 'per_quiz') return;
    
    const prevIndex = competitionState.currentQuestionIndex - 1;
    if (prevIndex >= 0) {
      setCompetitionState(prev => {
        const newState = {
          ...prev,
          currentQuestionIndex: prevIndex,
          isSubmitted: prev.submittedAnswers.has(prevIndex),
        };
        saveQuizState(roomId, newState);
        return newState;
      });
      
      // Restore selected answer for this question
      const savedAnswer = competitionState.selectedAnswers.get(prevIndex);
      setSelectedAnswer(savedAnswer || '');
      setFeedback(null);
    }
  }, [competitionState.timeMode, competitionState.currentQuestionIndex, competitionState.selectedAnswers, competitionState.submittedAnswers, roomId]);

  // Finish quiz handler
  const handleFinishQuiz = useCallback(() => {
    setCompetitionState(prev => {
      const newState = { ...prev, status: 'finished' as const };
      saveQuizState(roomId, newState);
      return newState;
    });
    
    // Clear quiz state and redirect
    clearQuizState(roomId);
    toast.success('Quiz finalizado com sucesso!');
    router.push(`/rooms/${roomId}/results`);
  }, [roomId, router]);

  // Initialize competition with state restoration
  useEffect(() => {
    const initializeCompetition = async () => {
      if (sessionStatus === 'loading' || !session?.user) return;

      try {
        setLoading(true);
        setError(null);
        
        const roomDetails = await getRoomDetails(roomId);
        if (!roomDetails) {
          setError('Sala não encontrada');
          return;
        }

        console.log('[Compete] Room details loaded:', roomDetails);

        // Set room data
        const roomCompetitionData: RoomData = {
          id: roomDetails.id,
          name: roomDetails.name,
          status: roomDetails.status === 'active' ? 'active' : 
                  roomDetails.status === 'finished' ? 'finished' : 'waiting',
          quizId: roomDetails.quizId,
          quizTitle: roomDetails.quizTitle,
          timeMode: roomDetails.timeMode || 'per_question',
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
          return;
        }

        console.log('[Compete] Questions loaded:', questions.length);

        // Shuffle questions if configured
        if (roomCompetitionData.shuffleQuestions) {
          questions = questions.sort(() => Math.random() - 0.5);
          console.log('[Compete] Questions shuffled');
        }

        // Try to restore previous state
        const savedState = loadQuizState(roomId);
        
        // Calculate time settings based on mode with enhancement
        let timeRemaining = 0;
        let totalQuizTime = 0;
        let startTime = savedState?.startTime ? new Date(savedState.startTime) : new Date();

        if (roomCompetitionData.timeMode === 'per_question') {
          timeRemaining = roomCompetitionData.timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT;
          totalQuizTime = 0; // Not used in per_question mode
        } else {
          // Enhanced per_quiz mode with base time calculation
          totalQuizTime = calculateQuizTime(questions, roomCompetitionData.timeMode, roomCompetitionData.timePerQuestion, roomCompetitionData.timePerQuiz);
          
          if (savedState?.startTime) {
            // Calculate remaining time based on elapsed time since start
            const elapsedSeconds = Math.floor((new Date().getTime() - new Date(savedState.startTime).getTime()) / 1000);
            timeRemaining = Math.max(0, totalQuizTime - elapsedSeconds);
            console.log('[Compete] Restored time state:', { totalQuizTime, elapsedSeconds, timeRemaining });
          } else {
            timeRemaining = totalQuizTime;
          }
        }

        if (isMountedRef.current) {
          const newState: CompetitionState = {
            questions,
            status: 'active',
            timeRemaining,
            totalQuizTime,
            timeMode: roomCompetitionData.timeMode,
            timePerQuestion: roomCompetitionData.timePerQuestion,
            timePerQuiz: roomCompetitionData.timePerQuiz,
            startTime,
            // Restore or initialize state
            currentQuestionIndex: savedState?.currentQuestionIndex || 0,
            userScore: savedState?.userScore || 0,
            isSubmitted: savedState?.isSubmitted || false,
            showResults: savedState?.showResults || false,
            selectedAnswers: savedState?.selectedAnswers || new Map(),
            answerHistory: savedState?.answerHistory || new Map(),
            submittedAnswers: savedState?.submittedAnswers || new Set(),
          };

          setCompetitionState(newState);
          
          // Restore selected answer for current question
          const currentAnswer = newState.selectedAnswers.get(newState.currentQuestionIndex);
          setSelectedAnswer(currentAnswer || '');
          
          // Save the complete state
          saveQuizState(roomId, newState);
          
          setLoading(false);
          
          if (savedState) {
            toast.success('Estado da competição restaurado!');
          } else {
            toast.success('Competição carregada! Boa sorte!');
          }
        }

      } catch (err) {
        console.error('Error initializing competition:', err);
        if (isMountedRef.current) {
          setError('Erro ao carregar competição');
          setLoading(false);
        }
      }
    };

    if (roomId) {
      initializeCompetition();
    }
  }, [roomId, sessionStatus, session]);

  // WebSocket event listeners
  useEffect(() => {
    if (!websocket.connectionState.isConnected || !roomId) return;

    // Use socket.on instead of addEventListener
    const handleAnswerSubmitted = (data: any) => {
      console.log('[WebSocket] Answer submitted response:', data);
      
      if (data.success && isMountedRef.current) {
        setCompetitionState(prev => {
          const newState = {
            ...prev,
            userScore: data.score || prev.userScore,
            isSubmitted: true,
          };
          saveQuizState(roomId, newState);
          return newState;
        });

        toast.success('Answer submitted successfully!');
        
        // Auto-advance if configured
        if (data.autoAdvance) {
          setTimeout(() => {
            if (isMountedRef.current) {
              setCompetitionState(prev => {
                const newState = {
                  ...prev,
                  currentQuestionIndex: prev.currentQuestionIndex + 1,
                  timeRemaining: prev.timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT,
                  isSubmitted: false,
                };
                saveQuizState(roomId, newState);
                return newState;
              });
              setSelectedAnswer('');
              setFeedback(null);
            }
          }, 1500);
        }
      } else if (!data.success) {
        console.error('[WebSocket] Failed to submit answer:', data.error);
        toast.error(data.error || 'Failed to submit answer');
      }
    };

    websocket.socket?.on('answer_submitted', handleAnswerSubmitted);

    return () => {
      websocket.socket?.off('answer_submitted', handleAnswerSubmitted);
    };
  }, [websocket.connectionState.isConnected, websocket.socket, roomId]);

  // Enhanced timer countdown with persistence
  useEffect(() => {
    if (competitionState.status !== 'active' || competitionState.timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setCompetitionState(prev => {
        if (prev.timeRemaining <= 1) {
          // Time's up behavior depends on mode
          if (prev.timeMode === 'per_question') {
            // Auto-submit if answer selected, then move to next
            if (selectedAnswer) {
              handleAnswerSubmit(selectedAnswer);
            } else {
              // Move to next question without answer
              setTimeout(() => {
                if (isMountedRef.current) {
                  const newState = {
                    ...prev,
                    currentQuestionIndex: prev.currentQuestionIndex + 1,
                    timeRemaining: prev.timePerQuestion || DEFAULT_QUESTION_TIME_LIMIT,
                  };
                  setCompetitionState(newState);
                  saveQuizState(roomId, newState);
                  setSelectedAnswer('');
                }
              }, 500);
            }
          } else {
            // per_quiz mode - quiz is finished
            toast.error('Tempo esgotado! Quiz finalizado.');
            clearQuizState(roomId);
          }
          return { ...prev, timeRemaining: 0 };
        }
        
        const newState = { ...prev, timeRemaining: prev.timeRemaining - 1 };
        
        // Save state every 10 seconds to reduce localStorage writes
        if (newState.timeRemaining % 10 === 0) {
          saveQuizState(roomId, newState);
        }
        
        return newState;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [competitionState.status, competitionState.timeRemaining, competitionState.timeMode, selectedAnswer, handleAnswerSubmit, roomId]);

  // Clear state when quiz is finished
  useEffect(() => {
    if (competitionState.status === 'finished') {
      clearQuizState(roomId);
    }
  }, [competitionState.status, roomId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando competição...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = competitionState.questions[competitionState.currentQuestionIndex];
  const isLastQuestion = competitionState.currentQuestionIndex >= competitionState.questions.length - 1;
  const isFirstQuestion = competitionState.currentQuestionIndex === 0;
  const currentQuestionSubmitted = competitionState.submittedAnswers.has(competitionState.currentQuestionIndex);
  const answerHistory = competitionState.answerHistory.get(competitionState.currentQuestionIndex);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Competição Finalizada!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Sua pontuação: {competitionState.userScore}</p>
            <Button onClick={() => router.push(`/rooms/${roomId}/results`)} className="w-full">
              Ver Resultados
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{roomData?.quizTitle || 'Competição'}</h1>
              <p className="text-gray-600">
                Questão {competitionState.currentQuestionIndex + 1} de {competitionState.questions.length}
              </p>
              <p className="text-sm text-gray-500">
                Modo: {competitionState.timeMode === 'per_question' ? 'Tempo por questão' : 'Tempo total do quiz'}
                {competitionState.timeMode === 'per_quiz' && (
                  <span className="ml-2 text-blue-600">
                    (Base: {BASE_TIME_PER_QUESTION}s × {competitionState.questions.length} questões)
                  </span>
                )}
              </p>
              {answerHistory && answerHistory.changesCount > 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  Resposta alterada {answerHistory.changesCount} vez(es)
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-blue-600">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">
                  {competitionState.timeMode === 'per_question' 
                    ? `${competitionState.timeRemaining}s`
                    : formatTime(competitionState.timeRemaining)
                  }
                </span>
              </div>
              <p className="text-sm text-gray-500">Pontuação: {competitionState.userScore}</p>
            </div>
          </div>
          <Progress 
            value={(competitionState.currentQuestionIndex / competitionState.questions.length) * 100} 
            className="mt-4"
          />
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{currentQuestion.question}</span>
              {currentQuestionSubmitted && (
                <Badge variant="secondary" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enviada
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.answers.map((answer, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(answer.text)}
                  disabled={competitionState.timeMode === 'per_question' && currentQuestionSubmitted}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswer === answer.text
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${(competitionState.timeMode === 'per_question' && currentQuestionSubmitted) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{answer.text}</span>
                    {selectedAnswer === answer.text && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`mt-4 p-4 rounded-lg ${
                feedback.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  {feedback.isCorrect ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">
                    {feedback.isCorrect ? 'Correto!' : 'Incorreto'}
                  </span>
                </div>
                {feedback.explanation && (
                  <p className="mt-2 text-sm">{feedback.explanation}</p>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="mt-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                                  {websocket.connectionState.isConnected ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Wifi className="h-4 w-4" />
                    <span className="text-sm">Conectado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm">Desconectado</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 items-center">
                {/* Navigation buttons for per_quiz mode */}
                {competitionState.timeMode === 'per_quiz' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={goToPreviousQuestion}
                      disabled={isFirstQuestion}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={goToNextQuestion}
                      disabled={isLastQuestion}
                      className="flex items-center gap-2"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="destructive"
                      onClick={handleFinishQuiz}
                      className="flex items-center gap-2"
                    >
                      <Trophy className="h-4 w-4" />
                      Finalizar Quiz
                    </Button>
                  </>
                )}
                
                {/* Submit button */}
                <Button
                  onClick={() => handleAnswerSubmit(selectedAnswer)}
                  disabled={!selectedAnswer || (competitionState.timeMode === 'per_question' && currentQuestionSubmitted) || !websocket.connectionState.isConnected}
                  className="px-6"
                >
                  {currentQuestionSubmitted ? 'Enviado' : 'Enviar Resposta'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 