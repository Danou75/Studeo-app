/**
 * Proxy Vercel — Chat completions OpenRouter
 *
 * Safari iOS (WKWebView/PWA) et certains navigateurs mobiles bloquent les
 * requêtes cross-origin directes vers des API tierces avec des headers
 * personnalisés (HTTP-Referer, X-Title). Ce proxy côté serveur contourne
 * le problème CORS pour tous les appels de chat vers OpenRouter.
 *
 * Appelé par services/conversationService.ts et services/aiClient.ts :
 *   POST /api/openrouter-chat
 *   Header : Authorization: Bearer <clé_openrouter>
 *   Body   : JSON (même format que l'API OpenRouter)
 */
export default async function handler(req: any, res: any) {
    // CORS : autoriser l'accès depuis le PWA (studeo.app et localhost)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Clé API OpenRouter manquante (Authorization: Bearer <clé>)' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': authHeader,
                'HTTP-Referer':  'https://studeo.app',
                'X-Title':       'Studeo',
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return res.status(response.status).json({ error: `OpenRouter ${response.status}: ${errText}` });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (err: any) {
        console.error('[openrouter-chat proxy] Erreur:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
