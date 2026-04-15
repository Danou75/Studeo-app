import { useState, useEffect, useCallback } from 'react';

export const useTTS = (langCode: string = 'fr-FR', tutorId?: string | null) => {
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

    const storageKey = `tts_voice_pref_${langCode}${tutorId ? `_${tutorId}` : ''}`;

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

            // Fallback: pick the first one from our sorted list (which is the "best" one),
            // but try to match the tutor's perceived gender if we know it!
            if (!voiceToSelect && filtered.length > 0) {
                let preferredGender: 'male' | 'female' | null = null;
                if (tutorId) {
                    if (/(mister|mr|maestro|mestre|herr|master|efendi|nauczyciel|prof-)/i.test(tutorId)) {
                        preferredGender = 'male';
                    } else if (/(madame|mme|jennifer|irma)/i.test(tutorId)) {
                        preferredGender = 'female';
                    }
                }

                if (preferredGender) {
                    const genderMatchedVoice = filtered.find(v => {
                        const vName = v.name.toLowerCase();
                        if (preferredGender === 'male') {
                            return vName.includes('male') || vName.includes('man') || vName.includes('boy') || vName.includes('david') || vName.includes('thomas');
                        } else {
                            return vName.includes('female') || vName.includes('woman') || vName.includes('girl') || vName.includes('marie') || vName.includes('amelie') || vName.includes('siri');
                        }
                    });
                    if (genderMatchedVoice) {
                        voiceToSelect = genderMatchedVoice;
                    }
                }

                if (!voiceToSelect) {
                    voiceToSelect = filtered[0];
                }
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
    }, [langCode, tutorId, storageKey]); // Removed selectedVoice from deps to avoid loop logic issues

    const updateSelectedVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
        localStorage.setItem(storageKey, voice.name);
    }, [storageKey]);

    const speak = useCallback((text: string, rate: number = 0.9, voice: SpeechSynthesisVoice | null = null) => {
        window.speechSynthesis.cancel();
        
        // Clean text (remove our separators if any remaining)
        let cleanText = text.split('|||')[0].trim();
        
        // Remove markdown formatting characters (*, _, #, `, ~) so TTS doesn't read them out loud
        cleanText = cleanText.replace(/[*_#`~]/g, '');

        // Remove emojis and other non-verbal symbols 
        // (Extended_Pictographic catches almost all emojis, \u200D is Zero Width Joiner, \uFE0F is variation selector)
        try {
            const emojiRegex = new RegExp('[\\p{Extended_Pictographic}\\u200D\\uFE0F]', 'gu');
            cleanText = cleanText.replace(emojiRegex, '');
        } catch (e) {
            // Fallback for older browsers not supporting \p{}
            cleanText = cleanText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '');
        }
        
        // Final trim
        cleanText = cleanText.trim();
        
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
