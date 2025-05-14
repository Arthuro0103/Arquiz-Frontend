'use client' // Necessário para useState e handlers

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

interface RoomActionResult {
  success: boolean;
  message: string;
  room?: {
    id: string;
    name: string;
    quizId: string;
    quizTitle: string;
    accessCode: string;
    shareableLink: string;
  };
}

const formSchema = z.object({
  name: z.string().min(3, "O nome da sala deve ter pelo menos 3 caracteres."),
  quizId: z.string({ required_error: "Selecione um quiz." }),
  startTime: z.date().optional(),
});

type QuizInfo = {
  id: string;
  title: string;
};

export function CompetitionRoomForm() {
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RoomActionResult | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setResult(null);
    console.log("Submetendo formulário:", values);
    try {
      const actionResult = await createCompetitionRoom(values);
      console.log("Resultado da action:", actionResult);
      setResult(actionResult);
      if(actionResult.success) {
        form.reset(); // Limpa o formulário em caso de sucesso
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

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Criar Nova Sala de Competição</CardTitle>
        <CardDescription>Configure os detalhes da sua nova sala.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nome da Sala */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Sala</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Competição História - Turma A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Seleção de Quiz */}
            <FormField
              control={form.control}
              name="quizId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz</FormLabel>
                  <Select
                    onValueChange={field.onChange} // Controlado pelo form
                    value={field.value ?? ''} // Controlado pelo form
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

            {/* Data e Hora de Início (Opcional) */}
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data e Hora de Início (Opcional)</FormLabel>
                  {/* Usando Input datetime-local como fallback */}
                  <FormControl>
                    <Input
                      type="datetime-local"
                      onChange={(e) => {
                        // Convertendo string para Date ou undefined
                        const dateValue = e.target.value ? new Date(e.target.value) : undefined;
                        field.onChange(dateValue);
                      }}
                      // O valor é exibido corretamente pelo tipo datetime-local
                      // e controlado pelo field do react-hook-form
                      ref={field.ref} // Passar ref para o input
                      name={field.name}
                      onBlur={field.onBlur}
                      disabled={field.disabled}
                    />
                  </FormControl>
                  <FormDescription>
                    Se definido, a sala só ficará ativa após esta data/hora.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              {/* Usar form.watch para habilitar/desabilitar botão */}
              <Button type="submit" disabled={isSubmitting || !form.watch('quizId')}>
                {isSubmitting ? 'Criando...' : 'Criar Sala'}
              </Button>
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
                <p>Link Compartilhável: <Link href={result.room.shareableLink} className="underline text-blue-600 hover:text-blue-800">{result.room.shareableLink}</Link></p>
                <p className="mt-1 text-xs">Certifique-se de que o Quiz &quot;{result.room.quizTitle}&quot; está pronto antes da data de início.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 