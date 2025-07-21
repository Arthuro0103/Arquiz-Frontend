'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useUnifiedWebSocket } from '@/contexts/UnifiedWebSocketContext';
import { getRoomDetails } from '@/actions/competitionActions';
import { toast } from 'sonner';
import { FullPageTransitionLoading } from '@/components/ui/transition-loading';
import { 
  Users, 
  Play, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Crown,
  GraduationCap,
  Share2,
  Globe,
  Lock,
  Timer,
  Star,
  Target,
  Zap,
  Heart,
  Activity,
  Eye,
  Signal,
  MessageCircle,
  Info,
  Award,
  TrendingUp
} from 'lucide-react';

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
  userId?: string;
  currentQuestionIndex?: number;
  score?: number;
  avatar?: string;
  connectionQuality?: 'excellent' | 'good' | 'poor';
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  totalQuestions: number;
  estimatedDuration?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
}

interface RoomDetails {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'active' | 'finished';
  participantCount: number;
  maxParticipants: number;
  accessCode: string;
  createdAt: string;
  timeMode?: 'per_question' | 'per_quiz';
  quiz?: Quiz;
  hostName?: string;
  roomType?: 'public' | 'private';
  settings?: {
    allowLateJoin?: boolean;
    showCorrectAnswers?: boolean;
    timePerQuestion?: number;
    randomizeQuestions?: boolean;
  };
}

interface RoomActivity {
  id: string;
  type: 'participant_joined' | 'participant_left' | 'room_started' | 'message_sent';
  message: string;
  timestamp: Date;
  participant?: string;
  icon?: React.ReactNode;
  color?: string;
}

// Sound effects (placeholders)
const playNotificationSound = (type: 'join' | 'leave' | 'start' | 'error') => {
  // Placeholder for sound effects
  console.log(`[SoundEffect] Playing ${type} sound`);
};

