'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getTranscriptions,
  Transcription,
  addTranscription as serverAddTranscription,
  editTranscription as serverEditTranscription,
  deleteTranscription as serverDeleteTranscription,
  UpdateTranscriptionData,
  ApiResponse,
  getTranscriptionById
} from '@/actions/transcriptionActions';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Componente para o formulário de adicionar transcrição (placeholder por enquanto)
// Idealmente, isso seria um Dialog ou um novo componente.
const AddTranscriptionForm = ({ onClose, onAdd }: { onClose: () => void; onAdd: (data: { name: string; description?: string; content: string }) => Promise<void> }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !content) {
      setError('Nome e Conteúdo da transcrição são obrigatórios.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onAdd({ name, description, content });
      // Não fechar aqui, deixar o TranscriptionsPage controlar via setShowAddForm
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Erro ao adicionar.');
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>Adicionar Nova Transcrição</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="transcription-name">Nome da Transcrição *</Label>
            <Input type="text" id="transcription-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="transcription-description">Descrição (Opcional)</Label>
            <Input type="text" id="transcription-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="transcription-content">Conteúdo da Transcrição *</Label>
            <Textarea id="transcription-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adicionando...' : 'Adicionar Transcrição'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Componente para o formulário de editar transcrição (usando Dialog)
interface EditTranscriptionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transcription: Transcription | null;
  onEdit: (id: string, data: UpdateTranscriptionData) => Promise<ApiResponse<Transcription>>;
}

const EditTranscriptionForm: React.FC<EditTranscriptionFormProps> = ({ isOpen, onClose, transcription, onEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transcription) {
      setName(transcription.name || '');
      setDescription(transcription.description || '');
      // Agora esperamos que transcription.content possa estar presente se buscado via getTranscriptionById
      setContent(transcription.content || ''); 
    }
  }, [transcription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcription || !name) {
      setError('Nome da transcrição é obrigatório.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await onEdit(transcription.id, { name, description, content });
      if (response.success) {
        onClose();
      } else {
        setError(response.message || 'Falha ao editar transcrição.');
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Erro ao editar.');
    }
    setIsSubmitting(false);
  };

  if (!transcription) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar Transcrição</DialogTitle>
          <DialogDescription>
            Faça alterações na sua transcrição aqui. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-transcription-name" className="text-right">Nome *</Label>
            <Input id="edit-transcription-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-transcription-description" className="text-right">Descrição</Label>
            <Input id="edit-transcription-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-transcription-content" className="text-right">Conteúdo</Label>
            <Textarea id="edit-transcription-content" value={content} onChange={(e) => setContent(e.target.value)} className="col-span-3 max-h-[20vh] overflow-y-auto" rows={15} />
          </div>
          {error && <p className="col-span-4 text-sm text-red-600 text-center">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function TranscriptionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Estados para o modal de edição
  const [editingTranscription, setEditingTranscription] = useState<Transcription | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchTranscriptions = async () => {
    setIsLoading(true);
    setError(null);
    const response = await getTranscriptions();
    if (response.success && Array.isArray(response.data)) {
      setTranscriptions(response.data);
    } else {
      setError(response.message || 'Falha ao buscar transcrições.');
      setTranscriptions([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchTranscriptions();
    }
  }, [sessionStatus]);

  const handleAddTranscription = async (data: { name: string; description?: string; content: string }) => {
    if (!session || !session.accessToken) {
        alert("Erro: Token de acesso não encontrado. Faça login novamente.");
        return;
    }
    const response = await serverAddTranscription(data);
    if (response.success && response.data) {
      // setTranscriptions(prev => [response.data!, ...prev]); // Action já faz revalidate
      await fetchTranscriptions(); // Re-fetch para pegar a lista atualizada
      setShowAddForm(false);
      alert('Transcrição adicionada com sucesso!');
    } else {
      alert(`Erro ao adicionar transcrição: ${response.message}`);
    }
  };

  const handleOpenEditModal = async (transcriptionItemFromList: Transcription) => {
    // Busca a transcrição completa para garantir que temos o conteúdo
    setIsLoading(true); // Pode usar um loading state específico para o modal
    setError(null);
    try {
      const response = await getTranscriptionById(transcriptionItemFromList.id);
      if (response.success && response.data) {
        setEditingTranscription(response.data); // Define com os dados completos
        setIsEditModalOpen(true);
      } else {
        setError(response.message || 'Falha ao buscar detalhes da transcrição para edição.');
        alert(response.message || 'Falha ao buscar detalhes da transcrição para edição.');
        setEditingTranscription(null); // Limpa qualquer estado anterior
        setIsEditModalOpen(false);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido ao buscar transcrição.';
      setError(errorMessage);
      alert(errorMessage);
      setEditingTranscription(null);
      setIsEditModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTranscription(null);
  };

  const handleEditTranscriptionSubmit = async (id: string, data: UpdateTranscriptionData): Promise<ApiResponse<Transcription>> => {
    const response = await serverEditTranscription(id, data);
    if (response.success) {
      // fetchTranscriptions(); // Action já faz revalidate
      // Atualizar localmente ou re-fetch
      setTranscriptions(prev => prev.map(t => t.id === id ? { ...t, ...response.data } : t));
      alert('Transcrição atualizada com sucesso!');
    } else {
      alert(`Erro ao editar transcrição: ${response.message}`);
    }
    return response; // Retornar a resposta para o formulário lidar com o fechamento/erro
  };

  const handleDeleteTranscription = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta transcrição?')) return;

    const response = await serverDeleteTranscription(id);
    if (response.success) {
      // setTranscriptions(prev => prev.filter(t => t.id !== id)); // Action já faz revalidate
      await fetchTranscriptions(); // Re-fetch para pegar a lista atualizada
      alert('Transcrição deletada com sucesso!');
    } else {
      alert(`Erro ao deletar transcrição: ${response.message}`);
    }
  };

  if (sessionStatus === 'loading') {
    return <p className="text-center p-10">Carregando sessão...</p>;
  }

  if (sessionStatus === 'unauthenticated') {
    return <p className="text-center p-10 text-red-600">Acesso negado. Faça login para ver suas transcrições.</p>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Transcrições</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancelar' : 'Adicionar Nova Transcrição'}
        </Button>
      </div>

      {showAddForm && <AddTranscriptionForm onClose={() => setShowAddForm(false)} onAdd={handleAddTranscription} />}

      {!showAddForm && (
        <>
          {isLoading ? (
            <p className="text-center">Carregando transcrições...</p>
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive">
              <CardHeader><CardTitle className="text-destructive">Erro</CardTitle></CardHeader>
              <CardContent><p>{error}</p></CardContent>
            </Card>
          ) : transcriptions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Nenhuma transcrição encontrada.</p>
                <p className="text-center mt-2">
                  Clique em &quot;Adicionar Nova Transcrição&quot; para começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {transcriptions.map((transcription) => (
                <Card key={transcription.id}>
                  <CardHeader>
                    <CardTitle>{transcription.name}</CardTitle> {/* Agora deve funcionar */}
                    {transcription.description && (
                      <CardDescription>{transcription.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Adicionada em: {new Date(transcription.createdAt).toLocaleDateString()}</p>
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(transcription)}>Editar</Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTranscription(transcription.id)}>Deletar</Button>
                      <Button variant="default" size="sm" disabled>Criar Quiz</Button> {/* Criar Quiz permanece desabilitado */}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      {editingTranscription && (
        <EditTranscriptionForm
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          transcription={editingTranscription}
          onEdit={handleEditTranscriptionSubmit}
        />
      )}
    </div>
  );
} 