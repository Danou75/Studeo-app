import { AIProvider } from '../types';

export interface TranslationResult {
    original: string;
    translated: string;
    language: string;
    context?: string;
    examples?: string[];
    notes?: string;
}

export async function translateText(
    text: string,
    targetLanguage: string,
    provider: AIProvider,
    modelName: string,
    apiUrl?: string,
    apiKey?: string
): Promise<TranslationResult> {
    const prompt = `Tu es un traducteur expert. Traduis le texte suivant en ${targetLanguage}.

Texte à traduire : "${text}"

Réponds UNIQUEMENT avec un objet JSON dans ce format exact :
{
  "original": "texte original",
  "translated": "traduction",
  "language": "${targetLanguage}",
  "context": "contexte d'utilisation (optionnel, utilise du Markdown pour la structure)",
  "examples": ["exemple 1", "exemple 2"],
  "notes": "notes grammaticales ou culturelles (optionnel, utilise une liste Markdown avec des sauts de ligne \\n\\n entre les points)"
}

IMPORTANT : 
- Fournis une traduction naturelle et idiomatique
- Si c'est un verbe, donne l'infinitif
- Ajoute 2-3 exemples d'utilisation en contexte
- Ajoute des notes structurelles si pertinent (genre, pluriel, usage, registre) sous forme de liste numérotée ou à puces Markdown.`;

    let response = '';

    try {
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'Gemini API error');
            }

            const data = await res.json();
            response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        } else if (provider === 'openai') {
            const url = 'https://api.openai.com/v1/chat/completions';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 2048
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'OpenAI API error');
            }

            const data = await res.json();
            response = data.choices?.[0]?.message?.content || '';

        } else if (provider === 'anthropic') {
            const url = 'https://api.anthropic.com/v1/messages';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey || '',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: modelName,
                    max_tokens: 2048,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'Anthropic API error');
            }

            const data = await res.json();
            response = data.content?.[0]?.text || '';

        } else if (provider === 'mistral') {
            const url = 'https://api.mistral.ai/v1/chat/completions';
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 2048
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'Mistral API error');
            }

            const data = await res.json();
            response = data.choices?.[0]?.message?.content || '';

        } else if (provider === 'local') {
            const url = `${apiUrl}/v1/chat/completions`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 2048
                })
            });

            if (!res.ok) {
                throw new Error('Local API error');
            }

            const data = await res.json();
            response = data.choices?.[0]?.message?.content || '';

        } else if (provider === 'openrouter') {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://studeo.app',
                    'X-Title': 'Studeo',
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: 'system', content: 'You are a translation expert. Always respond with valid JSON only, no markdown.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_tokens: 2048,
                })
            });

            if (!res.ok) {
                const errBody = await res.text().catch(() => res.statusText);
                throw new Error(`OpenRouter API error ${res.status}: ${errBody}`);
            }

            const data = await res.json();
            if (data.error) throw new Error(data.error?.message || JSON.stringify(data.error));

            const msg = data.choices?.[0]?.message;
            // Certains modèles free mettent le texte dans reasoning au lieu de content
            response = (typeof msg?.content === 'string' && msg.content.trim())
                ? msg.content
                : (msg?.reasoning || msg?.reasoning_content || '');
        }

        // Extraction JSON robuste — supporte ```json ... ``` et {…} direct
        const stripped = response
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/, '')
            .trim();
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from AI');
        }

        const result: TranslationResult = JSON.parse(jsonMatch[0]);
        
        // Validate result
        if (!result.translated || !result.original) {
            throw new Error('Incomplete translation result');
        }

        return result;

    } catch (error: any) {
        console.error('Translation error:', error);
        throw new Error(`Erreur de traduction: ${error.message || String(error)}`);
    }
}
