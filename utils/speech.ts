import { LANGUAGE_CONFIG } from '../constants';

let systemVoices: SpeechSynthesisVoice[] = [];

export const getSystemVoices = (): Promise<SpeechSynthesisVoice[]> => {
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

// Initialisation dès que possible
if (typeof window !== 'undefined' && window.speechSynthesis) {
    getSystemVoices();
}

/**
 * Prononce un texte en utilisant l'API Web Speech native
 */
export const speak = async (text: string, langCode: string) => {
    if (!window.speechSynthesis) {
        console.warn("SpeechSynthesis API not supported");
        return;
    }

    // Annuler toute lecture en cours
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Convertir si nécessaire (ex: 'fr' -> 'fr-FR')
    const langConfig = LANGUAGE_CONFIG[langCode];
    // Si langCode est déjà un code complet (ex: fr-FR), on l'utilise, sinon on cherche dans la config
    const targetLang = langCode.includes('-') ? langCode : (langConfig ? langConfig.speechLang : langCode);
    
    utterance.lang = targetLang;
    
    try {
        const voices = await getSystemVoices();
        
        // Essayer de trouver une voix qui correspond à la langue
        // Priorité : 1. Correspondance exacte, 2. Commence par la langue (ex: fr)
        let selectedVoice = voices.find(v => v.lang === targetLang);
        
        if (!selectedVoice) {
            const shortLang = targetLang.split('-')[0];
            selectedVoice = voices.find(v => v.lang.startsWith(shortLang));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            // console.log(`Using voice: ${selectedVoice.name} (${selectedVoice.lang}) for ${targetLang}`);
        } else {
             console.warn(`No voice found for language ${targetLang}, using default.`);
        }

        window.speechSynthesis.speak(utterance);
        
    } catch (e) {
        console.error("Failed to select voice:", e);
        // Fallback: essayer de parler quand même avec la configuration par défaut
        window.speechSynthesis.speak(utterance);
    }
};
