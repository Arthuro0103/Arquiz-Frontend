'use client' // Necessário para useState e handlers

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { getQuizzes } from "@/actions/quizActions"; // Action para buscar quizzes existentes
import { createCompetitionRoom } from "@/actions/competitionActions"; // Action para criar a sala

interface CompetitionRoom {
  id: string;
  name: string;
  description?: string;
  quizId: string;
  quizTitle: string;
  shuffleQuestions: boolean;
  timeMode: 'per_question' | 'per_quiz';
  timePerQuestion?: number;
  timePerQuiz?: number;
  showAnswersWhen: 'immediately' | 'after_quiz';
  roomType: 'public' | 'private';
  accessCode: string;
  shareableLink?: string;
  status: 'pending' | 'active' | 'finished';
  createdBy: string;
  hostName: string;
  createdAt: string;
  updatedAt: string;
  maxParticipants?: number;
  participantCount: number;
  isActive: boolean;
}

interface RoomActionResult {
  success: boolean;
  message: string;
  room?: CompetitionRoom;
  error?: string;
  code?: string;
}

const formSchema = z.object({
  name: z.string().min(3, "O nome da sala deve ter pelo menos 3 caracteres."),
  description: z.string().optional(),
  quizId: z.string({ required_error: "Selecione um quiz." }),
  shuffleQuestions: z.boolean(),
  timeMode: z.enum(['per_question', 'per_quiz'], {
    required_error: "Selecione o modo de tempo."
  }),
  timePerQuestion: z.number().min(5, "Mínimo 5 segundos por pergunta.").optional(),
  timePerQuiz: z.number().min(30, "Mínimo 30 segundos para o quiz.").optional(),
  showAnswersWhen: z.enum(['immediately', 'after_quiz'], {
    required_error: "Selecione quando mostrar as respostas corretas."
  }),
  roomType: z.enum(['public', 'private'], {
    required_error: "Selecione o tipo da sala."
  }),
  maxParticipants: z.number().min(2, "Mínimo 2 participantes.").max(100, "Máximo 100 participantes."),
});

type FormData = z.infer<typeof formSchema>;

type QuizInfo = {
  id: string;
  title: string;
};

