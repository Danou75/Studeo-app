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

    // --- 3. EXÉCUTION AVEC RETRY ---
    try {
        console.log("🚀 Tentative 1 : Conjugaison Complète (7 temps)");
        const rawText = await executeConjugation(fullPrompt);
        
        const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson) as ConjugationResult;

    } catch (error) {
        console.warn("⚠️ Échec de la conjugaison complète :", error);

        // Si on est en IA Locale, on tente le mode simplifié
        if (provider === 'local') {
            console.log("🔄 Tentative 2 : Repli sur Conjugaison Simplifiée (3 temps)...");
            try {
                const rawTextRetry = await executeConjugation(simplifiedPrompt);
                const cleanedJsonRetry = rawTextRetry.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanedJsonRetry) as ConjugationResult;
            } catch (retryError) {
                console.error("❌ Échec aussi en mode simplifié :", retryError);
                throw retryError; // Si ça rate encore, on abandonne
            }
        }
        
        throw error; // Si ce n'est pas local, on renvoie l'erreur directe
    }
};
