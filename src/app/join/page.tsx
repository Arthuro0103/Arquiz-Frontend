'use client'

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
// import { joinRoom } from '@/actions/studentActions'; // Action a ser criada

// TODO: Criar e chamar a Server Action `joinRoom` que valida o código e o nome
// TODO: Redirecionar para a sala de espera (`/rooms/:roomId/wait` ou similar) após sucesso

export default function JoinRoomPage() {
  const [roomCode, setRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!roomCode.trim() || !studentName.trim()) {
      setError('Código da sala e seu nome são obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Tentando entrar na sala:', { roomCode, studentName });
      // Simulação da action joinRoom
      // const result = await joinRoom({ code: roomCode, name: studentName }); 
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simula chamada de API
      
      // Simulação de resultado
      const mockRoomId = `room_sim_${Date.now()}`;
      const isValidCode = roomCode.toUpperCase() === "TESTE1"; // Simula código válido

      if (isValidCode) {
        // Armazenar nome do aluno (localStorage, cookie, ou passar para próxima página)
        localStorage.setItem('studentName', studentName);
        localStorage.setItem('currentRoomId', mockRoomId); // Guardar ID da sala para a espera
        router.push(`/rooms/${mockRoomId}/wait`); // Rota da sala de espera (a ser criada)
      } else {
        setError('Código da sala inválido ou a sala não existe.');
      }

    } catch (err: unknown) {
      console.error("Erro ao tentar entrar na sala:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
      setError('Ocorreu um erro inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Entrar na Sala</CardTitle>
          <CardDescription>
            Digite o código da sala e seu nome para participar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/15 p-3 rounded-md text-sm text-destructive border border-destructive/30">
                <p><strong>Erro:</strong> {error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="room-code">Código da Sala</Label>
              <Input 
                id="room-code" 
                placeholder="Ex: AB12CD"
                required 
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                disabled={isSubmitting}
                maxLength={6} // Definir um tamanho máximo se os códigos tiverem
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-name">Seu Nome</Label>
              <Input 
                id="student-name" 
                placeholder="Como você quer ser chamado?"
                required 
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 