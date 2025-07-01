import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Trophy, BookOpen, BarChart3, ArrowRight } from 'lucide-react';

export default async function StudentDashboardPageContent() {
  // TODO: Buscar dados relevantes para o aluno, se houver.
  // Por enquanto, apenas uma mensagem de boas-vindas.

  console.log('[StudentDashboardPageContent] Renderizando dashboard do aluno.');

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard do Aluno</h1>
        <p className="text-muted-foreground">
          Bem-vindo! Aqui você pode participar de competições e acompanhar seu progresso.
        </p>
      </div>

      {/* Main Action Card */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-6 w-6 text-primary" />
            Pronto para Competir?
          </CardTitle>
          <CardDescription className="text-base">
            Entre em uma sala de competição usando o código fornecido pelo seu professor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/join">
            <Button size="lg" className="w-full sm:w-auto">
              <Users className="mr-2 h-5 w-5" />
              Entrar em uma Sala
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Competir
            </CardTitle>
            <CardDescription>
              Participe de competições criadas pelos seus professores e teste seus conhecimentos em tempo real. Veja como você se compara com seus colegas!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/compete">
              <Button variant="outline" className="w-full">
                Ver Opções
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Salas Públicas
            </CardTitle>
            <CardDescription>
              Explore salas de competição abertas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rooms">
              <Button variant="outline" className="w-full">
                Explorar
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Meus Resultados
            </CardTitle>
            <CardDescription>
              Acompanhe seu desempenho
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/results">
              <Button variant="outline" className="w-full">
                Ver Histórico
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Information Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Como Participar de uma Competição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-2">1. Obtenha o Código</h3>
              <p className="text-sm text-muted-foreground">
                Seu professor fornecerá um código de acesso para a sala de competição.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Entre na Sala</h3>
              <p className="text-sm text-muted-foreground">
                Use o botão &ldquo;Entrar em uma Sala&rdquo; e digite o código fornecido.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Aguarde o Início</h3>
              <p className="text-sm text-muted-foreground">
                Aguarde na sala de espera até o professor iniciar a competição.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. Compete!</h3>
              <p className="text-sm text-muted-foreground">
                Responda às perguntas e veja sua pontuação em tempo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 