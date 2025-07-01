import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Trophy, Clock, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ResultsPage() {
  // TODO: Fetch real results data from backend
  // For now, showing placeholder content

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <BarChart3 className="h-8 w-8" />
          Meus Resultados
        </h1>
        <p className="text-muted-foreground">
          Acompanhe seu desempenho em competições e veja seu progresso ao longo do tempo.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Competições</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">0%</p>
                <p className="text-sm text-muted-foreground">Taxa de Acerto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">0s</p>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Pontuação Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Results */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Competições</CardTitle>
          <CardDescription>
            Suas participações mais recentes em competições
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma competição realizada ainda
            </h3>
            <p className="text-muted-foreground mb-6">
              Participe de sua primeira competição para ver seus resultados aqui.
            </p>
            <Link href="/compete">
              <Button>
                Participar de uma Competição
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dicas para Melhorar seu Desempenho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Leia com Atenção</h3>
                <p className="text-sm text-muted-foreground">
                  Leia cada pergunta cuidadosamente antes de responder.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Gerencie seu Tempo</h3>
                <p className="text-sm text-muted-foreground">
                  Mantenha um ritmo constante e não gaste muito tempo em uma pergunta.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Pratique Regularmente</h3>
                <p className="text-sm text-muted-foreground">
                  Participe de várias competições para melhorar suas habilidades.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold">Analise seus Erros</h3>
                <p className="text-sm text-muted-foreground">
                  Revise as respostas incorretas para aprender com os erros.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 