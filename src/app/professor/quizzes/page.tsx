'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import {
  getQuizzesByUserId,
  deleteQuiz,
  createQuizFromTranscription
} from '@/actions/quiz.actions';
import { Quiz } from '@/types/quiz.types';
import { PlusCircle, Search, Edit, Trash2, Brain } from 'lucide-react';

// Mock userId - substituir pela lógica de autenticação real
const MOCK_USER_ID = 'mockUserId';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  useEffect(() => {
    async function fetchQuizzes() {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Substituir MOCK_USER_ID pelo ID do usuário logado da sessão
        const fetchedQuizzes = await getQuizzesByUserId(MOCK_USER_ID);
        setQuizzes(fetchedQuizzes);
      } catch (err) {
        console.error('Erro ao buscar quizzes:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar quizzes.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuizzes();
  }, []);

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    try {
      // TODO: Permitir que o usuário selecione uma transcrição real
      const mockTranscriptionId = '0415145a-0a92-4729-8657-c3599e39137b'; // ID mockado
      const newQuiz = await createQuizFromTranscription(mockTranscriptionId, 7, 'Quiz de Teste Gerado por IA');
      setQuizzes(prevQuizzes => [...prevQuizzes, newQuiz]);
      // TODO: Adicionar feedback para o usuário (toast, etc.)
      alert(`Quiz "${newQuiz.title}" gerado com sucesso!`);
    } catch (error) {
      console.error('Falha ao gerar quiz com IA:', error);
      alert(`Erro ao gerar quiz: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // TODO: Implementar deleteQuizAction e lógica de deleção
  const handleDeleteQuiz = async (quizId: string) => {
    if (window.confirm('Tem certeza que deseja deletar este quiz?')) {
      try {
        // await deleteQuizAction(quizId);
        // setQuizzes(prevQuizzes => prevQuizzes.filter(q => q.id !== quizId));
        alert('Funcionalidade de deletar ainda não implementada.');
      } catch (err) {
        console.error('Erro ao deletar quiz:', err);
        setError(err instanceof Error ? err.message : 'Erro ao deletar quiz.');
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Meus Quizzes</h1>
        <Link href="/professor/quizzes/novo" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Quiz
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar quizzes pelo título..."
            className="pl-10 w-full md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz}>
          <Brain className="mr-2 h-4 w-4" />
          {isGeneratingQuiz ? 'Gerando com IA...' : 'Gerar Quiz com IA'}
        </Button>
      </div>

      {isLoading && <p>Carregando quizzes...</p>}
      {error && <p className="text-red-500">Erro: {error}</p>}

      {!isLoading && !error && filteredQuizzes.length === 0 && (
        <div className="text-center py-10">
          <p className="text-xl text-gray-500 mb-2">Nenhum quiz encontrado.</p>
          <p className="text-gray-400">Crie seu primeiro quiz clicando no botão acima!</p>
        </div>
      )}

      {!isLoading && !error && filteredQuizzes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader>
                <CardTitle>{quiz.title}</CardTitle>
                <CardDescription>
                  {quiz.questions.length} {quiz.questions.length === 1 ? 'pergunta' : 'perguntas'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Poderia mostrar um resumo ou a data de criação aqui */}
                <p className="text-sm text-gray-500">ID: {quiz.id}</p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Link href={`/professor/quizzes/${quiz.id}/editar`} passHref>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  // TODO: Desabilitar se a ação de deletar estiver em progresso
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Deletar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 