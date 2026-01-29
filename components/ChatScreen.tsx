import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/Button';
import { ChatService, ChatSession } from '../services/chatService';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';
import { Flashcard } from '../types';
import { getThemeGradient, ThemeMode, ThemeStyle } from '../constants/themes';
import { AILoader } from './ui/AILoader';

interface ChatScreenProps {
    onBack: () => void;
    tutorName?: string;
    tutorSubject?: string;
    tutorStyle?: string;
    onStartQuiz?: (cards: Flashcard[]) => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ 
    onBack, 
    tutorName: initialTutorName,
    tutorSubject: initialTutorSubject,
    tutorStyle: initialTutorStyle,
    onStartQuiz,
    themeMode,
    themeStyle
}) => {
    const { showToast } = useToast();
    const config = useAIConfig();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSetup, setShowSetup] = useState(!initialTutorName);
    const [showSidebar, setShowSidebar] = useState(false);
    const [isGeneratingCards, setIsGeneratingCards] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const hasAutoLoaded = useRef(false);

    // Setup form
    const [tutorName, setTutorName] = useState(initialTutorName || '');
    const [tutorSubject, setTutorSubject] = useState(initialTutorSubject || '');
    const [tutorStyle, setTutorStyle] = useState(initialTutorStyle || 'Bienveillant, encourageant et socratique');
    const [tutorPersonality, setTutorPersonality] = useState<string>('doux');

    // Options de personnalité
    const personalityOptions = [
        { id: 'poli', label: 'Poli', description: 'Formel et respectueux' },
        { id: 'decontracte', label: 'Décontracté', description: 'Informel et accessible' },
        { id: 'empathique', label: 'Empathique', description: 'Compréhensif et patient' },
        { id: 'objectif', label: 'Objectif', description: 'Factuel et neutre' },
        { id: 'motivant', label: 'Motivant', description: 'Encourageant et énergique' },
        { id: 'reflechi', label: 'Réfléchi', description: 'Analytique et posé' },
        { id: 'direct', label: 'Direct', description: 'Concis et efficace' },
        { id: 'doux', label: 'Doux', description: 'Bienveillant et rassurant' },
        { id: 'humoristique', label: 'Humoristique', description: 'Léger et amusant' },
        { id: 'sincere', label: 'Sincère', description: 'Authentique et honnête' },
        { id: 'concis', label: 'Concis', description: 'Bref et précis' },
        { id: 'detaille', label: 'Détaillé', description: 'Exhaustif et approfondi' },
        { id: 'jeune', label: 'Jeune', description: 'Adapté aux enfants' },
        { id: 'mature', label: 'Mature', description: 'Niveau universitaire' },
        { id: 'pragmatique', label: 'Pragmatique', description: 'Pratique et concret' },
        { id: 'poetique', label: 'Poétique', description: 'Imagé et métaphorique' }
    ];

    // Générer le style basé sur la personnalité
    const getStyleFromPersonality = (personality: string): string => {
        const styles: Record<string, string> = {
            'poli': 'Formel, respectueux et courtois. Utilise un langage soutenu.',
            'decontracte': 'Informel, accessible et amical. Utilise un langage courant.',
            'empathique': 'Compréhensif, patient et à l\'écoute. Valorise les émotions.',
            'objectif': 'Factuel, neutre et analytique. Se concentre sur les faits.',
            'motivant': 'Encourageant, énergique et positif. Célèbre chaque progrès.',
            'reflechi': 'Analytique, posé et méthodique. Prend le temps d\'expliquer.',
            'direct': 'Concis, efficace et sans détour. Va droit au but.',
            'doux': 'Bienveillant, rassurant et chaleureux. Crée un environnement sûr.',
            'humoristique': 'Léger, amusant et décontracté. Utilise l\'humour avec tact.',
            'sincere': 'Authentique, honnête et transparent. Dit les choses clairement.',
            'concis': 'Bref, précis et synthétique. Évite les détails superflus.',
            'detaille': 'Exhaustif, approfondi et complet. Explore tous les aspects.',
            'jeune': 'Adapté aux enfants (8-12 ans). Utilise des exemples simples et ludiques.',
            'mature': 'Niveau universitaire. Utilise un vocabulaire technique et des concepts avancés.',
            'pragmatique': 'Pratique, concret et orienté résultats. Focus sur l\'application.',
            'poetique': 'Imagé, métaphorique et créatif. Utilise des analogies poétiques.'
        };
        return styles[personality] || styles['doux'];
    };

    // Charger les sessions
    useEffect(() => {
        // Nettoyage automatique des sessions vides (sauf la courante)
        ChatService.purgeEmptySessions(currentSession?.id);
        const sessions = ChatService.getSessions();
        setAllSessions(sessions);
    }, [currentSession, refreshKey]);

    // Auto-scroll vers le bas
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentSession?.messages]);

    // Charger automatiquement la dernière session au démarrage si aucune n'est spécifiée
    useEffect(() => {
        if (!currentSession && !hasAutoLoaded.current) {
            const sessions = ChatService.getSessions();
            
            if (initialTutorName && initialTutorSubject) {
                // Recherche d'une session existante pour ce tuteur
                const existing = sessions.find(s => 
                    s.tutorName === initialTutorName && 
                    s.tutorSubject === initialTutorSubject
                );
                
                if (existing) {
                    setCurrentSession(existing);
                    setTutorName(existing.tutorName);
                    setTutorSubject(existing.tutorSubject);
                    setShowSetup(false);
                } else {
                    // Création d'une nouvelle session si aucune n'existe
                    const session = ChatService.createSession(initialTutorName, initialTutorSubject);
                    setCurrentSession(session);
                    setShowSetup(false);
                }
                hasAutoLoaded.current = true;
            } else if (sessions.length > 0 && !initialTutorName) {
                // Si on revient sur l'écran sans tuteur spécifique, on reprend la TOUTE DERNIÈRE session active
                setCurrentSession(sessions[0]);
                setTutorName(sessions[0].tutorName);
                setTutorSubject(sessions[0].tutorSubject);
                setShowSetup(false);
                hasAutoLoaded.current = true;
            }
        }
    }, [initialTutorName, initialTutorSubject, currentSession]);

    const handleStartChat = () => {
        if (!tutorName.trim() || !tutorSubject.trim()) {
            showToast('Veuillez remplir le nom et le sujet du tuteur', 'warning');
            return;
        }

        // Vérifier si une session existe déjà pour ce tuteur
        const sessions = ChatService.getSessions();
        const existing = sessions.find(s => 
            s.tutorName === tutorName.trim() && 
            s.tutorSubject === tutorSubject.trim()
        );

        if (existing) {
            setCurrentSession(existing);
            showToast('Conversation existante reprise', 'info');
        } else {
            const session = ChatService.createSession(tutorName, tutorSubject);
            setCurrentSession(session);
        }
        setShowSetup(false);
    };

    const handleNewChat = () => {
        hasAutoLoaded.current = true; // Empêcher l'auto-rechargement intempestif
        
        if (currentSession) {
            // Si la session actuelle est déjà vide, on ne fait rien
            if (currentSession.messages.length === 0) {
                showToast('La discussion est déjà vide', 'info');
                setShowSidebar(false);
                return;
            }

            // On crée une NOUVELLE session avec les MÊMES paramètres (Nom/Sujet)
            // Cela donne l'impression de "vider" le chat tout en gardant le contexte
            const session = ChatService.createSession(currentSession.tutorName, currentSession.tutorSubject);
            setCurrentSession(session);
            showToast('Nouvelle discussion démarrée', 'success');
        } else {
            // Fallback
            setShowSetup(true);
        }
        setShowSidebar(false);
    };

    const handleLoadSession = (session: ChatSession) => {
        setCurrentSession(session);
        setTutorName(session.tutorName);
        setTutorSubject(session.tutorSubject);
        setShowSidebar(false);
        setShowSetup(false); // Important : fermer l'écran de setup
    };

    const handleDeleteSession = (sessionId: string) => {
        // 1. Suppression immédiate de l'affichage (Optimistic UI)
        setAllSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // 2. Suppression réelle des données
        ChatService.deleteSession(sessionId);

        // 3. Gestion de l'état si c'est la session courante
        if (currentSession?.id === sessionId) {
            setCurrentSession(null);
            setShowSetup(true);
        }

        // 4. Re-vérification et nettoyage final après un court délai
        // pour s'assurer que tout est synchronisé
        setTimeout(() => {
            ChatService.purgeEmptySessions();
            setAllSessions(ChatService.getSessions());
            setRefreshKey(prev => prev + 1);
        }, 300);

        showToast('Conversation supprimée', 'success');
    };

    const handleExportMarkdown = () => {
        if (!currentSession) return;
        ChatService.downloadMarkdown(currentSession.id);
        showToast('Conversation exportée !', 'success');
    };

    const handleGenerateFlashcards = async () => {
        if (!currentSession || currentSession.messages.length < 4) {
            showToast('Conversation trop courte pour générer des flashcards', 'warning');
            return;
        }

        // TODO: Implémenter une modale pour demander le nombre (window.prompt peut être bloqué dans Tauri)
        const count = 10;

        setIsGeneratingCards(true);
        try {
            const apiKey = config.config.provider === 'gemini' ? config.config.geminiApiKey
                : config.config.provider === 'openai' ? config.config.openaiApiKey
                : config.config.provider === 'anthropic' ? config.config.anthropicApiKey
                : config.config.provider === 'mistral' ? config.config.mistralApiKey
                : config.config.provider === 'local' ? config.config.localApiUrl
                : '';

            const modelName = config.config.provider === 'gemini' ? config.config.geminiModel
                : config.config.provider === 'openai' ? config.config.openaiModel
                : config.config.provider === 'anthropic' ? config.config.anthropicModel
                : config.config.provider === 'mistral' ? config.config.mistralModel
                : config.config.provider === 'local' ? config.config.localModelName
                : '';

            if (!apiKey && config.config.provider !== 'local') {
                throw new Error('Clé API manquante. Configurez-la dans les paramètres.');
            }

            const flashcardsData = await ChatService.generateFlashcardsFromConversation(
                currentSession.id,
                config.config.provider,
                apiKey,
                modelName,
                count
            );

            // Convertir en format Flashcard
            // Note: On suppose ici que la question est en français et la réponse dans la langue cible (automatiquement détectée par le contexte du quiz)
            // Pour l'instant on met tout sous une clé générique 'fr' qui servira de fallback, ou on essaie de deviner
            const flashcards: Flashcard[] = flashcardsData.map((item: any) => ({
                id: `fc-${Date.now()}-${Math.random()}`,
                type: 'mcq' as const,
                mcqData: {
                    // On map vers 'fr' pour la question, et on pourrait mapper answer vers autre chose si on savait
                    question: { fr: item.question },
                    answer: { fr: item.answer, it: item.answer, en: item.answer, es: item.answer, de: item.answer }, // Hack: on met la réponse partout pour qu'elle s'affiche quelle que soit la langue
                    distractors: item.distractors.map((d: string) => ({ fr: d, it: d, en: d, es: d, de: d }))
                },
                srsData: {
                    interval: 0,
                    repetitions: 0,
                    easeFactor: 2.5,
                    nextReview: new Date().toISOString(),
                    lastReviewed: new Date().toISOString()
                }
            }));

            showToast(`${flashcards.length} flashcards générées !`, 'success');

            // Lancer le quiz immédiatement
            if (onStartQuiz) {
                onStartQuiz(flashcards);
            } else {
                // Fallback (ne devrait pas arriver avec la mise à jour de App.tsx)
                localStorage.setItem('chat_generated_flashcards', JSON.stringify(flashcards));
                showToast(`Allez dans le Dashboard pour les ajouter à un jeu.`, 'info');
            }

        } catch (error: any) {
            console.error('Flashcard generation error:', error);
            showToast(error.message || 'Erreur lors de la génération', 'error');
        } finally {
            setIsGeneratingCards(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !currentSession || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');

        // Ajouter le message utilisateur
        const updatedSession = ChatService.addMessage(currentSession.id, 'user', userMessage);
        if (updatedSession) {
            setCurrentSession(updatedSession);
        }

        setIsLoading(true);

        try {
            const apiKey = config.config.provider === 'gemini' ? config.config.geminiApiKey
                : config.config.provider === 'openai' ? config.config.openaiApiKey
                : config.config.provider === 'anthropic' ? config.config.anthropicApiKey
                : config.config.provider === 'mistral' ? config.config.mistralApiKey
                : config.config.localApiUrl || '';

            const modelName = config.config.provider === 'gemini' ? config.config.geminiModel
                : config.config.provider === 'openai' ? config.config.openaiModel
                : config.config.provider === 'anthropic' ? config.config.anthropicModel
                : config.config.provider === 'mistral' ? config.config.mistralModel
                : config.config.localModelName;

            console.log('[ChatScreen] Envoi message:', {
                provider: config.config.provider,
                model: modelName,
                hasApiKey: !!apiKey,
                apiKeyLength: apiKey?.length || 0,
                tutorName: currentSession.tutorName,
                historyLength: updatedSession ? updatedSession.messages.length : currentSession.messages.length
            });

            // Nettoyage et validation de la clé API
            const cleanApiKey = (apiKey || '').trim();
            
            if (!cleanApiKey && config.config.provider !== 'local') {
                throw new Error(`Clé API de ${config.config.provider} manquante. Veuillez la configurer dans les paramètres.`);
            }

            if (cleanApiKey === 'undefined' || cleanApiKey === 'null') {
                throw new Error(`Clé API de ${config.config.provider} invalide. Veuillez la vérifier dans les paramètres.`);
            }

            console.log('[ChatScreen] Appel ChatService.sendMessage...');
            const response = await ChatService.sendMessage(
                currentSession.id,
                updatedSession ? updatedSession.messages : currentSession.messages,
                userMessage,
                currentSession.tutorName,
                currentSession.tutorSubject,
                tutorStyle,
                config.config.provider,
                cleanApiKey,
                modelName || ''
            );

            console.log('[ChatScreen] Réponse reçue:', response?.substring(0, 100));

            const finalSession = ChatService.addMessage(currentSession.id, 'assistant', response);
            if (finalSession) {
                setCurrentSession(finalSession);
            }

        } catch (error: any) {
            console.error('[ChatScreen] ERREUR CHAT:', error);
            console.error('[ChatScreen] Stack:', error.stack);
            showToast(error.message || 'Erreur lors de l\'envoi du message', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (showSetup) {
        return (
            <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
                {/* Header */}
                <div 
                    className={`transition-all duration-500 p-6 shadow-lg relative overflow-hidden shrink-0 ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                    style={{ background: getThemeGradient(themeStyle, themeMode) }}
                >
                    <div className="relative z-10">
                        <Button 
                            variant="secondary" 
                            onClick={onBack} 
                            size="sm" 
                            className={`transition-all mb-4 ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                        >
                            <i className="fas fa-home mr-2 text-inherit"></i> Accueil
                        </Button>
                        <h1 className="text-xl md:text-3xl font-black drop-shadow-sm flex items-center gap-2 md:gap-3 text-inherit">
                            <span className="text-2xl md:text-4xl text-inherit">🎓</span> {initialTutorName ? `Discuter avec ${initialTutorName}` : 'Créer une session de tutorat'}
                        </h1>
                        <p className="opacity-80 mt-1 text-xs md:text-base text-inherit">
                            {initialTutorName ? `Posez vos questions sur ${initialTutorSubject}` : 'Configurez votre tuteur personnel pour commencer'}
                        </p>
                    </div>
                </div>

                <div className="p-4 md:p-6 flex-1 flex flex-col overflow-y-auto min-h-0">
                    <div className="bg-background-secondary p-8 rounded-2xl shadow-lg border border-border w-full">

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Nom du Tuteur
                                </label>
                                <input
                                    type="text"
                                    value={tutorName}
                                    onChange={(e) => setTutorName(e.target.value)}
                                    placeholder="Ex: Einstein, Marie Curie, Socrate..."
                                    className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Sujet / Domaine d'expertise
                                </label>
                                <input
                                    type="text"
                                    value={tutorSubject}
                                    onChange={(e) => setTutorSubject(e.target.value)}
                                    placeholder="Ex: Physique quantique, Philosophie, Mathématiques..."
                                    className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-3">
                                    Personnalité du tuteur
                                </label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {personalityOptions.map(option => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                                setTutorPersonality(option.id);
                                                setTutorStyle(getStyleFromPersonality(option.id));
                                            }}
                                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                                                tutorPersonality === option.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                            }`}
                                        >
                                            <div className="font-semibold text-sm">{option.label}</div>
                                            <div className="text-xs text-text-secondary mt-1">{option.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                onClick={handleStartChat}
                                disabled={!tutorName.trim() || !tutorSubject.trim()}
                                size="lg"
                                className="w-full"
                            >
                                <i className="fas fa-comments mr-2"></i>
                                Démarrer la conversation
                            </Button>

                            {allSessions.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-border">
                                    <p className="text-sm text-text-secondary mb-3">Ou reprendre une conversation :</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {allSessions.slice(0, 5).map(session => (
                                            <button
                                                key={session.id}
                                                onClick={() => handleLoadSession(session)}
                                                className="w-full text-left p-3 rounded-lg bg-background border border-border hover:border-primary transition-colors"
                                            >
                                                <div className="font-semibold text-sm">{session.tutorName} - {session.tutorSubject}</div>
                                                <div className="text-xs text-text-secondary">
                                                    {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!currentSession) return null;

    return (
        <div className="flex flex-1 min-h-0 bg-background overflow-hidden">
            {/* Sidebar - Historique */}
            {showSidebar && (
                <div className="w-80 bg-background-secondary border-r border-border flex flex-col min-h-0">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <h3 className="font-bold">Historique</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleNewChat}
                                className="text-primary hover:text-primary-dark p-1"
                                title="Nouvelle discussion"
                            >
                                <i className="fas fa-plus-circle"></i>
                            </button>
                            <button
                                onClick={() => setShowSidebar(false)}
                                className="text-text-secondary hover:text-text p-1"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {allSessions.map(session => (
                            <div
                                key={session.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                    currentSession && session.id === currentSession.id
                                        ? 'bg-primary/10 border-primary'
                                        : 'bg-background border-border hover:border-primary'
                                }`}
                                onClick={() => handleLoadSession(session)}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-semibold text-sm">{session.tutorName}</div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSession(session.id);
                                        }}
                                        className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                                <div className="text-xs text-text-secondary">{session.tutorSubject}</div>
                                <div className="text-xs text-text-secondary mt-1">
                                    {session.messages.length} msg • {new Date(session.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="bg-background-secondary border-b border-border p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Button onClick={onBack} variant="secondary" size="sm">
                            <i className="fas fa-home mr-2"></i> Accueil
                        </Button>
                        
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className="p-2 hover:bg-background rounded-lg transition-colors"
                            title="Historique"
                        >
                            <i className="fas fa-history"></i>
                        </button>

                        <button
                            onClick={handleNewChat}
                            className="p-2 hover:bg-background rounded-lg transition-colors text-primary"
                            title="Nouvelle conversation"
                        >
                            <i className="fas fa-plus-circle"></i>
                        </button>
                    </div>
                    
                    <div className="text-center flex-1">
                        <h2 className="text-xl font-bold text-primary flex items-center justify-center gap-2">
                            <span className="text-2xl">🎓</span>
                            {currentSession.tutorName}
                        </h2>
                        <p className="text-sm text-text-secondary">{currentSession.tutorSubject}</p>
                    </div>

                    <div className="flex gap-2">
                        {/* Sélecteur de personnalité */}
                        <select
                            value={tutorPersonality}
                            onChange={(e) => {
                                setTutorPersonality(e.target.value);
                                setTutorStyle(getStyleFromPersonality(e.target.value));
                                showToast(`Personnalité changée : ${personalityOptions.find(p => p.id === e.target.value)?.label}`, 'info');
                            }}
                            className="px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm hover:border-primary transition-colors outline-none cursor-pointer"
                            title="Changer la personnalité"
                        >
                            {personalityOptions.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleGenerateFlashcards}
                            disabled={isGeneratingCards || currentSession.messages.length < 4}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                            title="Générer des flashcards"
                        >
                            {isGeneratingCards ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <><i className="fas fa-layer-group mr-2"></i> Quiz</>
                            )}
                        </button>
                        
                        <button
                            onClick={handleExportMarkdown}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            title="Exporter en Markdown"
                        >
                            <i className="fas fa-download"></i>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0">
                    {currentSession.messages.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">💬</div>
                            <h3 className="text-xl font-semibold mb-2">Commencez la conversation</h3>
                            <p className="text-text-secondary">
                                Posez une question ou demandez une explication sur {currentSession.tutorSubject}
                            </p>
                        </div>
                    )}

                    {currentSession.messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl p-4 ${
                                    message.role === 'user'
                                        ? 'bg-primary text-white'
                                        : 'bg-background-secondary border border-border'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {message.role === 'assistant' && (
                                        <div className="text-2xl">🎓</div>
                                    )}
                                    <div className="flex-1">
                                        {message.role === 'assistant' ? (
                                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-2 mt-4" {...props} />,
                                                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3" {...props} />,
                                                        h3: ({node, ...props}) => <h3 className="text-base font-bold mb-1 mt-2" {...props} />,
                                                        p: ({node, ...props}) => <p className="mb-2" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                                                        li: ({node, ...props}) => <li className="ml-2" {...props} />,
                                                        strong: ({node, ...props}) => <strong className="font-bold text-primary" {...props} />,
                                                        em: ({node, ...props}) => <em className="italic" {...props} />,
                                                        code: ({node, inline, ...props}: any) => 
                                                            inline ? (
                                                                <code className="bg-background px-1 py-0.5 rounded text-sm font-mono" {...props} />
                                                            ) : (
                                                                <code className="block bg-background p-2 rounded my-2 text-sm font-mono overflow-x-auto" {...props} />
                                                            ),
                                                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-3 italic my-2" {...props} />,
                                                        hr: ({node, ...props}) => <hr className="my-3 border-border" {...props} />,
                                                        a: ({node, ...props}) => <a className="text-primary underline hover:text-primary-dark" {...props} />,
                                                        table: ({node, ...props}) => (
                                                            <div className="overflow-x-auto my-3">
                                                                <table className="min-w-full border-collapse border border-border" {...props} />
                                                            </div>
                                                        ),
                                                        thead: ({node, ...props}) => <thead className="bg-background-secondary" {...props} />,
                                                        tbody: ({node, ...props}) => <tbody {...props} />,
                                                        tr: ({node, ...props}) => <tr className="border-b border-border" {...props} />,
                                                        th: ({node, ...props}) => <th className="border border-border px-3 py-2 text-left font-bold" {...props} />,
                                                        td: ({node, ...props}) => <td className="border border-border px-3 py-2" {...props} />
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{message.content}</div>
                                        )}
                                        <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-text-secondary'}`}>
                                            {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-[70%] rounded-2xl p-4 bg-background-secondary border border-border">
                                <div className="flex items-center gap-4">
                                    <AILoader size="sm" />
                                    <span className="text-xs font-bold text-primary animate-pulse">L'IA réfléchit...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-background-secondary border-t border-border p-4">
                    <div className="max-w-4xl mx-auto flex gap-3">
                        <textarea
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Posez votre question..."
                            className="flex-1 p-3 rounded-xl bg-background border border-border focus:border-primary outline-none resize-none"
                            rows={2}
                            disabled={isLoading}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim() || isLoading}
                            size="lg"
                            className="px-6"
                        >
                            <i className="fas fa-paper-plane"></i>
                        </Button>
                    </div>
                    <p className="text-xs text-text-secondary text-center mt-2">
                        Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
                    </p>
                </div>
            </div>
        </div>
    );
};
