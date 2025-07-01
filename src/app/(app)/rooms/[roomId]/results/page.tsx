'use client'

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Medal, 
  Download, 
  Share2, 
  Users, 
  Clock, 
  Target,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Home,
  PieChart,
  FileSpreadsheet,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface CompetitionResult {
  id: string;
  roomId: string;
  roomName: string;
  quizTitle: string;
  createdAt: Date;
  finishedAt: Date;
  totalParticipants: number;
  averageScore: number;
  averageCompletionTime: number;
  totalQuestions: number;
  participants: ParticipantResult[];
  questionAnalytics: QuestionAnalytics[];
  roomConfiguration: {
    shuffleQuestions: boolean;
    timeMode: 'per_question' | 'per_quiz';
    timePerQuestion?: number;
    timePerQuiz?: number;
    showAnswersWhen: 'immediately' | 'end_of_quiz';
    roomType: 'public' | 'private';
  };
}

interface ParticipantResult {
  id: string;
  name: string;
  email: string;
  finalScore: number;
  correctAnswers: number;
  totalAnswers: number;
  completionTime: number;
  averageResponseTime: number;
  rank: number;
  percentage: number;
  joinedAt: Date;
  finishedAt: Date;
  answers: AnswerDetail[];
}

interface AnswerDetail {
  questionIndex: number;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  responseTime: number;
  points: number;
}

interface QuestionAnalytics {
  questionIndex: number;
  questionText: string;
  correctOption: string;
  totalResponses: number;
  correctResponses: number;
  accuracyRate: number;
  averageResponseTime: number;
  difficultyLevel: 'easy' | 'medium' | 'hard';
  optionDistribution: {
    option: string;
    count: number;
    percentage: number;
  }[];
}

