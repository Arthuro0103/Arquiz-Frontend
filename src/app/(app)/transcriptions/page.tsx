import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function TranscriptionsPage() {
  const session = await getServerSession(authOptions) as Session | null;

  if (!session || session.user?.role !== 'teacher') {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Transcrições</h1>
        <Card className="bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Esta página é acessível apenas para professores.</p>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciar Transcrições</h1>
        <Button disabled>Adicionar Nova Transcrição (em breve)</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suas Transcrições</CardTitle>
          <CardDescription>Aqui você poderá ver e gerenciar todas as suas transcrições.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma transcrição encontrada. Clique em "Adicionar Nova Transcrição" para começar.</p>
          {/* TODO: Listar transcrições reais aqui */}
        </CardContent>
      </Card>
    </div>
  );
} 