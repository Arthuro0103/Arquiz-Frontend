'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Clock, 
  Trophy, 
  AlertCircle, 
  Target, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Play,
  Pause,
  Square,
  UserCheck,
  UserX,
  Award,
  TrendingUp,
  Eye,
  Timer,
  CheckCircle2,
  XCircle,
  Edit3,
  Crown,
  Ban,
  Copy,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useUnifiedWebSocket } from '@/contexts/UnifiedWebSocketContext';
import { toast } from 'sonner';
import { getRoomDetails } from '@/actions/competitionActions';

// Backend API URL configuration
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:7777";

// Types
interface Answer {
  text: string;
  isCorrect?: boolean;
}

interface Question {
  id: string;
  question: string;
  answers: Answer[];
  correctAnswer: string;
  timeLimit?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

interface ParticipantData {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
  currentQuestionIndex: number;
  score: number;
  status: 'connected' | 'disconnected' | 'answering' | 'finished';
  answeredQuestions: number;
  totalAnswerTime: number;
  averageResponseTime: number;
  answerHistory: AnswerRecord[];
  isOnline: boolean;
  lastActivity: Date;
}

interface AnswerRecord {
  questionIndex: number;
  selectedAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  submittedAt: Date;
  answerChanges: number;
}

interface RoomData {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'active' | 'finished';
  participantCount: number;
  maxParticipants: number;
  accessCode: string;
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  quiz?: {
    id: string;
    title: string;
    description?: string;
    questions: Question[];
  };
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  settings?: {
    allowLateJoin?: boolean;
    showCorrectAnswers?: boolean;
    randomizeQuestions?: boolean;
  };
}

interface MonitoringState {
  status: 'waiting' | 'active' | 'paused' | 'finished' | 'pending';
  currentQuestionIndex: number;
  questions: Question[];
  participants: Map<string, ParticipantData>;
  timeRemaining: number;
  totalQuizTime: number;
  timeMode: 'per_question' | 'per_quiz';
  startTime: Date | null;
  // Statistics
  totalParticipants: number;
  activeParticipants: number;
  completedParticipants: number;
  averageScore: number;
  questionsAnswered: number;
}

// Utility functions
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
};

const getScoreColor = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-yellow-600';
  if (percentage >= 50) return 'text-orange-600';
  return 'text-red-600';
};

const getPerformanceLevel = (score: number, maxScore: number): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 70) return 'Good';
  if (percentage >= 50) return 'Average';
  return 'Needs Improvement';
};

