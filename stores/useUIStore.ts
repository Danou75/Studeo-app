import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QuizConfig, Flashcard } from '../types';
import { ChatMessage } from '../services/conversationService';

/**
 * useUIStore — État UI global persisté (Zustand).
 *
 * Note : aiGenCache et vocabLabCache ont été supprimés (Phase C — Step 5).
 * Le cache des générations IA est désormais géré par React Query (useGenerateCards,
 * useGenerateLesson, useGenerateCurriculum).
 */
interface UIState {
    // Media & TTS Settings
    voiceEngine: QuizConfig['voiceEngine'];
    autoPlayAudio: boolean;
    
    // AI Modal State
    aiModalInitialTopic: string;
    aiModalInitialMode: "quiz" | "lesson" | "curriculum" | "mixed-quiz" | undefined;
    aiModalInitialContext: string | undefined;

    // SRS Preview State
    srsPreviewCards: Flashcard[];
    srsPreviewConfig: Omit<QuizConfig, "voiceEngine" | "autoPlayAudio" | "quizName"> | null;
    
    // Targeted lessons (Language Lab)
    targetedLessons: Record<string, ChatMessage[]>;

    // Vocab Lab Cache (conservé — structure diff de aiGenCache)
    vocabLabCache: Record<string, any>;

    // Video Lab State
    videoLabURL: string;
    videoLabAnalysis: { summary?: string; videoTitle?: string } | null;

    // Misc Flags
    isProgramCompleted: boolean;

    // Actions
    setVoiceEngine: (engine: QuizConfig['voiceEngine']) => void;
    setAutoPlayAudio: (autoPlay: boolean) => void;
    
    setAiModalInitialTopic: (topic: string) => void;
    setAiModalInitialMode: (mode: UIState['aiModalInitialMode']) => void;
    setAiModalInitialContext: (context: string | undefined) => void;

    setSrsPreviewCards: (cards: Flashcard[]) => void;
    setSrsPreviewConfig: (config: UIState['srsPreviewConfig']) => void;

    setTargetedLessons: (lessons: Record<string, ChatMessage[]> | ((prev: Record<string, ChatMessage[]>) => Record<string, ChatMessage[]>)) => void;
    setVocabLabCache: (cache: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;

    setVideoLabURL: (url: string) => void;
    setVideoLabAnalysis: (analysis: UIState['videoLabAnalysis']) => void;
    
    setIsProgramCompleted: (completed: boolean) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            voiceEngine: "local",
            autoPlayAudio: true,
            
            aiModalInitialTopic: "",
            aiModalInitialMode: undefined,
            aiModalInitialContext: undefined,

            srsPreviewCards: [],
            srsPreviewConfig: null,

            targetedLessons: {},
            vocabLabCache: {},

            videoLabURL: "",
            videoLabAnalysis: null,

            isProgramCompleted: false,

            setVoiceEngine: (voiceEngine) => set({ voiceEngine }),
            setAutoPlayAudio: (autoPlayAudio) => set({ autoPlayAudio }),

            setAiModalInitialTopic: (aiModalInitialTopic) => set({ aiModalInitialTopic }),
            setAiModalInitialMode: (aiModalInitialMode) => set({ aiModalInitialMode }),
            setAiModalInitialContext: (aiModalInitialContext) => set({ aiModalInitialContext }),

            setSrsPreviewCards: (srsPreviewCards) => set({ srsPreviewCards }),
            setSrsPreviewConfig: (srsPreviewConfig) => set({ srsPreviewConfig }),

            setTargetedLessons: (updater) => set((state) => ({ targetedLessons: typeof updater === 'function' ? updater(state.targetedLessons) : updater })),
            setVocabLabCache: (updater) => set((state) => ({ vocabLabCache: typeof updater === 'function' ? updater(state.vocabLabCache) : updater })),

            setVideoLabURL: (videoLabURL) => set({ videoLabURL }),
            setVideoLabAnalysis: (videoLabAnalysis) => set({ videoLabAnalysis }),

            setIsProgramCompleted: (isProgramCompleted) => set({ isProgramCompleted }),
        }),
        {
            name: 'studeo-ui-settings-storage',
            partialize: (state) => ({
                voiceEngine:      state.voiceEngine,
                autoPlayAudio:    state.autoPlayAudio,
                targetedLessons:  state.targetedLessons,
                videoLabURL:      state.videoLabURL,
                videoLabAnalysis: state.videoLabAnalysis,
            })
        }
    )
);
