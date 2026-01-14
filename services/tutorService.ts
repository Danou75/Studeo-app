import { invoke } from '@tauri-apps/api/tauri';
import { Tutor, AIProvider } from '../types';

export const getTutorExplanation = async (
    tutor: Tutor,
    question: string,
    userAnswer: string,
    correctAnswer: string,
    provider: AIProvider = 'gemini',
    apiKey?: string,
    modelName: string = 'gemini-2.0-flash-exp',
    apiUrl?: string
): Promise<string> => {
    
    // 1. Construire le prompt Socratique
    const prompt = `
    Tu es ${tutor.name}, ${tutor.description}.
    Agis selon ton personnage (ton, style, expressions).
    
    Un étudiant a répondu à cette question :
    Question : "${question}"
    Sa réponse (Incorrecte) : "${userAnswer}"
    La bonne réponse : "${correctAnswer}"
    
    Explique-lui brièvement (max 2 phrases) pourquoi il a tort et aide-le à comprendre la logique de la bonne réponse.
    Sois encourageant mais précis. N'utilise pas de JSON, réponds directement en texte brut avec ton style.
    `;

    console.log(`🧠 Calling Tutor ${tutor.name} for explanation...`);

    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    let responseText = "";

    // -- LOGIQUE MULTI-PROVIDER --
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
                    { role: "system", content: tutor.systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            })
        });

        if (!response.ok) throw new Error(`${provider} Error: ${await response.text()}`);
        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content || "";
    } 
    else if (provider === 'anthropic') {
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
                max_tokens: 1024,
                system: tutor.systemPrompt,
                messages: [{ role: "user", content: prompt }]
            })
        });
        if (!response.ok) throw new Error(`Anthropic Error: ${await response.text()}`);
        const data = await response.json();
        responseText = data.content?.[0]?.text || "";
    }
    else if (provider === 'local') {
        if (!apiUrl) throw new Error("URL API locale manquante");
        
        const endpoint = apiUrl.replace(/\/$/, '') + (apiUrl.includes('/chat/completions') ? '' : '/v1/chat/completions');
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName || "local-model",
                messages: [
                    { role: "system", content: tutor.systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 200
            })
        });

        if (!response.ok) throw new Error("Local API Error");
        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content || "";
    }
    else if (provider === 'gemini') {
        if (!apiKey) throw new Error("Clé API Gemini manquante.");

        if (isTauri) {
            responseText = await invoke<string>('generate_flashcards_command', { 
                prompt,
                apiKey: apiKey.trim(),
                modelName: modelName
            });
        } else {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName || 'gemini-2.0-flash-exp'}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: tutor.systemPrompt }] }
                })
            });
            if (!response.ok) throw new Error(`Gemini Error: ${await response.text()}`);
            const data = await response.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
    }

    // Nettoyage éventuel (parfois l'IA met des guillemets)
    return responseText.replace(/^"|"$/g, '').trim();
};
