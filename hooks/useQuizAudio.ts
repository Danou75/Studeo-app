import { useState, useEffect, useRef, useCallback } from 'react';
import { QuizConfig, Flashcard } from '../types';
import { getAudioBuffer, playAudioBuffer } from '../services/geminiService';
import { LANGUAGE_CONFIG } from '../constants';

let systemVoices: SpeechSynthesisVoice[] = [];
const getSystemVoices = (): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
        if (systemVoices.length > 0) return resolve(systemVoices);
        systemVoices = window.speechSynthesis.getVoices();
        if (systemVoices.length > 0) return resolve(systemVoices);
        window.speechSynthesis.onvoiceschanged = () => {
            systemVoices = window.speechSynthesis.getVoices();
            resolve(systemVoices);
        };
    });
};
getSystemVoices();

export const useQuizAudio = (
    quizConfig: QuizConfig, 
    quizCards: Flashcard[], 
    currentIndex: number, 
    isReady: boolean,
    isRevealed: boolean,
    question: string,
    customVoice: SpeechSynthesisVoice | null = null
) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioBuffers, setAudioBuffers] = useState<Map<string, AudioBuffer>>(new Map());
    const [isPrefetching, setIsPrefetching] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const fetchingAudioRef = useRef<Set<string>>(new Set());

    const getAudioContext = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        return audioContextRef.current;
    }

    useEffect(() => {
        return () => {
            window.speechSynthesis?.cancel();
            audioContextRef.current?.close();
        }
    }, []);

    // Initial Load
    useEffect(() => {
        if (quizConfig.voiceEngine === 'gemini') {
            const loadInitialAudio = async () => {
                const firstCard = quizCards[0];
                if (firstCard) {
                    const textToSpeak = firstCard.type === 'classic' 
                        ? firstCard.terms?.[quizConfig.questionLang] 
                        : firstCard.type === 'mcq' 
                        ? (firstCard as any).mcqData?.question[quizConfig.questionLang]
                        : firstCard.type === 'cloze'
                        ? (firstCard as any).clozeData?.text[quizConfig.questionLang]
                        : undefined;
                    if (textToSpeak && !audioBuffers.has(firstCard.id) && !fetchingAudioRef.current.has(firstCard.id)) {
                        try {
                            fetchingAudioRef.current.add(firstCard.id);
                            const buffer = await getAudioBuffer(textToSpeak, quizConfig);
                            if (buffer) setAudioBuffers(prev => new Map(prev).set(firstCard.id, buffer));
                        } catch (e) { console.error("Initial audio load failed", e); } 
                        finally { fetchingAudioRef.current.delete(firstCard.id); }
                    }
                }
            };
            loadInitialAudio();
        }
    }, [quizConfig.voiceEngine, quizCards, quizConfig.questionLang, audioBuffers]);

    // Prefetching
    useEffect(() => {
        if (!isReady || quizConfig.voiceEngine !== 'gemini' || currentIndex >= quizCards.length) return;
        const prefetch = async (card: Flashcard) => {
            if (!card || audioBuffers.has(card.id) || fetchingAudioRef.current.has(card.id)) return;
            const textToSpeak = card.type === 'classic' 
                ? card.terms?.[quizConfig.questionLang] 
                : card.type === 'mcq' 
                ? (card as any).mcqData?.question[quizConfig.questionLang]
                : card.type === 'cloze'
                ? (card as any).clozeData?.text[quizConfig.questionLang]
                : undefined;
            if (!textToSpeak) return;
            try {
                fetchingAudioRef.current.add(card.id);
                setIsPrefetching(true);
                const buffer = await getAudioBuffer(textToSpeak, quizConfig);
                if (buffer) setAudioBuffers(prev => new Map(prev).set(card.id, buffer));
            } catch (e) { console.error(`Audio prefetch failed for card ${card.id}:`, e); } 
            finally {
                fetchingAudioRef.current.delete(card.id);
                if (fetchingAudioRef.current.size === 0) setIsPrefetching(false);
            }
        };
        for (let i = 1; i <= 2; i++) {
            if (currentIndex + i < quizCards.length) prefetch(quizCards[currentIndex + i]);
        }
    }, [currentIndex, quizCards, quizConfig, isReady, audioBuffers]);

    const speakLocally = useCallback(async (text: string, lang: string) => {
        if (!window.speechSynthesis) return;
        setIsSpeaking(true);
        window.speechSynthesis.cancel();
        
        // Clean text for TTS
        const cleanText = text.split('|||')[0].trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        const langConfig = LANGUAGE_CONFIG[lang];
        utterance.lang = langConfig ? langConfig.speechLang : lang;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => { console.error("SpeechSynthesis Error:", e); setIsSpeaking(false); };
        
        try {
            // Priority to custom selected voice
            if (customVoice && customVoice.lang.startsWith(utterance.lang.split('-')[0])) {
                utterance.voice = customVoice;
                window.speechSynthesis.speak(utterance);
                return;
            }

            const voices = await getSystemVoices();
            if (voices.length === 0) { window.speechSynthesis.speak(utterance); return; }
            const langVoices = voices.filter(v => v.lang.startsWith(utterance.lang.split('-')[0]));
            if (langVoices.length > 0) {
                 utterance.voice = langVoices[0];
            }
            window.speechSynthesis.speak(utterance);
        } catch (e) { console.error("Failed to set voice:", e); window.speechSynthesis.speak(utterance); }
    }, [customVoice]);

    const speakQuestion = useCallback(async () => {
        if (isSpeaking || !question) return;
        const currentCard = quizCards[currentIndex];
        if (!currentCard) return;

        if (quizConfig.voiceEngine === 'local') {
            speakLocally(question, quizConfig.questionLang);
        } else {
            const audioContext = getAudioContext();
            const play = (buffer: AudioBuffer) => { setIsSpeaking(true); playAudioBuffer(buffer, audioContext, () => setIsSpeaking(false)); };
            if (audioBuffers.has(currentCard.id)) {
                play(audioBuffers.get(currentCard.id)!);
            } else {
                setIsSpeaking(true);
                const buffer = await getAudioBuffer(question, quizConfig);
                if (buffer) { setAudioBuffers(prev => new Map(prev).set(currentCard.id, buffer)); play(buffer); } 
                else { setIsSpeaking(false); }
            }
        }
    }, [isSpeaking, question, audioBuffers, quizConfig, quizCards, currentIndex, speakLocally]);

    // Auto-play
    useEffect(() => {
        const currentCard = quizCards[currentIndex];
        if (isReady && quizConfig.autoPlayAudio && quizConfig.voiceEngine === 'gemini' && !isSpeaking && !isRevealed && audioBuffers.has(currentCard?.id)) {
            speakQuestion();
        }
    }, [currentIndex, audioBuffers, quizCards, quizConfig, isSpeaking, isRevealed, isReady, speakQuestion]);

    return {
        isSpeaking,
        isPrefetching,
        speakQuestion
    };
};
