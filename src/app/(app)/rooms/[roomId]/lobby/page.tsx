'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEnhancedWebSocketContext } from '@/contexts/EnhancedWebSocketContext';
import { getRoomDetails } from '@/actions/competitionActions';
import { toast } from 'sonner';
import { 
  Users, 
  Play, 
  Settings, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Clock,
  Shield,
  Globe,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Activity,
  TrendingUp,
  Calendar,
  Timer,
  Volume2,
  VolumeX,
  Maximize2,
  Copy,
  Share2,
  Star,
  Crown,
  GraduationCap,
  UserCheck,
  UserX,
  Signal,
  Zap,
  Heart,
  MessageCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Hash,
  Tag,
  BarChart3,
  Tags
} from 'lucide-react';

// Enhanced Types
interface Participant {
  id: string;
  name: string;
  email: string;
  joinedAt: Date;
  status: 'connected' | 'ready' | 'disconnected' | 'answering' | 'finished';
  lastActivity: Date;
  isHost?: boolean;
  role?: 'teacher' | 'student';
  user?: {
    name?: string;
    email?: string;
  };
  avatar?: string;
  score?: number;
  questionsAnswered?: number;
  averageResponseTime?: number;
  connectionQuality?: 'excellent' | 'good' | 'poor';
  // Standard WebSocket participant info
  userId?: string;
  currentQuestionIndex?: number;
}

interface RoomDetails {
  id: string;
  name: string;
  description?: string;
  quizTitle: string;
  participants: Participant[];
  status: 'waiting' | 'in-progress' | 'finished';
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  roomType: 'public' | 'private';
  accessCode: string;
  maxParticipants?: number;
  createdAt?: Date;
  startedAt?: Date;
  estimatedDuration?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

interface RoomActivity {
  id: string;
  type: 'participant_joined' | 'participant_left' | 'room_created' | 'settings_changed';
  message: string;
  timestamp: Date;
  participantName?: string;
  participantRole?: string;
}

// Utility Functions
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s atrás`;
  if (minutes < 60) return `${minutes}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return date.toLocaleDateString('pt-BR');
}

function mapQuizDifficulty(difficulty: unknown): 'easy' | 'medium' | 'hard' {
  if (typeof difficulty === 'string') {
    switch (difficulty.toLowerCase()) {
      case 'easy':
      case 'fácil':
        return 'easy';
      case 'hard':
      case 'difícil':
        return 'hard';
      case 'mixed':
      case 'misto':
        return 'medium'; // Map mixed to medium as fallback
      default:
        return 'medium';
    }
  }
  return 'medium';
}

function getConnectionQualityColor(quality?: string) {
  switch (quality) {
    case 'excellent': return 'text-green-600';
    case 'good': return 'text-yellow-600';
    case 'poor': return 'text-red-600';
    default: return 'text-gray-400';
  }
}

function getConnectionQualityIcon(quality?: string) {
  switch (quality) {
    case 'excellent': return <Signal className="h-3 w-3" />;
    case 'good': return <Signal className="h-3 w-3" />;
    case 'poor': return <Signal className="h-3 w-3" />;
    default: return <WifiOff className="h-3 w-3" />;
  }
}

