'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTranscriptions, Transcription, addTranscription as serverAddTranscription } from '@/actions/transcriptionActions'; // Importar actions
import { useSession } from 'next-auth/react'; // Para verificar a sessão no cliente

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
    await onAdd({ name, description, content });
    setIsSubmitting(false);
    // onClose(); // Fecharia o modal/formulário se fosse um
  };

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>Adicionar Nova Transcrição</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="transcription-name" className="block text-sm font-medium text-gray-700">Nome da Transcrição *</label>
            <input type="text" id="transcription-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label htmlFor="transcription-description" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
            <input type="text" id="transcription-description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" />
          </div>
          <div>
            <label htmlFor="transcription-content" className="block text-sm font-medium text-gray-700">Conteúdo da Transcrição *</label>
            <textarea id="transcription-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"></textarea>
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

export default function TranscriptionsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchTranscriptions = async () => {
        setIsLoading(true);
        setError(null);
        const response = await getTranscriptions();
        if (response.success && Array.isArray(response.data)) {
          setTranscriptions(response.data);
        } else if (response.success && response.data) {
          console.warn("[TranscriptionsPage] response.data não é um array (inesperado após correção da action):", response.data);
          setError('Formato de dados inesperado recebido (após processamento da action).');
          setTranscriptions([]);
        } else {
          setError(response.message || 'Falha ao buscar transcrições.');
          setTranscriptions([]);
        }
        setIsLoading(false);
      };
      fetchTranscriptions();
    }
  }, [sessionStatus]);

  const handleAddTranscription = async (data: { name: string; description?: string; content: string }) => {
    console.log("[TranscriptionsPage] handleAddTranscription: Tentando adicionar.");
    console.log("[TranscriptionsPage] handleAddTranscription: Dados do formulário:", data);
    console.log("[TranscriptionsPage] handleAddTranscription: Sessão atual (useSession):", JSON.stringify(session));

    if (!session || !session.accessToken) {
        console.error("[TranscriptionsPage] handleAddTranscription: accessToken não encontrado na sessão do cliente!");
        alert("Erro: Token de acesso não encontrado. Faça login novamente.");
        return;
    }
    if (session.user?.role !== 'teacher') {
        console.warn("[TranscriptionsPage] handleAddTranscription: Role na sessão do cliente não é 'teacher'. Role:", session.user?.role);
        // Não necessariamente um erro fatal aqui se o backend validar o token, mas bom para logar.
    }

    const response = await serverAddTranscription(data);
    if (response.success && response.data) {
      setTranscriptions(prev => [response.data!, ...prev]);
      setShowAddForm(false); // Esconde o formulário após sucesso
      alert('Transcrição adicionada com sucesso!'); // Feedback temporário
    } else {
      alert(`Erro ao adicionar transcrição: ${response.message}`); // Feedback temporário
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

      {/* Só mostra a lista se o formulário não estiver visível */}
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
                    <CardTitle>{transcription.name}</CardTitle>
                    {transcription.description && (
                      <CardDescription>{transcription.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Adicionada em: {new Date(transcription.createdAt).toLocaleDateString()}</p>
                    <div className="mt-4 flex space-x-2">
                      <Button variant="outline" size="sm" disabled>Editar</Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled>Deletar</Button>
                      <Button variant="default" size="sm" disabled>Criar Quiz</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
} 