import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function pour l'extraction de transcriptions YouTube
 * Avantages:
 * - Pas de CORS (côté serveur)
 * - Meilleure gestion des User-Agents
 * - Peut utiliser des bibliothèques Node.js complètes
 * - Cache possible via Vercel Edge
 */

interface TranscriptResponse {
    success: boolean;
    transcript?: string;
    language?: string;
    wordCount?: number;
    error?: string;
    method?: string;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
): Promise<void> {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { videoId } = req.query;

    if (!videoId || typeof videoId !== 'string') {
        res.status(400).json({
            success: false,
            error: 'Missing or invalid videoId parameter'
        } as TranscriptResponse);
        return;
    }

    console.log(`[YouTube Transcript API] Processing video: ${videoId}`);

    try {
        // Stratégie 1: Utiliser youtube-transcript (bibliothèque Node.js)
        const transcript = await extractWithLibrary(videoId);
        if (transcript) {
            res.status(200).json(transcript);
            return;
        }

        // Stratégie 2: Extraction custom via fetch direct
        const customTranscript = await extractCustom(videoId);
        if (customTranscript) {
            res.status(200).json(customTranscript);
            return;
        }

        // Aucune méthode n'a fonctionné
        res.status(404).json({
            success: false,
            error: 'No transcript available for this video'
        } as TranscriptResponse);

    } catch (error: any) {
        console.error('[YouTube Transcript API] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        } as TranscriptResponse);
    }
}

/**
 * Stratégie 1: Utiliser la bibliothèque youtube-transcript
 */
async function extractWithLibrary(videoId: string): Promise<TranscriptResponse | null> {
    try {
        // Import dynamique pour éviter les erreurs si le package n'est pas installé
        const { YoutubeTranscript } = await import('youtube-transcript');

        // Essayer français d'abord
        try {
            const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'fr' });
            if (items && items.length > 0) {
                const text = items.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
                return {
                    success: true,
                    transcript: text,
                    language: 'fr',
                    wordCount: text.split(/\s+/).length,
                    method: 'library-fr'
                };
            }
        } catch (frError) {
            // Essayer anglais
            try {
                const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
                if (items && items.length > 0) {
                    const text = items.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
                    return {
                        success: true,
                        transcript: text,
                        language: 'en',
                        wordCount: text.split(/\s+/).length,
                        method: 'library-en'
                    };
                }
            } catch (enError) {
                // Essayer auto
                const items = await YoutubeTranscript.fetchTranscript(videoId);
                if (items && items.length > 0) {
                    const text = items.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
                    return {
                        success: true,
                        transcript: text,
                        language: 'auto',
                        wordCount: text.split(/\s+/).length,
                        method: 'library-auto'
                    };
                }
            }
        }
    } catch (error) {
        console.log('[Library Strategy] Failed:', error);
    }
    return null;
}

/**
 * Stratégie 2: Extraction custom avec fetch direct
 */
async function extractCustom(videoId: string): Promise<TranscriptResponse | null> {
    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // User-Agent rotatif pour éviter la détection
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ];
        
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

        const response = await fetch(videoUrl, {
            headers: {
                'User-Agent': randomUA,
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Cookie': 'CONSENT=YES+cb.20230531-17-p0.fr+FX+999; PREF=hl=fr&gl=FR;'
            }
        });

        if (!response.ok) {
            console.log('[Custom Strategy] HTTP Error:', response.status);
            return null;
        }

        const html = await response.text();

        // Extraction des caption tracks
        let captionTracks: any[] = [];

        // Recherche fuzzy de l'URL timedtext
        const fuzzyRegex = /"(https:\/\/[^"]+api\/timedtext[^"]+)"/g;
        const matches = html.match(fuzzyRegex);

        if (matches && matches.length > 0) {
            // Chercher une piste française en priorité
            const frMatch = matches.find(m => m.includes('lang=fr') || m.includes('lang=FR'));
            const urlMatch = frMatch || matches[0];
            const cleanUrl = urlMatch.replace(/"/g, '').replace(/\\u0026/g, '&').replace(/\\/g, '');

            // Télécharger la transcription
            const transcriptResponse = await fetch(cleanUrl + '&fmt=json3');
            if (transcriptResponse.ok) {
                const content = await transcriptResponse.text();
                
                try {
                    // Parser JSON3
                    const data = JSON.parse(content);
                    if (data.events) {
                        const text = data.events
                            .filter((e: any) => e.segs)
                            .map((e: any) => e.segs.map((s: any) => s.utf8).join(''))
                            .join(' ')
                            .replace(/\s+/g, ' ')
                            .trim();

                        if (text.length > 50) {
                            return {
                                success: true,
                                transcript: text,
                                language: cleanUrl.includes('lang=fr') ? 'fr' : 'auto',
                                wordCount: text.split(/\s+/).length,
                                method: 'custom-json3'
                            };
                        }
                    }
                } catch (e) {
                    // Fallback XML
                    const textNodes = content.match(/<text.*?>([\s\S]*?)<\/text>/g) || [];
                    const text = textNodes
                        .map(node => node.replace(/<[^>]+>/g, '')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&#39;/g, "'")
                            .replace(/&quot;/g, '"'))
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();

                    if (text.length > 50) {
                        return {
                            success: true,
                            transcript: text,
                            language: 'auto',
                            wordCount: text.split(/\s+/).length,
                            method: 'custom-xml'
                        };
                    }
                }
            }
        }
    } catch (error) {
        console.log('[Custom Strategy] Failed:', error);
    }
    return null;
}
