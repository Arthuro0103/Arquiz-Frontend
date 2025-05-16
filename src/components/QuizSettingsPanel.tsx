'use client';

import React, { useState, useEffect } from 'react';
import { Quiz } from '@/types/quiz.types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface QuizSettingsPanelProps {
  quiz: Partial<Quiz>; // Partial para permitir que nem todas as configurações existam inicialmente
  onSettingsChange: (updatedSettings: Partial<Quiz>) => void;
  isEditing?: boolean; // Para controlar se os campos estão habilitados
}

export default function QuizSettingsPanel({ quiz, onSettingsChange, isEditing = true }: QuizSettingsPanelProps) {
  const [settings, setSettings] = useState<Partial<Quiz>>({});

  useEffect(() => {
    // Inicializa as configurações com os valores do quiz ou padrões
    setSettings({
      timeLimitMinutes: quiz.timeLimitMinutes === undefined ? undefined : Number(quiz.timeLimitMinutes),
      scoringType: quiz.scoringType || 'default',
      shuffleQuestions: quiz.shuffleQuestions === undefined ? false : quiz.shuffleQuestions,
      showCorrectAnswers: quiz.showCorrectAnswers || 'after_quiz',
    });
  }, [quiz]);

  const handleChange = (field: keyof Quiz, value: any) => {
    let processedValue = value;
    if (field === 'timeLimitMinutes') {
      processedValue = value === '' ? undefined : Number(value);
    }
    
    const newSettings = { ...settings, [field]: processedValue };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Quiz</CardTitle>
        <CardDescription>
          Ajuste as opções de tempo, pontuação e como as respostas são exibidas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="timeLimitMinutes">Limite de Tempo (minutos)</Label>
          <Input
            id="timeLimitMinutes"
            type="number"
            placeholder="Sem limite (deixe em branco)"
            value={settings.timeLimitMinutes === undefined ? '' : settings.timeLimitMinutes}
            onChange={(e) => handleChange('timeLimitMinutes', e.target.value)}
            disabled={!isEditing}
            min="0"
          />
          <p className="text-xs text-muted-foreground">
            Deixe em branco ou 0 para nenhum limite de tempo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scoringType">Tipo de Pontuação</Label>
          <Select
            value={settings.scoringType || 'default'}
            onValueChange={(value) => handleChange('scoringType', value)}
            disabled={!isEditing}
          >
            <SelectTrigger id="scoringType">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrão (1 ponto por questão)</SelectItem>
              <SelectItem value="custom" disabled>Personalizado (em breve)</SelectItem> 
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between space-y-2">
          <div>
            <Label htmlFor="shuffleQuestions">Embaralhar Perguntas?</Label>
            <p className="text-xs text-muted-foreground">
              A ordem das perguntas será aleatória para cada tentativa.
            </p>
          </div>
          <Switch
            id="shuffleQuestions"
            checked={settings.shuffleQuestions || false}
            onCheckedChange={(checked: boolean) => handleChange('shuffleQuestions', checked)}
            disabled={!isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="showCorrectAnswers">Mostrar Respostas Corretas</Label>
          <Select
            value={settings.showCorrectAnswers || 'after_quiz'}
            onValueChange={(value) => handleChange('showCorrectAnswers', value)}
            disabled={!isEditing}
          >
            <SelectTrigger id="showCorrectAnswers">
              <SelectValue placeholder="Selecione quando mostrar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediately">Imediatamente após responder</SelectItem>
              <SelectItem value="after_quiz">Ao final do quiz</SelectItem>
              <SelectItem value="never">Nunca mostrar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
} 