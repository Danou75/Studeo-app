/**
 * services/aiClient.ts — Client IA unifié pour tous les providers Studeo.
 *
 * Avant ce fichier, le code de routing par provider (Gemini / OpenAI / Anthropic /
 * Mistral / Local) était dupliqué dans chaque service (aiCardGenerator, aiLessonGenerator,
 * curriculumService, etc.), représentant environ 1 500 lignes redondantes.
 *
 * Ce client centralise :
 *   1. La construction de l'URL et des headers par provider
 *   2. L'appel réseau (fetch ou invoke Tauri)
 *   3. L'extraction du texte de la réponse
 *   4. La gestion d'erreur normalisée
 *
 * Usage :
 *   import { callAI } from '../services/aiClient';
 *   const text = await callAI({ provider, apiKey, modelName, apiUrl }, prompt);
 */

import { AIProvider } from '../types';
import { AIClientConfig } from '../utils/aiConfigHelper';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AICallOptions {
    provider:   AIProvider;
    apiKey?:    string;
    modelName?: string;
    apiUrl?:    string;
    /** Nombre max de tokens dans la réponse (défaut: 4096) */
    maxTokens?: number;
    /** Température de génération (défaut: 0.7) */
    temperature?: number;
    /** Si true, force le format JSON dans la réponse (OpenAI/Gemini) */
    jsonMode?: boolean;
}

export interface AICallResult {
    text:     string;
    provider: AIProvider;
    model:    string;
}

// ── Détection de l'environnement Tauri ────────────────────────────────────────
const isTauri = (): boolean =>
    typeof window !== 'undefined' && '__TAURI__' in window;

// ── URL OpenRouter selon l’environnement ──────────────────────────────────────────
const getOpenRouterChatUrl = (): string => {
    if (typeof window === 'undefined') return 'https://openrouter.ai/api/v1/chat/completions';
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Sur Tauri (Mac/desktop) ou dev local → appel direct sans CORS
    // Sur PWA web mobile (iOS Safari, Android) → proxy Vercel pour éviter le CORS
    return (!isTauri() && !isLocalDev)
        ? '/api/openrouter-chat'
        : 'https://openrouter.ai/api/v1/chat/completions';
};

// ── Normalisation de l'URL d'API locale ───────────────────────────────────────
const normalizeLocalApiUrl = (url: string): string => {
    const base = url.replace(/\/$/, '');
    if (base.includes('/chat/completions')) return base;
    if (base.endsWith('/v1')) return `${base}/chat/completions`;
    return `${base}/v1/chat/completions`;
};

// ── Extraction du texte selon le format de réponse du provider ────────────────
const extractText = (data: any, provider: AIProvider): string => {
    switch (provider) {
        case 'gemini':
            return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        case 'anthropic':
            return data.content?.[0]?.text ?? '';
        case 'openrouter': {
            if (data.error) {
                const errMsg = typeof data.error === 'string' ? data.error : (data.error?.message || JSON.stringify(data.error));
                throw new Error(`[openrouter] ${errMsg}`);
            }
            const choice  = data.choices?.[0];
            const msg     = choice?.message;
            const finish  = choice?.finish_reason ?? choice?.native_finish_reason ?? '';

            if (!msg) return '';

            // 1. Contenu direct (string) — cas normal
            if (typeof msg.content === 'string' && msg.content.trim()) return msg.content;

            // 2. Contenu en tableau (format vision/multi-modal)
            if (Array.isArray(msg.content)) {
                const textPart = msg.content.find((p: any) => p.type === 'text');
                if (textPart?.text?.trim()) return textPart.text;
            }

            // 3. Modèle thinking : content est null, mais reasoning contient peut-être du JSON
            const reasoning: string = msg.reasoning || (msg as any).reasoning_content || '';

            if (reasoning.trim()) {
                // Réponse tronquée (quota tokens dépassé) — le raisonnement est incomplet
                if (finish === 'length') {
                    throw new Error(
                        `[openrouter] Réponse tronquée (finish_reason=length). Éliminez ce modèle thinking pour les tâches JSON ou utilisez un modèle non-thinking (ex: google/gemma-3-27b-it:free).`
                    );
                }
                // Modèle thinking complet : essayer d'extraire le JSON de la réflexion
                const jsonInReasoning = reasoning.match(/```json([\s\S]*?)```/)?.[1]
                    ?? reasoning.match(/(\[\s*\{[\s\S]*?\}\s*\])/)?.[0]
                    ?? reasoning.match(/(\{[\s\S]*\})/)?.[0]
                    ?? '';
                if (jsonInReasoning.trim()) {
                    console.warn('[openrouter] content=null, JSON extrait depuis reasoning (modèle thinking).');
                    return jsonInReasoning;
                }
                // Aucun JSON trouvé dans le raisonnement
                throw new Error(
                    `[openrouter] Modèle thinking sans réponse finale (content=null). Utilisez un modèle non-thinking pour cette tâche.`
                );
            }

            return '';
        }
        default:
            // OpenAI, Mistral, Local → format OpenAI compatible
            return data.choices?.[0]?.message?.content ?? '';
    }
};

