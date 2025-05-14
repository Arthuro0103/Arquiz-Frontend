import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth'; 

interface Quiz {
  id: string;
  title: string;
}

interface Room {
  id: string;
  title: string;
  status: 'aguardando' | 'em andamento' | 'encerrada';
}

interface DashboardStats {
  totalQuizzes: number;
  activeCompetitions: number;
  averageScore: number | string;
}

// const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL; 
const BACKEND_API_URL = "http://localhost:3000"; // ALTERADO DE HTTPS PARA HTTP

async function fetchDashboardData(accessToken: string): Promise<DashboardStats> {
  let totalQuizzes = 0;
  let activeCompetitions = 0;

  try {
    if (!BACKEND_API_URL) {
      console.error('[DashboardData] Critical Error: NEXT_PUBLIC_BACKEND_API_URL is not defined.');
      throw new Error("Configuração da URL da API do backend não encontrada.");
    }
    const quizzesResponse = await fetch(`${BACKEND_API_URL}/quizzes/my`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (quizzesResponse.ok) {
      const quizzes: Quiz[] = await quizzesResponse.json();
      totalQuizzes = quizzes.length;
      console.log('[DashboardData] Quizzes fetched:', quizzes.length);
    } else {
      console.error('[DashboardData] Failed to fetch quizzes:', quizzesResponse.status, await quizzesResponse.text());
    }
  } catch (error) {
    console.error('[DashboardData] Error fetching quizzes:', error);
  }

  try {
    if (!BACKEND_API_URL) {
      console.error('[DashboardData] Critical Error: NEXT_PUBLIC_BACKEND_API_URL is not defined (for rooms).');
    } else {
      const roomsResponse = await fetch(`${BACKEND_API_URL}/rooms`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (roomsResponse.ok) {
        const rooms: Room[] = await roomsResponse.json();
        activeCompetitions = rooms.filter(room => room.status === 'em andamento' || room.status === 'aguardando').length;
        console.log('[DashboardData] Rooms fetched:', rooms.length, 'Active:', activeCompetitions);
      } else {
        console.error('[DashboardData] Failed to fetch rooms:', roomsResponse.status, await roomsResponse.text());
      }
    }
  } catch (error) {
    console.error('[DashboardData] Error fetching rooms:', error);
  }

  return {
    totalQuizzes,
    activeCompetitions,
    averageScore: 'N/A',
  };
}

const mainSections = [
  { href: '/transcriptions', title: 'Gerenciar Transcrições', description: 'Faça upload e gerencie suas transcrições para criar quizzes.' },
  { href: '/quizzes', title: 'Gerenciar Quizzes', description: 'Crie, edite e visualize seus quizzes.' },
  { href: '/rooms', title: 'Salas de Competição', description: 'Crie e gerencie salas para suas competições.' },
  { href: '/compete', title: 'Entrar em Competição', description: 'Participe de uma competição usando um código.' },
  { href: '/reports', title: 'Relatórios e Análises', description: 'Veja o desempenho e insights.' },
];

export default async function TeacherDashboardPageContent() { // Renomeado para evitar conflito se importado
  const sessionData = await getServerSession(authOptions) as Session | null;
  console.log('[TeacherDashboardPageContent] Dados da Sessão (getServerSession):', JSON.stringify(sessionData, null, 2));

  const accessToken = sessionData?.accessToken;
  const userRole = sessionData?.user?.role;

  let stats: DashboardStats = {
    totalQuizzes: 0,
    activeCompetitions: 0,
    averageScore: 'Carregando...',
  };
  let errorFetchingData = false;
  let authErrorMessage = '';

  if (!sessionData) {
    authErrorMessage = 'Sessão não encontrada. Faça login novamente.';
    console.error('[TeacherDashboardPageContent]', authErrorMessage);
    errorFetchingData = true;
  } else if (!accessToken) {
    authErrorMessage = 'Token de acesso não encontrado na sessão. Problema de configuração de login ou resposta da API.';
    console.error('[TeacherDashboardPageContent]', authErrorMessage, 'Sessão completa:', sessionData);
    errorFetchingData = true;
  } else if (userRole !== 'teacher') {
    authErrorMessage = 'Acesso negado. Este dashboard é apenas para professores.';
    console.warn('[TeacherDashboardPageContent]', authErrorMessage, 'Role do usuário:', userRole);
    errorFetchingData = true; 
  } else {
    console.log('[TeacherDashboardPageContent] Sessão, accessToken e role de professor encontrados. Buscando dados...');
    try {
      stats = await fetchDashboardData(accessToken);
    } catch (error) {
      console.error('[TeacherDashboardPageContent] Erro ao buscar dados do dashboard:', error);
      authErrorMessage = 'Erro ao carregar dados do dashboard.';
      errorFetchingData = true;
    }
  }
  
  if(errorFetchingData && stats.averageScore === 'Carregando...'){
    stats.averageScore = authErrorMessage;
  }

  console.log('[TeacherDashboardPageContent] Stats finais:', stats);
  
  if (userRole && userRole !== 'teacher' && !authErrorMessage.includes('Acesso negado')){
      authErrorMessage = 'Acesso negado. Este dashboard é apenas para professores.';
  }
  
  // Se for um erro de autenticação ou o usuário não for professor, mostra mensagem de erro.
  // A lógica de UI para mostrar o conteúdo do professor ou a mensagem de erro está aqui.
  if (errorFetchingData || !sessionData || !accessToken || userRole !== 'teacher') {
     return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <Card className="mb-6 bg-destructive/10 border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">
                {userRole && userRole !== 'teacher' ? 'Acesso Negado' : 'Erro ao Carregar Dashboard'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p>{authErrorMessage || 'Não foi possível carregar os dados do dashboard.'}</p>
            </CardContent>
            </Card>
        </div>
    );
  }

  // Conteúdo específico do dashboard do professor
  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard do Professor</h1>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total de Quizzes</CardTitle>
            <CardDescription>Seus quizzes criados.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.totalQuizzes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Competições Ativas</CardTitle>
            <CardDescription>Salas aguardando ou em andamento.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.activeCompetitions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pontuação Média</CardTitle>
            <CardDescription>Média geral nas suas competições.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.averageScore}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
        {mainSections.map((section) => (
          <Link href={section.href} key={section.title} className="block group">
            <Card className="hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
              <CardHeader>
                <CardTitle className="group-hover:text-primary">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 