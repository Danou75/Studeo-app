import { Tutor, AIProvider } from '../types';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Execute AI Request adapted for Chat (Multi-turn)
 */
/**
 * Execute AI Request adapted for Chat (Multi-turn)
 */
export const executeAIRequest = async (
    messages: ChatMessage[],
    provider: AIProvider,
    apiKey?: string,
    modelName?: string,
    apiUrl?: string
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
                messages: messages,
                temperature: 0.7,
            })
        });

        if (!response.ok) throw new Error(`${provider} Error: ${await response.text()}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    }

    // 2. ANTHROPIC
    if (provider === 'anthropic') {
        if (!apiKey) throw new Error("Clé API Anthropic manquante.");

        // Anthropic doesn't support 'system' role in messages array the same way, usually it's a top parameter
        // But for simplicity let's adapt:
        const systemMessage = messages.find(m => m.role === 'system')?.content || "";
        const conversationMessages = messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
        }));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'anthropic-dangerous-direct-browser-access': 'true' // Only for local dev props
            },
            body: JSON.stringify({
                model: modelName,
                max_tokens: 1024,
                system: systemMessage,
                messages: conversationMessages
            })
        });

        if (!response.ok) throw new Error(`Anthropic Error: ${await response.text()}`);
        const data = await response.json();
        return data.content[0].text;
    }

    // 3. GOOGLE GEMINI
    if (provider === 'gemini') {
        if (!apiKey) throw new Error("Clé API Gemini manquante.");

        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));

        const systemInstruction = messages.find(m => m.role === 'system')?.content;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const body: any = { contents };
        if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`Gemini Error: ${await response.text()}`);
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    // 4. LOCAL (OLLAMA / LM STUDIO)
    if (provider === 'local') {
        const url = apiUrl || 'http://localhost:11434/v1/chat/completions';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                messages: messages,
                temperature: 0.7
            })
        });

        if (!response.ok) throw new Error(`Local AI Error: ${await response.text()}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    }

    throw new Error("Fournisseur IA inconnu.");
};

