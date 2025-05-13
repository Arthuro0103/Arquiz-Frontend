import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CompetePage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Competir</h1>
      <Card>
        <CardHeader>
          <CardTitle>Entrar em uma Competição</CardTitle>
          <CardDescription>Insira o código da sala para participar de uma competição.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Adicionar input para código da sala e botão para entrar */}
          <p className="text-muted-foreground">Funcionalidade de competir em desenvolvimento.</p>
        </CardContent>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Competições Ativas</CardTitle>
          <CardDescription>Veja as competições que você está participando.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Listar competições ativas do usuário */}
          <p className="text-muted-foreground">Nenhuma competição ativa no momento.</p>
        </CardContent>
      </Card>
    </div>
  );
} 