import { invoke } from '@tauri-apps/api/tauri';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ConjugationResult, AIProvider } from '../types';

export const conjugateVerb = async (
  verb: string,
  language: string,
  provider: AIProvider = 'gemini',
  modelName: string = 'gemini-2.0-flash-exp',
  apiUrl?: string,
  apiKey?: string
): Promise<ConjugationResult> => {

    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    
    // --- 1. FONCTION HELPER POUR APPELER L'API ---
    const executeConjugation = async (currentPrompt: string): Promise<string> => {
        
        // --- 1. OPENAI / MISTRAL ---
        if (provider === 'openai' || provider === 'mistral') {
            const apiEndpoint = provider === 'mistral' 
                ? 'https://api.mistral.ai/v1/chat/completions' 
                : 'https://api.openai.com/v1/chat/completions';
            
            if (!apiKey) throw new Error(`Clé API ${provider} manquante.`);

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: "system", content: "You are a helpful assistant that outputs JSON only." },
                        { role: "user", content: currentPrompt }
                    ],
                    temperature: 0.3,
                    response_format: provider === 'openai' ? { type: "json_object" } : undefined
                })
            });

            if (!response.ok) throw new Error(`${provider} Error: ${await response.text()}`);
            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";
        }

        // --- 2. ANTHROPIC ---
        if (provider === 'anthropic') {
            if (!apiKey) throw new Error("Clé API Anthropic manquante.");
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: modelName,
                    max_tokens: 4096,
                    messages: [
                        { role: "user", content: currentPrompt }
                    ]
                })
            });
            
            if (!response.ok) throw new Error(`Anthropic Error: ${await response.text()}`);
            const data = await response.json();
            return data.content?.[0]?.text || "";
        }

        // --- 3. LEGACY GEMINI / LOCAL ---
        if (isTauri) {
            // MODE TAURI
            if (provider === 'gemini') {
                const effectiveKey = apiKey || localStorage.getItem('gemini_api_key');
                if (!effectiveKey) throw new Error("Clé API Gemini manquante localement");
                return await invoke<string>('generate_flashcards_command', {
                    prompt: currentPrompt,
                    apiKey: effectiveKey.trim(),
                    modelName
                });
            } else {
                if (!apiUrl) throw new Error("URL API locale manquante");
                return await invoke<string>('generate_flashcards_local', {
                    prompt: currentPrompt,
                    apiUrl,
                    modelName
                });
            }
        } else {
            // MODE WEB (Vercel)
            if (provider === 'local') {
                 // APPEL DIRECT À L'IA LOCALE
                 console.log("🌐 Calling Local AI directly from browser with prompt length:", currentPrompt.length);
                 if (!apiUrl) throw new Error("URL API locale manquante");
                 
                 let baseUrl = apiUrl.replace(/\/$/, '');
                 let endpoint = `${baseUrl}/v1/chat/completions`;
                 if (baseUrl.endsWith('/v1/chat/completions')) endpoint = baseUrl;
                 else if (baseUrl.endsWith('/v1')) endpoint = `${baseUrl}/chat/completions`;
    
                 const response = await fetch(endpoint, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         model: modelName || "local-model",
                         messages: [
                             { role: "system", content: "You are a helpful assistant that outputs JSON only." },
                             { role: "user", content: currentPrompt }
                         ],
                         temperature: 0.3,
                         max_tokens: 4000
                     })
                 });
    
                 if (!response.ok) throw new Error(`Local API Error: ${await response.text()}`);
                 
                 const data = await response.json();
                 if (data.error) throw new Error(`Local API Error: ${data.error.message}`);
                 if (!data.choices?.[0]?.message) throw new Error("Format réponse invalide");
                 
                 return data.choices[0].message.content;
    
            } else {
                // MODE CLOUD GEMINI (Client SDK)
                const effectiveKey = apiKey || localStorage.getItem('gemini_api_key');
                if (!effectiveKey) throw new Error("Clé API Gemini manquante");

                const genAI = new GoogleGenerativeAI(effectiveKey);
                const model = genAI.getGenerativeModel({ 
                    model: modelName || "gemini-2.0-flash-exp",
                    generationConfig: { responseMimeType: "application/json" }
                });
                
                const result = await model.generateContent(currentPrompt);
                const text = result.response.text();
                if (!text) throw new Error("Gemini a renvoyé une réponse vide");
                return text;
            }
        }
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
