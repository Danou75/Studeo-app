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

            return sessions.map((s: any) => ({
                ...s,
                createdAt: new Date(s.createdAt),
                updatedAt: new Date(s.updatedAt),
                messages: Array.isArray(s.messages) ? s.messages.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                })) : []
            })).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
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
        let sessions = this.getSessions();
        
        // Nettoyage : Si on a déjà une session VIDE pour ce tuteur, on la réutilise
        const existingEmptySession = sessions.find(s => 
            s.tutorName === tutorName && 
            s.tutorSubject === tutorSubject && 
            s.messages.length === 0
        );

        if (existingEmptySession) {
            console.log('[ChatService] Réutilisation d\'une session vide existante:', existingEmptySession.id);
            existingEmptySession.updatedAt = new Date();
            // On remonte la session en haut de la liste
            const otherSessions = sessions.filter(s => s.id !== existingEmptySession.id);
            sessions = [existingEmptySession, ...otherSessions];
            this.saveSessions(sessions);
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

        console.log('[ChatService] Nouvelle session créée:', session.id);
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
        try {
            const sessions = this.getSessions();
            let session = sessions.find(s => s.id === sessionId);
            
            if (!session) {
                console.warn(`[ChatService] Session ${sessionId} non trouvée dans localStorage. Tentative de récupération ou recréation.`);
                // Si la session n'est pas trouvée par ID, on ne peut pas faire grand chose ici sans l'objet complet
                // Mais on va essayer de voir si on a une session du même tuteur très récente
                return null;
            }

            const message: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                role,
                content: content || '...',
                timestamp: new Date()
            };

            session.messages.push(message);
            session.updatedAt = new Date();

            this.saveSessions(sessions);
            console.log(`[ChatService] Message ajouté à la session ${sessionId}. Total: ${session.messages.length}`);
            return session;
        } catch (e) {
            console.error('Erreur dans addMessage:', e);
            return null;
        }
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
     * Supprime TOUTES les sessions (utilisé lors de la déconnexion)
     */
    static clearAllSessions(): void {
        localStorage.removeItem(this.STORAGE_KEY);
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
            const model = modelName || 'gemini-2.5-flash';
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
        history: ChatMessage[],
        userMessage: string,
        tutorName: string,
        tutorSubject: string,
        tutorStyle: string,
        provider: string,
        apiKey?: string,
        modelName?: string
    ): Promise<string> {
        console.log('[ChatService] sendMessage appelé:', {
            sessionId,
            tutorName,
            provider,
            hasApiKey: !!apiKey,
            historyLength: history.length,
            userMessage: userMessage.substring(0, 50)
        });

        // Validation CRITIQUE de la clé API
        const cleanKey = (apiKey || '').trim();
        if (provider !== 'local' && (!cleanKey || cleanKey === 'undefined' || cleanKey === 'null' || cleanKey.length < 5)) {
            console.error('[ChatService] Clé API invalide:', cleanKey);
            throw new Error(`Clé API ${provider} manquante ou invalide. Veuillez la vérifier dans les paramètres.`);
        }

        let conversationHistory = [...history];

        // Sécurité : S'assurer que le dernier message de l'utilisateur est présent
        if (conversationHistory.length === 0 || 
            (conversationHistory[conversationHistory.length - 1].role !== 'user')) {
            
            const alreadyHasMessage = conversationHistory.some(m => m.content === userMessage && m.role === 'user');
            if (!alreadyHasMessage) {
                console.log('[ChatService] Ajout du message utilisateur à l\'historique');
                conversationHistory.push({
                    id: 'temp-' + Date.now(),
                    role: 'user',
                    content: userMessage,
                    timestamp: new Date()
                });
            }
        }

        if (conversationHistory.length === 0) {
            console.error('[ChatService] Historique vide après vérification');
            throw new Error("Impossible d'envoyer un message vide. Veuillez réessayer.");
        }

        console.log('[ChatService] Historique final:', conversationHistory.length, 'messages');
        console.log('[ChatService] Dernier message:', conversationHistory[conversationHistory.length - 1]);

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

            console.log(`[ChatService] Appel au provider: ${provider}`);

            if (provider === 'gemini') {
                response = await this.callGemini(systemPrompt, conversationHistory, cleanKey, modelName);
            } else if (provider === 'openai') {
                response = await this.callOpenAI(systemPrompt, conversationHistory, cleanKey, modelName);
            } else if (provider === 'anthropic') {
                response = await this.callAnthropic(systemPrompt, conversationHistory, cleanKey, modelName);
            } else if (provider === 'mistral') {
                response = await this.callMistral(systemPrompt, conversationHistory, cleanKey, modelName);
            } else if (provider === 'local') {
                response = await this.callLocal(systemPrompt, conversationHistory, cleanKey || '', modelName);
            } else {
                throw new Error(`Provider ${provider} non supporté`);
            }

            console.log('[ChatService] Réponse du provider:', response?.substring(0, 100));
            return response;

        } catch (error: any) {
            console.error('[ChatService] Erreur lors de l\'appel IA:', error);
            console.error('[ChatService] Stack:', error.stack);
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
        const model = modelName || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        console.log('[callGemini] Début appel Gemini:', {
            model,
            historyLength: history.length,
            apiKeyLength: apiKey.length
        });

        // Nettoyer l'historique pour Gemini (alternance stricte et rôles corrects)
        const contents: any[] = [];
        let lastRole = '';

        history.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'model';
            if (role === lastRole) {
                // Fusionner si même rôle consécutif (sécurité Gemini)
                contents[contents.length - 1].parts[0].text += '\n\n' + msg.content;
            } else {
                contents.push({
                    role,
                    parts: [{ text: msg.content }]
                });
                lastRole = role;
            }
        });

        console.log('[callGemini] Contents préparés:', contents.length, 'messages');
        console.log('[callGemini] Premier message:', contents[0]);

        const payload: any = {
            contents,
            system_instruction: {
                parts: [{ text: systemPrompt }]
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

        try {
            console.log('[callGemini] Envoi requête à Gemini...');
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            console.log('[callGemini] Statut réponse:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[callGemini] Erreur Gemini:', errorText);
                throw new Error(`Gemini API Error: ${errorText}`);
            }

            const data = await response.json();
            console.log('[callGemini] Réponse JSON reçue:', data);
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!text) {
                console.error('[callGemini] Pas de texte dans la réponse:', data);
                throw new Error("L'IA n'a pas renvoyé de réponse textuelle.");
            }
            
            console.log('[callGemini] Texte extrait:', text.substring(0, 100));
            return text;
        } catch (err: any) {
            console.error('[callGemini] Exception:', err);
            if (err.name === 'AbortError') {
                throw new Error("L'IA est trop longue à répondre. Vérifiez votre connexion ou réessayez.");
            }
            throw err;
        }
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
