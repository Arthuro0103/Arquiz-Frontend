'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QuestionDisplay } from '@/components/QuestionDisplay';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";

// Tipos simulados
type QuizQuestion = {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId: string; // Apenas para simulação de feedback
};

type CompetitionState = {
  quizTitle: string;
  currentQuestionIndex: number;
  questions: QuizQuestion[];
  timeLeft: number; // Tempo para a questão atual
  score: number;
  totalQuestions: number;
  status: 'loading' | 'active' | 'finished';
};

// Dados simulados para o quiz
const mockQuiz: QuizQuestion[] = [
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
  },
];

const QUESTION_TIME_LIMIT = 30; // Segundos por questão

export default function CompetitionPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const [competitionState, setCompetitionState] = useState<CompetitionState>({
    quizTitle: 'Carregando Quiz...',
    currentQuestionIndex: 0,
    questions: [],
    timeLeft: QUESTION_TIME_LIMIT,
    score: 0,
    totalQuestions: 0,
    status: 'loading',
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Mover a definição de handleAnswerSubmit para cá e usar useCallback
  const handleAnswerSubmit = useCallback((answerId: string | null) => {
    if (feedback !== null) return; // Já respondeu
    setSubmissionError(null); // Limpar erro anterior

    // Simular uma possível falha na submissão (raro)
    if (Math.random() < 0.05) { // 5% de chance de falha simulada
        console.error("[Simulação] Falha ao submeter resposta.");
        setSubmissionError("Falha ao registrar sua resposta. Tente novamente.");
        return;
    }

    const currentQuestion = competitionState.questions[competitionState.currentQuestionIndex];
    let isCorrect = false;
    if (answerId && answerId === currentQuestion.correctOptionId) {
      isCorrect = true;
      setCompetitionState(prev => ({ ...prev, score: prev.score + 1 }));
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // Ir para a próxima questão ou finalizar após um delay
    setTimeout(() => {
      setFeedback(null);
      setSelectedAnswer(null);
      setCompetitionState((prevState) => {
        const nextIndex = prevState.currentQuestionIndex + 1;
        if (nextIndex >= prevState.totalQuestions) {
          console.log('Competição finalizada. Redirecionando para resultados...')
          router.push(`/results/${roomId}`);
          return { ...prevState, status: 'active' }; // Manter como active enquanto redireciona
        }
        return {
          ...prevState,
          currentQuestionIndex: nextIndex,
          timeLeft: QUESTION_TIME_LIMIT,
        };
      });
    }, 1500);
  }, [feedback, competitionState, router, roomId]);

  // Simular carregamento do quiz
  useEffect(() => {
    // TODO: Buscar dados reais da competição/quiz via API/WebSocket
    setTimeout(() => {
      setCompetitionState({
        quizTitle: `Quiz da Sala ${roomId}`,
        currentQuestionIndex: 0,
        questions: mockQuiz,
        timeLeft: QUESTION_TIME_LIMIT,
        score: 0,
        totalQuestions: mockQuiz.length,
        status: 'active',
      });
    }, 1000);
  }, [roomId]);

  // Timer da questão
  useEffect(() => {
    if (competitionState.status !== 'active' || feedback !== null) return;

    const timer = setInterval(() => {
      setCompetitionState((prevState) => {
        if (prevState.timeLeft <= 1) {
          clearInterval(timer);
          handleAnswerSubmit(null); // Agora handleAnswerSubmit está definida
          return { ...prevState, timeLeft: 0 };
        }
        return { ...prevState, timeLeft: prevState.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [competitionState.status, competitionState.currentQuestionIndex, feedback, handleAnswerSubmit]);

  // Simular recebimento de eventos WebSocket
  useEffect(() => {
    if (competitionState.status !== 'active') return;

    const fakeWebSocketListener = setInterval(() => {
      const randomEvent = Math.random() < 0.1;
      if (randomEvent) {
        console.log('[Simulação WS] Evento recebido: Outro jogador respondeu.');
        toast.info("Atualização", { description: "Outro jogador respondeu!" });
      }
    }, 7000);

    return () => clearInterval(fakeWebSocketListener);
  }, [competitionState.status]);

  if (competitionState.status === 'loading') {
    return <div className="flex justify-center items-center h-screen">Carregando competição...</div>;
  }

  // Proteção caso o estado seja 'finished' antes do redirecionamento (pouco provável)
  if (competitionState.status === 'finished') {
      return <div className="flex justify-center items-center h-screen">Finalizando competição...</div>;
  }

  const currentQuestion = competitionState.questions[competitionState.currentQuestionIndex];
  const progress = ((competitionState.currentQuestionIndex + 1) / competitionState.totalQuestions) * 100;

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="mb-4">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>{competitionState.quizTitle}</CardTitle>
            <CardDescription>Questão {competitionState.currentQuestionIndex + 1} de {competitionState.totalQuestions}</CardDescription>
          </div>
          <div className="text-right">
             <div className="text-lg font-semibold">Tempo: {competitionState.timeLeft}s</div>
             <Progress value={(competitionState.timeLeft / QUESTION_TIME_LIMIT) * 100} className="w-24 h-2 mt-1" />
          </div>
        </CardHeader>
        <CardContent>
            <Progress value={progress} className="w-full mb-4 h-2" />
        </CardContent>
      </Card>

      <QuestionDisplay
        question={currentQuestion}
        selectedAnswer={selectedAnswer}
        onAnswerSelect={setSelectedAnswer}
        feedback={feedback}
        disabled={feedback !== null}
      />

      {submissionError && (
        <p className="mt-4 text-center text-red-600 font-semibold">{submissionError}</p>
      )}

      <div className="mt-6 text-center">
        <Button
          onClick={() => handleAnswerSubmit(selectedAnswer)}
          disabled={!selectedAnswer || feedback !== null || submissionError !== null}
        >
          {submissionError ? "Tentar Novamente" : "Confirmar Resposta"}
        </Button>
      </div>

      <Sonner />
    </div>
  );
} 