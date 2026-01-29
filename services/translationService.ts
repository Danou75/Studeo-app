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
  "context": "contexte d'utilisation (optionnel)",
  "examples": ["exemple 1", "exemple 2"],
  "notes": "notes grammaticales ou culturelles (optionnel)"
}

IMPORTANT : 
- Fournis une traduction naturelle et idiomatique
- Si c'est un verbe, donne l'infinitif
- Ajoute 2-3 exemples d'utilisation en contexte
- Ajoute des notes si pertinent (genre, pluriel, usage, etc.)`;

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
        }

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
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
