/**
 * hooks/useGenerateLesson.ts — Génération de leçon IA avec cache React Query.
 *
 * Remplace le pattern manuel de génération de leçons dans useAppCoordinator /
 * useStudyContent. La leçon générée est mise en cache par (topic, provider) —
 * si l'utilisateur revient sur le même sujet dans la session, pas de re-génération.
 *
 * Usage :
 *   const { generateLesson, isGenerating, getCachedLesson } = useGenerateLesson();
 *
 *   const cached = getCachedLesson(topic, provider);
 *   if (cached) { handleLessonGenerated(cached); return; }
 *
 *   generateLesson({ config, tutorId }, {
 *     onSuccess: (lesson) => handleLessonGenerated(lesson),
 *   });
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lesson, AIGenerationConfig } from '../types';
import { generateLessonWithAI }       from '../services/aiLessonGenerator';
import { AI_QUERY_KEYS }              from './useAIQuery';

export interface GenerateLessonInput {
    config:   AIGenerationConfig;
    tutorId?: string;
}

export const useGenerateLesson = () => {
    const queryClient = useQueryClient();

    const { mutateAsync, isPending: isGenerating, error, reset } = useMutation<
        Lesson,
        Error,
        GenerateLessonInput
    >({
        mutationFn: ({ config, tutorId }) =>
            generateLessonWithAI(config, tutorId),

        onSuccess: (lesson, { config }) => {
            const key = AI_QUERY_KEYS.lesson(
                config.topic,
                config.provider ?? 'gemini',
                config.context?.slice(0, 30)
            );
            queryClient.setQueryData(key, lesson);
        },
    });

    const getCachedLesson = useCallback(
        (topic: string, provider = 'gemini', moduleCtx?: string): Lesson | undefined =>
            queryClient.getQueryData<Lesson>(
                AI_QUERY_KEYS.lesson(topic, provider, moduleCtx)
            ),
        [queryClient]
    );

    const clearLessonCache = useCallback(
        (topic?: string) => {
            if (topic) {
                queryClient.removeQueries({ queryKey: ['ai', 'lesson', topic] });
            } else {
                queryClient.removeQueries({ queryKey: ['ai', 'lesson'] });
            }
        },
        [queryClient]
    );

    const generateLesson = useCallback(
        (
            input: GenerateLessonInput,
            callbacks?: {
                onSuccess?: (lesson: Lesson) => void;
                onError?:   (err: Error) => void;
            }
        ) =>
            mutateAsync(input)
                .then((lesson) => { callbacks?.onSuccess?.(lesson); return lesson; })
                .catch((err: Error) => { callbacks?.onError?.(err); throw err; }),
        [mutateAsync]
    );

    return { generateLesson, isGenerating, error, reset, getCachedLesson, clearLessonCache };
};
