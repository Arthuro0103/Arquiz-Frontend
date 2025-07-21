'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QuizPreview from '@/components/QuizPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Quiz, QuestionDifficulty, QuestionType } from '@/types/quiz.types';
import { createQuizFromTranscription, updateQuiz } from '@/actions/quiz.actions';
import { getTranscriptions, type Transcription } from '@/actions/transcriptionActions';

export default function NewQuizPage() {
  const router = useRouter();
  
  const [uiState, setUiState] = useState<'configuringAI' | 'reviewingQuiz' | 'error'>('configuringAI');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado da Fase 1: Configuração da IA
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoadingTranscriptions, setIsLoadingTranscriptions] = useState(true);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string>('');
  const [quizTitle, setQuizTitle] = useState('Novo Quiz Gerado por IA');
  const [numQuestions, setNumQuestions] = useState<string>('5');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(QuestionDifficulty.MEDIUM);
  const [scoringType, setScoringType] = useState<'default' | 'custom'>('default');
  const [isGenerating, setIsGenerating] = useState(false);

  // Estado da Fase 2: Revisão e Dados do Quiz
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [quizSettings, setQuizSettings] = useState<Partial<Quiz>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchTranscriptions() {
      console.log('[NewQuizPage] Iniciando fetchTranscriptions.');
      setIsLoadingTranscriptions(true);
      setErrorMessage(null); 
      try {
        console.log('[NewQuizPage] Chamando getTranscriptions (de transcriptionActions.ts)...');
        const response = await getTranscriptions(); 
        console.log('[NewQuizPage] getTranscriptions (from transcriptionActions) retornou. Resultado:', response);

        if (response.success && Array.isArray(response.data)) {
          setTranscriptions(response.data);
          console.log('[NewQuizPage] Transcrições definidas no estado (via getTranscriptions):', response.data.length);
        } else {
          console.warn('[NewQuizPage] Nenhuma transcrição foi retornada pela action getTranscriptions ou o array está vazio/erro.', response.message);
          setTranscriptions([]);
             setErrorMessage(response.message || 'Falha ao carregar suas transcrições. Verifique a conexão ou se possui transcrições associadas à sua conta.');
        }
      } catch (error) {
        console.error('[NewQuizPage] Erro crítico capturado no useEffect ao tentar buscar transcrições:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Falha crítica ao carregar suas transcrições.');
      } finally {
        setIsLoadingTranscriptions(false);
        console.log('[NewQuizPage] fetchTranscriptions finalizado.');
      }
    }

    fetchTranscriptions();
  }, []); // Empty dependency array - only run once on mount

  const handleGenerateQuizWithAI = async () => {
    if (!selectedTranscriptionId) {
      setErrorMessage('Por favor, selecione uma transcrição.');
      return;
    }
    console.log('[NewQuizPage] Iniciando geração de quiz com IA...', { 
      transcriptionId: selectedTranscriptionId, 
      title: quizTitle, 
      numQuestions, 
      difficulty,
      scoringType
    });
    setIsGenerating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const generatedQuiz = await createQuizFromTranscription(
        selectedTranscriptionId, 
        parseInt(numQuestions, 10) || 5, // Convert string to number with fallback
        quizTitle, 
        difficulty,
        undefined, // timeLimitMinutes
        scoringType,
        undefined, // shuffleQuestions
        undefined, // showCorrectAnswers
        undefined, // questionTimeLimit
        scoringType === 'custom' ? 'ai' : undefined // Tell backend to use AI scoring if custom is selected
      );

      console.log('[NewQuizPage] createQuizFromTranscription retornou:', JSON.stringify(generatedQuiz, null, 2));

      if (generatedQuiz && generatedQuiz.id) {
        console.log('[NewQuizPage] Quiz gerado com IA (antes de setQuizData):', JSON.stringify(generatedQuiz, null, 2));
        console.log('[NewQuizPage] questions in generated quiz:', generatedQuiz.questions?.length || 0);
        if (generatedQuiz.questions && generatedQuiz.questions.length > 0) {
          console.log('[NewQuizPage] First question points:', generatedQuiz.questions[0].points);
          console.log('[NewQuizPage] All question points:', generatedQuiz.questions.map(q => q.points));
        }
        setQuizData(generatedQuiz);
        setQuizSettings({
          timeLimit: generatedQuiz.timeLimit,
          // Remove non-existent properties
        });
        setUiState('reviewingQuiz');
        setSuccessMessage('Quiz gerado pela IA com sucesso! Revise e salve abaixo.');
      } else {
        setErrorMessage('A IA não retornou um quiz válido.');
        setUiState('error');
        setQuizData(null); 
      }
    } catch (error) {
      console.error('[NewQuizPage] Falha ao gerar quiz com IA:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao gerar quiz com IA.');
      setUiState('error');
      setQuizData(null); 
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuizDataChange = (updatedQuiz: Quiz) => {
    if (updatedQuiz) {
      console.log('[NewQuizPage] Dados do QuizPreview atualizados (handleQuizDataChange). Novo quizData:', JSON.stringify(updatedQuiz, null, 2));
      setQuizData(updatedQuiz);
    }
  };

  const handleSaveFullQuiz = async () => {
    if (!quizData || !quizData.id) {
      alert('Dados do quiz inválidos ou ID do quiz ausente para salvar.');
      return;
    }
    console.log('[NewQuizPage] Iniciando salvamento/atualização do quiz completo...', { quizId: quizData.id });
    console.log('[NewQuizPage] Current quizData:', JSON.stringify(quizData, null, 2));
    console.log('[NewQuizPage] Current quizSettings:', JSON.stringify(quizSettings, null, 2));
    
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    // Properly structure the data for the backend
    const finalQuizDataToUpdate: Partial<Quiz> = {
      title: quizData.title,
      description: quizData.description,
      difficulty: quizData.difficulty,
      timeLimit: quizSettings.timeLimit || quizData.timeLimit,
      // Include the questions with proper structure
      questions: quizData.questions?.map((q, index) => ({
        id: q.id,
        text: q.text,
        type: QuestionType.MULTIPLE_CHOICE, // Add required type property
        options: q.options,
        correctAnswer: q.correctAnswer,
        order: q.order !== undefined ? q.order : index,
        points: q.points !== undefined ? q.points : 1,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })) || [],
    };

    console.log('[NewQuizPage] Final data to update:', JSON.stringify(finalQuizDataToUpdate, null, 2));

    try {
      const savedQuiz = await updateQuiz(quizData.id, finalQuizDataToUpdate);
      console.log('[NewQuizPage] Quiz atualizado/salvo com sucesso:', savedQuiz);
      setSuccessMessage(`Quiz "${savedQuiz.title}" salvo com sucesso! Redirecionando...`);
      setTimeout(() => {
        router.push(`/quizzes`);
      }, 2000);
    } catch (error) {
      console.error('[NewQuizPage] Falha ao salvar/atualizar o quiz:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao salvar o quiz.');
      setUiState('error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTryAgain = () => {
    setUiState('configuringAI');
    setErrorMessage(null);
    setSuccessMessage(null);
    // Resetar outros estados se necessário, ex: selectedTranscriptionId, quizTitle etc.
  };

  if (uiState === 'error') {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Ocorreu um Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{errorMessage || 'Algo deu errado. Por favor, tente novamente.'}</p>
            <Button onClick={handleTryAgain} variant="outline">Tentar Novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uiState === 'configuringAI') {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Quiz com Inteligência Artificial</CardTitle>
            <CardDescription>
              Selecione uma transcrição e defina os parâmetros para a IA gerar seu quiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTranscriptions && <p className="text-blue-600">Buscando suas transcrições...</p>}
            
            {/* Mensagens de erro/sucesso globais para esta fase */}
            {successMessage && <p className="text-center text-green-600 mb-3">{successMessage}</p>}
            {errorMessage && !isLoadingTranscriptions && transcriptions.length === 0 && (
              // Erro específico de carregamento de transcrições
              <div className="p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-md border border-red-300">
                <strong>Erro ao carregar transcrições:</strong> {errorMessage}
                <p className="text-xs mt-1">Por favor, verifique sua conexão ou se há transcrições associadas. Veja o console para detalhes.</p>
              </div>
            )}
            {/* Mensagem de erro genérica para a fase de configuração, se não for de transcrição */}
            {errorMessage && (isLoadingTranscriptions || transcriptions.length > 0) && 
              <p className="text-center text-red-500 mb-3">{errorMessage}</p>
            }

            {!isLoadingTranscriptions && (
              <>
                <div>
                  <Label htmlFor="quizTitle">Título do Quiz</Label>
                  <Input 
                    id="quizTitle" 
                    value={quizTitle} 
                    onChange={(e) => setQuizTitle(e.target.value)} 
                    placeholder="Ex: Quiz sobre a Aula Magna"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <Label htmlFor="transcription">Selecionar Transcrição</Label>
                  <Select 
                    onValueChange={setSelectedTranscriptionId} 
                    value={selectedTranscriptionId} 
                    disabled={isGenerating || isLoadingTranscriptions || transcriptions.length === 0}
                  >
                    <SelectTrigger id="transcription">
                      <SelectValue placeholder={
                        isLoadingTranscriptions ? "Carregando suas transcrições..." :
                        transcriptions.length === 0 ? "Nenhuma transcrição encontrada" :
                        "Escolha uma transcrição..."
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingTranscriptions ? (
                        <SelectItem value="loading" disabled>Carregando...</SelectItem>
                      ) : transcriptions.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhuma transcrição disponível. Verifique se você possui transcrições ou se a autenticação com a API está correta.
                        </SelectItem>
                      ) : (
                        transcriptions.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {!isLoadingTranscriptions && transcriptions.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Dica: Verifique sua conexão e se há transcrições associadas à sua conta. A autenticação com a API precisa estar funcionando (envio de token JWT).
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="numQuestions">Número de Perguntas (1-20)</Label>
                  <Input 
                    id="numQuestions" 
                    type="number" 
                    value={numQuestions} 
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string temporarily for editing
                      if (value === '') {
                        setNumQuestions('');
                      } else {
                        const parsed = parseInt(value, 10);
                        if (!isNaN(parsed)) {
                          setNumQuestions(Math.max(1, Math.min(20, parsed)).toString());
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // Set default if field is empty when user finishes editing
                      if (e.target.value === '' || isNaN(parseInt(e.target.value, 10))) {
                        setNumQuestions('5');
                      }
                    }}
                    min="1" 
                    max="20"
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">Nível de Dificuldade</Label>
                  <Select 
                    onValueChange={(value) => setDifficulty(value as QuestionDifficulty)} 
                    value={difficulty}
                    disabled={isGenerating}
                  >
                    <SelectTrigger id="difficulty">
                      <SelectValue placeholder="Escolha a dificuldade..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionDifficulty.EASY}>Fácil</SelectItem>
                      <SelectItem value={QuestionDifficulty.MEDIUM}>Médio</SelectItem>
                      <SelectItem value={QuestionDifficulty.HARD}>Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                  <div>
                    <Label htmlFor="scoringType">Tipo de Pontuação</Label>
                    <Select
                      value={scoringType}
                    onValueChange={(value: 'default' | 'custom') => {
                      setScoringType(value);
                    }}
                      disabled={isGenerating}
                    >
                      <SelectTrigger id="scoringType">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                      <SelectItem value="default">Padrão (1 ponto por pergunta)</SelectItem>
                      <SelectItem value="custom">Personalizado (IA escolhe valores)</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                
                <Button 
                  onClick={handleGenerateQuizWithAI} 
                  disabled={
                    isGenerating || 
                    isLoadingTranscriptions || 
                    transcriptions.length === 0 || 
                    !selectedTranscriptionId
                  } 
                  className="w-full md:w-auto"
                >
                  {isGenerating ? 'Gerando Quiz com IA...' : 'Gerar Quiz com IA'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // uiState === 'reviewingQuiz'
  if (!quizData) { // Segurança extra, mas uiState deve garantir que quizData existe aqui
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-xl text-orange-500">Aguardando Dados do Quiz</h2>
        <p>O quiz gerado deveria aparecer aqui. Se o problema persistir, tente gerar novamente.</p>
        <Button onClick={handleTryAgain}>Gerar Novamente</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Revisar e Editar Quiz Gerado</CardTitle>
          <CardDescription>
            Ajuste o título, perguntas, opções e configurações do quiz antes de salvar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuizPreview 
            quiz={quizData} 
            onQuizChange={handleQuizDataChange} 
          />

          {/* Mensagens de erro/sucesso para a fase de revisão/salvamento */}      
          {successMessage && <p className="text-center text-green-600 mb-3">{successMessage}</p>}
          {errorMessage && <p className="text-center text-red-500 mb-3">{errorMessage}</p>}
          
          <div className="mt-8 flex justify-end">
            <Button onClick={handleSaveFullQuiz} disabled={isSaving}>
              {isSaving ? 'Salvando Quiz...' : 'Salvar Quiz Completo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 