export default function CompetitionResultsPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  
  const [results, setResults] = useState<CompetitionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // TODO: Replace with actual API call to fetch competition results
        // For now, we'll show an empty state since there's no backend implementation yet
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set empty results - will be populated when backend is implemented
        setResults(null);
        setError('Resultados ainda não disponíveis. A funcionalidade será implementada quando o backend estiver pronto.');

      } catch (err) {
        console.error('Erro ao buscar resultados:', err);
        setError('Erro ao carregar resultados da competição');
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchResults();
    }
  }, [roomId]);

  const handleSaveResults = async () => {
    if (!results) return;

    setIsSaving(true);
    try {
      // TODO: Implement actual save to database
      console.log('Saving results:', results.id);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Resultados salvos com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar resultados:', err);
      toast.error('Erro ao salvar resultados');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportResults = async (format: typeof exportFormat) => {
    if (!results) return;

    setIsExporting(true);
    try {
      // TODO: Implement actual export functionality
      console.log('Exporting results in format:', format);
      
      // Simulate export generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate download
      const filename = `${results.roomName.replace(/\s+/g, '_')}_resultados.${format}`;
      toast.success(`Relatório ${filename} gerado com sucesso!`);
    } catch (err) {
      console.error('Erro ao exportar resultados:', err);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareResults = async () => {
    if (!results) return;

    const shareData = {
      title: `Resultados: ${results.roomName}`,
      text: `Confira os resultados da competição "${results.roomName}" com ${results.totalParticipants} participantes.`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
        toast.success('Link dos resultados copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Erro ao compartilhar resultados:', err);
      toast.error('Erro ao compartilhar resultados');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-amber-600" />;
      default: return <div className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</div>;
    }
  };

  const getDifficultyBadgeVariant = (difficulty: string): "default" | "secondary" | "destructive" => {
    switch (difficulty) {
      case 'easy': return 'secondary';
      case 'medium': return 'default';
      case 'hard': return 'destructive';
      default: return 'secondary';
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Médio';
      case 'hard': return 'Difícil';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="rounded-full bg-destructive/10 p-3 w-fit mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Erro</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Link href="/rooms">
                <Button>Voltar para Salas</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Resultados da Competição
          </h1>
          <p className="text-muted-foreground mt-1">
            {results.roomName} - {results.quizTitle}
          </p>
          <p className="text-sm text-muted-foreground">
            Finalizada em {results.finishedAt.toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveResults}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Resultados'}
          </Button>
          <Button
            variant="outline"
            onClick={handleShareResults}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Link href="/rooms">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-blue-100 p-2">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Participantes</p>
                <p className="text-2xl font-bold">{results.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 p-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pontuação Média</p>
                <p className="text-2xl font-bold">{results.averageScore.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-purple-100 p-2">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{formatTime(results.averageCompletionTime)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-orange-100 p-2">
                <Target className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Acerto</p>
                <p className="text-2xl font-bold">
                  {((results.participants.reduce((sum, p) => sum + p.percentage, 0) / results.totalParticipants)).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="questions">Questões</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
        </TabsList>

        {/* Ranking Tab */}
        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Ranking Final
              </CardTitle>
              <CardDescription>
                Classificação dos participantes por pontuação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Posição</TableHead>
                    <TableHead>Participante</TableHead>
                    <TableHead className="text-center">Desempenho</TableHead>
                    <TableHead className="text-center">Tempo</TableHead>
                    <TableHead className="text-center">Resp. Média</TableHead>
                    <TableHead className="text-right">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRankIcon(participant.rank)}
                          <span className="font-medium">#{participant.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{participant.name}</div>
                          <div className="text-sm text-muted-foreground">{participant.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <div className="text-sm font-medium">{participant.correctAnswers}/{participant.totalAnswers}</div>
                            <Badge variant="outline">{participant.percentage}%</Badge>
                          </div>
                          <Progress value={participant.percentage} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm">
                          <div>{formatTime(participant.completionTime)}</div>
                          <div className="text-muted-foreground">
                            {((participant.finishedAt.getTime() - participant.joinedAt.getTime()) / 60000).toFixed(0)}min total
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm">
                          {participant.averageResponseTime.toFixed(1)}s
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-xl font-bold">{participant.finalScore}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição de Pontuações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { range: '9-10 pontos', count: 1, color: 'bg-green-500' },
                    { range: '7-8 pontos', count: 1, color: 'bg-blue-500' },
                    { range: '5-6 pontos', count: 1, color: 'bg-yellow-500' },
                    { range: '0-4 pontos', count: 1, color: 'bg-red-500' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.range}</span>
                          <span className="text-sm text-muted-foreground">{item.count} participante(s)</span>
                        </div>
                        <Progress value={(item.count / results.totalParticipants) * 100} className="h-2 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Estatísticas Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((results.participants.filter(p => p.percentage >= 70).length / results.totalParticipants) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa de Aprovação (≥70%)</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.participants.reduce((sum, p) => sum + p.averageResponseTime, 0) / results.totalParticipants}s
                    </div>
                    <div className="text-sm text-muted-foreground">Tempo Médio/Resposta</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Melhor Performance:</span>
                    <span className="font-medium">{results.participants[0].name} ({results.participants[0].percentage}%)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Questão mais difícil:</span>
                    <span className="font-medium">Questão {results.questionAnalytics.find(q => q.accuracyRate === Math.min(...results.questionAnalytics.map(qa => qa.accuracyRate)))?.questionIndex}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Questão mais fácil:</span>
                    <span className="font-medium">Questão {results.questionAnalytics.find(q => q.accuracyRate === Math.max(...results.questionAnalytics.map(qa => qa.accuracyRate)))?.questionIndex}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Análise por Questão
              </CardTitle>
              <CardDescription>
                Performance detalhada em cada questão do quiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.questionAnalytics.map((question) => (
                  <Card key={question.questionIndex} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium">Questão {question.questionIndex}</h4>
                            <Badge variant={getDifficultyBadgeVariant(question.difficultyLevel)}>
                              {getDifficultyLabel(question.difficultyLevel)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{question.questionText}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Taxa de Acerto:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{question.accuracyRate}%</span>
                                <Progress value={question.accuracyRate} className="h-2 flex-1" />
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tempo Médio:</span>
                              <span className="font-medium ml-2">{question.averageResponseTime.toFixed(1)}s</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-2">Distribuição de Respostas</h5>
                          <div className="space-y-1">
                            {question.optionDistribution.map((option, index) => (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${option.option === question.correctOption ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                  <span>Opção {option.option}</span>
                                  {option.option === question.correctOption && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                </div>
                                <span className="font-medium">{option.count} ({option.percentage}%)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exportar Resultados
              </CardTitle>
              <CardDescription>
                Gere relatórios detalhados dos resultados da competição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExportFormat('pdf')}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <h4 className="font-medium mb-1">Relatório PDF</h4>
                      <p className="text-sm text-muted-foreground">Relatório completo com gráficos e análises</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExportFormat('excel')}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <h4 className="font-medium mb-1">Planilha Excel</h4>
                      <p className="text-sm text-muted-foreground">Dados estruturados para análise adicional</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExportFormat('csv')}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <h4 className="font-medium mb-1">Arquivo CSV</h4>
                      <p className="text-sm text-muted-foreground">Dados simples para importação</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Formato selecionado: {exportFormat.toUpperCase()}</h4>
                <p className="text-sm text-muted-foreground">
                  {exportFormat === 'pdf' && 'O relatório PDF incluirá ranking, análises estatísticas, performance por questão e gráficos visuais.'}
                  {exportFormat === 'excel' && 'A planilha Excel conterá abas separadas para ranking, respostas individuais e análises de questões.'}
                  {exportFormat === 'csv' && 'O arquivo CSV incluirá os dados básicos de participantes e pontuações em formato tabular simples.'}
                </p>
                <Button 
                  onClick={() => handleExportResults(exportFormat)}
                  disabled={isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isExporting ? 'Gerando relatório...' : `Baixar Relatório ${exportFormat.toUpperCase()}`}
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Outras Opções</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar por Email
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShareResults}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 