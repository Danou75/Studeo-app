/**
 * useConvChat.ts — Logique du chat de causerie.
 *
 * Responsabilités :
 *  - Démarrage de la causerie (opener IA)
 *  - Envoi de messages (labResponse)
 *  - Fin de causerie + génération du résumé
 *  - Persistence des faiblesses dans localStorage
 */
import { v4 as uuidv4 } from 'uuid';
import {
    ChatMessage,
    ConversationSummary,
    generateConversationalOpener,
    generateLabResponse,
    generateConversationSummary,
} from '../../../services/conversationService';
import { Tutor, ConversationSession } from '../../../types';

export interface UseConvChatParams {
    tutor:              Tutor | null;
    config:             any;
    activeLang:         string;
    speak:              (text: string) => void;
    resetTranscript:    () => void;
    setDraftMessage:    (msg: string) => void;
    setTextInput:       (msg: string) => void;
    showToast:          (msg: string, type: 'success' | 'error' | 'info') => void;
    t:                  (key: string) => string;
    setLabMode:         (mode: any) => void;
    setIsProcessing:    (b: boolean) => void;
    onClearAiGenCache?: () => void;
    onUpdateSession?:   (session: ConversationSession | undefined) => void;

    // Refs from useConvSession
    convTheme:          string;
    convThemeLabel:     string;
    convMessages:       ChatMessage[];
    convTimerMinutes:   number;
    userWeaknesses:     string[];
    remedialMessages:   ChatMessage[];
    convRateLimitSeconds: number;

    // Setters from useConvSession
    setConvTheme:           (v: string) => void;
    setConvThemeLabel:      (v: string) => void;
    setConvMessages:        React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setConvSummary:         (s: ConversationSummary | null) => void;
    setIsGeneratingOpener:  (b: boolean) => void;
    setIsGeneratingSummary: (b: boolean) => void;
    setConvTimeLeft:        (n: number) => void;
    setIsConvTimerRunning:  (b: boolean) => void;
    setConvRateLimitSeconds:(n: number) => void;
    setUserWeaknesses:      (w: string[]) => void;
    setShowRemedialModal:   (b: boolean) => void;
    setRemedialMessages:    React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    setTargetedLessons:     React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
    setActiveTargetedKey:   (k: string | null) => void;
}

export const useConvChat = (p: UseConvChatParams) => {
    const startConversation = async (theme: string, themeLabel: string) => {
        if (!p.tutor || p.convRateLimitSeconds > 0) return;
        p.setConvTheme(theme);
        p.setConvThemeLabel(themeLabel);
        p.setConvMessages([]);
        p.setConvSummary(null);
        p.setRemedialMessages([]);
        p.setTargetedLessons({});
        p.setActiveTargetedKey(null);
        if (p.onClearAiGenCache) p.onClearAiGenCache();
        if (p.onUpdateSession) p.onUpdateSession(undefined);
        p.setShowRemedialModal(false);
        p.setLabMode('conversation_active');

        if (p.convTimerMinutes > 0) {
            p.setConvTimeLeft(p.convTimerMinutes * 60);
            p.setIsConvTimerRunning(true);
        } else {
            p.setIsConvTimerRunning(false);
            p.setConvTimeLeft(0);
        }

        p.setIsGeneratingOpener(true);
        try {
            const opener = await generateConversationalOpener(p.tutor, theme, p.config, p.activeLang, p.userWeaknesses);
            p.setConvMessages([{ role: 'assistant', content: opener }]);
            p.speak(opener.split('|||')[0].replace(/\[.*?\]/g, '').trim());
        } catch (e) {
            console.error('Error generating opener', e);
            const errMsg = e instanceof Error ? e.message : String(e);
            const is429  = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
            if (is429) {
                const retryMatch = errMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
                const retrySecs  = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 35;
                p.setConvRateLimitSeconds(retrySecs);
                p.showToast(`Quota API atteint — réessaie dans ${retrySecs}s`, 'error');
            } else {
                p.showToast(p.t('common.error'), 'error');
            }
            p.setLabMode('conversation_select');
        } finally {
            p.setIsGeneratingOpener(false);
        }
    };

    const handleSendConvMessage = async (text: string) => {
        if (!text.trim() || !p.tutor) return;
        p.setConvMessages(prev => [...prev, { role: 'user', content: text }]);
        p.setIsProcessing(true);
        p.setTextInput('');
        p.setDraftMessage('');
        p.resetTranscript();
        try {
            const responseText = await generateLabResponse(
                p.tutor, p.convMessages, text, p.config,
                { enableCorrection: true, activeLanguage: p.activeLang, conversationTheme: p.convTheme, userWeaknesses: p.userWeaknesses }
            );
            p.setConvMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
            p.speak(responseText.split('|||')[0].replace(/\[.*?\]/g, '').trim());
        } catch (error) {
            console.error(error);
            p.setConvMessages(prev => [...prev, { role: 'system', content: p.t('lab.chat.errorConnection') }]);
        } finally {
            p.setIsProcessing(false);
        }
    };

    const handleEndConversation = async () => {
        if (p.convMessages.length < 2) { p.setLabMode('conversation_select'); return; }
        p.setIsGeneratingSummary(true);
        p.setLabMode('conversation_summary');
        const buildSessionPayload = (summary: any) => ({
            id: uuidv4(),
            tutorId: p.tutor?.id || 'unknown',
            tutorName: p.tutor?.name || 'Tuteur',
            language: p.activeLang,
            theme: p.convThemeLabel || p.convTheme || 'Causerie',
            messages: p.convMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            summary,
            remedialMessages: p.remedialMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
        });
        try {
            const summary = await generateConversationSummary(p.convMessages, p.activeLang, p.config);
            p.setConvSummary(summary);
            if (summary.error_patterns?.length) {
                const newWeaknesses = summary.error_patterns.slice(0, 3);
                p.setUserWeaknesses(newWeaknesses);
                try { localStorage.setItem(`studeo_weaknesses_${p.activeLang}`, JSON.stringify(newWeaknesses)); } catch (_) {}
            }
            if (p.onUpdateSession) p.onUpdateSession(buildSessionPayload(summary));
        } catch (e) {
            console.error('Error generating summary', e);
            const emptySummary = { errors: [], vocabulary: [], fluency_score: 0, strong_points: [], next_theme_suggestion: '', error_patterns: [], lesson_suggestions: [] };
            p.setConvSummary(emptySummary);
            if (p.onUpdateSession) p.onUpdateSession(buildSessionPayload(emptySummary));
        } finally {
            p.setIsGeneratingSummary(false);
        }
    };

    return { startConversation, handleSendConvMessage, handleEndConversation };
};
