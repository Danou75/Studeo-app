import { useState, useEffect, useRef, useCallback } from 'react';
import { executeAIRequest, resolveConfig, ChatMessage } from '../../../services/conversationService';
import { useShadowingRecorder } from './useShadowingRecorder';
import { useToast } from '../../../contexts/ToastContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShadowingPhrase {
    id: string;
    text: string;
    translation: string;
    phonetic?: string;
    priority: boolean;
    isRepetition?: boolean;
}

export interface ShadowingSession {
    theme: string;
    targetLanguage: string;
    level: 'débutant' | 'intermédiaire' | 'avancé';
    phrases: ShadowingPhrase[];
}

/** Phases séquentielles : listen → guided → blind */
export type ShadowingPhase = 'listen' | 'guided' | 'blind';
/** Signal de transition entre phases */
export type PhaseTransition = 'to-guided' | 'to-blind' | null;
export type SessionDuration = 10 | 15 | 20;

const DURATION_TO_PHRASE_COUNT: Record<SessionDuration, number> = { 10: 12, 15: 18, 20: 24 };
const DURATION_TO_BASE_PHRASES: Record<SessionDuration, number> = { 10: 8, 15: 12, 20: 16 };

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

const buildSystemPrompt = (targetLang: string) => `
Tu es un expert en linguistique appliquée et en techniques de shadowing pour l'apprentissage des langues.
Langue cible : ${targetLang}.

RÔLE : Générer des expressions optimisées pour l'entraînement au shadowing — prosodie, rythme et intonation naturels.

RÈGLES :
1. Retourne UNIQUEMENT un objet JSON valide, sans markdown ni texte autour.
2. Phrases naturelles de locuteur natif, style oral (contractions, liaisons).
3. Varie les structures : affirmations, questions, exclamations, négations.
4. Marque "priority": true pour les 3–4 expressions les plus fréquentes et pédagogiques (méritant répétition).
5. "phonetic" optionnel mais bienvenu pour les sons complexes.

FORMAT JSON STRICT :
{
  "theme": "...",
  "targetLanguage": "${targetLang}",
  "level": "débutant|intermédiaire|avancé",
  "phrases": [
    {
      "text": "Phrase naturelle en ${targetLang}",
      "translation": "Traduction française naturelle",
      "phonetic": "Transcription phonétique optionnelle",
      "priority": true
    }
  ]
}
`;

const buildUserPrompt = (theme: string, level: 'débutant' | 'intermédiaire' | 'avancé', count: number) => {
    const levelDesc = {
        'débutant': `Niveau DÉBUTANT (A1–A2) : phrases COURTES (3–7 mots), vocabulaire très fréquent, structures simples.`,
        'intermédiaire': `Niveau INTERMÉDIAIRE (B1–B2) : phrases MOYENNES (8–14 mots), expressions idiomatiques, rythme naturel.`,
        'avancé': `Niveau AVANCÉ (C1) : phrases LONGUES et complexes (15+ mots), tournures natives, rythme soutenu.`,
    }[level];

    return `Génère EXACTEMENT ${count} expressions pour le thème : "${theme}".
${levelDesc}

Marque "priority": true sur les ${Math.max(3, Math.ceil(count * 0.35))} expressions les plus utiles — celles que l'apprenant doit maîtriser et que l'on répétera en fin de session.

Retourne le JSON strictement conforme au format.`;
};

/**
 * Prompt when the user provides a source document (markdown file or YouTube transcript).
 * The AI extracts / adapts the most phonetically useful phrases from the source.
 */
