'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuizPreview from '@/components/QuizPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Quiz, QuestionDifficulty } from '@/types/quiz.types';
import { getQuizById, updateQuiz } from '@/actions/quiz.actions'; // Import actions
import { Skeleton } from '@/components/ui/skeleton'; // Re-added Skeleton import

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;

  const [uiState, setUiState] = useState<'loading' | 'editing' | 'error' | 'saving'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  // Separate state for settings that are part of QuizSettingsPanel but might be top-level on Quiz
  const [quizSettings, setQuizSettings] = useState<Partial<Quiz>>({});


  const fetchQuizData = useCallback(async () => {
    if (!quizId) {
      setErrorMessage('ID do Quiz não encontrado na URL.');
      setUiState('error');
      return;
    }
    console.log(`[EditQuizPage] Fetching quiz data for ID: ${quizId}`);
    setUiState('loading');
    try {
      const fetchedQuizFromBackend = await getQuizById(quizId) as Quiz & { 
        quizQuestions?: Array<{ 
          question: {
            id: string;
            text: string;
            options: Array<{ id: string; text: string; isCorrect: boolean }>;
            correctOptionId?: string;
            explanation?: string;
            difficulty?: string;
          }; 
          order: number; 
          points: number; 
        }> 
      };

      if (fetchedQuizFromBackend) {
        console.log('[EditQuizPage] Raw quiz data fetched:', JSON.stringify(fetchedQuizFromBackend, null, 2));
        console.log('[EditQuizPage] quizQuestions type and length:', typeof fetchedQuizFromBackend.quizQuestions, fetchedQuizFromBackend.quizQuestions?.length);
        
        // Transform backend's quizQuestions to frontend's questions structure
        const transformedQuestions = fetchedQuizFromBackend.quizQuestions && Array.isArray(fetchedQuizFromBackend.quizQuestions) 
          ? fetchedQuizFromBackend.quizQuestions
              .map((qq: { 
                question: {
                  id: string;
                  text: string;
                  options: Array<{ id: string; text: string; isCorrect: boolean }>;
                  correctOptionId?: string;
                  explanation?: string;
                  difficulty?: string;
                }; 
                order: number; 
                points: number; 
              }, index: number) => {
                console.log(`[EditQuizPage] Processing quizQuestion ${index}:`, qq);
                const backendQuestion = qq.question;
                if (!backendQuestion) {
                  console.warn(`[EditQuizPage] Missing question data in quizQuestion ${index}`);
                  return null;
                }

                let correctOptId = '';
                if (backendQuestion.options && Array.isArray(backendQuestion.options)) {
                  const correctOpt = backendQuestion.options.find((opt: { id: string; text: string; isCorrect: boolean }) => opt.isCorrect);
                  if (correctOpt) {
                    correctOptId = correctOpt.id;
                  }
                }

                return {
                  id: String(backendQuestion.id),
                  text: String(backendQuestion.text),
                  options: backendQuestion.options || [],
                  correctOptionId: correctOptId,
                  order: qq.order,
                  points: qq.points,
                  explanation: backendQuestion.explanation ? String(backendQuestion.explanation) : undefined,
                  difficulty: backendQuestion.difficulty as QuestionDifficulty, // Cast to match QuizQuestion type
                };
              })
              .filter((q): q is NonNullable<typeof q> => q !== null)
          : [];

        console.log('[EditQuizPage] Final transformedQuestions:', transformedQuestions);

        const fetchedQuiz: Quiz = {
            ...fetchedQuizFromBackend,
            questions: transformedQuestions, // Ensure this is always an array
        };

        console.log('[EditQuizPage] Transformed quiz data for frontend:', JSON.stringify(fetchedQuiz, null, 2));
        console.log('[EditQuizPage] fetchedQuiz.questions type and length:', typeof fetchedQuiz.questions, fetchedQuiz.questions?.length);
        
        // Double-check that questions is defined and is an array
        if (!fetchedQuiz.questions || !Array.isArray(fetchedQuiz.questions)) {
          console.error('[EditQuizPage] CRITICAL: fetchedQuiz.questions is not a valid array!', fetchedQuiz.questions);
          fetchedQuiz.questions = []; // Fallback to empty array
        }
        
        setQuizData(fetchedQuiz);
        // Initialize quizSettings from the fetched quiz
        setQuizSettings({
          title: fetchedQuiz.title, // Though title is often part of QuizPreview's direct edit
          description: fetchedQuiz.description,
          difficulty: fetchedQuiz.difficulty,
          timeLimitMinutes: fetchedQuiz.timeLimitMinutes,
          scoringType: fetchedQuiz.scoringType,
          shuffleQuestions: fetchedQuiz.shuffleQuestions,
          showCorrectAnswers: fetchedQuiz.showCorrectAnswers,
          // questions are handled by QuizPreview
        });
        setUiState('editing');
      } else {
        setErrorMessage('Quiz não encontrado ou falha ao carregar.');
        setUiState('error');
      }
    } catch (error) {
      console.error('[EditQuizPage] Falha ao buscar quiz:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido ao buscar quiz.');
      setUiState('error');
    }
  }, [quizId]);

  useEffect(() => {
    fetchQuizData();
  }, [fetchQuizData]);

  const handleQuizDataChange = (updatedQuiz: Quiz) => {
    // This comes from QuizPreview, primarily for questions
    console.log('[EditQuizPage] QuizPreview data changed. New quizData (questions part):', JSON.stringify(updatedQuiz.questions, null, 2));
    setQuizData(prevData => ({
      ...(prevData as Quiz), // Keep existing top-level fields
      questions: updatedQuiz.questions, // Update only questions from QuizPreview
    }));
  };

  const handleSaveFullQuiz = async () => {
    if (!quizData || !quizId) {
      alert('Dados do quiz inválidos ou ID do quiz ausente para salvar.');
      return;
    }
    console.log('[EditQuizPage] Iniciando salvamento/atualização do quiz completo...', { quizId });
    setUiState('saving');
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Combine the current quizData (which has updated questions) with the latest settings
    const finalQuizDataToUpdate: Partial<Quiz> = {
      ...quizData, // Contains the latest questions from QuizPreview
      ...quizSettings, // Contains other settings from QuizSettingsPanel
      id: undefined, // Don't send ID in the body for an update to avoid issues
      questions: quizData.questions, // Ensure questions array is explicitly passed
    };
    
    // Remove fields that shouldn't be in the PATCH payload if they weren't changed
    // or if they are not part of the UpdateQuizDto on the backend
    // For example, if 'id', 'createdAt', 'updatedAt' are in quizData/quizSettings
    // delete finalQuizDataToUpdate.id; 
    // delete finalQuizDataToUpdate.createdAt;
    // delete finalQuizDataToUpdate.updatedAt;
    // delete (finalQuizDataToUpdate as any).createdBy; // if createdBy is part of it

    console.log('[EditQuizPage] Final payload for updateQuiz:', JSON.stringify(finalQuizDataToUpdate, null, 2));

    try {
      const savedQuiz = await updateQuiz(quizId, finalQuizDataToUpdate);
      console.log('[EditQuizPage] Quiz atualizado com sucesso:', savedQuiz);
      setSuccessMessage(`Quiz "${savedQuiz.title}" atualizado com sucesso! Redirecionando...`);
      setQuizData(savedQuiz); // Update local state with the saved version
      setQuizSettings({ // Also update settings from the saved version
          title: savedQuiz.title,
          description: savedQuiz.description,
          difficulty: savedQuiz.difficulty,
          timeLimitMinutes: savedQuiz.timeLimitMinutes,
          scoringType: savedQuiz.scoringType,
          shuffleQuestions: savedQuiz.shuffleQuestions,
          showCorrectAnswers: savedQuiz.showCorrectAnswers,
      });
      setTimeout(() => {
        router.push('/quizzes');
      }, 2000);
    } catch (error) {
      console.error('[EditQuizPage] Falha ao salvar/atualizar o quiz:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao salvar o quiz.');
    } finally {
      setUiState('editing'); // Revert to editing state even on error, or success before redirect
    }
  };

  if (uiState === 'loading') {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
            {/* <CardTitle>Carregando Quiz...</CardTitle> */}
            {/* <CardDescription>Por favor, aguarde enquanto os dados do quiz são carregados.</CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-64 w-full" /> {/* Placeholder for QuizPreview */}
            <Skeleton className="h-32 w-full" /> {/* Placeholder for QuizSettingsPanel */}
            {/* <div className="min-h-[200px] flex items-center justify-center">
              <p>Carregando...</p> 
            </div> */}
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
              {/* <Button disabled>Salvar Alterações</Button> */}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (uiState === 'error') {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Ocorreu um Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{errorMessage || 'Algo deu errado. Por favor, tente novamente.'}</p>
            <Button onClick={fetchQuizData} variant="outline">Tentar Carregar Novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // uiState === 'editing' or 'saving'
  if (!quizData) { // Should not happen if loading was successful
    return <div className="container mx-auto py-8">Quiz não carregado.</div>;
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar Quiz: {quizData.title}</CardTitle>
          <CardDescription>
            Ajuste o título, perguntas, opções e configurações do quiz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuizPreview 
            quiz={quizData} 
            onQuizChange={handleQuizDataChange}
          />

   
          {successMessage && <p className="mt-4 text-center text-green-600 p-2 bg-green-50 rounded-md">{successMessage}</p>}
          {errorMessage && uiState !== 'saving' && <p className="mt-4 text-center text-red-600 p-2 bg-red-50 rounded-md">{errorMessage}</p>}
          
          <div className="mt-8 flex justify-between items-center">
            <Button variant="outline" onClick={() => router.push('/quizzes')} disabled={uiState === 'saving'}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFullQuiz} disabled={uiState === 'saving'}>
              {uiState === 'saving' ? 'Salvando Alterações...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 