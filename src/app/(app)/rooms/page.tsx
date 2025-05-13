import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge"; // Para mostrar status da sala
import { getCompetitionRooms } from '@/actions/competitionActions';
// import { deleteRoom, startRoom } from '@/actions/competitionActions'; // Para botões futuros

// Funções auxiliares para Client Components (mover para arquivo separado)
// 'use client'
// const DeleteRoomButton = ({ roomId, roomName }) => { ... }
// const StartRoomButton = ({ roomId }) => { ... }

export default async function CompetitionRoomsListPage() {
  const rooms = await getCompetitionRooms();

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
          case 'active': return 'default'; // Ou success se tivermos
          case 'pending': return 'secondary';
          case 'finished': return 'outline';
          default: return 'secondary';
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Salas de Competição</h1>
        <Link href="/rooms/create">
             <Button>Criar Nova Sala</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salas Criadas</CardTitle>
          <CardDescription>Gerencie suas salas de competição.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Sala</TableHead>
                <TableHead>Quiz</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Código Acesso</TableHead>
                {/* <TableHead>Data Início</TableHead> */}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma sala encontrada. Crie uma nova.
                  </TableCell>
                </TableRow>
              )}
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>{room.quizTitle}</TableCell>
                  <TableCell>
                      <Badge variant={getStatusVariant(room.status)}>{room.status}</Badge>
                  </TableCell>
                   <TableCell className="font-mono">{room.accessCode}</TableCell>
                  {/* <TableCell>{room.startTime ? format(new Date(room.startTime), 'Pp') : '-'}</TableCell> */}
                  <TableCell className="text-right space-x-2">
                    <Link href={`/rooms/${room.id}`}> {/* Link para gerenciar/visualizar detalhes */} 
                      <Button variant="outline" size="sm">Gerenciar</Button>
                    </Link>
                    {/* Botão Iniciar (Client) */}
                    {room.status === 'pending' && 
                        <Button variant="secondary" size="sm" disabled>Iniciar</Button>}
                    {/* Botão Excluir (Client) */}
                    <Button variant="destructive" size="sm" disabled>Excluir</Button> 
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 