import { invoke } from '@tauri-apps/api/tauri';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from 'uuid';
import { Tutor, StudyProgram, StudyModule, AIProvider, AIGenerationConfig } from '../types';
import { generateFlashcardsWithAI } from './aiCardGenerator';

/**
 * Helper unifié pour appeler les différents LLMs
 */
const executeAIRequest = async (
    prompt: string,
    provider: AIProvider,
    apiKey?: string,
    modelName?: string,
    apiUrl?: string,
    jsonMode: boolean = false
): Promise<string> => {
    
    // 1. OPENAI / MISTRAL
    if (provider === 'openai' || provider === 'mistral') {
        const apiEndpoint = provider === 'mistral' 
            ? 'https://api.mistral.ai/v1/chat/completions' 
            : 'https://api.openai.com/v1/chat/completions';
        
        if (!apiKey) throw new Error(`Clé API ${provider} manquante.`);

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [
                    { role: "system", content: jsonMode ? "You are a helpful assistant that outputs JSON only." : "You are a helpful teacher." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                response_format: (jsonMode && provider === 'openai') ? { type: "json_object" } : undefined
            })
        });

        if (!response.ok) throw new Error(`${provider} Error: ${await response.text()}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    }

    // 2. ANTHROPIC
    if (provider === 'anthropic') {
        if (!apiKey) throw new Error("Clé API Anthropic manquante.");
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: modelName,
                max_tokens: 4096,
                messages: [
                    { role: "user", content: prompt }
                ],
                system: jsonMode ? "You output JSON only." : "You are a helpful teacher."
            })
        });
        
        if (!response.ok) throw new Error(`Anthropic Error: ${await response.text()}`);
        const data = await response.json();
        return data.content?.[0]?.text || "";
    }

    // 3. LEGACY GEMINI / LOCAL (Logic Wrapper)
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    
    if (isTauri) {
        if (provider === 'gemini') {
            if (!apiKey) throw new Error("Clé API Gemini manquante");
            return await invoke<string>('generate_flashcards_command', {
                prompt, apiKey: apiKey.trim(), modelName
            });
        } else { // Local
             if (!apiUrl) throw new Error("URL API locale manquante");
             return await invoke<string>('generate_flashcards_local', {
                prompt, apiUrl, modelName
             });
        }
    } else { // Web
        if (provider === 'local') {
             if (!apiUrl) throw new Error("URL API locale manquante");
             
             // Normalisation intelligente de l'URL
             let endpoint = apiUrl.replace(/\/$/, '');
             if (!endpoint.includes('/chat/completions')) {
                 if (endpoint.endsWith('/v1')) {
                     endpoint = `${endpoint}/chat/completions`;
                 } else {
                     endpoint = `${endpoint}/v1/chat/completions`;
                 }
             }
             
             console.log("🔗 Local AI Endpoint:", endpoint);
             
             // Pour les modèles locaux, on fusionne souvent l'instruction système dans le prompt 
             // car beaucoup de petits modèles gèrent mal le rôle "system"
             let finalPrompt = prompt;
             if (jsonMode) {
                 finalPrompt = `INSTRUCTION: Réponds UNIQUEMENT au format JSON.\n\n${prompt}`;
             }

             const response = await fetch(endpoint, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     model: modelName || "local-model",
                     messages: [{ role: "user", content: finalPrompt }],
                     temperature: 0.7
                 })
             });

             if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Erreur serveur Local (${response.status}): ${errorText.slice(0, 100)}`);
             }
             
             const data = await response.json();
             
             // Gestion explicite des erreurs renvoyées dans le JSON (format OpenAI/Ollama)
             if (data.error) {
                 const msg = typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : data.error;
                 throw new Error(`L'IA Locale a renvoyé une erreur : ${msg}`);
             }
             
             // Extraction robuste multi-formats
             const content = data.choices?.[0]?.message?.content || 
                             data.choices?.[0]?.text || 
                             data.message?.content || 
                             (typeof data === 'string' ? data : "");
             
             if (!content || (typeof content === 'string' && content.trim().length === 0)) {
                 console.error("Local AI Response structure:", data);
                 throw new Error("L'IA locale a renvoyé une réponse vide. Vérifiez que le modèle est bien chargé dans votre serveur local (LM Studio/Ollama).");
             }
             
             return content;
        } else { // Gemini Client SDK
             if (!apiKey) throw new Error("Clé API Gemini manquante");
             
             const genAI = new GoogleGenerativeAI(apiKey);
             const model = genAI.getGenerativeModel({ 
                 model: modelName || "gemini-2.5-flash",
                 generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
             });
             
             const result = await model.generateContent(prompt);
             const text = result.response.text();
             if (!text) throw new Error("Gemini a renvoyé une réponse vide");
             return text;
        }
    }
};

