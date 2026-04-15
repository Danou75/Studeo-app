import {
    useLanguageCacheStore,
    CacheEntryType,
    ConjugationCacheEntry,
    TranslationCacheEntry,
    CacheEntry,
} from '../stores/useLanguageCacheStore';

export function useConjugationCache() {
    return useLanguageCacheStore();
}

export type {
    CacheEntryType,
    ConjugationCacheEntry,
    TranslationCacheEntry,
    CacheEntry
};
