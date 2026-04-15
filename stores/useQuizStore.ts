import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { QuizHistoryEntry } from '../types';

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface QuizState {
    history: QuizHistoryEntry[];
    persistentErrors: Record<string, number>;
    
    setHistory: (history: QuizHistoryEntry[] | ((prev: QuizHistoryEntry[]) => QuizHistoryEntry[])) => void;
    setPersistentErrors: (errors: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
}

export const useQuizStore = create<QuizState>()(
    persist(
        (setState) => ({
            history: [],
            persistentErrors: {},

            setHistory: (updater) => setState((state) => ({
                history: typeof updater === 'function' ? updater(state.history) : updater
            })),
            
            setPersistentErrors: (updater) => setState((state) => ({
                persistentErrors: typeof updater === 'function' ? updater(state.persistentErrors) : updater
            }))
        }),
        {
            name: 'studeo-quiz-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
);
