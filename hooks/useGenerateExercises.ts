/**
 * hooks/useGenerateExercises.ts — Génération d'exercices interactifs avec React Query.
 *
 * Les exercices sont liés à une leçon spécifique (lessonId) et peuvent être cachés.
 * Si l'utilisateur relance la génération sur la même leçon, le cache évite le re-appel IA.
 *
 * Architecture :
 *   - useMutation  : déclenché par l'utilisateur (bouton "Générer les exercices")
 *   - queryClient  : les exercices générés sont placés dans le cache sous la clé
 *                    AI_QUERY_KEYS.exercises(lessonId, provider)
 *   - getCachedExercises : lit depuis le cache sans refetch
 *
 * Usage :
 *   const { generate, isGenerating, getCachedExercises } = useGenerateExercises();
 *
 *   const cached = getCachedExercises(lesson.id, config.provider);
 *   if (cached) { handleExercisesReady(cached); return; }
 *
 *   generate({ lessonContent, lessonTopic, lessonId, provider, apiKey, modelName, apiUrl }, {
 *     onSuccess: (set) => handleExercisesReady(set),
 *   });
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExerciseSet, ExerciseType, AIProvider } from '../types';
import { generateExercisesFromLesson } from '../services/exerciseGenerationService';
import { AI_QUERY_KEYS } from './useAIQuery';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GenerateExercisesInput {
    lessonContent: string;
    lessonTopic:   string;
    lessonId:      string;
    count?:        number;
    types?:        ExerciseType[];
    difficulty?:   'easy' | 'medium' | 'hard';
    provider?:     AIProvider;
    apiKey?:       string;
    modelName?:    string;
    apiUrl?:       string;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useGenerateExercises = () => {
    const queryClient = useQueryClient();

    // ── Mutation ─────────────────────────────────────────────────────────────
    const { mutateAsync, isPending: isGenerating, error, reset } = useMutation<
        ExerciseSet,
        Error,
        GenerateExercisesInput
    >({
        mutationFn: (params) => generateExercisesFromLesson(params),

        onSuccess: (exerciseSet, { lessonId, provider = 'gemini' }) => {
            const key = AI_QUERY_KEYS.exercises(lessonId, provider);
            queryClient.setQueryData(key, exerciseSet);
        },
    });

    // ── Lecture du cache ─────────────────────────────────────────────────────
    const getCachedExercises = useCallback(
        (lessonId: string, provider = 'gemini'): ExerciseSet | undefined =>
            queryClient.getQueryData<ExerciseSet>(
                AI_QUERY_KEYS.exercises(lessonId, provider)
            ),
        [queryClient]
    );

    const clearExercisesCache = useCallback(
        (lessonId?: string) => {
            if (lessonId) {
                queryClient.removeQueries({ queryKey: ['ai', 'exercises', lessonId] });
            } else {
                queryClient.removeQueries({ queryKey: ['ai', 'exercises'] });
            }
        },
        [queryClient]
    );

    // ── API simplifiée ───────────────────────────────────────────────────────
    const generate = useCallback(
        (
            input: GenerateExercisesInput,
            callbacks?: {
                onSuccess?: (set: ExerciseSet) => void;
                onError?:   (err: Error) => void;
            }
        ) =>
            mutateAsync(input)
                .then((set) => { callbacks?.onSuccess?.(set); return set; })
                .catch((err: Error) => { callbacks?.onError?.(err); throw err; }),
        [mutateAsync]
    );

    return {
        generate,
        isGenerating,
        error,
        reset,
        getCachedExercises,
        clearExercisesCache,
    };
};
