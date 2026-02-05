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
 * Extraction "Battle-Tested" des transcriptions
 * Utilise un algorithme de matching d'accolades pour extraire les JSON complexes
 */
async function fetchTranscriptCustom(videoId: string): Promise<{ text: string; language: string } | null> {
    try {
        const { fetch: tauriFetch } = await import('@tauri-apps/api/http');
        
        console.log(`[YouTubeService] 🚀 Starting Forced Extraction for ${videoId}...`);
        
        // 1. Récupération de la page vidéo
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const pageResponse = await tauriFetch(videoUrl, { 
            method: 'GET', 
            responseType: 1,
            headers: {
                // User-Agent de crawler moderne pour éviter les pages de consentement trop agressives
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        if (!pageResponse.ok) {
            console.error('[YouTubeService] ❌ Failed to fetch video page');
            return null;
        }
        
        const html = pageResponse.data as string;
        let captionTracks: any[] = [];

        // Fonction helper pour extraire un JSON proprement en gérant les accolades imbriquées
        const extractJson = (content: string, startKey: string): any => {
            const index = content.indexOf(startKey);
            if (index === -1) return null;
            
            let startPos = index + startKey.length;
            // On cherche le début de l'objet {
            while (startPos < content.length && content[startPos] !== '{') startPos++;
            if (startPos >= content.length) return null;
            
            let braceCount = 0;
            let endPos = startPos;
            let inString = false;
            let escape = false;
            
            for (let i = startPos; i < content.length; i++) {
                const char = content[i];
                if (escape) { escape = false; continue; }
                if (char === '\\') { escape = true; continue; }
                if (char === '"') { inString = !inString; continue; }
                if (inString) continue;
                
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                
                if (braceCount === 0) {
                    endPos = i + 1;
                    break;
                }
            }
            
            try {
                const jsonStr = content.substring(startPos, endPos);
                return JSON.parse(jsonStr);
            } catch (e) {
                return null;
            }
        };

        // Stratégie A: Recherche dans ytInitialPlayerResponse
        console.log('[YouTubeService] Strategy A: Checking ytInitialPlayerResponse...');
        const playerResponse = extractJson(html, 'ytInitialPlayerResponse =');
        if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
            captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
            console.log(`[YouTubeService] Found ${captionTracks.length} tracks in playerResponse`);
        }

        // Stratégie B: Recherche dans ytInitialData
        if (captionTracks.length === 0) {
            console.log('[YouTubeService] Strategy B: Checking ytInitialData...');
            const initialData = extractJson(html, 'ytInitialData =');
            // Parfois caché très profondément dans initialData pour certains formats
            if (initialData) {
                // Recherche récursive simplifiée pour captionTracks
                const findCaptionTracks = (obj: any): any[] | null => {
                    if (!obj || typeof obj !== 'object') return null;
                    if (Array.isArray(obj)) {
                        for (const item of obj) {
                            const res = findCaptionTracks(item);
                            if (res) return res;
                        }
                    } else {
                        if (obj.captionTracks) return obj.captionTracks;
                        for (const key in obj) {
                            const res = findCaptionTracks(obj[key]);
                            if (res) return res;
                        }
                    }
                    return null;
                };
                captionTracks = findCaptionTracks(initialData) || [];
                if (captionTracks.length > 0) console.log(`[YouTubeService] Found ${captionTracks.length} tracks in initialData`);
            }
        }

        // Stratégie C: Recherche brute de l'URL timedtext
        if (captionTracks.length === 0) {
            console.log('[YouTubeService] Strategy C: Brute shell scan for timedtext URLs...');
            const baseUrlRegex = /"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/g;
            let match;
            while ((match = baseUrlRegex.exec(html)) !== null) {
                const url = match[1].replace(/\\u0026/g, '&');
                captionTracks.push({ baseUrl: url, languageCode: 'unknown' });
            }
        }

        if (captionTracks.length === 0) {
            console.error('[YouTubeService] ❌ No caption tracks found by any strategy');
            return null;
        }

        // 2. Sélection de la meilleure piste
        // On cherche: FR -> EN -> auto
        const track = captionTracks.find(t => t.languageCode === 'fr') || 
                      captionTracks.find(t => t.languageCode === 'en') || 
                      captionTracks[0];

        if (!track || !track.baseUrl) return null;
        console.log(`[YouTubeService] 🎯 Selected track: ${track.languageCode}`);

        // 3. Téléchargement du contenu (on force le format JSON3 pour la propreté)
        let transcriptUrl = track.baseUrl;
        if (!transcriptUrl.includes('fmt=json3')) transcriptUrl += '&fmt=json3';
        
        const transcriptResponse = await tauriFetch(transcriptUrl, { method: 'GET', responseType: 1 });
        if (!transcriptResponse.ok) {
            console.error('[YouTubeService] ❌ Failed to download transcript content');
            return null;
        }
        
        const content = transcriptResponse.data as string;
        let transcriptText = "";

        // 4. Parsing du résultat
        try {
            // Tentative JSON3 (Format moderne)
            const data = JSON.parse(content);
            if (data.events) {
                transcriptText = data.events
                    .filter((e: any) => e.segs)
                    .map((e: any) => e.segs.map((s: any) => s.utf8).join(''))
                    .join(' ');
            }
        } catch (e) {
            // Fallback XML (Ancien format)
            console.log('[YouTubeService] JSON parse failed, trying XML fallback...');
            const textNodes = content.match(/<text.*?>.*?<\/text>/g) || [];
            transcriptText = textNodes
                .map(node => node.replace(/<[^>]+>/g, '') // Nettoyage balises
                                 .replace(/&amp;/g, '&')
                                 .replace(/&lt;/g, '<')
                                 .replace(/&gt;/g, '>')
                                 .replace(/&#39;/g, "'")
                                 .replace(/&quot;/g, '"'))
                .join(' ');
        }

        // Nettoyage final des espaces multiples
        const cleanedText = transcriptText.replace(/\s+/g, ' ').trim();
        
        if (cleanedText.length < 50) {
            console.warn('[YouTubeService] ⚠️ Transcript too short, possibly empty');
            return null;
        }

        console.log(`[YouTubeService] ✅ Success! Extracted ${cleanedText.length} characters.`);
        return { text: cleanedText, language: track.languageCode };

    } catch (error) {
        console.error('[YouTubeService] Critical Extraction Error:', error);
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
