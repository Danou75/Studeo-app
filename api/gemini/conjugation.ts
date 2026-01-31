
const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_API_KEY;

export default async function handler(req, res) {
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

    const { prompt, modelName, apiKey: clientApiKey } = req.body;
    
    // Priorité à la clé client
    const finalApiKey = (clientApiKey || API_KEY || '').trim();

    if (!finalApiKey) {
        console.error("❌ Aucune clé API trouvée pour la conjugaison");
        return res.status(500).json({ error: 'Server config error: Missing API Key' });
    }

    try {
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Utilisation du SDK Google GenAI pour Node
        // const ai = new GoogleGenAI({ apiKey: finalApiKey });
        // Utilisation générique compatible (adapter selon SDK exact installé)
        
        // Note: Pour Vercel Serverless, un fetch REST manuel est souvent plus stable
        // qu'un SDK lourd, mais essayons d'utiliser l'URL REST directe comme pour le TTS
        // si le SDK pose problème, sinon SDK.
        
        // Tentative REST directe pour être sûr (compatible Gemini 1.5/2.0)
        // URL: https://generativelanguage.googleapis.com/v1beta/models/[MODEL]:generateContent?key=[KEY]
        
        const model = modelName || 'gemini-2.0-flash-exp';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalApiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
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

        res.status(200).json({ text });

    } catch (error) {
        console.error('Conjugation API Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
