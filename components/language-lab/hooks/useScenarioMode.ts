import { useState } from 'react';
import { ScenarioStep, generateScenario } from '../../../services/conversationService';
import { Tutor } from '../../../types';

export const useScenarioMode = (
    tutor: Tutor | null,
    config: any,
    activeLang: string,
    speak: (text: string) => void,
    resetTranscript: () => void,
    setDraftMessage: (msg: string) => void,
    showToast: (msg: string, type: 'success'|'error'|'info') => void,
    t: (key: string) => string,
    setLabMode: (mode: any) => void
) => {
    const [activeScenario, setActiveScenario] = useState<ScenarioStep[]>([]);
    const [scenarioStepIndex, setScenarioStepIndex] = useState(0);
    const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
    const [scenarioFeedback, setScenarioFeedback] = useState<'waiting' | 'success' | 'retry'>('waiting');
    const [showScenarioEndPrompt, setShowScenarioEndPrompt] = useState(false);

    const startScenario = async (themePrompt: string) => {
        if (!tutor) return;
        setIsGeneratingScenario(true);
        setLabMode('scenario_play');
        setScenarioStepIndex(0);
        setScenarioFeedback('waiting');
        setActiveScenario([]);

        try {
            const steps = await generateScenario(tutor, themePrompt, config, activeLang);
            setActiveScenario(steps);
            // Speak first line after short delay
            setTimeout(() => {
                if (steps.length > 0) speak(steps[0].tutorText);
            }, 1000);
        } catch (error) {
            console.error("Failed to start scenario", error);
            setLabMode('scenario_list'); // Go back on error
        } finally {
            setIsGeneratingScenario(false);
        }
    };

    const handleScenarioUserResponse = (userText: string) => {
        const currentStep = activeScenario[scenarioStepIndex];
        if (!currentStep) return;

        // Very basic validation logic
        const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;]/g, '').trim();
        const target = normalize(currentStep.userTarget);
        const attempt = normalize(userText);

        const targetWords = target.split(' ');
        const attemptWords = attempt.split(' ');
        const matchCount = targetWords.filter(w => attemptWords.includes(w)).length;
        const successRate = matchCount / targetWords.length;

        if (successRate > 0.4 || attempt === target) {
            setScenarioFeedback('success');
            setActiveScenario(prev => {
                const newScenario = [...prev];
                newScenario[scenarioStepIndex] = {
                    ...newScenario[scenarioStepIndex],
                    userResponse: userText
                };
                return newScenario;
            });

            setTimeout(() => {
                if (scenarioStepIndex < activeScenario.length - 1) {
                    const nextIndex = scenarioStepIndex + 1;
                    setScenarioStepIndex(nextIndex);
                    setScenarioFeedback('waiting');
                    resetTranscript();
                    setDraftMessage('');
                    setTimeout(() => speak(activeScenario[nextIndex].tutorText), 500);
                } else {
                    showToast(t('lab.scenarios.finished'), 'success');
                    setShowScenarioEndPrompt(true);
                }
            }, 1500);
        } else {
            setScenarioFeedback('retry');
        }
    };

    return {
        activeScenario,
        setActiveScenario,
        scenarioStepIndex,
        setScenarioStepIndex,
        isGeneratingScenario,
        scenarioFeedback,
        showScenarioEndPrompt,
        setShowScenarioEndPrompt,
        startScenario,
        handleScenarioUserResponse
    };
};
