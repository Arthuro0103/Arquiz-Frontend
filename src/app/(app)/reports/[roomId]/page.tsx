'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// Tipos simplificados para consistência
interface ParticipantSummary {
  id: string;
  name: string;
  score: number;
  rank: number;
  // correctAnswers: number; // Simplificado - remover se não usado diretamente
  // totalAnswers: number;   // Simplificado - remover se não usado diretamente
}

interface QuestionStat {
  questionIndex: number;
  text: string;
  correctPercentage: number;
}

interface ReportData {
  roomName: string;
  quizTitle: string;
  finishTime: Date;
  participants: ParticipantSummary[];
  questionStats: QuestionStat[];
}

// Dados simulados consistentes
const mockReportData: ReportData = {
  roomName: 'Sala Finalizada XYZ',
  quizTitle: 'Quiz de História Antiga',
  finishTime: new Date(Date.now() - 3600 * 1000), // Há 1 hora
  participants: [
    { id: 'p1', name: 'Alice', score: 90, rank: 1 },
    { id: 'p2', name: 'Bob', score: 75, rank: 2 },
    { id: 'p3', name: 'Carlos', score: 80, rank: 3 }, // Rank simulado, idealmente calculado
  ],
  questionStats: [
    { questionIndex: 0, text: 'Qual a capital do Egito Antigo?' , correctPercentage: 80 },
    { questionIndex: 1, text: 'Quem foi Alexandre, o Grande?' , correctPercentage: 65 },
  ],
};

export default function ReportPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    console.log(`[Simulação API] Buscando relatório da sala ${roomId}...`);
    setTimeout(() => {
      // Simular busca e adicionar rank se necessário (mock já tem rank)
      setReportData(mockReportData);
      setIsLoading(false);
    }, 1000);
  }, [roomId]);

  // Preparar dados para o gráfico
  const scoreDistributionData = reportData?.participants.reduce((acc, p) => {
    const scoreRange = Math.floor(p.score / 10) * 10; // Agrupa por dezenas
    const existingEntry = acc.find(entry => entry.name === `${scoreRange}-${scoreRange + 9}`);
    if (existingEntry) {
      existingEntry.value += 1;
    } else {
      acc.push({ name: `${scoreRange}-${scoreRange + 9}`, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]) || [];

  if (isLoading || !reportData) {
    return <div className="flex justify-center items-center h-screen">Carregando relatório...</div>;
  }

  const { roomName, quizTitle, finishTime, participants, questionStats } = reportData;
  const totalQuestionsInReport = questionStats.length; // Calculado a partir dos dados

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório da Competição</CardTitle>
          <CardDescription>Resultados de: {roomName} - {quizTitle}</CardDescription>
          <div className="text-sm text-muted-foreground pt-2">
            <p>Finalizada em: {finishTime.toLocaleString()}</p>
            <p>Total de Participantes: {participants.length}</p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ranking dos Participantes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Pontuação</TableHead></TableRow></TableHeader>
            <TableBody>
              {participants.sort((a,b) => a.rank - b.rank).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.rank}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell className="text-right">{p.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Distribuição de Pontuações</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDistributionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Nº de Alunos" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Desempenho por Questão</CardTitle></CardHeader>
        <CardContent>
            {totalQuestionsInReport > 0 ? (
                <div className="space-y-2">
                {questionStats.map((qStat) => (
                    <div key={qStat.questionIndex} className="p-3 border rounded-md bg-muted/30">
                    <p className="font-medium">Questão {qStat.questionIndex + 1}: {qStat.text.substring(0,50)}...</p>
                    <p className="text-sm">Percentual de Acerto: {qStat.correctPercentage}%</p>
                    </div>
                ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">Não há dados de desempenho por questão disponíveis.</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Comparação Histórica (Placeholder)</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Em breve: Compare o desempenho desta sala com outras salas anteriores ou com a média geral.
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 