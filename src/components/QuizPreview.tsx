'use client'; // Pode precisar ser cliente para interatividade futura

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Tipos simulados
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
}

// TODO: Implementar funcionalidade de edição
// TODO: Melhorar visualização da resposta correta

export default function QuizPreview({ quiz }: QuizPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <CardDescription>
          Visualize as perguntas geradas. No futuro, você poderá editá-las aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {quiz.questions.map((question, index) => (
            <AccordionItem value={`item-${index}`} key={question.id}>
              <AccordionTrigger>Pergunta {index + 1}: {question.text}</AccordionTrigger>
              <AccordionContent>
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
                {/* Botões de Edição/Exclusão (futuro) */}
                {/* 
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm">Editar</Button>
                  <Button variant="destructive" size="sm">Excluir</Button>
                </div>
                */}
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