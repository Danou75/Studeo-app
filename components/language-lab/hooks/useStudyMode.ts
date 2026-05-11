import { useState, useRef } from 'react';
import { generateFlashcardsWithAI } from '../../../services/aiCardGenerator';
import { AIGenerationConfig, Flashcard, Tutor } from '../../../types';
import { useShadowingRecorder } from './useShadowingRecorder';

interface UseStudyModeProps {
    t: (key: string, opts?: any) => string;
    showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
    activeLang: string;
    config: any;
    tutor: Tutor | null;
    onAddCards: (cards: Flashcard[], listName?: string) => void;
}

export const useStudyMode = ({ t, showToast, activeLang, config, tutor, onAddCards }: UseStudyModeProps) => {
    const [studyAudioSrc, setStudyAudioSrc] = useState<string | null>(null);
    const [studyScript, setStudyScript] = useState<string>('');
    const [studyPlaybackRate, setStudyPlaybackRate] = useState<number>(1.0);
    const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const {
        isRecordingShadow,
        shadowAudioSrc,
        startShadowRecording,
        stopShadowRecording
    } = useShadowingRecorder(showToast, t);

    const handleAnalyzeScript = async () => {
        if (!studyScript.trim()) {
            showToast(t('lab.study.placeholder'), 'warning');
            return;
        }

        setIsAnalyzingScript(true);
        try {
            const currentLang = activeLang;
            const targetLang = currentLang.split('-')[0]; // ex: 'it'
            const sourceLang = 'fr';

            const aiConfig: AIGenerationConfig = {
                topic: t('lab.study.analyseTopic', { name: tutor?.name || 'Labo' }),
                sourceLang: sourceLang,
                targetLang: targetLang,
                count: 10,
                difficulty: 'intermediate',
                context: studyScript,
                provider: config.provider,
                apiKey: config.provider === 'gemini' ? config.geminiApiKey : 
                        config.provider === 'openai' ? config.openaiApiKey :
                        config.provider === 'anthropic' ? config.anthropicApiKey :
                        config.provider === 'mistral' ? config.mistralApiKey :
                        config.provider === 'openrouter' ? config.openrouterApiKey : undefined,
                modelName: config.provider === 'gemini' ? config.geminiModel :
                           config.provider === 'openai' ? config.openaiModel :
                           config.provider === 'anthropic' ? config.anthropicModel :
                           config.provider === 'mistral' ? config.mistralModel :
                           config.provider === 'openrouter' ? (config.openrouterModel || 'openai/gpt-4o') : config.localModelName,
                apiUrl: config.localApiUrl
            };

            const cards = await generateFlashcardsWithAI(aiConfig, tutor?.id);
            
            if (cards && cards.length > 0) {
                const targetSet = t('lab.study.vocabSet', { lang: targetLang.toUpperCase() });
                onAddCards(cards, targetSet);
                showToast(t('lab.study.analyseSuccess', { count: cards.length, name: targetSet }), 'success');
            } else {
                showToast(t('lab.study.noVocab'), 'info');
            }
        } catch (err) {
            console.error("Erreur analyse script:", err);
            showToast(t('lab.study.analyseError'), 'error');
        } finally {
            setIsAnalyzingScript(false);
        }
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setStudyAudioSrc(url);
        }
    };

    return {
        studyAudioSrc,
        setStudyAudioSrc,
        studyScript,
        setStudyScript,
        studyPlaybackRate,
        setStudyPlaybackRate,
        audioRef,
        isAnalyzingScript,
        handleAnalyzeScript,
        handleAudioUpload,
        isRecordingShadow,
        shadowAudioSrc,
        startShadowRecording,
        stopShadowRecording
    };
};
