import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { Session } from 'next-auth';
import { redirect } from 'next/navigation';

// Importa dinamicamente os dashboards para code splitting
const TeacherDashboardPageContent = React.lazy(() => import('./teacher/page'));
const StudentDashboardPageContent = React.lazy(() => import('./student/page'));

function DashboardLoading() {
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Carregando Dashboard...</h1>
            <p>Aguarde enquanto preparamos seu painel.</p>
        </div>
    );
}

export default async function DashboardPageRouter() {
    const sessionData = await getServerSession(authOptions) as Session | null;
    console.log('[DashboardPageRouter] Dados da Sessão:', JSON.stringify(sessionData, null, 2));

    const userRole = sessionData?.user?.role;

    if (!sessionData) {
        console.log('[DashboardPageRouter] Sem sessão, redirecionando para /login');
        redirect('/login');
    }

    // Adicionado Suspense para lidar com o carregamento dos componentes lazy
    return (
        <Suspense fallback={<DashboardLoading />}>
            {userRole === 'teacher' && <TeacherDashboardPageContent />}
            {userRole === 'student' && <StudentDashboardPageContent />}
            {userRole !== 'teacher' && userRole !== 'student' && (
                <div className="container mx-auto p-4 md:p-6 lg:p-8">
                    <h1 className="text-3xl font-bold mb-6">Papel de Usuário Desconhecido</h1>
                    <p>Seu papel de usuário ({userRole || 'não definido'}) não tem um dashboard associado.</p>
                </div>
            )}
        </Suspense>
    );
}
