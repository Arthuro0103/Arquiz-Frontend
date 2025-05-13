'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Tipos simulados (devem vir de um local compartilhado eventualmente)
type QuizQuestion = {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  // Adicionar a resposta do aluno para revisão
  studentAnswerId?: string | null;
};

type ResultsState = {
  roomId: string;
  quizTitle: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  questions: QuizQuestion[]; // Incluir as questões para revisão
  status: 'loading' | 'loaded' | 'error';
};

// Dados simulados
const mockResults: Omit<ResultsState, 'status' | 'roomId' | 'studentName'> = {
  quizTitle: 'Quiz de História Antiga',
  score: 2,
  totalQuestions: 3,
  questions: [
    {
      id: 'q1',
      questionText: 'Qual evento marcou o início da Revolução Francesa?',
      options: [
        { id: 'o1a', text: 'A Tomada da Bastilha' },
        { id: 'o1b', text: 'A convocação dos Estados Gerais' },
        { id: 'o1c', text: 'O Reinado do Terror' },
        { id: 'o1d', text: 'A execução de Luís XVI' },
      ],
      correctOptionId: 'o1a',
      studentAnswerId: 'o1a', // Acertou
    },
    {
      id: 'q2',
      questionText: 'Quem foi o primeiro presidente dos Estados Unidos?',
      options: [
        { id: 'o2a', text: 'Thomas Jefferson' },
        { id: 'o2b', text: 'Abraham Lincoln' },
        { id: 'o2c', text: 'George Washington' },
        { id: 'o2d', text: 'Benjamin Franklin' },
      ],
      correctOptionId: 'o2c',
      studentAnswerId: 'o2b', // Errou
    },
    {
      id: 'q3',
      questionText: 'Em que ano ocorreu a Queda do Muro de Berlim?',
      options: [
        { id: 'o3a', text: '1985' },
        { id: 'o3b', text: '1989' },
        { id: 'o3c', text: '1991' },
        { id: 'o3d', text: '1993' },
      ],
      correctOptionId: 'o3b',
      studentAnswerId: 'o3b', // Acertou
    },
  ],
};


export default function ResultsPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [resultsState, setResultsState] = useState<ResultsState>({ 
      roomId: roomId, 
      quizTitle: '', 
      studentName: '', 
      score: 0, 
      totalQuestions: 0, 
      questions: [], 
      status: 'loading' 
    });

  useEffect(() => {
    if (!roomId) return;
    // TODO: Buscar resultados reais da API
    // TODO: Obter nome do aluno (localStorage?)
    const storedName = localStorage.getItem('studentName') || 'Aluno';

    setTimeout(() => {
      setResultsState({
        ...mockResults,
        roomId: roomId,
        studentName: storedName,
        status: 'loaded',
      });
    }, 1000);

  }, [roomId]);

  if (resultsState.status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Carregando seus resultados...</div>;
  }

  if (resultsState.status === 'error') {
    return <div className="flex justify-center items-center h-screen text-red-500">Falha ao carregar os resultados.</div>;
  }

  const { quizTitle, studentName, score, totalQuestions, questions } = resultsState;

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Resultados Finais</CardTitle>
          <CardDescription>Quiz: {quizTitle} - Sala: {roomId}</CardDescription>
          <p className="pt-2 text-lg font-medium">Parabéns, {studentName}!</p>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-xl mb-2">Sua Pontuação:</p>
          <p className="text-5xl font-bold">{score} / {totalQuestions}</p>
          {/* TODO: Adicionar posição no ranking se disponível */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Revisão das Questões</CardTitle>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                {questions.map((q, index) => {
                    const studentAnswerText = q.options.find(opt => opt.id === q.studentAnswerId)?.text || 'Não respondida';
                    const correctAnswerText = q.options.find(opt => opt.id === q.correctOptionId)?.text;
                    const isCorrect = q.studentAnswerId === q.correctOptionId;
                    return (
                        <AccordionItem value={`item-${index}`} key={q.id}>
                            <AccordionTrigger className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                                Questão {index + 1}: {isCorrect ? 'Correta' : 'Incorreta'}
                            </AccordionTrigger>
                            <AccordionContent className="space-y-2">
                                <p className="font-semibold">{q.questionText}</p>
                                <p>Sua resposta: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{studentAnswerText}</span></p>
                                {!isCorrect && (
                                    <p>Resposta correta: <span className="text-blue-600">{correctAnswerText}</span></p>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </CardContent>
      </Card>

      <div className="text-center">
         <Button onClick={() => window.location.href = '/dashboard'}>Voltar ao Dashboard</Button> {/* Ou para uma página inicial */} 
      </div>
    </div>
  );
} 