import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  onBack,
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [level, setLevel] = useState<Level>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [displayTranscript, setDisplayTranscript] = useState('');

  const forms = Object.entries(table.forms);
  const totalForms = forms.length;

  const speechLang =
    language === 'it' ? 'it-IT' :
    language === 'fr' ? 'fr-FR' :
    language === 'es' ? 'es-ES' :
    language === 'de' ? 'de-DE' :
    language === 'pt' ? 'pt-PT' : 'en-US';

  const { transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition(speechLang);
  const { speak: playTTS } = useTTS(speechLang);

  // Refs always fresh — avoid stale closures in timers/callbacks
  const levelRef = useRef<Level>(1);
  const currentIndexRef = useRef(0);
  const isRecordingRef = useRef(false);
  const feedbackRef = useRef<'correct' | 'incorrect' | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  // Keep display transcript in sync
  useEffect(() => {
    if (transcript) setDisplayTranscript(transcript);
  }, [transcript]);

  const normalize = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const levenshteinDistance = (a: string, b: string): number => {
    if (!a || !b) return 99;
    const m: number[][] = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        m[i][j] = b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
      }
    }
    return m[b.length][a.length];
  };

  const getCurrentChunk = useCallback((idx: number, lvl: Level): string[] => {
    const chunk: string[] = [];
    for (let i = 0; i < lvl && idx + i < totalForms; i++) {
      const [pronoun, form] = forms[idx + i];
      chunk.push(`${pronoun} ${form}`);
    }
    return chunk;
  }, [forms, totalForms]);

  const advanceToNext = useCallback((lvl: Level, idx: number) => {
    const next = idx + lvl;
    if (next >= totalForms) {
      // Completed all forms at this level — go to next level
      const nextLevel = (lvl === 1 ? 2 : lvl === 2 ? 3 : lvl === 3 ? 6 : 8) as Level;
      if (nextLevel <= 6) {
        setLevel(nextLevel);
        setCurrentIndex(0);
      } else {
        showToast(t('repetitor.bravo'), 'success');
        onBack();
      }
    } else {
      setCurrentIndex(next);
    }
  }, [totalForms, showToast, t, onBack]);

  // Core validation — called with the final captured text
  const validate = useCallback((text: string, lvl: Level, idx: number) => {
    if (feedbackRef.current !== null) return; // already validating

    const nt = normalize(text);
    if (nt.length < 2) return;

    const chunk = getCurrentChunk(idx, lvl);
    const words = nt.split(' ').filter(Boolean);
    const verbsToFind = chunk.map(c => normalize(c.split(' ').pop() || ''));

    const allFound = verbsToFind.every(v =>
      words.some(w => (1 - levenshteinDistance(w, v) / Math.max(w.length, v.length)) >= 0.75)
    );

    setAttempts(prev => prev + 1);

    if (allFound) {
      setFeedback('correct');
      setScore(prev => prev + 1);
      setTimeout(() => {
        setFeedback(null);
        setDisplayTranscript('');
        advanceToNext(lvl, idx);
      }, 1200);
    } else {
      setFeedback('incorrect');
      setTimeout(() => {
        setFeedback(null);
        setDisplayTranscript('');
      }, 1500);
    }
  }, [getCurrentChunk, advanceToNext]);

  // Debounced auto-validation: when transcript stops changing, validate
  useEffect(() => {
    if (!isRecordingRef.current || !transcript || transcript.length < 2) return;

    // Reset debounce on every new transcript chunk
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // User paused speaking for 1.5s → stop mic and validate
      stopListening();
      setIsRecording(false);
      validate(transcript, levelRef.current, currentIndexRef.current);
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [transcript, stopListening, validate]);

  const handleStartRecording = async () => {
    if (isRecording || feedback !== null) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDisplayTranscript('');
    resetTranscript?.();
    setIsRecording(true);
    await startListening();
  };

  const handleStopManually = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    stopListening();
    setIsRecording(false);
    // Validate immediately with whatever was captured
    const captured = transcript || displayTranscript;
    if (captured.trim().length > 1) {
      validate(captured, levelRef.current, currentIndexRef.current);
    }
  };

  const progress = Math.round((currentIndex / totalForms) * 100);
  const currentChunk = getCurrentChunk(currentIndex, level);

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full text-text animate-fade-in overflow-hidden relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex justify-between items-center sticky top-0 bg-background/95 backdrop-blur z-20">
        <Button variant="secondary" onClick={onBack} size="sm">
          <i className="fas fa-home mr-2"></i> {t('common.back') || 'Accueil'}
        </Button>
        <div className="text-right">
          <div className="text-sm text-text-muted">{t('repetitor.score')}</div>
          <div className="text-2xl font-bold text-primary">{score}/{attempts}</div>
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 flex flex-col space-y-6 overflow-y-auto min-h-0 pb-32">
        {/* Progress bar */}
        <div className="w-full bg-background-secondary rounded-full h-3 overflow-hidden shadow-inner flex-shrink-0">
          <div
            className="bg-primary h-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-background-secondary rounded-xl p-8 border border-border shadow-xl">
          {/* Level + Form to repeat */}
          <div className="text-center">
            <div className="text-sm text-text-muted mb-2 uppercase tracking-widest">
              {t('repetitor.level', { level })}
            </div>
            <div className="text-4xl font-extrabold text-primary notranslate" translate="no">
              {currentChunk.map((f, i) => <div key={i} className="mb-2">{f}</div>)}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 flex-wrap justify-center">
            <Button
              onClick={() => currentChunk.forEach((chunk, i) => setTimeout(() => playTTS(chunk), i * 1500))}
              variant="secondary"
              size="lg"
              disabled={isRecording}
            >
              <i className="fas fa-volume-up mr-2"></i>
              {t('repetitor.listen')}
            </Button>

            {!isRecording ? (
              <Button
                onClick={handleStartRecording}
                variant="special"
                size="lg"
                disabled={feedback !== null}
              >
                <i className="fas fa-microphone mr-2"></i>
                {t('repetitor.repeat')}
              </Button>
            ) : (
              <Button
                onClick={handleStopManually}
                variant="secondary"
                size="lg"
                className="animate-pulse ring-2 ring-red-400"
              >
                <i className="fas fa-stop-circle mr-2 text-red-500"></i>
                Terminer
              </Button>
            )}
          </div>

          {/* Status indicator while recording */}
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-500 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              Parlez maintenant… (validation automatique à l'arrêt)
            </div>
          )}

          {/* Result box */}
          {(displayTranscript || feedback) && (
            <div className={`p-6 rounded-2xl border-4 transition-all w-full max-w-md text-center ${
              feedback === 'correct'
                ? 'bg-green-50 border-green-400 shadow-[0_0_30px_rgba(0,200,100,0.25)]'
                : feedback === 'incorrect'
                  ? 'bg-red-50 border-red-400'
                  : 'bg-background border-border'
            }`}>
              <div className="text-xs text-text-muted font-bold uppercase mb-2">
                {t('repetitor.resultLabel')}
              </div>
              <div className={`text-2xl font-black notranslate ${
                feedback === 'correct' ? 'text-green-600'
                : feedback === 'incorrect' ? 'text-red-500'
                : 'text-primary'
              }`} translate="no">
                {feedback === 'correct'
                  ? `✅ ${t('repetitor.excellent')}`
                  : feedback === 'incorrect'
                    ? `❌ ${t('repetitor.tryAgain')}`
                    : displayTranscript
                }
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
