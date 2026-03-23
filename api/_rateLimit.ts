import type { VercelRequest, VercelResponse } from '@vercel/node';

// Rate limiter en mémoire — réinitialisé à chaque redémarrage de la Serverless Function
// (suffisant pour protéger contre les abus basiques sans infrastructure externe)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;  // 20 requêtes / min / IP

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true; // OK
    }

    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        return false; // Bloqué
    }
    return true; // OK
}

export { checkRateLimit, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS };
