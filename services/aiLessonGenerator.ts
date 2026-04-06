import { invoke } from '@tauri-apps/api/tauri';
import { v4 as uuidv4 } from 'uuid';
import { Lesson, AIGenerationConfig } from '../types';
import { TUTORS } from '../constants';
const getLessonPromptForTutor = (tutorId: string | undefined, topic: string, targetLang: string, context?: string): string => {
    const tutor = tutorId ? TUTORS.find(t => t.id === tutorId) : null;
    if (!tutor) return `Génère un cours détaillé sur : ${topic}`;

    // Détection robuste si c'est un prof de langue (basé sur la catégorie ou l'ID)
    const isLanguageTutor = tutor.category === 'languages' || 
                           (tutorId && ['mister-english', 'maestro-italiano', 'maestro-espanol', 'mestre-portugues', 'herr-deutsch', 'master-russe', 'efendi-turco', 'nauczyciel-polski'].includes(tutorId));

    let languageInstruction = "";

    if (isLanguageTutor) {
        const nativeName = tutor.language === 'it' ? 'Italien' : 
                          tutor.language === 'es' ? 'Espagnol' :
                          tutor.language === 'de' ? 'Allemand' :
                          tutor.language === 'pt' ? 'Portugais' :
                          tutor.language === 'ru' ? 'Russe' :
                          tutor.language === 'pl' ? 'Polonais' :
                          tutor.language === 'tr' ? 'Turc' :
                          tutor.language === 'en' ? 'Anglais' : 'ta langue';

        languageInstruction = `
        RÈGLE DE LANGUE CRUCIALE (Tu es prof de langue) :
        1. Ton TITRE PRINCIPAL (#) et tes SOUS-TITRES (##) DOIVENT être en FRANÇAIS, suivis de leur traduction en ${nativeName} entre parenthèses.
           Format : "# [Titre en Français] ([Titre en ${nativeName}])"
        2. TOUTES tes EXPLICATIONS, INTRODUCTIONS, DÉFINITIONS et ANALYSES doivent être en FRANÇAIS.
        3. INTERDICTION FORMELLE d'utiliser l'ANGLAIS pour les traductions ou explications (sauf si tu es Mister English).
        4. TOUS les EXEMPLES originaux, MOTS-CLÉS et PHRASES types doivent être dans la langue que tu enseignes (${targetLang}).
        5. NE TRADUIS PAS les exemples techniques (comme "radical") mais explique-les en français.
        `;
    } else {
        languageInstruction = `
        RÈGLE DE LANGUE CRUCIALE :
        - Rédige l'intégralité du cours en FRANÇAIS, sauf si le sujet exige des termes techniques dans une autre langue.
        - Ton style doit être captivant, érudit mais accessible.
        `;
    }

    const basePrompt = `
    Tu es ${tutor.name}. ${tutor.description}.
    
    TA MISSION : Rédiger un document pédagogique "Masterclass" détaillé, structuré et professionnel sur le sujet : "${topic}".
    
    ${context ? `CONTEXTE SUPPLÉMENTAIRE DONNÉ PAR L'ÉLÈVE : ${context}` : ''}

    ${languageInstruction}

    STRUCTURE OBLIGATOIRE DU DOCUMENT (Markdown) - UTILISE CES TITRES EXACTS :
    
    # [Titre en Français] ([Traduction en ${targetLang || "Langue Cible"}])
    
    ## Introduction
    [Présente le sujet en FRANÇAIS. Situe le contexte.]
    
    ## 1. [Concept Clé]
    [Explication approfondie en FRANÇAIS.]
    
    ## 2. [Analyse Détaillée]
    [Détails techniques, nuances, exceptions en FRANÇAIS avec exemples en ${targetLang || "langue cible"}.]
    
    ## 3. Exemples Concrets
    [Liste d'exemples pertinents en ${targetLang || "langue cible"} traduits ou expliqués.]
    
    ## Conclusion
    [Synthèse rapide en FRANÇAIS.]
    
    
    ## Pour aller plus loin
    (ATTENTION: Utilise EXACTEMENT ce titre "Pour aller plus loin", ne le traduis pas).
    
    Propose 3 à 5 suggestions pour approfondir le sujet, en MÉLANGEANT :
    - Des **sujets connexes** que l'élève pourrait te demander (sans lien URL, juste le titre du sujet)
    - Des **ressources externes** pertinentes sous forme de liens Markdown : [Titre de la ressource](URL)
      * Privilégie des liens vers Perplexity pour des recherches approfondies : https://www.perplexity.ai/search?q=Sujet+Expliqué
      * Ou vers des ressources académiques/culturelles de qualité
    
    Exemple de format attendu :
    - La Révolution Française et ses conséquences
    - [Les philosophes des Lumières sur Perplexity](https://www.perplexity.ai/search?q=Philosophes+Lumières)
    - Le rôle de Versailles dans la monarchie absolue
    - [Documentaire : Louis XIV sur Arte](https://www.arte.tv/fr/videos/...)
    
    
    STYLE ET TON :
    - Incarne ton personnage (${tutor.emoji} ${tutor.name}).
    - Utilise le **gras** pour les termes importants.
    - Utilise des listes à puces pour aérer.
    - Sois généreux dans la longueur : il s'agit d'un cours complet, pas d'une fiche résumé.
    
    Réponds UNIQUEMENT avec le contenu du cours en Markdown.
    `;

    return basePrompt;
};

/**
 * Génère une leçon complète avec l'IA
 */
export const generateLessonWithAI = async (
    config: AIGenerationConfig, 
    tutorId?: string
): Promise<Lesson> => {
    const { topic, context, provider, targetLang } = config;
    
    console.log(`📚 Generating Lesson with ${provider} for tutor ${tutorId}`);

    let prompt = getLessonPromptForTutor(tutorId, topic, targetLang, context);
    const modelName = config.modelName;
    const apiUrl = config.apiUrl;
    
    // Fix: Prioritize config API key, then fallback to localStorage
    const apiKey = config.apiKey || (provider === 'gemini' ? localStorage.getItem('gemini_api_key') : undefined);
    
    // Check for Multimodal Input
    const media = config.media || (config.image ? { data: config.image, mimeType: 'image/jpeg' } : null); // Fallback for raw image string

    // Enhance prompt for Multimodal
    if (media) {
        prompt = `
DOCUMENTS SOURCES (PDF/Image joint) : L'utilisateur a fourni un fichier.
INSTRUCTION PRIORITAIRE : Analyse le document joint. Le cours doit être basé sur le contenu de ce document (résumé, explication, correction d'exercice, etc.).

${prompt}`;
    }

    try {
        // --- DÉTECTION MODE TAURI VS WEB ---
        // @ts-ignore
        const isTauri = !!window.__TAURI_IPC__;
        let responseText = "";

        // SPECIAL HANDLING FOR MULTIMODAL (Universal)
        if (media) {
             console.log(`📸 Generating Multimodal Lesson with ${provider}`);
             
             if (provider === 'gemini') {
                 if (!apiKey) throw new Error("Clé API Gemini manquante");
                 const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName || 'gemini-2.5-flash'}:generateContent?key=${apiKey.trim()}`;
                 const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ 
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: media.mimeType, data: media.data } }
                            ] 
                        }]
                    })
                });
                if (!response.ok) throw new Error(`Gemini Multimodal API Error: ${await response.text()}`);
                const data = await response.json();
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

             } else if (provider === 'openai' || provider === 'mistral' || provider === 'local') {
                let url = '';
                let headers: Record<string, string> = { 'Content-Type': 'application/json' };
                let model = modelName || "";

                if (provider === 'openai') {
                    if (!apiKey) throw new Error("Clé API OpenAI manquante");
                    url = 'https://api.openai.com/v1/chat/completions';
                    headers['Authorization'] = `Bearer ${apiKey}`;
                    model = model || 'gpt-4o';
                } else if (provider === 'mistral') {
                    if (!apiKey) throw new Error("Clé API Mistral manquante");
                    url = 'https://api.mistral.ai/v1/chat/completions';
                    headers['Authorization'] = `Bearer ${apiKey}`;
                    model = model || 'pixtral-12b-2409';
                } else {
                    if (!apiUrl) throw new Error("URL API Local manquante");
                    url = apiUrl.replace(/\/$/, '') + (apiUrl.includes('/chat/completions') ? '' : (apiUrl.endsWith('/v1') ? '/chat/completions' : '/v1/chat/completions'));
                    model = model || 'local-model';
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: model,
                        messages: [{
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: `data:${media.mimeType};base64,${media.data}` } }
                            ]
                        }]
                    })
                });
                if (!response.ok) throw new Error(`${provider} Multimodal Error: ${await response.text()}`);
                const data = await response.json();
                responseText = data.choices?.[0]?.message?.content || "";

             } else if (provider === 'anthropic') {
                if (!apiKey) throw new Error("Clé API Anthropic manquante");
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: modelName || "claude-3-5-sonnet-20240620",
                        messages: [{
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
                        }],
                        max_tokens: 4096
                    })
                });
                if (!response.ok) throw new Error(`Anthropic Multimodal Error: ${await response.text()}`);
                const data = await response.json();
                responseText = data.content?.[0]?.text || "";
             }

        } else if (!isTauri) {
            console.log("🌐 Web Mode available");
            
            if (provider === 'mistral') {
                if (!apiKey) throw new Error("Clé API Mistral manquante");

                const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName || "mistral-large-latest",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.7
                    })
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`Mistral API Error: ${err}`);
                }
                const data = await response.json();
                responseText = data.choices?.[0]?.message?.content || "";

            } else if (provider === 'openai') {
                if (!apiKey) throw new Error("Clé API OpenAI manquante");

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName || "gpt-4o",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.7
                    })
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`OpenAI API Error: ${err}`);
                }
                const data = await response.json();
                responseText = data.choices?.[0]?.message?.content || "";

            } else if (provider === 'anthropic') {
                if (!apiKey) throw new Error("Clé API Anthropic manquante");

                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true'
                    },
                    body: JSON.stringify({
                        model: modelName || "claude-3-5-sonnet-20240620",
                        messages: [{ role: "user", content: prompt }],
                        max_tokens: 4096,
                        temperature: 0.7
                    })
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`Anthropic API Error: ${err}`);
                }
                const data = await response.json();
                responseText = data.content?.[0]?.text || "";

            } else if (provider === 'gemini') {
                // Text only (Web)
                if (!apiKey) throw new Error("Clé API Gemini manquante");

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName || 'gemini-2.5-flash'}:generateContent?key=${apiKey.trim()}`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });

                if (!response.ok) {
                    const err = await response.text();
                    throw new Error(`Gemini API Error: ${err}`);
                }
                
                const data = await response.json();
                responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            } else {
                // Local AI
                if (!apiUrl) throw new Error("URL API locale manquante");
                // ... Local AI Logic ...
                let endpoint = apiUrl.replace(/\/$/, '');
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
                        model: modelName || "local-model",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.7
                    })
                });
                if (!response.ok) throw new Error(`Local API Error: ${response.status}`);
                const data = await response.json();
                responseText = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
            }
        } else {
            // --- MODE TAURI (Rust) for TEXT ONLY ---
            if (provider === 'gemini') {
                if (!apiKey) throw new Error("Clé API Gemini manquante");
                responseText = await invoke<string>('generate_flashcards_command', {
                    prompt, apiKey: apiKey.trim(), modelName
                });
            } else if (provider === 'local') {
                if (!apiUrl) throw new Error("URL API locale manquante");
                responseText = await invoke<string>('generate_flashcards_local', {
                    prompt, apiUrl, modelName
                });
            } else {
                 // Fallback to JS Fetch for other providers in Desktop
                 if (!apiKey) throw new Error(`Clé API ${provider} manquante`);
                 
                 let url = '';
                 let body = {};
                 
                 // Reuse fetch logic or simplify
                 if (provider === 'mistral') {
                    url = 'https://api.mistral.ai/v1/chat/completions';
                    body = { model: modelName || "mistral-large-latest", messages: [{ role: "user", content: prompt }] };
                 } else if (provider === 'openai') {
                    url = 'https://api.openai.com/v1/chat/completions';
                    body = { model: modelName || "gpt-4o", messages: [{ role: "user", content: prompt }] };
                 } else if (provider === 'anthropic') {
                    url = 'https://api.anthropic.com/v1/messages';
                 }

                 if (url) {
                    const response = await fetch(url, {
                     method: 'POST',
                        headers: { 
                             'Content-Type': 'application/json',
                             'Authorization': `Bearer ${apiKey}`,
                             ...(provider==='anthropic' ? {'x-api-key': apiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'} : {})
                        },
                        body: JSON.stringify(provider === 'anthropic' ? {
                            model: modelName || "claude-3-5-sonnet-20240620", messages: [{role:"user", content:prompt}], max_tokens:4096
                        } : body)
                    });
                     if (!response.ok) throw new Error(`${provider} API Error: ${await response.text()}`);
                     const data = await response.json();
                     responseText = provider === 'anthropic' 
                        ? data.content?.[0]?.text 
                        : data.choices?.[0]?.message?.content;
                 } else {
                     throw new Error(`Provider ${provider} non supporté en mode Desktop natif pour le moment.`);
                 }
            }
        }

        // Nettoyage Markdown
        const cleanedContent = responseText.replace(/^```markdown/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

        return {
            id: uuidv4(),
            topic: topic,
            tutorId: tutorId,
            content: cleanedContent,
            createdAt: new Date().toISOString(),
            language: 'fr'
        };

    } catch (error) {
        console.error("Erreur lors de la génération de la leçon:", error);
        throw error;
    }
};
