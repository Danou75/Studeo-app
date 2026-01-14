import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { ConjugationTable } from '../types';
import { useTTS } from '../hooks/useTTS';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';

interface RepetitorScreenProps {
  verb: string;
  language: string;
  table: ConjugationTable;
  onBack: () => void;
}

type Level = 1 | 2 | 3 | 6;

export const RepetitorScreen: React.FC<RepetitorScreenProps> = ({ 
  language, 
  table, 
  onBack 
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [level, setLevel] = useState<Level>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const forms = Object.entries(table.forms);
  const totalForms = forms.length;

  const speechLang = language === 'it' ? 'it-IT' : language === 'fr' ? 'fr-FR' : 'es-ES';
  const { transcript, startListening, status, resetTranscript } = useSpeechRecognition(speechLang);
  const { speak: playTTS } = useTTS(speechLang);
  
  const isRecording = status === 'listening';
  
  // VERROU DE SÉCURITÉ : Empêche toute validation sans clic préalable sur "Répéter"
  const canValidateRef = useRef(false);

  const getCurrentChunk = () => {
    const chunk: string[] = [];
    for (let i = 0; i < level && currentIndex + i < totalForms; i++) {
      const [pronoun, form] = forms[currentIndex + i];
      chunk.push(`${pronoun} ${form}`);
    }
    return chunk;
  };

  const currentChunk = getCurrentChunk();

  const normalize = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s\/]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 99;
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
        else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[str2.length][str1.length];
  };

  const checkAnswer = (textToVerify: string) => {
    // Si le verrou est fermé, on ignore (protection contre le transcript qui reste en mémoire)
    if (!canValidateRef.current) return;
    
    const nt = normalize(textToVerify);
    if (nt.length < 2) return;

    // On ferme le verrou IMMÉDIATEMENT : un clic = une seule tentative
    canValidateRef.current = false;
    
    const transcriptWords = nt.split(' ').filter(Boolean);
    const verbsToFind = currentChunk.map(c => normalize(c.split(' ').pop() || ''));
    
    const allVerbsFound = verbsToFind.every(v => 
      transcriptWords.some(tw => (1 - levenshteinDistance(tw, v) / Math.max(tw.length, v.length)) >= 0.75)
    );

    setAttempts(prev => prev + 1);

    if (allVerbsFound) {
      setFeedback('correct');
      setScore(prev => prev + 1);
      setTimeout(() => {
        setFeedback(null);
        setCurrentIndex(prev => {
          const next = prev + level;
          if (next >= totalForms) {
            const nextLevel = (level === 1 ? 2 : level === 2 ? 3 : level === 3 ? 6 : 7) as Level;
            if (nextLevel <= 6) { setLevel(nextLevel); return 0; }
            else { showToast(t('repetitor.bravo'), 'success'); onBack(); return prev; }
          }
          return next;
        });
      }, 1500);
    } else {
      setFeedback('incorrect');
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  // On surveille le statut : 
  useEffect(() => {
    // 1. Quand le micro commence à écouter, on réinitialise tout pour CE tour
    if (status === 'listening') {
      canValidateRef.current = true;
    }

    // 2. La vérification se déclenche uniquement quand on s'arrête de parler
    //    ET que le verrou est ouvert
    if (status === 'idle' && transcript && transcript.length > 0 && canValidateRef.current) {
      checkAnswer(transcript);
    }
  }, [status, transcript]);

  const handleListen = async () => {
    setFeedback(null);
    resetTranscript?.();
    // On ne règle canValidateRef.current à true QUE dans l'useEffect status === 'listening'
    // pour garantir que le micro est bien actif avant d'accepter une réponse.
    await startListening();
  };

  const progress = ((currentIndex / totalForms) * 100).toFixed(0);

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full text-text animate-fade-in overflow-hidden relative">
      <div className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur z-20">
        <Button variant="secondary" onClick={onBack} size="sm"><i className="fas fa-home mr-2"></i> Accueil</Button>
        <div className="text-right">
          <div className="text-sm text-text-muted">{t('repetitor.score')}</div>
          <div className="text-2xl font-bold text-primary">{score}/{attempts}</div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 flex flex-col space-y-6 overflow-y-auto min-h-0 pb-32">
        <div className="w-full bg-background-secondary rounded-full h-3 overflow-hidden shadow-inner flex-shrink-0">
        <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-background-secondary rounded-xl p-8 border border-border shadow-xl">
        <div className="text-center">
          <div className="text-sm text-text-muted mb-2 uppercase tracking-widest">{t('repetitor.level', { level })}</div>
          <div className="text-4xl font-extrabold text-primary notranslate" translate="no">
            {currentChunk.map((f, i) => <div key={i} className="mb-2">{f}</div>)}
          </div>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => currentChunk.forEach((t, i) => setTimeout(() => playTTS(t), i*1500))} variant="secondary" size="lg">{t('repetitor.listen')}</Button>
          <Button 
            onClick={isRecording ? () => (window as any).recognition?.stop() : handleListen} 
            variant={isRecording ? 'secondary' : 'special'} 
            size="lg"
            className={isRecording ? 'animate-pulse' : ''}
          >
            <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} mr-2`}></i>
            {isRecording ? t('repetitor.speak') : t('repetitor.repeat')}
          </Button>
        </div>

        {(transcript || feedback) && (
          <div className={`p-8 rounded-2xl border-8 transition-all w-full max-w-md ${
            feedback === 'correct' ? 'bg-success/10 border-success shadow-[0_0_30px_rgba(var(--color-success),0.4)]' : 
            feedback === 'incorrect' ? 'bg-error/10 border-error' : 'bg-background border-border'
          }`}>
            <div className="text-center space-y-4">
              <div className="text-xs text-text-muted font-bold uppercase">{t('repetitor.resultLabel')}</div>
              <div className={`text-2xl font-black notranslate ${feedback === 'correct' ? 'text-success' : feedback === 'incorrect' ? 'text-error' : 'text-primary'}`} translate="no">
                {feedback === 'correct' ? t('repetitor.excellent') : feedback === 'incorrect' ? t('repetitor.tryAgain') : transcript}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

