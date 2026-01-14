


export const evaluateDrawingWithGemini = async (
    apiKey: string,
    instruction: string,
    criteria: string,
    imageBase64: string
): Promise<{ feedback: string; score: number; isSuccess: boolean }> => {
    
    console.log("🎨 Evaluating drawing with Gemini Vision...");

    const prompt = `
    Tu es un professeur d'art expert (Maître Léonard).
    
    CONSIGNE DONNÉE À L'ÉLÈVE : "${instruction}"
    CRITÈRES DE RÉUSSITE ATTENDUS : "${criteria}"
    
    L'élève t'a soumis le dessin ci-joint.
    
    TA MISSION :
    1. Analyse le dessin par rapport à la consigne.
    2. Donne un feedback constructif et bienveillant (2-3 phrases).
    3. Attribue une note de 0 à 100 sur la réussite de l'exercice.
    4. Décide si c'est réussi (>= 60) ou à refaire.

    FORMAT DE RÉPONSE JSON STRICT :
    {
        "feedback": "Ton dessin respecte bien la perspective...",
        "score": 85,
        "isSuccess": true
    }
    
    Réponds UNIQUEMENT avec le JSON.
    `;

    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const payload = {
    contents: [{
        parts: [
            { text: prompt },
            { 
                inline_data: {
                    mime_type: "image/jpeg", // On assume jpeg/png converti
                    data: imageBase64
                }
            }
        ]
    }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error(`Gemini Vision Error: ${await response.text()}`);
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) throw new Error("Réponse vide de Gemini Vision");
        
        const cleanedJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanedJson);
        
        return {
            feedback: result.feedback,
            score: result.score,
            isSuccess: result.isSuccess
        };

    } catch (e) {
        console.error("Evaluation Error:", e);
        return {
            feedback: "Désolé, je n'ai pas pu analyser ton dessin. Vérifie ta connexion ou la clé API.",
            score: 0,
            isSuccess: false
        };
    }
};
