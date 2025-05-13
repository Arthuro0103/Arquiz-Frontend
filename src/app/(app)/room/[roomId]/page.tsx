'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from '@/components/ui/badge';

// TODO: Definir tipo real quando a action for implementada
type RoomDetails = {
  id: string;
  name: string;
  quizTitle: string;
  startTime: string; // Ou Date
  participants: { id: string; name: string }[];
  status: 'waiting' | 'in-progress' | 'finished';
};

// Função auxiliar para formatar o tempo
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function WaitingRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Usar a action real. Por agora, simular resposta.
        // const details = await getRoomDetails(roomId);
        const startTime = new Date(Date.now() + 2 * 60 * 1000); // 2 min no futuro para teste
        const details: RoomDetails = await new Promise((resolve) =>
          setTimeout(() => resolve({
            id: roomId,
            name: `Sala de Competição ${roomId}`,
            quizTitle: 'Quiz de História Antiga',
            startTime: startTime.toISOString(), // Usar a data de início
            participants: [
              { id: '1', name: 'Alice' },
              { id: '2', name: 'Bob' },
            ], // Menos participantes iniciais
            status: 'waiting',
          }), 500) // Delay menor
        );
        setRoomDetails(details);

        // Calcular tempo restante inicial
        const now = new Date();
        const start = new Date(details.startTime);
        const diffSeconds = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 1000));
        setTimeRemaining(diffSeconds);
      } catch (err) {
        console.error("Failed to fetch room details:", err);
        setError('Falha ao carregar detalhes da sala. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [roomId]);

  // Efeito para o contador regressivo
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timerId = setInterval(() => {
      setTimeRemaining((prevTime) => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(timerId);
          // TODO: Mudar status da sala para 'in-progress' e talvez redirecionar
          console.log("Tempo esgotado! Iniciando competição...");
          setRoomDetails(prevDetails => prevDetails ? { ...prevDetails, status: 'in-progress' } : null);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId); // Limpar intervalo ao desmontar
  }, [timeRemaining]);

  // Efeito para simular entrada de participantes (WebSockets)
  useEffect(() => {
    if (!roomDetails || roomDetails.status !== 'waiting') return;

    const participantInterval = setInterval(() => {
      setRoomDetails((prevDetails) => {
        if (!prevDetails) return null;
        const newParticipantId = String(prevDetails.participants.length + 1);
        const newParticipant = {
          id: newParticipantId,
          name: `Novo_Participante_${newParticipantId}`
        };
        // Simula a chegada de um novo participante
        return {
          ...prevDetails,
          participants: [...prevDetails.participants, newParticipant],
        };
      });
    }, 5000); // Novo participante a cada 5 segundos

    return () => clearInterval(participantInterval);
  }, [roomDetails]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando detalhes da sala... <Progress value={50} className="w-[60%] mt-2" /></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  if (!roomDetails) {
    return <div className="flex justify-center items-center h-screen">Sala não encontrada.</div>;
  }

  // Calcula progresso da espera baseado no tempo inicial (ex: 2 min = 120s)
  const initialDuration = roomDetails?.startTime ? Math.max(0, Math.floor((new Date(roomDetails.startTime).getTime() - (Date.now() - (timeRemaining !== null ? (new Date(roomDetails.startTime).getTime() - Date.now() - timeRemaining * 1000) : 0))) / 1000)) : 120;
  const progressValue = timeRemaining !== null && initialDuration > 0
    ? 100 - (timeRemaining / initialDuration) * 100
    : (roomDetails?.status === 'in-progress' ? 100 : 0);

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
      <Card className="flex-grow">
        <CardHeader>
          <CardTitle>{roomDetails.name}</CardTitle>
          <CardDescription>Quiz: {roomDetails.quizTitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Status: <Badge variant={roomDetails.status === 'waiting' ? 'secondary' : 'default'}>{roomDetails.status}</Badge></p>
            {roomDetails.status === 'waiting' && timeRemaining !== null && (
              <>
                <p>A competição começará em:</p>
                <div className="text-4xl font-bold text-center">{formatTime(timeRemaining)}</div>
                <Progress value={progressValue} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">Aguardando início...</p>
              </>
            )}
             {roomDetails.status === 'in-progress' && (
                <p className="text-lg font-semibold text-center text-green-600">Competição em andamento!</p>
                // TODO: Redirecionar para a página da competição
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full md:w-1/3">
        <CardHeader>
          <CardTitle>Participantes ({roomDetails.participants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-60">
            <ul className="space-y-2">
              {roomDetails.participants.map((p) => (
                <li key={p.id} className="flex items-center justify-between p-2 border rounded">
                  <span>{p.name}</span>
                  {/* TODO: Adicionar indicador de status (conectado/desconectado) */}
                  <Badge variant="outline">Conectado</Badge>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 