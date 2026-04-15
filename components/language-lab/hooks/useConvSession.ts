/**
 * useConvSession.ts — État de session de causerie.
 *
 * Responsabilités :
 *  - État UIX (thème, messages, résumé, modal custom)
 *  - Chargement des faiblesses depuis localStorage
 *  - Countdown timer de session
 *  - Countdown rate-limit API
 *  - Restauration d'une session initiale
 */
import { useState, useRef, useEffect } from 'react';
import { ChatMessage, ConversationSummary } from '../../../services/conversationService';

export const useConvSession = (
    activeLang: string,
    labMode: string,
    setLabMode: (mode: any) => void,
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
    initialSession: { id?: string; theme: string; messages: { role: string; content: string }[]; summary?: any; remedialMessages?: { role: string; content: string }[] } | undefined,
    handleEndConversationRef: React.MutableRefObject<() => void>,
) => {
    const [convTheme,          setConvTheme]          = useState<string>('');
    const [convThemeLabel,     setConvThemeLabel]     = useState<string>('');
    const [convMessages,       setConvMessages]       = useState<ChatMessage[]>([]);
    const [convSummary,        setConvSummary]        = useState<ConversationSummary | null>(null);
    const [isGeneratingOpener, setIsGeneratingOpener] = useState(false);
    const [isGeneratingSummary,setIsGeneratingSummary]= useState(false);
    const [showCustomConvModal,setShowCustomConvModal]= useState(false);
    const [customConvTopic,    setCustomConvTopic]    = useState('');
    const convMessagesEndRef                           = useRef<HTMLDivElement>(null);
    const [convRateLimitSeconds, setConvRateLimitSeconds] = useState(0);
    const [convTimerMinutes,   setConvTimerMinutes]   = useState<number>(0);
    const [convTimeLeft,       setConvTimeLeft]       = useState<number>(0);
    const [isConvTimerRunning, setIsConvTimerRunning] = useState(false);
    const [userWeaknesses,     setUserWeaknesses]     = useState<string[]>([]);

    // ── Load weaknesses from localStorage ───────────────────────────────────
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`studeo_weaknesses_${activeLang}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setUserWeaknesses(parsed);
            } else {
                setUserWeaknesses([]);
            }
        } catch (e) { console.error('Error loading weaknesses', e); }
    }, [activeLang]);

    // ── Session timer ────────────────────────────────────────────────────────
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isConvTimerRunning && convTimeLeft > 0 && labMode === 'conversation_active') {
            interval = setInterval(() => {
                setConvTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsConvTimerRunning(false);
                        handleEndConversationRef.current();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isConvTimerRunning, convTimeLeft, labMode]);

    // ── Rate-limit countdown ─────────────────────────────────────────────────
    useEffect(() => {
        if (convRateLimitSeconds <= 0) return;
        const timer = setTimeout(() => setConvRateLimitSeconds(s => Math.max(0, s - 1)), 1000);
        return () => clearTimeout(timer);
    }, [convRateLimitSeconds]);

    // ── Auto-scroll on new messages ──────────────────────────────────────────
    useEffect(() => {
        if (labMode === 'conversation_active') {
            convMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [convMessages, labMode]);

    // ── Restore initial session ──────────────────────────────────────────────
    useEffect(() => {
        if (!initialSession) return;
        const restoredMsgs = initialSession.messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
        }));
        setConvMessages(restoredMsgs);
        setConvThemeLabel(initialSession.theme);
        setConvTheme(initialSession.theme);
        if (initialSession.summary) setConvSummary(initialSession.summary as any);
        setLabMode('conversation_summary');
        showToast(`Causerie "${initialSession.theme}" restaurée !`, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSession?.id]);

    return {
        convTheme,          setConvTheme,
        convThemeLabel,     setConvThemeLabel,
        convMessages,       setConvMessages,
        convSummary,        setConvSummary,
        isGeneratingOpener, setIsGeneratingOpener,
        isGeneratingSummary,setIsGeneratingSummary,
        showCustomConvModal,setShowCustomConvModal,
        customConvTopic,    setCustomConvTopic,
        convMessagesEndRef,
        convRateLimitSeconds, setConvRateLimitSeconds,
        convTimerMinutes,   setConvTimerMinutes,
        convTimeLeft,       setConvTimeLeft,
        isConvTimerRunning, setIsConvTimerRunning,
        userWeaknesses,     setUserWeaknesses,
    };
};
