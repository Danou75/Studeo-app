import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../types';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'fr', // Default
      setLanguage: (lang: Language) => set({ language: lang }),
    }),
    {
      name: 'language-storage',
    }
  )
);
