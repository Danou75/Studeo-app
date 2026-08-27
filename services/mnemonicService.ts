import { Tutor, AIProvider } from '../types';
import { callAI } from './aiClient';

export const generateMnemonic = async (
    tutor: Tutor | null,
    question: string,
    answer: string,
    provider: AIProvider = 'gemini',
    apiKey?: string,
    modelName: string = 'gemini-2.5-flash',
    apiUrl?: string
): Promise<string> => {
    
    const tutorStyle = tutor ? `Agis en tant que ${tutor.name}, ${tutor.description}. Utilise ton style caractéristique.` : "Sois créatif et ludique.";

    const prompt = `
    ${tutorStyle}
    
    TA MISSION : Générer un moyen mnémotechnique PUISSANT pour aider un étudiant à retenir cette information.
    
    INFO À RETENIR :
    Question : "${question}"
    Réponse : "${answer}"
    
    Techniques possibles :
    - Acronyme
    - Rime courte
    - Phrase loufoque (Palais mental)
    - Association d'idées
    
    Génère une seule astuce, courte (max 2 phrases), facile à mémoriser.
    Ta réponse doit commencer par une icône pertinente (ex: 🧠, 🎵, 🏰).
    Ne donne pas d'explications superflues, juste l'astuce.
    `;

    console.log(`🧠 Generating Mnemonic with ${provider}...`);

    const result = await callAI(
        {
            provider,
            apiKey,
            modelName,
            apiUrl,
            maxTokens: 200,
            temperature: 0.8,
            jsonMode: false,
        },
        prompt
    );

    return result.text.trim();
};
