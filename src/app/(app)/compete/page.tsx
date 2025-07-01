'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Trophy, ArrowRight } from 'lucide-react';

export default function CompetePage() {
  const router = useRouter();

  const handleJoinRoom = () => {
    router.push('/join');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-primary" />
            Competir
          </h1>
          <p className="text-lg text-muted-foreground">
            Entre em uma sala de competição e teste seus conhecimentos!
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Entrar em uma Sala
            </CardTitle>
            <CardDescription>
              Use um código de acesso para participar de uma competição criada por um professor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleJoinRoom}
              className="w-full"
              size="lg"
            >
              Entrar com Código
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Obtenha o Código</h3>
                <p className="text-sm text-muted-foreground">
                  Seu professor fornecerá um código de acesso para a sala de competição.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Digite seu Nome</h3>
                <p className="text-sm text-muted-foreground">
                  Informe como você quer ser identificado durante a competição.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Aguarde o Início</h3>
                <p className="text-sm text-muted-foreground">
                  Entre na sala de espera e aguarde o professor iniciar a competição.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold">Compete!</h3>
                <p className="text-sm text-muted-foreground">
                  Responda às perguntas e veja sua pontuação em tempo real.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 