import { create } from 'zustand';
import { Flashcard, QuizConfig, QuizHistoryEntry } from '../types';
export interface QuizSessionState {
    quizCards: Flashcard[];
    quizConfig: QuizConfig | null;
    lastResult: QuizHistoryEntry | null;
    incorrectCards: Flashcard[];
    history: QuizHistoryEntry[];
    persistentErrors: Record<string, number>;
    
    setQuizCards: (cards: Flashcard[]) => void;
    setQuizConfig: (config: QuizConfig | null) => void;
    setLastResult: (result: QuizHistoryEntry | null) => void;
    setIncorrectCards: (cards: Flashcard[]) => void;
    setHistory: (history: QuizHistoryEntry[] | ((prev: QuizHistoryEntry[]) => QuizHistoryEntry[])) => void;
    setPersistentErrors: (errors: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;

    startQuiz: (
        cards: Flashcard[], 
        config: Omit<QuizConfig, 'voiceEngine' | 'autoPlayAudio' | 'quizName'>, 
        voiceEngine: QuizConfig['voiceEngine'], 
        autoPlayAudio: boolean, 
        setName: string, 
        customQuizName?: string
    ) => void;
    
    endQuiz: (
        result: Omit<QuizHistoryEntry, 'id' | 'date' | 'timestamp' | 'questionLang' | 'answerLang' | 'quizName'>, 
        mistakes: Flashcard[]
    ) => void;
    
    getPersistentErrorCards: (allCards: Flashcard[]) => Flashcard[];
    resetPersistentError: (cardId: string) => void;
    deleteHistoryEntry: (entryId: number) => void;
}

export const buildQuizName = (params: { mode: QuizConfig['mode']; questionLang: string; answerLang: string; setName: string }) => {
    const { mode, questionLang, answerLang, setName } = params;
    const modeLabel = mode === 'mcq' ? 'QCM' : 'Classique';
    return `Vocab ${questionLang}→${answerLang} (${modeLabel}) — Set: ${setName}`;
};

export const useQuizSessionStore = create<QuizSessionState>((set, get) => ({
    quizCards: [],
    quizConfig: null,
    lastResult: null,
    incorrectCards: [],
    history: [],
    persistentErrors: {},
    
    setQuizCards: (cards) => set({ quizCards: cards }),
    setQuizConfig: (config) => set({ quizConfig: config }),
    setLastResult: (result) => set({ lastResult: result }),
    setIncorrectCards: (cards) => set({ incorrectCards: cards }),
    setHistory: (updater) => set((state) => ({
        history: typeof updater === 'function' ? updater(state.history) : updater
    })),
    setPersistentErrors: (updater) => set((state) => ({
        persistentErrors: typeof updater === 'function' ? updater(state.persistentErrors) : updater
    })),

    startQuiz: (cards, config, voiceEngine, autoPlayAudio, setName, customQuizName) => {
        const quizName = customQuizName || buildQuizName({
            mode: config.mode,
            questionLang: config.questionLang,
            answerLang: config.answerLang,
            setName: setName,
        });
        set({
            quizCards: cards,
            quizConfig: { ...config, voiceEngine, autoPlayAudio, quizName }
        });
    },

    endQuiz: (result, mistakes) => {
        const state = get();
        if (!state.quizConfig) return;
        
        const newEntry: QuizHistoryEntry = {
            ...result,
            id: Date.now(),
            date: new Date().toISOString(),
            timestamp: Date.now(),
            questionLang: state.quizConfig.questionLang,
            answerLang: state.quizConfig.answerLang,
            quizName: state.quizConfig.quizName,
        };

        set({
            lastResult: newEntry,
            incorrectCards: mistakes
        });

        // Update history
        get().setHistory(prev => [newEntry, ...prev].slice(0, 50));
        
        // Update persistent errors
        const newErrors = { ...get().persistentErrors };
        mistakes.forEach(card => {
            newErrors[card.id] = (newErrors[card.id] || 0) + 1;
        });
        set({ persistentErrors: newErrors });
    },
    
    getPersistentErrorCards: (allCards) => {
        const state = get();
        return allCards.filter(card => (state.persistentErrors[card.id] || 0) >= 2);
    },
    
    resetPersistentError: (cardId) => {
        const state = get();
        const newErrors = { ...state.persistentErrors };
        delete newErrors[cardId];
        set({ persistentErrors: newErrors });
    },
    
    deleteHistoryEntry: (entryId) => {
        set((state) => ({
            history: state.history.filter(entry => entry.id !== entryId)
        }));
    }
}));
