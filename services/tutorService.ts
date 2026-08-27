import { Tutor, AIProvider } from '../types';
import { callAI } from './aiClient';

export const getTutorExplanation = async (
    tutor: Tutor,
    question: string,
    userAnswer: string,
    correctAnswer: string,
    provider: AIProvider = 'gemini',
    apiKey?: string,
    modelName: string = 'gemini-2.5-flash',
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

    console.log(`🧠 Calling Tutor ${tutor.name} for explanation via ${provider}...`);

    const result = await callAI(
        {
            provider,
            apiKey,
            modelName,
            apiUrl,
            maxTokens: 300,
            temperature: 0.7,
            jsonMode: false,
        },
        // Injecter le systemPrompt du tuteur dans le prompt utilisateur
        // (callAI gère le system via les messages — ici on fusionne pour la compatibilité Gemini)
        `[Persona System]: ${tutor.systemPrompt}\n\n${prompt}`
    );

    // Nettoyage éventuel (parfois l'IA met des guillemets)
    return result.text.replace(/^"|"$/g, '').trim();
};
