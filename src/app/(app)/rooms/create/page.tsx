import React from 'react';
import { CompetitionRoomForm } from "@/components/CompetitionRoomForm";
// import { getQuizzes } from '@/actions/quizActions'; // Removido - Form busca quizzes internamente
import Link from 'next/link';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Removido - não usado
import { Button } from '@/components/ui/button';

// Esta página será um Server Component por padrão
export default async function CreateRoomPage() {
  // const availableQuizzes = await getQuizzes(); // Removido

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Nova Sala de Competição</h1>
        <Link href="/rooms">
          <Button variant="outline">Voltar para Salas</Button>
        </Link>
      </div>

      <CompetitionRoomForm /> {/* Removida a prop availableQuizzes */}

      {/* Link para ver salas existentes */}
      <div className="mt-8 text-center">
        <Link href="/rooms">
          <Button variant="outline">Ver Salas Existentes</Button>
        </Link>
      </div>

      {/* TODO: Adicionar mais contexto ou instruções */}
    </div>
  );
} 