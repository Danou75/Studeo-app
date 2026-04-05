import React, { useState, useEffect, useRef } from 'react';
import { Tutor, Flashcard, FlashcardClassic, ConversationSession } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getThemeGradient, ThemeMode, ThemeStyle } from '../constants/themes';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTTS } from '../hooks/useTTS';
import { generateLabResponse, generateScenario, generateConversationalOpener, generateConversationSummary, ChatMessage, ScenarioStep, ConversationSummary, LessonSuggestion, executeAIRequest, generateRemedialLesson, generateRemedialChatReply, resolveConfig } from '../services/conversationService';
import { useAIConfig } from '../contexts/AIConfigContext';
import { generateFlashcardsWithAI } from '../services/aiCardGenerator';
import { AIGenerationConfig } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';
import { getLanguageCode } from '../utils/languageDetection';
import { PRONUNCIATION_COACH_PROMPT } from '../constants/tutorPrompts';
import { VocabularyLabTab, ExerciseCard, VocabExercise } from './VocabularyLabTab';


// ---------------------------------------------------------------------------
// MdRenderer : rendu Markdown fiable sans dépendance à react-markdown
// ---------------------------------------------------------------------------
const mdToHtml = (text: string): string => {
    // 1. Uniformiser les sauts de ligne
    let cleanText = text.replace(/\r\n/g, '\n').trim();
    
    // 2. Supprimer agressivement le surplus si l'IA a fait l'erreur d'encadrer sa réponse
    // Exemple : "Voici la leçon :\n```markdown\n(leçon)\n```"
    // On extrait le contenu du plus grand bloc s'il fait plus de 60% du texte global
    const globalCodeBlockRegex = /(?:^|\n)```[a-zA-Z]*\n([\s\S]+?)\n```(?:$|\n)/;
    const match = cleanText.match(globalCodeBlockRegex);
    if (match && match[1].length > cleanText.length * 0.6) {
        cleanText = cleanText.replace(globalCodeBlockRegex, '\n$1\n').trim();
    }

    // 3. Cas extrême : si ça commence quand même par un truc genre ```markdown (sans bloc complet trouvé par le regex)
    cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();

    let html = cleanText
        // Échapper le HTML (sécurité basique)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Blocs de code (avant inline) - ajout de whitespace-pre-wrap pour éviter de tronquer
        .replace(/```[\w]*\n?([\s\S]*?)```/gm, '<pre class="bg-gray-100 dark:bg-gray-900 rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap word-break break-words"><code>$1</code></pre>')
        // Code inline
        .replace(/`([^`\n]+)`/g, '<code class="bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary rounded px-1 py-0.5 text-xs font-mono">$1</code>')
        // Titres (ordre important : du plus profond au moins profond)
        .replace(/^##### (.+)$/gm, '<h5 class="text-xs font-bold mt-3 mb-1" style="color:var(--color-text)">$1</h5>')
        .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-bold mt-4 mb-1.5" style="color:var(--color-text)">$1</h4>')
        .replace(/^### (.+)$/gm, '<h3 class="text-base font-extrabold mt-4 mb-2" style="color:var(--color-text)">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-lg font-black mt-5 mb-2 text-primary dark:text-primary">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-xl font-black mt-4 mb-3 pb-2 border-b text-primary dark:text-primary border-primary/30 dark:border-primary">$1</h1>')
        // HR
        .replace(/^---$/gm, '<hr class="border-gray-200 dark:border-gray-700 my-4"/>')
        // Blockquote
        .replace(/^&gt; (.+)$/gm, '<div class="border-l-4 border-primary pl-4 py-1 my-1 rounded-r-lg italic text-sm bg-primary/10" style="color:var(--color-text-secondary)">$1</div>')
        // Gras + italique combinés
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        // Gras
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold" style="color:var(--color-text)">$1</strong>')
        // Italique (permissif)
        .replace(/\*([^*]+)\*/g, '<em class="italic" style="color:var(--color-text-secondary)">$1</em>')
        // Tableaux GFM (simplifié)
        .replace(/^\|(.+)\|$/gm, (row) => {
            const cells = row.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
            return '<tr>' + cells.map(c => `<td class="border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs">${c.trim()}</td>`).join('') + '</tr>';
        })
        .replace(/(<tr>.*<\/tr>\n?)+/gs, (t) => `<div class="overflow-x-auto my-2"><table class="min-w-full border-collapse text-xs">${t}</table></div>`)
        // Listes non-ordonnées
        .replace(/^[-*] (.+)$/gm, '<li class="text-sm leading-relaxed ml-4 list-disc" style="color:var(--color-text)">$1</li>')
        // Listes ordonnées
        .replace(/^\d+\. (.+)$/gm, '<li class="text-sm leading-relaxed ml-4 list-decimal" style="color:var(--color-text)">$1</li>')
        // Grouper les <li> consécutifs
        .replace(/(<li[^>]*>.*<\/li>\n?)+/gs, (list) => `<ul class="pl-2 mb-3 space-y-0.5">${list}</ul>`)
        // Paragraphes : double saut de ligne → <p>
        .replace(/\n\n(?!<[hpulodtb])/g, '</p><p class="text-sm leading-relaxed mb-3" style="color:var(--color-text)">')
        // Sauts de ligne simples restants
        .replace(/\n(?!<)/g, '<br/>');
    return `<p class="text-sm leading-relaxed mb-3" style="color:var(--color-text)">${html}</p>`;
};

const MdRenderer: React.FC<{content: string}> = React.memo(({ content }) => (
    <div
        className="remedial-md-content"
        dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
    />
));

const InteractiveMessageRenderer: React.FC<{content: string}> = React.memo(({ content }) => {
    let markdownContent = content;
    let exercises: VocabExercise[] = [];
    
    try {
        const jsonBlockRegex = /```json\n([\s\S]*?)\n```/;
        const match = content.match(jsonBlockRegex);
        if (match) {
            const parsed = JSON.parse(match[1]);
            if (parsed && Array.isArray(parsed.exercises)) {
                exercises = parsed.exercises;
            }
            markdownContent = content.replace(jsonBlockRegex, '').trim();
        }
    } catch (e) {
        console.warn('Failed to parse embedded JSON in message', e);
    }
    
    return (
        <div className="flex flex-col gap-4 w-full">
            {markdownContent && <MdRenderer content={markdownContent} />}
            {exercises.length > 0 && (
                <div className="flex flex-col gap-3 mt-4 w-full">
                    {exercises.map((ex, i) => (
                        <div key={i} className="mb-2">
                            <ExerciseCard exercise={ex} index={i} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});


interface PronunciationChallenge {
    text: string;
    phonetic?: string;
    focus?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    translation?: string;
    // For Dialogue Mode
    speaker?: 'A' | 'B';
    role?: 'user' | 'ai';
}

interface PronunciationContent {
    type: 'challenges' | 'dialogue';
    content: PronunciationChallenge[];
}

// Helper: Levenshtein Distance for visual feedback
const levenshteinDistance = (a: string, b: string): number => {
    const matrix = [];
    let i, j;
    for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())) / longer.length;
};

interface LanguageLabScreenProps {
    tutor: Tutor | null;
    onBack: () => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
    onAddCards: (cards: Flashcard[], targetSetName?: string) => void;
    onCreateSet: (name: string, cards: Flashcard[]) => void;
    flashcardSets: Record<string, Flashcard[]>;
    onNavigateToSettings?: () => void;
    onSaveConvSession?: (session: ConversationSession) => void;
    initialSession?: ConversationSession;
    onLaunchAIGenerator?: (topic: string, mode?: 'quiz' | 'lesson' | 'curriculum' | 'mixed-quiz', context?: string) => void;
    onClearAiGenCache?: () => void;
    targetedLessonsProps?: Record<string, ChatMessage[]>;
    onSetTargetedLessonsProps?: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
    onUpdateSession?: (session: ConversationSession | undefined) => void;
    onSaveVocabList?: (vocab: import('../types').SavedVocabList) => void;
    initialVocabList?: import('../types').SavedVocabList;
    vocabLabCache?: Record<string, any>;
    onSetVocabLabCache?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    onNavigateToCurriculum?: () => void;
    onStartFlashcardQuiz?: (setName: string) => void;
}




// Sub-component for Message Bubble to handle translation state locally
const LabMessageBubble: React.FC<{ 
    msg: ChatMessage, 
    onSpeak: (text: string) => void, 
    onPin: (msg: ChatMessage) => void,
    onSuggestionClick?: (sugg: string) => void
}> = ({ msg, onSpeak, onPin, onSuggestionClick }) => {
    const isUser = msg.role === 'user';
    const { t } = useTranslation();
    
    // Parsing avancé du contenu
    let cleanContent = msg.content;
    let correction = null;
    let suggestions: string[] = [];

    if (!isUser) {
        // Extract Correction
        const corrMatch = cleanContent.match(/\[CORRECTION:([\s\S]*?)\]/);
        if (corrMatch) {
            correction = corrMatch[1].trim();
            cleanContent = cleanContent.replace(corrMatch[0], '').trim();
        }

        // Extract Suggestions
        const suggMatch = cleanContent.match(/\[SUGGESTIONS:([\s\S]*?)\]/);
        if (suggMatch) {
            const rawSugg = suggMatch[1].trim();
            suggestions = rawSugg.split(';').map(s => s.trim()).filter(s => s);
            cleanContent = cleanContent.replace(suggMatch[0], '').trim();
        }
    }

    const [showTranslation, setShowTranslation] = useState(false);
    
    // Split content and translation
    const parts = cleanContent.split('|||');
    const mainText = parts[0].trim();
    const translation = parts.length > 1 ? parts.slice(1).join(' ').trim() : null;

    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in-up max-w-[85%]`}>
            {/* CORRECTION BLOCK */}
            {correction && (
                <div className="bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-100 text-sm px-4 py-3 rounded-2xl rounded-bl-none mb-2 border-l-4 border-orange-400 shadow-sm max-w-full">
                    <div className="flex items-start gap-3">
                         <div className="mt-0.5 bg-orange-400 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-graduation-cap text-[10px]"></i>
                         </div>
                         <div className="flex-1">
                            <div className="font-black text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1 leading-none opacity-80">{t('lab.correction')}</div>
                            <div className="leading-relaxed">
                                <MdRenderer content={correction as string} />
                            </div>
                         </div>
                    </div>
                </div>
            )}

            <div 
                className={`relative px-4 py-3 shadow-sm transition-all group ${
                    isUser 
                        ? 'bg-primary text-white rounded-2xl rounded-br-none' 
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 border text-text dark:text-gray-100 rounded-2xl rounded-bl-none'
                }`}
            >
                <div className={isUser ? 'text-white' : ''}>
                    {isUser ? mainText : <MdRenderer content={mainText} />}
                </div>

                {/* Controls */}
                {!isUser && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        {translation && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowTranslation(!showTranslation); }}
                                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                                    showTranslation 
                                        ? 'bg-primary/10 text-primary font-semibold border-primary border' 
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600'
                                }`}
                                title={t('lab.translate')}
                            >
                                <i className="fas fa-language"></i> {showTranslation ? t('lab.hide') : t('lab.translate')}
                            </button>
                        )}
                        
                        <div className="flex-1"></div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); onSpeak(mainText); }}
                            className="opacity-20 hover:opacity-100 transition-opacity p-1 text-gray-500"
                            title={t('lab.listen')}
                        >
                            <i className="fas fa-volume-up text-sm"></i>
                        </button>

                         <button 
                            onClick={(e) => { e.stopPropagation(); onPin(msg); }}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-full transition-colors ml-2"
                            title={t('lab.createFlashcard')}
                        >
                            <i className="fas fa-plus-circle text-lg"></i>
                        </button>
                    </div>
                )}
            </div>

            {/* Translation Display */}
            {translation && showTranslation && !isUser && (
                <div className="mt-1 ml-2 pt-1 text-sm opacity-90 italic animate-fade-in text-gray-600 dark:text-gray-400 border-l-2 border-gray-300 pl-2">
                    {translation}
                </div>
            )}

            {/* SUGGESTIONS CHIPS */}
            {suggestions.length > 0 && onSuggestionClick && (
                <div className="flex flex-wrap gap-2 mt-2 ml-1">
                    {suggestions.map((sugg, i) => (
                        <button 
                            key={i}
                            onClick={() => onSuggestionClick(sugg)}
                            className="text-xs bg-white dark:bg-gray-800 border border-primary/30 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-full transition-all shadow-sm flex items-center gap-1 animate-scale-in"
                        >
                            <i className="fas fa-comment-dots text-[10px] opacity-50"></i> {sugg}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};



// --- SCENARIO THEMES ---
const getScenarioThemes = (t: any) => [
    { id: 'restaurant', emoji: '🍝', label: t('lab.scenarios.themes.restaurant'), prompt: t('lab.scenarios.themes.prompts.restaurant') },
    { id: 'coffee', emoji: '☕', label: t('lab.scenarios.themes.coffee'), prompt: t('lab.scenarios.themes.prompts.coffee') },
    { id: 'hotel', emoji: '🏨', label: t('lab.scenarios.themes.hotel'), prompt: t('lab.scenarios.themes.prompts.hotel') },
    { id: 'market', emoji: '🍎', label: t('lab.scenarios.themes.market'), prompt: t('lab.scenarios.themes.prompts.market') },
    { id: 'direction', emoji: '🗺️', label: t('lab.scenarios.themes.direction'), prompt: t('lab.scenarios.themes.prompts.direction') },
    { id: 'meet', emoji: '🤝', label: t('lab.scenarios.themes.meet'), prompt: t('lab.scenarios.themes.prompts.meet') },
];

export const LanguageLabScreen: React.FC<LanguageLabScreenProps> = ({ 
    tutor, 
    onBack, 
    themeMode, 
    themeStyle,
    onAddCards,
    // onCreateSet removed as unused,
    flashcardSets,
    onNavigateToSettings,
    onSaveConvSession,
    initialSession,
    onLaunchAIGenerator,
    onClearAiGenCache,
    targetedLessonsProps,
    onSetTargetedLessonsProps,
    onUpdateSession,
    onSaveVocabList,
    initialVocabList,
    vocabLabCache,
    onSetVocabLabCache,
    onNavigateToCurriculum,
    onStartFlashcardQuiz
}) => {
    const { config } = useAIConfig();
    const { showToast } = useToast();
    const { t } = useTranslation();
    const [targetLang, setTargetLang] = useState(getLanguageCode(tutor));
    const [activeLang, setActiveLang] = useState(targetLang);

    // Update active lang if tutor changes
    useEffect(() => {
        const lang = getLanguageCode(tutor);
        console.log('Tutor language detected:', lang, 'for tutor:', tutor?.name);
        setTargetLang(lang);
        setActiveLang(lang);
    }, [tutor]);

    // --- RESTORE SESSION (from CurriculumScreen "Reprendre") ---
    useEffect(() => {
        if (!initialSession) return;

        // Restore conversation messages (ChatMessage compatible)
        const restoredMsgs = initialSession.messages.map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
        }));
        setConvMessages(restoredMsgs);

        // Restore theme label
        setConvThemeLabel(initialSession.theme);
        setConvTheme(initialSession.theme);

        // Restore summary
        if (initialSession.summary) {
            setConvSummary(initialSession.summary as any);
        }

        // Restore remedial lesson messages
        if (initialSession.remedialMessages && initialSession.remedialMessages.length > 0) {
            const restoredRemedial = initialSession.remedialMessages.map(m => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content,
            }));
            setRemedialMessages(restoredRemedial);
        }

        // Navigate to summary view
        setLabMode('conversation_summary');
        showToast(`Causerie "${initialSession.theme}" restaurée !`, 'success');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSession?.id]);

    // Restore a saved vocab list — switch to vocabulary mode immediately
    useEffect(() => {
        if (initialVocabList) {
            setLabMode('vocabulary');
        }
    }, [initialVocabList?.id]);

    // Restore vocabulary mode when returning from a quiz (cache contains active theme)
    // This mirrors the causerie session restore and fixes the same remount bug.
    useEffect(() => {
        // Only restore vocab mode if no causerie session is being restored
        if (!initialSession && !initialVocabList && vocabLabCache && vocabLabCache['__active_theme__']) {
            setLabMode('vocabulary');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- PIN / FLASHCARD LOGIC ---
    const handlePinMessage = (msg: ChatMessage) => {
        if (msg.role !== 'assistant') return;

        // Parse content: "Foreign Text ||| Traduction"
        const parts = msg.content.split('|||');
        const term = parts[0].trim();
        const def = parts.length > 1 ? parts[1].trim() : '';

        if (!term) return;

        const newCard: FlashcardClassic = {
            id: uuidv4(),
            type: 'classic',
            terms: {
                // Assuming Question is Foreign, Answer is Native (French)
                // Or adapt based on user preference. Standard is Target Lang -> Native Lang

                [activeLang.substring(0, 2)]: term, 
                'fr': def || t('lab.noTranslate')
            }
        };

        const targetSetName = t('lab.study.vocabSet', { lang: activeLang.substring(0, 2).toUpperCase() });
        
        // Check if set exists
        if (flashcardSets[targetSetName]) {
            onAddCards([newCard], targetSetName);
            // Show toast/notify (simplified here with alert or subtle UI, 
            // but alert breaks flow. Let's assume invisible success or implement a toast state)
            console.log("Card added to existing set");
        } else {
            // Create set (which sets it as current)
            // If we want to avoid setting it as current, we rely on onAddCards creating it?
            // But useFlashcards `createSet` forces current.
            // My updated `addCards` logic (Step 3046) creates it if missing!
            // So I can just call onAddCards !
            onAddCards([newCard], targetSetName);
            console.log("Card added to new set");
        }
        
        // Visual feedback could be added here (e.g. setLastPinnedId)
        showToast(t('lab.addedToSet', { name: targetSetName }), 'success');
    };
    
    // --- MODES: 'chat', 'scenario_list', 'scenario_play', 'study', 'pronunciation' ---
    const [labMode, setLabMode] = useState<'chat' | 'scenario_list' | 'scenario_play' | 'study' | 'pronunciation' | 'conversation_select' | 'conversation_active' | 'conversation_summary' | 'vocabulary'>('chat');

    // --- STUDY MODE STATE ---
    const [studyAudioSrc, setStudyAudioSrc] = useState<string | null>(null);
    const [studyScript, setStudyScript] = useState<string>('');
    const [studyPlaybackRate, setStudyPlaybackRate] = useState<number>(1.0);
    const audioRef = useRef<HTMLAudioElement>(null);

    // --- PRONUNCIATION COACH STATE ---
    const [pronunciationChallenges, setPronunciationChallenges] = useState<PronunciationChallenge[]>([]);
    const [pronunciationType, setPronunciationType] = useState<'challenges' | 'dialogue'>('challenges'); // New state
    const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
    const [pronunciationResult, setPronunciationResult] = useState<{score: number, feedback: string} | null>(null);
    const [isGeneratingChallenges, setIsGeneratingChallenges] = useState(false);
    const [dialogueTopic, setDialogueTopic] = useState("");
    const [dialogueLevel, setDialogueLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
    const [showTopicInput, setShowTopicInput] = useState(false);



    const generatePronunciationChallenges = async (mode: 'challenges' | 'dialogue' = 'challenges') => {
        setIsGeneratingChallenges(true);
        setPronunciationChallenges([]);
        try {
            const systemPrompt = PRONUNCIATION_COACH_PROMPT;
            let userPrompt = '';
            
            if (mode === 'challenges') {
                userPrompt = `Langue cible : ${activeLang}. Génère 10 Challenges (phrases isolées).`;
            } else {
                const topic = dialogueTopic.trim() || 'un sujet aléatoire';
                const levelText = dialogueLevel === 'beginner' ? 'Débutant (phrases simples, vocabulaire basique)' : 
                                  dialogueLevel === 'intermediate' ? 'Intermédiaire (phrases courantes, vocabulaire standard)' : 
                                  'Avancé (phrases complexes, vocabulaire riche)';
                userPrompt = `Langue cible : ${activeLang}. Génère un Dialogue réaliste sur : ${topic}. Niveau : ${levelText}.`;
            }

            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            let fullResponse = "";
            
            // Use executeAIRequest directly
            let apiKey = '';
            let model = '';
            let url = '';

            if (config.provider === 'gemini') {
                apiKey = config.geminiApiKey;
                model = config.geminiModel;
            } else if (config.provider === 'local') {
                url = config.localApiUrl;
                model = config.localModelName;
            } else if (config.provider === 'openai') {
                apiKey = config.openaiApiKey || '';
                model = config.openaiModel || '';
            } else if (config.provider === 'mistral') {
                apiKey = config.mistralApiKey || '';
                model = config.mistralModel || '';
            }

             fullResponse = await executeAIRequest(
                messages,
                config.provider,
                apiKey,
                model,
                url
            );
            
            // Extract JSON
            const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]) as PronunciationContent; // Type assertion
                // Fallback for old format or if AI ignores 'content' wrapper
                if (data.content) {
                    setPronunciationChallenges(data.content);
                    setPronunciationType(data.type || 'challenges');
                } else if ((data as any).challenges) {
                     setPronunciationChallenges((data as any).challenges);
                     setPronunciationType('challenges');
                }
                
                setCurrentChallengeIndex(0);
                setPronunciationResult(null);
            }
        } catch (e) {
            console.error("Error generating challenges", e);
            showToast(t('common.error'), 'error');
        } finally {
            setIsGeneratingChallenges(false);
        }
    };

    const verifyPronunciation = (transcript: string) => {
        if (!pronunciationChallenges[currentChallengeIndex]) return;
        const target = pronunciationChallenges[currentChallengeIndex].text;
        const similarity = calculateSimilarity(target, transcript);
        let feedback = "";
        let score = Math.round(similarity * 100);
        
        if (score >= 90) feedback = "Excellent ! 🌟";
        else if (score >= 70) feedback = "Très bien ! 👍";
        else if (score >= 50) feedback = "Pas mal, encore un effort. 🤔";
        else feedback = "Essaie encore. 🎧";
        
        console.log("Setting result:", { score, feedback });
        setPronunciationResult({ score, feedback });
    };

    const [isAnalyzingScript, setIsAnalyzingScript] = useState(false);

    // --- SHADOWING RECORDER STATE ---
    const [isRecordingShadow, setIsRecordingShadow] = useState(false);
    const [shadowAudioSrc, setShadowAudioSrc] = useState<string | null>(null);
    const shadowChunks = useRef<BlobPart[]>([]);
    const shadowRecorder = useRef<MediaRecorder | null>(null);

    const startShadowRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            shadowRecorder.current = new MediaRecorder(stream);
            shadowChunks.current = [];
            
            shadowRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) shadowChunks.current.push(e.data);
            };
            
            shadowRecorder.current.onstop = () => {
                const blob = new Blob(shadowChunks.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setShadowAudioSrc(url);
                // Stop all tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };
            
            shadowRecorder.current.start();
            setIsRecordingShadow(true);
        } catch (err) {
            console.error("Micro access denied", err);
            showToast(t('lab.errors.micDenied'), 'error');
        }
    };

    const stopShadowRecording = () => {
        if (shadowRecorder.current && shadowRecorder.current.state === 'recording') {
            shadowRecorder.current.stop();
            setIsRecordingShadow(false);
        }
    };

    const handleAnalyzeScript = async () => {
        if (!studyScript.trim()) {
            showToast(t('lab.study.placeholder'), 'warning');
            return;
        }

        setIsAnalyzingScript(true);
        try {
            const currentLang = activeLang;
            const targetLang = currentLang.split('-')[0]; // ex: 'it'
            const sourceLang = 'fr';

            const aiConfig: AIGenerationConfig = {
                topic: t('lab.study.analyseTopic', { name: tutor?.name || 'Labo' }),
                sourceLang: sourceLang,
                targetLang: targetLang,
                count: 10,
                difficulty: 'intermediate',
                context: studyScript,
                provider: config.provider,
                apiKey: config.provider === 'gemini' ? config.geminiApiKey : 
                        config.provider === 'openai' ? config.openaiApiKey :
                        config.provider === 'anthropic' ? config.anthropicApiKey :
                        config.provider === 'mistral' ? config.mistralApiKey : undefined,
                modelName: config.provider === 'gemini' ? config.geminiModel :
                           config.provider === 'openai' ? config.openaiModel :
                           config.provider === 'anthropic' ? config.anthropicModel :
                           config.provider === 'mistral' ? config.mistralModel : config.localModelName,
                apiUrl: config.localApiUrl
            };

            const cards = await generateFlashcardsWithAI(aiConfig, tutor?.id);
            
            if (cards && cards.length > 0) {
                const targetSet = t('lab.study.vocabSet', { lang: targetLang.toUpperCase() });
                onAddCards(cards, targetSet);
                showToast(t('lab.study.analyseSuccess', { count: cards.length, name: targetSet }), 'success');
            } else {
                showToast(t('lab.study.noVocab'), 'info');
            }
        } catch (err) {
            console.error("Erreur analyse script:", err);
            showToast(t('lab.study.analyseError'), 'error');
        } finally {
            setIsAnalyzingScript(false);
        }
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setStudyAudioSrc(url);
        }
    };

    // --- CHAT STATE ---
    const { 
        status: listeningStatus, 
        transcript, 
        startListening, 
        stopListening,
        resetTranscript,
        error: speechError 
    } = useSpeechRecognition(activeLang);

    // Auto-verify when silent (Restored behavior)
    useEffect(() => {
        if (labMode === 'pronunciation' && transcript && listeningStatus !== 'listening' && !pronunciationResult) {
            verifyPronunciation(transcript);
        }
    }, [transcript, listeningStatus, labMode, pronunciationResult]);

    // Auto-play TTS when moving to next challenge
    useEffect(() => {
        if (labMode === 'pronunciation' && pronunciationChallenges.length > 0 && !pronunciationResult) {
            const currentChallenge = pronunciationChallenges[currentChallengeIndex];
            if (currentChallenge?.text) {
                // Small delay to let UI update
                const timer = setTimeout(() => {
                    speak(currentChallenge.text);
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [currentChallengeIndex, pronunciationChallenges, labMode, pronunciationResult]);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');

    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Draft Editing State
    const [draftMessage, setDraftMessage] = useState('');

    // Voice Selection State
    // Voice Selection State (Managed by useTTS)
    const { availableVoices, selectedVoice, setSelectedVoice, speak } = useTTS(activeLang);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);
    const [isCorrectionEnabled, setIsCorrectionEnabled] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- SCENARIO STATE ---
    const [activeScenario, setActiveScenario] = useState<ScenarioStep[]>([]);
    const [scenarioStepIndex, setScenarioStepIndex] = useState(0);
    const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
    const [scenarioFeedback, setScenarioFeedback] = useState<'waiting' | 'success' | 'retry'>('waiting');
    const [showScenarioEndPrompt, setShowScenarioEndPrompt] = useState(false);

    const [showExportMenu, setShowExportMenu] = useState(false);

    // --- CONVERSATION MODE STATE ---
    const [convTheme, setConvTheme] = useState<string>('');
    const [convThemeLabel, setConvThemeLabel] = useState<string>('');
    const [convMessages, setConvMessages] = useState<ChatMessage[]>([]);
    const [convSummary, setConvSummary] = useState<ConversationSummary | null>(null);
    const [isGeneratingOpener, setIsGeneratingOpener] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [showCustomConvModal, setShowCustomConvModal] = useState(false);
    const [customConvTopic, setCustomConvTopic] = useState('');
    const convMessagesEndRef = useRef<HTMLDivElement>(null);
    const [convRateLimitSeconds, setConvRateLimitSeconds] = useState(0);

    // --- NEW: TIMER & MEMORY SETTINGS ---
    const [convTimerMinutes, setConvTimerMinutes] = useState<number>(0); 
    const [convTimeLeft, setConvTimeLeft] = useState<number>(0);
    const [isConvTimerRunning, setIsConvTimerRunning] = useState(false);
    const [userWeaknesses, setUserWeaknesses] = useState<string[]>([]);
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    
    // Consolidation Chat States
    const [showRemedialModal, setShowRemedialModal] = useState(false);
    const [remedialMessages, setRemedialMessages] = useState<ChatMessage[]>([]);
    
    // Suivi des leçons ciblées (vocabulaire, patterns, etc.) pour persistance dans la session
    const targetedLessons = targetedLessonsProps || {};
    const setTargetedLessons: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>> = (val) => {
        if (onSetTargetedLessonsProps) onSetTargetedLessonsProps(val);
    };
    const [activeTargetedKey, setActiveTargetedKey] = useState<string | null>(null);
    const [remedialKey, setRemedialKey] = useState(0);
    const [showFullTranscript, setShowFullTranscript] = useState(false); // force remount of markdown on new lesson
    const [remedialDraft, setRemedialDraft] = useState('');
    const [isSendingRemedial, setIsSendingRemedial] = useState(false);

    // Load Weaknesses on mount / lang change
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`studeo_weaknesses_${activeLang}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setUserWeaknesses(parsed);
            } else {
                setUserWeaknesses([]);
            }
        } catch (e) { console.error('Error loading weaknesses', e); }
    }, [activeLang]);

    // Timer interval
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isConvTimerRunning && convTimeLeft > 0 && labMode === 'conversation_active') {
            interval = setInterval(() => {
                setConvTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsConvTimerRunning(false);
                        handleEndConversation(); 
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isConvTimerRunning, convTimeLeft, labMode]);
    
    const handleExport = async (format: 'md' | 'rtf') => {
        let content = "";
        let fileName = "";
        const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');

        if (labMode === 'chat') {
            fileName = `Discussion_Labo_${tutor?.name || 'Session'}_${dateStr}`;
            content = `# Discussion avec ${tutor?.name || 'Tuteur'} (${activeLang})\n\n`;
            messages.forEach(msg => {
                if (msg.role !== 'system') {
                    content += `**${msg.role === 'user' ? 'Moi' : (tutor?.name || 'Tuteur')}:** ${msg.content}\n\n`;
                }
            });
        } else if (labMode === 'scenario_play' || labMode === 'scenario_list') {
            fileName = `Dialogue_Scenario_${tutor?.name || 'Session'}_${dateStr}`;
            content = `# Scénario avec ${tutor?.name || 'Tuteur'} (${activeLang})\n\n`;
            activeScenario.forEach((step, idx) => {
                if (idx < scenarioStepIndex || (idx === scenarioStepIndex && step.userResponse)) {
                   content += `**${tutor?.name || 'Tuteur'}:** ${step.tutorText}\n\n`;
                   if (step.userResponse) {
                       content += `**Moi:** ${step.userResponse}\n\n`;
                   }
                }
            });
        } else if (labMode === 'conversation_active' || labMode === 'conversation_summary') {
            fileName = `Causerie_${convThemeLabel || 'Session'}_${tutor?.name || ''}_${dateStr}`;
            content = `# Causerie : ${convThemeLabel}\nAvec ${tutor?.name || 'Tuteur'} (${activeLang})\n\n`;
            convMessages.forEach(msg => {
                if (msg.role !== 'system') {
                    const mainText = msg.content.split('|||')[0].replace(/\[.*?\]/g, '').trim();
                    content += `**${msg.role === 'user' ? 'Moi' : (tutor?.name || 'Tuteur')}:** ${mainText}\n\n`;
                }
            });
            if (convSummary) {
                content += `\n---\n\n## Bilan de session\n\n`;
                content += `**Score de fluidité :** ${convSummary.fluency_score}/100\n\n`;
                if (convSummary.strong_points.length > 0) {
                    content += `**Points forts :** ${convSummary.strong_points.join(', ')}\n\n`;
                }
                if (convSummary.errors.length > 0) {
                    content += `**Corrections :**\n`;
                    convSummary.errors.forEach(e => {
                        content += `- ~~${e.original}~~ → **${e.corrected}** *(${e.explanation})*\n`;
                    });
                    content += '\n';
                }
                if (convSummary.vocabulary.length > 0) {
                    content += `**Vocabulaire clé :**\n`;
                    convSummary.vocabulary.forEach(v => {
                        content += `- **${v.word}** : ${v.translation}\n`;
                    });
                    content += '\n';
                }
                if (convSummary.next_theme_suggestion) {
                    content += `**Suggestion pour la prochaine session :** ${convSummary.next_theme_suggestion}\n`;
                }
            }
        }


        try {
            const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;
            if (isTauri) {
                const { save } = await import('@tauri-apps/api/dialog');
                const { writeTextFile } = await import('@tauri-apps/api/fs');
                if (format === 'rtf') {
                    const { markdownToRTF } = require('../utils/rtfExport');
                    const rtfContent = markdownToRTF(content);
                    const filePath = await save({
                        defaultPath: `${fileName}.rtf`,
                        filters: [{ name: 'Rich Text Format', extensions: ['rtf'] }]
                    });
                    if (filePath) {
                        await writeTextFile(filePath, rtfContent);
                        showToast(t('common.saved') || 'Fichier sauvegardé avec succès', 'success');
                    }
                } else {
                    const filePath = await save({
                        defaultPath: `${fileName}.md`,
                        filters: [{ name: 'Markdown', extensions: ['md'] }]
                    });
                    if (filePath) {
                        await writeTextFile(filePath, content);
                        showToast(t('common.saved') || 'Fichier sauvegardé avec succès', 'success');
                    }
                }
            } else {
                // Web/Mobile Fallback (Blob a.click)
                if (format === 'rtf') {
                    const { markdownToRTF } = require('../utils/rtfExport');
                    const rtfContent = markdownToRTF(content);
                    const blob = new Blob([rtfContent], { type: 'application/rtf' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${fileName}.rtf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast(t('common.saved') || 'Fichier téléchargé avec succès', 'success');
                } else {
                    const blob = new Blob([content], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${fileName}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast(t('common.saved') || 'Fichier téléchargé avec succès', 'success');
                }
            }
        } catch (error) {
            console.error('Erreur export :', error);
            showToast('Erreur lors de l\'exportation du fichier', 'error');
        }
        setShowExportMenu(false);
    };

    // Auto-scroll to bottom (Chat Mode)
    useEffect(() => {
        if (labMode === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, transcript, draftMessage, labMode]);

    // Sync transcript to draft when listening
    useEffect(() => {
        if (listeningStatus === 'listening') {
            setDraftMessage(transcript);
        } else if (transcript && !draftMessage) {
            // Cas où on arrive avec un transcript déjà existant (rare mais possible)
            setDraftMessage(transcript);
        }
    }, [transcript, listeningStatus]);

    // Load voices


    // Initial Greeting
    useEffect(() => {
        if (tutor && messages.length === 0) {
            // Placeholder for initial greeting
        }
    }, [tutor]);



    // --- SCENARIO LOGIC ---
    const startScenario = async (themePrompt: string) => {
        if (!tutor) return;
        setIsGeneratingScenario(true);
        setLabMode('scenario_play');
        setScenarioStepIndex(0);
        setScenarioFeedback('waiting');
        setActiveScenario([]);

        try {
            const steps = await generateScenario(tutor, themePrompt, config, activeLang);
            setActiveScenario(steps);
            // Speak first line after short delay
            setTimeout(() => {
                if (steps.length > 0) speak(steps[0].tutorText);
            }, 1000);
        } catch (error) {
            console.error("Failed to start scenario", error);
            setLabMode('scenario_list'); // Go back on error
        } finally {
            setIsGeneratingScenario(false);
        }
    };

    const handleScenarioUserResponse = (userText: string) => {
        const currentStep = activeScenario[scenarioStepIndex];
        if (!currentStep) return;

        // Simple validation logic (contains key words or length match)
        // For now, let's be lenient: if length is > 50% of target, we assume it's an attempt
        // Ideally we would use Levenshtein distance or semantic check
        
        // Normalize for comparison
        const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;]/g, '').trim();
        const target = normalize(currentStep.userTarget);
        const attempt = normalize(userText);

        // Very basic check: do we have at least 50% of the words?
        const targetWords = target.split(' ');
        const attemptWords = attempt.split(' ');
        const matchCount = targetWords.filter(w => attemptWords.includes(w)).length;
        const successRate = matchCount / targetWords.length;

        if (successRate > 0.4 || attempt === target) {
            setScenarioFeedback('success');
            // Save user response
            setActiveScenario(prev => {
                const newScenario = [...prev];
                newScenario[scenarioStepIndex] = {
                    ...newScenario[scenarioStepIndex],
                    userResponse: userText
                };
                return newScenario;
            });

            // Play success sound logic here if needed
            setTimeout(() => {
                if (scenarioStepIndex < activeScenario.length - 1) {
                    const nextIndex = scenarioStepIndex + 1;
                    setScenarioStepIndex(nextIndex);
                    setScenarioFeedback('waiting');
                    resetTranscript();
                    setDraftMessage('');
                    // Tutor speaks next line
                    setTimeout(() => speak(activeScenario[nextIndex].tutorText), 500);
                } else {
                    // Scenario finished!
                    showToast(t('lab.scenarios.finished'), 'success');
                    setShowScenarioEndPrompt(true);
                }
            }, 1500);
        } else {
            setScenarioFeedback('retry');
        }
    };


    // --- CHAT LOGIC ---
    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !tutor) return;

        // Mode Scenario Special Handler
        if (labMode === 'scenario_play') {
            handleScenarioUserResponse(text);
            return;
        }

        const userMsg: ChatMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);
        setTextInput('');
        setDraftMessage('');
        resetTranscript(); // Clear speech transcript if any

        try {
            const responseText = await generateLabResponse(tutor, messages, text, config, { enableCorrection: isCorrectionEnabled, activeLanguage: activeLang });
            
            const aiMsg: ChatMessage = { role: 'assistant', content: responseText };
            setMessages(prev => [...prev, aiMsg]);
            
            speak(responseText);

        } catch (error) {
            console.error(error);
            const errorMsg: ChatMessage = { role: 'system', content: t('lab.chat.errorConnection') };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        resetTranscript();
        setDraftMessage('');
    };

    const handleMicClick = () => {
        if (listeningStatus === 'listening') {
            stopListening();
        } else {
            // On lance l'écoute et on vide le draft précédent
            setDraftMessage('');
            resetTranscript(); // Force clean
            startListening();
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (inputMode === 'text') return; // Don't intercept text input mode

            // Avoid triggering shortcuts if user is editing the textarea or inputs
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;

            // Pronunciation mode shortcuts
            if (labMode === 'pronunciation' && pronunciationChallenges.length > 0) {
                const currentChallenge = pronunciationChallenges[currentChallengeIndex];
                
                if (pronunciationResult) {
                    // When result is shown (after user validation)
                    if (e.code === 'Enter' || e.code === 'ArrowRight') {
                        e.preventDefault();
                        // Click "Suivant"
                        setPronunciationResult(null);
                        resetTranscript();
                        if (currentChallengeIndex < pronunciationChallenges.length - 1) {
                            setCurrentChallengeIndex(prev => prev + 1);
                        } else {
                            setPronunciationChallenges([]);
                        }
                    }
                    if (e.code === 'KeyR') {
                        e.preventDefault();
                        // Click "Réessayer"
                        setPronunciationResult(null);
                        resetTranscript();
                    }
                } else {
                    // When no result yet
                    // Space: control microphone (start/stop)
                    if (e.code === 'Space') {
                        e.preventDefault();
                        if (listeningStatus === 'listening') {
                            stopListening();
                        } else {
                            startListening();
                        }
                    }
                    
                    // ArrowRight: skip AI dialogue lines
                    if (e.code === 'ArrowRight' && pronunciationType === 'dialogue' && currentChallenge?.role === 'ai') {
                        e.preventDefault();
                        if (currentChallengeIndex < pronunciationChallenges.length - 1) {
                            setCurrentChallengeIndex(prev => prev + 1);
                        }
                    }
                }
                return; // Don't process other shortcuts in pronunciation mode
            }

            if (e.code === 'Space') {
                e.preventDefault(); 
                handleMicClick();
            }
            if (e.code === 'Enter' && draftMessage && listeningStatus !== 'listening') {
                 handleSendMessage(draftMessage);
            }
            if (e.code === 'Escape') {
                if (listeningStatus === 'listening') {
                    stopListening();
                }
                handleReset();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inputMode, listeningStatus, draftMessage, handleMicClick, handleSendMessage, labMode, pronunciationChallenges, pronunciationResult, currentChallengeIndex]);

    // --- CUSTOM SCENARIO STATE ---
    const [showCustomScenarioModal, setShowCustomScenarioModal] = useState(false);
    const [customTopic, setCustomTopic] = useState('');

    // --- CONVERSATION MODE LOGIC ---
    const getConversationThemes = () => [
        { id: 'travel',  emoji: '✈️', label: 'Voyages & découvertes', desc: 'Destinations, cultures, expériences...' },
        { id: 'cinema',  emoji: '🎬', label: 'Cinéma & Séries',       desc: 'Films, séries, acteurs préférés...' },
        { id: 'food',    emoji: '🍽️', label: 'Gastronomie',           desc: 'Plats, restaurants, recettes...' },
        { id: 'work',    emoji: '💼', label: 'Travail & Ambitions',    desc: 'Carrière, projets, rêves...' },
        { id: 'culture', emoji: '🎨', label: 'Culture & Art',          desc: 'Musique, livres, expositions...' },
        { id: 'sport',   emoji: '⚽', label: 'Sport & Loisirs',        desc: 'Pratiques sportives, bien-être...' },
        { id: 'tech',    emoji: '💻', label: 'Technologie',            desc: 'IA, réseaux sociaux, gadgets...' },
        { id: 'nature',  emoji: '🌿', label: 'Nature & Planète',       desc: 'Écologie, animaux, environnement...' },
    ];

    const startConversation = async (theme: string, themeLabel: string) => {
        if (!tutor || convRateLimitSeconds > 0) return;
        setConvTheme(theme);
        setConvThemeLabel(themeLabel);
        setConvMessages([]);
        setConvSummary(null);
        setRemedialMessages([]);       // ← reset la leçon précédente
        setTargetedLessons({});        // ← reset les leçons ciblées
        setActiveTargetedKey(null);    // ← reset la clé active
        if (onClearAiGenCache) onClearAiGenCache(); // ← reset le cache du générateur IA
        if (onUpdateSession) onUpdateSession(undefined); // ← reset la session mémorisée
        setShowRemedialModal(false);   // ← ferme la modale si ouverte
        setLabMode('conversation_active');
        
        // Timer Logic
        if (convTimerMinutes > 0) {
            setConvTimeLeft(convTimerMinutes * 60);
            setIsConvTimerRunning(true);
        } else {
            setIsConvTimerRunning(false);
            setConvTimeLeft(0);
        }

        setIsGeneratingOpener(true);
        try {
            const opener = await generateConversationalOpener(tutor, theme, config, activeLang, userWeaknesses);
            const aiMsg: ChatMessage = { role: 'assistant', content: opener };
            setConvMessages([aiMsg]);
            speak(opener.split('|||')[0].replace(/\[.*?\]/g, '').trim());
        } catch (e) {
            console.error('Error generating opener', e);
            const errMsg = e instanceof Error ? e.message : String(e);
            const is429 = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
            if (is429) {
                // Extract retry delay from the error message
                const retryMatch = errMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
                const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : 35;
                setConvRateLimitSeconds(retrySecs);
                showToast(`Quota API atteint — réessaie dans ${retrySecs}s`, 'error');
            } else {
                showToast(t('common.error'), 'error');
            }
            setLabMode('conversation_select');
        } finally {
            setIsGeneratingOpener(false);
        }
    };

    const handleSendConvMessage = async (text: string) => {
        if (!text.trim() || !tutor) return;
        const userMsg: ChatMessage = { role: 'user', content: text };
        setConvMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);
        setTextInput('');
        setDraftMessage('');
        resetTranscript();
        try {
            const responseText = await generateLabResponse(
                tutor, convMessages, text, config,
                { enableCorrection: true, activeLanguage: activeLang, conversationTheme: convTheme, userWeaknesses }
            );
            const aiMsg: ChatMessage = { role: 'assistant', content: responseText };
            setConvMessages(prev => [...prev, aiMsg]);
            speak(responseText.split('|||')[0].replace(/\[.*?\]/g, '').trim());
        } catch (error) {
            console.error(error);
            setConvMessages(prev => [...prev, { role: 'system', content: t('lab.chat.errorConnection') }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEndConversation = async () => {
        if (convMessages.length < 2) { setLabMode('conversation_select'); return; }
        // Set spinner BEFORE switching mode to avoid flash of empty state
        setIsGeneratingSummary(true);
        setLabMode('conversation_summary');
        try {
            const summary = await generateConversationSummary(convMessages, activeLang, config);
            setConvSummary(summary);
            
            // Save weaknesses
            if (summary.error_patterns && summary.error_patterns.length > 0) {
                const newWeaknesses = summary.error_patterns.slice(0, 3);
                setUserWeaknesses(newWeaknesses);
                try {
                    localStorage.setItem(`studeo_weaknesses_${activeLang}`, JSON.stringify(newWeaknesses));
                } catch (e) {}
            }

            // CORRECTION BUG: on utilise la variable locale `summary` (pas l'état `convSummary`)
            // car React setState est asynchrone — convSummary serait encore null ici dans le finally.
            if (onUpdateSession) {
                onUpdateSession({
                    id: uuidv4(),
                    tutorId: tutor?.id || 'unknown',
                    tutorName: tutor?.name || 'Tuteur',
                    language: activeLang,
                    theme: convThemeLabel || convTheme || 'Causerie',
                    messages: convMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                    summary: summary as any,
                    remedialMessages: remedialMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                    createdAt: new Date().toISOString(),
                    lastActiveAt: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error('Error generating summary', e);
            const emptySummary = { errors: [], vocabulary: [], fluency_score: 0, strong_points: [], next_theme_suggestion: '', error_patterns: [], lesson_suggestions: [] };
            setConvSummary(emptySummary);
            // Save even on error so navigation doesn't lose session
            if (onUpdateSession) {
                onUpdateSession({
                    id: uuidv4(),
                    tutorId: tutor?.id || 'unknown',
                    tutorName: tutor?.name || 'Tuteur',
                    language: activeLang,
                    theme: convThemeLabel || convTheme || 'Causerie',
                    messages: convMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                    summary: emptySummary as any,
                    remedialMessages: remedialMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                    createdAt: new Date().toISOString(),
                    lastActiveAt: new Date().toISOString()
                });
            }
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleGenerateLesson = async () => {
        if (!tutor || !convSummary) return;
        const key = 'dynamic_main';
        
        if (targetedLessons[key]) {
            setActiveTargetedKey(key);
            setRemedialMessages(targetedLessons[key]);
            setShowRemedialModal(true);
            return;
        }

        setIsGeneratingLesson(true);
        setActiveTargetedKey(key);
        setRemedialMessages([]);
        try {
            const lessonText = await generateRemedialLesson(
                tutor,
                convThemeLabel,
                convSummary.errors,
                convSummary.vocabulary,
                userWeaknesses,
                activeLang,
                config
            );
            const newMsgs = [{ role: 'assistant' as const, content: lessonText }];
            setRemedialMessages(newMsgs);
            setTargetedLessons(prev => ({ ...prev, [key]: newMsgs }));
            setRemedialKey(k => k + 1); 
            setTimeout(() => {
                setShowRemedialModal(true);
                setTimeout(() => {
                    const container = document.getElementById('remedial-box-end');
                    if (container) container.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }, 0);
        } catch (e) {
            console.error('Failed to generate lesson:', e);
            showToast('Erreur lors de la génération de la leçon.', 'error');
        } finally {
            setIsGeneratingLesson(false);
        }
    };

    const handleStartTargetedLesson = async (prompt: string, key: string) => {
        if (!tutor) return;
        
        // Si la leçon existe déjà pour cette clé, on la restaure simplement
        if (targetedLessons[key]) {
            setActiveTargetedKey(key);
            setRemedialMessages(targetedLessons[key]);
            setShowRemedialModal(true);
            return;
        }

        setIsGeneratingLesson(true);
        setActiveTargetedKey(key);
        setRemedialMessages([]);
        setShowRemedialModal(true);
        
        try {
            const sysPrompt = `Tu es ${tutor.name}, un professeur de langue interactif. L'élève te demande un exercice ou une leçon très spécifique (quiz, vocabulaire, règle...).
Réponds directement avec la leçon ou l'exercice demandé, formaté en Markdown clair. Rends cela interactif, n'en dis pas trop d'un coup.

TRÈS IMPORTANT:
Si la demande de l'élève nécessite ou implique des exercices (comme un quiz, des phrases à trous, des traductions...), TU DOIS OBLIGATOIREMENT AJOUTER à la fin de ta réponse un bloc JSON contenant ces exercices, avec ce format strict :
\`\`\`json
{
  "exercises": [
    { "type": "quiz", "question": "Question QCM ?", "options": ["A", "B", "C", "D"], "answer": "La bonne réponse exacte" },
    { "type": "translation", "sentence": "Phrase à traduire vers ${activeLang}", "targetLanguage": "${activeLang}", "answer": "Traduction correcte" },
    { "type": "fill-in", "sentence": "Phrase ____ à compléter", "answer": "mot" }
  ]
}
\`\`\`
Ne mets de JSON que s'il y a des "exercices" dans ta réponse. Sinon, réponds juste en texte normal en Markdown.
NE METS PAS l'intégralité de ta réponse dans un bloc de code.`;
            
            const { apiKey, modelName, apiUrl } = resolveConfig(config);
            const responseText = await executeAIRequest([
                { role: 'system', content: sysPrompt },
                { role: 'user', content: prompt }
            ], config.provider, apiKey, modelName, apiUrl);
            
            const newMsgs = [
                { role: 'assistant' as const, content: responseText }
            ];
            
            setRemedialMessages(newMsgs);
            setTargetedLessons(prev => ({ ...prev, [key]: newMsgs }));
            setRemedialKey(k => k + 1);
            
            setTimeout(() => {
                const container = document.getElementById('remedial-box-end');
                if (container) container.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        } catch (e) {
            console.error('Failed to generate targeted lesson:', e);
            showToast('Erreur lors de la génération ciblée.', 'error');
            setShowRemedialModal(false);
            setActiveTargetedKey(null);
        } finally {
            setIsGeneratingLesson(false);
        }
    };

    const handleSendRemedialMessage = async () => {
        if (!remedialDraft.trim() || !tutor) return;
        
        const newHistory: ChatMessage[] = [...remedialMessages, { role: 'user', content: remedialDraft.trim() }];
        setRemedialMessages(newHistory);
        if (activeTargetedKey) {
            setTargetedLessons(prev => ({ ...prev, [activeTargetedKey]: newHistory }));
        }
        setRemedialDraft('');
        setIsSendingRemedial(true);
        setTimeout(() => {
            const container = document.getElementById('remedial-box-end');
            if (container) container.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        try {
            const reply = await generateRemedialChatReply(tutor, activeLang, newHistory, config);
            const fullHistory: ChatMessage[] = [...newHistory, { role: 'assistant' as const, content: reply }];
            setRemedialMessages(fullHistory);
            if (activeTargetedKey) {
                setTargetedLessons(prev => ({ ...prev, [activeTargetedKey]: fullHistory }));
            }
            setRemedialKey(k => k + 1);
        } catch (e) {
            console.error('Error sending remedial chat', e);
            showToast('Erreur de connexion', 'error');
        } finally {
            setIsSendingRemedial(false);
            setTimeout(() => {
                const container = document.getElementById('remedial-box-end');
                if (container) container.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        }
    };

    // Auto-scroll conversation
    useEffect(() => {
        if (labMode === 'conversation_active') {
            convMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [convMessages, draftMessage, labMode]);

    // Rate-limit countdown
    useEffect(() => {
        if (convRateLimitSeconds <= 0) return;
        const timer = setTimeout(() => setConvRateLimitSeconds(s => Math.max(0, s - 1)), 1000);
        return () => clearTimeout(timer);
    }, [convRateLimitSeconds]);

    return (
        <div className="flex flex-col h-full bg-background text-text animate-fade-in font-sans relative">
            {/* Header */}
            <div 
                className={`transition-all duration-500 pt-safe p-4 shadow-md z-10 space-y-3 group relative ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                {onNavigateToSettings && (
                    <button 
                        onClick={onNavigateToSettings}
                        className="absolute bottom-4 right-6 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 hover:bg-white/10 rounded-xl"
                        title="Paramètres de l'IA"
                    >
                        <i className="fas fa-cog text-inherit"></i>
                    </button>
                )}
                {/* Top Row: Back + Title + Settings */}
                <div className="flex flex-wrap items-start sm:items-center justify-between gap-y-3 mb-2 sm:mb-0">
                    {/* GAUCHE: Accueil & Historique */}
                    <div className="flex gap-1 sm:gap-2 items-center order-1">
                        <button 
                            onClick={() => {
                                window.speechSynthesis.cancel();
                                onBack();
                            }}
                            className={`transition-all rounded-lg px-2 sm:px-3 py-1.5 backdrop-blur-sm flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80`}
                        >
                            <i className="fas fa-home text-inherit"></i> <span className="hidden xs:inline">Accueil</span>
                        </button>

                        {['conversation_select', 'conversation_active', 'conversation_summary', 'vocabulary'].includes(labMode) && onNavigateToCurriculum && (
                            <button
                                onClick={() => {
                                    window.speechSynthesis.cancel();
                                    window.localStorage.setItem(
                                        'curriculum_active_tab', 
                                        JSON.stringify(labMode === 'vocabulary' ? 'vocabulary' : 'conversations')
                                    );
                                    onNavigateToCurriculum();
                                }}
                                className={`transition-all rounded-lg w-7 h-7 sm:w-8 sm:h-8 backdrop-blur-sm flex items-center justify-center text-xs sm:text-sm ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary/70 hover:bg-black/10' : 'bg-white/10 text-white/80 hover:bg-white/20'} hover:opacity-100 flex-shrink-0`}
                                title={labMode === 'vocabulary' ? "Listes de vocabulaire enregistrées" : "Causeries enregistrées"}
                            >
                                <i className="fas fa-history text-inherit"></i>
                            </button>
                        )}
                    </div>
                    
                    {/* CENTRE: Titre */}
                    <div className="text-center text-inherit order-3 sm:order-2 w-full sm:w-auto flex-1 min-w-0 sm:min-w-[200px]">
                        <h1 className="text-base sm:text-lg font-bold flex items-center gap-2 justify-center text-inherit line-clamp-1">
                            <span className="text-xl sm:text-2xl">{tutor?.emoji}</span>
                            <span className="font-bold text-inherit truncate">{tutor?.name}</span>
                        </h1>
                     <div className="flex items-center justify-center gap-3 mt-1">
                            {/* Lang Toggle */}
                            {/* Lang Toggle */}
                            <button 
                                onClick={() => setActiveLang(prev => prev === 'fr-FR' ? targetLang : 'fr-FR')}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-all flex items-center gap-2 ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/20 text-white'}`}
                                title="Basculer la langue"
                            >
                                <span className={activeLang === targetLang ? 'font-bold text-inherit' : 'opacity-50 text-inherit'}>
                                    {(targetLang.includes('-') ? targetLang.split('-')[0] : targetLang).toUpperCase()}
                                </span>
                                <i className="fas fa-exchange-alt text-[10px] opacity-50 text-inherit"></i>
                                <span className={activeLang === 'fr-FR' ? 'font-bold text-inherit' : 'opacity-50 text-inherit'}>
                                    FR
                                </span>
                            </button>

                             <button 
                                onClick={() => setIsCorrectionEnabled(!isCorrectionEnabled)}
                                className={`h-5 px-2 rounded-full flex items-center gap-1.5 transition-all text-[10px] font-bold uppercase tracking-wide border ${
                                    isCorrectionEnabled 
                                        ? 'bg-orange-100 text-orange-600 border-orange-200 shadow-sm' 
                                        : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
                                }`}
                                title={isCorrectionEnabled ? "Mode Correction Activé (Désactiver)" : "Activer la correction grammaticale"}
                            >
                                <i className={`fas fa-graduation-cap ${isCorrectionEnabled ? 'text-xs' : ''}`}></i>
                                {isCorrectionEnabled ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                    
                    {/* DROITE: Export & Réglages */}
                    <div className="flex gap-1 sm:gap-2 relative order-2 sm:order-3">
                        {/* Export Button (Discrete) */}
                        {(labMode === 'chat' || labMode === 'conversation_active' || labMode === 'conversation_summary' || (labMode === 'scenario_play' && activeScenario.length > 0)) && (
                            <>
                                <button 
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-base transition-all ${
                                        showExportMenu 
                                            ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-primary text-white' : 'bg-white text-primary') 
                                            : (themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white')
                                    } hover:opacity-80`}
                                    title="Exporter la session"
                                >
                                    <i className="fas fa-file-export text-inherit"></i>
                                </button>
                                
                                {showExportMenu && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setShowExportMenu(false)}></div>
                                        <div className="absolute top-full right-10 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-30 min-w-[150px] animate-scale-in origin-top-right text-text">
                                            <button 
                                                onClick={() => handleExport('md')}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-3"
                                            >
                                                <i className="fab fa-markdown text-blue-500"></i> (.md)
                                            </button>
                                            <button 
                                                onClick={() => handleExport('rtf')}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 flex items-center gap-3"
                                            >
                                                <i className="fas fa-file-word text-blue-600"></i> (.rtf)
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                         {/* Settings Button */}
                         <button onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-base transition-all ${
                                showVoiceSettings 
                                    ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-primary text-white' : 'bg-white text-primary') 
                                    : (themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white')
                            } hover:opacity-80`}
                            title={t('common.settings')}
                        >
                            <i className="fas fa-sliders-h text-inherit"></i>
                        </button>
                    </div>
                </div>

                <div className="flex sm:justify-center mt-2 sm:mt-0 max-w-full overflow-hidden">
                    <div className={`p-1 rounded-xl sm:rounded-full flex gap-1 overflow-x-auto scrollbar-hide w-full sm:w-auto ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5' : 'bg-black/20'}`}>
                        <button 
                            onClick={() => setLabMode('chat')} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${labMode === 'chat' ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-white text-primary shadow-sm' : 'bg-white text-primary shadow-sm') : (themeStyle === 'apple' && themeMode === 'light' ? 'text-primary/60 hover:text-primary' : 'text-white/70 hover:text-white')}`}
                        >
                            {t('lab.tabs.chat')}
                        </button>
                        <button 
                            onClick={() => setLabMode('conversation_select')} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${labMode.startsWith('conversation') ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-white text-primary shadow-sm' : 'bg-white text-primary shadow-sm') : (themeStyle === 'apple' && themeMode === 'light' ? 'text-primary/60 hover:text-primary' : 'text-white/70 hover:text-white')}`}
                        >
                            🗣️ Causerie
                        </button>
                        <button 
                            onClick={() => setLabMode('scenario_list')} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${labMode.startsWith('scenario') ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-white text-primary shadow-sm' : 'bg-white text-primary shadow-sm') : (themeStyle === 'apple' && themeMode === 'light' ? 'text-primary/60 hover:text-primary' : 'text-white/70 hover:text-white')}`}
                        >
                            {t('lab.tabs.scenarios')}
                        </button>
                        <button 
                            onClick={() => setLabMode('study')} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${labMode === 'study' ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-white text-primary shadow-sm' : 'bg-white text-primary shadow-sm') : (themeStyle === 'apple' && themeMode === 'light' ? 'text-primary/60 hover:text-primary' : 'text-white/70 hover:text-white')}`}
                        >
                            {t('lab.tabs.study')}
                        </button>
                        <button 
                            onClick={() => setLabMode('pronunciation')} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${labMode === 'pronunciation' ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-white text-primary shadow-sm' : 'bg-white text-primary shadow-sm') : (themeStyle === 'apple' && themeMode === 'light' ? 'text-primary/60 hover:text-primary' : 'text-white/70 hover:text-white')}`}
                        >
                            <i className="fas fa-microphone-alt mr-1"></i> Coach
                        </button>
                        <button 
                            onClick={() => setLabMode('vocabulary')} 
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0 whitespace-nowrap ${labMode === 'vocabulary' ? (themeStyle === 'apple' && themeMode === 'light' ? 'bg-white text-primary shadow-sm' : 'bg-white text-primary shadow-sm') : (themeStyle === 'apple' && themeMode === 'light' ? 'text-primary/60 hover:text-primary' : 'text-white/70 hover:text-white')}`}
                        >
                            📚 Vocab
                        </button>
                    </div>
                </div>
            </div>

            {/* Voice Settings Modale */}
            {showVoiceSettings && (
                <div className="absolute top-16 right-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-72 overflow-hidden animate-fade-in-down">
                     <div className="p-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                         <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">{t('common.settings')}</h3>
                        <button onClick={() => setShowVoiceSettings(false)} className="text-gray-500 hover:text-red-500"><i className="fas fa-times"></i></button>
                    </div>
                    
                    {/* Target Language Selector */}
                    <div className="p-3 border-b border-gray-100 dark:border-gray-600">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Langue du Prof</label>
                        <select 
                            value={targetLang}
                            onChange={(e) => {
                                const newLang = e.target.value;
                                setTargetLang(newLang);
                                setActiveLang(newLang);
                            }}
                            className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-text"
                        >
                            <option value="fr-FR">Français (FR)</option>
                            <option value="en-US">Anglais (US)</option>
                            <option value="en-GB">Anglais (UK)</option>
                            <option value="es-ES">Espagnol (ES)</option>
                            <option value="it-IT">Italien (IT)</option>
                            <option value="de-DE">Allemand (DE)</option>
                            <option value="pt-PT">Portugais (PT)</option>
                            <option value="pl-PL">Polonais (PL)</option>
                            <option value="tr-TR">Turc (TR)</option>
                            <option value="ru-RU">Russe (RU)</option>
                            <option value="zh-CN">Chinois (CN)</option>
                            <option value="ja-JP">Japonais (JP)</option>
                        </select>
                    </div>

                    <div className="p-2">
                        <h4 className="px-2 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('quiz.voice.title', { lang: availableVoices.length })}</h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                        {availableVoices.length === 0 ? (
                            <div className="text-center p-4 text-sm text-gray-500">{t('quiz.voice.noVoice')}</div>
                        ) : (
                            availableVoices.map((voice, idx) => (
                                <button
                                    key={`${voice.name}-${idx}`}
                                    onClick={() => {
                                        setSelectedVoice(voice);
                                        // Preview
                                        window.speechSynthesis.cancel();
                                        const utt = new SpeechSynthesisUtterance("Hello, I am ready.");
                                        utt.voice = voice;
                                        utt.lang = activeLang; // Important pour les voix hybrides
                                        window.speechSynthesis.speak(utt);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm flex items-center justify-between transition-colors ${
                                        selectedVoice?.name === voice.name 
                                            ? 'bg-primary/10 text-primary font-semibold border-primary border' 
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-text'
                                    }`}
                                >
                                    <span className="truncate">{voice.name}</span>
                                    {selectedVoice?.name === voice.name && <i className="fas fa-check"></i>}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Custom Scenario Modal */}
            {showCustomScenarioModal && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-scale-in">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                            {t('lab.scenarios.modal.title')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                            {t('lab.scenarios.modal.desc')}
                        </p>
                        <textarea 
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            placeholder={t('lab.scenarios.modal.placeholder')}
                            className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4 text-text focus:ring-2 focus:ring-primary outline-none resize-none h-32"
                            autoFocus
                        />
                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setShowCustomScenarioModal(false)}
                                className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                {t('lab.scenarios.modal.cancel')}
                            </button>
                            <button 
                                onClick={() => {
                                    if (customTopic.trim()) {
                                        startScenario(customTopic);
                                        setShowCustomScenarioModal(false);
                                        setCustomTopic('');
                                    }
                                }}
                                disabled={!customTopic.trim()}
                                className="px-6 py-2 rounded-lg bg-primary text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {t('lab.scenarios.modal.start')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCENARIO END MODAL (EXPORT OR EXIT) */}
            {showScenarioEndPrompt && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-2xl p-8 animate-scale-in text-center flex flex-col items-center border border-gray-100 dark:border-gray-700">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-50 dark:ring-green-900/50">
                            <i className="fas fa-check text-4xl text-green-500"></i>
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-gray-800 dark:text-white">Scénario terminé !</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs text-sm">Félicitations pour cet échange. Voulez-vous exporter le dialogue pour vos révisions ?</p>
                        
                        <div className="flex flex-col gap-3 w-full">
                            <button 
                                onClick={() => { handleExport('md'); setLabMode('scenario_list'); setShowScenarioEndPrompt(false); }}
                                className="w-full py-3.5 rounded-xl bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fab fa-markdown"></i> Markdown (.md)
                            </button>
                            <button 
                                onClick={() => { handleExport('rtf'); setLabMode('scenario_list'); setShowScenarioEndPrompt(false); }}
                                className="w-full py-3.5 rounded-xl bg-primary/10 text-primary font-bold hover:hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-file-word"></i> Rich Text (.rtf)
                            </button>
                            <button 
                                onClick={() => { setLabMode('scenario_list'); setShowScenarioEndPrompt(false); }}
                                className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mt-2"
                            >
                                <i className="fas fa-times mr-2 text-xs"></i> Non merci, quitter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ERROR DISPLAY */}
            {speechError && <div className="absolute top-24 left-0 right-0 z-20 flex justify-center"><div className="bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">{speechError}</div></div>}


            {/* === CONTENT AREA === */}
            <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">

                {/* 0. VOCABULARY LAB MODE */}
                {labMode === 'vocabulary' && (
                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                        <VocabularyLabTab
                            config={config}
                            activeLang={activeLang}
                            onAddCards={onAddCards}
                            onSaveVocabList={onSaveVocabList}
                            initialVocab={initialVocabList}
                            vocabLabCache={vocabLabCache}
                            onSetVocabLabCache={onSetVocabLabCache}
                            onLaunchQuiz={onStartFlashcardQuiz}
                        />
                    </div>
                )}
                
                {/* 1. CHAT MODE */}
                {labMode === 'chat' && (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4 min-h-0">
                        {messages.length === 0 && !draftMessage && (
                            <div className="text-center text-text-muted mt-20 opacity-60">
                                <div className="text-6xl mb-4">🎙️</div>
                                <p>{t('lab.chat.placeholder')}</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <LabMessageBubble 
                                key={idx} 
                                msg={msg} 
                                onSpeak={speak} 
                                onPin={handlePinMessage}
                                onSuggestionClick={handleSendMessage}
                            />
                        ))}
                        
                        {/* Draft / Transcript Ghost Message */}
                        {draftMessage && (
                            <div className="flex w-full justify-end animate-fade-in-up">
                                <div className={`max-w-[85%] rounded-2xl rounded-br-none px-4 py-3 shadow-sm ${listeningStatus === 'listening' ? 'bg-primary/5 border border-primary/30 text-primary' : 'bg-primary text-white flex flex-col min-w-[12rem] sm:min-w-[16rem]'}`}>
                                    {listeningStatus === 'listening'
                                        ? <div className="flex items-center gap-2"><span className="animate-pulse w-2 h-2 rounded-full bg-red-500"></span><span>{draftMessage}</span></div>
                                        : (
                                            <>
                                                <textarea 
                                                    value={draftMessage}
                                                    onChange={(e) => setDraftMessage(e.target.value)}
                                                    className="bg-transparent text-white w-full outline-none resize-none m-0 p-0 overflow-hidden leading-relaxed"
                                                    style={{ minHeight: '24px' }}
                                                    ref={(el) => {
                                                        if (el) {
                                                            el.style.height = 'auto';
                                                            el.style.height = `${el.scrollHeight}px`;
                                                        }
                                                    }}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = `${target.scrollHeight}px`;
                                                    }}
                                                />
                                                <div className="text-[10px] text-white/70 mt-1 pt-1 flex items-center justify-end border-t border-white/20 select-none">
                                                    <i className="fas fa-pencil-alt mr-1.5"></i> Éditable avant envoi
                                                </div>
                                            </>
                                        )}
                                </div>
                            </div>
                        )}

                        {isProcessing && (
                            <div className="flex justify-start w-full">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* ===== CAUSERIE : THEME SELECTION ===== */}
                {labMode === 'conversation_select' && (
                    <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900">
                        <div className="max-w-2xl mx-auto">
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">🗣️</div>
                                <h2 className="text-xl font-bold text-text">Causerie guidée</h2>
                                <p className="text-sm text-text-muted mt-1">L'IA lance la conversation. Réponds librement et sois corrigé en temps réel.</p>
                            </div>
                            
                            {/* Memory Badge */}
                            {userWeaknesses.length > 0 && (
                                <div className="mb-4 flex flex-col items-center animate-fade-in-up">
                                    <div className="bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary rounded-xl px-4 py-2 inline-flex items-center gap-2">
                                        <i className="fas fa-brain text-primary"></i>
                                        <p className="text-xs text-primary dark:text-primary">
                                            L'IA se souvient de tes faiblesses précédentes et va t'aider à t'améliorer.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Timer Selection */}
                            <div className="mb-6 flex flex-col items-center animate-fade-in-up">
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wide mb-2 opacity-80 flex items-center gap-2">
                                    <i className="fas fa-stopwatch"></i> Durée de la session
                                </label>
                                <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <button onClick={() => setConvTimerMinutes(0)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${convTimerMinutes === 0 ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Infini</button>
                                    <button onClick={() => setConvTimerMinutes(3)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${convTimerMinutes === 3 ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>3 min (Sprint)</button>
                                    <button onClick={() => setConvTimerMinutes(5)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${convTimerMinutes === 5 ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>5 min</button>
                                </div>
                            </div>
                            {/* Rate-limit warning banner */}
                            {convRateLimitSeconds > 0 && (
                                <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 mb-1 animate-fade-in">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
                                        <i className="fas fa-clock text-amber-500"></i>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Quota API temporairement atteint</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400">Réessaie dans <span className="font-mono font-bold">{convRateLimitSeconds}s</span> — ou change de modèle dans les paramètres ⚙️</p>
                                    </div>
                                </div>
                            )}

                            <div className={`grid grid-cols-2 gap-3 mb-4 transition-opacity ${convRateLimitSeconds > 0 ? 'opacity-40 pointer-events-none' : ''}`}>
                                {getConversationThemes().map(theme => (
                                    <button key={theme.id} onClick={() => startConversation(theme.label, theme.label)}
                                        disabled={convRateLimitSeconds > 0}
                                        className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all hover:scale-[1.02] flex flex-col items-start gap-2 text-left group disabled:cursor-not-allowed">
                                        <span className="text-3xl group-hover:scale-110 transition-transform">{theme.emoji}</span>
                                        <div>
                                            <span className="font-semibold text-text dark:text-white text-sm block">{theme.label}</span>
                                            <span className="text-xs text-text-muted">{theme.desc}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowCustomConvModal(true)}
                                disabled={convRateLimitSeconds > 0}
                                className={`w-full bg-primary/5 dark:bg-primary/10 p-4 rounded-2xl border border-primary/20 transition-all hover:scale-[1.01] hover:shadow-md flex items-center gap-4 group disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`}>
                                <span className="text-3xl group-hover:rotate-12 transition-transform">✨</span>
                                <div className="text-left">
                                    <span className="font-bold text-primary block">Thème personnalisé</span>
                                    <span className="text-xs text-text-muted">Propose ton propre sujet de conversation</span>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== CAUSERIE : ACTIVE ===== */}
                {labMode === 'conversation_active' && (
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4 min-h-0">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold">
                                <i className="fas fa-comments"></i> {convThemeLabel}
                            </div>
                            
                            {/* Timer Display */}
                            {convTimerMinutes > 0 && (
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${convTimeLeft <= 30 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                                    <i className="fas fa-stopwatch"></i> 
                                    {Math.floor(convTimeLeft / 60)}:{(convTimeLeft % 60).toString().padStart(2, '0')}
                                </div>
                            )}

                            <button onClick={handleEndConversation}
                                className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors shadow-sm">
                                <i className="fas fa-flag-checkered mr-1"></i> Terminer
                            </button>
                        </div>
                        {isGeneratingOpener && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {convMessages.map((msg, idx) => (
                            <LabMessageBubble key={idx} msg={msg} onSpeak={speak} onPin={handlePinMessage} onSuggestionClick={handleSendConvMessage} />
                        ))}
                        {draftMessage && (
                            <div className="flex w-full justify-end animate-fade-in-up">
                                <div className={`max-w-[85%] rounded-2xl rounded-br-none px-4 py-3 shadow-sm ${listeningStatus === 'listening' ? 'bg-primary/5 border border-primary/30 text-primary' : 'bg-primary text-white flex flex-col min-w-[12rem] sm:min-w-[16rem]'}`}>
                                    {listeningStatus === 'listening'
                                        ? <div className="flex items-center gap-2"><span className="animate-pulse w-2 h-2 rounded-full bg-red-500"></span><span>{draftMessage}</span></div>
                                        : (
                                            <>
                                                <textarea 
                                                    value={draftMessage}
                                                    onChange={(e) => setDraftMessage(e.target.value)}
                                                    className="bg-transparent text-white w-full outline-none resize-none m-0 p-0 overflow-hidden leading-relaxed"
                                                    style={{ minHeight: '24px' }}
                                                    ref={(el) => {
                                                        if (el) {
                                                            el.style.height = 'auto';
                                                            el.style.height = `${el.scrollHeight}px`;
                                                        }
                                                    }}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = `${target.scrollHeight}px`;
                                                    }}
                                                />
                                                <div className="text-[10px] text-white/70 mt-1 pt-1 flex items-center justify-end border-t border-white/20 select-none">
                                                    <i className="fas fa-pencil-alt mr-1.5"></i> Éditable avant envoi
                                                </div>
                                            </>
                                        )}
                                </div>
                            </div>
                        )}
                        {isProcessing && (
                            <div className="flex justify-start w-full">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={convMessagesEndRef} />
                    </div>
                )}

                {/* ===== CAUSERIE : SUMMARY ===== */}
                {labMode === 'conversation_summary' && (
                    <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900">
                        {isGeneratingSummary ? (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                                <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <p className="text-primary font-medium animate-pulse">Analyse de ta session en cours…</p>
                                <p className="text-xs text-text-muted">Cela peut prendre quelques secondes</p>
                            </div>
                        ) : convSummary ? (
                            <div className="max-w-lg mx-auto space-y-5 animate-fade-in-up pb-10">

                                {/* Bouton pour relire la causerie */}
                                <div className="text-center">
                                    <button 
                                        onClick={() => setShowFullTranscript(!showFullTranscript)}
                                        className="text-xs font-bold text-primary hover:underline flex items-center gap-2 justify-center mx-auto bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 transition-colors"
                                    >
                                        <i className={`fas fa-${showFullTranscript ? 'eye-slash' : 'eye'}`}></i>
                                        {showFullTranscript ? "Masquer le transcript complet" : "Relire l'intégralité de la causerie"}
                                    </button>
                                </div>

                                {showFullTranscript && (
                                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 animate-fade-in space-y-3 max-h-[400px] overflow-y-auto">
                                        {convMessages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                                    msg.role === 'user' 
                                                        ? 'bg-primary text-white rounded-tr-none' 
                                                        : 'bg-background-secondary text-text rounded-tl-none border border-border/50'
                                                }`}>
                                                    <p className="leading-relaxed">{msg.content.split('|||')[0]}</p>
                                                    {msg.role === 'assistant' && msg.content.includes('|||') && (
                                                        <p className="text-[10px] opacity-60 italic border-t border-border/20 mt-1 pt-1">
                                                            {msg.content.split('|||')[1]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Score + points forts */}
                                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                                    <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Score de fluidité</p>
                                    <div className={`text-7xl font-black mb-1 ${convSummary.fluency_score >= 75 ? 'text-green-500' : convSummary.fluency_score >= 50 ? 'text-yellow-500' : 'text-orange-500'}`}>
                                        {convSummary.fluency_score > 0 ? convSummary.fluency_score : '—'}
                                    </div>
                                    <p className="text-text-muted text-sm">/ 100</p>
                                    {convSummary.strong_points.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                            {convSummary.strong_points.map((pt, i) => (
                                                <span key={i} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium">✓ {pt}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Corrections — always visible */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-orange-600">
                                        <i className="fas fa-graduation-cap"></i> Corrections
                                    </h3>
                                    {convSummary.errors.length > 0 ? (
                                        <div className="space-y-3">
                                            {convSummary.errors.map((err, i) => (
                                                <div key={i} className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border-l-4 border-orange-400">
                                                    <p className="text-sm">
                                                        <span className="line-through text-gray-400">{err.original}</span>
                                                        {' → '}
                                                        <span className="font-semibold text-orange-700 dark:text-orange-300">{err.corrected}</span>
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{err.explanation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                                            <span className="text-2xl">🎉</span>
                                            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Aucune erreur significative détectée — excellent travail !</p>
                                        </div>
                                    )}
                                </div>

                                {/* Vocabulaire clé — always visible */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-blue-600">
                                        <i className="fas fa-book-open"></i> Vocabulaire clé
                                    </h3>
                                    {convSummary.vocabulary.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {convSummary.vocabulary.map((v, i) => (
                                                <div key={i} className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-xl text-sm border border-blue-100 dark:border-blue-800">
                                                    <span className="font-bold text-blue-700 dark:text-blue-300">{v.word}</span>
                                                    <span className="text-gray-400 mx-1">·</span>
                                                    <span className="text-gray-600 dark:text-gray-400">{v.translation}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-text-muted italic">Pas de vocabulaire clé relevé pour cette session.</p>
                                    )}
                                    {convSummary.vocabulary.length > 0 && (
                                        <div className="flex flex-col gap-2 mt-4">
                                            <button
                                                onClick={() => handleStartTargetedLesson(`Je veux faire un exercice pour m'approprier ce vocabulaire : ${convSummary.vocabulary.map(v => `${v.word} (${v.translation})`).join(', ')}. Propose-moi un quiz interactif (QCM ou phrases à compléter) pour vérifier si je maîtrise ces mots.`, 'vocab_key')}
                                                className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800"
                                            >
                                                <i className="fas fa-tasks"></i> S'entraîner sur ce vocabulaire (Leçon)
                                            </button>
                                            {onLaunchAIGenerator && (
                                                <button
                                                    onClick={() => onLaunchAIGenerator(
                                                        `Mots : ${convSummary.vocabulary.map(v => v.word).join(', ')}`, 
                                                        'quiz',
                                                        `ajoute d'autres mots à ce vocabulaire dont le thème général est: ${convThemeLabel || convTheme || 'Causerie libre'}`
                                                    )}
                                                    className="w-full py-2.5 bg-primary/10 dark:bg-primary/10 hover:bg-primary/20 dark:hover:bg-primary/20 text-primary dark:text-primary rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-primary/30 dark:border-primary"
                                                >
                                                    <i className="fas fa-layer-group"></i> Quiz complet des mots avec le générateur IA
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Erreurs récurrentes (patterns) */}
                                {convSummary.error_patterns && convSummary.error_patterns.length > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-5 py-5 border border-amber-200 dark:border-amber-800">
                                        <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">⚠️ Points à travailler</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {convSummary.error_patterns.map((pattern, i) => (
                                                <span key={i} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full text-xs font-medium">{pattern}</span>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => handleStartTargetedLesson(`Je voudrais que tu m'expliques et me fasses travailler ces points faibles : ${convSummary.error_patterns.join(', ')}. Fais un exercice ciblé pour chaque point.`, 'patterns_key')}
                                            className="w-full py-2.5 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-amber-200 dark:border-amber-700"
                                        >
                                            <i className="fas fa-bolt"></i> Étudier ces points spécifiques
                                        </button>
                                    </div>
                                )}

                                {/* Plan de révision personnalisé */}
                                {convSummary.lesson_suggestions && convSummary.lesson_suggestions.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="font-bold text-text flex items-center gap-2 text-sm">
                                            <i className="fas fa-graduation-cap text-primary"></i> Plan de révision personnalisé
                                        </h3>
                                        {convSummary.lesson_suggestions.map((lesson: LessonSuggestion, i: number) => (
                                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                                {lesson.type === 'vocabulary' && (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">📚</span><h4 className="font-bold text-sm">{lesson.title}</h4></div>
                                                        {lesson.vocabulary_words && lesson.vocabulary_words.length > 0 ? (
                                                            <div className="space-y-2 mb-3">
                                                                {lesson.vocabulary_words.map((v, j) => (
                                                                    <div key={j} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-4 py-2.5">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="font-bold text-blue-700 dark:text-blue-300">{v.word}</span>
                                                                            <span className="text-gray-400">·</span>
                                                                            <span className="text-sm text-gray-600 dark:text-gray-400">{v.translation}</span>
                                                                        </div>
                                                                        {v.example && <p className="text-xs text-gray-500 italic mt-1">{v.example}</p>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <p className="text-sm text-text-muted italic mb-3">Liste de vocabulaire non disponible.</p>}
                                                        {lesson.vocabulary_words && lesson.vocabulary_words.length > 0 && (
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={() => handleStartTargetedLesson(`Je veux apprendre et réviser ce vocabulaire suggéré : ${lesson.vocabulary_words!.map(v => `${v.word} (${v.translation})`).join(', ')}. Fais-moi une leçon rapide suivie d'un quiz pour vérifier mes connaissances.`, `vocab_lesson_${i}`)}
                                                                    className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800"
                                                                >
                                                                    <i className="fas fa-graduation-cap"></i> Exercice sur ce vocabulaire (Leçon)
                                                                </button>
                                                                {onLaunchAIGenerator && (
                                                                    <button
                                                                        onClick={() => onLaunchAIGenerator(
                                                                            `Révision : ${lesson.vocabulary_words!.map(v => v.word).join(', ')}`, 
                                                                            'quiz',
                                                                            `ajoute d'autres mots à ce vocabulaire dont le thème général est: ${convThemeLabel || convTheme || 'Causerie libre'}`
                                                                        )}
                                                                        className="w-full py-2 bg-primary/10 dark:bg-primary/10 hover:bg-primary/20 dark:hover:bg-primary/20 text-primary dark:text-primary rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-primary/30 dark:border-primary"
                                                                    >
                                                                        <i className="fas fa-layer-group"></i> Quiz complet des mots avec le générateur IA
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {lesson.type === 'grammar' && lesson.grammar_focus && (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">📐</span><h4 className="font-bold text-sm">{lesson.title}</h4></div>
                                                        <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 mb-3">
                                                            <p className="text-xs font-bold text-text-muted uppercase tracking-wide mb-1">Règle</p>
                                                            <p className="text-sm font-semibold text-text">{lesson.grammar_focus.rule}</p>
                                                        </div>
                                                        <p className="text-sm text-text mb-3">{lesson.grammar_focus.explanation}</p>
                                                        {lesson.grammar_focus.example_incorrect && (
                                                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl px-4 py-3 border-l-4 border-orange-400 mb-3">
                                                                <p className="text-xs font-bold text-orange-600 mb-1">Exemple</p>
                                                                <p className="text-sm">
                                                                    <span className="line-through text-gray-400">{lesson.grammar_focus.example_incorrect}</span>
                                                                    {' → '}
                                                                    <span className="font-semibold text-green-600 dark:text-green-400">{lesson.grammar_focus.example_correct}</span>
                                                                </p>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => handleStartTargetedLesson(`Je veux comprendre parfaitement cette règle de grammaire : "${lesson.grammar_focus!.rule}". Explication originale : ${lesson.grammar_focus!.explanation}. Explique-moi cela avec 3 nouveaux exemples très clairs, puis fais-moi passer un test de compréhension là-dessus.`, `grammar_lesson_${i}`)}
                                                            className="w-full py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-gray-600"
                                                        >
                                                            <i className="fas fa-pencil-ruler"></i> Exercice sur cette règle
                                                        </button>
                                                    </>
                                                )}
                                                {lesson.type === 'scenario' && (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">🎭</span><h4 className="font-bold text-sm">{lesson.title}</h4></div>
                                                        {lesson.scenario_prompt && (
                                                            <p className="text-sm text-text-muted mb-4 bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 italic">{lesson.scenario_prompt}</p>
                                                        )}
                                                        <button
                                                            onClick={() => { if (lesson.scenario_prompt) { setLabMode('scenario_list'); setTimeout(() => startScenario(lesson.scenario_prompt!), 100); } }}
                                                            className="w-full py-2.5 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
                                                        >
                                                            <i className="fas fa-play-circle"></i> Lancer ce scénario
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Suggestion prochaine causerie */}
                                {convSummary.next_theme_suggestion && (
                                    <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-5 border border-primary/20 flex flex-col items-start gap-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-2xl pt-1">💡</span>
                                            <div>
                                                <p className="text-xs font-bold text-primary uppercase tracking-wide">Prochaine session suggérée</p>
                                                <p className="text-sm text-text font-medium mt-1 leading-snug">{convSummary.next_theme_suggestion}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (tutor) startConversation(convSummary.next_theme_suggestion!, convSummary.next_theme_suggestion!);
                                            }}
                                            className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm shadow-primary/30"
                                        >
                                            <i className="fas fa-comments"></i> Lancer cette causerie
                                        </button>
                                    </div>
                                )}
                                {/* ACTIONS - GENERATE LESSON */}
                                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <button 
                                        onClick={() => {
                                            if (remedialMessages.length === 0) handleGenerateLesson();
                                            else setShowRemedialModal(true);
                                        }} 
                                        disabled={isGeneratingLesson}
                                        className="w-full py-4 rounded-xl bg-primary/10 dark:bg-primary/30 text-primary dark:text-primary font-bold hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 border border-primary/30 dark:border-primary shadow-sm"
                                    >
                                        {isGeneratingLesson ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                                        {isGeneratingLesson ? "Création de votre leçon..." : (remedialMessages.length > 0 ? "Continuer ma leçon dynamique" : "Générer une leçon de consolidation ciblée")}
                                    </button>

                                    {onSaveConvSession && (
                                        <button
                                            onClick={() => {
                                                const session: ConversationSession = {
                                                    id: uuidv4(),
                                                    tutorId: tutor?.id || 'unknown',
                                                    tutorName: tutor?.name || 'Tuteur',
                                                    language: activeLang,
                                                    theme: convThemeLabel || convTheme || 'Causerie libre',
                                                    createdAt: new Date().toISOString(),
                                                    lastActiveAt: new Date().toISOString(),
                                                    messages: convMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                                                    summary: convSummary as any,
                                                    remedialMessages: remedialMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                                                };
                                                onSaveConvSession(session);
                                                showToast('Causerie sauvegardée dans "Mes Leçons & Programmes" !', 'success');
                                            }}
                                            className="w-full py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-2 border border-green-200 dark:border-green-800 text-sm"
                                        >
                                            <i className="fas fa-save"></i> Sauvegarder cette causerie
                                        </button>
                                    )}

                                    <div className="flex gap-3">
                                        <button onClick={() => handleExport('md')} className="flex-1 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800">
                                            <i className="fab fa-markdown"></i> Exporter
                                        </button>
                                        <button onClick={() => {
                                            setLabMode('conversation_select');
                                            setRemedialMessages([]);
                                        }} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 shadow-md">
                                            <i className="fas fa-redo"></i> Nouvelle causerie
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-text-muted">
                                <span className="text-4xl">😕</span>
                                <p className="text-sm">Le bilan n'a pas pu être généré.</p>
                                <button onClick={handleEndConversation} className="px-6 py-2 rounded-xl bg-primary text-white font-bold">Réessayer</button>
                                <button onClick={() => setLabMode('conversation_select')} className="text-sm underline">Nouvelle causerie</button>
                            </div>
                        )}
                    </div>
                )}


                {/* Custom conv topic modal */}
                {showCustomConvModal && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-scale-in">
                            <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">🗣️ Thème personnalisé</h3>
                            <textarea value={customConvTopic} onChange={(e) => setCustomConvTopic(e.target.value)}
                                placeholder="Ex: Mon dernier voyage, Les séries Netflix, Mon travail..."
                                className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl p-4 mb-4 text-text focus:ring-2 focus:ring-primary outline-none resize-none h-24" autoFocus />
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowCustomConvModal(false)} className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">Annuler</button>
                                <button onClick={() => { if (customConvTopic.trim()) { startConversation(customConvTopic, customConvTopic); setShowCustomConvModal(false); setCustomConvTopic(''); } }}
                                    disabled={!customConvTopic.trim()}
                                    className="px-6 py-2 rounded-lg bg-primary text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50">
                                    C'est parti !
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. SCENARIO LIST MODE */}
                {labMode === 'scenario_list' && (
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
                        <h2 className="text-xl font-bold mb-6 text-text dark:text-white text-center">{t('lab.scenarios.title')}</h2>
                        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
                            {/* Predefined Themes */}
                            {getScenarioThemes(t).map((theme) => (
                                <button 
                                    key={theme.id}
                                    onClick={() => startScenario(theme.prompt)}
                                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all hover:scale-[1.02] flex flex-col items-center gap-3 text-center group"
                                >
                                    <span className="text-4xl group-hover:scale-110 transition-transform">{theme.emoji}</span>
                                    <span className="font-semibold text-text dark:text-white">{theme.label}</span>
                                </button>
                            ))}

                            {/* Custom Scenario Button */}
                            <button 
                                onClick={() => setShowCustomScenarioModal(true)}
                                className="bg-primary/5 dark:bg-primary/10 p-6 rounded-2xl shadow-sm hover:shadow-md border border-primary/20 dark:border-primary/30 transition-all hover:scale-[1.02] flex flex-col items-center gap-3 text-center group col-span-2 mt-2"
                            >
                                <span className="text-4xl group-hover:rotate-12 transition-transform">✨</span>
                                <span className="font-bold text-primary">{t('lab.scenarios.create')}</span>
                                <span className="text-xs text-text-muted">{t('lab.scenarios.customDesc')}</span>
                            </button>
                        </div>
                        {isGeneratingScenario && (
                            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
                                <p className="text-lg font-medium text-primary animate-pulse">{t('lab.scenarios.preparing')}</p>
                            </div>
                        )}
                    </div>
                )}


                {/* 3. SCENARIO PLAY MODE */}
                {labMode === 'scenario_play' && (
                    <div className="flex-1 flex flex-col items-center justify-start p-6 bg-gray-50 dark:bg-gray-900 text-center overflow-y-auto pb-32">
                        {isGeneratingScenario ? (
                             <div className="flex flex-col items-center justify-center animate-fade-in space-y-6 opacity-80">
                                <div className="relative">
                                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">🎭</div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-primary mb-2">{t('lab.scenarios.preparing')}</h3>
                                    <p className="text-text-muted">{t('lab.scenarios.preparingDesc')}</p>
                                </div>
                             </div>
                        ) : activeScenario[scenarioStepIndex] ? (
                            <div className="w-full max-w-xl space-y-8 animate-fade-in-up">
                                {/* PROGRESS */}
                                <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 mb-8">
                                    <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${((scenarioStepIndex) / activeScenario.length) * 100}%` }}></div>
                                </div>

                                {/* TUTOR PART */}
                                <div className="space-y-4">
                                    <div className="relative inline-block">
                                        <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm relative">
                                            <div className="absolute -top-6 -left-4 text-4xl shadow-sm bg-white dark:bg-gray-800 rounded-full p-1">{tutor?.emoji}</div>
                                            <p className="text-lg md:text-xl font-medium text-text mb-2 leading-relaxed">
                                                "{activeScenario[scenarioStepIndex].tutorText}"
                                            </p>
                                            <p className="text-xs md:text-sm text-text-muted italic border-t pt-2 mt-2">{activeScenario[scenarioStepIndex].tutorTranslation}</p>
                                            <div className="absolute -right-4 -top-5 flex gap-2">
                                                <button 
                                                    onClick={() => speak(activeScenario[scenarioStepIndex].tutorText)} 
                                                    className="bg-primary text-white w-10 h-10 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center z-10"
                                                    title={t('lab.listen')}
                                                >
                                                    <i className="fas fa-volume-up"></i>
                                                </button>
                                                <button 
                                                    onClick={() => handlePinMessage({ 
                                                        role: 'assistant', 
                                                        content: `${activeScenario[scenarioStepIndex].tutorText} ||| ${activeScenario[scenarioStepIndex].tutorTranslation}` 
                                                    })}
                                                    className="bg-white text-green-600 border-2 border-green-100 w-10 h-10 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center hover:bg-green-50 z-10"
                                                    title={t('lab.createFlashcard')}
                                                >
                                                    <i className="fas fa-plus text-lg"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ARROW */}
                                <div className="text-gray-300 dark:text-gray-600">
                                    <i className="fas fa-arrow-down text-2xl animate-bounce"></i>
                                </div>

                                {/* USER GOAL */}
                                <div className={`relative p-6 rounded-2xl border-2 transition-all ${
                                    scenarioFeedback === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 
                                    scenarioFeedback === 'retry' ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' :
                                    'border-primary/30 bg-primary/5'
                                }`}>
                                    <h3 className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-text-muted mb-2">{t('lab.scenarios.userGoal')}</h3>
                                    <p className="text-xl md:text-2xl font-bold text-primary mb-2">
                                        "{activeScenario[scenarioStepIndex].userTarget}"
                                    </p>
                                    <p className="text-xs md:text-sm text-text-muted italic">({activeScenario[scenarioStepIndex].userTargetTranslation})</p>

                                    {/* FEEDBACK OVERLAY */}
                                    {scenarioFeedback === 'success' && (
                                        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center rounded-xl animate-scale-in">
                                            <div className="text-green-600 font-bold text-xl flex flex-col items-center gap-2">
                                                <i className="fas fa-check-circle text-5xl"></i>
                                                {t('lab.scenarios.success')}
                                            </div>
                                        </div>
                                    )}
                                    {scenarioFeedback === 'retry' && (
                                        <div className="mt-3 text-orange-600 text-sm font-medium animate-shake">
                                            <i className="fas fa-exclamation-triangle mr-1"></i> {t('lab.scenarios.retry')}
                                        </div>
                                    )}
                                </div>

                                {/* DRAFT PREVIEW IN SCENARIO MODE */}
                                {draftMessage && (
                                     <div className="text-lg font-medium text-gray-500 min-h-[30px] animate-pulse">
                                        "{draftMessage}..."
                                     </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-4">{t('lab.scenarios.finished')}</h3>
                                <button onClick={() => setLabMode('scenario_list')} className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition-transform">{t('lab.scenarios.chooseAnother')}</button>
                            </div>
                        )}
                    </div>
                )}

                {labMode === 'study' && (
                    <div className="flex-1 flex flex-col p-6 overflow-hidden bg-gray-50 dark:bg-gray-900 gap-4">
                        {/* 1. MEDIA PLAYER */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm animate-fade-in-up border border-gray-100 dark:border-gray-700">
                             {!studyAudioSrc ? (
                                <label className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <i className="fas fa-music text-primary text-xl"></i>
                                    </div>
                                    <span className="text-gray-600 dark:text-gray-300 font-medium">{t('lab.study.import')}</span>
                                    <span className="text-xs text-gray-400 mt-1">{t('lab.study.formats')}</span>
                                    <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                                </label>
                            ) : (
                                <div className="flex flex-col gap-4">
                                     <audio ref={audioRef} src={studyAudioSrc} controls className="w-full h-10" />
                                     <div className="flex justify-between items-center text-sm px-1">
                                         <div className="flex items-center gap-2">
                                             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('lab.study.vitesse')}</span>
                                             {[0.5, 0.75, 1, 1.25].map(rate => (
                                                 <button 
                                                    key={rate} 
                                                    onClick={() => { if(audioRef.current) { audioRef.current.playbackRate = rate; setStudyPlaybackRate(rate); } }}
                                                    className={`px-2 py-1 rounded text-xs font-bold transition-all ${studyPlaybackRate === rate ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'}`}
                                                 >
                                                    x{rate}
                                                 </button>
                                             ))}
                                         </div>
                                         <button onClick={() => { setStudyAudioSrc(null); setStudyPlaybackRate(1); }} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors text-xs font-medium"><i className="fas fa-trash mr-1"></i> {t('lab.study.change')}</button>
                                     </div>
                                     
                                     {/* SHADOWING RECORDER */}
                                     {studyAudioSrc && (
                                         <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                             <div className="flex flex-col">
                                                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                                     <i className="fas fa-microphone-alt"></i> {t('lab.study.shadowing')}
                                                 </span>
                                                 <span className="text-[10px] text-gray-400">{t('lab.study.shadowingDesc')}</span>
                                             </div>
                                             
                                             <div className="flex items-center gap-3">
                                                {/* Playback User Audio */}
                                                {shadowAudioSrc && !isRecordingShadow && (
                                                    <audio src={shadowAudioSrc} controls className="h-8 w-40" />
                                                )}

                                                {/* RECORD BUTTON */}
                                                <button 
                                                     onClick={isRecordingShadow ? stopShadowRecording : startShadowRecording}
                                                     className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                                                         isRecordingShadow 
                                                             ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' 
                                                             : 'bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                                     }`}
                                                     title={isRecordingShadow ? t('lab.study.stop') : t('lab.study.record')}
                                                >
                                                    <i className={`fas fa-${isRecordingShadow ? 'stop' : 'microphone'}`}></i>
                                                </button>
                                             </div>
                                         </div>
                                     )}
                                </div>
                            )}
                        </div>

                        {/* 2. SCRIPT EDITOR */}
                        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col animate-fade-in-up delay-100 border border-gray-100 dark:border-gray-700 relative">
                            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
                                <h3 className="font-bold flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><i className="fas fa-align-left text-primary"></i> {t('lab.study.script')}</h3>
                                <button 
                                    onClick={handleAnalyzeScript}
                                    disabled={isAnalyzingScript || !studyScript.trim()}
                                    className={`text-xs font-medium px-2 py-1 rounded border transition-all flex items-center gap-1 ${
                                        isAnalyzingScript 
                                            ? 'bg-gray-100 text-gray-400 border-gray-200' 
                                            : 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                    }`}
                                >
                                    {isAnalyzingScript ? (
                                        <><i className="fas fa-spinner fa-spin"></i> {t('lab.study.analysing')}</>
                                    ) : (
                                        <><i className="fas fa-magic"></i> {t('lab.study.aiAnalyse')}</>
                                    )}
                                </button>
                            </div>
                            <textarea 
                                className="flex-1 p-4 resize-none focus:outline-none bg-transparent text-base leading-relaxed font-sans"
                                placeholder={t('lab.study.placeholder')}
                                value={studyScript}
                                onChange={(e) => setStudyScript(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* --- PRONUNCIATION COACH MODE --- */}
                {labMode === 'pronunciation' && (
                    <div className="flex-1 flex flex-col p-4 overflow-hidden relative bg-gray-50 dark:bg-gray-900">
                        {!pronunciationChallenges.length ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-5xl shadow-lg mb-4 text-white">
                                    🎙️
                                </div>
                                <h2 className="text-2xl font-bold">Coach de Prononciation</h2>
                                <p className="text-gray-600 dark:text-gray-300 max-w-md">
                                    L'IA va générer des phrases ciblées pour travailler votre accent en {t('languages.' + (activeLang.includes('-') ? activeLang.split('-')[0] : activeLang)) || (activeLang.includes('-') ? activeLang.split('-')[0].toUpperCase() : activeLang.toUpperCase())}.
                                </p>
                                <button 
                                    onClick={() => generatePronunciationChallenges('challenges')}
                                    disabled={isGeneratingChallenges}
                                    className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl shadow-lg font-bold text-lg hover:opacity-90 transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                >
                                    {isGeneratingChallenges ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-random"></i>}
                                    {isGeneratingChallenges ? "Génération..." : "10 Défis Aléatoires"}
                                </button>

                                
                                {!showTopicInput ? (
                                    <button 
                                        onClick={() => setShowTopicInput(true)}
                                        className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl shadow-lg font-bold text-lg hover:opacity-90 transition-transform hover:scale-105 flex items-center justify-center gap-3"
                                    >
                                        <i className="fas fa-comments"></i> Dialogue (Roleplay)
                                    </button>
                                ) : (
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col gap-3 border border-primary/30 animate-fade-in-up w-full sm:w-80">
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sujet du dialogue (optionnel) :</label>
                                        <input 
                                            type="text" 
                                            value={dialogueTopic}
                                            onChange={(e) => setDialogueTopic(e.target.value)}
                                            placeholder="Ex: Au restaurant, Entretien..."
                                            className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-gray-50 dark:bg-gray-700"
                                        />
                                        
                                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-2">Niveau :</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setDialogueLevel('beginner')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                                                    dialogueLevel === 'beginner' 
                                                        ? 'bg-green-500 text-white' 
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                                }`}
                                            >
                                                🌱 Débutant
                                            </button>
                                            <button
                                                onClick={() => setDialogueLevel('intermediate')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                                                    dialogueLevel === 'intermediate' 
                                                        ? 'bg-blue-500 text-white' 
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                                }`}
                                            >
                                                📚 Intermédiaire
                                            </button>
                                            <button
                                                onClick={() => setDialogueLevel('advanced')}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                                                    dialogueLevel === 'advanced' 
                                                        ? 'bg-primary text-white' 
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                                }`}
                                            >
                                                🎓 Avancé
                                            </button>
                                        </div>
                                        
                                        <div className="flex gap-2 mt-2">
                                            <button 
                                                onClick={() => setShowTopicInput(false)}
                                                className="flex-1 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-bold"
                                            >
                                                Annuler
                                            </button>
                                            <button 
                                                onClick={() => generatePronunciationChallenges('dialogue')}
                                                disabled={isGeneratingChallenges}
                                                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:hover:bg-primary/90 transition-colors"
                                            >
                                                {isGeneratingChallenges ? <i className="fas fa-spinner fa-spin"></i> : "Générer"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                             <div className="flex-1 flex flex-col items-center justify-start space-y-6 pt-2 max-w-2xl mx-auto w-full overflow-y-auto min-h-0 px-2 pb-10">
                                {/* PROGRESS */}
                                <div className="w-full flex justify-between items-center text-sm text-gray-500 px-2">
                                    <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-mono">
                                        {pronunciationType === 'challenges' ? `Défi ${currentChallengeIndex + 1} / ${pronunciationChallenges.length}` : `Réplique ${currentChallengeIndex + 1} / ${pronunciationChallenges.length}`}
                                    </span>
                                    <button onClick={() => setPronunciationChallenges([])} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fas fa-times mr-1"></i> Quitter</button>
                                </div>

                                {/* CARD */}
                                <div className={`bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl w-full border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-all ${pronunciationResult?.score && pronunciationResult.score > 80 ? 'ring-2 ring-green-400' : ''}`}>
                                    {pronunciationType === 'challenges' && (
                                        <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-xs font-bold uppercase tracking-wider ${
                                            pronunciationChallenges[currentChallengeIndex].difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                            pronunciationChallenges[currentChallengeIndex].difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {pronunciationChallenges[currentChallengeIndex].difficulty}
                                        </div>
                                    )}

                                    {pronunciationType === 'dialogue' && (
                                        <div className="absolute top-0 left-0 px-4 py-2 rounded-br-2xl text-xs font-bold bg-primary/20 text-primary uppercase tracking-wider">
                                            {pronunciationChallenges[currentChallengeIndex].speaker === 'A' ? 'Personnage A' : 'Personnage B'}
                                        </div>
                                    )}

                                    <div className="mb-6 mt-4">
                                        {pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai' && (
                                              <p className="text-center text-xs text-gray-400 mb-2 uppercase tracking-widest"><i className="fas fa-headphones mr-1"></i> Écoutez l'interlocuteur</p>
                                        )}
                                         {pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'user' && (
                                              <p className="text-center text-xs text-primary mb-2 uppercase tracking-widest"><i className="fas fa-microphone mr-1"></i> À votre tour</p>
                                        )}

                                        <h3 className={`text-3xl font-bold text-center mb-4 leading-tight py-2 ${pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai' ? 'text-gray-500 italic' : 'text-text dark:text-gray-100'}`}>
                                            {pronunciationChallenges[currentChallengeIndex].text}
                                        </h3>
                                        
                                        {pronunciationChallenges[currentChallengeIndex].phonetic && (
                                            <p className="text-center text-gray-400 font-mono text-lg opacity-70">/{pronunciationChallenges[currentChallengeIndex].phonetic}/</p>
                                        )}
                                        {pronunciationChallenges[currentChallengeIndex].translation && (
                                            <p className="text-center text-sm text-gray-400 italic mt-2 border-t border-gray-100 dark:border-gray-700 pt-2 mx-10">{pronunciationChallenges[currentChallengeIndex].translation}</p>
                                        )}
                                    </div>

                                    {pronunciationChallenges[currentChallengeIndex].focus && (
                                        <div className="bg-blue-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 border border-blue-100 dark:border-gray-600">
                                            <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-300 mb-1">
                                                <i className="fas fa-info-circle"></i> Conseil
                                            </h4>
                                            <p className="text-gray-700 dark:text-gray-300 italic text-sm">
                                                {pronunciationChallenges[currentChallengeIndex].focus}
                                            </p>
                                        </div>
                                    )}

                                     {/* ACTIONS */}
                                    <div className="flex justify-center gap-6">
                                        <button 
                                            onClick={() => speak(pronunciationChallenges[currentChallengeIndex].text)}
                                            className="w-14 h-14 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shadow-sm"
                                            title="Écouter le modèle"
                                        >
                                            <i className="fas fa-volume-up text-xl"></i>
                                        </button>
                                        
                                        {/* Auto-advance for AI lines in Dialogue */}
                                        {pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai' && (
                                             <button 
                                                onClick={() => {
                                                     if (currentChallengeIndex < pronunciationChallenges.length - 1) {
                                                        setCurrentChallengeIndex(prev => prev + 1);
                                                    }
                                                }}
                                                className="w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors shadow-sm animate-pulse"
                                                title="Continuer"
                                            >
                                                <i className="fas fa-arrow-right text-xl"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* RECORDING AREA (Hidden for AI turns in dialogue) */}
                                {!(pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai') && (
                                <div className="flex flex-col items-center justify-center space-y-4 w-full">
                                    {pronunciationResult ? (
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 w-full animate-fade-in-up text-center">
                                            <div className="text-4xl mb-2">{pronunciationResult.feedback.includes('Excellent') || pronunciationResult.score > 80 ? '🌟' : pronunciationResult.score > 50 ? '👍' : '🤔'}</div>
                                            <div className={`text-2xl font-bold mb-1 ${
                                                pronunciationResult.score > 80 ? 'text-green-500' : 
                                                pronunciationResult.score > 50 ? 'text-yellow-500' : 'text-orange-500'
                                            }`}>
                                                {pronunciationResult.score}% - {pronunciationResult.feedback}
                                            </div>
                                            <p className="text-gray-400 text-sm mb-4">Vous avez dit : "{transcript}"</p>
                                            
                                            <div className="flex justify-center gap-4">
                                                <button 
                                                    onClick={() => {
                                                        setPronunciationResult(null);
                                                        resetTranscript();
                                                        // Auto-start will trigger via useEffect
                                                    }}
                                                    className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <i className="fas fa-redo mr-2"></i> Réessayer
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setPronunciationResult(null);
                                                        resetTranscript();
                                                        if (currentChallengeIndex < pronunciationChallenges.length - 1) {
                                                            setCurrentChallengeIndex(prev => prev + 1);
                                                        } else {
                                                            // End of session
                                                            setPronunciationChallenges([]);
                                                        }
                                                    }}
                                                    className="px-6 py-2 rounded-lg bg-primary text-white font-bold shadow hover:bg-primary-dark transition-colors"
                                                >
                                                    Suivant <i className="fas fa-arrow-right ml-2"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <button
                                                onClick={listeningStatus === 'listening' ? stopListening : startListening}
                                                className={`w-24 h-24 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 mb-4 ${
                                                    listeningStatus === 'listening' 
                                                        ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                                                    : 'bg-primary text-white'
                                                }`}
                                            >
                                                <i className={`fas fa-${listeningStatus === 'listening' ? 'stop' : 'microphone'} text-4xl`}></i>
                                            </button>
                                            <p className="text-gray-500 text-sm animate-pulse">
                                                {listeningStatus === 'listening' ? "J'écoute..." : "Appuyez pour parler"}
                                            </p>
                                            {transcript && <p className="mt-4 text-gray-400 text-sm italic max-w-md text-center">"{transcript}"</p>}
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* CONTROLS (Chat, Causerie & Scenario Only) */}
            {labMode !== 'study' && labMode !== 'pronunciation' && labMode !== 'conversation_select' && labMode !== 'conversation_summary' && labMode !== 'vocabulary' && (
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 safe-area-bottom">
                <div className="flex items-center gap-3 max-w-3xl mx-auto">
                    {/* Toggle Input Mode (Chat only) */}
                    {labMode === 'chat' && (
                        <button 
                            onClick={() => setInputMode(prev => prev === 'voice' ? 'text' : 'voice')}
                            className="p-3 text-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <i className={`fas fa-${inputMode === 'voice' ? 'keyboard' : 'microphone'}`}></i>
                        </button>
                    )}

                    {/* TEXT INPUT (Chat Only) */}
                    {labMode === 'chat' && inputMode === 'text' ? (
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(textInput); }} className="flex-1 flex gap-2">
                            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder={t('lab.chat.writeMessage')} className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-full px-4 focus:ring-2 focus:ring-primary outline-none" autoFocus />
                            <button type="submit" disabled={!textInput.trim() || isProcessing} className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-50"><i className="fas fa-paper-plane text-sm"></i></button>
                        </form>
                    ) : (
                        // VOICE CONTROLS (Common)
                        <div className="flex-1 flex justify-center items-center gap-8">
                             {/* Trash (Chat & Scenario modes) */}
                            <button
                                onClick={handleReset}
                                disabled={(!draftMessage && !transcript) || listeningStatus === 'listening'}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                    (!draftMessage && !transcript) || listeningStatus === 'listening'
                                        ? 'opacity-30 cursor-not-allowed'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-500'
                                }`}
                                title={t('common.delete')}
                            >
                                <i className="fas fa-trash-alt"></i>
                            </button>

                            {/* Mic */}
                            <button
                                onClick={handleMicClick}
                                className={`w-20 h-20 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-105 ${
                                    listeningStatus === 'listening'
                                        ? 'bg-red-500 text-white animate-pulse'
                                    : 'bg-gradient-to-br from-primary to-blue-600 text-white'
                                }`}
                                title={listeningStatus === 'listening' ? t('lab.study.stop') : t('lab.chat.placeholder')}
                            >
                                <i className={`fas fa-${listeningStatus === 'listening' ? 'stop' : 'microphone'} text-3xl`}></i>
                            </button>

                            {/* Send (Different action based on mode) */}
                            <button 
                                onClick={() => labMode === 'scenario_play' ? handleScenarioUserResponse(draftMessage) : labMode === 'conversation_active' ? handleSendConvMessage(draftMessage) : handleSendMessage(draftMessage)} 
                                disabled={!draftMessage || listeningStatus === 'listening'} 
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform ${!draftMessage || listeningStatus === 'listening' ? 'opacity-30 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:scale-110'}`}
                                title={t('common.save')}
                            >
                                <i className="fas fa-paper-plane text-lg"></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            )}

            {/* --- MODAL DE LEÇON INTERACTIVE --- */}
            {showRemedialModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-3xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-primary/30 dark:border-primary">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-primary/10 dark:bg-primary/30">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setShowRemedialModal(false)}
                                    className="text-primary dark:text-primary hover:text-primary dark:hover:text-primary/80 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-white dark:bg-gray-800/50 px-3 py-2 rounded-xl border border-primary/30 dark:border-primary shadow-sm"
                                >
                                    <i className="fas fa-chevron-left text-[10px]"></i> 
                                    <span>Retour</span>
                                </button>
                                <h3 className="font-bold text-lg text-primary dark:text-primary m-0 p-0 hidden sm:flex items-center gap-2">
                                    <i className="fas fa-book-reader"></i> Leçon interactive : {tutor?.name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {onSaveConvSession && (
                                    <button
                                        onClick={() => {
                                            const session: ConversationSession = {
                                                id: uuidv4(),
                                                tutorId: tutor?.id || 'unknown',
                                                tutorName: tutor?.name || 'Tuteur',
                                                language: activeLang,
                                                theme: convThemeLabel || convTheme || 'Causerie libre',
                                                createdAt: new Date().toISOString(),
                                                lastActiveAt: new Date().toISOString(),
                                                messages: convMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                                                summary: convSummary as any,
                                                remedialMessages: remedialMessages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
                                            };
                                            onSaveConvSession(session);
                                            showToast('Causerie + leçon sauvegardées !', 'success');
                                        }}
                                        title="Sauvegarder la causerie et la leçon"
                                        className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-sm font-bold flex items-center gap-1.5"
                                    >
                                        <i className="fas fa-save"></i> <span className="hidden sm:inline">Sauvegarder</span>
                                    </button>
                                )}
                                <button onClick={() => setShowRemedialModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        
                        {/* Chat Scroll Area — key=remedialKey force le remontage de ReactMarkdown à chaque nouvelle leçon */}
                        <div key={remedialKey} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-gray-50/50 dark:bg-gray-900/50">
                            {remedialMessages.map((msg, i) => (
                                <div key={`${remedialKey}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-4 sm:p-5 text-sm sm:text-base ${msg.role === 'user' ? 'bg-primary text-white rounded-2xl rounded-tr-sm max-w-[85%]' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl rounded-tl-sm text-text max-w-none w-full remedial-md'}`}>
                                        {msg.role === 'user'
                                            ? <span>{msg.content}</span>
                                            : <InteractiveMessageRenderer content={msg.content} />
                                        }
                                    </div>
                                </div>
                            ))}
                            {isSendingRemedial && (
                                <div className="flex justify-start">
                                    <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-tl-sm w-16 flex justify-center">
                                        <i className="fas fa-circle-notch fa-spin text-primary text-lg"></i>
                                    </div>
                                </div>
                            )}
                            <div id="remedial-box-end" />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex gap-2 items-end max-w-4xl mx-auto relative">
                                <textarea
                                    value={remedialDraft}
                                    onChange={(e) => setRemedialDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendRemedialMessage();
                                        }
                                    }}
                                    className="flex-1 resize-none bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base text-text border border-transparent shadow-inner"
                                    placeholder="Demander plus d'exemples, répondre au quiz..."
                                    rows={remedialDraft.split('\n').length > 1 ? Math.min(remedialDraft.split('\n').length, 4) : 1}
                                />
                                <button
                                    onClick={handleSendRemedialMessage}
                                    disabled={!remedialDraft.trim() || isSendingRemedial}
                                    className="absolute right-2 bottom-2 bg-primary text-white rounded-xl w-10 h-10 flex items-center justify-center disabled:opacity-50 hover:hover:bg-primary/90 hover:scale-105 transition-all shadow-md"
                                >
                                    <i className="fas fa-paper-plane text-sm"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