export default function EnhancedRoomLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const roomId = params.roomId as string;
  
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [isManuallyReconnecting, setIsManuallyReconnecting] = useState(false);
  
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  
  const [roomActivity, setRoomActivity] = useState<RoomActivity[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const websocket = useUnifiedWebSocket();

  // Add ref to track if component is mounted for cleanup
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const participantsMemoized = useMemo(() => {
    console.log('🔍 LOBBY PARTICIPANT FILTERING DEBUG:', {
      sessionRole: session?.user?.role,
      sessionUser: session?.user,
      websocketParticipantsRaw: websocket.participants,
      websocketParticipantsCount: websocket.participants.length
    })
    
    if (!websocket.participants.length) return [];
    
    return websocket.participants
      .filter(p => {
        const isCurrentUserTeacher = session?.user?.role === 'teacher' || session?.user?.role === 'admin'
        
        console.log('🔍 FILTERING PARTICIPANT:', {
          participant: {
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
            isHost: p.isHost,
            status: p.status
          },
          userContext: {
            sessionRole: session?.user?.role,
            isCurrentUserTeacher,
          },
          filterDecision: {
            shouldShowAll: isCurrentUserTeacher,
            isParticipantTeacherOrHost: p.role === 'teacher' || p.isHost,
            willInclude: isCurrentUserTeacher || !(p.role === 'teacher' || p.isHost)
          }
        })
        
        // If current user is a teacher, show all participants
        if (isCurrentUserTeacher) {
          return true
        }
        
        // If participant is a teacher or host, hide from students
        if (p.role === 'teacher' || p.isHost) {
          return false
        }
        
        return true
      })
      .map((p) => ({
        ...p,
        id: p.id || p.email || 'unknown',
        name: p.name || p.email || 'Anonymous User',
        joinedAt: new Date(p.lastActivity || new Date()),
        lastActivity: p.lastActivity || new Date().toISOString(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'User')}&background=random`,
        score: p.score || 0,
        connectionQuality: 'good' as const
      }));
  }, [websocket.participants, session?.user?.role])

  // Activity management
  const addActivity = useCallback((
    type: RoomActivity['type'],
    message: string,
    participant?: string
  ) => {
    if (!mountedRef.current) return;

    const newActivity: RoomActivity = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      participant,
      icon: type === 'participant_joined' ? <Users className="h-4 w-4" /> : 
            type === 'participant_left' ? <XCircle className="h-4 w-4" /> : 
            type === 'room_started' ? <Play className="h-4 w-4" /> : 
            <MessageCircle className="h-4 w-4" />,
      color: type === 'participant_joined' ? 'text-green-600' : 
             type === 'participant_left' ? 'text-red-600' : 
             type === 'room_started' ? 'text-blue-600' : 'text-gray-600'
    };

    setRoomActivity(prev => [newActivity, ...prev.slice(0, 9)]);
  }, []);

  // Room details fetching
  const fetchRoomDetails = useCallback(async () => {
    if (!roomId) return;

    try {
      setLoading(true);
      setError(null);
      
      const details = await getRoomDetails(roomId);
      
      if (!mountedRef.current || !details) return;
      
      // Transform the response to match RoomDetails interface
      const transformedDetails: RoomDetails = {
        id: details.id,
        name: details.name,
        description: details.description,
        status: details.status as 'pending' | 'active' | 'finished',
        participantCount: details.participantCount || 0,
        maxParticipants: details.maxParticipants || 50,
        accessCode: details.accessCode || '',
        createdAt: details.createdAt,
        timeMode: details.timeMode,
        quiz: details.quizTitle ? {
          id: details.quizId || '',
          title: details.quizTitle,
          description: '',
          totalQuestions: 0,
          estimatedDuration: 0,
          difficulty: 'medium',
          category: '',
          tags: [],
        } : undefined,
        hostName: details.hostName,
        roomType: details.roomType,
        settings: {
          allowLateJoin: true,
          showCorrectAnswers: false,
          timePerQuestion: 30,
          randomizeQuestions: false,
        },
      };
      
      setRoomDetails(transformedDetails);
      setAccessCodeInput(transformedDetails.accessCode || '');
      setPlayerName(session?.user?.name || '');
      
      // Pre-fill form if user is authenticated
      if (session?.user?.name && transformedDetails.accessCode) {
        setShowJoinForm(false);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Error fetching room details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load room details');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [roomId, session?.user?.name]);

  // Join room function
  const handleJoinRoom = useCallback(async () => {
    if (!roomDetails || isJoining) return;

    setIsJoining(true);
    setJoinError(null);

    try {
      // Validate inputs
      if (!playerName.trim()) {
        throw new Error('Name is required');
      }
      
      if (!accessCodeInput.trim()) {
        throw new Error('Access code is required');
      }

      // Ensure WebSocket is connected
      if (!websocket.connectionState.isConnected) {
        await websocket.connect();
      }

      // Join room via WebSocket
      const response = await websocket.joinRoom({
        roomId,
        accessCode: accessCodeInput.trim(),
        displayName: playerName.trim(),
        role: session?.user?.role || 'student',
      });

      if (response.success) {
        setHasJoinedRoom(true);
        setShowJoinForm(false);
        toast.success('Successfully joined the room!');
        playNotificationSound('join');
        addActivity('participant_joined', `You joined the room`, playerName);
      } else {
        throw new Error(response.error || 'Failed to join room');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setJoinError(errorMessage);
      toast.error(errorMessage);
      playNotificationSound('error');
    } finally {
      setIsJoining(false);
    }
  }, [roomDetails, isJoining, playerName, accessCodeInput, websocket, roomId, session?.user?.role, addActivity]);

  // Connection status management
  const handleReconnect = useCallback(() => {
    setIsManuallyReconnecting(true);
    websocket.reconnect();
    
    setTimeout(() => {
      setIsManuallyReconnecting(false);
    }, 3000);
  }, [websocket]);

  // Copy access code function
  const copyAccessCode = useCallback(() => {
    if (roomDetails?.accessCode) {
      navigator.clipboard.writeText(roomDetails.accessCode);
      toast.success('Access code copied to clipboard!');
    }
  }, [roomDetails?.accessCode]);

  // Load room details on mount
  useEffect(() => {
    fetchRoomDetails();
  }, [fetchRoomDetails]);

  // WebSocket event handlers
  useEffect(() => {
    if (!websocket.isReady) return;

    // Set up event listeners
    const unsubscribeParticipantJoined = websocket.addEventListener('participant_joined', (data: any) => {
      const participantName = data?.participant?.name || data?.name || 'Someone';
      playNotificationSound('join');
      addActivity('participant_joined', `${participantName} joined the room`, participantName);
    });

    const unsubscribeParticipantLeft = websocket.addEventListener('participant_left', (data: any) => {
      const participantName = data?.participant?.name || data?.name || 'Someone';
      playNotificationSound('leave');
      addActivity('participant_left', `${participantName} left the room`, participantName);
    });

    const unsubscribeRoomStarted = websocket.addEventListener('room_started', (data: any) => {
      console.log('🎯 [LOBBY] ROOM_STARTED EVENT RECEIVED:', data);
      
      toast.success('Quiz is starting! Taking you to the competition page...', {
        duration: 3000,
        position: 'top-center',
      });
      
      const roomId = data.roomId || params.roomId;
      if (roomId) {
        router.push(`/rooms/${roomId}/compete`);
      }
    });

    const unsubscribeKickedFromRoom = websocket.addEventListener('kicked_from_room', (data: any) => {
      console.log('👢 [LOBBY] KICK EVENT RECEIVED - IMMEDIATE REDIRECTION:', data);
      
      toast.error('You have been removed from the room', {
        description: data.reason || 'Contact the room administrator',
        duration: 10000,
        position: 'top-center',
      });
      
      alert(`You have been removed from the room: ${data.reason || 'Contact the administrator'}`);
      window.location.href = '/rooms';
    });

    // Cleanup functions
    return () => {
      unsubscribeParticipantJoined();
      unsubscribeParticipantLeft();
      unsubscribeRoomStarted();
      unsubscribeKickedFromRoom();
    };
  }, [websocket, addActivity, router, params.roomId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Room Not Found</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push('/rooms')} className="w-full">
                Back to Rooms
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join form (for new participants)
  if (showJoinForm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Join Room</CardTitle>
            <CardDescription className="text-center">
              Enter your name and access code to join the quiz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={isJoining}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                placeholder="Enter room access code"
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value)}
                disabled={isJoining}
              />
            </div>

            {joinError && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{joinError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleJoinRoom}
              disabled={isJoining || !playerName.trim() || !accessCodeInput.trim()}
              className="w-full"
            >
              {isJoining ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Join Room
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main lobby interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {roomDetails?.name || 'Quiz Room'}
              </h1>
              <p className="text-gray-600">
                {roomDetails?.description || 'Waiting for the quiz to start...'}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {websocket.connectionState.isConnected ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Wifi className="h-5 w-5" />
                    <span className="text-sm">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-red-600">
                    <WifiOff className="h-5 w-5" />
                    <span className="text-sm">Disconnected</span>
                  </div>
                )}
              </div>

              {/* Reconnect button */}
              {!websocket.connectionState.isConnected && (
                <Button
                  onClick={handleReconnect}
                  variant="outline"
                  size="sm"
                  disabled={isManuallyReconnecting}
                >
                  {isManuallyReconnecting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2">Reconnect</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Room Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Room Details */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Room Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Access Code</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="font-mono">
                    {roomDetails?.accessCode}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyAccessCode}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={roomDetails?.status === 'active' ? 'default' : 'secondary'}>
                  {roomDetails?.status || 'waiting'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Participants</span>
                <span className="text-sm font-medium">
                  {participantsMemoized.length}/{roomDetails?.maxParticipants || 50}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Info */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Quiz Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium text-sm">
                  {roomDetails?.quiz?.title || 'Quiz Title'}
                </p>
                <p className="text-xs text-gray-600">
                  {roomDetails?.quiz?.description || 'No description available'}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Questions</span>
                <span className="text-sm font-medium">
                  {roomDetails?.quiz?.totalQuestions || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Duration</span>
                <span className="text-sm font-medium">
                  {roomDetails?.quiz?.estimatedDuration || 'N/A'} min
                </span>
              </div>
              
              {roomDetails?.quiz?.difficulty && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Difficulty</span>
                  <Badge variant={
                    roomDetails.quiz.difficulty === 'easy' ? 'default' : 
                    roomDetails.quiz.difficulty === 'medium' ? 'secondary' : 'destructive'
                  }>
                    {roomDetails.quiz.difficulty}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Quality */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Quality</span>
                <Badge variant={
                  websocket.connectionState.connectionQuality === 'excellent' ? 'default' :
                  websocket.connectionState.connectionQuality === 'good' ? 'secondary' : 'destructive'
                }>
                  {websocket.connectionState.connectionQuality}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Latency</span>
                <span className="text-sm font-medium">
                  {websocket.connectionState.heartbeatLatency}ms
                </span>
              </div>
              
              {websocket.connectionState.lastError && (
                <div className="text-xs text-red-600">
                  {websocket.connectionState.lastError}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Participants */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Participants ({participantsMemoized.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participantsMemoized.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No participants yet</p>
                <p className="text-sm text-gray-400">
                  Share the access code to invite others
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {participantsMemoized.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        participant.status === 'connected' ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {participant.name}
                        </p>
                        {participant.isHost && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {participant.role === 'teacher' && (
                          <GraduationCap className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {participant.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Waiting message */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 rounded-full">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              Waiting for host to start the quiz...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 