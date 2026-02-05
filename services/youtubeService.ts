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
 * Extraction manuelle des transcriptions via Tauri HTTP (bypass CORS)
 */
async function fetchTranscriptCustom(videoId: string): Promise<{ text: string; language: string } | null> {
    try {
        const { fetch: tauriFetch } = await import('@tauri-apps/api/http');
        
        // 1. Récupération de la page vidéo pour trouver les captionTracks
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await tauriFetch(url, { 
            method: 'GET', 
            responseType: 1, // Text
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (!response.ok) return null;
        
        const html = response.data as string;
        
        // Recherche de la configuration des légendes
        // On cherche le bloc JSON qui contient captionTracks dans ytInitialPlayerResponse
        const configRegex = /"captionTracks":\s*(\[.*?\])/;
        const match = html.match(configRegex);
        
        if (!match || !match[1]) {
            return null;
        }
        
        const captionTracks = JSON.parse(match[1]);
        if (!Array.isArray(captionTracks) || captionTracks.length === 0) return null;
        
        // Priorité: FR -> EN -> Premier disponible
        const track = captionTracks.find((t: any) => t.languageCode === 'fr') || 
                      captionTracks.find((t: any) => t.languageCode === 'en') || 
                      captionTracks[0];
                      
        if (!track || !track.baseUrl) return null;
        
        // 2. Chargement du XML de transcription (YouTube retourne souvent du JSON ou XML selon le baseUrl)
        const xmlResponse = await tauriFetch(track.baseUrl, { method: 'GET', responseType: 1 });
        if (!xmlResponse.ok) return null;
        
        const content = xmlResponse.data as string;
        
        // 3. Parsing (YouTube renvoie souvent du XML avec des balises <text>)
        let transcriptText = "";
        
        if (content.startsWith('<?xml') || content.includes('<transcript>')) {
            const textNodes = content.match(/<text.*?>.*?<\/text>/g) || [];
            transcriptText = textNodes
                .map(node => {
                    const txt = node.match(/>(.*?)<\/text>/);
                    return txt ? txt[1] : '';
                })
                .join(' ');
        } else {
            // Tentative parsing JSON si c'est le format
            try {
                const data = JSON.parse(content);
                if (data.events) {
                    transcriptText = data.events
                        .filter((e: any) => e.segs)
                        .map((e: any) => e.segs.map((s: any) => s.utf8).join(''))
                        .join(' ');
                }
            } catch (e) {
                transcriptText = content; // Fallback brute
            }
        }
            
        // Nettoyage final
        const cleanedText = transcriptText
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
            
        return cleanedText.length > 50 ? { text: cleanedText, language: track.languageCode } : null;
        
    } catch (error) {
        console.error('[YouTubeService] Custom Tauri extraction failed:', error);
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
