/**
 * ConversationModeView.tsx — Routeur du mode Causerie.
 *
 * Ce composant dispatche vers les trois sous-vues selon `labMode` :
 *   conversation_select  → ConversationSetupView
 *   conversation_active  → ConversationActiveView
 *   conversation_summary → ConversationSummaryView (inclut RemedialLessonModal)
 *
 * Avant refactoring : 717 lignes monolithiques.
 * Après refactoring  : ~90 lignes de routeur + 4 fichiers spécialisés.
 */
import React from 'react';
import { ChatMessage, ConversationSummary } from '../../services/conversationService';
import { Tutor, ConversationSession } from '../../types';

import { ConversationSetupView }   from './ConversationSetupView';
import { ConversationActiveView }  from './ConversationActiveView';
import { ConversationSummaryView } from './ConversationSummaryView';

// ── Props (identiques à l'ancien ConversationModeView) ──────────────────────

export interface ConversationModeViewProps {
    labMode:                    string;
    tutor:                      Tutor | null;
    activeLang:                 string;
    speak:                      (text: string) => void;
    handlePinMessage:           (msg: any) => void;
    startScenario:              (themePrompt: string) => void;
    setLabMode:                 (mode: any) => void;
    onLaunchAIGenerator?:       (topic: string, mode?: 'quiz' | 'lesson' | 'curriculum' | 'mixed-quiz', context?: string) => void;
    onSaveConvSession?:         (session: ConversationSession) => void;
    showToast:                  (msg: string, type: 'success' | 'error' | 'info') => void;
    handleExport:               (format: 'md' | 'rtf') => void;

    // From useConversationMode
    convTheme:                  string;
    convThemeLabel:             string;
    convMessages:               ChatMessage[];
    convSummary:                ConversationSummary | null;
    isGeneratingOpener:         boolean;
    isGeneratingSummary:        boolean;
    showCustomConvModal:        boolean;
    setShowCustomConvModal:     (b: boolean) => void;
    customConvTopic:            string;
    setCustomConvTopic:         (v: string) => void;
    convMessagesEndRef:         React.RefObject<HTMLDivElement>;
    convRateLimitSeconds:       number;
    convTimerMinutes:           number;
    setConvTimerMinutes:        (v: number) => void;
    convTimeLeft:               number;
    userWeaknesses:             string[];
    isGeneratingLesson:         boolean;
    showRemedialModal:          boolean;
    setShowRemedialModal:       (b: boolean) => void;
    remedialMessages:           ChatMessage[];
    setRemedialMessages:        (msgs: ChatMessage[]) => void;
    remedialKey:                number;
    remedialDraft:              string;
    setRemedialDraft:           (v: string) => void;
    isSendingRemedial:          boolean;
    startConversation:          (theme: string, themeLabel: string) => void;
    handleSendConvMessage:      (text: string) => void;
    handleEndConversation:      () => void;
    handleGenerateLesson:       () => void;
    handleStartTargetedLesson:  (prompt: string, key: string) => void;
    handleSendRemedialMessage:  () => void;

    // UI
    draftMessage:               string;
    setDraftMessage:            (msg: string) => void;
    listeningStatus:            string;
    startListening:             () => void;
    stopListening:              () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export const ConversationModeView: React.FC<ConversationModeViewProps> = (props) => {
    const { labMode } = props;

    if (labMode !== 'conversation_select' && labMode !== 'conversation_active' && labMode !== 'conversation_summary') {
        return null;
    }

    if (labMode === 'conversation_select') {
        return (
            <ConversationSetupView
                userWeaknesses={props.userWeaknesses}
                convRateLimitSeconds={props.convRateLimitSeconds}
                convTimerMinutes={props.convTimerMinutes}
                setConvTimerMinutes={props.setConvTimerMinutes}
                startConversation={props.startConversation}
                showCustomConvModal={props.showCustomConvModal}
                setShowCustomConvModal={props.setShowCustomConvModal}
                customConvTopic={props.customConvTopic}
                setCustomConvTopic={props.setCustomConvTopic}
            />
        );
    }

    if (labMode === 'conversation_active') {
        return (
            <ConversationActiveView
                convThemeLabel={props.convThemeLabel}
                convTimerMinutes={props.convTimerMinutes}
                convTimeLeft={props.convTimeLeft}
                isGeneratingOpener={props.isGeneratingOpener}
                convMessages={props.convMessages}
                draftMessage={props.draftMessage}
                setDraftMessage={props.setDraftMessage}
                listeningStatus={props.listeningStatus}
                convMessagesEndRef={props.convMessagesEndRef}
                speak={props.speak}
                handlePinMessage={props.handlePinMessage}
                handleSendConvMessage={props.handleSendConvMessage}
                handleEndConversation={props.handleEndConversation}
                startListening={props.startListening}
                stopListening={props.stopListening}
            />
        );
    }

    // conversation_summary
    return (
        <ConversationSummaryView
            tutor={props.tutor}
            activeLang={props.activeLang}
            convTheme={props.convTheme}
            convThemeLabel={props.convThemeLabel}
            convMessages={props.convMessages}
            convSummary={props.convSummary}
            isGeneratingSummary={props.isGeneratingSummary}
            isGeneratingLesson={props.isGeneratingLesson}
            remedialMessages={props.remedialMessages}
            setRemedialMessages={props.setRemedialMessages}
            remedialKey={props.remedialKey}
            remedialDraft={props.remedialDraft}
            setRemedialDraft={props.setRemedialDraft}
            isSendingRemedial={props.isSendingRemedial}
            showRemedialModal={props.showRemedialModal}
            setShowRemedialModal={props.setShowRemedialModal}
            onSaveConvSession={props.onSaveConvSession}
            onLaunchAIGenerator={props.onLaunchAIGenerator}
            showToast={props.showToast}
            handleExport={props.handleExport}
            handleGenerateLesson={props.handleGenerateLesson}
            handleEndConversation={props.handleEndConversation}
            handleStartTargetedLesson={props.handleStartTargetedLesson}
            handleSendRemedialMessage={props.handleSendRemedialMessage}
            startConversation={props.startConversation}
            startScenario={props.startScenario}
            setLabMode={props.setLabMode}
        />
    );
};
