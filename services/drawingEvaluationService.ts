/**
 * Service d'évaluation de dessins par IA (Maître Léonard)
 */

export interface DrawingEvaluation {
    strengths: string[];
    improvements: string[];
    score: number;
    personalizedTip: string;
    overallComment: string;
}

export const evaluateDrawing = async (
    imageBase64: string,
    challenge: string,
    criteria: string,
    apiKey: string,
    provider: string = 'gemini',
    modelName?: string
): Promise<DrawingEvaluation> => {
    const prompt = `Tu es Maître Léonard, professeur de dessin bienveillant et expert.

DÉFI DONNÉ À L'ÉLÈVE :
${challenge}

CRITÈRES DE RÉUSSITE :
${criteria}

Analyse attentivement ce dessin et fournis une évaluation constructive.

Réponds UNIQUEMENT avec un JSON au format suivant :
{
  "strengths": ["Point fort 1", "Point fort 2", ...],
  "improvements": ["Point à améliorer 1", "Point à améliorer 2", ...],
  "score": 7,
  "personalizedTip": "Un conseil personnalisé pour progresser",
  "overallComment": "Commentaire général encourageant"
}

RÈGLES :
- Sois encourageant et constructif
- Note sur 10 (sois généreux mais honnête)
- Donne au moins 2 points forts et 2 axes d'amélioration
- Le conseil doit être actionnable
`;

    try {
        let url = '';
        let headers: Record<string, string> = { 'Content-Type': 'application/json' };
        let body: any = {};

        if (provider === 'gemini') {
            const model = modelName || 'gemini-1.5-flash';
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            body = {
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
                    ]
                }]
            };
        } else if (provider === 'openai' || provider === 'mistral') {
            url = provider === 'openai' 
                ? 'https://api.openai.com/v1/chat/completions' 
                : 'https://api.mistral.ai/v1/chat/completions';
            
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: modelName || (provider === 'openai' ? 'gpt-4o' : 'pixtral-12b-2409'),
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                        ]
                    }
                ],
                response_format: provider === 'openai' ? { type: "json_object" } : undefined
            };
        } else {
            throw new Error(`Fournisseur ${provider} non supporté pour l'analyse d'image.`);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${provider} API Error: ${errorText}`);
        }

        const data = await response.json();
        let text = '';
        if (provider === 'gemini') {
            text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
            text = data.choices?.[0]?.message?.content || '';
        }
        
        // Nettoyage du JSON
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const evaluation: DrawingEvaluation = JSON.parse(cleanedJson);

        return evaluation;
    } catch (error) {
        console.error('Drawing evaluation error:', error);
        throw error;
    }
};