export const generateLabResponse = async (
    tutor: Tutor,
    conversationHistory: ChatMessage[],
    userMessage: string,
    config: any,
    options: { enableCorrection: boolean; activeLanguage?: string; conversationTheme?: string } = { enableCorrection: false }
): Promise<string> => {
    
    // Déterminer la langue cible
    // Priorité à l'option "activeLanguage" (format 'fr-FR', 'en-US', 'tr-TR', etc.)
    let targetLang = "Français";

    if (options.activeLanguage) {
        const langPart = options.activeLanguage.split('-')[0].toLowerCase();
        switch (langPart) {
            case 'en': targetLang = "Anglais"; break;
            case 'it': targetLang = "Italien"; break;
            case 'es': targetLang = "Espagnol"; break;
            case 'pt': targetLang = "Portugais"; break;
            case 'de': targetLang = "Allemand"; break;
            case 'tr': targetLang = "Turc"; break;
            case 'fr': targetLang = "Français"; break;
            default: targetLang = options.activeLanguage; // Fallback to code if unknown
        }
    } else {
        // Fallback: Détection par le nom (Legacy)
        const name = tutor.name.toLowerCase();
        if (name.includes('english') || name.includes('anglais')) targetLang = "Anglais";
        else if (name.includes('italian') || name.includes('italien') || name.includes('italiano')) targetLang = "Italien";
        else if (name.includes('spanish') || name.includes('espagnol') || name.includes('español')) targetLang = "Espagnol";
        else if (name.includes('português') || name.includes('portugais') || name.includes('portuguese')) targetLang = "Portugais";
        else if (name.includes('german') || name.includes('allemand') || name.includes('deutsch')) targetLang = "Allemand";
        else if (name.includes('turkish') || name.includes('turc') || name.includes('türkçe')) targetLang = "Turc";
    }

    const correctionInstruction = options.enableCorrection 
        ? `MODE CORRECTION ACTIVÉ: Tu es aussi un prof exigeant. Si le dernier message de l'utilisateur contient une erreur (grammaire, conjugaison, faux-ami), tu DOIS commencer ta réponse par un bloc [CORRECTION: explication courte de l'erreur et la version corrigée].`
        : `Ne corrige PAS systématiquement les erreurs mineures. Reformule subtilement si nécessaire.`;

    const themeContext = options.conversationTheme
        ? `\n    THÈME DE LA SESSION : "${options.conversationTheme}". Reste dans ce cadre thématique. Oriente chaque relance vers ce sujet.`
        : '';

    const labSystemPrompt = `
    ${tutor.systemPrompt}
    
    ⚠️ INSTRUCTION CRITIQUE (SYSTEM OVERRIDE) :
    IGNORE et OUBLIE toutes les instructions précédentes te demandant de générer du JSON, des Flashcards ou des Quiz.
    
    CONTEXTE : Tu es dans une session de "Laboratoire de Langues" (Chat Vocal).${themeContext}
    LANGUE CIBLE : ${targetLang}. Parle principalement dans cette langue.
    
    TON RÔLE : 
    1. Agir comme un partenaire de conversation naturel et bienveillant.
    2. Faire des réponses COURTES (1 à 3 phrases max). C'est crucial pour la fluidité vocale.
    3. NE JAMAIS générer de JSON complexe (sauf format demandé ci-dessous). UNIQUEMENT DU TEXTE.
    4. ${correctionInstruction}
    5. Relance toujours la discussion avec une courte question.
    
    IMPORTANT - FORMAT DE SORTIE STRICT :
    Tu dois structurer ta réponse exactement comme ceci (les blocs entre crochets sont optionnels sauf SUGGESTIONS) :
    
    [CORRECTION: ...si erreur détectée...]
    <Ta réponse naturelle en ${targetLang}>
    |||
    <Traduction française de ta réponse>
    |||
    [SUGGESTIONS: Suggestion courte 1; Suggestion courte 2; Suggestion courte 3]
    
    EXEMPLE DE SORTIE :
    [CORRECTION: Tu as dit "Io andare", il faut dire "Io vado"]
    Ciao! Dove vai di bello oggi?
    |||
    Salut ! Où vas-tu de beau aujourd'hui ?
    |||
    [SUGGESTIONS: Vado al parco; Vado al lavoro; Resto a casa]
    `;

    // On ne garde que les 10 derniers messages pour éviter de saturer le contexte
    const recentHistory = conversationHistory.slice(-10);

    const messages: ChatMessage[] = [
        { role: 'system', content: labSystemPrompt },
        ...recentHistory,
        { role: 'user', content: userMessage }
    ];

    // Extraction des clés API depuis la config
    let apiKey: string | undefined;
    let modelName: string = config.geminiModel;
    let apiUrl: string | undefined;

     switch (config.provider) {
        case 'gemini':
            apiKey = config.geminiApiKey;
            modelName = config.geminiModel;
            break;
        case 'openai':
            apiKey = config.openaiApiKey;
            modelName = config.openaiModel || 'gpt-4o';
            break;
        case 'anthropic':
            apiKey = config.anthropicApiKey;
            modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620';
            break;
         case 'mistral':
            apiKey = config.mistralApiKey;
            modelName = config.mistralModel || 'mistral-large-latest';
            break;
         case 'local':
             apiUrl = config.localApiUrl;
             modelName = config.localModelName;
             break;
    }

    return await executeAIRequest(messages, config.provider, apiKey, modelName, apiUrl);
};

export interface ScenarioStep {
    tutorText: string;
    tutorTranslation: string;
    userTarget: string;
    userTargetTranslation: string;
    userResponse?: string;
    hint?: string;
}