/**
 * Génère un programme d'étude complet via l'IA.
 */
export const generateStudyProgram = async (
    tutor: Tutor,
    topic: string,
    level: string,
    provider: AIProvider = 'gemini',
    apiKey?: string,
    modelName: string = 'gemini-2.5-flash',
    apiUrl?: string,
    media?: { data: string; mimeType: string }
): Promise<StudyProgram> => {
    
    console.log(`🎓 Generating Curriculum with ${tutor.name} for ${topic} (${level})`);

    const prompt = `
    Tu es ${tutor.name}, un expert pédagogique (${tutor.emoji}). ${tutor.description}.
    
    TA MISSION : Créer un programme d'étude structuré et progressif pour un élève.
    
    PARAMÈTRES :
    - Sujet : "${topic}"
    - Niveau de l'élève/Objectif : "${level}"
    ${media ? "INSTRUCTION SPÉCIALE : Ce programme doit être basé sur l'analyse du fichier média fourni en pièce jointe." : ""}

    ${level === 'university' ? `
    MODE UNIVERSITAIRE (Exigence Académique) :
    1. Structure le programme comme un syllabus de cours magistral universitaire (10 à 12 Séances/Modules).
    2. Adopte une approche analytique et critique, pas seulement descriptive.
    3. Intègre des notions d'historiographie, d'épistémologie ou de théorie avancée selon le sujet.
    4. Les titres des modules doivent être précis et académiques.
    ` : ""}

    CONSIGNES :
    1. Divise l'apprentissage en 5 à 10 modules logiques et progressifs.
    2. Le premier module doit être accessible (bases).
    3. Les modules suivants doivent monter en complexité.
    4. Donne un titre accrocheur et une description pédagogique claire pour chaque module.
    
    FORMAT DE SORTIE ATTENDU (JSON UNIQUEMENT) :
    - Rédige TOUT en FRANÇAIS.
    ${tutor.category === 'languages' 
        ? `- Pour les titres, utilise le format : "Module X : [Titre en Français] ([Traduction en ${tutor.language === 'it' ? 'Italien' : (tutor.language === 'es' ? 'Espagnol' : 'Langue Cible')}])".
           - INTERDICTION de traduire en anglais.` 
        : "- INTERDICTION de traduire les titres ou descriptions en anglais entre parenthèses."
    }
    
    [
        {
            "title": "Module 1 : ...",
            "description": "..."
        }
    ]
    
    Réponds UNIQUEMENT avec le tableau JSON.
    `;

    try {
        let responseText = "";

        // MODE MULTIMODAL DIRECT via REST (Si media fourni)
        if (media) {
             console.log(`🎥 Curriculum Multimodal Mode (${provider})`);
             
             let url = '';
             let headers: Record<string, string> = { 'Content-Type': 'application/json' };
             let payload: any = {};
             let activeModel = modelName || "";

             if (provider === 'gemini') {
                 if (!apiKey) throw new Error("Clé API nécessaire pour le mode Média (Gemini)");
                 url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`;
                 payload = {
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: media.mimeType, data: media.data } }
                        ]
                    }]
                 };
             } else if (provider === 'openai' || provider === 'mistral' || provider === 'local') {
                 if (provider === 'openai') {
                    if (!apiKey) throw new Error("Clé API nécessaire (OpenAI)");
                    url = 'https://api.openai.com/v1/chat/completions';
                    headers['Authorization'] = `Bearer ${apiKey}`;
                    activeModel = activeModel || 'gpt-4o';
                 } else if (provider === 'mistral') {
                    if (!apiKey) throw new Error("Clé API nécessaire (Mistral)");
                    url = 'https://api.mistral.ai/v1/chat/completions';
                    headers['Authorization'] = `Bearer ${apiKey}`;
                    activeModel = activeModel || 'pixtral-12b-2409';
                 } else {
                    if (!apiUrl) throw new Error("URL API Local requise.");
                    url = apiUrl.replace(/\/$/, '') + (apiUrl.includes('/chat/completions') ? '' : (apiUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions'));
                    activeModel = activeModel || 'local-model';
                 }

                 payload = {
                    model: activeModel,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: `data:${media.mimeType};base64,${media.data}` } }
                            ]
                        }
                    ]
                 };
             } else if (provider === 'anthropic') {
                 if (!apiKey) throw new Error("Clé API nécessaire (Anthropic)");
                 url = 'https://api.anthropic.com/v1/messages';
                 headers['x-api-key'] = apiKey;
                 headers['anthropic-version'] = '2023-06-01';
                 headers['anthropic-dangerous-direct-browser-access'] = 'true';
                 activeModel = activeModel || 'claude-3-5-sonnet-20240620';

                 payload = {
                    model: activeModel,
                    max_tokens: 4096,
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: media.mimeType.startsWith('image/') ? media.mimeType : 'image/jpeg',
                                        data: media.data
                                    }
                                },
                                { type: "text", text: prompt }
                            ]
                        }
                    ]
                 };
             }

             const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
             });
             
             if (!response.ok) throw new Error(`${provider} Multimodal Error: ${await response.text()}`);
             const data = await response.json();
             responseText = (provider === 'gemini') 
                ? data.candidates?.[0]?.content?.parts?.[0]?.text 
                : (provider === 'anthropic' ? data.content?.[0]?.text : data.choices?.[0]?.message?.content);
             
             if (!responseText) throw new Error(`Réponse vide de ${provider} Multimodal`);
        } else {
            // MODE STANDARD (Texte uniquement)
            responseText = await executeAIRequest(prompt, provider, apiKey, modelName, apiUrl, true);
        }

        // Parsing de la réponse avec robustesse (nettoyage Markdown et détection de tableau)
        const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let modulesData = [];
        try {
            modulesData = JSON.parse(cleanedJson);
        } catch (e) {
            console.warn("Curriculum JSON Parse failed, trying robust mode:", e);
            try {
                // Tentative d'extraction du premier tableau [ ... ] s'il y a du texte autour
                const firstBracket = cleanedJson.indexOf('[');
                const lastBracket = cleanedJson.lastIndexOf(']');
                if (firstBracket !== -1 && lastBracket !== -1) {
                    const sub = cleanedJson.substring(firstBracket, lastBracket + 1);
                    modulesData = JSON.parse(sub);
                } else {
                    throw e;
                }
            } catch (e2) {
                console.error("Critical JSON Parse Error:", e2);
                throw new Error("L'IA locale n'a pas renvoyé un format JSON valide (Tableau de modules attendu).");
            }
        }

        if (!Array.isArray(modulesData)) {
            throw new Error("Format JSON invalide : l'IA n'a pas renvoyé un tableau de modules.");
        }

        // Construction de l'objet StudyProgram
        const programId = uuidv4();
        
        const modules: StudyModule[] = modulesData.map((m: any, index: number) => ({
            id: uuidv4(),
            title: m.title || `Module ${index + 1}`,
            description: m.description || "Pas de description",
            status: index === 0 ? 'unlocked' : 'locked', // Le 1er est débloqué par défaut
            order: index + 1
        }));

        return {
            id: programId,
            tutorId: tutor.id,
            topic: topic,
            targetLevel: level,
            modules: modules,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
        };

    } catch (e) {
        console.error("Curriculum Generation Error:", e);
        throw e;
    }
};

/**
 * Génère le contenu pédagogique (Leçon + Quiz) pour un module spécifique.
 */
export const generateModuleContent = async (
    tutor: Tutor,
    program: StudyProgram,
    module: StudyModule,
    provider: AIProvider = 'gemini',
    apiKey?: string,
    modelName: string = 'gemini-2.5-flash',
    apiUrl?: string
): Promise<{ lessonContent: string; flashcards: any[] }> => {
    
    console.log(`🎓 Generating Content for Module ${module.title}`);

    // ÉTAPE 1 : GÉNÉRER LA LEÇON
    const targetLangName = tutor.language === 'it' ? 'Italien' : 
                          tutor.language === 'es' ? 'Espagnol' :
                          tutor.language === 'en' ? 'Anglais' :
                          tutor.language === 'de' ? 'Allemand' :
                          tutor.language === 'pt' ? 'Portugais' :
                          tutor.language === 'ru' ? 'Russe' :
                          tutor.language === 'tr' ? 'Turc' :
                          tutor.language === 'pl' ? 'Polonais' : 'ta langue cible';

    const isUniversity = program.targetLevel === 'university';

    const lessonPrompt = `
    Tu es ${tutor.name}, un expert pédagogique (${tutor.emoji}). ${tutor.description}.
    
    TA MISSION : Rédiger un cours complet et pédagogique pour le module suivant.
    
    CONTEXTE PROGRAMME :
    - Sujet Global : "${program.topic}"
    - Niveau : "${program.targetLevel}"
    ${isUniversity ? "- EXIGENCE : Niveau UNIVERSITAIRE / RECHERCHE (Master/Doctorat)" : ""}
    
    MODULE ACTUEL :
    - Titre : "${module.title}"
    - Description : "${module.description}"
    
    CONSIGNES DE RÉDACTION :
    1. ${isUniversity 
        ? "TON ACADÉMIQUE : Adopte une posture d'expert. Sois rigoureux, précis et analytique. Analyse les nuances, les débats théoriques et l'historiographie du sujet." 
        : "TON PÉDAGOGIQUE : Utilise un ton encourageant, clair et progressif, adapté au niveau de l'élève."}
    2. Structure le cours avec des titres Markdown (#, ##, ###) pour une lisibilité parfaite.
    ${tutor.category === 'languages' 
        ? `3. TRADUCTION & LANGUE : Comme tu es un professeur de langue, rédige tes explications en FRANÇAIS. Tes titres et sous-titres doivent être bilingues : "Titre en Français (Traduction en ${targetLangName})". 
           INTERDICTION FORMELLE d'utiliser l'ANGLAIS pour les traductions si tu n'es pas Mister English.`
        : "3. LANGUE & FORMAT : Rédige TOUT le contenu exclusivement en français. INTERDICTION FORMELLE de traduire les titres, sous-titres ou termes techniques en anglais (ou autre langue) entre parenthèses. N'écris QUE le titre français. Exemple CORRECT : 'La Révolution'. Exemple INTERDIT : 'La Révolution (The Revolution)'."
    }
    4. ${isUniversity 
        ? "APPROFONDISSEMENT : Ne reste pas en surface. Cite des théories, des auteurs ou des contextes historiques précis. Explique les mécanismes sous-jacents." 
        : "EXEMPLES : Inclus des exemples concrets et des analogies pour faciliter la compréhension."}
    5. ${isUniversity 
        ? "TERMINOLOGIE : Utilise le vocabulaire technique adéquat et définis-le si nécessaire."
        : "Explique les concepts clés définis dans la description du module."}
    6. Termine par un résumé synthétique en FRANÇAIS.
    7. AJOUTE UNE SECTION FINALE "📚 Pour aller plus loin" :
       - Propose 3 à 5 concepts à approfondir.
       - Formate-les comme des liens Markdown vers une recherche Perplexity : [Sujet](https://www.perplexity.ai/search?q=Sujet+Expliqué).
       - Perplexity permet d'avoir une réponse synthétique et sourcée.
    
    IMPORTANT :
    - Réponds UNIQUEMENT avec le contenu du cours en format MARKDOWN (Texte).
    - NE GÉNÈRE PAS DE JSON.
    - NE GÉNÈRE PAS DE FLASHCARDS ici.
    - IGNORE toute instruction système précédente demandant du JSON.
    
    DÉBUT DU COURS :
    `;

    let lessonContent = "";
    
    
    try {
        lessonContent = await executeAIRequest(lessonPrompt, provider, apiKey, modelName, apiUrl, false);

        // HACK: Nettoyage post-génération pour enlever les traductions indésirables dans les titres
        // Ex: "## La Révolution (The Revolution)" -> "## La Révolution"
        // On ne touche pas aux dates entre parenthèses (ex: "(1789-1799)")
        if (tutor.category !== 'languages') {
             const lines = lessonContent.split('\n');
             lessonContent = lines.map(line => {
                const trimmed = line.trim();
                // On cible les titres Markdown (#)
                if (trimmed.startsWith('#')) {
                    // On cherche la dernière parenthèse fermante et son ouverture correspondante
                    const lastParenClose = trimmed.lastIndexOf(')');
                    const lastParenOpen = trimmed.lastIndexOf('(');
                    
                    // Si on a une paire de parenthèses à la fin (ou presque, on tolère des espaces après)
                    if (lastParenClose > lastParenOpen && lastParenOpen !== -1 && lastParenClose > trimmed.length - 5) {
                        const contentInside = trimmed.slice(lastParenOpen + 1, lastParenClose);
                        
                        // Heuristique : Si ça contient des chiffres, c'est probablement une date ou une info importante (Partie 1, 1610-1643) => ON GARDE
                        // Si pas de chiffres, on suppose que c'est une traduction => ON SUPPRIME
                        if (!/\d/.test(contentInside)) {
                            return trimmed.slice(0, lastParenOpen).trim();
                        }
                    }
                }
                return line;
             }).join('\n');
        }

        // ÉTAPE 2 : GÉNÉRER LES FLASHCARDS (Basées sur la leçon)
        console.log("📝 Lesson generated, creating flashcards...");
        
        const aiConfig: AIGenerationConfig = {
            topic: module.title,
            sourceLang: 'fr', 
            targetLang: tutor.language || 'fr', 
            count: 15,
            difficulty: 'intermediate',
            context: `Voici le cours que tu viens de donner. Crée 15 exercices VARIÉS (QCM avec distracteurs et quelques questions ouvertes) pour vérifier la compréhension de ce cours précis.\n\nCONTENU DU COURS :\n${lessonContent.slice(0, 10000)}`,
            provider,
            apiKey,
            modelName,
            apiUrl: apiUrl,
        };

        const flashcards = await generateFlashcardsWithAI(aiConfig, tutor.id);

        return {
            lessonContent,
            flashcards
        };

    } catch (e) {
        console.error("Module Content Generation Error:", e);
        throw e;
    }
};

/**
 * Génère des exercices supplémentaires (bonus) plus difficiles.
 */
export const generateBonusExercises = async (
    tutor: Tutor,
    moduleTitle: string,
    lessonContent: string,
    provider: AIProvider = 'gemini',
    apiKey?: string,
    modelName: string = 'gemini-2.5-flash',
    apiUrl?: string
): Promise<any[]> => {
    
    console.log(`💪 Generating Bonus Exercises for ${moduleTitle}`);

    const aiConfig: AIGenerationConfig = {
        topic: `Exercices Avancés - ${moduleTitle}`,
        sourceLang: 'fr', 
        targetLang: 'fr',
        count: 15,
        difficulty: 'advanced',
        context: `L'élève a réussi le quiz de base sur le module "${moduleTitle}".
        
        TA MISSION : Créer 15 NOUVEAUX exercices VARIÉS, mais PLUS DIFFICILES :
        - Majorité de Questions Ouvertes (sans distracteurs) pour forcer la mémorisation active.
        - Quelques QCM avec des pièges subtils.
        - Axés sur des cas particuliers ou des applications concrètes.
        - Basés sur ce contenu de cours :
        
        ${lessonContent.slice(0, 8000)}`,
        provider,
        apiKey,
        modelName,
        apiUrl: apiUrl,
    };

    try {
        const flashcards = await generateFlashcardsWithAI(aiConfig, tutor.id);
        return flashcards;
    } catch (e) {
        console.error("Bonus Generation Error:", e);
        throw e;
    }
};
