import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const bodyApiKey = req.body?.apiKey;
    // Priorité à la clé envoyée par le client (paramètres utilisateur), sinon fallback sur .env
    const finalApiKey = (bodyApiKey || API_KEY || '').trim();

    if (!finalApiKey) {
        console.error("❌ Aucune clé API trouvée (ni dans body, ni dans env)");
        return res.status(500).json({ error: 'Configuration server error: Missing API Key (Env or Client)' });
    }
    
    // Utiliser la clé finale
    const apiKey = finalApiKey;

    try {
        const { topic, context, count, difficulty, sourceLang, targetLang, modelName, prompt: directPrompt } = req.body;

        // Le prompt peut être fourni directement (par le service) ou construit ici.
        // Pour garder la logique consistante avec le frontend Tauri, le mieux est que le frontend envoie le prompt complet déjà construit.
        
        // Si le frontend a envoyé un "prompt" complet, on l'utilise.
        // Sinon, on le construit (logique de fallback).
        
        let finalPrompt = directPrompt;

        if (!finalPrompt && topic) {
             finalPrompt = `
Génère ${count || 10} flashcards bilingues pour apprendre le vocabulaire/concept suivant : "${topic}".
Langue Source (Question) : ${sourceLang || 'fr'}
Langue Cible (Réponse) : ${targetLang || 'en'}
Niveau : ${difficulty || 'intermediate'}
Contexte : ${context || ''}

Format attendu : JSON brut (Tableau d'objets)
[
  {
    "type": "classic",
    "terms": {
      "${sourceLang || 'fr'}": "Mot/Question",
      "${targetLang || 'en'}": "Traduction/Réponse"
    }
  }
]
Ne mets rien d'autre que le JSON.
`;
        }
        
        if (!finalPrompt) {
             return res.status(400).json({ error: 'Prompt or Topic is required' });
        }

        const model = modelName || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: finalPrompt }] }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No text generated from Gemini');
        }

        // Nettoyage basique du JSON markdown si présent
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Tentative de parsing pour valider (optionnel mais recommandé)
        try {
            const parsed = JSON.parse(cleanText);
            res.status(200).json(parsed);
        } catch (e) {
             // Si le parsing échoue, on renvoie le texte brut ou une erreur, 
             // mais ici on renvoie le texte pour que le frontend gère (comme le frontend Tauri le fait avec fileParser)
             // Cependant le frontend s'attend à recevoir des cartes JSON parsées ou une string à parser.
             // Pour simplifier l'intégration avec le service existant qui attend souvent une string brute :
             res.status(200).json({ text: cleanText }); 
        }

    } catch (error: any) {
        console.error('Quiz API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