export function CompetitionRoomForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RoomActionResult | null>(null);
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      shuffleQuestions: false,
      timeMode: 'per_question',
      timePerQuestion: 30,
      timePerQuiz: 300,
      showAnswersWhen: 'after_quiz',
      roomType: 'public',
      maxParticipants: 20,
    },
  });

  useEffect(() => {
    async function fetchQuizzes() {
      setIsLoadingQuizzes(true);
      try {
        const availableQuizzes = await getQuizzes();
        setQuizzes(availableQuizzes.map(q => ({ id: q.id, title: q.title })));
      } catch (error) {
        console.error("Erro ao buscar quizzes:", error);
        // TODO: Mostrar erro para o usuário
      }
      setIsLoadingQuizzes(false);
    }
    fetchQuizzes();
  }, []);

  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    setResult(null);
    console.log("Submetendo formulário:", values);
    try {
      const actionResult = await createCompetitionRoom(values);
      console.log("Resultado da action:", actionResult);
      setResult(actionResult);
      if(actionResult.success && actionResult.room) {
        // Redirect to success page with room ID
        router.push(`/rooms/create/success?roomId=${actionResult.room.id}`);
      }
    } catch (error: unknown) {
      console.error("Erro ao criar sala:", error);
      if (error instanceof Error) {
      setResult({ success: false, message: `Erro inesperado: ${error.message}` });
      } else {
        setResult({ success: false, message: "Ocorreu um erro inesperado ao criar a sala." });
      }
    }
    setIsSubmitting(false);
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    const fields: (keyof FormData)[][] = [
      ['name'], // Step 1
      ['quizId'], // Step 2  
      ['timeMode', 'showAnswersWhen', 'roomType'], // Step 3
      [] // Step 4 (review)
    ];
    
    return await form.trigger(fields[step - 1]);
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      nextStep();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
  return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Informações Básicas</h3>
              <p className="text-sm text-muted-foreground">Defina o nome e descrição da sua sala</p>
            </div>
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Sala *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Competição História - Turma A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Adicione uma descrição para ajudar os participantes a entenderem o objetivo desta competição..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Forneça contexto sobre a competição para os participantes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Seleção do Quiz</h3>
              <p className="text-sm text-muted-foreground">Escolha qual quiz será usado na competição</p>
            </div>

            <FormField
              control={form.control}
              name="quizId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                    disabled={isLoadingQuizzes}
                   >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingQuizzes ? "Carregando quizzes..." : "Selecione o quiz para a competição"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {!isLoadingQuizzes && quizzes.map((quiz) => (
                        <SelectItem key={quiz.id} value={quiz.id}>{quiz.title}</SelectItem>
                      ))}
                      {isLoadingQuizzes && <SelectItem value="loading" disabled>Carregando...</SelectItem>}
                      {!isLoadingQuizzes && quizzes.length === 0 && <SelectItem value="no-quiz" disabled>Nenhum quiz encontrado</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Escolha qual quiz será utilizado nesta sala.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Configurações da Competição</h3>
              <p className="text-sm text-muted-foreground">Personalize como a competição funcionará</p>
            </div>

            {/* Embaralhar Perguntas */}
            <FormField
              control={form.control}
              name="shuffleQuestions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Embaralhar Perguntas
                    </FormLabel>
                    <FormDescription>
                      As perguntas aparecerão em ordem aleatória para cada participante
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Tempo por pergunta/quiz */}
            <FormField
              control={form.control}
              name="timeMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Configuração de Tempo *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="per_question" id="per_question" />
                        <label htmlFor="per_question" className="text-sm font-medium">
                          Tempo por pergunta
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="per_quiz" id="per_quiz" />
                        <label htmlFor="per_quiz" className="text-sm font-medium">
                          Tempo total para o quiz
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tempo por pergunta input */}
            {form.watch('timeMode') === 'per_question' && (
              <FormField
                control={form.control}
                name="timePerQuestion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segundos por pergunta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="5"
                        max="300"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Entre 5 e 300 segundos por pergunta
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tempo total do quiz input */}
            {form.watch('timeMode') === 'per_quiz' && (
              <FormField
                control={form.control}
                name="timePerQuiz"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo total (segundos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="30"
                        max="7200"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Entre 30 segundos e 2 horas para completar todo o quiz
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Mostrar respostas corretas quando */}
            <FormField
              control={form.control}
              name="showAnswersWhen"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Mostrar Respostas Corretas Quando *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="immediately" id="immediately" />
                        <label htmlFor="immediately" className="text-sm font-medium">
                          Imediatamente (após cada pergunta)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="after_quiz" id="after_quiz" />
                        <label htmlFor="after_quiz" className="text-sm font-medium">
                          Ao final do quiz
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Público ou Privado */}
            <FormField
              control={form.control}
              name="roomType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo da Sala *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <label htmlFor="public" className="text-sm font-medium">
                          Público (qualquer pessoa pode participar)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="private" />
                        <label htmlFor="private" className="text-sm font-medium">
                          Privado (apenas com código de acesso)
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Salas privadas geram um código que você pode compartilhar com participantes específicos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Máximo de Participantes */}
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máximo de Participantes *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="2"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Defina quantos participantes podem entrar na sala (entre 2 e 100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold">Revisão Final</h3>
              <p className="text-sm text-muted-foreground">Revise suas configurações antes de criar a sala</p>
            </div>

            {/* Resumo das configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo da Configuração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><strong>Nome:</strong> {form.watch('name')}</div>
                {form.watch('description') && (
                  <div><strong>Descrição:</strong> {form.watch('description')}</div>
                )}
                <div><strong>Quiz:</strong> {quizzes.find(q => q.id === form.watch('quizId'))?.title || 'Não selecionado'}</div>
                <div><strong>Embaralhar perguntas:</strong> {form.watch('shuffleQuestions') ? 'Sim' : 'Não'}</div>
                <div><strong>Tempo:</strong> {
                  form.watch('timeMode') === 'per_question' 
                    ? `${form.watch('timePerQuestion')} segundos por pergunta`
                    : `${form.watch('timePerQuiz')} segundos total`
                }</div>
                <div><strong>Mostrar respostas:</strong> {
                  form.watch('showAnswersWhen') === 'immediately' 
                    ? 'Imediatamente' 
                    : 'Ao final do quiz'
                }</div>
                <div><strong>Tipo:</strong> {form.watch('roomType') === 'public' ? 'Público' : 'Privado'}</div>
                <div><strong>Máximo de participantes:</strong> {form.watch('maxParticipants')}</div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    'Informações Básicas',
    'Seleção do Quiz', 
    'Configurações',
    'Revisão Final'
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Criar Nova Sala de Competição</CardTitle>
        <CardDescription>
          Passo {currentStep} de 4: {stepTitles[currentStep - 1]}
        </CardDescription>
        
        {/* Progress indicator */}
        <div className="flex space-x-2 mt-4">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded ${
                step <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStep()}

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Anterior
              </Button>
              
              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext}>
                  Próximo
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : 'Criar Sala'}
                </Button>
              )}
            </div>
          </form>
        </Form>

        {/* Exibição do resultado */}
        {result && (
          <div className={`mt-4 p-4 rounded-md ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <p className="font-semibold">{result.message}</p>
            {result.success && result.room && (
              <div className="mt-2 text-sm">
                <p>Código de Acesso: <span className="font-mono bg-gray-200 px-1 rounded">{result.room.accessCode}</span></p>
                {result.room.accessCode && (
                  <p>Link para Participar: <Link href={`/rooms/join/${result.room.accessCode}`} className="underline text-blue-600 hover:text-blue-800">Clique aqui para entrar na sala</Link></p>
                )}
                <p className="mt-1 text-xs">Certifique-se de que o Quiz &quot;{result.room.quizTitle || 'selecionado'}&quot; está pronto antes da data de início.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 