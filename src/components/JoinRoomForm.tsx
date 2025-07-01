'use client'

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export function JoinRoomForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = formData.get('roomCode') as string;
    if (code?.trim()) {
      window.location.href = `/join?code=${code.trim().toUpperCase()}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Entrar com Código
        </CardTitle>
        <CardDescription>
          Tem um código de acesso para uma sala privada? Digite aqui para participar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              name="roomCode"
              type="text"
              placeholder="Digite o código da sala"
              className="flex-1 px-3 py-2 border border-input rounded-md"
              maxLength={6}
              required
            />
            <Button type="submit">Entrar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 