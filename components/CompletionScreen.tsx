// components/CompletionScreen.tsx
import React, { useState } from 'react';
import { QuizHistoryEntry, QuizConfig, Flashcard, Achievement } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

import confetti from 'canvas-confetti';

type Props = {
  lastResult: QuizHistoryEntry;
  incorrectCards: Flashcard[];
  persistentErrors: Flashcard[];
  history: QuizHistoryEntry[];
  onStartRevision: () => void;
  onRestart: () => void;
  onRestartSameQuiz: () => void;
  quizConfig: QuizConfig;
  onDeleteHistoryEntry: (entryId: number) => void;
  onResetPersistentError: (cardId: string) => void;
  newAchievements?: Achievement[];
  onBackToLesson?: () => void;
  onGenerateBonusExercises?: () => void;
  onBackToSetup?: () => void;
  isProgramCompleted?: boolean;
  onResetProgramCompletion?: () => void;
};

export const CompletionScreen: React.FC<Props> = ({
  lastResult,
  incorrectCards,
  persistentErrors,
  history,
  onStartRevision,
  onRestart,
  onRestartSameQuiz,
  quizConfig,
  onDeleteHistoryEntry,
  onResetPersistentError,
  newAchievements = [],
  onBackToLesson,
  onGenerateBonusExercises,
  onBackToSetup,
  isProgramCompleted,
  onResetProgramCompletion,
}) => {
  const { t } = useTranslation();
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showPersistentErrors, setShowPersistentErrors] = useState(false);
  const [showIncorrectCards, setShowIncorrectCards] = useState(false);

  // Animation festive pour fin de programme
  React.useEffect(() => {
    if (isProgramCompleted) {
        const duration = 5000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const random = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
            return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // Fireworks effect
            confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: random(0.3, 0.7), y: Math.random() - 0.2 } });
        }, 250);

        const applauseAudio = new Audio("https://actions.google.com/sounds/v1/humanity/applause.ogg");
        applauseAudio.volume = 0.8;
        applauseAudio.play().catch(e => console.warn("Lecture audio impossible:", e));

        return () => {
            clearInterval(interval);
            applauseAudio.pause();
            applauseAudio.currentTime = 0;
            if (onResetProgramCompletion) onResetProgramCompletion();
        };
    }
  }, [isProgramCompleted]);

  // Animation festive pour un score parfait (seulement si pas déjà programme completed pour éviter double dose)
  React.useEffect(() => {
    if (!isProgramCompleted && lastResult.correctCount === lastResult.totalCount && lastResult.totalCount > 0) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const random = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      const applauseAudio = new Audio("https://actions.google.com/sounds/v1/humanity/applause.ogg");
      applauseAudio.volume = 0.6;
      applauseAudio.play().catch(e => console.warn("Lecture audio impossible:", e));

      return () => {
        clearInterval(interval);
        applauseAudio.pause();
        applauseAudio.currentTime = 0;
      };
    }
  }, [lastResult, isProgramCompleted]);

  const displayedQuizName = lastResult.quizName || quizConfig.quizName;
  const displayedHistory = showFullHistory ? history : history.slice(0, 5);

  return (
    <div className="h-full overflow-y-auto pt-safe p-6 space-y-6">
      <h2 className="text-2xl font-bold">{t('completion.title')}</h2>

      {/* Bannière de Fin de Programme */}
      {isProgramCompleted && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-2xl shadow-xl text-center mb-6 animate-pulse border-4 border-yellow-400 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 2px, transparent 2.5px)', backgroundSize: '20px 20px' }}></div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 flex flex-col md:flex-row items-center justify-center gap-4 relative z-10">
                <span className="animate-bounce">👑</span> 
                {t('completion.programCompletedTitle') === 'completion.programCompletedTitle' ? 'PROGRAMME TERMINÉ !' : t('completion.programCompletedTitle')} 
                <span className="animate-bounce">👑</span>
            </h1>
            <p className="text-xl md:text-2xl opacity-95 mb-6 font-medium relative z-10">
                {t('completion.programCompletedMessage') === 'completion.programCompletedMessage' ? 'Félicitations ! Vous avez validé tous les modules de ce parcours !' : t('completion.programCompletedMessage')}
            </p>
            <div className="flex justify-center gap-8 relative z-10">
                <i className="fas fa-star text-yellow-300 text-4xl animate-spin-slow"></i>
                <i className="fas fa-graduation-cap text-white text-6xl drop-shadow-lg transform hover:scale-110 transition-transform"></i>
                <i className="fas fa-star text-yellow-300 text-4xl animate-spin-slow"></i>
            </div>
        </div>
      )}

      {/* Succès débloqués */}
      {newAchievements.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 p-4 rounded-lg border border-yellow-300 dark:border-yellow-700 animate-pulse">
          <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-100 mb-2 flex items-center">
            <i className="fas fa-trophy mr-2 text-2xl"></i> {t('completion.achievements')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {newAchievements.map(achievement => (
              <div key={achievement.id} className="bg-background p-3 rounded shadow flex items-center">
                <span className="text-3xl mr-3">{achievement.icon}</span>
                <div>
                  <p className="font-bold text-text">{achievement.name}</p>
                  <p className="text-xs text-text-secondary">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nom du quiz joué */}
      <div className="rounded-lg border border-border p-4 bg-background-secondary">
        <p className="text-sm text-text-secondary">
          {t('completion.quizLabel')} <span className="font-semibold">{displayedQuizName}</span>
        </p>
        <p className="text-sm text-text-secondary">
          {t('completion.languagesLabel')} {lastResult.questionLang} → {lastResult.answerLang}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border p-4">
          <p className="text-lg font-semibold">{t('completion.scoreLabel')}</p>
          <p className="text-3xl">
            {lastResult.correctCount}/{lastResult.totalCount}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-lg font-semibold">{t('completion.errorsLabel')}</p>
          <p className="text-3xl">{incorrectCards.length}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-lg font-semibold">{t('completion.persistentErrorsLabel')}</p>
          <p className="text-3xl">{persistentErrors.length}</p>
        </div>
      </div>

      {/* Cartes incorrectes */}
      {incorrectCards.length > 0 && (
        <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-900">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100">
              {t('completion.reviewCards', { count: incorrectCards.length })}
            </h3>
            <button
              onClick={() => setShowIncorrectCards(!showIncorrectCards)}
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
            >
              {showIncorrectCards ? t('completion.hide') : t('completion.show')}
            </button>
          </div>
          {showIncorrectCards && (
            <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
              {incorrectCards.map((card, idx) => (
                <div key={idx} className="bg-background p-2 rounded text-sm">
                  {card.type === 'classic' && card.terms && (
                    <p className="text-text-secondary">
                      {card.terms[quizConfig.questionLang] || 'N/A'} → {card.terms[quizConfig.answerLang] || 'N/A'}
                    </p>
                  )}
                  {card.type === 'mcq' && card.mcqData && (
                    <p className="text-text-secondary">
                      {card.mcqData.question[quizConfig.questionLang] || 'N/A'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onStartRevision}
            className="w-full px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white font-semibold transition"
          >
            {t('completion.reviewButton')}
          </button>
        </div>
      )}

      {/* Progression (Erreurs persistantes) */}
      {persistentErrors.length > 0 && (
        <div className="rounded-lg border p-4 bg-red-50 dark:bg-red-900">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-semibold text-red-900 dark:text-red-100">
              {t('completion.difficultProgress', { count: persistentErrors.length })}
            </h3>
            <button
              onClick={() => setShowPersistentErrors(!showPersistentErrors)}
              className="text-sm text-red-700 dark:text-red-300 hover:underline"
            >
              {showPersistentErrors ? t('completion.hide') : t('completion.show')}
            </button>
          </div>
          {showPersistentErrors && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {persistentErrors.map((card, idx) => (
                <div key={idx} className="bg-background p-3 rounded flex justify-between items-center">
                  <div className="text-sm flex-1">
                    {card.type === 'classic' && card.terms && (
                      <p className="text-text-secondary">
                        {card.terms[quizConfig.questionLang] || 'N/A'} → {card.terms[quizConfig.answerLang] || 'N/A'}
                      </p>
                    )}
                    {card.type === 'mcq' && card.mcqData && (
                      <p className="text-text-secondary">
                        {card.mcqData.question[quizConfig.questionLang] || 'N/A'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onResetPersistentError(card.id)}
                    className="ml-3 bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition"
                    title={t('completion.removeProgress')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historique avec nom du quiz et bouton de suppression */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-semibold">{t('completion.recentActivity')}</h3>
          {history.length > 5 && (
            <button
              onClick={() => setShowFullHistory(!showFullHistory)}
              className="text-sm text-primary hover:underline"
            >
              {showFullHistory ? t('completion.showLess') : t('completion.showAll')}
            </button>
          )}
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {displayedHistory.map(entry => (
            <div key={entry.id} className="bg-background-secondary p-3 rounded flex justify-between items-center">
              <div className="flex-1 text-sm text-text">
                <p className="font-medium">{entry.quizName || displayedQuizName}</p>
                <p className="text-xs text-text-muted">
                  {entry.correctCount}/{entry.totalCount} — {new Date(entry.timestamp).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => onDeleteHistoryEntry(entry.id)}
                className="ml-3 bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition"
                title={t('completion.removeHistory')}
              >
                ✕
              </button>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-center text-text-muted py-4">
              {t('completion.noHistory')}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        {onBackToLesson && (
            <button 
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition flex items-center shadow-sm" 
                onClick={onBackToLesson}
            >
                <i className="fas fa-book-open mr-2"></i> {t('completion.backToLesson')}
            </button>
        )}
        
        {onGenerateBonusExercises && lastResult.totalCount > 0 && (lastResult.correctCount / lastResult.totalCount >= 0.7) && (
            <button 
                className="px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition flex items-center shadow-lg transform hover:scale-105" 
                onClick={onGenerateBonusExercises}
            >
                <i className="fas fa-star mr-2 text-yellow-300"></i> {t('completion.bonusExercises')}
            </button>
        )}

        <button className="px-4 py-2 rounded bg-primary hover:bg-primary-hover text-white transition" onClick={onStartRevision}>
          {t('completion.reviewErrors')}
        </button>
        <button className="px-4 py-2 rounded bg-background-tertiary hover:bg-background-secondary transition" onClick={onRestartSameQuiz}>
          {t('completion.restartQuiz')}
        </button>
        {onBackToSetup && (
          <button className="px-4 py-2 rounded bg-background-tertiary hover:bg-background-secondary transition" onClick={onBackToSetup}>
            {t('completion.backToSetup') || 'Configuration du Quiz'}
          </button>
        )}
        <button className="px-4 py-2 rounded bg-background-tertiary hover:bg-background-secondary transition" onClick={onRestart}>
          {t('common.back')}
        </button>
      </div>
    </div>
  );
};