const buildContextUserPrompt = (
    context: string,
    count: number,
    level: 'débutant' | 'intermédiaire' | 'avancé',
    sourceLabel: string
) => {
    const levelDesc = {
        'débutant': 'Niveau DÉBUTANT (A1–A2) : phrases COURTES (3–7 mots).',
        'intermédiaire': 'Niveau INTERMÉDIAIRE (B1–B2) : phrases MOYENNES (8–14 mots).',
        'avancé': 'Niveau AVANCÉ (C1) : phrases LONGUES (15+ mots).',
    }[level];

    return `Source : ${sourceLabel}
${levelDesc}

VOICI LE CONTENU SOURCE :
---
${context.substring(0, 5000)}
---

Instructions :
- Extrais ou adapte les expressions les plus naturelles et phonétiquement intéressantes.
- Génère EXACTEMENT ${count} phrases idiomatiques optimisées pour le shadowing.
- Marque "priority": true sur les ${Math.max(3, Math.ceil(count * 0.35))} expressions les plus utiles.
- Respecte la langue du contenu source.

Retourne le JSON strictement conforme au format.`;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseShadowingModeProps {
    activeLang: string;
    config: any;
}

export const useShadowingMode = ({ activeLang, config }: UseShadowingModeProps) => {
    const { showToast } = useToast();

    // Core session state
    const [session, setSession]             = useState<ShadowingSession | null>(null);
    const [sessionQueue, setSessionQueue]   = useState<ShadowingPhrase[]>([]);
    const [currentIndex, setCurrentIndex]   = useState(0);
    const [phase, setPhase]                 = useState<ShadowingPhase>('listen');
    const [phaseTransition, setPhaseTransition] = useState<PhaseTransition>(null);
    const [isGenerating, setIsGenerating]   = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);

    // Config
    const [duration, setDuration] = useState<SessionDuration>(10);

    // Timer
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Recording (single slot — component stores history)
    const { isRecordingShadow, shadowAudioSrc, setShadowAudioSrc, startShadowRecording, stopShadowRecording } =
        useShadowingRecorder(showToast, (k: string) => k);

    // Derived
    const targetLangName = (() => {
        const map: Record<string, string> = {
            en: 'anglais', it: 'italien', es: 'espagnol',
            pt: 'portugais', de: 'allemand', tr: 'turc', fr: 'français'
        };
        return map[activeLang.split('-')[0].toLowerCase()] || activeLang;
    })();

    const currentPhrase = sessionQueue[currentIndex] ?? null;
    const targetSeconds = duration * 60;
    const progress = Math.min(elapsedSeconds / targetSeconds, 1);

    // ---------------------------------------------------------------------------
    // Queue builder
    // ---------------------------------------------------------------------------
    const buildQueue = useCallback((phrases: ShadowingPhrase[], targetCount: number): ShadowingPhrase[] => {
        const queue: ShadowingPhrase[] = [...phrases];
        const priorityPhrases = phrases.filter(p => p.priority);
        if (priorityPhrases.length === 0) return queue.slice(0, targetCount);
        let repIndex = 0;
        while (queue.length < targetCount) {
            const source = priorityPhrases[repIndex % priorityPhrases.length];
            queue.push({ ...source, id: `${source.id}-rep-${repIndex}`, isRepetition: true });
            repIndex++;
        }
        return queue.slice(0, targetCount);
    }, []);

    // ---------------------------------------------------------------------------
    // AI Generation
    // ---------------------------------------------------------------------------
    const generate = async (
        theme: string,
        level: 'débutant' | 'intermédiaire' | 'avancé',
        sourceContext?: { text: string; label: string }
    ) => {
        if (!theme.trim()) { showToast('Veuillez choisir un thème', 'warning'); return; }
        setIsGenerating(true);
        setSessionComplete(false);
        setPhase('listen');
        setPhaseTransition(null);

        try {
            const targetCount = DURATION_TO_PHRASE_COUNT[duration];
            const baseCount   = DURATION_TO_BASE_PHRASES[duration];

            const messages: ChatMessage[] = [
                { role: 'system', content: buildSystemPrompt(targetLangName) },
                { role: 'user', content: sourceContext
                    ? buildContextUserPrompt(sourceContext.text, baseCount, level, sourceContext.label)
                    : buildUserPrompt(theme, level, baseCount)
                },
            ];

            const { apiKey, modelName, apiUrl } = resolveConfig(config);
            const raw = await executeAIRequest(messages, config.provider, apiKey, modelName, apiUrl);

            let jsonStr = '';
            const codeBlock = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlock) jsonStr = codeBlock[1];
            if (!jsonStr) { const m = raw.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }
            if (!jsonStr) throw new Error('Pas de JSON valide.');

            const parsed  = JSON.parse(jsonStr);
            const phrases: ShadowingPhrase[] = (parsed.phrases ?? [])
                .map((p: any, i: number) => ({
                    id:          `phrase-${i}`,
                    text:        String(p.text ?? ''),
                    translation: String(p.translation ?? ''),
                    phonetic:    p.phonetic ? String(p.phonetic) : undefined,
                    priority:    p.priority === true,
                    isRepetition: false,
                }))
                .filter((p: ShadowingPhrase) => p.text.trim().length > 0);

            const queue = buildQueue(phrases, targetCount);
            setSession({ theme, targetLanguage: targetLangName, level, phrases });
            setSessionQueue(queue);
            setCurrentIndex(0);
            setElapsedSeconds(0);

            const repCount = queue.length - phrases.length;
            showToast(`Session ${duration} min — ${phrases.length} phrases + ${repCount} révisions ✓`, 'success');
        } catch (e) {
            console.error('Shadowing generate error:', e);
            showToast('Erreur lors de la génération. Réessayez.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Timer
    // ---------------------------------------------------------------------------
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsTimerRunning(true);
        timerRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }, []);

    const pauseTimer = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setIsTimerRunning(false);
    }, []);

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

    // ---------------------------------------------------------------------------
    // Navigation — goNext now drives phase sequencing
    // ---------------------------------------------------------------------------
    const goNext = useCallback(() => {
        setShadowAudioSrc(null);
        if (currentIndex < sessionQueue.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Last phrase of this phase
            if (phase === 'listen') {
                setPhaseTransition('to-guided');
            } else if (phase === 'guided') {
                setPhaseTransition('to-blind');
            } else {
                // End of blind → session complete
                pauseTimer();
                setSessionComplete(true);
            }
        }
    }, [currentIndex, sessionQueue.length, phase, pauseTimer, setShadowAudioSrc]);

    const goPrev = useCallback(() => {
        setShadowAudioSrc(null);
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    }, [currentIndex, setShadowAudioSrc]);

    /** Called from UI after user confirms phase transition */
    const advancePhase = useCallback(() => {
        if (phaseTransition === 'to-guided') setPhase('guided');
        else if (phaseTransition === 'to-blind') setPhase('blind');
        setPhaseTransition(null);
        setCurrentIndex(0);
        setShadowAudioSrc(null);
    }, [phaseTransition, setShadowAudioSrc]);

    const quitSession = useCallback(() => {
        pauseTimer();
        setSession(null);
        setSessionQueue([]);
        setCurrentIndex(0);
        setShadowAudioSrc(null);
        setSessionComplete(false);
        setElapsedSeconds(0);
        setPhase('listen');
        setPhaseTransition(null);
    }, [pauseTimer, setShadowAudioSrc]);

    // ---------------------------------------------------------------------------
    // Native JSON load (bypass AI) — directly inject a ShadowingSession
    // ---------------------------------------------------------------------------
    const loadNativeSession = useCallback((data: {
        theme?: string;
        targetLanguage?: string;
        level?: 'débutant' | 'intermédiaire' | 'avancé';
        phrases: Array<{ text: string; translation: string; phonetic?: string; priority?: boolean }>;
    }) => {
        const phrases: ShadowingPhrase[] = (data.phrases || [])
            .filter(p => p.text?.trim())
            .map((p, i) => ({
                id:           `phrase-${i}`,
                text:         p.text.trim(),
                translation:  p.translation || '',
                phonetic:     p.phonetic,
                priority:     p.priority === true,
                isRepetition: false,
            }));
        if (phrases.length === 0) { showToast('Aucune phrase valide dans ce fichier.', 'warning'); return; }
        const targetCount = DURATION_TO_PHRASE_COUNT[duration];
        const queue = buildQueue(phrases, targetCount);
        setSession({
            theme:          data.theme          || 'Import JSON',
            targetLanguage: data.targetLanguage || targetLangName,
            level:          data.level          || 'intermédiaire',
            phrases,
        });
        setSessionQueue(queue);
        setCurrentIndex(0);
        setElapsedSeconds(0);
        setPhase('listen');
        setPhaseTransition(null);
        setSessionComplete(false);
        const repCount = queue.length - phrases.length;
        showToast(`Session chargée — ${phrases.length} phrases + ${repCount} répétitions ✓`, 'success');
    }, [duration, buildQueue, targetLangName, showToast]);

    // ---------------------------------------------------------------------------
    return {
        session, sessionQueue, currentIndex, currentPhrase, phase,
        phaseTransition,
        isGenerating, sessionComplete,
        duration, setDuration,
        elapsedSeconds, isTimerRunning, targetSeconds, progress,
        isRecordingShadow, shadowAudioSrc, setShadowAudioSrc,
        startShadowRecording, stopShadowRecording,
        generate, goNext, goPrev, advancePhase, loadNativeSession,
        startTimer, pauseTimer, quitSession,
        targetLangName,
    };
};
