/**
 * hooks/useGenerateCards.ts — Génération de flashcards IA avec cache React Query.
 *
 * Remplace le pattern manuel aiGenCache dans useAppCoordinator :
 *   - handleLaunchAIVocabQuiz vérifie aiGenCache[topic]  → getCachedCards(topic)
 *   - handleAICardsGenerated écrit dans aiGenCache        → setCachedCards(topic, cards)
 *
 * Architecture :
 *   - useMutation  : déclenché par l'utilisateur (bouton "Générer") → pas de cache auto
 *   - queryClient  : les cartes générées sont placées dans le cache React Query
 *                    sous la clé AI_QUERY_KEYS.cards(topic, provider, lang)
 *   - getCachedCards : lit depuis le cache React Query sans refetch
 *
 * Usage :
 *   const { generate, isGenerating, getCachedCards } = useGenerateCards();
 *
 *   // Vérifier le cache avant de générer
 *   const cached = getCachedCards(topic);
 *   if (cached) { handleAICardsGenerated(cached); return; }
 *
 *   // Générer et placer dans le cache
 *   generate({ config, tutorId }, {
 *     onSuccess: (cards) => handleAICardsGenerated(cards),
 *   });
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Flashcard, AIGenerationConfig } from '../types';
import { generateFlashcardsWithAI }      from '../services/aiCardGenerator';
import { AI_QUERY_KEYS }                 from './useAIQuery';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GenerateCardsInput {
    config:   AIGenerationConfig;
    tutorId?: string;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useGenerateCards = () => {
    const queryClient = useQueryClient();

    // ── Génération (mutation) ────────────────────────────────────────────────
    const { mutateAsync, isPending: isGenerating, error, reset } = useMutation<
        Flashcard[],
        Error,
        GenerateCardsInput
    >({
        mutationFn: ({ config, tutorId }) =>
            generateFlashcardsWithAI(config, tutorId),

        onSuccess: (cards, { config }) => {
            // On place dans le cache React Query pour lecture ultérieure
            const key = AI_QUERY_KEYS.cards(
                config.topic,
                config.provider ?? 'gemini',
                config.sourceLang
            );
            queryClient.setQueryData(key, cards);
        },
    });

    // ── Lecture du cache ─────────────────────────────────────────────────────
    /**
     * Vérifie si des cartes existent déjà dans le cache React Query pour ce topic.
     * Retourne les cartes ou undefined.
     */
    const getCachedCards = useCallback(
        (topic: string, provider = 'gemini', lang = 'fr'): Flashcard[] | undefined => {
            const key = AI_QUERY_KEYS.cards(topic, provider, lang);
            return queryClient.getQueryData<Flashcard[]>(key);
        },
        [queryClient]
    );

    // ── Suppression du cache (ex: bouton "Réinitialiser") ────────────────────
    const clearCardCache = useCallback(
        (topic?: string, provider = 'gemini', lang = 'fr') => {
            if (topic) {
                queryClient.removeQueries({
                    queryKey: AI_QUERY_KEYS.cards(topic, provider, lang),
                });
            } else {
                // Vider tout le cache de cartes IA
                queryClient.removeQueries({ queryKey: ['ai', 'cards'] });
            }
        },
        [queryClient]
    );

    // ── API simplifiée ───────────────────────────────────────────────────────
    const generate = useCallback(
        (
            input: GenerateCardsInput,
            callbacks?: {
                onSuccess?: (cards: Flashcard[]) => void;
                onError?:   (err: Error) => void;
            }
        ) =>
            mutateAsync(input)
                .then((cards) => {
                    callbacks?.onSuccess?.(cards);
                    return cards;
                })
                .catch((err: Error) => {
                    callbacks?.onError?.(err);
                    throw err;
                }),
        [mutateAsync]
    );

    return {
        generate,
        isGenerating,
        error,
        reset,
        getCachedCards,
        clearCardCache,
    };
};
