/**
 * useConversationMode.ts — Orchestrateur du mode Causerie.
 *
 * Compose trois hooks spécialisés :
 *   useConvSession   → état, timer, rate-limit, weaknesses, session restore
 *   useConvChat      → opener, réponses, fin de causerie + résumé
 *   useConvRemedial  → génération/chat de la leçon remédiale
 *
 * Avant refactoring : 428 lignes monolithiques.
 * Après refactoring  : ~70 lignes d'orchestration + 3 fichiers spécialisés.
 */
import { useRef } from 'react';
import { Tutor, ConversationSession } from '../../../types';
import { ChatMessage } from '../../../services/conversationService';

import { useConvSession }  from './useConvSession';
import { useConvChat }     from './useConvChat';
import { useConvRemedial } from './useConvRemedial';

export const useConversationMode = (
    tutor: Tutor | null,
    config: any,
    activeLang: string,
    speak: (text: string) => void,
    resetTranscript: () => void,
    setDraftMessage: (msg: string) => void,
    setTextInput: (msg: string) => void,
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
    t: (key: string) => string,
    setLabMode: (mode: any) => void,
    setIsProcessing: (b: boolean) => void,
    targetedLessonsProps: Record<string, ChatMessage[]> | undefined,
    onSetTargetedLessonsProps: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>> | undefined,
    onClearAiGenCache: (() => void) | undefined,
    onUpdateSession: ((session: ConversationSession | undefined) => void) | undefined,
    initialSession: ConversationSession | undefined,
    labMode: string
) => {
    // Forward-ref so useConvSession can call handleEndConversation without circular deps
    const handleEndConversationRef = useRef<() => void>(() => {});

    // ── Session state ────────────────────────────────────────────────────────
    const session = useConvSession(
        activeLang, labMode, setLabMode, showToast,
        initialSession, handleEndConversationRef
    );

    // ── Remedial lesson ──────────────────────────────────────────────────────
    const remedial = useConvRemedial({
        tutor, config, activeLang,
        convThemeLabel: session.convThemeLabel,
        convSummary: session.convSummary,
        userWeaknesses: session.userWeaknesses,
        showToast,
        targetedLessonsProps,
        onSetTargetedLessonsProps,
    });

    // ── Chat handlers ────────────────────────────────────────────────────────
    const chat = useConvChat({
        tutor, config, activeLang, speak, resetTranscript,
        setDraftMessage, setTextInput, showToast, t,
        setLabMode, setIsProcessing, onClearAiGenCache, onUpdateSession,

        // Session state + setters needed by chat
        convTheme:            session.convTheme,
        convThemeLabel:       session.convThemeLabel,
        convMessages:         session.convMessages,
        convTimerMinutes:     session.convTimerMinutes,
        userWeaknesses:       session.userWeaknesses,
        remedialMessages:     remedial.remedialMessages,
        convRateLimitSeconds: session.convRateLimitSeconds,

        setConvTheme:           session.setConvTheme,
        setConvThemeLabel:      session.setConvThemeLabel,
        setConvMessages:        session.setConvMessages,
        setConvSummary:         session.setConvSummary,
        setIsGeneratingOpener:  session.setIsGeneratingOpener,
        setIsGeneratingSummary: session.setIsGeneratingSummary,
        setConvTimeLeft:        session.setConvTimeLeft,
        setIsConvTimerRunning:  session.setIsConvTimerRunning,
        setConvRateLimitSeconds:session.setConvRateLimitSeconds,
        setUserWeaknesses:      session.setUserWeaknesses,
        setShowRemedialModal:   remedial.setShowRemedialModal,
        setRemedialMessages:    remedial.setRemedialMessages,
        setTargetedLessons:     remedial.setTargetedLessons,
        setActiveTargetedKey:   remedial.setActiveTargetedKey,
    });

    // Patch the forward-ref once chat is ready
    handleEndConversationRef.current = chat.handleEndConversation;

    // ── Public API (identical to original hook) ──────────────────────────────
    return {
        ...session,
        ...remedial,
        startConversation:         chat.startConversation,
        handleSendConvMessage:     chat.handleSendConvMessage,
        handleEndConversation:     chat.handleEndConversation,
        handleGenerateLesson:      remedial.handleGenerateLesson,
        handleStartTargetedLesson: remedial.handleStartTargetedLesson,
        handleSendRemedialMessage: remedial.handleSendRemedialMessage,
    };
};
