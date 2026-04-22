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
        throw new Error(`[${provider}] HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text = extractText(data, provider);

    if (!text) throw new Error(`[${provider}] Réponse vide ou inattendue.`);

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
            return {
                url:     'https://openrouter.ai/api/v1/chat/completions',
                headers: {
                    'Content-Type':   'application/json',
                    'Authorization':  `Bearer ${apiKey}`,
                    'HTTP-Referer':   'https://studeo.app',
                    'X-Title':        'Studeo',
                },
                body: {
                    model:      modelName,
                    messages:   [
                        { role: 'system', content: 'You are a helpful assistant that outputs JSON only.' },
                        { role: 'user',   content: prompt },
                    ],
                    temperature,
                    max_tokens: maxTokens,
                    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
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