// ── Appel principal ────────────────────────────────────────────────────────────

/**
 * Effectue un appel IA avec le provider configuré.
 * Retourne le texte brut de la réponse.
 * Lève une Error en cas d'échec (HTTP ou réseau).
 */
export const callAI = async (
    options: AICallOptions,
    prompt:  string
): Promise<AICallResult> => {
    const {
        provider,
        apiKey,
        apiUrl,
        maxTokens   = 4096,
        temperature = 0.7,
        jsonMode    = false,
    } = options;

    const modelName = options.modelName ?? defaultModel(provider);

    // ── Gemini via Tauri (invoke Rust) ──────────────────────────────────────
    if (provider === 'gemini' && isTauri()) {
        const { invoke } = await import('@tauri-apps/api/tauri');
        const key = apiKey?.trim() || localStorage.getItem('gemini_api_key') || '';
        if (!key) throw new Error('Clé API Gemini manquante.');

        const text = await invoke<string>('generate_flashcards_command', {
            prompt,
            apiKey:    key,
            modelName,
        });
        return { text, provider, model: modelName };
    }

    // ── Local via Tauri (invoke Rust) ───────────────────────────────────────
    if (provider === 'local' && isTauri() && apiUrl) {
        const { invoke } = await import('@tauri-apps/api/tauri');
        const text = await invoke<string>('generate_flashcards_local', {
            prompt,
            apiUrl,
            modelName,
        });
        return { text, provider, model: modelName };
    }

    // ── Tous les providers via fetch (Web + Tauri fallback) ─────────────────
    const { url, headers, body } = buildRequest({
        provider, apiKey, apiUrl, modelName,
        prompt, maxTokens, temperature, jsonMode,
    });

    const response = await fetch(url, {
        method:  'POST',
        headers,
        body:    JSON.stringify(body),
    });

    if (!response.ok) {
        const errBody = await response.text().catch(() => response.statusText);

        // Pour OpenRouter, on parse le JSON pour afficher un message lisible
        if (provider === 'openrouter') {
            try {
                const errJson = JSON.parse(errBody);
                const meta    = errJson?.error?.metadata;
                const retryIn = meta?.retry_after_seconds ? Math.ceil(meta.retry_after_seconds) : null;
                const raw     = meta?.raw ?? errJson?.error?.message ?? errBody;

                if (response.status === 429) {
                    const retryMsg = retryIn ? ` Réessayez dans ${retryIn}s.` : ' Réessayez dans quelques instants.';
                    throw new Error(`[openrouter] Limite de débit atteinte (429).${retryMsg}\n→ ${raw}`);
                }
                if (response.status === 503 || response.status === 502) {
                    throw new Error(`[openrouter] Modèle temporairement indisponible (${response.status}). Essayez un autre modèle.\n→ ${raw}`);
                }
                throw new Error(`[openrouter] Erreur ${response.status} : ${raw}`);
            } catch (parseErr: any) {
                // Si le corps n'est pas du JSON, on relance l'erreur originale
                if (parseErr.message?.startsWith('[openrouter]')) throw parseErr;
                throw new Error(`[openrouter] HTTP ${response.status}: ${errBody}`);
            }
        }

        throw new Error(`[${provider}] HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();

    // Debug log pour faciliter le diagnostic en dev
    if (provider === 'openrouter') {
        console.log('[openrouter] raw response:', JSON.stringify(data).substring(0, 400));
    }

    const text = extractText(data, provider);

    if (!text) {
        // Diagnostic enrichi pour openrouter
        if (provider === 'openrouter') {
            const finishReason = data.choices?.[0]?.finish_reason;
            const errDetail = data.error ? JSON.stringify(data.error) : `finish_reason=${finishReason}`;
            throw new Error(`[openrouter] Réponse vide — ${errDetail}. Vérifiez que le modèle est disponible et que votre quota n'est pas épuisé.`);
        }
        throw new Error(`[${provider}] Réponse vide ou inattendue.`);
    }

    return { text, provider, model: modelName };
};

// ── Raccourci depuis AIClientConfig ───────────────────────────────────────────

