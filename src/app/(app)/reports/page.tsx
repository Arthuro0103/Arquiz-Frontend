import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Relatórios</h1>
      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Competição</CardTitle>
          <CardDescription>Analise o desempenho e os resultados das suas competições.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A funcionalidade de relatórios está em desenvolvimento e estará disponível em breve.</p>
          {/* TODO: Integrar com dados e visualizações reais */}
        </CardContent>
      </Card>
    </div>
  );
} 