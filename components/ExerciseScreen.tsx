import React, { useState, useEffect } from 'react';
import { ExerciseSet, ExerciseResult, ExerciseSessionResult } from '../types';
import { checkExerciseAnswer } from '../services/exerciseGenerationService';
import { exercisesToMarkdown, exercisesToRTF } from '../utils/exerciseExport';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

interface ExerciseScreenProps {
  exerciseSet: ExerciseSet;
  onBack: () => void;
  onHome?: () => void;
  onComplete: (result: ExerciseSessionResult) => void;
}

export const ExerciseScreen: React.FC<ExerciseScreenProps> = ({ exerciseSet, onBack, onHome, onComplete }) => {
  const { showToast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string | string[]>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [startTime] = useState(Date.now());
  const [exerciseStartTime, setExerciseStartTime] = useState(Date.now());
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentExercise = exerciseSet.exercises[currentIndex];
  const progress = ((currentIndex + 1) / exerciseSet.exercises.length) * 100;

  useEffect(() => {
    setExerciseStartTime(Date.now());
    
    const currentEx = exerciseSet.exercises[currentIndex];
    if (currentEx?.type === 'fill-blank') {
         const parts = currentEx.template?.split(/\{blank[^}]*\}|_{2,}|\.{3,}|\[\s*\]/) || [];
         const blankCount = Math.max(0, parts.length - 1);
         if (blankCount > 1) {
             setUserAnswer(new Array(blankCount).fill(''));
         } else {
             setUserAnswer('');
         }
    } else {
        setUserAnswer('');
    }

    setShowFeedback(false);
    setShowHint(false);
  }, [currentIndex, exerciseSet]);

  const handleSubmit = () => {
    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.some(a => !a))) {
      showToast('Veuillez répondre à la question', 'warning');
      return;
    }

    const correct = checkExerciseAnswer(currentExercise, userAnswer);
    setIsCorrect(correct);
    setShowFeedback(true);

    const timeSpent = Math.round((Date.now() - exerciseStartTime) / 1000);
    const result: ExerciseResult = {
      exerciseId: currentExercise.id,
      userAnswer,
      isCorrect: correct,
      pointsEarned: correct ? (currentExercise.points || 0) : 0,
      timeSpent
    };

    setResults([...results, result]);

    if (correct) {
      showToast('✅ Bonne réponse !', 'success');
    } else {
      showToast('❌ Réponse incorrecte', 'error');
    }
  };

  const handleNext = () => {
    if (currentIndex < exerciseSet.exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Fin des exercices
      completeSession();
    }
  };

  const completeSession = () => {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
    const maxScore = exerciseSet.totalPoints || exerciseSet.exercises.reduce((sum, ex) => sum + (ex.points || 0), 0);
    const accuracy = (totalScore / maxScore) * 100;

    const sessionResult: ExerciseSessionResult = {
      exerciseSetId: exerciseSet.id,
      lessonId: exerciseSet.lessonId,
      results,
      totalScore,
      maxScore,
      accuracy,
      totalTime,
      completedAt: new Date().toISOString()
    };

    setIsCompleted(true);
    onComplete(sessionResult);
  };

  // Sécurisation : Si pas d'exercice courant valide, on n'affiche rien ou on passe
  if (!currentExercise) {
      if (isCompleted) return null; // Laisse l'écran de fin s'afficher
      return <div className="text-center p-10">Chargement de l'exercice...</div>;
  }

  const handleExport = async (format: 'md' | 'rtf') => {
    try {
      const content = format === 'md' ? exercisesToMarkdown(exerciseSet) : exercisesToRTF(exerciseSet);
      // Nettoyage du nom de fichier pour éviter les caractères invalides
      const safeTitle = (exerciseSet.title || 'exercices').replace(/[^\w\s-]/gi, '_').substring(0, 50);
      const fileName = `${safeTitle}.${format}`;
      
      // @ts-ignore - Tauri check
      if (window.__TAURI_IPC__) {
        const filePath = await save({
          defaultPath: fileName,
          filters: [
            { 
              name: format === 'md' ? 'Markdown' : 'Rich Text Format', 
              extensions: [format] 
            }
          ]
        });
        
        if (filePath) {
          await writeTextFile(filePath, content);
          showToast(`Exercices exportés en .${format} !`, 'success');
        }
      } else {
        // Fallback Web Amélioré
        const mimeType = format === 'md' ? 'text/markdown;charset=utf-8' : 'application/rtf;charset=utf-8';
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName; // Utilisation du nom nettoyé
        link.style.display = 'none'; // S'assurer qu'il est invisible
        document.body.appendChild(link);
        
        link.click(); // Déclenche le téléchargement
        
        // Nettoyage après un court délai pour assurer que le téléchargement a démarré
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast(`Export .${format} lancé !`, 'success');
      }
    } catch (error) {
      console.error('Erreur d\'export:', error);
      showToast('Erreur lors de l\'export', 'error');
    }
  };

  const renderExercise = () => {
    if (!currentExercise) return null; // Double sécurité
    try {
        switch (currentExercise.type) {
          case 'mcq': return renderMCQ();
          case 'fill-blank': return renderFillBlank();
          case 'open-question': return renderOpenQuestion();
          case 'true-false': return renderTrueFalse();
          default:
            return <div className="text-text-muted">Type d'exercice non supporté: {currentExercise.type}</div>;
        }
    } catch (e) {
        console.error("Erreur rendu exercice:", e);
        return <div className="text-red-500">Erreur d'affichage de cet exercice.</div>;
    }
  };

  const renderMCQ = () => (
    <div className="space-y-3">
      {currentExercise.options?.map((option, index) => (
        <button
          key={index}
          onClick={() => !showFeedback && setUserAnswer(option)}
          disabled={showFeedback}
          className={`w-full p-4 text-left rounded-xl border-2 transition-all ${
            userAnswer === option
              ? showFeedback
                ? isCorrect
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-primary bg-primary/10'
              : showFeedback && option === currentExercise.correctAnswer
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-border hover:border-primary/50 bg-background-secondary'
          } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-text">{option}</span>
            {showFeedback && option === currentExercise.correctAnswer && (
              <i className="fas fa-check-circle text-green-500"></i>
            )}
            {showFeedback && userAnswer === option && !isCorrect && (
              <i className="fas fa-times-circle text-red-500"></i>
            )}
          </div>
        </button>
      ))}
    </div>
  );

  const renderFillBlank = () => {
    const blanks = currentExercise.blanks || [];
    // Supporte {blank}, {blank1}, les underscores (__) ou les points de suspension (...) comme marqueurs de trou
    const parts = currentExercise.template?.split(/\{blank[^}]*\}|_{2,}|\.{3,}|\[\s*\]/) || [];
    
    return (
      <div className="space-y-4">
        <div className="text-lg text-text leading-relaxed whitespace-pre-wrap">
          {parts.map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < parts.length - 1 && (
                <input
                  type="text"
                  value={Array.isArray(userAnswer) ? userAnswer[index] || '' : (index === 0 ? userAnswer : '')}
                  onChange={(e) => {
                    if (Array.isArray(userAnswer)) {
                        const newAnswers = [...userAnswer];
                        newAnswers[index] = e.target.value;
                        setUserAnswer(newAnswers);
                    } else {
                        setUserAnswer(e.target.value);
                    }
                  }}
                  disabled={showFeedback}
                  className={`inline-block mx-2 px-3 py-1 border-b-2 bg-transparent text-center min-w-[120px] ${
                    showFeedback
                      ? isCorrect
                        ? 'border-green-500 text-green-600'
                        : 'border-red-500 text-red-600'
                      : 'border-primary focus:outline-none'
                  }`}
                  placeholder="..."
                />
              )}
            </React.Fragment>
          ))}
        </div>
        {showFeedback && !isCorrect && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-300">
              <strong>Réponse correcte :</strong> {blanks.join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderOpenQuestion = () => (
    <div className="space-y-4">
      <textarea
        value={userAnswer as string}
        onChange={(e) => setUserAnswer(e.target.value)}
        disabled={showFeedback}
        placeholder="Écrivez votre réponse ici..."
        className="w-full p-4 border-2 border-border rounded-xl bg-background-secondary text-text focus:border-primary focus:outline-none resize-none"
        rows={4}
      />
      {showFeedback && !isCorrect && currentExercise.acceptedAnswers && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            <strong>Réponses acceptées :</strong> {currentExercise.acceptedAnswers.join(', ')}
          </p>
        </div>
      )}
    </div>
  );

  const renderTrueFalse = () => (
    <div className="flex gap-4 justify-center">
      {['true', 'false'].map((value) => (
        <button
          key={value}
          onClick={() => !showFeedback && setUserAnswer(value)}
          disabled={showFeedback}
          className={`flex-1 max-w-xs p-6 rounded-xl border-2 transition-all ${
            userAnswer === value
              ? showFeedback
                ? isCorrect
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-primary bg-primary/10'
              : showFeedback && value === currentExercise.correctAnswer
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
              : 'border-border hover:border-primary/50 bg-background-secondary'
          } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <div className="text-center">
            <div className="text-4xl mb-2">
              {value === 'true' ? '✓' : '✗'}
            </div>
            <div className="font-bold text-text">
              {value === 'true' ? 'Vrai' : 'Faux'}
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  if (isCompleted) {
    const totalScore = results.reduce((sum, r) => sum + r.pointsEarned, 0);
    const maxScore = exerciseSet.totalPoints || exerciseSet.exercises.reduce((sum, ex) => sum + (ex.points || 0), 0);
    const accuracy = (totalScore / maxScore) * 100;
    const correctCount = results.filter(r => r.isCorrect).length;

    return (
      <div className="flex-1 min-h-0 flex bg-background items-center justify-center p-4 overflow-y-auto">
        <div className="max-w-2xl w-full bg-background-secondary rounded-2xl shadow-2xl p-6 md:p-8 text-center my-auto">
          <div className="mb-6">
            <div className="text-6xl mb-4">
              {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '💪'}
            </div>
            <h2 className="text-3xl font-bold text-text mb-2">Exercices terminés !</h2>
            <p className="text-text-muted">
              {accuracy >= 80 ? 'Excellent travail !' : accuracy >= 60 ? 'Bon travail !' : 'Continuez à vous entraîner !'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
            <div className="bg-background-tertiary p-3 md:p-4 rounded-xl">
              <div className="text-2xl md:text-3xl font-bold text-primary">{correctCount}/{exerciseSet.exercises.length}</div>
              <div className="text-xs md:text-sm text-text-muted">Réponses correctes</div>
            </div>
            <div className="bg-background-tertiary p-3 md:p-4 rounded-xl">
              <div className="text-2xl md:text-3xl font-bold text-primary">{Math.round(accuracy)}%</div>
              <div className="text-xs md:text-sm text-text-muted">Précision</div>
            </div>
            <div className="bg-background-tertiary p-3 md:p-4 rounded-xl">
              <div className="text-2xl md:text-3xl font-bold text-primary">{totalScore}</div>
              <div className="text-xs md:text-sm text-text-muted">Points</div>
            </div>
          </div>

          {/* Boutons d'export */}
          <div className="mb-6 p-4 bg-background-tertiary rounded-xl">
            <p className="text-sm text-text-muted mb-3">Exporter les exercices :</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => handleExport('md')}
                className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 rounded flex items-center gap-2 transition-colors text-text/70 hover:text-text border border-border"
              >
                <i className="fab fa-markdown"></i> MD
              </button>
              <button 
                onClick={() => handleExport('rtf')}
                className="px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 rounded flex items-center gap-2 transition-colors text-text/70 hover:text-text border border-border"
              >
                <i className="fas fa-file-word"></i> RTF
              </button>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={onBack} variant="secondary" size="lg">
              <i className="fas fa-arrow-left mr-2"></i>
              Retour à la leçon
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden relative">
      {/* Header avec progression */}
      <div className="bg-background-secondary border-b border-border pt-safe p-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2 text-inherit">
                <Button variant="secondary" onClick={onBack} size="sm">
                  <i className="fas fa-arrow-left mr-2"></i>
                  Retour
                </Button>
                {onHome && (
                  <Button variant="secondary" onClick={onHome} size="sm">
                    <i className="fas fa-home mr-2"></i>
                    Accueil
                  </Button>
                )}
            </div>
            <div className="text-sm text-text-muted">
              Question {currentIndex + 1} / {exerciseSet.exercises.length}
            </div>
          </div>
          <div className="w-full bg-background-tertiary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 min-h-0 bg-background/50 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="bg-background-secondary rounded-2xl shadow-lg p-6 md:p-8 border border-border">
            {/* Type et difficulté */}
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {currentExercise.type === 'mcq' && 'QCM'}
                {currentExercise.type === 'fill-blank' && 'Texte à trous'}
                {currentExercise.type === 'open-question' && 'Question ouverte'}
                {currentExercise.type === 'true-false' && 'Vrai/Faux'}
              </span>
              {currentExercise.difficulty && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentExercise.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                  currentExercise.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {currentExercise.difficulty === 'easy' && '⭐ Facile'}
                  {currentExercise.difficulty === 'medium' && '⭐⭐ Moyen'}
                  {currentExercise.difficulty === 'hard' && '⭐⭐⭐ Difficile'}
                </span>
              )}
              <span className="ml-auto text-primary font-bold">{currentExercise.points} pts</span>
            </div>

            {/* Question */}
            <h3 className="text-xl md:text-2xl font-bold text-text mb-6 leading-tight">{currentExercise.question}</h3>

            {/* Exercice */}
            <div className="min-h-0">
              {renderExercise()}
            </div>

            {/* Indice */}
            {currentExercise.hint && !showFeedback && (
              <div className="mt-6">
                {!showHint ? (
                  <button
                    onClick={() => setShowHint(true)}
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <i className="fas fa-lightbulb"></i>
                    Afficher un indice
                  </button>
                ) : (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <i className="fas fa-lightbulb mr-2"></i>
                      <strong>Indice :</strong> {currentExercise.hint}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Explication après réponse */}
            {showFeedback && currentExercise.explanation && (
              <div className={`mt-6 p-4 rounded-lg border ${
                isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
                <p className={`text-sm ${
                  isCorrect
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  <i className="fas fa-info-circle mr-2"></i>
                  <strong>Explication :</strong> {currentExercise.explanation}
                </p>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="mt-8 flex gap-4">
              {!showFeedback ? (
                <Button onClick={handleSubmit} className="flex-1" size="lg">
                  <i className="fas fa-check mr-2"></i>
                  Valider
                </Button>
              ) : (
                <Button onClick={handleNext} className="flex-1" size="lg">
                  {currentIndex < exerciseSet.exercises.length - 1 ? (
                    <>
                      Suivant <i className="fas fa-arrow-right ml-2"></i>
                    </>
                  ) : (
                    <>
                      Terminer <i className="fas fa-flag-checkered ml-2"></i>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
