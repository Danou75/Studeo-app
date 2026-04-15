import { useState } from 'react';
import { PronunciationChallenge, PronunciationContent, calculateSimilarity } from '../pronunciationUtils';
import { executeAIRequest, ChatMessage } from '../../../services/conversationService';
import { PRONUNCIATION_COACH_PROMPT } from '../../../constants/tutorPrompts';

interface UsePronunciationCoachProps {
    activeLang: string;
    config: any;
    showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
    t: (key: string) => string;
}

export const usePronunciationCoach = ({ activeLang, config, showToast, t }: UsePronunciationCoachProps) => {
    const [pronunciationChallenges, setPronunciationChallenges] = useState<PronunciationChallenge[]>([]);
    const [pronunciationType, setPronunciationType] = useState<'challenges' | 'dialogue'>('challenges');
    const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
    const [pronunciationResult, setPronunciationResult] = useState<{score: number, feedback: string} | null>(null);
    const [isGeneratingChallenges, setIsGeneratingChallenges] = useState(false);
    const [dialogueTopic, setDialogueTopic] = useState("");
    const [dialogueLevel, setDialogueLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
    const [showTopicInput, setShowTopicInput] = useState(false);

    const generatePronunciationChallenges = async (mode: 'challenges' | 'dialogue' = 'challenges') => {
        setIsGeneratingChallenges(true);
        setPronunciationChallenges([]);
        try {
            const systemPrompt = PRONUNCIATION_COACH_PROMPT;
            let userPrompt = '';
            
            if (mode === 'challenges') {
                userPrompt = `Langue cible : ${activeLang}. Génère 10 Challenges (phrases isolées).`;
            } else {
                const topic = dialogueTopic.trim() || 'un sujet aléatoire';
                const levelText = dialogueLevel === 'beginner' ? 'Débutant (phrases simples, vocabulaire basique)' : 
                                  dialogueLevel === 'intermediate' ? 'Intermédiaire (phrases courantes, vocabulaire standard)' : 
                                  'Avancé (phrases complexes, vocabulaire riche)';
                userPrompt = `Langue cible : ${activeLang}. Génère un Dialogue réaliste sur : ${topic}. Niveau : ${levelText}.`;
            }

            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            let fullResponse = "";
            let apiKey = '';
            let model = '';
            let url = '';

            if (config.provider === 'gemini') {
                apiKey = config.geminiApiKey;
                model = config.geminiModel;
            } else if (config.provider === 'local') {
                url = config.localApiUrl;
                model = config.localModelName;
            } else if (config.provider === 'openai') {
                apiKey = config.openaiApiKey || '';
                model = config.openaiModel || '';
            } else if (config.provider === 'mistral') {
                apiKey = config.mistralApiKey || '';
                model = config.mistralModel || '';
            }

             fullResponse = await executeAIRequest(
                messages,
                config.provider,
                apiKey,
                model,
                url
            );
            
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]) as PronunciationContent; 
                if (data.content) {
                    setPronunciationChallenges(data.content);
                    setPronunciationType(data.type || 'challenges');
                } else if ((data as any).challenges) {
                     setPronunciationChallenges((data as any).challenges);
                     setPronunciationType('challenges');
                }
                
                setCurrentChallengeIndex(0);
                setPronunciationResult(null);
            }
        } catch (e) {
            console.error("Error generating challenges", e);
            showToast(t('common.error') || 'Erreur', 'error');
        } finally {
            setIsGeneratingChallenges(false);
        }
    };

    const verifyPronunciation = (transcript: string) => {
        if (!pronunciationChallenges[currentChallengeIndex]) return;
        const target = pronunciationChallenges[currentChallengeIndex].text;
        const similarity = calculateSimilarity(target, transcript);
        let feedback = "";
        let score = Math.round(similarity * 100);
        
        if (score >= 90) feedback = "Excellent ! 🌟";
        else if (score >= 70) feedback = "Très bien ! 👍";
        else if (score >= 50) feedback = "Pas mal, encore un effort. 🤔";
        else feedback = "Essaie encore. 🎧";
        
        setPronunciationResult({ score, feedback });
    };

    const quitPronunciation = () => {
        setPronunciationChallenges([]);
    };

    return {
        pronunciationChallenges,
        setPronunciationChallenges,
        pronunciationType,
        setPronunciationType,
        currentChallengeIndex,
        setCurrentChallengeIndex,
        pronunciationResult,
        setPronunciationResult,
        isGeneratingChallenges,
        dialogueTopic,
        setDialogueTopic,
        dialogueLevel,
        setDialogueLevel,
        showTopicInput,
        setShowTopicInput,
        generatePronunciationChallenges,
        verifyPronunciation,
        quitPronunciation
    };
};
