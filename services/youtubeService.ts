/**
 * Service robuste pour l'extraction de transcriptions et métadonnées YouTube
 * 
 * Architecture:
 * 1. Extraction du Video ID
 * 2. Récupération des métadonnées (titre, auteur, durée)
 * 3. Extraction de la transcription (avec multiples stratégies de fallback)
 * 4. Nettoyage et formatage du texte
 */

export interface YouTubeMetadata {
    videoId: string;
    title: string;
    author: string;
    duration: number; // en secondes
    thumbnail: string;
}

export interface YouTubeAnalysis {
    metadata: YouTubeMetadata;
    transcript: string | null;
    hasTranscript: boolean;
    language: string | null;
    wordCount: number;
}

/**
 * Fonction principale: Analyse complète d'une vidéo YouTube
 */
export async function analyzeYouTubeVideo(url: string): Promise<YouTubeAnalysis | null> {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            console.error('[YouTubeService] Invalid URL - cannot extract video ID');
            return null;
        }

        console.log(`[YouTubeService] 🎬 Starting analysis for video: ${videoId}`);

        // Étape 1: Récupération des métadonnées
        const metadata = await fetchMetadata(videoId);
        if (!metadata) {
            console.error('[YouTubeService] Failed to fetch metadata');
            return null;
        }

        console.log(`[YouTubeService] ✅ Metadata retrieved: "${metadata.title}"`);

        // Étape 2: Tentative d'extraction de la transcription
        let transcriptResult: { text: string; language: string } | null = null;
        
        // Stratégie A: Endpoint Serverless Vercel (PRIORITAIRE - Plus robuste)
        try {
            console.log('[YouTubeService] 🌐 Attempting transcript extraction via Vercel serverless endpoint...');
            
            // Déterminer l'URL de base selon l'environnement
            const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:3000'
                : window.location.origin; // Utilise l'origine actuelle pour éviter les problèmes CORS
            
            const response = await fetch(`${baseUrl}/api/youtube-transcript?videoId=${videoId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.transcript) {
                    transcriptResult = { 
                        text: data.transcript, 
                        language: data.language || 'auto' 
                    };
                    console.log(`[YouTubeService] ✅ Serverless extraction successful (${data.method})`);
                }
            } else {
                console.warn('[YouTubeService] Serverless endpoint returned:', response.status);
            }
        } catch (error) {
            console.warn('[YouTubeService] Serverless strategy failed:', error);
        }
        
        // Stratégie B: Bibliothèque standard (youtube-transcript) - Fallback
        if (!transcriptResult) {
            try {
                console.log('[YouTubeService] 📝 Attempting transcript extraction with youtube-transcript library...');
                const { YoutubeTranscript } = await import('youtube-transcript');
                
                try {
                    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'fr' });
                    if (items && items.length > 0) {
                        const text = items.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
                        transcriptResult = { text, language: 'fr' };
                    }
                } catch (frError) {
                    try {
                        const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
                        if (items && items.length > 0) {
                            const text = items.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
                            transcriptResult = { text, language: 'en' };
                        }
                    } catch (enError) {
                        try {
                            const items = await YoutubeTranscript.fetchTranscript(videoId);
                            if (items && items.length > 0) {
                                const text = items.map((item: any) => item.text).join(' ').replace(/\s+/g, ' ').trim();
                                transcriptResult = { text, language: 'auto' };
                            }
                        } catch (autoError) {
                            // On laisse tomber pour cette stratégie
                        }
                    }
                }
            } catch (error) {
                console.warn('[YouTubeService] Library strategy failed:', error);
            }
        }

        // Stratégie C: Fallback custom via Tauri HTTP (Desktop uniquement)
        if (!transcriptResult && typeof window !== 'undefined' && (window as any).__TAURI__) {
            try {
                console.log('[YouTubeService] 🚀 Attempting custom fallback extraction via Tauri HTTP...');
                transcriptResult = await fetchTranscriptCustom(videoId);
            } catch (fallbackError) {
                console.error('[YouTubeService] Custom fallback failed:', fallbackError);
            }
        }
        
        const analysis: YouTubeAnalysis = {
            metadata,
            transcript: transcriptResult?.text || null,
            hasTranscript: !!transcriptResult?.text,
            language: transcriptResult?.language || null,
            wordCount: transcriptResult?.text ? transcriptResult.text.split(/\s+/).length : 0
        };

        if (analysis.hasTranscript) {
            console.log(`[YouTubeService] ✅ Transcript extracted: ${analysis.wordCount} words (${analysis.language})`);
        } else {
            console.warn('[YouTubeService] ⚠️ No transcript available - will use metadata only');
        }

        return analysis;

    } catch (error) {
        console.error('[YouTubeService] Fatal error during analysis:', error);
        return null;
    }
}

/**
 * Récupération des métadonnées via oEmbed API
 */
async function fetchMetadata(videoId: string): Promise<YouTubeMetadata | null> {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    
    try {
        // Tentative avec Tauri (desktop)
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
            try {
                const { fetch: tauriFetch, ResponseType } = await import('@tauri-apps/api/http');
                const response = await tauriFetch(oembedUrl, {
                    method: 'GET',
                    responseType: ResponseType.JSON
                });
                
                if (response.ok && response.data) {
                    const data = response.data as any;
                    return {
                        videoId,
                        title: data.title || 'Untitled Video',
                        author: data.author_name || 'Unknown',
                        duration: 0, // oEmbed ne fournit pas la durée
                        thumbnail: data.thumbnail_url || ''
                    };
                }
            } catch (err) {
                console.warn('[YouTubeService] Tauri metadata fetch failed, trying standard fetch');
            }
        }

        // Fallback: fetch standard
        const response = await fetch(oembedUrl);
        if (!response.ok) return null;
        
        const data = await response.json();
        return {
            videoId,
            title: data.title || 'Untitled Video',
            author: data.author_name || 'Unknown',
            duration: 0,
            thumbnail: data.thumbnail_url || ''
        };

    } catch (error) {
        console.error('[YouTubeService] Metadata fetch error:', error);
        return null;
    }
}

/**
 * Extraction du Video ID depuis différents formats d'URL YouTube
 */
function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            const videoId = match[1];
            console.log(`[YouTubeService] ✅ Extracted Video ID: ${videoId}`);
            return videoId;
        }
    }

    console.error(`[YouTubeService] ❌ Failed to extract Video ID from: ${url}`);
    return null;
}

/**
 * Extraction "Quantum" des transcriptions
 * Bascule sur la version mobile de YouTube (souvent moins protégée) et scanne les flux bruts.
 */
async function fetchTranscriptCustom(videoId: string): Promise<{ text: string; language: string } | null> {
    try {
        const { fetch: tauriFetch } = await import('@tauri-apps/api/http');
        
        console.log(`[YouTubeService] 🌌 Quantum Extraction for ID: ${videoId}`);
        
        // On tente la version MOBILE qui est souvent plus "ouverte" aux scrapers
        const mobileUrl = `https://m.youtube.com/watch?v=${videoId}`;
        const response = await tauriFetch(mobileUrl, { 
            method: 'GET', 
            responseType: 1,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
                'Accept-Language': 'fr-FR,fr;q=0.9',
                'Cookie': 'CONSENT=YES+cb.20230531-17-p0.fr+FX+999; PREF=hl=fr&gl=FR;'
            }
        });

        if (!response.ok) return null;
        const html = response.data as string;

        // Diagnostic: Si on voit "consent" ou "robot", on est bloqué
        if (html.includes('consent.youtube.com') || html.includes('captcha')) {
            console.warn('[YouTubeService] ⚠️ Detection bot ou page de consentement détectée');
        }

        let transcriptUrl = null;

        // STRATÉGIE 1 : Recherche ultra-large de l'URL timedtext dans la source brute (Fuzzy matching)
        // YouTube injecte souvent l'URL de base dans des scripts de config
        const fuzzyTimedTextRegex = /"https:\/\/[^"]+api\/timedtext[^"]+"/g;
        const matches = html.match(fuzzyTimedTextRegex);
        
        if (matches) {
            // On cherche de préférence une piste française
            const frMatch = matches.find(m => m.includes('lang=fr') || m.includes('lang=FR'));
            const anyMatch = frMatch || matches[0];
            transcriptUrl = anyMatch.replace(/"/g, '').replace(/\\u0026/g, '&').replace(/\\/g, '');
            console.log('[YouTubeService] Found transcript URL via fuzzy matching');
        }

        // STRATÉGIE 2 : Extraction par blocs JSON (Mobile version structure)
        if (!transcriptUrl) {
            const jsonRegex = /"captions":\s*({.+?})\s*,\s*"videoDetails"/s;
            const match = html.match(jsonRegex);
            if (match) {
                try {
                    const captions = JSON.parse(match[1]);
                    const track = captions.playerCaptionsTracklistRenderer?.captionTracks?.find((t: any) => t.languageCode === 'fr') || 
                                  captions.playerCaptionsTracklistRenderer?.captionTracks?.[0];
                    if (track?.baseUrl) transcriptUrl = track.baseUrl;
                } catch (e) {}
            }
        }

        if (!transcriptUrl) {
            console.error('[YouTubeService] ❌ Toutes les stratégies Quantum ont échoué');
            return null;
        }

        // 3. Téléchargement du texte final
        const finalUrl = transcriptUrl.includes('fmt=json3') ? transcriptUrl : `${transcriptUrl}&fmt=json3`;
        const textResponse = await tauriFetch(finalUrl, { method: 'GET', responseType: 1 });

        if (!textResponse.ok) return null;
        const content = textResponse.data as string;

        // 4. Parsing (JSON3 ou XML)
        let transcriptText = "";
        try {
            const data = JSON.parse(content);
            if (data.events) {
                transcriptText = data.events
                    .filter((e: any) => e.segs)
                    .map((e: any) => e.segs.map((s: any) => s.utf8).join(''))
                    .join(' ');
            }
        } catch (e) {
            const textNodes = content.match(/<text.*?>([\s\S]*?)<\/text>/g) || [];
            transcriptText = textNodes.map(node => node.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"')).join(' ');
        }

        const cleaned = transcriptText.replace(/\s+/g, ' ').trim();
        if (cleaned.length < 50) return null;

        console.log(`[YouTubeService] ✅ Quantum Extraction Success (${cleaned.length} chars)`);
        return { text: cleaned, language: 'auto' };

    } catch (error) {
        console.error('[YouTubeService] Quantum extraction fatal error:', error);
        return null;
    }
}

/**
 * Fonction legacy pour compatibilité (à supprimer progressivement)
 * @deprecated Utilisez analyzeYouTubeVideo() à la place
 */
export async function getYouTubeTranscript(url: string): Promise<string | null> {
    const analysis = await analyzeYouTubeVideo(url);
    return analysis?.transcript || null;
}
