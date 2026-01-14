import { useState, useEffect, useCallback } from 'react';

export const useTTS = (langCode: string = 'fr-FR') => {
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

    const storageKey = `tts_voice_pref_${langCode}`;

    // Load and filter voices
    useEffect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices();
            if (allVoices.length === 0) return;

            // Improved filtering and sorting for best voice quality
            const docLang = langCode.substring(0, 2).toLowerCase(); // 'en'
            const region = langCode.length > 2 ? langCode.substring(3).toLowerCase() : null; // 'us'

            let filtered = allVoices.filter(v => 
                v.lang.replace('_', '-').toLowerCase().startsWith(docLang)
            );

            // Prioritize voices matching the specific region if available
            filtered.sort((a, b) => {
                 const aLang = a.lang.toLowerCase();
                 const bLang = b.lang.toLowerCase();
                 
                 // Score based on Region match (if region exists)
                 const aRegion = region && aLang.includes(region) ? 1 : 0;
                 const bRegion = region && bLang.includes(region) ? 1 : 0;
                 if (aRegion !== bRegion) return bRegion - aRegion;

                 // Score based on Quality Keywords
                 const qualityKeywords = ["premium", "enhanced", "google", "siri", "natural", "neural"];
                 const aQuality = qualityKeywords.some(k => a.name.toLowerCase().includes(k)) ? 1 : 0;
                 const bQuality = qualityKeywords.some(k => b.name.toLowerCase().includes(k)) ? 1 : 0;
                 if (aQuality !== bQuality) return bQuality - aQuality;

                 return 0;
            });

            setAvailableVoices(filtered);

            // Try to restore from storage or auto-select
            const savedVoiceName = localStorage.getItem(storageKey);
            let voiceToSelect = null;

            if (savedVoiceName) {
                voiceToSelect = filtered.find(v => v.name === savedVoiceName);
            }

            // Fallback: pick the first one from our sorted list (which is the "best" one)
            if (!voiceToSelect) {
               voiceToSelect = filtered[0];
            }

            // Only update if different (to avoid loops if selectedVoice is already set correctly)
            if (voiceToSelect) {
                setSelectedVoice(prev => {
                    if (prev?.name === voiceToSelect?.name) return prev;
                    return voiceToSelect;
                });
            }
        };

        loadVoices();
        
        // Chrome loads voices asynchronously
        window.speechSynthesis.onvoiceschanged = loadVoices;
        
        return () => {
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, [langCode, storageKey]); // Removed selectedVoice from deps to avoid loop logic issues

    const updateSelectedVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
        localStorage.setItem(storageKey, voice.name);
    }, [storageKey]);

    const speak = useCallback((text: string, rate: number = 0.9, voice: SpeechSynthesisVoice | null = null) => {
        window.speechSynthesis.cancel();
        
        // Clean text (remove our separators if any remaining)
        const cleanText = text.split('|||')[0].trim();
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langCode;
        
        const voiceToUse = voice || selectedVoice;
        if (voiceToUse) {
            utterance.voice = voiceToUse;
        }
        
        utterance.rate = rate; 

        window.speechSynthesis.speak(utterance);
    }, [langCode, selectedVoice]);

    return {
        availableVoices,
        selectedVoice,
        setSelectedVoice: updateSelectedVoice,
        speak
    };
};
