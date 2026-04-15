/**
 * useConvRemedial.ts — Génération et chat de la leçon remediale.
 *
 * Responsabilités :
 *  - Génération de la leçon de consolidation principale (handleGenerateLesson)
 *  - Génération de leçons ciblées (handleStartTargetedLesson)
 *  - Chat continu dans la leçon remédiale (handleSendRemedialMessage)
 */
import { useState } from 'react';
import {
    ChatMessage,
    ConversationSummary,
    generateRemedialLesson,
    generateRemedialChatReply,
    executeAIRequest,
    resolveConfig,
} from '../../../services/conversationService';
import { Tutor } from '../../../types';

export interface UseConvRemedialParams {
    tutor:              Tutor | null;
    config:             any;
    activeLang:         string;
    convThemeLabel:     string;
    convSummary:        ConversationSummary | null;
    userWeaknesses:     string[];
    showToast:          (msg: string, type: 'success' | 'error' | 'info') => void;
    targetedLessonsProps: Record<string, ChatMessage[]> | undefined;
    onSetTargetedLessonsProps: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>> | undefined;
}

export const useConvRemedial = (p: UseConvRemedialParams) => {
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    const [showRemedialModal,  setShowRemedialModal]  = useState(false);
    const [remedialMessages,   setRemedialMessages]   = useState<ChatMessage[]>([]);
    const [activeTargetedKey,  setActiveTargetedKey]  = useState<string | null>(null);
    const [remedialKey,        setRemedialKey]        = useState(0);
    const [remedialDraft,      setRemedialDraft]      = useState('');
    const [isSendingRemedial,  setIsSendingRemedial]  = useState(false);

    const targetedLessons = p.targetedLessonsProps || {};
    const setTargetedLessons: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>> = (val) => {
        if (p.onSetTargetedLessonsProps) p.onSetTargetedLessonsProps(val);
    };

    const scrollToEnd = (delay = 0) => {
        setTimeout(() => {
            document.getElementById('remedial-box-end')?.scrollIntoView({ behavior: 'smooth' });
        }, delay);
    };

    // ── Main lesson (errors + vocabulary) ───────────────────────────────────
    const handleGenerateLesson = async () => {
        if (!p.tutor || !p.convSummary) return;
        const key = 'dynamic_main';
        if (targetedLessons[key]) {
            setActiveTargetedKey(key);
            setRemedialMessages(targetedLessons[key]);
            setShowRemedialModal(true);
            return;
        }
        setIsGeneratingLesson(true);
        setActiveTargetedKey(key);
        setRemedialMessages([]);
        try {
            const lessonText = await generateRemedialLesson(
                p.tutor, p.convThemeLabel,
                p.convSummary.errors, p.convSummary.vocabulary,
                p.userWeaknesses, p.activeLang, p.config
            );
            const newMsgs: ChatMessage[] = [{ role: 'assistant', content: lessonText }];
            setRemedialMessages(newMsgs);
            setTargetedLessons(prev => ({ ...prev, [key]: newMsgs }));
            setRemedialKey(k => k + 1);
            setTimeout(() => { setShowRemedialModal(true); scrollToEnd(300); }, 0);
        } catch (e) {
            console.error('Failed to generate lesson:', e);
            p.showToast('Erreur lors de la génération de la leçon.', 'error');
        } finally {
            setIsGeneratingLesson(false);
        }
    };

    // ── Targeted lesson (vocabulary / grammar / scenario) ───────────────────
    const handleStartTargetedLesson = async (prompt: string, key: string) => {
        if (!p.tutor) return;
        if (targetedLessons[key]) {
            setActiveTargetedKey(key);
            setRemedialMessages(targetedLessons[key]);
            setShowRemedialModal(true);
            return;
        }
        setIsGeneratingLesson(true);
        setActiveTargetedKey(key);
        setRemedialMessages([]);
        setShowRemedialModal(true);
        try {
            const sysPrompt = `Tu es ${p.tutor.name}, un professeur de langue interactif. L'élève te demande un exercice ou une leçon très spécifique (quiz, vocabulaire, règle...).
Réponds directement avec la leçon ou l'exercice demandé, formaté en Markdown clair. Rends cela interactif, n'en dis pas trop d'un coup.

TRÈS IMPORTANT:
Si la demande de l'élève nécessite ou implique des exercices (comme un quiz, des phrases à trous, des traductions...), TU DOIS OBLIGATOIREMENT AJOUTER à la fin de ta réponse un bloc JSON contenant ces exercices, avec ce format strict :
\`\`\`json
{
  "exercises": [
    { "type": "quiz", "question": "Question QCM ?", "options": ["A", "B", "C", "D"], "answer": "La bonne réponse exacte" },
    { "type": "translation", "sentence": "Phrase à traduire vers ${p.activeLang}", "targetLanguage": "${p.activeLang}", "answer": "Traduction correcte" },
    { "type": "fill-in", "sentence": "Phrase ____ à compléter", "answer": "mot" }
  ]
}
\`\`\`
Ne mets de JSON que s'il y a des "exercices" dans ta réponse. Sinon, réponds juste en texte normal en Markdown.
NE METS PAS l'intégralité de ta réponse dans un bloc de code.`;

            const { apiKey, modelName, apiUrl } = resolveConfig(p.config);
            const responseText = await executeAIRequest(
                [{ role: 'system', content: sysPrompt }, { role: 'user', content: prompt }],
                p.config.provider, apiKey, modelName, apiUrl
            );
            const newMsgs: ChatMessage[] = [{ role: 'assistant', content: responseText }];
            setRemedialMessages(newMsgs);
            setTargetedLessons(prev => ({ ...prev, [key]: newMsgs }));
            setRemedialKey(k => k + 1);
            scrollToEnd(300);
        } catch (e) {
            console.error('Failed to generate targeted lesson:', e);
            p.showToast('Erreur lors de la génération ciblée.', 'error');
            setShowRemedialModal(false);
            setActiveTargetedKey(null);
        } finally {
            setIsGeneratingLesson(false);
        }
    };

    // ── Remedial chat reply ──────────────────────────────────────────────────
    const handleSendRemedialMessage = async () => {
        if (!remedialDraft.trim() || !p.tutor) return;
        const newHistory: ChatMessage[] = [...remedialMessages, { role: 'user', content: remedialDraft.trim() }];
        setRemedialMessages(newHistory);
        if (activeTargetedKey) setTargetedLessons(prev => ({ ...prev, [activeTargetedKey]: newHistory }));
        setRemedialDraft('');
        setIsSendingRemedial(true);
        scrollToEnd(100);
        try {
            const reply = await generateRemedialChatReply(p.tutor, p.activeLang, newHistory, p.config);
            const fullHistory: ChatMessage[] = [...newHistory, { role: 'assistant', content: reply }];
            setRemedialMessages(fullHistory);
            if (activeTargetedKey) setTargetedLessons(prev => ({ ...prev, [activeTargetedKey]: fullHistory }));
            setRemedialKey(k => k + 1);
        } catch (e) {
            console.error('Error sending remedial chat', e);
            p.showToast('Erreur de connexion', 'error');
        } finally {
            setIsSendingRemedial(false);
            scrollToEnd(300);
        }
    };

    return {
        isGeneratingLesson,
        showRemedialModal,  setShowRemedialModal,
        remedialMessages,   setRemedialMessages,
        activeTargetedKey,  setActiveTargetedKey,
        remedialKey,
        remedialDraft,      setRemedialDraft,
        isSendingRemedial,
        setTargetedLessons,
        handleGenerateLesson,
        handleStartTargetedLesson,
        handleSendRemedialMessage,
    };
};
