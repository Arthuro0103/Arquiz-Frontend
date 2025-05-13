'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
// import { PlayIcon, PauseIcon, StopIcon, SkipForwardIcon } from "@lucide-react"; // Removido temporariamente
// import { connectWebSocket, disconnectWebSocket, subscribeToRoomUpdates } from '@/lib/websocket'; // A ser criado

// Tipos simulados
type Participant = {
  id: string;
  name: string;
  score: number;
  currentQuestionIndex: number;
  status: 'connected' | 'disconnected' | 'finished';
};

type MonitoringState = {
  roomName: string;
  quizTitle: string;
  status: 'waiting' | 'in-progress' | 'finished';
  participants: Participant[];
  totalQuestions: number;
  // Poderia ter mais dados: tempo atual, questão atual geral, etc.
};

// Dados simulados iniciais
const mockMonitoringData: MonitoringState = {
  roomName: 'Sala de Competição XYZ',
  quizTitle: 'Quiz de Geografia Mundial',
  status: 'in-progress',
  totalQuestions: 10,
  participants: [
    { id: 'p1', name: 'Carlos', score: 3, currentQuestionIndex: 4, status: 'connected' },
    { id: 'p2', name: 'Diana', score: 5, currentQuestionIndex: 5, status: 'connected' },
    { id: 'p3', name: 'Eduardo', score: 4, currentQuestionIndex: 4, status: 'finished' },
    { id: 'p4', name: 'Fernanda', score: 2, currentQuestionIndex: 3, status: 'disconnected' },
  ],
};

export default function MonitoringPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [monitoringState, setMonitoringState] = useState<MonitoringState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simular carregamento inicial e conexão WebSocket
  useEffect(() => {
    setIsLoading(true);
    console.log(`[Simulação WS] Conectando ao monitoramento da sala ${roomId}...`);
    // connectWebSocket(roomId);

    // Simular recebimento de dados iniciais
    setTimeout(() => {
      setMonitoringState(mockMonitoringData);
      setIsLoading(false);
      toast.success("Conectado ao monitoramento da sala!");
    }, 1500);

    // Simular recebimento de atualizações via WebSocket
    const intervalId = setInterval(() => {
      // Simula atualização de um participante aleatório
      setMonitoringState((prevState) => {
        if (!prevState) return null;
        const randomIndex = Math.floor(Math.random() * prevState.participants.length);
        const participantToUpdate = prevState.participants[randomIndex];

        // Simula avanço ou desconexão
        let updatedParticipant: Participant;
        if (Math.random() < 0.1 && participantToUpdate.status === 'connected') {
            updatedParticipant = { ...participantToUpdate, status: 'disconnected' };
            console.log(`[Simulação WS] ${updatedParticipant.name} desconectou.`);
            toast.warning(`${updatedParticipant.name} desconectou!`);
        } else if (participantToUpdate.currentQuestionIndex < prevState.totalQuestions && participantToUpdate.status === 'connected') {
            const newIndex = participantToUpdate.currentQuestionIndex + 1;
            const scoreIncrease = Math.random() < 0.7 ? 1 : 0; // 70% chance de acertar
            updatedParticipant = {
                ...participantToUpdate,
                currentQuestionIndex: newIndex,
                score: participantToUpdate.score + scoreIncrease,
                status: newIndex === prevState.totalQuestions ? 'finished' : 'connected',
            };
            console.log(`[Simulação WS] ${updatedParticipant.name} avançou para questão ${newIndex}, score ${updatedParticipant.score}`);
        } else {
            return prevState; // Sem alteração se já terminou ou desconectou
        }

        const newParticipants = [...prevState.participants];
        newParticipants[randomIndex] = updatedParticipant;

        return {
          ...prevState,
          participants: newParticipants.sort((a, b) => b.score - a.score), // Reordenar por score
        };
      });
    }, 4000); // Atualização simulada a cada 4 segundos

    return () => {
      console.log(`[Simulação WS] Desconectando do monitoramento da sala ${roomId}...`);
      clearInterval(intervalId);
      // disconnectWebSocket(roomId);
    };
  }, [roomId]);

  const handleControlAction = (action: string) => {
    console.log(`[Simulação Controle] Ação: ${action}, Sala: ${roomId}`);
    toast.info(`Ação de controle '${action}' enviada (simulado).`);
    // TODO: Implementar envio de comando via WebSocket para o backend
    // Ex: Mudar status da sala, avançar questão para todos, etc.
    if (action === 'finish') {
        setMonitoringState(prev => prev ? {...prev, status: 'finished'} : null);
    } else if (action === 'pause') {
        // Simular mudança visual temporária ou estado de pausa
        toast.warning('Competição pausada (simulado)');
    }
  };

  if (isLoading || !monitoringState) {
    return <div className="flex justify-center items-center h-screen">Carregando monitoramento da sala...</div>;
  }

  const { roomName, quizTitle, status, participants, totalQuestions } = monitoringState;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{roomName}</CardTitle>
              <CardDescription>Monitoramento em Tempo Real - Quiz: {quizTitle}</CardDescription>
            </div>
            <Badge variant={status === 'in-progress' ? 'default' : status === 'finished' ? 'destructive' : 'secondary' }>
              {status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border rounded-lg bg-muted/40">
                <div className="text-sm text-muted-foreground">
                    <p>Total de Questões: {totalQuestions}</p>
                    {/* TODO: Exibir questão atual geral, tempo restante geral */}
                    <p>Questão Atual (Geral): X/{totalQuestions}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                    <Button variant="outline" size="sm" onClick={() => handleControlAction('pause')} disabled={status !== 'in-progress'}>
                        {/* <PauseIcon className="h-4 w-4 mr-2" /> */} Pausar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleControlAction('resume')} disabled={status !== 'in-progress'}> {/* Deveria ter estado de pause */} 
                        {/* <PlayIcon className="h-4 w-4 mr-2" /> */} Retomar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleControlAction('next_question')} disabled={status !== 'in-progress'}>
                        {/* <SkipForwardIcon className="h-4 w-4 mr-2" /> */} Próxima Questão
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleControlAction('finish')} disabled={status === 'finished'}>
                        {/* <StopIcon className="h-4 w-4 mr-2" /> */} Encerrar Competição
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Tabela de Participantes/Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking e Progresso</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Progresso</TableHead>
                <TableHead className="text-right">Pontuação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={p.status === 'connected' ? 'outline' : p.status === 'finished' ? 'default' : 'secondary' }>
                        {p.status}
                    </Badge>
                    </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                         <span>{p.currentQuestionIndex}/{totalQuestions}</span>
                        <Progress value={(p.currentQuestionIndex / totalQuestions) * 100} className="w-20 h-2" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{p.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Estatísticas Avançadas</CardTitle>
            <CardDescription>Visão geral do desempenho nas questões.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* TODO: Implementar visualização de estatísticas por questão */}
            <p className="text-sm text-muted-foreground">Em breve: Gráficos e detalhes por questão (ex: % de acerto, tempo médio de resposta).</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(qNum => (
                    <Card key={qNum} className="bg-muted/20">
                        <CardHeader className="p-4">
                            <CardTitle className="text-base">Questão {qNum}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 text-xs">
                            <p>Acertos: N/A</p>
                            <p>Erros: N/A</p>
                            <p>Tempo Médio: N/A</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </CardContent>
      </Card>

      <Sonner />
    </div>
  );
} 