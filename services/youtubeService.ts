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
        
        // Stratégie A: Bibliothèque standard (youtube-transcript)
        try {
            console.log('[YouTubeService] 📝 Attempting transcript extraction with youtube-transcript...');
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

        // Stratégie B: Fallback custom via Tauri HTTP (bypass CORS) si la première a échoué
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
 * Extraction manuelle des transcriptions via l'API interne InnerTube de YouTube
 * C'est la méthode la plus robuste (équivalente à ce que fait DownSub en interne)
 */
async function fetchTranscriptCustom(videoId: string): Promise<{ text: string; language: string } | null> {
    try {
        const { fetch: tauriFetch } = await import('@tauri-apps/api/http');
        
        // 1. Récupération des secrets API depuis la page vidéo
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const pageResponse = await tauriFetch(videoUrl, { 
            method: 'GET', 
            responseType: 1,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!pageResponse.ok) return null;
        const html = pageResponse.data as string;

        // Extraction de l'API Key
        const apiKeyMatch = html.match(/"innertubeApiKey":"([^"]+)"/);
        if (!apiKeyMatch) return null;
        const apiKey = apiKeyMatch[1];

        // Extraction du contexte client
        const clientContextMatch = html.match(/"INNERTUBE_CONTEXT":({.+?})/);
        let clientContext = null;
        if (clientContextMatch) {
            try {
                clientContext = JSON.parse(clientContextMatch[1]);
            } catch (e) {}
        }
        
        // Si on n'a pas le contexte complet, on en fabrique un minimal (souvent suffisant)
        if (!clientContext) {
            clientContext = {
                client: {
                    hl: 'fr',
                    gl: 'FR',
                    clientName: 'WEB',
                    clientVersion: '2.20240201.01.00'
                }
            };
        }

        // 2. Récupération de l'ID de la transcription (params)
        // On cherche le jeton de transcription dans ytInitialPlayerResponse
        const playerResponseRegex = /ytInitialPlayerResponse\s*=\s*({.+?});\s*(?:var|window|const)/s;
        const playerMatch = html.match(playerResponseRegex);
        if (!playerMatch) return null;
        
        const playerResponse = JSON.parse(playerMatch[1]);
        const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
        
        if (!captions || !captions.captionTracks) return null;
        
        // Trouver la piste FR ou EN
        const track = captions.captionTracks.find((t: any) => t.languageCode === 'fr') || 
                      captions.captionTracks.find((t: any) => t.languageCode === 'en') || 
                      captions.captionTracks[0];
                      
        if (!track) return null;

        // 3. Appel direct à l'API de transcription InnerTube
        // NOTE: On utilise le baseUrl du track qui contient déjà tous les jetons nécessaires
        const transcriptUrl = track.baseUrl + '&fmt=json3';
        
        const transcriptResponse = await tauriFetch(transcriptUrl, {
            method: 'GET',
            responseType: 1
        });

        if (!transcriptResponse.ok) return null;
        const data = JSON.parse(transcriptResponse.data as string);

        if (!data.events) return null;

        // 4. Assemblage du texte
        const transcriptText = data.events
            .filter((e: any) => e.segs)
            .map((e: any) => e.segs.map((s: any) => s.utf8).join(''))
            .join(' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();

        return transcriptText.length > 50 ? { text: transcriptText, language: track.languageCode } : null;

    } catch (error) {
        console.error('[YouTubeService] InnerTube extraction failed:', error);
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
