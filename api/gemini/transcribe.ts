import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit } from '../_rateLimit';

// Note : les variables VITE_* ne sont PAS disponibles dans les fonctions serverless Vercel.
// Il faut configurer GEMINI_API_KEY (sans préfixe) dans le dashboard Vercel > Settings > Environment Variables.
const BACKEND_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.VITE_GEMINI_API_KEY ||
  process.env.VITE_API_KEY ||
  process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * /api/gemini/transcribe
 *
 * Transcrit un fichier audio en texte via l'API Gemini multimodale.
 * Utilisé comme fallback pour iOS PWA (iPad) où webkitSpeechRecognition
 * est instable ou bloqué.
 *
 * Body attendu : { audioBase64: string, mimeType: string, language: string, apiKey?: string }
 * Réponse : { transcript: string }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ──────────────────────────────────────────────────────────────────
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

  // ── Wrapper global pour garantir une réponse JSON même si tout plante ────
  try {
    // Rate limiting
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please wait before retrying.' });
    }

    // ── Validation du body ────────────────────────────────────────────────
    if (!req.body || typeof req.body !== 'object') {
      console.error('[Transcribe] req.body is null or not an object:', typeof req.body);
      return res.status(400).json({
        error: 'Request body is missing or invalid. The audio may be too large (>4MB). Try a shorter recording.',
      });
    }

    const { audioBase64, mimeType, language, apiKey: requestApiKey } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      language?: string;
      apiKey?: string;
    };

    const API_KEY = requestApiKey || BACKEND_API_KEY;

    if (!API_KEY) {
      console.error('[Transcribe] No API key available. requestApiKey:', !!requestApiKey, 'BACKEND:', !!BACKEND_API_KEY);
      // Message d'erreur explicite pour guider l'utilisateur
      return res.status(500).json({
        error: 'Clé API Gemini manquante pour la transcription audio. ' +
               'Sur iPad/iPhone avec OpenRouter, vous devez aussi configurer une clé API Gemini ' +
               'dans Paramètres > IA pour activer la reconnaissance vocale. ' +
               '(La transcription audio utilise toujours Gemini, quel que soit le fournisseur IA choisi.)',
        code: 'MISSING_GEMINI_KEY',
      });
    }

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    // ── Vérification taille (base64 ~= 4/3 * taille originale) ───────────
    const estimatedSizeKB = (audioBase64.length * 0.75) / 1024;
    console.log(`[Transcribe] Audio size estimate: ${estimatedSizeKB.toFixed(0)} KB, mimeType: ${mimeType}, lang: ${language}`);

    if (estimatedSizeKB > 10 * 1024) {
      return res.status(413).json({ error: 'Audio too large (>10MB). Please make a shorter recording.' });
    }

    // Safari/iOS envoie audio/mp4 → Gemini attend audio/aac ou audio/mp4
    // On garde audio/mp4 car Gemini 1.5 Flash le supporte directement
    const audioMimeType = mimeType || 'audio/mp4';
    const lang = language || 'fr-FR';

    // ── Prompt de transcription ───────────────────────────────────────────
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

    // ── Appel Gemini REST API ─────────────────────────────────────────────
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

    const geminiBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: audioMimeType,
                data: audioBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1000,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[Transcribe] Gemini API error:', geminiResponse.status, errorText.slice(0, 500));
      return res.status(502).json({
        error: `Gemini API error ${geminiResponse.status}`,
        details: errorText.slice(0, 300),
      });
    }

    const data = await geminiResponse.json();
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    console.log(`[Transcribe] Success — lang: ${lang}, transcript: "${transcript.slice(0, 100)}"`);
    return res.status(200).json({ transcript });

  } catch (err: any) {
    // Catch-all : garantit toujours une réponse JSON même pour les erreurs inattendues
    console.error('[Transcribe] Unhandled error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
