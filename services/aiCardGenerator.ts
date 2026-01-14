import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';
import { Flashcard, AIGenerationConfig, AIProvider } from '../types';
import { getTutorPrompt } from '../constants/promptSelector';

/**
 * Génère des flashcards (Texte ou Vision) avec Gemini ou Local AI.
 */
export const generateFlashcardsWithAI = async (
    config: AIGenerationConfig, 
    tutorId?: string
): Promise<Flashcard[]> => {
    const { topic, sourceLang, targetLang, count, difficulty, context, provider, image, media } = config;
    
    // --- MODE MULTIMODAL (Image, Audio, Vidéo) ---
    if (image || media) {
         console.log(`📸/🎥 Multimodal Mode Activated (${provider})`);
         
         const activeProvider = provider || 'gemini';
         let apiKey = config.apiKey || "";
         let url = '';
         let model = config.modelName || "";
         let headers: Record<string, string> = { 'Content-Type': 'application/json' };
         let payload: any = {};

         const mediaData = image || (media ? media.data : null);
         const mimeType = image ? "image/jpeg" : (media ? media.mimeType : "application/octet-stream");

         if (!mediaData) throw new Error("Données média manquantes");

         const multimodalPrompt = `
         ANALYSE DE CONTENU ET GÉNÉRATION DE QUIZ
         Tu es un assistant pédagogique expert.
         
         Sujet: "${topic}"
         Cible: Étudiant niveau ${difficulty}
         Langue: ${sourceLang}
         
         TA MISSION :
         1. Analyse le contenu du document, de la transcription ou du média fourni.
         2. Identifie les points clés, définitions, et informations importantes.
         3. Génère EXACTEMENT ${count} cartes QCM (Multiple Choice) basées STRICTEMENT sur le contenu source fourni. 
         ATTENTION : Tu DOIS respecter scrupuleusement le nombre de fiches demandé (${count}). Ni plus, ni moins.
         Priorise les faits présents dans le contenu source par rapport au titre du sujet pour éviter les hallucinations basées sur le titre.
         
         FORMAT JSON STRICT (Tableau) :
         [
            {
                "question": "Question sur le contenu...",
                "answer": "Bonne réponse",
                "distractors": ["Faux 1", "Faux 2", "Faux 3"]
            }
         ]
         
         Réponds UNIQUEMENT avec le JSON.
         `;

         if (activeProvider === 'gemini') {
            apiKey = apiKey || localStorage.getItem('gemini_api_key') || '';
            model = model || 'gemini-1.5-flash';
            if (!apiKey) throw new Error("Clé API Gemini requise pour le mode Multimédia.");
            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            payload = {
                contents: [{
                    parts: [
                        { text: multimodalPrompt },
                        { inline_data: { mime_type: mimeType, data: mediaData } }
                    ]
                }]
            };
         } else if (activeProvider === 'openai' || activeProvider === 'mistral' || activeProvider === 'local') {
            if (activeProvider === 'openai') {
                if (!apiKey) throw new Error("Clé API OpenAI requise.");
                url = 'https://api.openai.com/v1/chat/completions';
                headers['Authorization'] = `Bearer ${apiKey}`;
                model = model || 'gpt-4o';
            } else if (activeProvider === 'mistral') {
                if (!apiKey) throw new Error("Clé API Mistral requise.");
                url = 'https://api.mistral.ai/v1/chat/completions';
                headers['Authorization'] = `Bearer ${apiKey}`;
                model = model || 'pixtral-12b-2409';
            } else {
                url = config.apiUrl || "";
                if (!url) throw new Error("URL API Local requise.");
                // Normalize Local URL
                url = url.replace(/\/$/, '');
                if (!url.includes('/chat/completions')) {
                    url = url.endsWith('/v1') ? `${url}/chat/completions` : `${url}/v1/chat/completions`;
                }
                model = model || 'local-model';
            }

            payload = {
                model: model,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: multimodalPrompt },
                            { 
                                type: "image_url", 
                                image_url: { 
                                    url: `data:${mimeType};base64,${mediaData}` 
                                } 
                            }
                        ]
                    }
                ],
                response_format: activeProvider === 'openai' ? { type: "json_object" } : undefined
            };
         } else if (activeProvider === 'anthropic') {
            if (!apiKey) throw new Error("Clé API Anthropic requise.");
            url = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            headers['anthropic-dangerous-direct-browser-access'] = 'true';
            model = model || 'claude-3-5-sonnet-20240620';

            payload = {
                model: model,
                max_tokens: 4096,
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "image",
                                source: {
                                    type: "base64",
                                    media_type: mimeType.startsWith('image/') ? mimeType : 'image/jpeg',
                                    data: mediaData
                                }
                            },
                            { type: "text", text: multimodalPrompt }
                        ]
                    }
                ]
            };
         } else {
             throw new Error(`Le fournisseur ${activeProvider} ne supporte pas encore le mode Multimédia.`);
         }
         
         try {
             const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
             });
             
             if (!response.ok) {
                  const err = await response.text();
                  throw new Error(`${activeProvider} Multimodal Error: ${err}`);
             }
             
             const data = await response.json();
             const text = (activeProvider === 'gemini') 
                ? data.candidates?.[0]?.content?.parts?.[0]?.text 
                : (activeProvider === 'anthropic' ? data.content?.[0]?.text : data.choices?.[0]?.message?.content);
             
             if (!text) throw new Error(`Réponse vide de ${activeProvider} Multimodal`);
             
             return parseAndFormatResponse(text, sourceLang, targetLang);
             
         } catch (e: any) {
             console.error("Multimodal Error:", e);
             throw new Error(`Erreur Multimodale (${activeProvider}): ${e.message}`);
         }
    }

    // --- MODE TEXTE CLASSIQUE (code existant optimisé) ---

    // Déterminer le provider
    // --- MODE TEXTE CLASSIQUE ---

    // Déterminer le provider (default gemini)
    const aiProvider: AIProvider = provider || 'gemini';
    
    console.log(`🤖 Generating AI Cards with ${aiProvider}:`, { topic, tutorId });

    // Construction du prompt (Code existant inchangé pour le prompt)
    let prompt: string;
    
    const isMixed = config.isMixed;
    const isDefinitionMode = sourceLang.toLowerCase() === targetLang.toLowerCase();
    const hasRichContext = context && context.length > 50;
    
    // Choose base identity
    let identityPrompt = "Tu es un expert pédagogique.";
    if (tutorId) {
        identityPrompt = getTutorPrompt(tutorId, aiProvider === 'local' ? 'local' : 'gemini');
    }

    if (isDefinitionMode || hasRichContext) {
        let instruction = "";
        if (isDefinitionMode) {
             instruction = `
        MODE QUIZ DE COMPRÉHENSION (Langues identiques : ${sourceLang}) :
        Génère un QCM de EXACTEMENT ${count} fiches. 
        Pour chaque item, fournis :
        - "question" : Une question claire.
        - "answer" : La bonne réponse.
        - "distractors" : Un tableau de 3 mauvaises réponses plausibles.
        RÈGLE ABSOLUE : Tu dois renvoyer précisément ${count} objets JSON.
        `;
        } else {
             instruction = `
        MODE TRADUCTION / VOCABULAIRE (${sourceLang} -> ${targetLang}) :
        Génère EXACTEMENT ${count} QCM de vocabulaire.
        - "question" : Le mot en ${sourceLang}
        - "answer" : La traduction en ${targetLang}
        - "distractors" : Un tableau de 3 fausses traductions.
        RÈGLE ABSOLUE : Tu dois renvoyer précisément ${count} objets JSON.
        `;
        }

        prompt = `
        ${identityPrompt}
        Sujet : "${topic}"
        Niveau : ${difficulty}
        
        ${instruction}

        ${context ? `
        === DOCUMENT DE RÉFÉRENCE ===
        ${context}
        =============================
        ` : ''}

        Format de sortie attendu: JSON uniquement. Tableau d'objets :
        [
            {
                "question": "...",
                "answer": "...",
                "distractors": ["...", "...", "..."]
            }
        ]
        Réponds UNIQUEMENT avec le JSON.
    `;
    
    } else if (tutorId) {
        const systemPrompt = identityPrompt;
        const mixedNote = isMixed ? "\nFORCE MIXED MODE: Mix classic questions, MCQs with distractors, and cloze deletions ([...]) in your results.\n" : "";
        prompt = `${systemPrompt}${mixedNote}
DEMANDE:
Sujet: "${topic}"
Nombre: ${count} (Tu DOIS générer EXACTEMENT ${count} fiches, c'est impératif pour la structure de l'application).
Niveau: ${difficulty}
${context ? `Contexte: ${context}` : ''}
Réponds UNIQUEMENT avec le JSON.`;

    } else if (isMixed) {
        prompt = `
        Tu es un expert pédagogique. Génère un QUIZ MIXTE de EXACTEMENT ${count} questions sur le sujet: "${topic}".
        Difficulté : ${difficulty}
        
        RÈGLE D'OR : Le tableau JSON doit contenir TRÈS PRÉCISÉMENT ${count} éléments.
        
        IMPORTANT: Mélange impérativement ces 4 formats dans le tableau JSON :
        1. FORMATE CLASSIQUE : { "type": "classic", "question": "...", "answer": "..." }
        2. FORMAT QCM : { "type": "mcq", "question": "...", "answer": "...", "distractors": ["faux1", "faux2", "faux3"] }
        3. FORMAT TEXTE À TROUS : { "type": "cloze", "text": "Phrase avec [mot] ou ...", "answers": ["mot"] }
        4. FORMAT DICTÉE : { "type": "classic", "question": "Mot/Phrase pour dictée", "answer": "Transcription exacte" }

        Langues : ${sourceLang} -> ${targetLang}.
        ${context ? `Contexte: ${context}` : ''}

        Réponds UNIQUEMENT avec un tableau JSON d'objets respectant ces formats.
        `;
    } else {
        prompt = `
        Génère EXACTEMENT ${count} flashcards bilingues. Pas une de moins.
        Sujet: "${topic}"
        Question (${sourceLang}) -> Réponse (${targetLang}).
        
        Format JSON uniquement:
        [
            {
                "question": "...",
                "answer": "..."
            }
        ]
    `;
    }

    try {
        let responseText = "";

        // --- NOUVEAUX PROVIDERS (OpenAI, Anthropic, Mistral) ---
        if (aiProvider === 'openai' || aiProvider === 'mistral') {
            const apiKey = config.apiKey;
            const apiUrl = aiProvider === 'mistral' 
                ? 'https://api.mistral.ai/v1/chat/completions' 
                : 'https://api.openai.com/v1/chat/completions';
            
            if (!apiKey) throw new Error(`Clé API ${aiProvider} manquante.`);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelName || (aiProvider === 'mistral' ? 'mistral-large-latest' : 'gpt-4o'),
                    messages: [
                        { role: "system", content: "You are a helpful assistant that outputs JSON only." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7,
                    // OpenAI supports json_object, Mistral partial support mostly
                    response_format: aiProvider === 'openai' ? { type: "json_object" } : undefined
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`${aiProvider} Error: ${err}`);
            }
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || "";

        } else if (aiProvider === 'anthropic') {
            const apiKey = config.apiKey;
            if (!apiKey) throw new Error("Clé API Anthropic manquante.");

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true' // In case we are in browser logic
                },
                body: JSON.stringify({
                    model: config.modelName || 'claude-3-5-sonnet-20240620',
                    max_tokens: 4096,
                    messages: [
                        { role: "user", content: prompt }
                    ]
                })
            });
            
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Anthropic Error: ${err}`);
            }
            const data = await response.json();
            responseText = data.content?.[0]?.text || "";

        } else {
            // --- LEGACY (Gemini / Local) ---
            const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

            if (!isTauri) {
                 // --- WEB MODE ---
                 if (config.provider === 'local') {
                     if (!config.apiUrl) throw new Error("URL API locale manquante");
                                         // Normalisation intelligente de l'URL
                     let endpoint = config.apiUrl.replace(/\/$/, '');
                     if (!endpoint.includes('/chat/completions')) {
                         if (endpoint.endsWith('/v1')) {
                             endpoint = `${endpoint}/chat/completions`;
                         } else {
                             endpoint = `${endpoint}/v1/chat/completions`;
                         }
                     }
    
                     const response = await fetch(endpoint, {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                             model: config.modelName || "local-model",
                             messages: [
                                 { role: "system", content: "You are a helpful assistant that outputs JSON only." },
                                 { role: "user", content: prompt }
                             ],
                             temperature: 0.7
                         })
                     });
    
                     if (!response.ok) throw new Error(`Local API Error: ${response.status}`);
                     const data = await response.json();
                     responseText = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
    
                 } else {
                     // --- GEMINI WEB PROXY FALBACK (if exists) ---
                     // Note: Ideally Gemini should also use direct fetch if key provided, 
                     // but keeping legacy path for safety if the user relied on a proxy.
                     const clientApiKey = config.apiKey || localStorage.getItem('gemini_api_key');
                     
                     // If we have a key, try direct fetch for Gemini too (Generative Language API)
                     // Because the /api/gemini/quiz endpoint might not exist in standalone
                     if (clientApiKey) {
                        const model = config.modelName || 'gemini-1.5-flash';
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clientApiKey}`;
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }]
                            })
                        });
                        if (!response.ok) throw new Error(`Gemini API Error: ${await response.text()}`);
                        const data = await response.json();
                        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                     } else {
                        throw new Error("Clé API Gemini manquante");
                     }
                 }
    
            } else {
                // --- TAURI DESKTOP MODE (Invoke Rust) ---
                if (config.provider === 'gemini') {
                    const apiKey = config.apiKey || localStorage.getItem('gemini_api_key');
                    if (!apiKey) throw new Error("Clé API manquante.");
    
                    responseText = await invoke<string>('generate_flashcards_command', { 
                        prompt,
                        apiKey: apiKey.trim(),
                        modelName: config.modelName
                    });
                } else if (config.provider === 'local') {
                    if (!config.apiUrl) throw new Error("URL de l'API locale manquante.");
                    
                    responseText = await invoke<string>('generate_flashcards_local', {
                        prompt,
                        apiUrl: config.apiUrl,
                        modelName: config.modelName
                    });
                }
            }
        }
        
        return parseAndFormatResponse(responseText, sourceLang, targetLang);

    } catch (error) {
        console.error("Erreur génération:", error);
        throw error;
    }
};

