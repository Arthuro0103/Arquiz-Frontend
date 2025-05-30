import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import React from 'react';

// TODO: Adicionar componentes de navegação (Header, Sidebar, etc.)

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("[AppLayout] Renderizando AppLayout com Header e Sidebar.");
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <Header />
      <div className="flex flex-1 pt-16"> {/* Adiciona padding-top para compensar header fixo */}
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 