export const generateScenario = async (
    tutor: Tutor,
    topic: string,
    config: any,
    activeLanguage?: string
): Promise<ScenarioStep[]> => {
    
    let targetLang = "Français";

    if (activeLanguage) {
        const langPart = activeLanguage.split('-')[0].toLowerCase();
        switch (langPart) {
            case 'en': targetLang = "Anglais"; break;
            case 'it': targetLang = "Italien"; break;
            case 'es': targetLang = "Espagnol"; break;
            case 'pt': targetLang = "Portugais"; break;
            case 'de': targetLang = "Allemand"; break;
            case 'tr': targetLang = "Turc"; break;
            case 'fr': targetLang = "Français"; break;
            default: targetLang = activeLanguage; 
        }
    } else {
        const name = tutor.name.toLowerCase();
        if (name.includes('english') || name.includes('anglais')) targetLang = "Anglais";
        else if (name.includes('italian') || name.includes('italien') || name.includes('italiano')) targetLang = "Italien";
        else if (name.includes('spanish') || name.includes('espagnol') || name.includes('español')) targetLang = "Espagnol";
        else if (name.includes('português') || name.includes('portugais') || name.includes('portuguese')) targetLang = "Portugais";
        else if (name.includes('german') || name.includes('allemand') || name.includes('deutsch')) targetLang = "Allemand";
        else if (name.includes('turkish') || name.includes('turc') || name.includes('türkçe')) targetLang = "Turc";
    }

    const systemPrompt = `
    Tu es un expert pédagogique en langues.
    Ton objectif est de créer un SCÉNARIO DE JEU DE RÔLE (Role-Play) pour aider un élève à pratiquer le ${targetLang}.
    
    THÈME DU SCÉNARIO : "${topic}"
    LANGUE CIBLE : ${targetLang}
    CONTEXTE PÉDAGOGIQUE :
    Le scénario doit être un dialogue réaliste de 4 à 6 échanges entre un personnage (joué par le Tuteur) et l'élève.
    
    FORMAT DE SORTIE ATTENDU (JSON STRICT) :
    Tu dois retourner un tableau JSON d'objets, sans aucun texte autour (pas de markdown).
    Chaque objet représente une étape et contient :
    - tutorText : La phrase que le tuteur dit (en ${targetLang}).
    - tutorTranslation : Traduction française de la phrase du tuteur.
    - userTarget : La phrase que l'élève DOIT dire pour répondre (en ${targetLang}). Reste simple et naturel.
    - userTargetTranslation : Traduction française de la phrase de l'élève (servira d'instruction).
    
    Exemple de structure JSON pour le thème "Commander un café" :
    [
        {
            "tutorText": "Buongiorno! Cosa desidera ordinare?",
            "tutorTranslation": "Bonjour ! Que souhaitez-vous commander ?",
            "userTarget": "Vorrei un caffè macchiato, per favore.",
            "userTargetTranslation": "Je voudrais un café macchiato, s'il vous plaît."
        },
        ...
    ]
    `;

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Génère le scénario sur le thème : ${topic}` }
    ];

    let apiKey: string | undefined;
    let modelName: string = config.geminiModel;
    let apiUrl: string | undefined;

     switch (config.provider) {
        case 'gemini':
            apiKey = config.geminiApiKey;
            modelName = config.geminiModel;
            break;
        case 'openai':
            apiKey = config.openaiApiKey;
            modelName = config.openaiModel || 'gpt-4o';
            break;
        case 'anthropic':
            apiKey = config.anthropicApiKey;
            modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620';
            break;
         case 'mistral':
            apiKey = config.mistralApiKey;
            modelName = config.mistralModel || 'mistral-large-latest';
            break;
         case 'local':
             apiUrl = config.localApiUrl;
             modelName = config.localModelName;
             break;
    }

    try {
        const jsonResponse = await executeAIRequest(messages, config.provider, apiKey, modelName, apiUrl);
        // Clean markdown code blocks if present
        const cleanedJson = jsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson) as ScenarioStep[];
    } catch (e) {
        console.error("Error generating scenario JSON", e);
        // Fallback simple if JSON fails
        return [
            {
                tutorText: "Hello! Ready to start?",
                tutorTranslation: "Bonjour ! Prêt à commencer ?",
                userTarget: "Yes, I am ready.",
                userTargetTranslation: "Oui, je suis prêt."
            }
        ];
    }
};

// ===== CONVERSATIONAL MODE =====

export interface GrammarFocus {
    rule: string;
    explanation: string;
    example_incorrect: string;
    example_correct: string;
}

export interface LessonSuggestion {
    type: 'vocabulary' | 'grammar' | 'scenario';
    title: string;
    vocabulary_words?: { word: string; translation: string; example?: string }[];
    grammar_focus?: GrammarFocus;
    scenario_prompt?: string;
}

export interface ConversationSummary {
    errors: { original: string; corrected: string; explanation: string }[];
    vocabulary: { word: string; translation: string }[];
    fluency_score: number;
    strong_points: string[];
    next_theme_suggestion: string;
    error_patterns: string[];
    lesson_suggestions: LessonSuggestion[];
}

const resolveConfig = (config: any) => {
    let apiKey: string | undefined;
    let modelName = config.geminiModel;
    let apiUrl: string | undefined;
    switch (config.provider) {
        case 'gemini': apiKey = config.geminiApiKey; modelName = config.geminiModel; break;
        case 'openai': apiKey = config.openaiApiKey; modelName = config.openaiModel || 'gpt-4o'; break;
        case 'anthropic': apiKey = config.anthropicApiKey; modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620'; break;
        case 'mistral': apiKey = config.mistralApiKey; modelName = config.mistralModel || 'mistral-large-latest'; break;
        case 'local': apiUrl = config.localApiUrl; modelName = config.localModelName; break;
    }
    return { apiKey, modelName, apiUrl };
};

const resolveLang = (activeLanguage?: string): string => {
    if (!activeLanguage) return 'Français';
    const map: Record<string, string> = { en: 'Anglais', it: 'Italien', es: 'Espagnol', pt: 'Portugais', de: 'Allemand', tr: 'Turc', fr: 'Français' };
    return map[activeLanguage.split('-')[0].toLowerCase()] || activeLanguage;
};

export const generateConversationalOpener = async (
    tutor: Tutor,
    theme: string,
    config: any,
    activeLanguage?: string
): Promise<string> => {
    const targetLang = resolveLang(activeLanguage);
    const systemPrompt = `Tu es ${tutor.name}, un professeur de ${targetLang} chaleureux et enthousiaste.
Tu démarres une session de CAUSERIE GUIDÉE sur le thème : "${theme}".

Ton rôle : Lancer la conversation avec UNE question ouverte et engageante en lien avec le thème.
Règles :
- Une seule question courte et naturelle (1-2 phrases max)
- Invite l'utilisateur à partager son expérience personnelle
- Sois bienveillant et encourageant

FORMAT OBLIGATOIRE (respecte les séparateurs ||| ) :
<Ta question en ${targetLang}>
|||
<Traduction française>
|||
[SUGGESTIONS: Réponse courte 1; Réponse courte 2; Réponse courte 3]`;

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Commence la causerie sur le thème : ${theme}` }
    ];
    const { apiKey, modelName, apiUrl } = resolveConfig(config);
    return await executeAIRequest(messages, config.provider, apiKey, modelName, apiUrl);
};