/**
 * Fonction unifiée pour parser le JSON et formater les cartes
 */
const parseAndFormatResponse = (responseText: string, sourceLang: string, targetLang: string): Flashcard[] => {
    // Nettoyage Markdown
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsedData;

    try {
        parsedData = JSON.parse(cleanedJson);
    } catch (e) {
        console.error("JSON PARSE ERROR:", e);
        // Tentative de rattrapage d'erreurs simples
        try {
             // Parfois l'IA ajoute du texte avant/après
             const firstBracket = cleanedJson.indexOf('[');
             const lastBracket = cleanedJson.lastIndexOf(']');
             if (firstBracket !== -1 && lastBracket !== -1) {
                 const sub = cleanedJson.substring(firstBracket, lastBracket + 1);
                 parsedData = JSON.parse(sub);
             } else {
                 throw e;
             }
        } catch (e2) {
             throw new Error("Format JSON invalide reçu de l'IA.");
        }
    }

    if (!Array.isArray(parsedData)) {
         if (typeof parsedData === 'object' && parsedData !== null) {
             parsedData = [parsedData];
         } else {
             throw new Error("L'IA n'a pas renvoyé un tableau valide.");
         }
    }

    // Helper pour extraire le texte d'un objet potentiel { fr: "..." }
    const extractText = (val: any, lang: string): string => {
        if (typeof val === 'string') return val;
        if (typeof val === 'object' && val !== null) {
            return val[lang] || val[lang.toLowerCase()] || val['fr'] || val['en'] || Object.values(val)[0] || "";
        }
        return String(val);
    };

    // Helper validation distracteurs
    const parseDistractors = (val: any, lang: string): string[] => {
        if (!Array.isArray(val)) {
             if (typeof val === 'string') {
                 if (val.includes(',')) return val.split(',').map(s => s.trim());
                 return [val];
             }
             return ["A", "B", "C"];
        }
        
        return val.map(d => extractText(d, lang)).filter(s => s.trim().length > 0);
    };

    return parsedData.map((item: any) => {
        // Détection QCM
        const hasDistractors = (item.distractors && item.distractors.length > 0) || (item.mcqData?.distractors);
        const forceMcq = hasDistractors || sourceLang === targetLang;

        if (forceMcq) {
            const rawQ = item.question || item.mcqData?.question || "Question ?";
            const rawA = item.answer || item.mcqData?.answer || "Réponse";
            const rawD = parseDistractors(item.distractors || item.mcqData?.distractors, sourceLang);
            
            return {
                id: uuidv4(),
                type: 'mcq',
                mcqData: {
                    question: { [sourceLang]: extractText(rawQ, sourceLang) },
                    answer: { [targetLang]: extractText(rawA, targetLang) },
                    distractors: rawD.map(d => ({ [targetLang]: d }))
                },
                srsData: initSRS()
            };
        } else if (item.type === 'cloze' || (item.text && item.answers)) {
            // Détection et formatage Texte à trous
            const rawText = item.text || item.question || "Phrase avec [trou]";
            const rawAnswers = Array.isArray(item.answers) ? item.answers : [item.answer || ""];
            
            return {
                id: uuidv4(),
                type: 'cloze',
                clozeData: {
                    text: { [sourceLang]: extractText(rawText, sourceLang) },
                    answers: { [targetLang]: rawAnswers.map((a: any) => extractText(a, targetLang)) }
                },
                srsData: initSRS()
            };
        } else {
            // Flashcard simple - Logique de parsing robuste
            let frontText = "Question";
            let backText = "Réponse";

            if (item.terms) {
                 // Structure type { terms: { fr: "...", it: "..." } } (Utilisé par Maestro/Tutors)
                 // Chercher la clé correspondant à sourceLang/targetLang (insensible à la casse)
                 const termKeys = Object.keys(item.terms);
                 const sourceKey = termKeys.find(k => k.toLowerCase() === sourceLang.toLowerCase()) || 
                                   termKeys.find(k => k.toLowerCase() === 'fr') || // Fallback commun
                                   termKeys[0];
                 const targetKey = termKeys.find(k => k.toLowerCase() === targetLang.toLowerCase()) || 
                                   termKeys.find(k => k.toLowerCase() !== 'fr' && k.toLowerCase() !== sourceLang.toLowerCase()) || // Prendre l'autre clé
                                   termKeys[1];

                 frontText = item.terms[sourceKey!] || "Question";
                 backText = item.terms[targetKey!] || "Réponse";

            } else {
                 // Structure plate { question: "...", answer: "..." } (Prompt générique)
                 const keys = Object.keys(item);
                 const qKey = keys.find(k => k.toLowerCase().includes('question') || k.toLowerCase() === sourceLang.toLowerCase()) || 'question';
                 const aKey = keys.find(k => k.toLowerCase().includes('answer') || k.toLowerCase() === targetLang.toLowerCase()) || 'answer';
                 
                 // Si qKey/aKey échouent, on tente de prendre fr/target ou keys[0]/keys[1]
                 frontText = item[qKey] || item[sourceLang.toLowerCase()] || item.fr || Object.values(item)[0] || "Question";
                 backText = item[aKey] || item[targetLang.toLowerCase()] || Object.values(item)[1] || "Réponse";
            }
            
            return {
                id: uuidv4(),
                type: 'classic',
                terms: {
                    [sourceLang]: String(frontText),
                    [targetLang]: String(backText)
                },
                srsData: initSRS()
            };
        }
    });
};


