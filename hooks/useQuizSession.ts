import { useState } from 'react';
import { Flashcard, QuizConfig, QuizHistoryEntry } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { useConfirmation } from '../contexts/ConfirmationContext';

export const useQuizSession = () => {
    const [quizCards, setQuizCards] = useState<Flashcard[]>([]);
    const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
    const [lastResult, setLastResult] = useState<QuizHistoryEntry | null>(null);
    const [incorrectCards, setIncorrectCards] = useState<Flashcard[]>([]);
    
    const [history, setHistory] = useLocalStorage<QuizHistoryEntry[]>('quizHistory', []);
    const [persistentErrors, setPersistentErrors] = useLocalStorage<Record<string, number>>('persistentErrors', {});

    const { showConfirmation } = useConfirmation();

    const buildQuizName = (params: { mode: QuizConfig['mode']; questionLang: string; answerLang: string; setName: string }) => {
        const { mode, questionLang, answerLang, setName } = params;
        const modeLabel = mode === 'mcq' ? 'QCM' : 'Classique';
        return `Vocab ${questionLang}→${answerLang} (${modeLabel}) — Set: ${setName}`;
    };

    const startQuiz = (cards: Flashcard[], config: Omit<QuizConfig, 'voiceEngine' | 'autoPlayAudio' | 'quizName'>, voiceEngine: QuizConfig['voiceEngine'], autoPlayAudio: boolean, setName: string) => {
        const quizName = buildQuizName({
            mode: config.mode,
            questionLang: config.questionLang,
            answerLang: config.answerLang,
            setName: setName,
        });
        setQuizCards(cards);
        setQuizConfig({ ...config, voiceEngine, autoPlayAudio, quizName });
    };

    const endQuiz = (result: Omit<QuizHistoryEntry, 'id' | 'date' | 'timestamp' | 'questionLang' | 'answerLang' | 'quizName'>, mistakes: Flashcard[]) => {
        if (!quizConfig) return;
        const newEntry: QuizHistoryEntry = {
            ...result,
            id: Date.now(),
            date: new Date().toISOString(),
            timestamp: Date.now(),
            questionLang: quizConfig.questionLang,
            answerLang: quizConfig.answerLang,
            quizName: quizConfig.quizName,
        };
        setHistory(prev => [newEntry, ...prev].slice(0, 50));
        setLastResult(newEntry);
        setIncorrectCards(mistakes);

        // Update persistent errors
        const newErrors = { ...persistentErrors };
        mistakes.forEach(card => {
            newErrors[card.id] = (newErrors[card.id] || 0) + 1;
        });
        setPersistentErrors(newErrors);
    };

    const getPersistentErrorCards = (allFlashcards: Flashcard[]) => {
        const errorThreshold = 2;
        return allFlashcards.filter(card => (persistentErrors[card.id] || 0) >= errorThreshold);
    };

    const deleteHistoryEntry = (entryId: number) => {
        showConfirmation({
            title: "Supprimer l'historique",
            message: "Êtes-vous sûr de vouloir supprimer cette entrée de l'historique ?",
            variant: 'warning',
            onConfirm: () => {
                setHistory(prev => prev.filter(entry => entry.id !== entryId));
            }
        });
    };

    const resetPersistentError = (cardId: string) => {
        showConfirmation({
            title: "Réinitialiser l'erreur",
            message: "Êtes-vous sûr de vouloir réinitialiser les erreurs de cette carte ?",
            variant: 'info',
            onConfirm: () => {
                setPersistentErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[cardId];
                    return newErrors;
                });
            }
        });
    };

    return {
        quizCards,
        quizConfig,
        lastResult,
        incorrectCards,
        history,
        persistentErrors,
        startQuiz,
        endQuiz,
        getPersistentErrorCards,
        deleteHistoryEntry,
        resetPersistentError
    };
};
