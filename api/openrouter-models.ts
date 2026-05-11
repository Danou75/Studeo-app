/**
 * Proxy Vercel — Liste des modèles OpenRouter
 *
 * Safari iOS (WKWebView) bloque parfois les requêtes cross-origin directes
 * vers des API tierces. Ce proxy côté serveur évite le problème CORS.
 *
 * Appelé par SettingsScreen.tsx avec :
 *   GET /api/openrouter-models
 *   Header : Authorization: Bearer <clé_openrouter>
 */
export default async function handler(req: any, res: any) {
    // CORS : autoriser l'accès depuis le PWA (studeo.app et localhost)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Clé API OpenRouter manquante (Authorization: Bearer <clé>)' });
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': authHeader,
                'HTTP-Referer': 'https://studeo.app',
                'X-Title': 'Studeo',
            },
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return res.status(response.status).json({ error: `OpenRouter ${response.status}: ${errText}` });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (err: any) {
        console.error('[openrouter-models proxy] Erreur:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