export const generateConversationSummary = async (
    messages: ChatMessage[],
    activeLanguage: string,
    config: any
): Promise<ConversationSummary> => {
    const targetLang = resolveLang(activeLanguage);
    const conversationText = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? 'Élève' : 'Prof'}: ${m.content.split('|||')[0].replace(/\[.*?\]/g, '').trim()}`)
        .join('\n');

    const defaultSummary: ConversationSummary = {
        errors: [],
        vocabulary: [],
        fluency_score: 60,
        strong_points: ['Session complétée avec succès'],
        next_theme_suggestion: '',
        error_patterns: [],
        lesson_suggestions: []
    };

    const systemPrompt = `Tu es un professeur expert en pédagogie des langues. Ton rôle est d'analyser une conversation d'apprentissage du ${targetLang} et de produire un bilan pédagogique détaillé et personnalisé.

CONVERSATION ANALYSÉE :
${conversationText}

Génère UNIQUEMENT un objet JSON valide (sans markdown, sans texte avant ou après) avec EXACTEMENT cette structure :
{
  "fluency_score": 72,
  "strong_points": ["Point fort observé 1", "Point fort observé 2"],
  "errors": [
    {"original": "phrase erronée de l'élève", "corrected": "version correcte", "explanation": "explication pédagogique courte"}
  ],
  "error_patterns": ["Type d'erreur récurrente 1 (ex: accord des adjectifs)", "Type d'erreur récurrente 2"],
  "vocabulary": [{"word": "mot clé du thème", "translation": "traduction française"}],
  "next_theme_suggestion": "Thème suggéré pour la prochaine causerie",
  "lesson_suggestions": [
    {
      "type": "vocabulary",
      "title": "Vocabulaire à réviser : [thème]",
      "vocabulary_words": [
        {"word": "mot", "translation": "traduction", "example": "phrase d'exemple en ${targetLang}"}
      ]
    },
    {
      "type": "grammar",
      "title": "Règle à travailler : [nom de la règle]",
      "grammar_focus": {
        "rule": "Énoncé de la règle en français",
        "explanation": "Explication claire et concise de la règle (2-3 phrases max)",
        "example_incorrect": "Exemple d'erreur typique en ${targetLang}",
        "example_correct": "La même phrase correctement formulée en ${targetLang}"
      }
    },
    {
      "type": "scenario",
      "title": "Scénario de pratique recommandé",
      "scenario_prompt": "Décris en français un scénario de jeu de rôle pour pratiquer les points faibles identifiés. Ex : Réserver une table au restaurant en utilisant le passé composé correctement"
    }
  ]
}

