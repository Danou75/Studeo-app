import { useState, useCallback, useEffect } from 'react';
import { ConjugationResult } from '../types';
import { TranslationResult } from '../services/translationService';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type CacheEntryType = 'conjugation' | 'translation';

export interface ConjugationCacheEntry {
  type: 'conjugation';
  key: string;          // "{verb}_{langCode}"
  verb: string;
  langCode: string;
  langName: string;
  result: ConjugationResult;
  savedAt: string;      // ISO date
  accessCount: number;
  lastAccessedAt: string;
}

export interface TranslationCacheEntry {
  type: 'translation';
  key: string;          // "{text}_{langCode}"
  text: string;
  langCode: string;
  langName: string;
  result: TranslationResult;
  savedAt: string;
  accessCount: number;
  lastAccessedAt: string;
}

export type CacheEntry = ConjugationCacheEntry | TranslationCacheEntry;

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const STORAGE_KEY = 'studeo_language_cache_v1';
const MAX_ENTRIES = 200;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const buildConjugationKey = (verb: string, langCode: string) =>
  `conj_${verb.trim().toLowerCase()}_${langCode}`;

const buildTranslationKey = (text: string, langCode: string) =>
  `trans_${text.trim().toLowerCase()}_${langCode}`;

const normalize = (str: string) =>
  str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useConjugationCache() {
  const [entries, setEntries] = useState<CacheEntry[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CacheEntry[] = JSON.parse(raw);
        setEntries(parsed);
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  // Persist to localStorage whenever entries change
  const persist = useCallback((newEntries: CacheEntry[]) => {
    try {
      // LRU: keep the MAX_ENTRIES most recently accessed
      const sorted = [...newEntries].sort(
        (a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
      );
      const trimmed = sorted.slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      setEntries(trimmed);
    } catch {
      // quota exceeded – silently skip
    }
  }, []);

  // ── Save a conjugation result ──────────────────
  const saveConjugation = useCallback((
    verb: string,
    langCode: string,
    langName: string,
    result: ConjugationResult
  ) => {
    const key = buildConjugationKey(verb, langCode);
    const now = new Date().toISOString();

    setEntries(prev => {
      const existing = prev.find(e => e.key === key && e.type === 'conjugation');
      let updated: CacheEntry[];
      if (existing) {
        updated = prev.map(e =>
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
        };
        updated = [newEntry, ...prev];
      }
      persist(updated);
      return updated;
    });
  }, [persist]);

  // ── Save a translation result ──────────────────
  const saveTranslation = useCallback((
    text: string,
    langCode: string,
    langName: string,
    result: TranslationResult
  ) => {
    const key = buildTranslationKey(text, langCode);
    const now = new Date().toISOString();

    setEntries(prev => {
      const existing = prev.find(e => e.key === key && e.type === 'translation');
      let updated: CacheEntry[];
      if (existing) {
        updated = prev.map(e =>
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
        };
        updated = [newEntry, ...prev];
      }
      persist(updated);
      return updated;
    });
  }, [persist]);

  // ── Look up a conjugation from cache ──────────────────
  const findConjugation = useCallback((
    verb: string,
    langCode: string
  ): ConjugationCacheEntry | null => {
    const key = buildConjugationKey(verb, langCode);
    const entry = entries.find(e => e.key === key && e.type === 'conjugation') as ConjugationCacheEntry | undefined;
    if (entry) {
      // Update last accessed
      const now = new Date().toISOString();
      setEntries(prev => {
        const updated = prev.map(e =>
          e.key === key ? { ...e, lastAccessedAt: now, accessCount: e.accessCount + 1 } : e
        );
        persist(updated);
        return updated;
      });
    }
    return entry ?? null;
  }, [entries, persist]);

  // ── Look up a translation from cache ──────────────────
  const findTranslation = useCallback((
    text: string,
    langCode: string
  ): TranslationCacheEntry | null => {
    const key = buildTranslationKey(text, langCode);
    const entry = entries.find(e => e.key === key && e.type === 'translation') as TranslationCacheEntry | undefined;
    if (entry) {
      const now = new Date().toISOString();
      setEntries(prev => {
        const updated = prev.map(e =>
          e.key === key ? { ...e, lastAccessedAt: now, accessCount: e.accessCount + 1 } : e
        );
        persist(updated);
        return updated;
      });
    }
    return entry ?? null;
  }, [entries, persist]);

  // ── Suggestions for autocomplete ──────────────────
  const getSuggestions = useCallback((
    query: string,
    mode: 'conjugate' | 'translate',
    langCode: string
  ): CacheEntry[] => {
    if (!query || query.length < 1) {
      // Return recent entries of the right type
      return entries
        .filter(e => e.type === (mode === 'conjugate' ? 'conjugation' : 'translation') && e.langCode === langCode)
        .slice(0, 6);
    }
    const q = normalize(query);
    return entries
      .filter(e => {
        if (e.type === 'conjugation' && mode === 'conjugate') {
          return e.langCode === langCode && normalize((e as ConjugationCacheEntry).verb).includes(q);
        }
        if (e.type === 'translation' && mode === 'translate') {
          return e.langCode === langCode && normalize((e as TranslationCacheEntry).text).includes(q);
        }
        return false;
      })
      .slice(0, 6);
  }, [entries]);

  // ── Delete a cache entry ──────────────────
  const deleteEntry = useCallback((key: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.key !== key);
      persist(updated);
      return updated;
    });
  }, [persist]);

  // ── Clear all entries ──────────────────
  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEntries([]);
  }, []);

  // ── Stats ──────────────────
  const conjugationEntries = entries.filter(e => e.type === 'conjugation') as ConjugationCacheEntry[];
  const translationEntries = entries.filter(e => e.type === 'translation') as TranslationCacheEntry[];

  return {
    entries,
    conjugationEntries,
    translationEntries,
    saveConjugation,
    saveTranslation,
    findConjugation,
    findTranslation,
    getSuggestions,
    deleteEntry,
    clearAll,
  };
}