export default function EnhancedRoomLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const roomId = params.roomId as string;
  
  // Room State
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Join State
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [isManuallyReconnecting, setIsManuallyReconnecting] = useState(false);
  const [lastJoinTime, setLastJoinTime] = useState<number | null>(null);
  
  // Join Form State
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('participants');
  const [showAdvancedInfo, setShowAdvancedInfo] = useState(false);
  const [showConnectionDebug, setShowConnectionDebug] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  
  // Activity State
  const [roomActivity, setRoomActivity] = useState<RoomActivity[]>([]);
  
  // WebSocket
  const websocket = useEnhancedWebSocketContext();

  // Memoized participants with enhanced data
  const participantsMemoized = useMemo(() => {
    if (!websocket.participants.length) return [];
    
    return websocket.participants
      .filter(p => {
        // Teachers see all participants, students don't see teachers
        const isTeacher = session?.user?.role === 'teacher' || session?.user?.role === 'admin' || websocket.currentRole === 'teacher';
        
        // If current user is a teacher, show everyone
        if (isTeacher) {
          return true;
        }
        
        // If not a teacher, filter out teachers/hosts
        if (p.role === 'teacher' || p.isHost) {
          return false;
        }
        
        return true;
      })
      .map((p) => ({
        ...p,
        id: p.id || p.email || 'unknown',
        name: p.name || p.email || 'Usuário Anônimo',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'User')}&background=random`,
        score: p.score || 0,
        questionsAnswered: p.currentQuestionIndex || 0,
        averageResponseTime: 0,
        connectionQuality: 'good' as const,
        joinedAt: new Date(p.lastActivity || new Date()),
        lastActivity: p.lastActivity || new Date().toISOString()
      }));
  }, [websocket.participants, session?.user?.role, websocket.currentRole]);

  // Enhanced current user identification with more robust matching
  const currentUserParticipant = useMemo(() => {
    const sessionUser = session?.user;
    if (!sessionUser) return null;

    console.log('[Lobby] 🔍 PARTICIPANT MATCHING DEBUG:', {
      sessionUser: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.role
      },
      playerName,
      participantCount: participantsMemoized.length,
      participants: participantsMemoized.map(p => ({
        id: p.id,
        userId: p.userId,
        name: p.name,
        email: p.email
      }))
    });

    const foundParticipant = participantsMemoized.find(p => {
      // Primary matching by session user ID
      if (sessionUser.id && (p.id === sessionUser.id || p.userId === sessionUser.id)) {
        console.log('[Lobby] ✅ MATCH FOUND: Session user ID match', { sessionUserId: sessionUser.id, participantId: p.id, participantUserId: p.userId });
        return true;
      }
      
      // Secondary matching by email
      if (sessionUser.email && p.email === sessionUser.email) {
        console.log('[Lobby] ✅ MATCH FOUND: Email match', { sessionUserEmail: sessionUser.email, participantEmail: p.email });
        return true;
      }
      
      // Tertiary matching by name (exact match)
      if (sessionUser.name && p.name === sessionUser.name) {
        console.log('[Lobby] ✅ MATCH FOUND: Name match', { sessionUserName: sessionUser.name, participantName: p.name });
        return true;
      }
      
      // Quaternary matching by player name (what user entered)
      if (playerName && p.name === playerName.trim()) {
        console.log('[Lobby] ✅ MATCH FOUND: Player name match', { playerName, participantName: p.name });
        return true;
      }
      
      // Additional matching by userId from WebSocket participant data
      if (sessionUser.id && p.userId === sessionUser.id) {
        console.log('[Lobby] ✅ MATCH FOUND: WebSocket userId match', { sessionUserId: sessionUser.id, participantUserId: p.userId });
        return true;
      }
      
      return false;
    }) || null;

    console.log('[Lobby] 🎯 FINAL PARTICIPANT MATCH RESULT:', {
      found: !!foundParticipant,
      participant: foundParticipant ? {
        id: foundParticipant.id,
        name: foundParticipant.name,
        email: foundParticipant.email
      } : null
    });

    return foundParticipant;
  }, [participantsMemoized, session?.user, playerName]);

  // Enhanced Statistics
  const roomStats = useMemo(() => {
    const totalParticipants = participantsMemoized.length;
    const connectedParticipants = participantsMemoized.filter(p => p.status === 'connected').length;
    const teachers = participantsMemoized.filter(p => p.role === 'teacher' || p.isHost).length;
    const students = totalParticipants - teachers;
    
    return {
      totalParticipants,
      connectedParticipants,
      teachers,
      students,
      connectionRate: totalParticipants > 0 ? Math.round((connectedParticipants / totalParticipants) * 100) : 0,
      averageConnectionTime: participantsMemoized.reduce((acc, p) => acc + (Date.now() - p.joinedAt.getTime()), 0) / Math.max(totalParticipants, 1)
    };
  }, [participantsMemoized]);

  // Sound notification function
  const playNotificationSound = useCallback((type: 'join' | 'leave' | 'error' | 'success') => {
    if (!soundEnabled) return;
    
    // Create audio context and play appropriate sound
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const frequency = type === 'error' ? 400 : type === 'success' ? 800 : 600;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }, [soundEnabled]);

  // Room activity logging
  const addActivity = useCallback((type: RoomActivity['type'], message: string, participantName?: string) => {
    const activity: RoomActivity = {
      id: Date.now().toString(),
      type,
      message,
      participantName,
      timestamp: new Date()
    };
    
    setRoomActivity(prev => [activity, ...prev.slice(0, 49)]); // Keep last 50 activities
  }, []);

  // Enhanced join room handler
  const handleJoinRoom = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setIsJoining(true);
      setJoinError(null);
      
      if (!playerName.trim()) {
        setJoinError('Por favor, insira seu nome no jogo');
        return;
      }
      
      if (roomDetails?.roomType === 'private' && !accessCodeInput.trim()) {
        setJoinError('Esta é uma sala privada. Por favor, insira o código de acesso');
        return;
      }
      
      if (roomDetails?.roomType === 'private' && accessCodeInput.trim() !== roomDetails.accessCode) {
        setJoinError('Código de acesso incorreto');
        return;
      }
      
      if (!websocket.isConnected) {
        setJoinError('Conexão perdida. Aguarde a reconexão...');
        return;
      }
      
      console.log('[Lobby] 🚪 Attempting to join room', { playerName, roomId: roomDetails?.id });
      
      const joinData = {
        roomId: roomDetails!.id,
        accessCode: roomDetails!.accessCode || '',
        name: playerName.trim(),
        role: 'student' as const
      };
      
      await websocket.joinRoom(joinData);
      
      setHasJoinedRoom(true);
      setShowJoinForm(false);
      playNotificationSound('success');
      toast.success(`Bem-vindo à sala, ${playerName}!`);
      addActivity('participant_joined', `${playerName} entrou na sala`, playerName);
      
      // Removed excessive sync calls - let natural sync handle this
      
    } catch (err: unknown) {
      console.error('[Lobby] ❌ Failed to join room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao entrar na sala. Tente novamente.';
      setJoinError(errorMessage);
      playNotificationSound('error');
    } finally {
      setIsJoining(false);
    }
  }, [playerName, accessCodeInput, websocket, roomDetails, addActivity, playNotificationSound]);

  // Copy access code to clipboard
  const copyAccessCode = useCallback(async () => {
    if (!roomDetails?.accessCode) return;
    
    try {
      await navigator.clipboard.writeText(roomDetails.accessCode);
      toast.success('Código copiado para a área de transferência!');
    } catch {
      toast.error('Falha ao copiar código');
    }
  }, [roomDetails?.accessCode]);

  // Share room functionality
  const shareRoom = useCallback(async () => {
    if (!roomDetails) return;
    
    const shareData = {
      title: `Quiz: ${roomDetails.quizTitle}`,
      text: `Junte-se à sala &quot;${roomDetails.name}&quot;`,
      url: window.location.href
    };
    
    try {
      if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n\nAcesse: ${shareData.url}\nCódigo: ${roomDetails.accessCode}`);
        toast.success('Link da sala copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [roomDetails]);

  // Enhanced manual reconnection
  const handleManualReconnect = async () => {
    setIsManuallyReconnecting(true);
    setHasJoinedRoom(false);
    setError(null);
    
    try {
      // Force page refresh to reinitialize WebSocket connection
      await handleRefresh();
      toast.success('Reconexão iniciada com sucesso');
    } catch {
      console.error('[Lobby] Manual reconnection failed');
      toast.error('Falha na reconexão manual');
    } finally {
      setIsManuallyReconnecting(false);
    }
  };

  // Fetch room details
  const fetchRoomDetails = useCallback(async () => {
    if (!session?.user) {
      setError('Você precisa estar logado para acessar a sala');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const details = await getRoomDetails(roomId);
      
      if (!details) {
        throw new Error('Detalhes da sala não encontrados');
      }
      
      const roomData: RoomDetails = {
        id: details.id,
        name: details.name,
        description: details.description,
        quizTitle: details.quizTitle,
        participants: [],
        status: details.status === 'active' ? 'in-progress' : 
                details.status === 'finished' ? 'finished' : 'waiting',
        timeMode: details.timeMode || 'per_question',
        timePerQuestion: details.timePerQuestion || 30,
        timePerQuiz: details.timePerQuiz || 600,
        roomType: details.roomType || 'public',
        accessCode: details.accessCode || '',
        maxParticipants: details.maxParticipants || 50,
        createdAt: details.createdAt ? new Date(details.createdAt) : new Date(),
        startedAt: undefined,
        estimatedDuration: details.timePerQuiz || (details.timePerQuestion || 30) * 20,
        category: 'Geral',
        difficulty: mapQuizDifficulty(details.quizDifficulty),
        tags: []
      };
      
      setRoomDetails(roomData);
      addActivity('room_created', `Sala &quot;${roomData.name}&quot; carregada`);
      
    } catch (error) {
      console.error('[Lobby] ❌ Failed to fetch room details:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          setError('Sua sessão expirou. Por favor, faça login novamente.');
          setTimeout(() => router.push('/auth/signin'), 3000);
        } else {
          setError(`Erro ao carregar dados da sala: ${error.message}`);
        }
      } else {
        setError('Erro desconhecido ao carregar a sala');
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, session?.user, router, addActivity]);

  // Enhanced refresh function
  const handleRefresh = async () => {
    if (!roomId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const details = await getRoomDetails(roomId);
      if (!details) {
        setError('Sala não encontrada ou acesso negado');
        return;
      }

      const roomData: RoomDetails = {
        id: details.id,
        name: details.name,
        description: details.description,
        quizTitle: details.quizTitle,
        participants: [],
        status: details.status === 'active' ? 'in-progress' : 
                details.status === 'finished' ? 'finished' : 'waiting',
        timeMode: details.timeMode || 'per_question',
        timePerQuestion: details.timePerQuestion || 30,
        timePerQuiz: details.timePerQuiz || 600,
        roomType: details.roomType || 'public',
        accessCode: details.accessCode || '',
        maxParticipants: details.maxParticipants || 50,
        createdAt: details.createdAt ? new Date(details.createdAt) : new Date(),
        startedAt: undefined,
        estimatedDuration: details.timePerQuiz || (details.timePerQuestion || 30) * 20,
        category: 'Geral',
        difficulty: mapQuizDifficulty(details.quizDifficulty),
        tags: []
      };

      setRoomDetails(roomData);
      setHasJoinedRoom(false);

      if (websocket.isConnected && roomData.id) {
        // Removed sync call - let natural sync handle this
        toast.success('Dados da sala atualizados');
        addActivity('settings_changed', 'Dados da sala foram atualizados');
      }
      
    } catch (err) {
      console.error('[Lobby] Error during manual refresh:', err);
      setError('Falha ao atualizar informações da sala. Tente novamente.');
      toast.error('Erro ao atualizar sala');
    } finally {
      setLoading(false);
    }
  };

  // Auto-hide join form when user is detected in participants
  useEffect(() => {
    if (currentUserParticipant && showJoinForm) {
      setShowJoinForm(false);
      setHasJoinedRoom(true);
      setJoinError(null);
      
      if (!hasJoinedRoom) {
        toast.success(`Conectado como ${currentUserParticipant.name}!`);
      }
    }
  }, [currentUserParticipant, showJoinForm, hasJoinedRoom]);

  // Reset join form if user disappears from participants (with safeguards)
  useEffect(() => {
    const timeSinceJoin = lastJoinTime ? Date.now() - lastJoinTime : Infinity;
    const MIN_TIME_BEFORE_RESET = 10000; // 10 seconds

    if (!currentUserParticipant && 
        hasJoinedRoom && 
        !showJoinForm && 
        websocket.isConnected && 
        timeSinceJoin > MIN_TIME_BEFORE_RESET) {
      setShowJoinForm(true);
      setHasJoinedRoom(false);
      setLastJoinTime(null);
    }
  }, [currentUserParticipant, hasJoinedRoom, showJoinForm, websocket.isConnected, lastJoinTime]);

  // Initial load
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    fetchRoomDetails();
  }, [sessionStatus, fetchRoomDetails, router]);

  // Set up initial player name from session
  useEffect(() => {
    if (session?.user?.name && !playerName) {
      setPlayerName(session.user.name);
    }
  }, [session?.user?.name, playerName]);

  // WebSocket event listeners
  useEffect(() => {
    if (!websocket.isConnected || !roomId) return;

    const unsubscribeParticipantJoined = websocket.addEventListener('participant_joined', (data: unknown) => {
      const eventData = data as { name?: string; username?: string; participant?: { name?: string; username?: string; role?: string } };
      const participantName = eventData.name || eventData.username || eventData.participant?.name || eventData.participant?.username || 'Usuário Convidado';
      const participantRole = eventData.participant?.role || 'student';
      
      console.log('[Lobby] 👤 Participant joined event received:', { participantName, participantRole, data });
      
      playNotificationSound('join');
      toast.success(`${participantName} entrou na sala`);
      addActivity('participant_joined', `${participantName} entrou na sala`, participantName);
      
      // Removed forced sync - let natural sync handle this
    });

    const unsubscribeParticipantLeft = websocket.addEventListener('participant_left', (data: unknown) => {
      const eventData = data as { name?: string; username?: string; participant?: { name?: string; username?: string; role?: string } };
      const participantName = eventData.name || eventData.username || eventData.participant?.name || eventData.participant?.username || 'Usuário Convidado';
      const participantRole = eventData.participant?.role || 'student';
      
      console.log('[Lobby] 👤 Participant left event received:', { participantName, participantRole, data });
      
      playNotificationSound('leave');
      toast.info(`${participantName} saiu da sala`);
      addActivity('participant_left', `${participantName} saiu da sala`, participantName);
      
      // Removed forced sync - let natural sync handle this
    });

    // New event listener for enhanced sync responses
    const unsubscribeSyncResponse = websocket.addEventListener('sync_response', (data: unknown) => {
      const syncData = data as { participants?: unknown[]; roomData?: unknown };
      console.log('[Lobby] 🔄 Sync response received:', { 
        participantCount: Array.isArray(syncData.participants) ? syncData.participants.length : 0,
        hasRoomData: !!syncData.roomData,
        data: syncData
      });
    });

    // Listen for room status changes
    const unsubscribeRoomStatusChanged = websocket.addEventListener('room_status_changed', (data: unknown) => {
      const statusData = data as { status?: string; roomData?: RoomDetails };
      
      console.log('[Lobby] 🏠 Room status changed:', statusData);
      
      if (statusData.status) {
        setRoomDetails(prev => {
          if (!prev) return prev;
          
          let newStatus: 'waiting' | 'in-progress' | 'finished';
          switch (statusData.status) {
            case 'active':
            case 'in-progress':
              newStatus = 'in-progress';
              break;
            case 'finished':
            case 'ended':
              newStatus = 'finished';
              break;
            default:
              newStatus = 'waiting';
              break;
          }
          
          return { ...prev, status: newStatus };
        });
        
        addActivity('settings_changed', `Status da sala alterado para: ${statusData.status}`);
        
        // Removed forced sync - let natural sync handle this
      }
    });

    const unsubscribeQuizStarted = websocket.addEventListener('quiz_started', () => {
      console.log('[Lobby] 🎯 Quiz started event received');
      
      setRoomDetails(prev => prev ? { ...prev, status: 'in-progress' } : null);
      playNotificationSound('success');
      toast.success('Competição iniciada! Redirecionando...');
      
      setTimeout(() => {
        router.push(`/rooms/${roomId}/compete`);
      }, 2000);
    });

    const unsubscribeKickedFromRoom = websocket.addEventListener('kicked_from_room', () => {
      console.log('[Lobby] 👮 Kicked from room event received');
      
      setHasJoinedRoom(false);
      setRoomDetails(null);
      
      playNotificationSound('error');
      toast.error('Você foi removido da sala pelo host', {
        description: 'Redirecionando para a página de salas...',
        duration: 4000
      });
      
      setTimeout(() => router.push('/rooms'), 2000);
    });

    return () => {
      unsubscribeParticipantJoined();
      unsubscribeParticipantLeft();
      unsubscribeSyncResponse();
      unsubscribeRoomStatusChanged();
      unsubscribeQuizStarted();
      unsubscribeKickedFromRoom();
    };
  }, [websocket, roomId, router, playNotificationSound, addActivity]);

  // Removed aggressive auto-refresh - let intelligent sync handle this

  // Intelligent sync system - single interval with debouncing
  useEffect(() => {
    if (!roomId || !websocket.isConnected) return;

    let lastSyncTime = 0;
    const SYNC_COOLDOWN = 5000; // 5 seconds minimum between syncs

    const performSync = () => {
      const now = Date.now();
      if (now - lastSyncTime < SYNC_COOLDOWN) {
        console.log('[Lobby] 🔄 Sync skipped - cooldown active');
        return;
      }

      console.log('[Lobby] 🔄 Intelligent sync triggered:', {
        timestamp: new Date().toISOString(),
        roomId,
        connected: websocket.isConnected,
        currentParticipants: websocket.participants.length
      });
      
      lastSyncTime = now;
      // Note: Using natural WebSocket events instead of manual sync
    };

    // Initial sync
    performSync();
    
    // Single reasonable interval
    const syncInterval = setInterval(performSync, 30000); // Every 30 seconds only

    return () => {
      clearInterval(syncInterval);
    };
  }, [roomId, websocket.isConnected, websocket]);

  // Removed aggressive participant change detection - let WebSocket events handle this

  // Removed initial sync - let intelligent sync handle this

  // Simplified WebSocket state monitoring (reduced logging)
  useEffect(() => {
    // Only log significant state changes
    if (websocket.isConnected && websocket.currentRoom === roomId) {
      console.log('[Lobby] ✅ WebSocket ready for room:', roomId, 'Participants:', websocket.participants.length);
    }
  }, [websocket.isConnected, websocket.currentRoom, roomId]);

  // Simplified participant change monitoring
  useEffect(() => {
    console.log('[Lobby] 👥 Participants updated:', websocket.participants.length, 'total');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websocket.participants, participantsMemoized, session?.user, websocket.currentRole]);

  // Manual sync function for debugging
  const handleManualSync = () => {
    if (!roomId || !websocket.isConnected) {
      toast.error('WebSocket não está conectado');
      return;
    }
    
    console.log('[Lobby] 🔄 Manual participant sync triggered');
    // Note: Using natural WebSocket events for sync
    toast.success('Sincronização manual solicitada');
  };

  // Force join WebSocket room (for debugging)
  const handleForceJoinRoom = async () => {
    if (!roomDetails || !websocket.isConnected || !session?.user) {
      toast.error('Dados insuficientes para entrar na sala');
      return;
    }
    
    try {
      console.log('[Lobby] 🔧 Force joining WebSocket room');
      
      const joinData = {
        roomId: roomDetails.id,
        accessCode: roomDetails.accessCode,
        name: session.user.name || playerName || 'Usuário',
        role: (session.user.role === 'teacher' || session.user.role === 'admin') ? 'teacher' as const : 'student' as const
      };
      
      await websocket.joinRoom(joinData);
      
      setHasJoinedRoom(true);
      setShowJoinForm(false);
      
      toast.success('Entrou na sala WebSocket com sucesso!');
      
      // Removed forced sync - let natural sync handle this
      
    } catch (error) {
      console.error('[Lobby] ❌ Failed to force join room:', error);
      toast.error('Falha ao entrar na sala WebSocket');
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timerId = setInterval(() => {
      setTimeRemaining((prevTime) => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(timerId);
          setRoomDetails(prevDetails => prevDetails ? { ...prevDetails, status: 'in-progress' } : null);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeRemaining]);

  // Auto-join WebSocket room for host/teachers
  useEffect(() => {
    if (!websocket.isConnected || !roomDetails || !session?.user) return;

    // Check if user is likely a host/teacher OR if they successfully loaded room details (meaning they have access)
    const isTeacher = session.user.role === 'teacher' || session.user.role === 'admin';
    const hasRoomAccess = roomDetails.id; // If they can see room details, they have access
    const shouldAutoJoin = isTeacher || hasRoomAccess;

    if (shouldAutoJoin && !hasJoinedRoom && !websocket.currentRoom) {
      // Auto-join to WebSocket room
      const autoJoinRoom = async () => {
        try {
          console.log('[Lobby] 🚀 Auto-joining user to WebSocket room', {
            isTeacher,
            hasRoomAccess,
            userName: session.user?.name,
            userRole: session.user?.role
          });
          
          const joinData = {
            roomId: roomDetails.id,
            accessCode: roomDetails.accessCode,
            name: session.user?.name || playerName || 'Usuário',
            role: isTeacher ? 'teacher' as const : 'student' as const
          };
          
          await websocket.joinRoom(joinData);
          
          setHasJoinedRoom(true);
          setShowJoinForm(false);
          
          console.log('[Lobby] ✅ User successfully auto-joined WebSocket room');
          toast.success(`Conectado à sala como ${isTeacher ? 'Professor' : 'Participante'}`);
          
          // Removed forced sync - let natural sync handle this
          
        } catch (error) {
          console.error('[Lobby] ❌ Failed to auto-join WebSocket room:', error);
          
          // For teachers/hosts, show join form as fallback
          if (isTeacher) {
            console.log('[Lobby] 🎓 Teacher auto-join failed, keeping join form hidden');
            setShowJoinForm(false); // Teachers shouldn't need to manually join
          } else {
            console.log('[Lobby] 👨‍🎓 Student auto-join failed, showing join form');
            setShowJoinForm(true); // Students can manually join
          }
        }
      };

      autoJoinRoom();
    }
  }, [websocket.isConnected, roomDetails, session?.user, hasJoinedRoom, websocket.currentRoom, websocket, playerName]);

  // Auto-hide join form for teachers/hosts
  useEffect(() => {
    if (!session?.user || !roomDetails) return;

    const isTeacher = session.user.role === 'teacher' || session.user.role === 'admin';
    const isHost = session.user.id && roomDetails.id;

    if ((isTeacher || isHost) && showJoinForm) {
      console.log('[Lobby] 🎓 Hiding join form for host/teacher');
      setShowJoinForm(false);
    }
  }, [session?.user, roomDetails, showJoinForm]);

  // Enhanced participant renderer
  const renderParticipant = useCallback((participant: Participant, index: number) => {
    const displayName = participant.name || participant.user?.name || participant.email?.split('@')[0] || `Participante ${index + 1}`;
    const isHost = participant.isHost || participant.role === 'teacher';
    const isCurrentUser = participant.id === session?.user?.id || 
                         participant.email === session?.user?.email ||
                         participant.name === session?.user?.name;

    const statusInfo = {
      connected: { color: 'text-green-600', icon: <Wifi className="h-3 w-3" />, text: 'Conectado', bg: 'bg-green-500', emoji: '🟢' },
      answering: { color: 'text-blue-600', icon: <Zap className="h-3 w-3" />, text: 'Respondendo', bg: 'bg-blue-500', emoji: '⚡' },
      finished: { color: 'text-purple-600', icon: <CheckCircle className="h-3 w-3" />, text: 'Finalizado', bg: 'bg-purple-500', emoji: '✅' },
      disconnected: { color: 'text-gray-500', icon: <WifiOff className="h-3 w-3" />, text: 'Desconectado', bg: 'bg-gray-400', emoji: '⚫' },
      ready: { color: 'text-green-600', icon: <UserCheck className="h-3 w-3" />, text: 'Pronto', bg: 'bg-green-500', emoji: '✅' }
    };

    const status = statusInfo[participant.status] || statusInfo.disconnected;

    return (
      <div key={participant.id || `participant-${index}`} 
           className={`group flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg ${
             isCurrentUser 
               ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg' 
               : 'bg-white hover:bg-gray-50 border border-gray-200'
           }`}>
        {/* Enhanced Avatar with gradient and status */}
        <div className="relative">
          <div className="h-14 w-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-3 border-white ${status.bg} flex items-center justify-center shadow-lg`}>
            <span className="text-xs">{status.emoji}</span>
          </div>
          {isCurrentUser && (
            <div className="absolute -top-1 -left-1 h-4 w-4 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-xs">👤</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name and badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-bold text-lg truncate ${isCurrentUser ? 'text-blue-800' : 'text-gray-800'}`}>
              {displayName}
            </p>
            {isHost && (
              <Badge variant="secondary" className="text-xs bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300 animate-pulse">
                <Crown className="h-3 w-3 mr-1 text-yellow-600" />
                Host
              </Badge>
            )}
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 border-blue-300 font-semibold">
                🫵 Você
              </Badge>
            )}
          </div>
          
          {/* Status and score */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-sm font-medium ${status.color} flex items-center gap-1 px-2 py-1 rounded-lg bg-white shadow-sm`}>
              {status.emoji}
              {status.text}
            </span>
            {participant.score !== undefined && participant.score > 0 && (
              <Badge variant="outline" className="text-xs bg-gradient-to-r from-green-100 to-blue-100 border-green-300">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                {participant.score} pts
              </Badge>
            )}
          </div>
          
          {/* Last activity */}
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(participant.lastActivity)}
          </p>
        </div>
        
        {/* Connection quality indicator */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Info className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }, [session?.user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-48 mx-auto animate-pulse"></div>
            <div className="h-3 bg-muted rounded w-32 mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !roomDetails) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Sala</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-x-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            <Link href="/rooms">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Voltar para Salas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress for countdown
  const progressValue = timeRemaining !== null && timeRemaining > 0
    ? 100 - (timeRemaining / 120) * 100
    : (roomDetails?.status === 'in-progress' ? 100 : 0);

  return (
    <div className="container mx-auto p-4 max-w-7xl space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Sala de Espera</h1>
            <Badge variant={roomDetails.status === 'waiting' ? 'secondary' : roomDetails.status === 'in-progress' ? 'default' : 'outline'}>
              {roomDetails.status === 'waiting' ? 'Aguardando' : 
               roomDetails.status === 'in-progress' ? 'Em Andamento' : 'Finalizada'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{roomDetails.name}</span>
            <Separator orientation="vertical" className="h-4" />
            <span>{roomDetails.quizTitle}</span>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline" className="text-xs">
              {roomDetails.category}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {roomDetails.difficulty}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <Badge variant={websocket.isConnected ? 'default' : 'destructive'} className="flex items-center gap-1">
            {websocket.isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {websocket.isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
          
          {/* User Status */}
          {currentUserParticipant ? (
            <Badge variant="default" className="bg-green-600 flex items-center gap-1">
              <UserCheck className="h-3 w-3" />
              Na Sala
            </Badge>
          ) : hasJoinedRoom ? (
            <Badge variant="outline" className="text-blue-600 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Sincronizando...
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <UserX className="h-3 w-3" />
              Fora da Sala
            </Badge>
          )}
          
          {/* Controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="hidden sm:flex"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen(!fullscreen)}
            className="hidden sm:flex"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          
          <Link href="/rooms">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Sair da Sala
            </Button>
          </Link>
        </div>
      </div>

      {/* Room Statistics Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{roomStats.totalParticipants}</div>
              <div className="text-xs text-muted-foreground">Participantes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{roomStats.connectedParticipants}</div>
              <div className="text-xs text-muted-foreground">Conectados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{roomStats.teachers}</div>
              <div className="text-xs text-muted-foreground">Professores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{roomStats.students}</div>
              <div className="text-xs text-muted-foreground">Estudantes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{roomStats.connectionRate}%</div>
              <div className="text-xs text-muted-foreground">Taxa Conexão</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {roomDetails.maxParticipants ? `${roomStats.totalParticipants}/${roomDetails.maxParticipants}` : '∞'}
              </div>
              <div className="text-xs text-muted-foreground">Capacidade</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Join Form for Students */}
      {showJoinForm && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Entrar na Sala</CardTitle>
              <CardDescription className="space-y-1">
                <div className="font-medium">{roomDetails?.name}</div>
                <div className="text-sm">Quiz: {roomDetails.quizTitle}</div>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <form onSubmit={handleJoinRoom} className="space-y-4">
                {/* Player Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="playerName" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Seu Nome no Jogo
                  </Label>
                  <Input
                    id="playerName"
                    type="text"
                    placeholder="Digite como você quer ser chamado"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isJoining}
                    className="w-full"
                  />
                </div>

                {/* Room Type Indicator */}
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    {roomDetails?.roomType === 'public' ? (
                      <>
                        <Globe className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">Sala Pública</span>
                        - Entrada livre
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-orange-600" />
                        <span className="text-orange-600 font-medium">Sala Privada</span>
                        - Código necessário
                      </>
                    )}
                  </AlertDescription>
                </Alert>

                {/* Access Code Input (only for private rooms) */}
                {roomDetails?.roomType === 'private' && (
                  <div className="space-y-2">
                    <Label htmlFor="accessCode" className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Código de Acesso
                    </Label>
                    <Input
                      id="accessCode"
                      type="text"
                      placeholder="Digite o código da sala"
                      value={accessCodeInput}
                      onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
                      disabled={isJoining}
                      className="w-full font-mono text-center text-lg tracking-wider"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Peça o código ao professor para entrar nesta sala privada
                    </p>
                  </div>
                )}

                {/* Error Message */}
                {joinError && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{joinError}</AlertDescription>
                  </Alert>
                )}

                {/* Connection Status */}
                <div className="flex items-center justify-center">
                  <Badge variant={websocket.isConnected ? 'default' : 'destructive'} className="flex items-center gap-1">
                    {websocket.isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    WebSocket {websocket.isConnected ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isJoining || !websocket.isConnected}
                  size="lg"
                >
                  {isJoining ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Entrar na Sala
                    </>
                  )}
                </Button>

                {/* Back Link */}
                <div className="text-center">
                  <Link href="/rooms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    ← Voltar para lista de salas
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Lobby Content (only show after joining) */}
      {!showJoinForm && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5" />
                    <div>
                      <CardTitle>{roomDetails.name}</CardTitle>
                      <CardDescription>{roomDetails.quizTitle}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyAccessCode}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {roomDetails.accessCode}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={shareRoom}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Room Description */}
                {roomDetails.description && (
                  <p className="text-muted-foreground">{roomDetails.description}</p>
                )}
                
                {/* Room Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-medium">
                      {roomDetails.timeMode === 'per_question' ? 'Por Questão' : 'Por Quiz'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {roomDetails.timeMode === 'per_question' 
                        ? `${roomDetails.timePerQuestion}s`
                        : formatTime(roomDetails.timePerQuiz || 600)
                      }
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Calendar className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-medium">Criada</div>
                    <div className="text-xs text-muted-foreground">
                      {roomDetails.createdAt ? formatRelativeTime(roomDetails.createdAt) : 'Data não disponível'}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <Timer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-medium">Duração Est.</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(roomDetails.estimatedDuration || 600)}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="text-sm font-medium">Dificuldade</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {roomDetails.difficulty}
                    </div>
                  </div>
                </div>

                {/* Enhanced Status-specific content */}
                {roomDetails.status === 'waiting' && timeRemaining !== null && (
                  <div className="text-center space-y-6 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                    <div className="relative">
                      <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse">
                        {formatTime(timeRemaining)}
                      </div>
                      <div className="absolute -top-2 -right-2 h-4 w-4 bg-green-500 rounded-full animate-ping"></div>
                    </div>
                    <Progress value={progressValue} className="w-full h-3" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-blue-800">🚀 Competição iniciando em breve!</p>
                      <p className="text-sm text-blue-600">Prepare-se para o desafio</p>
                    </div>
                  </div>
                )}
                
                {roomDetails.status === 'waiting' && timeRemaining === null && (
                  <div className="text-center space-y-6 p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border-2 border-amber-200">
                    <div className="relative">
                      <Heart className="h-20 w-20 mx-auto text-amber-500 animate-bounce" />
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-amber-400 rounded-full animate-ping"></div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xl font-bold text-amber-800">👨‍🏫 Aguardando o professor</p>
                      <p className="text-sm text-amber-600">
                        A competição iniciará quando o professor estiver pronto
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-amber-500">
                        <div className="h-2 w-2 bg-amber-400 rounded-full animate-pulse"></div>
                        <span>Conectado e aguardando</span>
                        <div className="h-2 w-2 bg-amber-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {roomDetails.status === 'in-progress' && (
                  <div className="text-center py-8 space-y-4">
                    <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                      <Play className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-green-600 mb-2">
                        Competição em andamento!
                      </p>
                      <p className="text-muted-foreground mb-4">
                        A competição já começou. Entre agora para participar.
                      </p>
                    </div>
                    <Link href={`/rooms/${roomId}/compete`}>
                      <Button size="lg" className="bg-green-600 hover:bg-green-700">
                        <Play className="h-4 w-4 mr-2" />
                        Entrar na Competição
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Connection Quality and Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Qualidade da conexão:</span>
                    <Badge variant="outline" className={`${getConnectionQualityColor(websocket.connectionQuality)} flex items-center gap-1`}>
                      {getConnectionQualityIcon(websocket.connectionQuality)}
                      {websocket.connectionQuality}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!websocket.isConnected && (
                      <Button 
                        onClick={handleManualReconnect}
                        disabled={isManuallyReconnecting}
                        variant="outline"
                        size="sm"
                      >
                        {isManuallyReconnecting ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <WifiOff className="h-4 w-4 mr-2" />
                        )}
                        {isManuallyReconnecting ? 'Reconectando...' : 'Reconectar'}
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants and Activity Tabs */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Atividade da Sala</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className="text-xs"
                    >
                      {autoRefresh ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="participants" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Participantes ({participantsMemoized.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Atividade ({roomActivity.length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="participants" className="mt-0">
                    <ScrollArea className="h-96">
                      <div className="p-3 space-y-1">
                        {participantsMemoized.map((wsParticipant, index) => {
                          const participant: Participant = {
                            id: wsParticipant.id,
                            name: wsParticipant.name,
                            email: wsParticipant.email,
                            joinedAt: new Date(wsParticipant.lastActivity),
                            status: wsParticipant.status as 'connected' | 'ready' | 'disconnected' | 'answering' | 'finished',
                            lastActivity: new Date(wsParticipant.lastActivity),
                            isHost: wsParticipant.isHost,
                            role: wsParticipant.role === 'moderator' ? 'teacher' : wsParticipant.role as 'teacher' | 'student' | undefined,
                            score: wsParticipant.score,
                            connectionQuality: 'excellent'
                          };
                          return renderParticipant(participant, index);
                        })}
                        
                        {participantsMemoized.length === 0 && (
                          <div className="text-center py-8">
                            <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Aguardando participantes...
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="activity" className="mt-0">
                    <ScrollArea className="h-96">
                      <div className="p-3 space-y-2">
                        {roomActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                            <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{activity.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatRelativeTime(activity.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {roomActivity.length === 0 && (
                          <div className="text-center py-8">
                            <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Nenhuma atividade recente
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Advanced Info Panel (Collapsible) */}
            <Card>
              <CardHeader className="pb-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowAdvancedInfo(!showAdvancedInfo)}
                  className="w-full justify-between p-0 h-auto"
                >
                  <CardTitle className="text-base">Informações Avançadas</CardTitle>
                  {showAdvancedInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardHeader>
              
              {showAdvancedInfo && (
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Sala criada:</span>
                      <span className="text-sm text-muted-foreground">
                        {roomDetails.createdAt ? formatRelativeTime(roomDetails.createdAt) : 'Data não disponível'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Capacidade:</span>
                      <span className="text-sm text-muted-foreground">
                        {roomDetails.maxParticipants} participantes
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">ID da Sala:</span>
                      <span className="text-sm text-muted-foreground font-mono">
                        {roomDetails.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Categoria:</span>
                      <span className="text-sm text-muted-foreground">
                        {roomDetails.category || 'Geral'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Dificuldade:</span>
                      <span className="text-sm text-muted-foreground">
                        {mapQuizDifficulty(roomDetails.difficulty)}
                      </span>
                    </div>
                    {roomDetails.tags && roomDetails.tags.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Tags className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">Tags:</span>
                          <div className="flex flex-wrap gap-1">
                            {roomDetails.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Debug Controls */}
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sincronização Manual</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleManualSync}
                          disabled={!websocket.isConnected}
                          className="h-8 px-3"
                        >
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Sincronizar
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Força a sincronização dos participantes entre todos os clientes
                      </div>
                    </div>
                    
                    {/* Force Join Controls */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">WebSocket Join</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleForceJoinRoom}
                          disabled={!websocket.isConnected || !roomDetails}
                          className="h-8 px-3"
                        >
                          <Users className="h-3 w-3 mr-2" />
                          Entrar no WS
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Força a entrada na sala WebSocket (útil para hosts)
                      </div>
                    </div>
                    
                    {/* WebSocket Debug Panel */}
                    <div className="space-y-2">
                      <Button 
                        variant="ghost"
                        onClick={() => setShowConnectionDebug(!showConnectionDebug)}
                        className="w-full justify-between text-xs h-8"
                      >
                        Debug da Conexão
                        {showConnectionDebug ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                      
                      {showConnectionDebug && (
                        <div className="space-y-2 text-xs font-mono bg-muted p-3 rounded-lg">
                          <div><strong>Conectado:</strong> {websocket.isConnected ? '✅' : '❌'}</div>
                          <div><strong>Sala Atual:</strong> {websocket.currentRoom || 'Nenhuma'}</div>
                          <div><strong>Papel:</strong> {websocket.currentRole || 'Nenhum'}</div>
                          <div><strong>Último Erro:</strong> {websocket.lastError ? String(websocket.lastError) : 'Nenhum'}</div>
                          <Separator className="my-2" />
                          <div><strong>Participantes no WS:</strong> {websocket.participants.length}</div>
                          <div><strong>Participantes Processados:</strong> {participantsMemoized.length}</div>
                          <div><strong>Já Entrou na Sala:</strong> {hasJoinedRoom ? '✅' : '❌'}</div>
                          <div><strong>Auto-Refresh:</strong> {autoRefresh ? '✅' : '❌'}</div>
                          <Separator className="my-2" />
                          
                          {/* Enhanced Session Debug */}
                          <div><strong>Sessão Usuário ID:</strong> {session?.user?.id || 'Nenhum'}</div>
                          <div><strong>Sessão Usuário Nome:</strong> {session?.user?.name || 'Nenhum'}</div>
                          <div><strong>Sessão Usuário Email:</strong> {session?.user?.email || 'Nenhum'}</div>
                          <div><strong>Sessão Usuário Papel:</strong> {session?.user?.role || 'Nenhum'}</div>
                          <div><strong>Tem Access Token:</strong> {session?.accessToken ? '✅' : '❌'}</div>
                          <Separator className="my-2" />
                          
                          {/* Enhanced Participant Debug */}
                          <div><strong>Usuário Atual Identificado:</strong> {currentUserParticipant ? '✅' : '❌'}</div>
                          {currentUserParticipant && (
                            <>
                              <div><strong>Usuário Atual ID:</strong> {currentUserParticipant.id}</div>
                              <div><strong>Usuário Atual Nome:</strong> {currentUserParticipant.name}</div>
                              <div><strong>Usuário Atual Status:</strong> {currentUserParticipant.status}</div>
                              <div><strong>Usuário Atual Papel:</strong> {currentUserParticipant.role || 'Nenhum'}</div>
                            </>
                          )}
                          <Separator className="my-2" />
                          
                          {/* Raw Participant List */}
                          {websocket.participants.length > 0 && (
                            <div className="mt-2">
                              <strong>Lista WebSocket (RAW):</strong>
                              {websocket.participants.map((p, i) => (
                                <div key={i} className="ml-2 text-xs bg-gray-100 p-1 my-1 rounded">
                                  <div><strong>#{i + 1}:</strong> {p.name} ({p.status})</div>
                                  <div><strong>ID:</strong> {p.id}</div>
                                  <div><strong>Email:</strong> {p.email}</div>
                                  <div><strong>Papel:</strong> {p.role || 'student'}</div>
                                  <div><strong>Host:</strong> {p.isHost ? '✅' : '❌'}</div>
                                  <div><strong>UserID:</strong> {p.userId || 'N/A'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Processed Participant List */}
                          {participantsMemoized.length > 0 && (
                            <div className="mt-2">
                              <strong>Lista Processada:</strong>
                              {participantsMemoized.map((p, i) => (
                                <div key={i} className="ml-2 text-xs bg-blue-100 p-1 my-1 rounded">
                                  <div><strong>#{i + 1}:</strong> {p.name} ({p.status})</div>
                                  <div><strong>ID:</strong> {p.id}</div>
                                  <div><strong>Email:</strong> {p.email}</div>
                                  <div><strong>Papel:</strong> {p.role || 'student'}</div>
                                  <div><strong>Host:</strong> {p.isHost ? '✅' : '❌'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Filtering Information */}
                          <Separator className="my-2" />
                          <div><strong>Informações de Filtro:</strong></div>
                          <div className="ml-2 text-xs">
                            <div><strong>É Professor?:</strong> {session?.user?.role === 'teacher' || session?.user?.role === 'admin' ? '✅' : '❌'}</div>
                            <div><strong>WebSocket Papel:</strong> {websocket.currentRole || 'Nenhum'}</div>
                            <div><strong>Mostra Todos?:</strong> {(session?.user?.role === 'teacher' || session?.user?.role === 'admin' || websocket.currentRole === 'teacher') ? '✅' : '❌'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
} 