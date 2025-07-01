'use client';

import * as React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Reutilizando o tipo da página de competição
type QuizQuestion = {
  id: string;
  questionText: string;
  options: { id: string; text: string }[];
  correctOptionId?: string; // Opcional aqui, usado apenas para feedback visual
};

interface QuestionDisplayProps {
  question: QuizQuestion;
  selectedAnswer: string | null;
  onAnswerSelect: (optionId: string | null) => void;
  feedback: 'correct' | 'incorrect' | null;
  disabled: boolean;
}

export function QuestionDisplay({
  question,
  selectedAnswer,
  onAnswerSelect,
  feedback,
  disabled,
}: QuestionDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{question.questionText}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedAnswer ?? undefined}
          onValueChange={onAnswerSelect}
          disabled={disabled}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrect = question.correctOptionId === option.id;
            let feedbackClass = "";
            if (feedback && isSelected) {
              feedbackClass = feedback === 'correct' ? "bg-green-100 border-green-500" : "bg-red-100 border-red-500";
            } else if (feedback && isCorrect) {
              // Mostrar a correta se o usuário errou
              feedbackClass = "bg-green-100 border-green-500";
            }

            return (
              <Label
                key={option.id}
                htmlFor={option.id}
                className={cn(
                  "flex items-center space-x-3 border rounded-md p-4 cursor-pointer transition-colors",
                  disabled ? "cursor-not-allowed opacity-70" : "hover:bg-accent hover:text-accent-foreground",
                  isSelected && !feedback ? "border-primary bg-primary/10" : "",
                  feedbackClass
                )}
              >
                <RadioGroupItem value={option.id} id={option.id} />
                <span>{option.text}</span>
              </Label>
            );
          })}
        </RadioGroup>
        {feedback === 'correct' && (
            <p className="mt-4 text-center text-green-600 font-semibold">Resposta Correta!</p>
        )}
        {feedback === 'incorrect' && (
            <p className="mt-4 text-center text-red-600 font-semibold">Resposta Incorreta.</p>
        )}
      </CardContent>
    </Card>
  );
} 