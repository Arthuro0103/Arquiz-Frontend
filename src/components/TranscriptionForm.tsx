'use client'

import React, { useState, FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { processTranscription } from '@/actions/transcriptionActions'; // Importa a Server Action

// TODO: Implementar chamada à Server Action (subtarefa 4.3)
// TODO: Adicionar validação mais robusta (ex: Zod)

export default function TranscriptionForm() {
  const [transcriptionName, setTranscriptionName] = useState('');
  const [transcriptionContent, setTranscriptionContent] = useState('');
  const [transcriptionFile, setTranscriptionFile] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTranscriptionFile(file);
      setTranscriptionContent('');
      setError(null); // Limpa erro ao mudar input
      setSuccessMessage(null);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTranscriptionContent(event.target.value);
      if (event.target.value) {
          setTranscriptionFile(undefined); // Limpa arquivo se digitar texto
      }
      setError(null); // Limpa erro ao mudar input
      setSuccessMessage(null);
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!transcriptionName.trim()) {
      setError('O nome da transcrição é obrigatório.');
      return;
    }

    const currentContent = transcriptionContent.trim();
    const currentFile = transcriptionFile;

    if (!currentContent && !currentFile) {
      setError('Você deve fornecer o conteúdo da transcrição ou um arquivo.');
      return;
    }

    // Cria FormData para enviar arquivo (se houver)
    const formData = new FormData();
    formData.append('name', transcriptionName);
    if (currentFile) {
        formData.append('file', currentFile);
    } else {
        formData.append('content', currentContent);
    }

    setIsSubmitting(true);
    try {
      // Chama a Server Action diretamente
      // Passando FormData não funciona diretamente com Server Actions (ainda?)
      // Vamos passar um objeto simples por enquanto, a action lerá o arquivo se o nome estiver lá
      const result = await processTranscription({
          name: transcriptionName,
          content: currentFile ? undefined : currentContent, // Envia conteúdo ou marca que há arquivo
          file: currentFile // A action tratará o File object (necessário ajuste na action se não funcionar)
          // Alternativa: Se a action não puder receber File, ler aqui e enviar como string base64 ou similar?
      });

      if (result.success) {
        setSuccessMessage(result.message);
        // Limpar form
        setTranscriptionName('');
        setTranscriptionContent('');
        setTranscriptionFile(undefined);
        // Limpar o input file visualmente
        const fileInput = document.getElementById('transcription-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        // Idealmente: usar um toast para feedback
        alert(`Sucesso: ${result.message}`); 
      } else {
        setError(result.message);
      }
    } catch (err: unknown) {
      console.error("Erro ao chamar Server Action:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro inesperado ao processar a transcrição.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerar Quiz a partir de Transcrição</CardTitle>
        <CardDescription>
          Cole o texto da sua aula ou faça upload de um arquivo (.txt) para gerar um quiz automaticamente.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/15 p-3 rounded-md text-sm text-destructive border border-destructive/30">
              <p><strong>Erro:</strong> {error}</p>
            </div>
          )}
          {successMessage && (
             <div className="bg-primary/15 p-3 rounded-md text-sm text-primary border border-primary/30">
              <p>{successMessage}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="transcription-name">Nome da Transcrição</Label>
            <Input
              id="transcription-name"
              placeholder="Ex: Aula sobre Mitocôndrias"
              required
              value={transcriptionName}
              onChange={(e) => setTranscriptionName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transcription-content">Conteúdo da Transcrição</Label>
            <Textarea
              id="transcription-content"
              placeholder="Cole o texto aqui..."
              rows={10}
              value={transcriptionContent}
              onChange={handleTextChange} // Usa a nova função
              disabled={isSubmitting || !!transcriptionFile}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transcription-file">Ou faça upload de um arquivo (.txt)</Label>
            <Input
              id="transcription-file"
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              disabled={isSubmitting || !!transcriptionContent}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processando...' : 'Gerar Quiz'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 