RÈGLES IMPORTANTES :
- fluency_score : entier 0-100 (évalue fluidité, richesse lexicale, correction grammaticale)
- strong_points : 2-3 observations encourageantes et spécifiques
- errors : 3-4 erreurs les plus significatives (grammaire, vocabulaire, syntaxe)
- error_patterns : 1-3 types d'erreurs récurrents (ex: "Utilisation du subjonctif", "Genre des noms")
- vocabulary : 5-8 mots importants pour le thème ou oubliés par l'élève
- lesson_suggestions : EXACTEMENT 3 suggestions (1 vocabulary, 1 grammar, 1 scenario)
- Si l'élève n'a fait aucune erreur notable : errors=[], error_patterns=[], fluency_score élevé, strong_points très positifs`;

    const msgs: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Génère le bilan pédagogique complet.' }
    ];
    const { apiKey, modelName, apiUrl } = resolveConfig(config);

    try {
        const response = await executeAIRequest(msgs, config.provider, apiKey, modelName, apiUrl);

        let jsonStr = '';
        const codeBlock = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlock) { jsonStr = codeBlock[1]; }
        if (!jsonStr) {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonStr = jsonMatch[0];
        }
        if (!jsonStr) {
            console.warn('No JSON in summary response, using default.');
            return defaultSummary;
        }

        const p = JSON.parse(jsonStr);
        return {
            fluency_score: typeof p.fluency_score === 'number' ? Math.min(100, Math.max(0, p.fluency_score)) : 60,
            strong_points: Array.isArray(p.strong_points) ? p.strong_points : [],
            errors: Array.isArray(p.errors) ? p.errors : [],
            error_patterns: Array.isArray(p.error_patterns) ? p.error_patterns : [],
            vocabulary: Array.isArray(p.vocabulary) ? p.vocabulary : [],
            next_theme_suggestion: typeof p.next_theme_suggestion === 'string' ? p.next_theme_suggestion : '',
            lesson_suggestions: Array.isArray(p.lesson_suggestions)
                ? p.lesson_suggestions.filter((s: any) => s && s.type && s.title)
                : []
        };
    } catch (e) {
        console.error('Summary generation/parsing failed:', e);
        return defaultSummary;
    }
};

