
// Réutilisation de la logique existante mais côté serveur
// Note: On n'utilise pas le SDK Google GenAI Node ici directement pour le speech 
// car le format "REST" est souvent plus simple pour le streaming binaire, 
// mais nous allons utiliser fetch vers l'endpoint REST de Google.

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_API_KEY;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server configuration error: API Key missing' });
    }

    try {
        const { text, voiceName } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Appel direct à l'API REST Google Gemini pour éviter les dépendances lourdes si possible
        // ou utilisation d'un endpoint spécifique si disponible.
        // Pour l'instant, simulons l'appel correct ou utilisons une URL connue.
        // Note: L'API Gemini standard n'a pas toujours de endpoint "speech" public simple documenté 
        // comme OpenAI. Cependant, si vous utilisiez Rust avant, vous aviez probablement une logique spécifique.
        
        // HYPOTHÈSE: Vous utilisiez le modèle "Gemini" pour générer du texte, 
        // MAIS pour l'audio, utilisiez-vous une autre API Google (Google Cloud TTS) ou Gemini Multimodal ?
        // D'après votre code Rust (que je ne vois pas mais devine), vous semblez utiliser une feature TTS.
        
        // Si c'est Google Cloud TTS standard :
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: { text },
                voice: { languageCode: 'fr-FR', name: voiceName || 'fr-FR-Neural2-A' }, // Simplification pour le POC
                audioConfig: { audioEncoding: 'MP3' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API Error: ${errorText}`);
        }

        const data = await response.json();
        
        // Google renvoie l'audio en base64 dans data.audioContent
        if (data.audioContent) {
            const audioBuffer = Buffer.from(data.audioContent, 'base64');
            res.setHeader('Content-Type', 'audio/mpeg');
            res.status(200).send(audioBuffer);
        } else {
            throw new Error('No audio content received');
        }

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: error.message });
    }
}
