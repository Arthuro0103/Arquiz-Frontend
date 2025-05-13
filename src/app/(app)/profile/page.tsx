'use client'; // Necessário para hooks como useState e useSession

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react'; // Importar useSession para interatividade
import type { Session } from 'next-auth'; // Tipagem da sessão
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Importar Input
import { Label } from '@/components/ui/label'; // Importar Label

// Definindo um tipo para o usuário da sessão para clareza
// Certifique-se que este tipo corresponde à sua definição em next-auth.d.ts se você estendeu Session.User
type SessionUser = Session['user'] & { 
  id?: string;
  role?: string;
  image?: string | null;
  // Adicione outros campos que você tem no objeto user da sessão
};

export default function ProfilePage() {
  const { data: session, update: updateSession, status } = useSession(); // Obter sessão e função de update
  const [newImageUrl, setNewImageUrl] = useState('');
  const [currentSessionUser, setCurrentSessionUser] = useState<SessionUser | undefined>(session?.user as SessionUser | undefined);

  useEffect(() => {
    if (session?.user) {
      setCurrentSessionUser(session.user as SessionUser);
      setNewImageUrl(session.user.image || '');
    }
  }, [session]);

  if (status === 'loading') {
    return <div className="container mx-auto p-4 md:p-6 lg:p-8"><p>Carregando perfil...</p></div>;
  }

  if (!currentSessionUser) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Perfil</h1>
        <p>Você precisa estar logado para ver seu perfil.</p>
      </div>
    );
  }

  const { name, email, role, image: profileImageUrl } = currentSessionUser;

  const handleRoleToggle = async () => {
    const newRole = role === 'student' ? 'teacher' : 'student';
    try {
      // Tentativa de atualizar a sessão global
      await updateSession({ user: { ...currentSessionUser, role: newRole } });
      
      // Para fins de teste imediato da UI, atualize o estado local também.
      // Isso fará a UI refletir a mudança, mesmo que a sessão global
      // não persista a mudança completamente entre reloads complexos sem backend.
      setCurrentSessionUser((prevUser: SessionUser | undefined) => 
        prevUser ? { ...prevUser, role: newRole } : undefined
      );

      console.log("Tentativa de atualizar papel para:", newRole);
      // A sessão PODE ser atualizada automaticamente pelo NextAuth e disparar o useEffect,
      // mas esta atualização local garante que a UI reaja para teste.
    } catch (error) {
      console.error("Erro ao tentar atualizar o papel:", error);
    }
  };

  const handleImageUpdate = async () => {
    if (!newImageUrl) return;
    try {
      // Tentativa de atualizar a sessão global
      await updateSession({ user: { ...currentSessionUser, image: newImageUrl } });

      // Para fins de teste imediato da UI, atualize o estado local também.
      setCurrentSessionUser((prevUser: SessionUser | undefined) => 
        prevUser ? { ...prevUser, image: newImageUrl } : undefined
      );
      
      console.log("Tentativa de atualizar imagem do perfil para:", newImageUrl);
    } catch (error) {
      console.error("Erro ao tentar atualizar a imagem do perfil:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Meu Perfil</h1>

      <Card>
        <CardHeader className="flex flex-row items-center space-x-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profileImageUrl || undefined} alt={name || 'Usuário'} />
            <AvatarFallback className="text-3xl">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl">{name || 'Nome não disponível'}</CardTitle>
            <CardDescription>{email || 'Email não disponível'}</CardDescription>
            <CardDescription>Papel: <span className="font-semibold capitalize">{role || 'Não definido'}</span></CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profileImageUrl">URL da Imagem de Perfil</Label>
            <div className="flex space-x-2 mt-1">
              <Input 
                id="profileImageUrl"
                type="url" 
                placeholder="https://exemplo.com/imagem.png" 
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
              />
              <Button onClick={handleImageUpdate} disabled={!newImageUrl || newImageUrl === profileImageUrl}>
                Salvar Imagem
              </Button>
            </div>
             <p className="text-sm text-muted-foreground mt-1">Cole a URL de uma imagem para seu perfil.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Gerenciar Papel (para Testes)</CardTitle>
            <CardDescription>Clique no botão para alternar seu papel entre Aluno e Professor.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRoleToggle}>
              Alternar para {role === 'student' ? 'Professor' : 'Aluno'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Papel atual: <span className="font-semibold capitalize">{role}</span>.
            </p>
            {role === 'student' && <p className="text-sm text-blue-500 mt-1">Como aluno, você pode solicitar upgrade para criar quizzes.</p>}
            {role === 'teacher' && <p className="text-sm text-green-500 mt-1">Como professor, você pode criar e gerenciar quizzes e transcrições.</p>}
          </CardContent>
        </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Suas estatísticas de quizzes e competições aparecerão aqui em breve.</p>
        </CardContent>
      </Card>
      
    </div>
  );
} 