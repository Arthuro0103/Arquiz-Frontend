'use client'

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Copy, 
  Share2, 
  Users, 
  Clock, 
  Globe, 
  Lock, 
  ArrowRight,
  Home
} from 'lucide-react';
import { toast } from 'sonner';

interface CompetitionRoom {
  id: string;
  name: string;
  description?: string;
  quizId: string;
  quizTitle: string;
  quizDifficulty: string;
  shuffleQuestions: boolean;
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  showAnswersWhen: 'immediately' | 'end_of_quiz';
  roomType: 'public' | 'private';
  startTime?: string;
  accessCode: string;
  shareableLink?: string;
  status: 'pending' | 'active' | 'finished';
  createdBy: string;
  hostName: string;
  createdAt: string;
  updatedAt: string;
  maxParticipants?: number;
  participantCount?: number;
  isActive: boolean;
}

function RoomSuccessContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId');
  const router = useRouter();
  
  const [room, setRoom] = useState<CompetitionRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!roomId) {
        setError('ID da sala não fornecido');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();
        
        if (data.success && data.room) {
          setRoom(data.room);
        } else {
          setError(data.error || 'Sala não encontrada ou acesso negado');
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes da sala:', err);
        setError('Erro ao carregar detalhes da sala');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  // Auto-redirect countdown effect
  useEffect(() => {
    if (!room || loading || error) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [room, loading, error]);

  // Handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && room) {
      router.push(`/rooms/${room.id}/manage`);
    }
  }, [countdown, room, router]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado para a área de transferência!`);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      toast.error('Erro ao copiar para a área de transferência');
    }
  };

  const shareRoom = async () => {
    if (!room) return;

    const shareData = {
      title: `Sala de Competição: ${room.name}`,
      text: `Participe da minha sala de competição &quot;${room.name}&quot; usando o ${room.roomType === 'private' ? `código ${room.accessCode}` : 'link'}.`,
      url: room.roomType === 'private' 
        ? `${window.location.origin}/rooms/join?code=${room.accessCode}`
        : `${window.location.origin}${room.shareableLink || `/rooms/${room.id}`}`
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        const shareText = `${shareData.text}\n\n${shareData.url}`;
        await copyToClipboard(shareText, 'Link de compartilhamento');
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
      toast.error('Erro ao compartilhar sala');
    }
  };

  const getRoomTypeIcon = (roomType: string) => {
    return roomType === 'private' ? <Lock className="h-5 w-5" /> : <Globe className="h-5 w-5" />;
  };

  const getRoomTypeLabel = (roomType: string) => {
    return roomType === 'private' ? 'Privada' : 'Pública';
  };

  const getTimeConfigLabel = (room: CompetitionRoom) => {
    return room.timeMode === 'per_question' 
      ? `${room.timePerQuestion} segundos por pergunta`
      : `${room.timePerQuiz} segundos total`;
  };

  const getAnswerDisplayLabel = (when: string) => {
    return when === 'immediately' ? 'Imediatamente após cada pergunta' : 'Ao final do quiz';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando detalhes da sala...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="rounded-full bg-destructive/10 p-3 w-fit mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-destructive" />
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
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Success Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="rounded-full bg-green-100 p-3 w-fit mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Sala Criada com Sucesso!</h1>
            <p className="text-muted-foreground mb-4">
              Sua sala de competição está pronta e disponível para {room.roomType === 'private' ? 'participantes com código' : 'todos os participantes'}.
            </p>
            {countdown > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 inline-block">
                <p className="text-sm text-blue-700">
                  Redirecionando para gerenciar a sala em <span className="font-bold text-blue-800">{countdown}</span> segundos...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Room Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detalhes da Sala
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome da Sala</label>
              <p className="font-semibold">{room.name}</p>
            </div>
            
            {room.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm">{room.description}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-muted-foreground">Quiz</label>
              <p className="font-medium">{room.quizTitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <Badge variant="outline" className="flex items-center gap-1">
                {getRoomTypeIcon(room.roomType)}
                {getRoomTypeLabel(room.roomType)}
              </Badge>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Configurações</label>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getTimeConfigLabel(room)}
                </div>
                <p>{room.shuffleQuestions ? 'Perguntas embaralhadas' : 'Ordem original das perguntas'}</p>
                <p>Respostas corretas: {getAnswerDisplayLabel(room.showAnswersWhen)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Informações de Acesso
            </CardTitle>
            <CardDescription>
              {room.roomType === 'private' 
                ? 'Compartilhe o código com os participantes'
                : 'A sala está disponível publicamente'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {room.roomType === 'private' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código de Acesso</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-lg tracking-wider">
                      {room.accessCode}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(room.accessCode, 'Código de acesso')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Os participantes podem usar este código em /rooms/join
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Link Direto</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      readOnly
                      value={`${window.location.origin}/rooms/join?code=${room.accessCode}`}
                      className="flex-1 bg-muted px-3 py-2 rounded text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(
                        `${window.location.origin}/rooms/join?code=${room.accessCode}`,
                        'Link direto'
                      )}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Link de Acesso</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    readOnly
                    value={`${window.location.origin}${room.shareableLink || `/rooms/${room.id}`}`}
                    className="flex-1 bg-muted px-3 py-2 rounded text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(
                      `${window.location.origin}${room.shareableLink || `/rooms/${room.id}`}`,
                      'Link de acesso'
                    )}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  A sala está visível na lista pública de salas
                </p>
              </div>
            )}

            <Button onClick={shareRoom} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar Sala
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
          <CardDescription>
            O que você gostaria de fazer agora?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/rooms/${room.id}/manage`}>
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Gerenciar Sala
              </Button>
            </Link>
            
            <Link href="/rooms">
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Ver Todas as Salas
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="mt-6 border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="rounded-full bg-amber-100 p-2 w-fit">
              <ArrowRight className="h-4 w-4 text-amber-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-800">Lembrete Importante</h3>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Certifique-se de que o quiz &quot;{room.quizTitle}&quot; está finalizado e pronto</li>
                <li>• {room.roomType === 'private' 
                  ? 'Compartilhe o código apenas com os participantes desejados' 
                  : 'A sala aparecerá na lista pública de salas disponíveis'
                }</li>
                <li>• Você pode gerenciar participantes e iniciar a competição quando estiver pronto</li>
                {room.startTime && (
                  <li>• A sala ficará ativa a partir de {new Date(room.startTime).toLocaleString('pt-BR')}</li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RoomSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RoomSuccessContent />
    </Suspense>
  );
} 