const getDifficultyColor = (difficulty?: string): string => {
  switch (difficulty) {
    case 'easy': return 'text-green-600 bg-green-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'hard': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};

const getConnectionQualityColor = (isOnline: boolean): string => {
  return isOnline ? 'text-green-600' : 'text-red-600';
};

const getParticipantStatusColor = (status: string): string => {
  switch (status) {
    case 'connected': return 'text-green-600';
    case 'answering': return 'text-blue-600';
    case 'finished': return 'text-purple-600';
    default: return 'text-gray-600';
  }
};

const getParticipantStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'connected':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'answering':
      return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
    case 'finished':
      return <Trophy className="h-4 w-4 text-purple-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

export default function RoomMonitoringPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const roomId = params.roomId as string;
  const websocket = useUnifiedWebSocket();
  const isMountedRef = useRef(true);

  // Enhanced monitoring state
  const [monitoringState, setMonitoringState] = useState<MonitoringState>({
    status: 'waiting',
    currentQuestionIndex: 0,
    questions: [],
    participants: new Map(),
    timeRemaining: 0,
    totalQuizTime: 0,
    timeMode: 'per_question',
    startTime: null,
    // Statistics
    totalParticipants: 0,
    activeParticipants: 0,
    completedParticipants: 0,
    averageScore: 0,
    questionsAnswered: 0,
  });

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [kickingParticipant, setKickingParticipant] = useState<string | null>(null);
  const [isKickDialogOpen, setIsKickDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<{ id: string; name: string } | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Kick participant handler
  const handleKickParticipant = async () => {
    if (!roomId || !websocket.connectionState.isConnected || !selectedParticipant) {
      toast.error('Cannot remove participant: WebSocket not connected');
      return;
    }

    try {
      setKickingParticipant(selectedParticipant.id);
      
      const reason = `Removed by room administrator`;
      
      // TODO: Implement kickParticipant method in WebSocket context
      // await websocket.kickParticipant(roomId, selectedParticipant.id, reason);
      
      // For now, use socket emit directly
      websocket.socket?.emit('kickParticipant', {
        roomId: roomId,
        participantId: selectedParticipant.id,
        reason
      });
      
      toast.success(`${selectedParticipant.name} was successfully removed from the room`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error removing ${selectedParticipant.name}: ${errorMsg}`);
    } finally {
      setKickingParticipant(null);
      setIsKickDialogOpen(false);
      setSelectedParticipant(null);
    }
  };

  // Authentication and permission check
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated' || !session?.user) {
      toast.error('Você precisa estar logado para monitorar');
      router.push('/auth/signin');
      return;
    }
    
         // Additional check: Only room creators can monitor
     if (roomData && roomData.createdAt && session.user.id !== roomData.createdAt.toISOString().split('T')[0]) { // Assuming createdAt is in YYYY-MM-DD format
       toast.error('Apenas o criador da sala pode monitorar');
       router.push(`/rooms/${roomId}`);
       return;
     }
  }, [sessionStatus, session, router, roomData, roomId]);

  // Update statistics when participants change
  const updateStatistics = useCallback((participants: Map<string, ParticipantData>) => {
    const participantsList = Array.from(participants.values());
    
    const totalParticipants = participantsList.length;
    const activeParticipants = participantsList.filter(p => p.isOnline && p.status !== 'disconnected').length;
    const completedParticipants = participantsList.filter(p => p.status === 'finished').length;
    
    const totalScore = participantsList.reduce((sum, p) => sum + p.score, 0);
    const averageScore = totalParticipants > 0 ? totalScore / totalParticipants : 0;
    
    const totalAnswers = participantsList.reduce((sum, p) => sum + p.answeredQuestions, 0);
    
    setMonitoringState(prev => ({
      ...prev,
      totalParticipants,
      activeParticipants,
      completedParticipants,
      averageScore,
      questionsAnswered: totalAnswers,
    }));
  }, []);

  // Initialize monitoring
  useEffect(() => {
    const initializeMonitoring = async () => {
      if (sessionStatus === 'loading' || !session?.user) return;

      try {
        setLoading(true);
        setError(null);
        
        const roomDetails = await getRoomDetails(roomId);
        if (!roomDetails) {
          setError('Sala não encontrada');
          return;
        }

        console.log('[Monitoring] Room details loaded:', roomDetails);

        // Set room data
                  const roomMonitoringData: RoomData = {
            id: roomDetails.id,
            name: roomDetails.name,
            status: roomDetails.status === 'active' ? 'active' : 
                    roomDetails.status === 'finished' ? 'finished' : 'pending',
            participantCount: roomDetails.participantCount || 0,
            maxParticipants: roomDetails.maxParticipants || 0,
            accessCode: roomDetails.accessCode || '',
            timeMode: roomDetails.timeMode || 'per_question',
            timePerQuestion: roomDetails.timePerQuestion,
            timePerQuiz: roomDetails.timePerQuiz,
            createdAt: new Date(roomDetails.createdAt || new Date()),
            startedAt: undefined,
            endedAt: undefined,
            settings: undefined,
            quiz: undefined,
          };

        setRoomData(roomMonitoringData);

        // Fetch quiz questions
        const questions = roomMonitoringData.quiz?.questions || [];
        
        if (questions.length === 0) {
          setError('Nenhuma questão encontrada para este quiz');
          return;
        }

        console.log('[Monitoring] Questions loaded:', questions.length);

        // Calculate time settings with enhancement - synchronized with compete page
        let timeRemaining = 0;
        let totalQuizTime = 0;
        let startTime = (roomDetails as any).startedAt ? new Date((roomDetails as any).startedAt) : null;

        if (roomMonitoringData.timeMode === 'per_question') {
          timeRemaining = roomMonitoringData.timePerQuestion || 30; // Default to 30 seconds
        } else {
          // Enhanced per_quiz mode with base time calculation: 60 seconds × question quantity
          totalQuizTime = questions.length * 60; // Assuming 60 seconds per question for base time
          
          if (startTime && roomMonitoringData.status === 'active') {
            // Calculate remaining time based on elapsed time since start
            const elapsedSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
            timeRemaining = Math.max(0, totalQuizTime - elapsedSeconds);
            console.log('[Monitoring] Time state:', { totalQuizTime, elapsedSeconds, timeRemaining, startTime: startTime.toISOString() });
          } else {
            timeRemaining = totalQuizTime;
          }
        }

        if (isMountedRef.current) {
          setMonitoringState(prev => ({
            ...prev,
            questions,
            status: roomMonitoringData.status,
            timeRemaining,
            totalQuizTime,
            timeMode: roomMonitoringData.timeMode,
            timePerQuestion: roomMonitoringData.timePerQuestion,
            timePerQuiz: roomMonitoringData.timePerQuiz,
            startTime,
            currentQuestionIndex: (roomDetails as any).currentQuestionIndex || 0,
          }));
          
          setLoading(false);
          toast.success('Monitoramento inicializado!');
        }

      } catch (err) {
        console.error('Error initializing monitoring:', err);
        if (isMountedRef.current) {
          setError('Erro ao carregar monitoramento');
          setLoading(false);
        }
      }
    };

    if (roomId) {
      initializeMonitoring();
    }
  }, [roomId, sessionStatus, session]);

  // Enhanced WebSocket event listeners for monitoring
  useEffect(() => {
    if (!websocket.connectionState.isConnected || !roomId) return;

    console.log('[Monitoring] Setting up WebSocket listeners for room:', roomId);

    // Participant join event
    const unsubscribeParticipantJoined = websocket.addEventListener('participant_joined', (data: any) => {
      console.log('[Monitoring] Participant joined:', data);
      
      if (data.participant && isMountedRef.current) {
        setMonitoringState(prev => {
          const newParticipants = new Map(prev.participants);
          const participant: ParticipantData = {
            id: data.participant.id,
            name: data.participant.name || data.participant.email || 'Participante',
            email: data.participant.email,
            joinedAt: new Date(data.participant.joinedAt || new Date()),
            currentQuestionIndex: 0,
            score: 0,
            status: 'connected',
            answeredQuestions: 0,
            totalAnswerTime: 0,
            averageResponseTime: 0,
            answerHistory: [],
            isOnline: true,
            lastActivity: new Date(),
          };
          
          newParticipants.set(participant.id, participant);
          
          return { ...prev, participants: newParticipants };
        });
        
        toast.success(`${data.participant.name || 'Participante'} entrou na sala`);
        setLastUpdate(new Date());
      }
    });

    // Participant left event
    const unsubscribeParticipantLeft = websocket.addEventListener('participant_left', (data: any) => {
      console.log('[Monitoring] Participant left:', data);
      
      if (data.participantId && isMountedRef.current) {
        setMonitoringState(prev => {
          const newParticipants = new Map(prev.participants);
          const participant = newParticipants.get(data.participantId);
          
          if (participant) {
            newParticipants.delete(data.participantId);
            toast.info(`${participant.name} saiu da sala`);
          }
          
          return { ...prev, participants: newParticipants };
        });
        
        setLastUpdate(new Date());
      }
    });

    // Answer submitted event
    const unsubscribeParticipantAnswered = websocket.addEventListener('participant_answered', (data: any) => {
      console.log('[Monitoring] Participant answered:', data);
      
      if (data.participantId && isMountedRef.current) {
        setMonitoringState(prev => {
          const newParticipants = new Map(prev.participants);
          const participant = newParticipants.get(data.participantId);
          
          if (participant) {
            // Update participant answer history
            const answerRecord = {
              questionIndex: data.questionIndex || 0,
              selectedAnswer: data.selectedOption || '',
              isCorrect: data.isCorrect || false,
              responseTime: data.responseTime || 0,
              submittedAt: new Date(data.submittedAt || new Date()),
              answerChanges: data.answerChanges || 0,
            };
            
            participant.answerHistory.push(answerRecord);
            participant.answeredQuestions = participant.answerHistory.length;
            participant.score = data.score || participant.score;
            participant.status = data.isCorrect ? 'connected' : 'connected';
            participant.currentQuestionIndex = Math.max(participant.currentQuestionIndex, data.questionIndex + 1);
            participant.totalAnswerTime += answerRecord.responseTime;
            participant.averageResponseTime = participant.totalAnswerTime / participant.answeredQuestions;
            participant.lastActivity = new Date();
            
            newParticipants.set(data.participantId, participant);
          }
          
          return { ...prev, participants: newParticipants };
        });
        
        setLastUpdate(new Date());
      }
    });

    // Participants updated event (bulk update)
    const unsubscribeParticipantsUpdated = websocket.addEventListener('participants_updated', (data: any) => {
      console.log('[Monitoring] Participants updated:', data);
      
      if (data.participants && Array.isArray(data.participants) && isMountedRef.current) {
        setMonitoringState(prev => {
          const newParticipants = new Map();
          
          data.participants.forEach((p: any) => {
            const participant: ParticipantData = {
              id: p.id,
              name: p.name || p.email || 'Participante',
              email: p.email,
              joinedAt: new Date(p.joinedAt || new Date()),
              currentQuestionIndex: p.currentQuestionIndex || 0,
              score: p.score || 0,
              status: p.status || 'connected',
              answeredQuestions: p.answeredQuestions || 0,
              totalAnswerTime: p.totalAnswerTime || 0,
              averageResponseTime: p.averageResponseTime || 0,
              answerHistory: p.answerHistory || [],
              isOnline: p.isOnline !== false,
              lastActivity: new Date(p.lastActivity || new Date()),
            };
            
            newParticipants.set(participant.id, participant);
          });
          
          return { ...prev, participants: newParticipants };
        });
        
        setLastUpdate(new Date());
      }
    });

    // Room status changed
    const unsubscribeRoomStatusChanged = websocket.addEventListener('room_status_changed', (data: any) => {
      console.log('[Monitoring] Room status changed:', data);
      
      if (data.status && isMountedRef.current) {
        setMonitoringState(prev => ({
          ...prev, 
          status: data.status,
          startTime: data.startTime ? new Date(data.startTime) : prev.startTime,
        }));
        
        if (data.status === 'active') {
          toast.success('Quiz iniciado!');
        } else if (data.status === 'paused') {
          toast.info('Quiz pausado');
        } else if (data.status === 'finished') {
          toast.success('Quiz finalizado!');
        }
        
        setLastUpdate(new Date());
      }
    });

    return () => {
      unsubscribeParticipantJoined();
      unsubscribeParticipantLeft();
      unsubscribeParticipantAnswered();
      unsubscribeParticipantsUpdated();
      unsubscribeRoomStatusChanged();
    };
  }, [websocket, roomId]);

  // Enhanced timer countdown
  useEffect(() => {
    if (monitoringState.status !== 'active' || monitoringState.timeRemaining <= 0) return;
      
    const timer = setInterval(() => {
      setMonitoringState(prev => {
        if (prev.timeRemaining <= 1) {
          if (prev.timeMode === 'per_quiz') {
            toast.error('Tempo esgotado! Quiz finalizado.');
          }
          return { ...prev, timeRemaining: 0, status: 'finished' };
        }
        
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [monitoringState.status, monitoringState.timeRemaining, monitoringState.timeMode]);

  // Continue with rest of the component...
  // [Rest of the component remains the same]
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{roomData?.name || 'Room Monitor'}</h1>
          <p className="text-gray-600">Monitor quiz progress and participants</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={websocket.connectionState.isConnected ? 'default' : 'destructive'}>
            {websocket.connectionState.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge variant="outline">
            {monitoringState.status}
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Participants</p>
                <p className="text-2xl font-bold">{monitoringState.participants.size}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Participants</p>
                <p className="text-2xl font-bold">
                  {Array.from(monitoringState.participants.values()).filter(p => p.isOnline).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">
                  {monitoringState.participants.size > 0 
                    ? Math.round(Array.from(monitoringState.participants.values()).reduce((sum, p) => sum + p.score, 0) / monitoringState.participants.size)
                    : 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Time Remaining</p>
                <p className="text-2xl font-bold">{formatTime(monitoringState.timeRemaining)}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          {monitoringState.participants.size === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No participants yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">Progress</th>
                    <th className="text-left p-2">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(monitoringState.participants.values()).map((participant) => (
                    <tr key={participant.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getConnectionQualityColor(participant.isOnline)}`} />
                          <span className="font-medium">{participant.name}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className={getParticipantStatusColor(participant.status)}>
                          {participant.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">{participant.score}</span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          <Progress 
                            value={(participant.currentQuestionIndex / Math.max(monitoringState.questions.length, 1)) * 100} 
                            className="w-16" 
                          />
                          <span className="text-sm text-gray-500">
                            {participant.currentQuestionIndex}/{monitoringState.questions.length}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className="text-sm text-gray-500">
                          {formatRelativeTime(participant.lastActivity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 