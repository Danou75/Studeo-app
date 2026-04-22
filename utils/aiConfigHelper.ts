/**
 * Utilitaire centralisé pour la configuration des clients IA
 * Évite la duplication de code dans useAppCoordinator et autres services
 */

import { AIProvider } from '../types';

export interface AIClientConfig {
    provider: AIProvider;
    apiKey?: string;
    modelName: string;
    apiUrl?: string;
}

export interface AIConfigContext {
    provider: AIProvider;
    geminiApiKey: string;
    geminiModel: string;
    openaiApiKey?: string;
    openaiModel?: string;
    anthropicApiKey?: string;
    anthropicModel?: string;
    mistralApiKey?: string;
    mistralModel?: string;
    openrouterApiKey?: string;
    openrouterModel?: string;
    localApiUrl: string;
    localModelName: string;
}

/**
 * Extrait la configuration client IA depuis le contexte global
 * @param config Configuration globale de l'IA
 * @returns Configuration client prête à l'emploi
 * @throws Error si la clé API ou l'URL locale est manquante
 */
export function getAIClientConfig(config: AIConfigContext): AIClientConfig {
    let apiKey: string | undefined;
    let modelName: string;
    let apiUrl: string | undefined;

    switch (config.provider) {
        case 'gemini':
            apiKey = config.geminiApiKey;
            modelName = config.geminiModel;
            if (!apiKey?.trim()) {
                throw new Error('Clé API Gemini manquante. Veuillez configurer votre clé dans les paramètres.');
            }
            break;

        case 'openai':
            apiKey = config.openaiApiKey;
            modelName = config.openaiModel || 'gpt-4o';
            if (!apiKey?.trim()) {
                throw new Error('Clé API OpenAI manquante. Veuillez configurer votre clé dans les paramètres.');
            }
            break;

        case 'anthropic':
            apiKey = config.anthropicApiKey;
            modelName = config.anthropicModel || 'claude-3-5-sonnet-20241022';
            if (!apiKey?.trim()) {
                throw new Error('Clé API Anthropic manquante. Veuillez configurer votre clé dans les paramètres.');
            }
            break;

        case 'mistral':
            apiKey = config.mistralApiKey;
            modelName = config.mistralModel || 'mistral-large-latest';
            if (!apiKey?.trim()) {
                throw new Error('Clé API Mistral manquante. Veuillez configurer votre clé dans les paramètres.');
            }
            break;

        case 'local':
            apiUrl = config.localApiUrl;
            modelName = config.localModelName;
            if (!apiUrl?.trim()) {
                throw new Error('URL de l\'API locale manquante. Veuillez configurer l\'URL dans les paramètres (ex: http://localhost:11434/v1/chat/completions).');
            }
            break;

        case 'openrouter':
            apiKey = config.openrouterApiKey;
            modelName = config.openrouterModel || 'openai/gpt-4o';
            if (!apiKey?.trim()) {
                throw new Error('Clé API OpenRouter manquante. Veuillez configurer votre clé dans les paramètres.');
            }
            break;

        default:
            throw new Error(`Provider IA non reconnu: ${config.provider}`);
    }

    return {
        provider: config.provider,
        apiKey,
        modelName,
        apiUrl
    };
}

/**
 * Vérifie si la configuration IA est valide et prête à l'emploi
 * @param config Configuration globale de l'IA
 * @returns true si la configuration est valide
 */
export function isAIConfigValid(config: AIConfigContext): boolean {
    try {
        getAIClientConfig(config);
        return true;
    } catch {
        return false;
    }
}

/**
 * Retourne un message d'erreur convivial pour une configuration invalide
 * @param config Configuration globale de l'IA
 * @returns Message d'erreur ou null si la configuration est valide
 */
export function getAIConfigError(config: AIConfigContext): string | null {
    try {
        getAIClientConfig(config);
        return null;
    } catch (error) {
        return error instanceof Error ? error.message : 'Configuration IA invalide';
    }
}
