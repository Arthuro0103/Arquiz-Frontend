import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default async function StudentDashboardPageContent() {
  // TODO: Buscar dados relevantes para o aluno, se houver.
  // Por enquanto, apenas uma mensagem de boas-vindas.

  console.log('[StudentDashboardPageContent] Renderizando dashboard do aluno.');

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard do Aluno</h1>
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo!</CardTitle>
          <CardDescription>Este é o seu painel de aluno.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Funcionalidades específicas para alunos aparecerão aqui em breve.</p>
          {/* Exemplos:
          - Lista de competições que participou
          - Resultados recentes
          - Link para entrar em nova competição
          */}
        </CardContent>
      </Card>
    </div>
  );
} 