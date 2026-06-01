import { AIProvider } from '../types';
import { callAI } from './aiClient';

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

    try {
        const result = await callAI(
            {
                provider,
                apiKey,
                apiUrl,
                modelName,
                temperature: 0.3,
                maxTokens: 2048,
                jsonMode: true
            },
            prompt
        );

        const responseText = result.text;

        // Extraction JSON robuste
        const stripped = responseText
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/, '')
            .trim();
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from AI');
        }

        const data = JSON.parse(jsonMatch[0]);
        
        return {
            original: text,
            translated: data.translated || '',
            language: data.language || targetLanguage,
            context: data.context || '',
            examples: data.examples || [],
            notes: data.notes || ''
        };

    } catch (error: any) {
        console.error('Translation error:', error);
        throw new Error(`Erreur de traduction: ${error.message || String(error)}`);
    }
}
