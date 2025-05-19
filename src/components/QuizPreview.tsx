'use client'; // Pode precisar ser cliente para interatividade futura

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Edit3, PlusCircle } from 'lucide-react';
import { Quiz, QuizQuestion, QuizOption } from '@/types/quiz.types';

// Tipos simulados
/*
interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  correctOptionId: string; // Pode ser removido se não for usar no preview
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}
*/

// Dados mockados para o preview (Removido/Comentado)
/*
const mockQuiz: Quiz = {
  id: 'mock1',
  title: 'Exemplo de Quiz',
  // ... (conteúdo comentado)
};
*/

interface QuizPreviewProps {
  quiz: Quiz; // Recebe o quiz a ser visualizado
  // Adicionar props para edição no futuro (onEditQuestion, etc.)
  onQuizChange?: (updatedQuiz: Quiz) => void; // Callback para quando o quiz for alterado
}

// TODO: Implementar funcionalidade de edição - EM ANDAMENTO
// TODO: Melhorar visualização da resposta correta

export default function QuizPreview({ quiz, onQuizChange }: QuizPreviewProps) {
  const [editableQuiz, setEditableQuiz] = React.useState<Quiz>(JSON.parse(JSON.stringify(quiz)));
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null);
  const [editingQuestionText, setEditingQuestionText] = React.useState<string>('');
  const [editingOptions, setEditingOptions] = React.useState<QuizOption[]>([]);
  const [editingCorrectOptionId, setEditingCorrectOptionId] = React.useState<string>('');
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  console.log('[QuizPreview] Component rendered/updated. Initial quiz prop:', JSON.stringify(quiz, null, 2));
  console.log('[QuizPreview] Current editableQuiz state:', JSON.stringify(editableQuiz, null, 2));

  React.useEffect(() => {
    console.log('[QuizPreview] useEffect triggered by quiz prop change. New quiz prop:', JSON.stringify(quiz, null, 2));
    setEditableQuiz(JSON.parse(JSON.stringify(quiz)));
  }, [quiz]);

  // Função para lidar com a atualização do quiz e chamar o callback
  const handleQuizUpdate = (updatedQuizData: Quiz) => {
    setEditableQuiz(updatedQuizData);
    if (onQuizChange) {
      onQuizChange(updatedQuizData);
    }
  };
  
  const handleEditQuestion = (question: QuizQuestion) => {
    setEditingQuestionId(question.id);
    setEditingQuestionText(question.text);
    setEditingOptions(JSON.parse(JSON.stringify(question.options))); // Deep copy
    setEditingCorrectOptionId(question.correctOptionId);
  };

  const handleSaveQuestion = (questionId: string) => {
    const errors: Record<string, string> = {};
    if (!editingQuestionText.trim()) {
      errors.questionText = 'O texto da pergunta não pode estar vazio.';
    }
    if (editingOptions.length < 2) {
      errors.optionsCount = 'A pergunta deve ter pelo menos duas opções.';
    }
    editingOptions.forEach((opt, index) => {
      if (!opt.text.trim()) {
        errors[`optionText_${opt.id}`] = `O texto da opção ${index + 1} não pode estar vazio.`;
      }
    });
    if (!editingCorrectOptionId) {
      errors.correctOption = 'Uma opção correta deve ser selecionada.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({}); // Limpar erros se passou na validação

    const updatedQuestions = editableQuiz.questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          text: editingQuestionText,
          options: editingOptions,
          correctOptionId: editingCorrectOptionId,
        };
      }
      return q;
    });
    handleQuizUpdate({ ...editableQuiz, questions: updatedQuestions });
    setEditingQuestionId(null);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setValidationErrors({}); // Limpar erros ao cancelar
  };

  const handleOptionTextChange = (optionId: string, newText: string) => {
    setEditingOptions(prevOptions => 
      prevOptions.map(opt => opt.id === optionId ? { ...opt, text: newText } : opt)
    );
  };
  
  const handleAddOption = (questionId: string) => {
    const newOptionId = `new-option-${Date.now()}`; // ID único simples
    setEditingOptions(prevOptions => [
      ...prevOptions,
      { id: newOptionId, text: 'Nova Opção' },
    ]);
  };

  const handleRemoveOption = (optionIdToRemove: string) => {
    setEditingOptions(prevOptions => prevOptions.filter(opt => opt.id !== optionIdToRemove));
    // Se a opção removida era a correta, desmarcar
    if (editingCorrectOptionId === optionIdToRemove) {
      setEditingCorrectOptionId('');
    }
  };
  
  const handleSetCorrectOption = (optionId: string) => {
    setEditingCorrectOptionId(optionId);
  };

  // Função para lidar com a edição do título do quiz
  const handleTitleChange = (newTitle: string) => {
    const errors: Record<string, string> = {};
    if (!newTitle.trim()) {
      errors.quizTitle = 'O título do quiz não pode estar vazio.';
    }
    
    // Atualiza o estado do título imediatamente para feedback visual
    setEditableQuiz(prev => ({...prev, title: newTitle}));

    if (Object.keys(errors).length > 0) {
      setValidationErrors(prevErrors => ({...prevErrors, ...errors}));
      // Não chama onQuizChange se houver erro, mas permite a edição visual
      return; 
    }
    
    // Limpa o erro específico do título se corrigido
    setValidationErrors(prevErrors => {
      const newErrors = {...prevErrors};
      delete newErrors.quizTitle;
      return newErrors;
    });

    // Chama onQuizChange apenas se válido (após o usuário parar de digitar, por exemplo, ou ao salvar o quiz inteiro)
    // Para este exemplo, vamos assumir que onQuizChange pode ser chamado, 
    // mas idealmente a validação final do título ocorreria ao salvar o quiz completo.
    if (onQuizChange) {
      onQuizChange({ ...editableQuiz, title: newTitle });
    }
  };

  // Função para adicionar uma nova pergunta
  const handleAddQuestion = () => {
    const newQuestionId = `new-question-${Date.now()}`;
    const newQuestion: QuizQuestion = {
      id: newQuestionId,
      text: 'Nova Pergunta',
      options: [
        { id: `new-opt-1-${Date.now()}`, text: 'Opção A', isCorrect: false },
        { id: `new-opt-2-${Date.now()}`, text: 'Opção B', isCorrect: false },
      ],
      correctOptionId: '', 
    };
    console.log('[QuizPreview] handleAddQuestion. New question object:', JSON.stringify(newQuestion, null, 2));
    console.log('[QuizPreview] handleAddQuestion. editableQuiz BEFORE update:', JSON.stringify(editableQuiz, null, 2));
    
    const updatedQuiz = {
      ...editableQuiz,
      questions: [...(editableQuiz?.questions || []), newQuestion],
    };

    console.log('[QuizPreview] handleAddQuestion. editableQuiz AFTER update (before calling handleQuizUpdate):', JSON.stringify(updatedQuiz, null, 2));
    handleQuizUpdate(updatedQuiz);
    
    // Opcionalmente, entrar no modo de edição para a nova pergunta
    handleEditQuestion(newQuestion); 
  };

  // Função para remover uma pergunta
  const handleRemoveQuestion = (questionIdToRemove: string) => {
    const updatedQuestions = editableQuiz.questions.filter(q => q.id !== questionIdToRemove);
    handleQuizUpdate({ ...editableQuiz, questions: updatedQuestions });
    if (editingQuestionId === questionIdToRemove) {
      setEditingQuestionId(null); // Sair do modo de edição se a pergunta atual for removida
    }
  };

  return (
    <Card>
      <CardHeader>
        <Input
          value={editableQuiz.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className={`text-2xl font-semibold tracking-tight ${validationErrors.quizTitle ? 'border-red-500' : ''}`}
        />
        {validationErrors.quizTitle && <p className="text-xs text-red-500 mt-1">{validationErrors.quizTitle}</p>}
        <CardDescription>
          Visualize e edite as perguntas geradas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAddQuestion} className="mb-4">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Pergunta
        </Button>
        <Accordion type="single" collapsible className="w-full" value={editingQuestionId ? `item-${editableQuiz.questions.findIndex(q => q.id === editingQuestionId)}` : undefined}>
          {editableQuiz.questions.map((question, index) => (
            <AccordionItem value={`item-${index}`} key={question.id}>
              <AccordionTrigger>
                Pergunta {index + 1}: {editingQuestionId === question.id ? 'Editando...' : question.text}
              </AccordionTrigger>
              <AccordionContent>
                {editingQuestionId === question.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`question-text-${question.id}`}>Texto da Pergunta</Label>
                      <Input
                        id={`question-text-${question.id}`}
                        value={editingQuestionText}
                        onChange={(e) => setEditingQuestionText(e.target.value)}
                        className={validationErrors.questionText ? 'border-red-500' : ''}
                      />
                      {validationErrors.questionText && <p className="text-xs text-red-500 mt-1">{validationErrors.questionText}</p>}
                    </div>
                    
                    <Label>Opções</Label>
                    {validationErrors.optionsCount && <p className="text-xs text-red-500 mb-2">{validationErrors.optionsCount}</p>}
                    {editingOptions.map((option, optIndex) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={option.id} 
                          id={`edit-${question.id}-${option.id}`} 
                          checked={editingCorrectOptionId === option.id}
                          onClick={() => handleSetCorrectOption(option.id)}
                          className="form-radio"
                        />
                        <Input 
                          value={option.text}
                          onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                          className={`flex-grow ${validationErrors[`optionText_${option.id}`] ? 'border-red-500' : ''}`}
                        />
                        {validationErrors[`optionText_${option.id}`] && <p className="text-xs text-red-500 mt-1 ml-6">{validationErrors[`optionText_${option.id}`]}</p>}
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveOption(option.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => handleAddOption(question.id)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Opção
                    </Button>
                    {validationErrors.correctOption && <p className="text-xs text-red-500 mt-2">{validationErrors.correctOption}</p>}

                    <div className="flex space-x-2 mt-4">
                      <Button onClick={() => handleSaveQuestion(question.id)}>Salvar Alterações</Button>
                      <Button variant="outline" onClick={handleCancelEdit}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <RadioGroup defaultValue={question.correctOptionId} className="space-y-2 mt-2 mb-4">
                      {question.options.map((option) => (
                        <div key={option.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                          <Label htmlFor={`${question.id}-${option.id}`}>{option.text}</Label>
                          {option.id === question.correctOptionId && (
                              <span className="text-xs font-semibold text-green-600">(Correta)</span>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditQuestion(question)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Editar Pergunta
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveQuestion(question.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Remover Pergunta
                      </Button>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Exemplo de uso (em uma página, por exemplo):
// export default function QuizPage() {
//   // Lógica para buscar o quiz (ou usar mock)
//   return (
//     <div>
//       <h1>Visualizar Quiz</h1>
//       <QuizPreview quiz={mockQuiz} />
//     </div>
//   );
// } 