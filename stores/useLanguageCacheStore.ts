import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ConjugationResult } from '../types';
import { TranslationResult } from '../services/translationService';
import { TUTORS } from '../constants';

export type CacheEntryType = 'conjugation' | 'translation';

export interface ConjugationCacheEntry {
  type: 'conjugation';
  key: string;
  verb: string;
  langCode: string;
  langName: string;
  result: ConjugationResult;
  savedAt: string;
  accessCount: number;
  lastAccessedAt: string;
  tutorId?: string;
}

export interface TranslationCacheEntry {
  type: 'translation';
  key: string;
  text: string;
  langCode: string;
  langName: string;
  result: TranslationResult;
  savedAt: string;
  accessCount: number;
  lastAccessedAt: string;
  tutorId?: string;
}

export type CacheEntry = ConjugationCacheEntry | TranslationCacheEntry;

const MAX_ENTRIES = 200;

const buildConjugationKey = (verb: string, langCode: string) =>
  `conj_${verb.trim().toLowerCase()}_${langCode}`;

const buildTranslationKey = (text: string, langCode: string) =>
  `trans_${text.trim().toLowerCase()}_${langCode}`;

const normalize = (str: string) =>
  str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export interface LanguageCacheState {
  entries: CacheEntry[];
  saveConjugation: (verb: string, langCode: string, langName: string, result: ConjugationResult, tutorId?: string) => void;
  saveTranslation: (text: string, langCode: string, langName: string, result: TranslationResult, tutorId?: string) => void;
  findConjugation: (verb: string, langCode: string) => ConjugationCacheEntry | null;
  findTranslation: (text: string, langCode: string) => TranslationCacheEntry | null;
  getSuggestions: (query: string, mode: 'conjugate' | 'translate', langCode: string) => CacheEntry[];
  deleteEntry: (key: string) => void;
  clearAll: () => void;
  hydrate: (newEntries: CacheEntry[]) => void;
  migrateTutorIds: () => void;
}

export const useLanguageCacheStore = create<LanguageCacheState>()(
  persist(
    (set, get) => ({
      entries: [],

      saveConjugation: (verb, langCode, langName, result, tutorId) => {
        const key = buildConjugationKey(verb, langCode);
        const now = new Date().toISOString();

        set((state) => {
          const prev = state.entries;
          const existing = prev.find((e) => e.key === key && e.type === 'conjugation');
          let updated: CacheEntry[];

          if (existing) {
            updated = prev.map((e) =>
              e.key === key && e.type === 'conjugation'
                ? ({ ...e, result, lastAccessedAt: now, accessCount: e.accessCount + 1 } as ConjugationCacheEntry)
                : e
            );
          } else {
            const newEntry: ConjugationCacheEntry = {
              type: 'conjugation',
              key,
              verb: verb.trim(),
              langCode,
              langName,
              result,
              savedAt: now,
              lastAccessedAt: now,
              accessCount: 1,
              tutorId,
            };
            updated = [newEntry, ...prev];
          }

          // LRU cleanup
          const sorted = updated.sort(
            (a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
          );
          return { entries: sorted.slice(0, MAX_ENTRIES) };
        });
      },

      saveTranslation: (text, langCode, langName, result, tutorId) => {
        const key = buildTranslationKey(text, langCode);
        const now = new Date().toISOString();

        set((state) => {
          const prev = state.entries;
          const existing = prev.find((e) => e.key === key && e.type === 'translation');
          let updated: CacheEntry[];

          if (existing) {
            updated = prev.map((e) =>
              e.key === key && e.type === 'translation'
                ? ({ ...e, result, lastAccessedAt: now, accessCount: e.accessCount + 1 } as TranslationCacheEntry)
                : e
            );
          } else {
            const newEntry: TranslationCacheEntry = {
              type: 'translation',
              key,
              text: text.trim(),
              langCode,
              langName,
              result,
              savedAt: now,
              lastAccessedAt: now,
              accessCount: 1,
              tutorId,
            };
            updated = [newEntry, ...prev];
          }

          // LRU cleanup
          const sorted = updated.sort(
            (a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
          );
          return { entries: sorted.slice(0, MAX_ENTRIES) };
        });
      },

      findConjugation: (verb, langCode) => {
        const key = buildConjugationKey(verb, langCode);
        const state = get();
        const entry = state.entries.find((e) => e.key === key && e.type === 'conjugation') as ConjugationCacheEntry | undefined;

        if (entry) {
          const now = new Date().toISOString();
          set((s) => ({
            entries: s.entries.map((e) =>
              e.key === key ? { ...e, lastAccessedAt: now, accessCount: e.accessCount + 1 } : e
            )
          }));
        }

        return entry ?? null;
      },

      findTranslation: (text, langCode) => {
        const key = buildTranslationKey(text, langCode);
        const state = get();
        const entry = state.entries.find((e) => e.key === key && e.type === 'translation') as TranslationCacheEntry | undefined;

        if (entry) {
          const now = new Date().toISOString();
          set((s) => ({
            entries: s.entries.map((e) =>
              e.key === key ? { ...e, lastAccessedAt: now, accessCount: e.accessCount + 1 } : e
            )
          }));
        }

        return entry ?? null;
      },

      getSuggestions: (query, mode, langCode) => {
        const { entries } = get();
        if (!query || query.length < 1) {
          return entries
            .filter((e) => e.type === (mode === 'conjugate' ? 'conjugation' : 'translation') && e.langCode === langCode)
            .slice(0, 6);
        }
        const q = normalize(query);
        return entries
          .filter((e) => {
            if (e.type === 'conjugation' && mode === 'conjugate') {
              return e.langCode === langCode && normalize((e as ConjugationCacheEntry).verb).includes(q);
            }
            if (e.type === 'translation' && mode === 'translate') {
              return e.langCode === langCode && normalize((e as TranslationCacheEntry).text).includes(q);
            }
            return false;
          })
          .slice(0, 6);
      },

      deleteEntry: (key) => set((s) => ({ entries: s.entries.filter((e) => e.key !== key) })),

      clearAll: () => set({ entries: [] }),

      hydrate: (newEntries) => set({ entries: newEntries }),

      migrateTutorIds: () => set((state) => {
        // Build langCode → tutorId map from TUTORS that have a language field
        const langToTutor: Record<string, string> = {};
        TUTORS.forEach(tutor => {
          if ((tutor as any).language) {
            langToTutor[(tutor as any).language] = tutor.id;
          }
        });

        const needsMigration = state.entries.some(e => {
            const inferred = langToTutor[e.langCode];
            return inferred && e.tutorId !== inferred;
        });
        if (!needsMigration) return state; // nothing to do

        return {
          entries: state.entries.map(e => {
            const inferredTutorId = langToTutor[e.langCode];
            // Override existing tutorId if it doesn't match the language tutor
            if (inferredTutorId) {
              return { ...e, tutorId: inferredTutorId };
            }
            return e;
          })
        };
      }),
    }),
    {
      name: 'studeo_language_cache_v1',
    }
  )
);
