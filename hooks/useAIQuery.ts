/**
 * hooks/useAIQuery.ts — Hook React Query générique pour toute génération IA.
 *
 * Gère automatiquement :
 *   - Le cache (stale 10 min, gc 30 min — configuré dans QueryClient)
 *   - La déduplication des requêtes identiques en vol
 *   - Les états loading / error / data
 *   - Le retry automatique (2 fois)
 *
 * Usage :
 *   const { data, isLoading, error, refetch } = useAIQuery(
 *     ['cards', topic, provider],          // queryKey — doit être unique
 *     () => generateFlashcardsWithAI(cfg), // queryFn
 *     { enabled: !!topic }                 // options
 *   );
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { callAI, AICallOptions, AICallResult } from '../services/aiClient';
import { AIClientConfig } from '../utils/aiConfigHelper';

// ── Clés de cache typées ───────────────────────────────────────────────────────

export const AI_QUERY_KEYS = {
    cards:      (topic: string, provider: string, lang: string) =>
                    ['ai', 'cards', provider, topic, lang] as const,
    lesson:     (topic: string, provider: string, module?: string) =>
                    ['ai', 'lesson', provider, topic, module ?? ''] as const,
    curriculum: (topic: string, provider: string, lang: string) =>
                    ['ai', 'curriculum', provider, topic, lang] as const,
    vocab:      (word: string, provider: string, lang: string) =>
                    ['ai', 'vocab', provider, word, lang] as const,
    exercises:  (lessonId: string, provider: string) =>
                    ['ai', 'exercises', provider, lessonId] as const,
    translation:(text: string, from: string, to: string, provider: string) =>
                    ['ai', 'translation', provider, from, to, text.slice(0, 50)] as const,
    conjugation:(verb: string, lang: string, provider: string) =>
                    ['ai', 'conjugation', provider, lang, verb] as const,
} as const;

// ── Hook générique useAIQuery ─────────────────────────────────────────────────

/**
 * Wrapper de useQuery pour les appels IA.
 * Accepte n'importe quel queryFn qui retourne une Promise.
 */
export function useAIQuery<TData>(
    queryKey: readonly unknown[],
    queryFn:  () => Promise<TData>,
    options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery<TData, Error>({
        queryKey,
        queryFn,
        ...options,
    });
}

// ── Hook spécialisé : appel IA brut avec texte ────────────────────────────────

/**
 * useAIPrompt — Envoie un prompt au client IA unifié et cache la réponse.
 *
 * @param queryKey  Clé de cache unique (utiliser AI_QUERY_KEYS.*)
 * @param config    Configuration du provider (getAIClientConfig)
 * @param prompt    Le prompt à envoyer
 * @param options   Options useQuery optionnelles
 */
export function useAIPrompt(
    queryKey: readonly unknown[],
    config:   AIClientConfig,
    prompt:   string,
    options?: Omit<UseQueryOptions<AICallResult, Error>, 'queryKey' | 'queryFn'>
) {
    return useQuery<AICallResult, Error>({
        queryKey,
        queryFn:  () => callAI(config as AICallOptions, prompt),
        enabled:  !!prompt && !!config.provider,
        ...options,
    });
}

// ── Hook spécialisé : mutation (actions non-cachables) ────────────────────────

/**
 * useAIMutation — Pour les opérations IA qui ne doivent PAS être cachées :
 * chat temps-réel, évaluation de dessin, génération à la demande unique.
 *
 * Contrairement à useAIQuery, les mutations se declenchent via `mutate()`.
 */
export function useAIMutation<TData, TVariables>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
    return useMutation<TData, Error, TVariables>({
        mutationFn,
        ...options,
    });
}

// ── Utilitaire : invalidation ciblée ─────────────────────────────────────────

/**
 * Retourne les clés partielles pour invalider tout le cache d'un provider.
 * Exemple : queryClient.invalidateQueries({ queryKey: aiProviderKey('gemini') })
 */
export const aiProviderKey = (provider: string) => ['ai', provider] as const;

/**
 * Retourne la clé pour invalider tout le cache IA.
 * Exemple : queryClient.invalidateQueries({ queryKey: allAIKey() })
 */
export const allAIKey = () => ['ai'] as const;
