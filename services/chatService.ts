// Service de gestion des conversations avec les tuteurs

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface ChatSession {
    id: string;
    tutorName: string;
    tutorSubject: string;
    messages: ChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Service de gestion des conversations avec les tuteurs
 */
export class ChatService {
    private static STORAGE_KEY = 'studeo_chat_sessions';

    /**
     * Récupère toutes les sessions de chat
     */
    static getSessions(): ChatSession[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            
            let sessions = JSON.parse(stored);
            if (!Array.isArray(sessions)) return [];

            // Nettoyage et Migration forcée
            const uniqueSessions: ChatSession[] = [];
            const seenIds = new Set<string>();
            let changed = false;

            sessions.forEach((s: any) => {
                // Reconstruction propre de l'objet
                let session = {
                    ...s,
                    createdAt: new Date(s.createdAt),
                    updatedAt: new Date(s.updatedAt),
                    messages: Array.isArray(s.messages) ? s.messages.map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp)
                    })) : []
                };

                // Double sécurité : si par miracle le random collisionne, on régénère encore
                while (seenIds.has(session.id)) {
                    const extraRandom = Math.random().toString(36).substr(2, 5);
                    session.id = `${session.id}-${extraRandom}`;
                    changed = true;
                }

                seenIds.add(session.id);
                uniqueSessions.push(session);
            });

            uniqueSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            
            if (changed) {
                console.log('Sessions cleaned and migrated: Saving updates to localStorage');
                this.saveSessions(uniqueSessions);
            }

            return uniqueSessions;
        } catch (e) {
            console.error('Error in getSessions', e);
            return [];
        }
    }

    /**
     * Sauvegarde les sessions avec gestion d'erreur de quota
     */
    static saveSessions(sessions: ChatSession[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        } catch (e: any) {
            console.error('Erreur sauvegarde sessions (Quota ou autre)', e);
            
            // Si erreur de quota, on essaie de nettoyer les messages trop anciens ou trop lourds
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                try {
                    // Stratégie de nettoyage : garder seulement les 50 derniers messages de chaque session
                    // et tronquer les messages > 10000 chars
                    const cleanSessions = sessions.map(s => ({
                        ...s,
                        messages: s.messages.slice(-50).map(m => ({
                            ...m,
                            content: m.content.length > 10000 ? m.content.substring(0, 10000) + '... (tronqué)' : m.content
                        }))
                    }));
                    
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanSessions));
                    console.log('Sessions nettoyées et sauvegardées après erreur de quota');
                    alert('Votre historique de conversation était trop plein. Il a été optimisé pour libérer de l\'espace.');
                } catch (retryError) {
                    console.error('Impossible de sauver même après nettoyage', retryError);
                    alert('Erreur critique : Espace de stockage plein. Impossible de sauvegarder ou supprimer. Veuillez vider le cache de l\'application.');
                }
            }
        }
    }

    /**
     * Crée une nouvelle session ou réutilise une existante vide
     */
    static createSession(tutorName: string, tutorSubject: string): ChatSession {
        const sessions = this.getSessions();
        
        // Nettoyage : Si on a déjà une session VIDE pour ce tuteur, on la réutilise
        // au lieu d'en créer une nouvelle inutile.
        const existingEmptySession = sessions.find(s => 
            s.tutorName === tutorName && 
            s.tutorSubject === tutorSubject && 
            s.messages.length === 0
        );

        if (existingEmptySession) {
            // On remonte la session existante en haut de la liste (mise à jour date)
            existingEmptySession.updatedAt = new Date();
            this.deleteSession(existingEmptySession.id); // On l'enlève de sa position
            const updatedSessions = this.getSessions(); // On recharge
            updatedSessions.unshift(existingEmptySession); // On remet au début
            this.saveSessions(updatedSessions);
            return existingEmptySession;
        }

        const session: ChatSession = {
            id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tutorName,
            tutorSubject,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        sessions.unshift(session);
        this.saveSessions(sessions);

        return session;
    }

    /**
     * Nettoie toutes les sessions vides (0 messages) sauf celle spécifiée (optionnel)
     */
    static purgeEmptySessions(keepSessionId?: string): void {
        const sessions = this.getSessions();
        const initialCount = sessions.length;
        
        // On garde les sessions qui ont des messages OU qui correspondent à l'ID à garder (session active)
        const cleanedSessions = sessions.filter(s => 
            s.messages.length > 0 || (keepSessionId && s.id === keepSessionId)
        );

        if (cleanedSessions.length !== initialCount) {
            console.log(`Purge: ${initialCount - cleanedSessions.length} sessions vides supprimées.`);
            this.saveSessions(cleanedSessions);
        }
    }

    /**
     * Ajoute un message à une session
     */
    static addMessage(sessionId: string, role: 'user' | 'assistant', content: string): ChatSession | null {
        const sessions = this.getSessions();
        const session = sessions.find(s => s.id === sessionId);
        
        if (!session) return null;

        const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            role,
            content,
            timestamp: new Date()
        };

        session.messages.push(message);
        session.updatedAt = new Date();

        this.saveSessions(sessions);
        return session;
    }

    /**
     * Récupère une session par ID
     */
    static getSession(sessionId: string): ChatSession | null {
        const sessions = this.getSessions();
        return sessions.find(s => s.id === sessionId) || null;
    }

    /**
     * Supprime une session
     */
    static deleteSession(sessionId: string): void {
        const sessions = this.getSessions().filter(s => s.id !== sessionId);
        this.saveSessions(sessions);
    }

    /**
     * Exporte une conversation en Markdown
     */
    static exportToMarkdown(sessionId: string): string {
        const session = this.getSession(sessionId);
        if (!session) return '';

        let markdown = `# Conversation avec ${session.tutorName}\n\n`;
        markdown += `**Sujet :** ${session.tutorSubject}\n\n`;
        markdown += `**Date :** ${session.createdAt.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}\n\n`;
        markdown += `---\n\n`;

        session.messages.forEach(msg => {
            const time = msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const author = msg.role === 'user' ? '**Vous**' : `**${session.tutorName}**`;
            markdown += `### ${author} (${time})\n\n${msg.content}\n\n`;
        });

        return markdown;
    }

    /**
     * Télécharge une conversation en fichier Markdown
     */
    static downloadMarkdown(sessionId: string): void {
        const markdown = this.exportToMarkdown(sessionId);
        const session = this.getSession(sessionId);
        if (!session) return;

        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversation-${session.tutorName}-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Génère des flashcards depuis une conversation
     */
    static async generateFlashcardsFromConversation(
        sessionId: string,
        provider: string,
        apiKey?: string,
        modelName?: string,
        count: number = 10
    ): Promise<any> {
        const session = this.getSession(sessionId);
        if (!session) throw new Error('Session introuvable');
        if (!apiKey) throw new Error('Clé API manquante');

        // Construire le contexte de la conversation
        const conversationText = session.messages
            .map(msg => `${msg.role === 'user' ? 'Élève' : session.tutorName}: ${msg.content}`)
            .join('\n\n');

        const prompt = `
GÉNÉRATION DE FLASHCARDS DEPUIS UNE CONVERSATION

Voici une conversation pédagogique entre un élève et ${session.tutorName} sur le sujet "${session.tutorSubject}" :

${conversationText}

TA MISSION :
Analyse cette conversation et génère ${count} flashcards QCM de haute qualité pour :
1. Consolider les concepts clés abordés
2. Tester la compréhension des points importants
3. Renforcer les apprentissages de la discussion

RÈGLES :
- Questions basées sur les concepts réellement discutés
- Distracteurs SUBTILS, PIÉGEUX et NON-EVIDENTS (éviter les réponses absurdes ou trop faciles)
- Chaque distracteur doit sembler être une bonne réponse pour quelqu'un qui n'a pas bien compris
- Couvrir différents aspects de la conversation
- Progression du simple au complexe
- Les distracteurs doivent avoir la même longueur et la même structure grammaticale que la bonne réponse

FORMAT JSON STRICT (Tableau) :
[
    {
        "question": "Question claire sur un concept discuté...",
        "answer": "La bonne réponse",
        "distractors": ["Faux plausible 1", "Faux plausible 2", "Faux plausible 3"]
    }
]

Réponds UNIQUEMENT avec le JSON.`;

        // Appeler l'API selon le provider
        let responseText = '';

        if (provider === 'gemini') {
            const model = modelName || 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) throw new Error(`Gemini API Error: ${await response.text()}`);
            const data = await response.json();
            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        } else if (provider === 'openai') {
            const model = modelName || 'gpt-4o';
            const url = 'https://api.openai.com/v1/chat/completions';
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) throw new Error(`OpenAI API Error: ${await response.text()}`);
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || '';

        } else if (provider === 'anthropic') {
            const model = modelName || 'claude-3-5-sonnet-20240620';
            const url = 'https://api.anthropic.com/v1/messages';
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) throw new Error(`Anthropic API Error: ${await response.text()}`);
            const data = await response.json();
            responseText = data.content?.[0]?.text || '';

        } else if (provider === 'mistral') {
            const model = modelName || 'mistral-large-latest';
            const url = 'https://api.mistral.ai/v1/chat/completions';
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) throw new Error(`Mistral API Error: ${await response.text()}`);
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || '';

        } else if (provider === 'local') {
            const url = apiKey || 'http://localhost:11434/v1/chat/completions';
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelName || 'llama3',
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) throw new Error(`Local API Error: ${await response.text()}`);
            const data = await response.json();
            responseText = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';

        } else {
            throw new Error(`Provider ${provider} non supporté pour la génération de flashcards`);
        }

        // Parser le JSON
        const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        let flashcardsData;

        try {
            flashcardsData = JSON.parse(cleanedJson);
        } catch (e) {
            // Tentative de récupération
            const firstBracket = cleanedJson.indexOf('[');
            const lastBracket = cleanedJson.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                const sub = cleanedJson.substring(firstBracket, lastBracket + 1);
                flashcardsData = JSON.parse(sub);
            } else {
                throw new Error('Format JSON invalide reçu de l\'IA');
            }
        }

        if (!Array.isArray(flashcardsData)) {
            flashcardsData = [flashcardsData];
        }

        return flashcardsData;
    }

    /**
     * Envoie un message au tuteur et obtient une réponse
     */
    static async sendMessage(
        sessionId: string,
        tutorName: string,
        tutorSubject: string,
        tutorStyle: string,
        provider: string,
        apiKey?: string,
        modelName?: string
    ): Promise<string> {
        // Récupérer l'historique de la conversation
        const sessions = this.getSessions();
        const session = sessions.find(s => s.id === sessionId);
        
        // Sécurité : Si la session n'est pas trouvée (e.g. ID vient de changer ou pas encore sauvé)
        // on essaie de charger l'historique par tuteur ou on crée une session temporaire
        let conversationHistory = session?.messages || [];

        if (!apiKey && provider !== 'local') {
            throw new Error('Clé API manquante');
        }

        // Construire le prompt système du tuteur
        const systemPrompt = `Tu es ${tutorName}, un tuteur personnel expert en ${tutorSubject}.

# Ton Rôle
Tu incarnes le ton, la voix et les traits de personnalité d'un tuteur complet et bienveillant. Ton objectif est d'aider l'utilisateur à acquérir une compréhension plus profonde de ses questions en tant que tuteur, en te concentrant sur des réponses succinctes et des questions de suivi inquisitives. Tu enseignes en engageant une discussion avec ton élève.

# Tes Traits de Personnalité
Tu combines rigueur intellectuelle et chaleur interpersonnelle ; tu es érudit mais possèdes une véritable empathie pédagogique. Tu as une curiosité intellectuelle inhérente qui est contagieuse dans les contextes éducatifs, ainsi qu'une intelligence émotionnelle nuancée qui te permet de calibrer tes réponses au niveau de ton interlocuteur.

Ton style d'enseignement est : ${tutorStyle}

# Comment tu définis une bonne réponse
Tu cultives un dialogue authentique en répondant aux détails partagés, en posant des questions ciblées et pertinentes, et en affichant un véritable sens de la curiosité. Pour les requêtes complexes, fournis des réponses approfondies. Pour les questions simples, reste concis. Sois présent, réfléchi et authentique.

# Tes Principes Pédagogiques
- Pose des questions socratiques pour guider la réflexion
- Adapte ton niveau de langage à celui de l'élève
- Célèbre les progrès, même petits
- Transforme les erreurs en opportunités d'apprentissage
- Encourage l'autonomie intellectuelle
- Utilise des exemples concrets et pertinents

IMPORTANT : Réponds de manière conversationnelle, naturelle et engageante. N'hésite pas à poser des questions de suivi pour approfondir la compréhension.
Attention au formatage Markdown : assure-toi de toujours insérer des espaces avant et après les balises de gras (**) et d'italique (*) lorsqu'elles sont entourées de texte, pour éviter que les mots ne soient collés à l'affichage (ex: "mot **gras** mot" et non "mot**gras**mot").`;

        try {
            let response = '';

            if (provider === 'gemini') {
                response = await this.callGemini(systemPrompt, conversationHistory, apiKey!, modelName);
            } else if (provider === 'openai') {
                response = await this.callOpenAI(systemPrompt, conversationHistory, apiKey!, modelName);
            } else if (provider === 'anthropic') {
                response = await this.callAnthropic(systemPrompt, conversationHistory, apiKey!, modelName);
            } else if (provider === 'mistral') {
                response = await this.callMistral(systemPrompt, conversationHistory, apiKey!, modelName);
            } else if (provider === 'local') {
                response = await this.callLocal(systemPrompt, conversationHistory, apiKey || '', modelName);
            } else {
                throw new Error(`Provider ${provider} non supporté`);
            }

            return response;

        } catch (error: any) {
            console.error('Chat error:', error);
            throw new Error(`Erreur de communication avec le tuteur: ${error.message}`);
        }
    }

    /**
     * Helper pour générer une réponse IA simple hors contexte chat
     */
    static async generateAIResponse(params: {
        provider: string;
        apiKey?: string;
        accessToken?: string;
        modelName?: string;
        prompt: string;
        systemPrompt?: string;
        apiUrl?: string;
    }): Promise<string> {
        const { provider, apiKey, accessToken, modelName, prompt, systemPrompt, apiUrl } = params;
        const history: ChatMessage[] = [{
            id: 'temp',
            role: 'user',
            content: prompt,
            timestamp: new Date()
        }];
        const sysPrompt = systemPrompt || "Tu es une IA utile.";

        if (provider === 'gemini') {
            return this.callGemini(sysPrompt, history, (apiKey || accessToken)!, modelName);
        } else if (provider === 'openai') {
            return this.callOpenAI(sysPrompt, history, (apiKey || accessToken)!, modelName);
        } else if (provider === 'anthropic') {
            return this.callAnthropic(sysPrompt, history, (apiKey || accessToken)!, modelName);
        } else if (provider === 'mistral') {
            return this.callMistral(sysPrompt, history, (apiKey || accessToken)!, modelName);
        } else if (provider === 'local') {
            return this.callLocal(sysPrompt, history, apiUrl || 'http://localhost:11434/v1', modelName);
        } else {
            throw new Error(`Provider ${provider} non supporté`);
        }
    }

    private static async callGemini(
        systemPrompt: string,
        history: ChatMessage[],
        apiKey: string,
        modelName?: string
    ): Promise<string> {
        const model = modelName || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Sécurité : Gemini REQUIERT que contents ne soit pas vide
        if (history.length === 0) {
            throw new Error("L'historique de conversation est vide. Impossible d'envoyer la requête à Gemini.");
        }

        // Utiliser system_instruction pour Gemini si disponible
        const payload: any = {
            contents: history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            system_instruction: {
                parts: [{ text: systemPrompt }]
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini Error Response:', errorText);
            throw new Error(`Gemini API Error: ${errorText}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Désolé, je n\'ai pas pu générer de réponse.';
    }

    private static async callOpenAI(
        systemPrompt: string,
        history: ChatMessage[],
        apiKey: string,
        modelName?: string
    ): Promise<string> {
        const model = modelName || 'gpt-4o';
        const url = 'https://api.openai.com/v1/chat/completions';

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model, messages, temperature: 0.7 })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API Error: ${await response.text()}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    }

    private static async callAnthropic(
        systemPrompt: string,
        history: ChatMessage[],
        apiKey: string,
        modelName?: string
    ): Promise<string> {
        const model = modelName || 'claude-3-5-sonnet-20240620';
        const url = 'https://api.anthropic.com/v1/messages';

        const messages = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: 4096,
                system: systemPrompt,
                messages
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic API Error: ${await response.text()}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || 'Désolé, je n\'ai pas pu générer de réponse.';
    }

    private static async callMistral(
        systemPrompt: string,
        history: ChatMessage[],
        apiKey: string,
        modelName?: string
    ): Promise<string> {
        const model = modelName || 'mistral-large-latest';
        const url = 'https://api.mistral.ai/v1/chat/completions';

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model, messages, temperature: 0.7 })
        });

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 429 || errorText.includes('capacity_exceeded')) {
                throw new Error("Quota ou capacité Mistral dépassée. Essayez de passer sur un modèle plus léger (Mistral Small) ou d'attendre quelques minutes.");
            }
            throw new Error(`Mistral API Error: ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';
    }

    private static async callLocal(
        systemPrompt: string,
        history: ChatMessage[],
        apiUrl: string,
        modelName?: string
    ): Promise<string> {
        // Normalisation de l'URL
        let endpoint = apiUrl.replace(/\/$/, '');
        if (!endpoint.includes('/chat/completions')) {
            if (endpoint.endsWith('/v1')) {
                endpoint = `${endpoint}/chat/completions`;
            } else {
                endpoint = `${endpoint}/v1/chat/completions`;
            }
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName || 'local-model',
                messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Local API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || data.choices?.[0]?.text || 'Désolé, je n\'ai pas pu générer de réponse.';
    }
}
