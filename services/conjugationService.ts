import { callAI } from './aiClient';
import { ConjugationResult, AIProvider } from '../types';

export const conjugateVerb = async (
  verb: string,
  language: string,
  provider: AIProvider = 'gemini',
  modelName: string = 'gemini-2.5-flash',
  apiUrl?: string,
  apiKey?: string
): Promise<ConjugationResult> => {


    // --- 1. FONCTION HELPER POUR APPELER L'API ---
    const executeConjugation = async (currentPrompt: string): Promise<string> => {
        // Gestion spéciale Gemini : fallback localStorage
        const effectiveApiKey = provider === 'gemini'
            ? (apiKey || localStorage.getItem('gemini_api_key') || undefined)
            : apiKey || undefined;
        
        const result = await callAI(
            { provider, apiKey: effectiveApiKey, modelName, apiUrl },
            currentPrompt
        );
        return result.text;
    }; // Fin helper

    // --- 2. DÉFINITION DES PROMPTS ---
    const baseHeader = `Tu es un expert en linguistique. Conjugue le verbe "${verb}" en ${language}.`;
    
    // Prompt COMPLET (7 temps) - Par défaut pour tout le monde
    const fullPrompt = `
    ${baseHeader}
    Retourne un JSON complet avec la structure suivante :
    {
      "verb": "${verb}", "language": "${language}",
      "definition": "...", "translation": "...", "example": "...",
      "tables": [ { "tense": "present", "tenseName": "Présent", "forms": { ... } }, ... ]
    }
    Temps requis : Présent, Imparfait, Futur simple, Passé composé, Conditionnel, Subjonctif présent, Impératif.
    Règles : Pronoms standard. PAS de markdown. JSON pur.
    `;

    // Prompt SIMPLIFIÉ (3 temps) - Fallback pour IA Locale
    const simplifiedPrompt = `
    ${baseHeader}
    Attention : Réponds UNIQUEMENT avec un JSON court (risque de coupure).
    Structure :
    {
      "verb": "${verb}", "language": "${language}",
      "definition": "...", "translation": "...",
      "tables": [
        { "tense": "present", "tenseName": "Présent", "forms": { ... } },
        { "tense": "past_perfect", "tenseName": "Passé Composé", "forms": { ... } },
        { "tense": "future", "tenseName": "Futur", "forms": { ... } }
      ]
    }
    Conjugue SEULEMENT au Présent, Passé Composé et Futur.
    `;

    const normalizeResult = (res: any): ConjugationResult => {
        if (!res) return res;

        // Normalisation de la traduction en chaîne
        if (res.translation && typeof res.translation === 'object') {
            const keys = Object.keys(res.translation);
            // On cherche en priorité le Français ou l'Anglais
            const frenchKey = keys.find(k => k.toLowerCase() === 'french' || k.toLowerCase() === 'français' || k.toLowerCase() === 'francais' || k.toLowerCase() === 'fr');
            const englishKey = keys.find(k => k.toLowerCase() === 'english' || k.toLowerCase() === 'anglais' || k.toLowerCase() === 'en');
            
            if (frenchKey) {
                res.translation = res.translation[frenchKey];
            } else if (englishKey) {
                res.translation = res.translation[englishKey];
            } else if (keys.length > 0) {
                res.translation = keys.map(k => `${k}: ${res.translation[k]}`).join(', ');
            } else {
                res.translation = String(res.translation);
            }
        } else if (res.translation !== undefined) {
            res.translation = String(res.translation);
        }

        // Normalisation de la définition
        if (res.definition && typeof res.definition === 'object') {
            const keys = Object.keys(res.definition);
            const frenchKey = keys.find(k => k.toLowerCase() === 'french' || k.toLowerCase() === 'français' || k.toLowerCase() === 'francais' || k.toLowerCase() === 'fr');
            const englishKey = keys.find(k => k.toLowerCase() === 'english' || k.toLowerCase() === 'anglais' || k.toLowerCase() === 'en');
            
            if (frenchKey) {
                res.definition = res.definition[frenchKey];
            } else if (englishKey) {
                res.definition = res.definition[englishKey];
            } else if (keys.length > 0) {
                res.definition = keys.map(k => `${k}: ${res.definition[k]}`).join(', ');
            } else {
                res.definition = String(res.definition);
            }
        } else if (res.definition !== undefined) {
            res.definition = String(res.definition);
        }

        // Normalisation de l'exemple
        if (res.example && typeof res.example === 'object') {
            const keys = Object.keys(res.example);
            const frenchKey = keys.find(k => k.toLowerCase() === 'french' || k.toLowerCase() === 'français' || k.toLowerCase() === 'francais' || k.toLowerCase() === 'fr');
            const englishKey = keys.find(k => k.toLowerCase() === 'english' || k.toLowerCase() === 'anglais' || k.toLowerCase() === 'en');
            
            if (frenchKey) {
                res.example = res.example[frenchKey];
            } else if (englishKey) {
                res.example = res.example[englishKey];
            } else if (keys.length > 0) {
                res.example = keys.map(k => `${k}: ${res.example[k]}`).join(', ');
            } else {
                res.example = String(res.example);
            }
        } else if (res.example !== undefined) {
            res.example = String(res.example);
        }

        // Normalisation du verbe et de la langue
        if (res.verb && typeof res.verb === 'object') {
            res.verb = String(Object.values(res.verb)[0] || '');
        } else if (res.verb !== undefined) {
            res.verb = String(res.verb);
        }
        
        if (res.language && typeof res.language === 'object') {
            res.language = String(Object.values(res.language)[0] || '');
        } else if (res.language !== undefined) {
            res.language = String(res.language);
        }

        return res as ConjugationResult;
    };

    // --- 3. EXÉCUTION AVEC RETRY ---
    try {
        console.log("🚀 Tentative 1 : Conjugaison Complète (7 temps)");
        const rawText = await executeConjugation(fullPrompt);
        
        const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);
        return normalizeResult(parsed);

    } catch (error) {
        console.warn("⚠️ Échec de la conjugaison complète :", error);

        // Si on est en IA Locale, on tente le mode simplifié
        if (provider === 'local') {
            console.log("🔄 Tentative 2 : Repli sur Conjugaison Simplifiée (3 temps)...");
            try {
                const rawTextRetry = await executeConjugation(simplifiedPrompt);
                const cleanedJsonRetry = rawTextRetry.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsedRetry = JSON.parse(cleanedJsonRetry);
                return normalizeResult(parsedRetry);
            } catch (retryError) {
                console.error("❌ Échec aussi en mode simplifié :", retryError);
                throw retryError; // Si ça rate encore, on abandonne
            }
        }
        
        throw error; // Si ce n'est pas local, on renvoie l'erreur directe
    }
};
