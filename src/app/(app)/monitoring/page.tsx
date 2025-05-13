import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function MonitoringPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Monitoramento em Tempo Real</h1>
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento de Competições</CardTitle>
          <CardDescription>Acompanhe o progresso das suas competições ativas.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A funcionalidade de monitoramento em tempo real está em desenvolvimento e estará disponível em breve.</p>
          {/* TODO: Integrar com WebSockets e dados reais */}
        </CardContent>
      </Card>
    </div>
  );
} 