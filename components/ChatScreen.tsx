import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from './ui/Button';
import { ChatService, ChatSession, ChatMessage } from '../services/chatService';
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

        setIsLoading(true);

        try {
            // Ajouter le message utilisateur localement d'abord pour garantir qu'on ne le perde pas
            const newUserMessage: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                role: 'user',
                content: userMessage,
                timestamp: new Date()
            };

            const updatedSession: ChatSession = {
                ...currentSession,
                messages: [...currentSession.messages, newUserMessage],
                updatedAt: new Date()
            };

            // Mettre à jour l'état React immédiatement pour l'UI
            setCurrentSession(updatedSession);
            
            // Sauvegarder dans localStorage de manière robuste
            const sessions = ChatService.getSessions();
            const idx = sessions.findIndex(s => s.id === updatedSession.id);
            if (idx >= 0) {
                sessions[idx] = updatedSession;
            } else {
                sessions.unshift(updatedSession);
            }
            ChatService.saveSessions(sessions);

            console.log('[ChatScreen] Message utilisateur ajouté. Envoi à l\'IA...');

            // Préparation des paramètres pour l'envoi
            const currentTutorStyle = tutorPersonality ? getStyleFromPersonality(tutorPersonality) : tutorStyle || 'Doux';
            const apiKey = config.config.provider === 'gemini' ? config.config.geminiApiKey
                : config.config.provider === 'openai' ? config.config.openaiApiKey
                : config.config.provider === 'anthropic' ? config.config.anthropicApiKey
                : config.config.provider === 'mistral' ? config.config.mistralApiKey
                : '';

            const modelName = config.config.provider === 'gemini' ? config.config.geminiModel
                : config.config.provider === 'openai' ? config.config.openaiModel
                : config.config.provider === 'anthropic' ? config.config.anthropicModel
                : config.config.provider === 'mistral' ? config.config.mistralModel
                : config.config.localModelName;

            // Nettoyage et validation de la clé API
            const cleanApiKey = (apiKey || '').trim();
            
            if (!cleanApiKey && config.config.provider !== 'local') {
                throw new Error(`Clé API de ${config.config.provider} manquante. Veuillez la configurer dans les paramètres.`);
            }

            console.log('[ChatScreen] Appel ChatService.sendMessage...');
            
            const response = await ChatService.sendMessage(
                updatedSession.id,
                updatedSession.messages,
                userMessage,
                updatedSession.tutorName,
                updatedSession.tutorSubject,
                currentTutorStyle,
                config.config.provider,
                cleanApiKey,
                modelName
            );

            console.log('[ChatScreen] Réponse reçue:', response?.substring(0, 100));

            // Ajouter la réponse de l'assistant directement à la session en mémoire
            const assistantMessage: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };

            const finalSession: ChatSession = {
                ...updatedSession,
                messages: [...updatedSession.messages, assistantMessage],
                updatedAt: new Date()
            };

            // Sauvegarder à nouveau dans localStorage
            const allSessions = ChatService.getSessions();
            const sessionIndex = allSessions.findIndex(s => s.id === finalSession.id);
            
            if (sessionIndex >= 0) {
                allSessions[sessionIndex] = finalSession;
            } else {
                allSessions.unshift(finalSession);
            }
            
            ChatService.saveSessions(allSessions);
            
            // Mettre à jour l'état React final
            setCurrentSession(finalSession);
            console.log('[ChatScreen] Session mise à jour avec la réponse de l\'IA');

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
            {/* Sidebar - Historique (Overlay on mobile, aside on desktop) */}
            {showSidebar && (
                <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto flex">
                    {/* Backdrop for mobile */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm md:hidden" 
                        onClick={() => setShowSidebar(false)} 
                    />
                    
                    {/* Sidebar Content */}
                    <div className="w-72 md:w-80 bg-background-secondary border-r border-border flex flex-col min-h-0 relative z-10 animate-slide-in-left md:animate-none h-full shadow-2xl md:shadow-none">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-background-secondary/80 backdrop-blur-md sticky top-0">
                            <h3 className="font-black text-lg">Historique</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleNewChat}
                                    className="text-primary hover:scale-110 p-1.5 transition-transform"
                                    title="Nouvelle discussion"
                                >
                                    <i className="fas fa-plus-circle text-xl"></i>
                                </button>
                                <button
                                    onClick={() => setShowSidebar(false)}
                                    className="text-text-secondary hover:text-text p-1.5 md:hidden"
                                >
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {allSessions.length === 0 ? (
                                <div className="text-center py-8 text-text-secondary text-sm italic">
                                    Aucun historique
                                </div>
                            ) : (
                                allSessions.map(session => (
                                    <div
                                        key={session.id}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                                            currentSession && session.id === currentSession.id
                                                ? 'bg-primary/10 border-primary ring-1 ring-primary/20'
                                                : 'bg-background border-border hover:border-primary/50'
                                        }`}
                                        onClick={() => {
                                            handleLoadSession(session);
                                            if (window.innerWidth < 768) setShowSidebar(false);
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-sm truncate pr-2">{session.tutorName}</div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSession(session.id);
                                                }}
                                                className="text-red-500 hover:text-red-700 p-1 transition-colors"
                                            >
                                                <i className="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        </div>
                                        <div className="text-xs text-text-secondary truncate">{session.tutorSubject}</div>
                                        <div className="text-[10px] text-text-secondary/60 mt-2 flex justify-between items-center">
                                            <span>{session.messages.length} messages</span>
                                            <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-h-0 relative">
                {/* Header responsive */}
                <div className="bg-background-secondary border-b border-border px-3 py-2 md:p-4 flex justify-between items-center shadow-sm z-20">
                    <div className="flex items-center gap-1 md:gap-3">
                        <Button 
                            onClick={onBack} 
                            variant="secondary" 
                            size="sm" 
                            className="hidden sm:flex"
                        >
                            <i className="fas fa-home mr-2"></i> Accueil
                        </Button>
                        <button 
                            onClick={onBack}
                            className="p-2 sm:hidden hover:bg-background rounded-lg transition-colors"
                        >
                            <i className="fas fa-home text-lg"></i>
                        </button>
                        
                        <button
                            onClick={() => setShowSidebar(!showSidebar)}
                            className={`p-2 hover:bg-background rounded-lg transition-colors ${showSidebar ? 'text-primary' : ''}`}
                            title="Historique"
                        >
                            <i className="fas fa-history text-lg"></i>
                        </button>

                        <button
                            onClick={handleNewChat}
                            className="p-2 hover:bg-background rounded-lg transition-colors text-primary"
                            title="Nouvelle conversation"
                        >
                            <i className="fas fa-plus-circle text-lg"></i>
                        </button>
                    </div>
                    
                    <div className="text-center flex-1 mx-2 min-w-0">
                        <h2 className="text-base md:text-xl font-black text-primary flex items-center justify-center gap-1 md:gap-2 truncate">
                            <span className="hidden sm:inline">🎓</span>
                            {currentSession.tutorName}
                        </h2>
                        <p className="text-[10px] md:text-sm text-text-secondary truncate">{currentSession.tutorSubject}</p>
                    </div>

                    <div className="flex gap-1 md:gap-2">
                        {/* Sélecteur de personnalité (compact on mobile) */}
                        <select
                            value={tutorPersonality}
                            onChange={(e) => {
                                setTutorPersonality(e.target.value);
                                setTutorStyle(getStyleFromPersonality(e.target.value));
                                showToast(`Personnalité : ${personalityOptions.find(p => p.id === e.target.value)?.label}`, 'info');
                            }}
                            className="hidden lg:block px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm hover:border-primary transition-colors outline-none cursor-pointer"
                        >
                            {personalityOptions.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={handleGenerateFlashcards}
                            disabled={isGeneratingCards || currentSession.messages.length < 2}
                            className="p-2 md:px-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center"
                            title="Créer un Quiz"
                        >
                            {isGeneratingCards ? (
                                <i className="fas fa-spinner fa-spin"></i>
                            ) : (
                                <><i className="fas fa-layer-group md:mr-2 text-lg md:text-sm"></i> <span className="hidden md:inline">Quiz</span></>
                            )}
                        </button>
                        
                        <button
                            onClick={handleExportMarkdown}
                            className="p-2 md:px-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm flex items-center justify-center"
                            title="Exporter"
                        >
                            <i className="fas fa-download text-lg md:text-sm"></i> <span className="hidden md:inline ml-2">Export</span>
                        </button>
                    </div>
                </div>

                {/* Messages optimized for mobile */}
                <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-6 min-h-0 scrollbar-thin">
                    {currentSession.messages.length === 0 && (
                        <div className="text-center py-20 animate-fade-in">
                            <div className="text-7xl mb-6 bounce-slow">💬</div>
                            <h3 className="text-2xl font-black mb-2 px-4">Prêt pour apprendre ?</h3>
                            <p className="text-text-secondary px-6 max-w-sm mx-auto">
                                Posez n'importe quelle question sur <strong>{currentSession.tutorSubject}</strong> à <strong>{currentSession.tutorName}</strong>.
                            </p>
                        </div>
                    )}

                    {currentSession.messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in-up`}
                        >
                            <div
                                className={`max-w-[90%] md:max-w-[75%] rounded-2xl md:rounded-3xl p-4 md:p-5 shadow-sm transition-all hover:shadow-md ${
                                    message.role === 'user'
                                        ? 'bg-primary text-white rounded-tr-none'
                                        : 'bg-background-secondary border border-border rounded-tl-none'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    {message.role === 'assistant' && (
                                        <div className="text-3xl hidden md:block">🎓</div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        {message.role === 'assistant' ? (
                                            <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        h1: ({node, ...props}) => <h1 className="text-xl md:text-2xl font-black mb-3 mt-5 text-primary border-b border-border pb-2" {...props} />,
                                                        h2: ({node, ...props}) => <h2 className="text-lg md:text-xl font-bold mb-3 mt-4" {...props} />,
                                                        h3: ({node, ...props}) => <h3 className="text-base md:text-lg font-bold mb-2 mt-3" {...props} />,
                                                        p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc list-outside mb-4 ml-4 space-y-2" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal list-outside mb-4 ml-4 space-y-2" {...props} />,
                                                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                                        strong: ({node, ...props}) => <strong className="font-black text-primary" {...props} />,
                                                        em: ({node, ...props}) => <em className="italic opacity-90" {...props} />,
                                                        code: ({node, inline, ...props}: any) => 
                                                            inline ? (
                                                                <code className="bg-background-secondary px-1.5 py-0.5 rounded text-sm font-mono text-primary border border-border" {...props} />
                                                            ) : (
                                                                <code className="block bg-background-tertiary p-4 rounded-xl my-4 text-xs md:text-sm font-mono overflow-x-auto shadow-inner border border-border" {...props} />
                                                            ),
                                                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/50 pl-4 italic my-4 text-text-secondary bg-primary/5 p-3 rounded-r-lg" {...props} />,
                                                        hr: ({node, ...props}) => <hr className="my-5 border-border" {...props} />,
                                                        a: ({node, ...props}) => <a className="text-primary underline font-bold hover:text-primary-dark transition-colors" {...props} />,
                                                        table: ({node, ...props}) => (
                                                            <div className="overflow-x-auto my-5 rounded-xl border border-border shadow-sm">
                                                                <table className="min-w-full border-collapse" {...props} />
                                                            </div>
                                                        ),
                                                        thead: ({node, ...props}) => <thead className="bg-background-tertiary text-text-secondary text-xs uppercase tracking-wider" {...props} />,
                                                        tbody: ({node, ...props}) => <tbody className="bg-background" {...props} />,
                                                        tr: ({node, ...props}) => <tr className="border-b border-border last:border-0 hover:bg-background-secondary/50 transition-colors" {...props} />,
                                                        th: ({node, ...props}) => <th className="px-4 py-3 text-left font-black" {...props} />,
                                                        td: ({node, ...props}) => <td className="px-4 py-3 text-sm" {...props} />
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.content}</div>
                                        )}
                                        <div className={`text-[10px] mt-3 flex items-center gap-1.5 opacity-60 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <i className="far fa-clock"></i>
                                            {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl p-4 bg-background-secondary border border-border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <AILoader size="sm" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-primary uppercase tracking-widest">{currentSession.tutorName} réfléchit</span>
                                        <span className="text-[10px] text-text-secondary">Analyse de votre message...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} className="h-4" />
                </div>

                {/* Input Area (Optimized) */}
                <div className="bg-background-secondary border-t border-border p-3 md:p-4 z-20">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-end gap-2 md:gap-3 bg-background border border-border rounded-2xl md:rounded-3xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                            <textarea
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Écrivez votre message..."
                                className="flex-1 p-3 md:p-4 bg-transparent outline-none resize-none text-sm md:text-base min-h-[50px] max-h-[150px]"
                                rows={1}
                                disabled={isLoading}
                                style={{ height: 'auto' }}
                            />
                            <Button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl p-0 flex items-center justify-center shrink-0 mb-0.5 mr-0.5"
                            >
                                <i className="fas fa-paper-plane md:text-lg"></i>
                            </Button>
                        </div>
                        <p className="text-[10px] text-text-secondary text-center mt-2 hidden md:block">
                            <strong>Entrée</strong> pour envoyer • <strong>Shift + Entrée</strong> pour une nouvelle ligne
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