/**
 * Variante acceptant directement un AIClientConfig (depuis getAIClientConfig).
 */
export const callAIFromConfig = (
    config: AIClientConfig,
    prompt: string,
    extra?: Partial<Pick<AICallOptions, 'maxTokens' | 'temperature' | 'jsonMode'>>
): Promise<AICallResult> =>
    callAI({ ...config, ...extra }, prompt);

// ── Construction de la requête par provider ───────────────────────────────────

interface RequestArgs {
    provider:    AIProvider;
    apiKey?:     string;
    apiUrl?:     string;
    modelName:   string;
    prompt:      string;
    maxTokens:   number;
    temperature: number;
    jsonMode:    boolean;
}

const buildRequest = ({
    provider, apiKey, apiUrl, modelName,
    prompt, maxTokens, temperature, jsonMode,
}: RequestArgs): { url: string; headers: Record<string, string>; body: any } => {

    switch (provider) {

        case 'gemini': {
            const key = apiKey?.trim() || localStorage.getItem('gemini_api_key') || '';
            if (!key) throw new Error('Clé API Gemini manquante.');
            return {
                url:     `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
                headers: { 'Content-Type': 'application/json' },
                body:    {
                    contents:           [{ parts: [{ text: prompt }] }],
                    generationConfig:   { maxOutputTokens: maxTokens, temperature },
                },
            };
        }

        case 'openai': {
            if (!apiKey) throw new Error('Clé API OpenAI manquante.');
            return {
                url:     'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: {
                    model:           modelName,
                    messages:        [
                        { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
                        { role: 'user',   content: prompt },
                    ],
                    temperature,
                    max_tokens:      maxTokens,
                    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
                },
            };
        }

        case 'anthropic': {
            if (!apiKey) throw new Error('Clé API Anthropic manquante.');
            return {
                url:     'https://api.anthropic.com/v1/messages',
                headers: {
                    'Content-Type':                            'application/json',
                    'x-api-key':                               apiKey,
                    'anthropic-version':                       '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: {
                    model:      modelName,
                    max_tokens: maxTokens,
                    system:     'You are a helpful assistant that outputs JSON only.',
                    messages:   [{ role: 'user', content: prompt }],
                },
            };
        }

        case 'mistral': {
            if (!apiKey) throw new Error('Clé API Mistral manquante.');
            return {
                url:     'https://api.mistral.ai/v1/chat/completions',
                headers: {
                    'Content-Type':  'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: {
                    model:      modelName,
                    messages:   [
                        { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
                        { role: 'user',   content: prompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                },
            };
        }

        case 'openrouter': {
            if (!apiKey) throw new Error('Clé API OpenRouter manquante.');
            const openrouterUrl = getOpenRouterChatUrl();
            const isProxy = openrouterUrl.startsWith('/');
            return {
                url:     openrouterUrl,
                headers: {
                    'Content-Type':   'application/json',
                    'Authorization':  `Bearer ${apiKey}`,
                    // Headers envoyés seulement en appel direct (Tauri/dev) — le proxy les ajoute lui-même
                    ...(!isProxy ? {
                        'HTTP-Referer': 'https://studeo.app',
                        'X-Title':      'Studeo',
                    } : {}),
                },
                body: {
                    model:      modelName,
                    messages:   [
                        { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
                        { role: 'user',   content: prompt },
                    ],
                    temperature,
                    // Limiter max_tokens pour les modèles free (quota limité)
                    max_tokens: Math.min(maxTokens, 2048),
                    // NE PAS forcer response_format: les modèles free ne le supportent pas tous
                },
            };
        }

        case 'local': {
            const endpoint = normalizeLocalApiUrl(apiUrl || '');
            if (!endpoint) throw new Error('URL de l\'API locale manquante.');
            return {
                url:     endpoint,
                headers: { 'Content-Type': 'application/json' },
                body: {
                    model:      modelName,
                    messages:   [
                        { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
                        { role: 'user',   content: prompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                },
            };
        }

        default:
            throw new Error(`Provider IA non reconnu: ${provider}`);
    }
};

// ── Modèles par défaut ────────────────────────────────────────────────────────

const defaultModel = (provider: AIProvider): string => {
    switch (provider) {
        case 'gemini':      return 'gemini-2.5-flash';
        case 'openai':      return 'gpt-4o';
        case 'anthropic':   return 'claude-3-5-sonnet-20240620';
        case 'mistral':     return 'mistral-large-latest';
        case 'openrouter':  return 'openai/gpt-4o';
        case 'local':       return 'local-model';
    }
};
