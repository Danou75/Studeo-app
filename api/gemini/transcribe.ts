import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash'; // Fallback sur 1.5 flash pour de meilleurs quotas de rate-limit (anti-429)

/**
 * /api/gemini/transcribe
 *
 * Transcrit un fichier audio en texte via l'API Gemini multimodale.
 * Utilisé comme fallback pour iOS PWA (iPad Air 2) où webkitSpeechRecognition
 * est bloqué en mode standalone (service-not-allowed).
 *
 * Body attendu : { audioBase64: string, mimeType: string, language: string, apiKey?: string }
 * Réponse : { transcript: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
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

  const { audioBase64, mimeType, language, apiKey: requestApiKey } = req.body;
  const API_KEY = requestApiKey || BACKEND_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  if (!audioBase64) {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }

  const audioMimeType = mimeType || 'audio/webm';
  const lang = language || 'fr-FR';

  // Construire le prompt pour guider Gemini à transcrire
  const languageHint = lang.startsWith('fr') ? 'français' :
                       lang.startsWith('en') ? 'English' :
                       lang.startsWith('es') ? 'español' :
                       lang.startsWith('de') ? 'Deutsch' :
                       lang.startsWith('it') ? 'italiano' :
                       lang.startsWith('pt') ? 'português' :
                       lang.startsWith('zh') ? 'Chinese' :
                       lang.startsWith('ja') ? 'Japanese' :
                       lang.startsWith('ar') ? 'Arabic' : lang;

  const prompt = `Transcris exactement ce qui est dit dans cet enregistrement audio en ${languageHint}. 
Retourne UNIQUEMENT la transcription, sans ponctuation superflue, sans explication, sans guillemets. 
Si rien n'est audible ou le silence est total, retourne une chaîne vide.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const body = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: audioMimeType,
                data: audioBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,       // On veut une transcription fidèle, pas créative
        maxOutputTokens: 500, // Une réponse courte suffit
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcribe] Gemini API error:', errorText);
      return res.status(502).json({ error: `Gemini API error: ${response.status}`, details: errorText });
    }

    const data = await response.json();
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    console.log(`[Transcribe] Success — lang: ${lang}, transcript: "${transcript}"`);
    return res.status(200).json({ transcript });

  } catch (err: any) {
    console.error('[Transcribe] Internal error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
