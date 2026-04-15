/**
 * hooks/useGenerateCurriculum.ts — Génération de curriculum IA avec cache React Query.
 *
 * Le curriculum est la partie la plus coûteuse en tokens (~30s de génération).
 * Le cacher est donc particulièrement précieux : si l'utilisateur quitte et revient
 * sur le même sujet dans la session, la génération n'est pas relancée.
 *
 * Usage :
 *   const { generateCurriculum, isGenerating, getCachedCurriculum } = useGenerateCurriculum();
 *
 *   generateCurriculum({ config, tutorId }, {
 *     onSuccess: (program) => handleCurriculumGenerated(program),
 *   });
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StudyProgram, AIGenerationConfig, Tutor } from '../types';
import { generateStudyProgram }            from '../services/curriculumService';
import { AI_QUERY_KEYS }                   from './useAIQuery';

export interface GenerateCurriculumInput {
    tutor:    Tutor;
    topic:    string;
    level:    string;
    config:   AIGenerationConfig;
}

export const useGenerateCurriculum = () => {
    const queryClient = useQueryClient();

    // ── Mutation (déclenché par l'utilisateur) ───────────────────────────────
    const { mutateAsync, isPending: isGenerating, error, reset } = useMutation<
        StudyProgram,
        Error,
        GenerateCurriculumInput
    >({
        mutationFn: ({ tutor, topic, level, config }) =>
            generateStudyProgram(
                tutor,
                topic,
                level,
                config.provider ?? 'gemini',
                config.apiKey,
                config.modelName,
                config.apiUrl,
                config.media
            ),

        onSuccess: (program, { config }) => {
            const key = AI_QUERY_KEYS.curriculum(
                config.topic,
                config.provider ?? 'gemini',
                config.targetLang ?? 'fr'
            );
            queryClient.setQueryData(key, program);
        },
    });

    // ── Lecture du cache ─────────────────────────────────────────────────────
    const getCachedCurriculum = useCallback(
        (topic: string, provider = 'gemini', lang = 'fr'): StudyProgram | undefined =>
            queryClient.getQueryData<StudyProgram>(
                AI_QUERY_KEYS.curriculum(topic, provider, lang)
            ),
        [queryClient]
    );

    const clearCurriculumCache = useCallback(
        (topic?: string) => {
            if (topic) {
                queryClient.removeQueries({ queryKey: ['ai', 'curriculum', topic] });
            } else {
                queryClient.removeQueries({ queryKey: ['ai', 'curriculum'] });
            }
        },
        [queryClient]
    );

    // ── API simplifiée ───────────────────────────────────────────────────────
    const generateCurriculum = useCallback(
        (
            input: GenerateCurriculumInput,
            callbacks?: {
                onSuccess?: (program: StudyProgram) => void;
                onError?:   (err: Error) => void;
            }
        ) =>
            mutateAsync(input)
                .then((p) => { callbacks?.onSuccess?.(p); return p; })
                .catch((err: Error) => { callbacks?.onError?.(err); throw err; }),
        [mutateAsync]
    );

    return {
        generateCurriculum,
        isGenerating,
        error,
        reset,
        getCachedCurriculum,
        clearCurriculumCache,
    };
};
