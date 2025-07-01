'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Users, Play, Pause, Square, Settings, UserX, Crown, Copy, Wifi, WifiOff, RefreshCw, Clock, Trophy, Ban } from 'lucide-react'
import { useEnhancedWebSocketContext } from '@/contexts/EnhancedWebSocketContext'

// Enhanced Room interface to handle backend data structure
interface Room {
  id: string
  name: string
  code?: string // Frontend legacy field
  accessCode: string // Backend primary field  
  status: string
  createdAt: string
  maxParticipants: number
  currentParticipants: number
  quizId?: string
  quizTitle?: string
  description?: string
  timeMode?: 'per_question' | 'per_quiz'
  timePerQuestion?: number
  timePerQuiz?: number
  roomType?: 'public' | 'private'
  quiz?: {
    id: string
    title: string
    description?: string
    totalQuestions: number
    currentQuestionIndex: number
    status: string
  }
}

export default function ManageRoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { data: session, status: sessionStatus } = useSession()
  
  const websocket = useEnhancedWebSocketContext()
  
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [kickingParticipant, setKickingParticipant] = useState<string | null>(null)
  // Removed lastRefresh state to prevent infinite loops
  const [isKickDialogOpen, setIsKickDialogOpen] = useState(false)
  const [selectedParticipant, setSelectedParticipant] = useState<{ id: string; name: string } | null>(null)
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const [hasJoinedWebSocket, setHasJoinedWebSocket] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [isJoiningWebSocket, setIsJoiningWebSocket] = useState(false)
  const lastJoinedRoomRef = useRef<string | null>(null)

  // Enhanced authentication check
  useEffect(() => {
    if (sessionStatus === 'loading') return
    
    if (sessionStatus === 'unauthenticated' || !session?.user) {
      toast.error('Acesso negado. Faça login como professor.')
      router.push('/auth/signin')
      return
    }
    
    // Check if user has teacher permissions
    const userRole = session.user.role
    if (userRole !== 'teacher' && userRole !== 'admin') {
      toast.error('Acesso negado. Apenas professores podem gerenciar salas.')
      router.push('/dashboard')
      return
    }
  }, [sessionStatus, session, router])

  // Enhanced room data fetching
  useEffect(() => {
    if (!roomId || sessionStatus === 'loading') return

    const fetchRoomData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (sessionStatus === 'unauthenticated' || !session?.accessToken) {
          toast.error('Sessão expirada. Redirecionando para login...')
          router.push('/auth/signin')
          return
        }

        console.log(`[ManageRoom] 📡 Fetching room data for ${roomId}`)
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/rooms/${roomId}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            toast.error('Sessão expirada. Redirecionando para login...')
            router.push('/auth/signin')
            return
          }
          if (response.status === 403) {
            toast.error('Acesso negado. Você não tem permissão para gerenciar esta sala.')
            router.push('/dashboard')
            return
          }
          if (response.status === 404) {
            toast.error('Sala não encontrada.')
            router.push('/dashboard')
            return
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const roomData = await response.json()
        console.log('[ManageRoom] 📊 Room data received:', roomData)
        
        // Normalize room data to handle both code and accessCode fields
        const normalizedRoom: Room = {
          ...roomData,
          code: roomData.accessCode || roomData.code, // Ensure code field exists
          accessCode: roomData.accessCode || roomData.code, // Ensure accessCode field exists
          status: roomData.status || 'waiting', // Ensure status always has a value
          currentParticipants: roomData.currentParticipants || 0,
          maxParticipants: roomData.maxParticipants || 50,
          // Normalize quiz data with safety checks
          quiz: roomData.quiz ? {
            ...roomData.quiz,
            status: roomData.quiz.status || 'draft', // Ensure quiz status always has a value
            currentQuestionIndex: typeof roomData.quiz.currentQuestionIndex === 'number' ? roomData.quiz.currentQuestionIndex : 0,
            totalQuestions: typeof roomData.quiz.totalQuestions === 'number' ? roomData.quiz.totalQuestions : 0
          } : undefined
        }
        
        setRoom(normalizedRoom)
        console.log('[ManageRoom] ✅ Room data normalized and set:', normalizedRoom)
        
        // Debug quiz data specifically
        if (normalizedRoom.quiz) {
          console.log('[ManageRoom] 🎯 Quiz data details:', {
            title: normalizedRoom.quiz.title,
            status: normalizedRoom.quiz.status,
            totalQuestions: normalizedRoom.quiz.totalQuestions,
            currentQuestionIndex: normalizedRoom.quiz.currentQuestionIndex,
            questionsDisplay: normalizedRoom.quiz.totalQuestions > 0 ? `${normalizedRoom.quiz.currentQuestionIndex + 1}/${normalizedRoom.quiz.totalQuestions}` : 'N/A'
          })
        } else {
          console.log('[ManageRoom] ⚠️ No quiz data available for this room')
        }

      } catch (err) {
        console.error('[ManageRoom] ❌ Error loading room data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados da sala'
        setError(errorMessage)
        toast.error(`Erro ao carregar sala: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }

    fetchRoomData()
  }, [roomId, router, session, sessionStatus]) // Removed lastRefresh to prevent infinite loops

  // Enhanced WebSocket room joining with better error handling
  useEffect(() => {
    // Check if we've already joined this specific room to prevent infinite loops
    if (!roomId || !room || !websocket.isConnected || hasJoinedWebSocket || isJoiningWebSocket || lastJoinedRoomRef.current === roomId) {
      console.log(`[ManageRoom] 🔄 Skipping WebSocket join attempt:`, {
        roomId: !!roomId,
        room: !!room,
        websocketConnected: websocket.isConnected,
        hasJoinedWebSocket,
        isJoiningWebSocket,
        lastJoinedRoom: lastJoinedRoomRef.current,
        currentRoom: roomId
      })
      return
    }
    
    // Validate required data before attempting to join
    const accessCode = room.accessCode || room.code
    const userName = session?.user?.name
    
    if (!accessCode) {
      console.warn(`[ManageRoom] ⚠️ Cannot join WebSocket room: access code missing`, { 
        room,
        hasAccessCode: !!room.accessCode,
        hasCode: !!room.code
      })
      return
    }
    
    if (!userName) {
      console.warn(`[ManageRoom] ⚠️ Cannot join WebSocket room: user name missing`, { session })
      return
    }
    
    const joinWebSocketRoom = async () => {
      try {
        setIsJoiningWebSocket(true) // Set guard to prevent multiple attempts
        setConnectionStatus('connecting')
        
        console.log(`[ManageRoom] 🚪 Joining WebSocket room ${roomId}`, {
          roomId,
          accessCode,
          userName,
          userRole: session?.user?.role,
          roomData: {
            id: room.id,
            name: room.name,
            status: room.status
          }
        })
        
        const joinSuccess = await websocket.joinRoom({
          roomId: roomId,
          accessCode: accessCode,
          name: userName,
          role: 'teacher'
        })
        
        if (joinSuccess) {
          setHasJoinedWebSocket(true)
          setConnectionStatus('connected')
          lastJoinedRoomRef.current = roomId // Track the successfully joined room
          console.log(`[ManageRoom] ✅ Successfully joined WebSocket room ${roomId}`)
          toast.success('Conectado à sala para atualizações em tempo real')
        } else {
          setConnectionStatus('error')
          console.warn(`[ManageRoom] ❌ Failed to join WebSocket room ${roomId}`)
          toast.warning('Falha ao conectar à sala. Algumas funcionalidades podem não funcionar.')
        }
      } catch (error) {
        setConnectionStatus('error')
        console.error(`[ManageRoom] ❌ Error joining WebSocket room:`, error)
        
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        
        if (errorMessage.includes('Room not found')) {
          toast.error('Sala não encontrada no WebSocket. Verifique se a sala ainda existe.')
        } else if (errorMessage.includes('Authentication failed')) {
          toast.error('Falha na autenticação WebSocket. Faça login novamente.')
        } else if (errorMessage.includes('Access denied')) {
          toast.error('Acesso negado ao WebSocket. Você não tem permissão para gerenciar esta sala.')
        } else {
          toast.error(`Erro ao conectar à sala: ${errorMessage}`)
        }
      } finally {
        setIsJoiningWebSocket(false) // Clear guard
      }
    }
    
    // Add a small delay to ensure room data is fully loaded
    const timeoutId = setTimeout(joinWebSocketRoom, 100)
    
    return () => clearTimeout(timeoutId)
  }, [roomId, room?.id, websocket.isConnected]) // Removed problematic dependencies

  // Enhanced WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!websocket.isConnected || !hasJoinedWebSocket) return

    console.log(`[ManageRoom] 🔧 Setting up WebSocket event listeners for room ${roomId}`)

    const unsubscribeParticipantJoined = websocket.addEventListener('participant_joined', (data: unknown) => {
      console.log('[ManageRoom] 👤 Participant joined:', data)
      const eventData = data as { participant?: { name?: string; id?: string }; name?: string; username?: string }
      const participantName = eventData.participant?.name || eventData.name || eventData.username || 'Usuário Convidado'
      
      toast.success(`${participantName} entrou na sala`)
      // Note: Removed setLastRefresh to prevent infinite loops
    })

    const unsubscribeParticipantLeft = websocket.addEventListener('participant_left', (data: unknown) => {
      console.log('[ManageRoom] 👋 Participant left:', data)
      const eventData = data as { participant?: { name?: string; id?: string }; name?: string; username?: string }
      const participantName = eventData.participant?.name || eventData.name || eventData.username || 'Usuário'
      
      toast.info(`${participantName} saiu da sala`)
      // Note: Removed setLastRefresh to prevent infinite loops
    })

    const unsubscribeParticipantsUpdated = websocket.addEventListener('participants_updated', (data: unknown) => {
      console.log('[ManageRoom] 👥 Participants updated:', data)
      
      // Debug participants data structure
      if (websocket.participants) {
        console.log('[ManageRoom] 🔍 Current participants array:', websocket.participants)
        websocket.participants.forEach((participant, index) => {
          if (!participant.id) {
            console.warn(`[ManageRoom] ⚠️ Participant at index ${index} has no ID:`, participant)
          }
        })
        
        // Check for duplicate IDs
        const ids = websocket.participants.map(p => p.id).filter(Boolean)
        const uniqueIds = new Set(ids)
        if (ids.length !== uniqueIds.size) {
          console.warn('[ManageRoom] ⚠️ Duplicate participant IDs detected:', ids)
        }
      }
      
      // Note: Removed setLastRefresh to prevent infinite loops
    })

    const unsubscribeQuizStarted = websocket.addEventListener('quiz_started', (data: unknown) => {
      console.log('[ManageRoom] 🎯 Quiz started:', data)
      setRoom(prev => prev ? { ...prev, status: 'active' } : null)
      toast.success('Quiz iniciado com sucesso!')
    })

    const unsubscribeQuizPaused = websocket.addEventListener('quiz_paused', (data: unknown) => {
      console.log('[ManageRoom] ⏸️ Quiz paused:', data)
      setRoom(prev => prev ? { ...prev, status: 'paused' } : null)
      toast.info('Quiz pausado')
    })

    const unsubscribeQuizFinished = websocket.addEventListener('quiz_finished', (data: unknown) => {
      console.log('[ManageRoom] 🏁 Quiz finished:', data)
      setRoom(prev => prev ? { ...prev, status: 'completed' } : null)
      toast.success('Quiz finalizado!')
    })

    // Cleanup event listeners
    return () => {
      unsubscribeParticipantJoined()
      unsubscribeParticipantLeft()
      unsubscribeParticipantsUpdated()
      unsubscribeQuizStarted()
      unsubscribeQuizPaused()
      unsubscribeQuizFinished()
    }
  }, [websocket.isConnected, hasJoinedWebSocket, roomId])

  // Cleanup: leave WebSocket room when component unmounts
  useEffect(() => {
    return () => {
      if (hasJoinedWebSocket && websocket.currentRoom === roomId) {
        console.log(`[ManageRoom] 🚪 Leaving WebSocket room ${roomId} on cleanup`)
        websocket.leaveRoom({ roomId })
        setHasJoinedWebSocket(false)
        lastJoinedRoomRef.current = null // Reset the joined room ref
      }
      // Reset joining state on cleanup
      setIsJoiningWebSocket(false)
    }
  }, [roomId, hasJoinedWebSocket, websocket.currentRoom])

  // Note: Removed periodic refresh to prevent infinite loops
  // Users can manually refresh using the refresh button

  // Enhanced kick participant handler
  const handleKickParticipant = async () => {
    if (!room || !websocket.isConnected || !selectedParticipant) {
      toast.error('Não é possível remover participante: WebSocket não conectado')
      return
    }

    try {
      setKickingParticipant(selectedParticipant.id)
      console.log(`[ManageRoom] 🚫 Kicking participant ${selectedParticipant.id} from room ${room.id}`)
      
      const reason = `Removido pelo administrador da sala ${room.name}`
      
      await websocket.kickParticipant({
        roomId: room.id,
        participantId: selectedParticipant.id,
        reason
      })
      
      toast.success(`${selectedParticipant.name} foi removido da sala com sucesso!`)
      console.log(`[ManageRoom] ✅ Participant ${selectedParticipant.id} kicked successfully`)
      
      // Update room data manually
      setTimeout(() => refreshData(), 1000)
      
    } catch (error) {
      console.error('[ManageRoom] ❌ Error kicking participant:', error)
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro ao remover ${selectedParticipant.name}: ${errorMsg}`)
    } finally {
      setKickingParticipant(null)
      setIsKickDialogOpen(false)
      setSelectedParticipant(null)
    }
  }

  // Enhanced quiz control handlers
  const handleStartRoom = async () => {
    if (!room || !websocket.isConnected) {
      toast.error('Não é possível iniciar quiz: WebSocket não conectado')
      return
    }

    try {
      console.log(`[ManageRoom] ▶️ Starting quiz for room ${room.id}`)
      websocket.startQuiz({ roomId: room.id })
      toast.success('Quiz iniciado com sucesso!')
      setRoom(prev => prev ? { ...prev, status: 'active' } : null)
    } catch (error) {
      console.error('[ManageRoom] ❌ Error starting quiz:', error)
      toast.error('Erro ao iniciar quiz')
    }
  }

  const handlePauseRoom = async () => {
    if (!room || !websocket.isConnected) {
      toast.error('Não é possível pausar quiz: WebSocket não conectado')
      return
    }

    try {
      console.log(`[ManageRoom] ⏸️ Pausing quiz for room ${room.id}`)
      websocket.pauseQuiz({ roomId: room.id })
      toast.success('Quiz pausado com sucesso!')
      setRoom(prev => prev ? { ...prev, status: 'paused' } : null)
    } catch (error) {
      console.error('[ManageRoom] ❌ Error pausing quiz:', error)
      toast.error('Erro ao pausar quiz')
    }
  }

  const handleEndRoom = async () => {
    if (!room || !websocket.isConnected) {
      toast.error('Não é possível finalizar quiz: WebSocket não conectado')
      return
    }

    try {
      console.log(`[ManageRoom] 🏁 Ending quiz for room ${room.id}`)
      websocket.endQuiz({ roomId: room.id })
      toast.success('Quiz finalizado com sucesso!')
      setRoom(prev => prev ? { ...prev, status: 'completed' } : null)
    } catch (error) {
      console.error('[ManageRoom] ❌ Error ending quiz:', error)
      toast.error('Erro ao finalizar quiz')
    } finally {
      setIsEndDialogOpen(false)
    }
  }

  // Utility functions
  const copyRoomCode = async () => {
    if (!room) return

    try {
      const codeToShare = room.accessCode || room.code || ''
      if (!codeToShare) {
        toast.error('Código da sala não disponível')
        return
      }
      await navigator.clipboard.writeText(codeToShare)
      toast.success('Código da sala copiado!')
    } catch {
      toast.error('Erro ao copiar código')
    }
  }

  const refreshData = useCallback(async () => {
    if (!roomId || sessionStatus === 'loading') return

    try {
      setLoading(true)
      toast.info('Atualizando dados...')

      if (sessionStatus === 'unauthenticated' || !session?.accessToken) {
        toast.error('Sessão expirada. Redirecionando para login...')
        router.push('/auth/signin')
        return
      }

      console.log(`[ManageRoom] 🔄 Manual refresh for room ${roomId}`)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Sessão expirada. Redirecionando para login...')
          router.push('/auth/signin')
          return
        }
        if (response.status === 403) {
          toast.error('Acesso negado. Você não tem permissão para gerenciar esta sala.')
          router.push('/dashboard')
          return
        }
        if (response.status === 404) {
          toast.error('Sala não encontrada.')
          router.push('/dashboard')
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const roomData = await response.json()
      console.log('[ManageRoom] 🔄 Manual refresh data received:', roomData)
      
      // Normalize room data to handle both code and accessCode fields
      const normalizedRoom: Room = {
        ...roomData,
        code: roomData.accessCode || roomData.code,
        accessCode: roomData.accessCode || roomData.code,
        status: roomData.status || 'waiting', // Ensure status always has a value
        currentParticipants: roomData.currentParticipants || 0,
        maxParticipants: roomData.maxParticipants || 50,
        // Normalize quiz data with safety checks
        quiz: roomData.quiz ? {
          ...roomData.quiz,
          status: roomData.quiz.status || 'draft', // Ensure quiz status always has a value
          currentQuestionIndex: typeof roomData.quiz.currentQuestionIndex === 'number' ? roomData.quiz.currentQuestionIndex : 0,
          totalQuestions: typeof roomData.quiz.totalQuestions === 'number' ? roomData.quiz.totalQuestions : 0
        } : undefined
      }
      
      setRoom(normalizedRoom)
      console.log('[ManageRoom] 🔄 Refresh completed - quiz data:', normalizedRoom.quiz)
      toast.success('Dados atualizados!')

    } catch (err) {
      console.error('[ManageRoom] ❌ Error during manual refresh:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar dados'
      toast.error(`Erro ao atualizar: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [roomId, sessionStatus, session, router])

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-500'
    
    switch (status.toLowerCase()) {
      case 'waiting': return 'bg-yellow-500'
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-orange-500'
      case 'completed': return 'bg-blue-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getParticipantStatusIcon = (status: string | undefined) => {
    if (!status) return <WifiOff className="h-4 w-4 text-gray-500" />
    
    switch (status.toLowerCase()) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-500" />
      case 'disconnected': return <WifiOff className="h-4 w-4 text-red-500" />
      case 'answering': return <Clock className="h-4 w-4 text-blue-500" />
      case 'finished': return <Trophy className="h-4 w-4 text-purple-500" />
      case 'kicked': return <Ban className="h-4 w-4 text-red-700" />
      default: return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-600 flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        )
      case 'connecting':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Conectando...
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Erro de Conexão
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Desconectado
          </Badge>
        )
    }
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Carregando dados da sala...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error || 'Sala não encontrada'}</p>
            <Button onClick={() => router.push('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Enhanced Room Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
                {room.name}
              </h1>
              <p className="text-sm text-blue-600">Gerenciamento da Sala</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${getStatusColor(room.status)} text-white shadow-lg`}>
              {room.status || 'Indefinido'}
            </Badge>
            <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border shadow-sm">
              <Copy className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-mono font-bold text-blue-800">
                {room.accessCode || room.code}
              </span>
            </div>
            {getConnectionStatusBadge()}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={copyRoomCode}
            variant="outline"
            size="sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Código
          </Button>
          
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>

          {room.status === 'waiting' && (
            <Button
              onClick={handleStartRoom}
              disabled={!websocket.isConnected}
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Quiz
            </Button>
          )}

          {room.status === 'active' && (
            <Button
              onClick={handlePauseRoom}
              variant="secondary"
              disabled={!websocket.isConnected}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </Button>
          )}

          {(room.status === 'active' || room.status === 'paused') && (
            <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={!websocket.isConnected}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Finalizar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Finalizar Quiz</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja finalizar o quiz? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEndDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleEndRoom}>
                    Finalizar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Enhanced Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {websocket.isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className={websocket.isConnected ? 'text-green-600' : 'text-red-600'}>
                WebSocket {websocket.isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {hasJoinedWebSocket ? (
                <>
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Recebendo atualizações em tempo real</span>
                </>
              ) : websocket.isConnected ? (
                <>
                  <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-yellow-600">Conectando à sala...</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-red-600">Sem atualizações em tempo real</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Room Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Informações da Sala
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participantes:</span>
              <span>{room.currentParticipants} / {room.maxParticipants}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status da Sala:</span>
              <Badge className={`${getStatusColor(room.status)} text-white`}>
                {room.status || 'Indefinido'}
              </Badge>
            </div>
            {room.status === 'waiting' && (
              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  ⏳ Sala aguardando início. Use o botão &quot;Iniciar Quiz&quot; quando estiver pronto.
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criada em:</span>
              <span>{new Date(room.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span>{room.roomType === 'private' ? 'Privada' : 'Pública'}</span>
            </div>
            {room.timeMode && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modo de Tempo:</span>
                <span>{room.timeMode === 'per_question' ? 'Por Questão' : 'Por Quiz'}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {room.quiz ? (
          <Card>
            <CardHeader>
              <CardTitle>Quiz Associado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">{room.quiz.title}</h4>
                {room.quiz.description && (
                  <p className="text-sm text-muted-foreground">{room.quiz.description}</p>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questões:</span>
                <span>
                  {room.quiz.totalQuestions && typeof room.quiz.totalQuestions === 'number' && room.quiz.totalQuestions > 0 ? (
                    `${(room.quiz.currentQuestionIndex || 0) + 1} / ${room.quiz.totalQuestions}`
                  ) : (
                    'Não disponível'
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status do Quiz:</span>
                <Badge className={`${getStatusColor(room.quiz.status)} text-white`}>
                  {room.quiz.status || 'Indefinido'}
                </Badge>
              </div>
              {room.quiz.status === 'draft' && room.status === 'waiting' && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                  <p className="text-xs text-blue-700 dark:text-blue-400">
                    💡 Sala aguardando início. O quiz será ativado quando iniciar a sala.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-muted-foreground">Nenhum quiz associado a esta sala.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Um quiz deve ser associado à sala antes de poder iniciar.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enhanced Participants from WebSocket Context */}
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-3">
            <div className="h-8 w-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold">
                Participantes em Tempo Real ({websocket.participants.length})
              </div>
              <div className="text-sm opacity-90">
                Gerencie os participantes da sala via WebSocket
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {websocket.participants.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative mb-6">
                <Users className="h-16 w-16 mx-auto text-green-400" />
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-orange-400 rounded-full animate-ping"></div>
              </div>
              <p className="text-green-700 font-medium text-lg">
                {hasJoinedWebSocket 
                  ? "&quot;🎯 Aguardando participantes...&quot;" 
                  : "&quot;🔄 Conectando ao sistema em tempo real...&quot;"}
              </p>
              <p className="text-green-600 text-sm mt-2">
                {hasJoinedWebSocket 
                  ? "&quot;Compartilhe o código da sala para que os alunos possam participar&quot;" 
                  : "&quot;Estabelecendo conexão com o servidor&quot;"}
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {websocket.participants
                .filter((participant, index) => {
                  if (!participant) {
                    console.warn(`[ManageRoom] ⚠️ Null participant at index ${index}`)
                    return false
                  }
                  if (!participant.id && !participant.name) {
                    console.warn(`[ManageRoom] ⚠️ Participant with no ID or name at index ${index}:`, participant)
                  }
                  return true
                })
                .map((participant, index) => (
                <div key={participant.id || `participant-${participant.name || index}`} 
                     className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-green-100 hover:border-green-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    {/* Avatar with status indicator */}
                    <div className="relative">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1">
                        {getParticipantStatusIcon(participant.status)}
                      </div>
                    </div>
                    
                    {/* Participant info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-gray-800 truncate">{participant.name}</span>
                        {participant.isHost && (
                          <Crown className="h-5 w-5 text-yellow-500 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={participant.role === 'teacher' ? 'default' : 'secondary'} className="font-medium">
                          {participant.role === 'teacher' ? '👨‍🏫 Professor' : '👨‍🎓 Aluno'}
                        </Badge>
                        <Badge variant="outline" className="bg-gradient-to-r from-green-100 to-blue-100 border-green-300">
                          🏆 {participant.score} pts
                        </Badge>
                        <span className="text-xs text-gray-500">
                          📅 {new Date(participant.lastActivity).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {participant.role !== 'teacher' && !participant.isHost && (
                      <Dialog open={isKickDialogOpen} onOpenChange={setIsKickDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={kickingParticipant === participant.id || !websocket.isConnected}
                            onClick={() => setSelectedParticipant({ id: participant.id, name: participant.name })}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                          >
                            {kickingParticipant === participant.id ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                Removendo...
                              </>
                            ) : (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Remover
                              </>
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remover Participante</DialogTitle>
                            <DialogDescription>
                              Tem certeza que deseja remover <strong>{selectedParticipant?.name}</strong> da sala?
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {
                              setIsKickDialogOpen(false)
                              setSelectedParticipant(null)
                            }}>
                              Cancelar
                            </Button>
                            <Button variant="destructive" onClick={handleKickParticipant}>
                              Remover
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div><strong>Room ID:</strong> {roomId}</div>
            <div><strong>Access Code:</strong> {room.accessCode}</div>
            <div><strong>Legacy Code:</strong> {room.code}</div>
            <div><strong>WebSocket Connected:</strong> {websocket.isConnected ? '✅' : '❌'}</div>
            <div><strong>WebSocket Ready:</strong> {websocket.isConnected ? '✅' : '❌'}</div>
            <div><strong>Joined WebSocket Room:</strong> {hasJoinedWebSocket ? '✅' : '❌'}</div>
            <div><strong>Current WebSocket Room:</strong> {websocket.currentRoom || 'None'}</div>
            <div><strong>Connection Status:</strong> {connectionStatus}</div>
            <div><strong>Session Status:</strong> {sessionStatus}</div>
            <div><strong>User Role:</strong> {session?.user?.role}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 