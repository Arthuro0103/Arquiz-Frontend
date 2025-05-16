import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default async function QuizzesPage() {
  const session = await getServerSession(authOptions) as Session | null;

  if (!session || session.user?.role !== 'teacher') {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Quizzes</h1>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Meus Quizzes</h1>
        <Link href="/quizzes/novo" passHref>
          <Button>Criar Novo Quiz</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seus Quizzes</CardTitle>
          <CardDescription>
            Crie quizzes a partir de suas transcrições e gerencie-os aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum quiz encontrado. Clique em &quot;Criar Novo Quiz&quot; para começar.</p>
          {/* TODO: Listar quizzes reais aqui, com opção de associar/ver transcrição */}
        </CardContent>
      </Card>
    </div>
  );
} 