/**
 * Génère des distracteurs intelligents pour une carte donnée
 */
export const generateSmartDistractors = async (
    question: string,
    answer: string,
    sourceLang: string,
    targetLang: string,
    config: { provider?: string, apiKey?: string, apiUrl?: string, modelName?: string }
): Promise<string[]> => {
    const prompt = `
    Agis comme un expert pédagogique de niveau universitaire.
    Tâche : Générer 3 distracteurs (mauvaises réponses) pour un QCM de haut niveau.
    
    Question (${sourceLang}): "${question}"
    Bonne Réponse (${targetLang}): "${answer}"
    
    CRITÈRES D'EXCELLENCE POUR LES DISTRACTEURS :
    1. **Plausibilité Maximale** : Les distracteurs doivent être des réponses erronées mais crédibles pour un apprenant intermédiaire/avancé.
    2. **Pièges Cognitifs** : Utilise des faux-amis, des erreurs de conjugaison courantes, ou des mots phonétiquement proches.
    3. **Homogénéité** : Ils doivent avoir la même structure grammaticale, la même longueur et le même registre de langue que la bonne réponse.
    4. **Difficulté** : Le but est de tester la précision des connaissances. Évite absolument les réponses absurdes ou hors-sujet qui permettent d'éliminer par déduction facile.
    5. **Langue** : Les distracteurs DOIVENT être en ${targetLang}.
    
    Format de sortie STRICTEMENT JSON :
    ["Distracteur 1", "Distracteur 2", "Distracteur 3"]
    
    Réponds UNIQUEMENT avec le JSON, sans explications ni markdown.
    `;

    // On réutilise la même logique de provider que generateFlashcardsWithAI
    const aiProvider = config.provider || 'gemini';
    let responseText = "";

    try {
        if (aiProvider === 'openai') {
            const apiKey = config.apiKey;
            if (!apiKey) throw new Error("Clé API OpenAI manquante.");

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelName || 'gpt-4o',
                    messages: [
                        { role: "system", content: "You are a helpful assistant that outputs JSON only." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error("OpenAI Error");
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || "";

        } else if (aiProvider === 'mistral') {
            const apiKey = config.apiKey;
            if (!apiKey) throw new Error("Clé API Mistral manquante.");

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelName || 'mistral-large-latest',
                    messages: [
                        { role: "system", content: "You are a helpful assistant that outputs JSON only." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) throw new Error("Mistral Error");
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || "";

        } else if (aiProvider === 'anthropic') {
            const apiKey = config.apiKey;
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
                    model: config.modelName || 'claude-3-5-sonnet-20240620',
                    max_tokens: 1024,
                    messages: [
                        { role: "user", content: prompt }
                    ],
                    system: "You are a helpful assistant that outputs JSON only."
                })
            });
            
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Anthropic Error: ${err}`);
            }
            const data = await response.json();
            responseText = data.content?.[0]?.text || "";

        } else if (aiProvider === 'gemini') {
            const apiKey = config.apiKey || localStorage.getItem('gemini_api_key');
            if (!apiKey) throw new Error("Clé API Gemini requise.");
            
            const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
            
            if (isTauri) {
                 responseText = await invoke<string>('generate_flashcards_command', { 
                    prompt, apiKey: apiKey.trim(), modelName: config.modelName || 'gemini-1.5-flash'
                });
            } else {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelName || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (!response.ok) throw new Error("Gemini API Error");
                const data = await response.json();
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
        } else if (aiProvider === 'local') {
             const apiUrl = config.apiUrl;
             if (!apiUrl) throw new Error("URL API Local requise.");
             // ... logic same as main function ...
             // Simplified for brevity in this specific helper
             const endpoint = apiUrl.replace(/\/$/, '') + '/v1/chat/completions';

             const response = await fetch(endpoint, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     model: config.modelName || "local-model",
                     messages: [{ role: "user", content: prompt }]
                 })
             });
             const data = await response.json();
             responseText = data.choices?.[0]?.message?.content || "";
        }

        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
            return JSON.parse(cleaned.substring(start, end + 1));
        }
        return [];
    } catch (e) {
        console.error("Erreur génération distracteurs:", e);
        return [];
    }
};

const initSRS = () => ({
    interval: 0, repetitions: 0, easeFactor: 2.5,
    nextReview: new Date().toISOString(), lastReviewed: new Date().toISOString()
});
