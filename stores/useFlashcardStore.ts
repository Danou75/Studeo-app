import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { Flashcard } from '../types';
import { DEFAULT_FLASHCARDS, DEFAULT_FLASHCARD_SET_NAME } from '../constants';

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

interface FlashcardState {
    flashcardSets: Record<string, Flashcard[]>;
    flashcardSetsMetadata: Record<string, { createdAt: number; tutorId?: string }>;
    currentSetName: string;
    
    // Core actions
    setFlashcardSets: (sets: Record<string, Flashcard[]> | ((prev: Record<string, Flashcard[]>) => Record<string, Flashcard[]>)) => void;
    setFlashcardSetsMetadata: (metadata: Record<string, { createdAt: number; tutorId?: string }> | ((prev: Record<string, { createdAt: number; tutorId?: string }>) => Record<string, { createdAt: number; tutorId?: string }>)) => void;
    setCurrentSetName: (name: string) => void;
}

export const useFlashcardStore = create<FlashcardState>()(
    persist(
        (setState) => ({
            flashcardSets: {
                [DEFAULT_FLASHCARD_SET_NAME]: DEFAULT_FLASHCARDS,
            },
            flashcardSetsMetadata: {},
            currentSetName: DEFAULT_FLASHCARD_SET_NAME,

            setFlashcardSets: (updater) => setState((state) => ({
                flashcardSets: typeof updater === 'function' ? updater(state.flashcardSets) : updater
            })),
            
            setFlashcardSetsMetadata: (updater) => setState((state) => ({
                flashcardSetsMetadata: typeof updater === 'function' ? updater(state.flashcardSetsMetadata) : updater
            })),
            
            setCurrentSetName: (name) => setState({ currentSetName: name })
        }),
        {
            name: 'studeo-flashcards-storage',
            storage: createJSONStorage(() => idbStorage),
        }
    )
);
