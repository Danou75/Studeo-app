import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { executeAIRequest, resolveConfig, ChatMessage } from '../services/conversationService';
import { Flashcard, FlashcardClassic, SavedVocabList } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../contexts/ToastContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VocabWord {
    word: string;
    translation: string;
    example?: string;
    phonetic?: string;
}

interface VocabExpression {
    expression: string;
    translation: string;
    example?: string;
}

export interface VocabExercise {
    type: 'quiz' | 'fill-in' | 'translation' | 'matching';
    question?: string;
    options?: string[];
    answer: string;
    sentence?: string;
    pairs?: { left: string; right: string }[];
    targetLanguage?: string;
}

interface VocabData {
    theme: string;
    targetLanguage: string;
    words: VocabWord[];
    expressions: VocabExpression[];
    exercises: VocabExercise[];
    relatedThemes?: {
        versions: string[];
        connectedThemes: string[];
    };
}

interface ExerciseState {
    userAnswer: string;
    revealed: boolean;
    correct?: boolean;
    selectedOption?: string;
    matchingAnswers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Predefined themes
// ---------------------------------------------------------------------------

const PREDEFINED_THEMES = [
    { label: 'Voyage', emoji: '✈️' },
    { label: 'Commerce', emoji: '🛒' },
    { label: 'Rencontres', emoji: '🤝' },
    { label: 'Demander son chemin', emoji: '🗺️' },
    { label: 'Au restaurant', emoji: '🍽️' },
    { label: 'À l\'hôtel', emoji: '🏨' },
    { label: 'Portrait physique et moral', emoji: '🪞' },
    { label: 'Corps et santé', emoji: '🏥' },
    { label: 'Caractère', emoji: '🎭' },
    { label: 'Sentiments et vie affective', emoji: '❤️' },
    { label: 'Goûts', emoji: '🌟' },
    { label: 'Professions', emoji: '💼' },
    { label: 'Monde du travail', emoji: '🏢' },
    { label: 'Politesse et relations formelles', emoji: '🎩' },
    { label: 'Nourriture et cuisine', emoji: '🍳' },
    { label: 'Loisirs', emoji: '🎮' },
    { label: 'Communication', emoji: '📱' },
    { label: 'Achats', emoji: '🛍️' },
    { label: 'Vêtements', emoji: '👗' },
    { label: 'Magasins', emoji: '🏪' },
    { label: 'Moyens de transport', emoji: '🚗' },
    { label: 'Art', emoji: '🎨' },
    { label: 'Culture', emoji: '🏛️' },
    { label: 'Cinéma', emoji: '🎬' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildSystemPrompt = (targetLanguage: string) => `
Tu es un assistant pédagogique expert en génération de vocabulaire thématique pour l'apprentissage des langues.
Langue cible : ${targetLanguage}.

RÈGLES ABSOLUES :
1. Retourne UNIQUEMENT un objet JSON valide, sans markdown ni texte autour.
2. Le vocabulaire doit être adapté au thème demandé.
3. Propose des mots variés : synonymes, antonymes, expressions idiomatiques.
4. Les exemples doivent être des phrases complètes.
5. Les exercices doivent être interactifs et pédagogiques.
6. TRÈS IMPORTANT — Règle des articles (selon la nature grammaticale du mot) :
   - NOMS (substantifs) : TOUJOURS précédés de leur article défini pour indiquer le genre (ex: "il negozio", "la porta", "lo scontrino" en italien ; "el libro", "la mesa" en espagnol).
   - VERBES : JAMAIS d'article. Les verbes s'écrivent à l'infinitif seul, sans article (ex: "stare", "bere", "parlare" en italien — PAS "il stare", "il bere").
   - ADJECTIFS : JAMAIS d'article. Les adjectifs s'écrivent seuls, sans article.

FORMAT JSON STRICT :
{
  "theme": "Nom du thème",
  "targetLanguage": "${targetLanguage}",
  "words": [
    { "word": "(NOM→ article+mot ex:'il libro') (VERBE→ infinitif seul ex:'leggere') en ${targetLanguage}", "translation": "traduction (avec article si nom, sans si verbe/adjectif)", "example": "phrase d'exemple en ${targetLanguage}", "phonetic": "phonétique optionnelle" }
  ],
  "expressions": [
    { "expression": "expression en ${targetLanguage}", "translation": "traduction", "example": "phrase d'exemple" }
  ],
  "exercises": [
    { "type": "quiz", "question": "Question ?", "options": ["option1", "option2", "option3", "option4"], "answer": "réponse correcte (une des options)" },
    { "type": "fill-in", "sentence": "Phrase avec _____ à compléter.", "answer": "le mot manquant" },
    { "type": "translation", "sentence": "Phrase en français à traduire", "targetLanguage": "${targetLanguage}", "answer": "traduction correcte en ${targetLanguage}" },
    { "type": "matching", "question": "Associez chaque mot à sa définition", "pairs": [{"left": "mot", "right": "définition/traduction"}], "answer": "matching" }
  ],
  "relatedThemes": {
    "versions": ["Variante 1 du thème", "Variante 2"],
    "connectedThemes": ["Thème connexe 1", "Thème connexe 2"]
  }
}

Génère au minimum : 12 mots, 6 expressions, 3 quiz, 2 fill-in, 1 translation, 1 matching.
`;

const buildUserPrompt = (theme: string, options?: {
    moreWords?: boolean;
    moreExpressions?: boolean;
    moreExercises?: boolean;
    difficulty?: string;
    subTheme?: string;
    existingWords?: string[];
    existingExpressions?: string[];
}) => {
    if (options?.moreWords) {
        const excluded = options.existingWords && options.existingWords.length > 0
            ? `\n\nMOTS DÉJÀ PRÉSENTS (à exclure absolument, ne génère AUCUN doublon ni variante avec article) :\n${options.existingWords.join(', ')}`
            : '';
        return `Génère EXACTEMENT 10 mots nouveaux pour le thème "${theme}". Pas plus, pas moins.${excluded}\n\nRÈGLE CRITIQUE sur les articles :\n- Si le mot est un NOM (substantif) : inclure obligatoirement l'article défini pour indiquer le genre (ex: "il negozio", "la porta", "el libro", "the house").\n- Si le mot est un VERBE : écrire l'infinitif SEUL, sans aucun article (ex: "stare", "bere", "hablar", "to run" sans "il"/"le"/"el" devant).\n- Si le mot est un ADJECTIF : écrire l'adjectif seul, sans article.\n\nRetourne UNIQUEMENT un objet JSON avec ce format :\n{"words": [{"word": "mot (avec article si nom, sans article si verbe/adjectif)", "translation": "traduction (avec article si nom, sans si verbe/adjectif)", "example": "..."}]}`;
    }
    if (options?.moreExpressions) {
        const excluded = options.existingExpressions && options.existingExpressions.length > 0
            ? `\n\nEXPRESSIONS DÉJÀ PRÉSENTES (à exclure absolument) :\n${options.existingExpressions.join(', ')}`
            : '';
        return `Génère EXACTEMENT 5 expressions nouvelles pour le thème "${theme}". Pas plus, pas moins.${excluded}\n\nRetourne UNIQUEMENT un objet JSON avec ce format :\n{"expressions": [{"expression": "...", "translation": "...", "example": "..."}]}`;
    }
    if (options?.moreExercises) {
        return `Génère EXACTEMENT 5 exercices variés supplémentaires pour le thème "${theme}". Pas plus, pas moins.\n\nRetourne UNIQUEMENT un objet JSON avec ce format :\n{"exercises": [{"type": "quiz|fill-in|translation|matching", "question": "...", "options": [...], "answer": "..."}]}`;
    }
    if (options?.subTheme) return `Génère du vocabulaire et des exercices pour "${options.subTheme}" (sous-thème de "${theme}").`;
    const level = options?.difficulty || 'intermédiaire';
    return `Génère une liste complète de vocabulaire et d'exercices pour le thème : "${theme}". Niveau : ${level}. Inclus des synonymes, antonymes et expressions idiomatiques. RÈGLE CRITIQUE sur les articles : les articles (il/la/lo, el/la, the, etc.) doivent être placés UNIQUEMENT devant les noms communs (substantifs). Les verbes s'écrivent à l'infinitif seul SANS article (ex: "stare", "bere", "parlare" — jamais "il stare", "il bere"). Les adjectifs s'écrivent également sans article.`;
};

// ---------------------------------------------------------------------------
// Sub-component: ExerciseCard
// ---------------------------------------------------------------------------

export const ExerciseCard: React.FC<{
    exercise: VocabExercise;
    index: number;
}> = ({ exercise, index }) => {
    const [state, setState] = useState<ExerciseState>({ userAnswer: '', revealed: false, matchingAnswers: {} });

    const handleReveal = () => setState(s => ({ ...s, revealed: true }));

    const handleOptionClick = (opt: string) => {
        if (state.revealed) return;
        const correct = opt.toLowerCase().trim() === exercise.answer.toLowerCase().trim();
        setState(s => ({ ...s, selectedOption: opt, revealed: true, correct }));
    };

    const handleSubmitFillIn = () => {
        const correct = state.userAnswer.toLowerCase().trim() === exercise.answer.toLowerCase().trim();
        setState(s => ({ ...s, revealed: true, correct }));
    };

    const typeColors: Record<string, string> = {
        'quiz': 'from-primary to-primary/80',
        'fill-in': 'from-blue-500 to-cyan-600',
        'translation': 'from-emerald-500 to-teal-600',
        'matching': 'from-orange-500 to-amber-600',
    };
    const typeEmojis: Record<string, string> = {
        'quiz': '🧠', 'fill-in': '✏️', 'translation': '🌐', 'matching': '🔗',
    };
    const typeLabels: Record<string, string> = {
        'quiz': 'QCM', 'fill-in': 'Texte à trous', 'translation': 'Traduction', 'matching': 'Association',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className={`bg-gradient-to-r ${typeColors[exercise.type] || 'from-gray-500 to-gray-600'} px-4 py-2 flex items-center gap-2`}>
                <span className="text-lg">{typeEmojis[exercise.type]}</span>
                <span className="text-white text-xs font-bold uppercase tracking-wider">{typeLabels[exercise.type]}</span>
                <span className="ml-auto text-white/60 text-xs">#{index + 1}</span>
            </div>

            <div className="p-4 space-y-3">
                {/* Quiz */}
                {exercise.type === 'quiz' && (
                    <>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{exercise.question}</p>
                        <div className="grid grid-cols-1 gap-2">
                            {exercise.options?.map((opt, i) => {
                                const isSelected = state.selectedOption === opt;
                                const isCorrect = opt.toLowerCase().trim() === exercise.answer.toLowerCase().trim();
                                let cls = 'px-3 py-2 rounded-xl border text-sm font-medium transition-all text-left w-full ';
                                if (!state.revealed) {
                                    cls += 'border-gray-200 dark:border-gray-600 hover:border-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 text-gray-700 dark:text-gray-200 cursor-pointer';
                                } else if (isCorrect) {
                                    cls += 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
                                } else if (isSelected) {
                                    cls += 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';
                                } else {
                                    cls += 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 opacity-50';
                                }
                                return (
                                    <button key={i} className={cls} onClick={() => handleOptionClick(opt)} disabled={state.revealed}>
                                        <span className="mr-2 opacity-50">{String.fromCharCode(65 + i)}.</span>{opt}
                                        {state.revealed && isCorrect && <span className="float-right">✅</span>}
                                        {state.revealed && isSelected && !isCorrect && <span className="float-right">❌</span>}
                                    </button>
                                );
                            })}
                        </div>
                        {state.revealed && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                Réponse : <strong className="text-emerald-600 dark:text-emerald-400">{exercise.answer}</strong>
                            </div>
                        )}
                    </>
                )}

                {/* Fill-in */}
                {exercise.type === 'fill-in' && (
                    <>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{exercise.sentence?.replace('_____', '_____ ')}</p>
                        {!state.revealed ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={state.userAnswer}
                                    onChange={e => setState(s => ({ ...s, userAnswer: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleSubmitFillIn()}
                                    placeholder="Votre réponse..."
                                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:border-blue-400 text-gray-800 dark:text-gray-100"
                                />
                                <button
                                    onClick={handleSubmitFillIn}
                                    className="flex-shrink-0 whitespace-nowrap px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
                                >
                                    Valider
                                </button>
                            </div>
                        ) : (
                            <div className={`px-3 py-2 rounded-xl text-sm font-medium ${state.correct ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'}`}>
                                {state.correct ? '✅ Correct !' : <>❌ Ta réponse : « {state.userAnswer} » — Réponse : <strong>{exercise.answer}</strong></>}
                            </div>
                        )}
                    </>
                )}

                {/* Translation */}
                {exercise.type === 'translation' && (
                    <>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                            🇫🇷 <em>"{exercise.sentence}"</em>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Traduisez en {exercise.targetLanguage || 'la langue cible'}</p>
                        {!state.revealed ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={state.userAnswer}
                                    onChange={e => setState(s => ({ ...s, userAnswer: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && setState(s => ({ ...s, revealed: true }))}
                                    placeholder="Votre traduction..."
                                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:border-emerald-400 text-gray-800 dark:text-gray-100"
                                />
                                <button
                                    onClick={handleReveal}
                                    className="flex-shrink-0 whitespace-nowrap px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
                                >
                                    Voir
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {state.userAnswer && (
                                    <div className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm border border-blue-200 dark:border-blue-700">
                                        Votre réponse : « {state.userAnswer} »
                                    </div>
                                )}
                                <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm border border-emerald-200 dark:border-emerald-700">
                                    ✅ Réponse suggérée : <strong>{exercise.answer}</strong>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Matching */}
                {exercise.type === 'matching' && exercise.pairs && (
                    <>
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm mb-2">{exercise.question || 'Associez chaque mot à sa définition'}</p>
                        <div className="space-y-2">
                            {exercise.pairs.map((pair, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="flex-1 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium border border-orange-200 dark:border-orange-700 text-center">
                                        {pair.left}
                                    </span>
                                    <i className="fas fa-arrow-right text-gray-400 text-xs flex-shrink-0"></i>
                                    {!state.revealed ? (
                                        <span className="flex-1 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 text-sm text-center border border-dashed border-gray-300 dark:border-gray-600">
                                            ?
                                        </span>
                                    ) : (
                                        <span className="flex-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm text-center border border-emerald-200 dark:border-emerald-700">
                                            {pair.right}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {!state.revealed && (
                            <button
                                onClick={handleReveal}
                                className="w-full mt-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                Révéler les associations
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Component: VocabularyLabTab
// ---------------------------------------------------------------------------

interface VocabularyLabTabProps {
    config: any;
    activeLang: string;
    onAddCards?: (cards: Flashcard[], targetSetName?: string) => void;
    onSaveVocabList?: (vocab: SavedVocabList) => void;
    initialVocab?: SavedVocabList;
    vocabLabCache?: Record<string, any>;
    onSetVocabLabCache?: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    onLaunchQuiz?: (setName: string) => void;
}

export const VocabularyLabTab: React.FC<VocabularyLabTabProps> = ({ config, activeLang, onAddCards, onSaveVocabList, initialVocab, vocabLabCache, onSetVocabLabCache, onLaunchQuiz }) => {
    const { showToast } = useToast();
    const [selectedTheme, setSelectedTheme] = useState<string>('');
    const [customTheme, setCustomTheme] = useState('');
    const [difficulty, setDifficulty] = useState<'débutant' | 'intermédiaire' | 'avancé'>('intermédiaire');
    const [isGenerating, setIsGenerating] = useState(false);
    const [vocabData, setVocabData] = useState<VocabData | null>(null);
    const [activeSection, setActiveSection] = useState<'words' | 'expressions' | 'exercises' | 'themes'>('words');
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [showChatPanel, setShowChatPanel] = useState(false);
    const [expandedWords, setExpandedWords] = useState<Set<number>>(new Set());
    const chatEndRef = useRef<HTMLDivElement>(null);

    // ── Language-scoped cache: each activeLang gets its own isolated namespace ──
    const langPrefix = `${activeLang}::`;

    const scopedCache = useMemo(() => {
        if (!vocabLabCache) return {} as Record<string, any>;
        return Object.fromEntries(
            Object.entries(vocabLabCache)
                .filter(([k]) => k.startsWith(langPrefix))
                .map(([k, v]) => [k.slice(langPrefix.length), v])
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vocabLabCache, activeLang]);

    const setScopedCache = useCallback((updater: React.SetStateAction<Record<string, any>>) => {
        if (!onSetVocabLabCache) return;
        onSetVocabLabCache(prev => {
            const current = Object.fromEntries(
                Object.entries(prev)
                    .filter(([k]) => k.startsWith(langPrefix))
                    .map(([k, v]) => [k.slice(langPrefix.length), v])
            );
            const next = typeof updater === 'function' ? updater(current) : updater;
            const cleaned = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(langPrefix)));
            const prefixed = Object.fromEntries(Object.entries(next).map(([k, v]) => [`${langPrefix}${k}`, v]));
            return { ...cleaned, ...prefixed };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [langPrefix, onSetVocabLabCache]);

    // Restore from a saved vocab list (opened from Curriculum screen)
    useEffect(() => {
        if (initialVocab) {
            setVocabData({
                theme: initialVocab.theme,
                targetLanguage: initialVocab.targetLanguage,
                words: initialVocab.words,
                expressions: initialVocab.expressions,
                exercises: initialVocab.exercises,
                relatedThemes: initialVocab.relatedThemes,
            });
            setSelectedTheme(initialVocab.theme);
            setDifficulty(initialVocab.difficulty as any);
            setActiveSection('words');
            if (initialVocab.chatHistory && initialVocab.chatHistory.length > 0) {
                setChatHistory(initialVocab.chatHistory as ChatMessage[]);
                setShowChatPanel(true);
            }
        }
    }, [initialVocab]);

    // Restore active session if the user navigated away and came back
    useEffect(() => {
        if (!initialVocab && scopedCache['__active_theme__']) {
            const activeTheme = scopedCache['__active_theme__'] as unknown as string;
            if (scopedCache[activeTheme]) {
                setVocabData(scopedCache[activeTheme]);
                setSelectedTheme(activeTheme);
                
                if (scopedCache[`__chat_history_${activeTheme}__`]) {
                    setChatHistory(scopedCache[`__chat_history_${activeTheme}__`] as ChatMessage[]);
                }
                if (scopedCache[`__chat_panel_${activeTheme}__`]) {
                    setShowChatPanel(scopedCache[`__chat_panel_${activeTheme}__`] as boolean);
                }
            }
        }
        // Restore custom theme text
        if (!initialVocab && scopedCache['__custom_theme__']) {
            setCustomTheme(scopedCache['__custom_theme__'] as unknown as string);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist customTheme text into cache so it survives cross-screen navigations
    useEffect(() => {
        if (customTheme) setScopedCache(prev => ({ ...prev, '__custom_theme__': customTheme as any }));
    }, [customTheme, setScopedCache]);

    // Sync vocabData & chat into session cache
    useEffect(() => {
        if (vocabData) {
            setScopedCache(prev => ({
                ...prev,
                [vocabData.theme]: vocabData,
                [`__chat_history_${vocabData.theme}__`]: chatHistory,
                [`__chat_panel_${vocabData.theme}__`]: showChatPanel,
                '__active_theme__': vocabData.theme
            }));
        }
    }, [vocabData, chatHistory, showChatPanel, setScopedCache]);

    const targetLangName = (() => {
        const map: Record<string, string> = { en: 'anglais', it: 'italien', es: 'espagnol', pt: 'portugais', de: 'allemand', tr: 'turc', fr: 'français' };
        return map[activeLang.split('-')[0].toLowerCase()] || activeLang;
    })();

    const currentTheme = selectedTheme || customTheme;

    const generate = async (opts?: { moreWords?: boolean; moreExpressions?: boolean; moreExercises?: boolean; subTheme?: string }, overrideTheme?: string) => {
        const themeToUse = overrideTheme || currentTheme;
        if (!themeToUse.trim()) { showToast('Veuillez choisir un thème', 'warning'); return; }

        // Use cached content if doing a full generation (not asking for "more" items) and cache exists
        if (!opts && scopedCache[themeToUse]) {
            setVocabData(scopedCache[themeToUse]);
            if (scopedCache[`__chat_history_${themeToUse}__`]) {
                setChatHistory(scopedCache[`__chat_history_${themeToUse}__`] as ChatMessage[]);
            } else {
                setChatHistory([]);
            }
            if (scopedCache[`__chat_panel_${themeToUse}__`]) {
                setShowChatPanel(scopedCache[`__chat_panel_${themeToUse}__`] as boolean);
            } else {
                setShowChatPanel(false);
            }
            return;
        }

        // If it's a completely new root generation, clear old chat
        if (!opts) {
            setChatHistory([]);
            setShowChatPanel(false);
        }

        setIsGenerating(true);

        try {
            const { apiKey, modelName, apiUrl } = resolveConfig(config);
            const systemPrompt = buildSystemPrompt(targetLangName);

            // Pass existing items to avoid duplicates
            const existingWords = vocabData?.words.map(w => w.word) ?? [];
            const existingExpressions = vocabData?.expressions.map(e => e.expression) ?? [];

            const userPrompt = buildUserPrompt(themeToUse, {
                ...opts,
                difficulty,
                existingWords: opts?.moreWords ? existingWords : undefined,
                existingExpressions: opts?.moreExpressions ? existingExpressions : undefined,
            });

            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const raw = await executeAIRequest(messages, config.provider, apiKey, modelName, apiUrl);

            // Parse JSON
            let jsonStr = '';
            const codeBlock = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlock) jsonStr = codeBlock[1];
            if (!jsonStr) { const m = raw.match(/\{[\s\S]*\}/); if (m) jsonStr = m[0]; }

            if (!jsonStr) throw new Error('Pas de JSON valide dans la réponse.');

            const parsed = JSON.parse(jsonStr) as Partial<VocabData>;

            if (opts?.moreWords && vocabData) {
                const newWords = (parsed.words ?? []).slice(0, 10); // strict cap
                // Dedup: exclude any word whose base form already exists (case-insensitive, strip articles)
                const normalize = (w: string) => w.toLowerCase().replace(/^(il |la |lo |l'|i |gli |le |un |una |uno |the |a |an )/i, '').trim();
                const existingNorm = new Set(existingWords.map(normalize));
                const dedupedWords = newWords.filter(w => !existingNorm.has(normalize(w.word)));
                setVocabData(prev => prev ? { ...prev, words: [...prev.words, ...dedupedWords] } : prev);
                showToast(`${dedupedWords.length} mots supplémentaires ajoutés !`, 'success');
            } else if (opts?.moreExpressions && vocabData) {
                const newExprs = (parsed.expressions ?? []).slice(0, 5);
                const existingNorm = new Set(existingExpressions.map(e => e.toLowerCase().trim()));
                const dedupedExprs = newExprs.filter(e => !existingNorm.has(e.expression.toLowerCase().trim()));
                setVocabData(prev => prev ? { ...prev, expressions: [...prev.expressions, ...dedupedExprs] } : prev);
                showToast(`${dedupedExprs.length} expressions supplémentaires ajoutées !`, 'success');
            } else if (opts?.moreExercises && vocabData) {
                const newExs = (parsed.exercises ?? []).slice(0, 5);
                setVocabData(prev => prev ? { ...prev, exercises: [...prev.exercises, ...newExs] } : prev);
                showToast(`${newExs.length} exercices supplémentaires ajoutés !`, 'success');
            } else {
                parsed.theme = themeToUse;
                setVocabData(parsed as VocabData);
                setActiveSection('words');
                showToast(`Vocabulaire généré pour "${(parsed as VocabData).theme}" !`, 'success');
            }
        } catch (e) {
            console.error('VocabLab generate error:', e);
            showToast('Erreur lors de la génération. Réessayez.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleChatSend = async () => {
        if (!chatInput.trim() || !vocabData) return;
        setIsChatLoading(true);

        const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setChatInput('');

        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
            const { apiKey, modelName, apiUrl } = resolveConfig(config);
            const systemPrompt = `Tu es un assistant pédagogique expert en langues. L'utilisateur explore le thème "${vocabData.theme}" en ${targetLangName}. 
Tu as accès au vocabulaire suivant : ${vocabData.words.map(w => w.word).slice(0, 20).join(', ')}.
Aide l'utilisateur avec ses questions : génère du vocabulaire supplémentaire, des exercices, des explications culturelles, des exemples de phrases, etc.
Réponds toujours en français avec les mots en ${targetLangName} en gras (**mot**).`;

            const messages: ChatMessage[] = [
                { role: 'system', content: systemPrompt },
                ...newHistory
            ];

            const reply = await executeAIRequest(messages, config.provider, apiKey, modelName, apiUrl);
            const aiMsg: ChatMessage = { role: 'assistant', content: reply };
            setChatHistory(prev => [...prev, aiMsg]);
        } catch (e) {
            console.error('VocabLab chat error:', e);
            showToast('Erreur de connexion', 'error');
        } finally {
            setIsChatLoading(false);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
        }
    };

    const handleAddAllToFlashcards = () => {
        if (!vocabData || !onAddCards) return;
        const langCode = activeLang.split('-')[0].toLowerCase();
        const setName = `📚 Vocabulaire : ${vocabData.theme}`;

        if (activeSection === 'expressions') {
            const cards: FlashcardClassic[] = vocabData.expressions.map(expr => ({
                id: uuidv4(),
                type: 'classic' as const,
                terms: { [langCode]: expr.expression, fr: expr.translation }
            }));
            onAddCards(cards, setName);
            showToast(`${cards.length} expressions ajoutées ! Lancement du quiz...`, 'success');
        } else {
            const cards: FlashcardClassic[] = vocabData.words.map(w => ({
                id: uuidv4(),
                type: 'classic' as const,
                terms: { [langCode]: w.word, fr: w.translation }
            }));
            onAddCards(cards, setName);
            showToast(`${cards.length} mots ajoutés ! Lancement du quiz...`, 'success');
        }
        // Navigate to quiz setup after a short delay to allow the set to be created
        if (onLaunchQuiz) {
            setTimeout(() => onLaunchQuiz(setName), 300);
        }
    };


    const handleSaveToLessons = () => {
        if (!vocabData || !onSaveVocabList) return;
        const saved: SavedVocabList = {
            id: uuidv4(),
            theme: vocabData.theme,
            targetLanguage: vocabData.targetLanguage,
            difficulty,
            words: vocabData.words,
            expressions: vocabData.expressions,
            exercises: vocabData.exercises,
            relatedThemes: vocabData.relatedThemes,
            savedAt: new Date().toISOString(),
            wordCount: vocabData.words.length,
            chatHistory: chatHistory.length > 0 ? chatHistory : undefined,
        };
        onSaveVocabList(saved);
        const chatInfo = chatHistory.length > 0 ? ` (+ ${chatHistory.length} messages de chat)` : '';
        showToast(`Vocabulaire "${vocabData.theme}" sauvegardé dans Mes Leçons !${chatInfo}`, 'success');
    };

    const toggleWordExpand = (idx: number) => {
        setExpandedWords(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    // Full markdown-to-HTML for chat messages
    const renderChatContent = (text: string) => {
        return text
            // Horizontal rules
            .replace(/^---+$/gm, '<hr class="my-2 border-gray-200 dark:border-gray-600"/>')
            // Headers (### ## #)
            .replace(/^### (.+)$/gm, '<h3 class="font-bold text-sm mt-3 mb-1 text-gray-800 dark:text-gray-100">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="font-bold text-base mt-3 mb-1 text-gray-800 dark:text-gray-100">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="font-bold text-lg mt-3 mb-1 text-gray-800 dark:text-gray-100">$1</h1>')
            // Bold & italic
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold italic">$1</strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-primary dark:text-primary">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs font-mono">$1</code>')
            // Numbered lists
            .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-2 my-0.5"><span class="font-bold text-primary flex-shrink-0">$1.</span><span>$2</span></div>')
            // Bullet lists
            .replace(/^[-•] (.+)$/gm, '<div class="flex gap-2 my-0.5"><span class="text-primary flex-shrink-0">•</span><span>$1</span></div>')
            // Blockquotes
            .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-primary/40 pl-2 italic text-gray-500 dark:text-gray-400 my-1">$1</blockquote>')
            // Line breaks
            .replace(/\n\n/g, '<div class="h-2"></div>')
            .replace(/\n/g, '<br/>');
    };

    const handleCopyMessage = (content: string) => {
        navigator.clipboard.writeText(content).then(() => {
            showToast('Message copié !', 'success');
        }).catch(() => {
            showToast('Impossible de copier', 'error');
        });
    };

    const handleCopyFullChat = () => {
        if (chatHistory.length === 0) return;
        const text = chatHistory.map(m =>
            `${m.role === 'user' ? 'Vous' : 'Assistant'} :\n${m.content}`
        ).join('\n\n---\n\n');
        navigator.clipboard.writeText(text).then(() => {
            showToast('Conversation complète copiée !', 'success');
        }).catch(() => {
            showToast('Impossible de copier', 'error');
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── THEME PICKER ─────────────────────────────────────────── */}
            {!vocabData && (
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Header */}
                    <div className="text-center pt-2">
                        <div className="text-4xl mb-2">📚</div>
                        <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">Labo Vocabulaire</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Choisissez un thème pour générer du vocabulaire et des exercices interactifs en <strong>{targetLangName}</strong>
                        </p>
                    </div>

                    {/* Difficulty */}
                    <div className="flex justify-center gap-2">
                        {(['débutant', 'intermédiaire', 'avancé'] as const).map(d => (
                            <button
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all border ${
                                    difficulty === d
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-primary'
                                }`}
                            >
                                {d === 'débutant' ? '🌱' : d === 'intermédiaire' ? '🌿' : '🌳'} {d}
                            </button>
                        ))}
                    </div>

                    {/* Predefined themes grid */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-2">
                            <i className="fas fa-list-ul"></i> Thèmes prédéfinis
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {PREDEFINED_THEMES.map(theme => (
                                <button
                                    key={theme.label}
                                    onDoubleClick={() => {
                                        setSelectedTheme(theme.label);
                                        generate(undefined, theme.label);
                                    }}
                                    onClick={() => { 
                                        setSelectedTheme(theme.label); 
                                        if (scopedCache[theme.label]) {
                                            setVocabData(scopedCache[theme.label]);
                                            if (scopedCache[`__chat_history_${theme.label}__`]) {
                                                setChatHistory(scopedCache[`__chat_history_${theme.label}__`] as ChatMessage[]);
                                            } else {
                                                setChatHistory([]);
                                            }
                                            if (scopedCache[`__chat_panel_${theme.label}__`]) {
                                                setShowChatPanel(scopedCache[`__chat_panel_${theme.label}__`] as boolean);
                                            } else {
                                                setShowChatPanel(false);
                                            }
                                        }
                                    }}
                                    className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
                                        selectedTheme === theme.label
                                            ? 'bg-primary text-white border-primary shadow-md scale-[1.02]'
                                            : scopedCache[theme.label]
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-gray-700 dark:text-gray-200 hover:border-primary hover:scale-[1.01]'
                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary hover:scale-[1.01]'
                                    }`}
                                >
                                    {/* Cached indicator */}
                                    {scopedCache[theme.label] && selectedTheme !== theme.label && (
                                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500" title="Liste déjà en mémoire" />
                                    )}
                                    <span className="text-base flex-shrink-0">{theme.emoji}</span>
                                    <span className="text-xs leading-snug">{theme.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom theme */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                            <i className="fas fa-pen"></i> Thème personnalisé
                        </h3>
                        <div className="relative">
                            <input
                                type="text"
                                value={customTheme}
                                onChange={e => { setCustomTheme(e.target.value); setSelectedTheme(''); }}
                                onKeyDown={e => e.key === 'Enter' && generate()}
                                placeholder="Ex: La météo, Les animaux, Le sport..."
                                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100 ${
                                    customTheme && scopedCache[customTheme]
                                        ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                                }`}
                            />
                        </div>

                        {/* Cached custom themes chips */}
                        {(() => {
                            const predefinedLabels = new Set(PREDEFINED_THEMES.map(t => t.label));
                            const RESERVED = new Set(['__active_theme__', '__custom_theme__']);
                            const cachedCustom = Object.keys(scopedCache).filter(k => !predefinedLabels.has(k) && !RESERVED.has(k));
                            if (cachedCustom.length === 0) return null;
                            return (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                                        <i className="fas fa-history mr-1"></i>Listes personnalisées en mémoire :
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cachedCustom.map(label => (
                                            <button
                                                key={label}
                                                onClick={() => {
                                                    setCustomTheme(label);
                                                    setSelectedTheme('');
                                                    if (scopedCache[label]) {
                                                        setVocabData(scopedCache[label]);
                                                        if (scopedCache[`__chat_history_${label}__`]) {
                                                            setChatHistory(scopedCache[`__chat_history_${label}__`] as ChatMessage[]);
                                                        } else {
                                                            setChatHistory([]);
                                                        }
                                                        if (scopedCache[`__chat_panel_${label}__`]) {
                                                            setShowChatPanel(scopedCache[`__chat_panel_${label}__`] as boolean);
                                                        } else {
                                                            setShowChatPanel(false);
                                                        }
                                                    }
                                                }}
                                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                                                    customTheme === label
                                                        ? 'bg-primary text-white border-primary'
                                                        : 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40'
                                                }`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Generate button */}
                    <button
                        onClick={() => generate()}
                        disabled={isGenerating || !currentTheme.trim()}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isGenerating ? (
                            <>
                                <i className="fas fa-circle-notch fa-spin"></i>
                                Génération en cours…
                            </>
                        ) : (
                            <>
                                <i className="fas fa-magic"></i>
                                Générer le vocabulaire
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* ── VOCABULARY RESULT ─────────────────────────────────────── */}
            {vocabData && (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Result Header */}
                    <div className="flex-shrink-0 px-4 pt-3 pb-3 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/10 border-b border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                            <button
                                onClick={() => {
                                    setVocabData(null);
                                    setChatHistory([]);
                                    setShowChatPanel(false);
                                    setScopedCache(prev => { const n = { ...prev }; delete n['__active_theme__']; return n; });
                                }}
                                className="flex items-center gap-1.5 text-primary/80 dark:text-gray-300 hover:text-primary dark:hover:text-white text-xs transition-colors bg-white hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 px-2.5 py-1 rounded-full shadow-sm"
                            >
                                <i className="fas fa-arrow-left text-[10px]"></i> Thèmes
                            </button>
                            <div className="text-center">
                                <h2 className="font-black text-base text-primary dark:text-primary leading-none">{vocabData.theme}</h2>
                                <p className="text-primary/70 dark:text-gray-400 font-medium text-[10px] mt-0.5">en {targetLangName} • {difficulty}</p>
                            </div>
                            <div className="flex gap-1.5">
                                {onSaveVocabList && (
                                    <button
                                        onClick={handleSaveToLessons}
                                        className="text-primary/80 hover:text-primary dark:text-gray-300 dark:hover:text-white text-[10px] bg-white hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 px-2 py-1 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                                        title="Sauvegarder dans Mes Leçons"
                                    >
                                        <i className="fas fa-save text-[11px]"></i> Sauv.
                                    </button>
                                )}
                                {onAddCards && (
                                    <button
                                        onClick={handleAddAllToFlashcards}
                                        className="text-primary/80 hover:text-primary dark:text-gray-300 dark:hover:text-white text-[10px] bg-white hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 px-2 py-1 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                                        title={
                                            activeSection === 'expressions'
                                                ? 'Ajouter les expressions en flashcards'
                                                : 'Ajouter les mots en flashcards'
                                        }
                                    >
                                        <i className="fas fa-plus-circle text-[11px]"></i>
                                        {activeSection === 'expressions' ? 'Cards (expr.)' : 'Cards (mots)'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowChatPanel(!showChatPanel)}
                                    className={`text-[10px] px-2 py-1 rounded-full transition-colors flex items-center gap-1 shadow-sm ${showChatPanel ? 'bg-primary text-white font-bold' : 'text-primary/80 hover:text-primary dark:text-gray-300 dark:hover:text-white bg-white hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40'}`}
                                    title="Chat avec l'IA"
                                >
                                    <i className="fas fa-comments text-[11px]"></i> Chat
                                </button>
                            </div>
                        </div>

                        {/* Stats badges */}
                        <div className="flex gap-2 text-[10px] mt-1 items-center justify-center">
                            <span className="bg-primary/20 dark:bg-primary/30 text-primary dark:text-white px-2.5 py-0.5 rounded-full font-bold">{vocabData.words.length} mots</span>
                            <span className="bg-primary/20 dark:bg-primary/30 text-primary dark:text-white px-2.5 py-0.5 rounded-full font-bold">{vocabData.expressions.length} expressions</span>
                            <span className="bg-primary/20 dark:bg-primary/30 text-primary dark:text-white px-2.5 py-0.5 rounded-full font-bold">{vocabData.exercises.length} exercices</span>
                        </div>
                    </div>

                    {/* Section Tabs */}
                    <div className="flex-shrink-0 flex gap-0.5 p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        {[
                            { key: 'words', icon: 'fa-font', label: 'Mots' },
                            { key: 'expressions', icon: 'fa-comment-dots', label: 'Expressions' },
                            { key: 'exercises', icon: 'fa-pencil-alt', label: 'Exercices' },
                            { key: 'themes', icon: 'fa-sitemap', label: 'Plus' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveSection(tab.key as any)}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                    activeSection === tab.key
                                        ? 'bg-white dark:bg-gray-800 text-primary dark:text-primary shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                            >
                                <i className={`fas ${tab.icon} text-[10px]`}></i>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Main content */}
                        <div className={`flex-1 overflow-y-auto p-3 space-y-2 ${showChatPanel ? 'hidden md:block md:w-1/2' : ''}`}>
                            {/* WORDS */}
                            {activeSection === 'words' && (
                                <>
                                    {vocabData.words.map((w, i) => (
                                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                            <button
                                                onClick={() => toggleWordExpand(i)}
                                                className="w-full flex items-center justify-between px-4 py-3 text-left"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-primary dark:text-primary">{w.word}</span>
                                                    {w.phonetic && <span className="text-xs text-gray-400 italic">[{w.phonetic}]</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">{w.translation}</span>
                                                    <i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform ${expandedWords.has(i) ? 'rotate-180' : ''}`}></i>
                                                </div>
                                            </button>
                                            {expandedWords.has(i) && w.example && (
                                                <div className="px-4 pb-3 pt-0">
                                                    <div className="bg-primary/10 dark:dark:bg-primary/20 rounded-lg px-3 py-2 border-l-3 border-primary">
                                                        <p className="text-xs text-primary dark:text-primary/80 italic">« {w.example} »</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => generate({ moreWords: true })}
                                        disabled={isGenerating}
                                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-primary/50 dark:border-primary text-primary dark:text-primary text-sm font-medium hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGenerating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-plus"></i>}
                                        10 mots supplémentaires
                                    </button>
                                </>
                            )}

                            {/* EXPRESSIONS */}
                            {activeSection === 'expressions' && (
                                <>
                                    <div className="space-y-3">
                                        {vocabData.expressions.map((expr, i) => (
                                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <i className="fas fa-quote-left text-white text-[10px]"></i>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-primary dark:text-primary text-sm">{expr.expression}</p>
                                                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">{expr.translation}</p>
                                                        {expr.example && (
                                                            <p className="text-gray-600 dark:text-gray-300 text-xs mt-2 italic border-l-2 border-primary/50 pl-2">
                                                                {expr.example}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => generate({ moreExpressions: true })}
                                        disabled={isGenerating}
                                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-primary/50 dark:border-primary text-primary dark:text-primary text-sm font-medium hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGenerating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-plus"></i>}
                                        5 expressions supplémentaires
                                    </button>
                                </>
                            )}

                            {/* EXERCISES */}
                            {activeSection === 'exercises' && (
                                <>
                                    <div className="space-y-3">
                                        {vocabData.exercises.map((ex, i) => (
                                            <ExerciseCard key={i} exercise={ex} index={i} />
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => generate({ moreExercises: true })}
                                        disabled={isGenerating}
                                        className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGenerating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-plus"></i>}
                                        5 exercices supplémentaires
                                    </button>
                                </>
                            )}

                            {/* RELATED THEMES */}
                            {activeSection === 'themes' && vocabData.relatedThemes && (
                                <div className="space-y-4">
                                    {vocabData.relatedThemes.versions.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-code-branch text-primary"></i> Variantes du thème
                                            </h3>
                                            <div className="grid grid-cols-1 gap-2">
                                                {vocabData.relatedThemes.versions.map((v, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setSelectedTheme(v); setVocabData(null); }}
                                                        className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-all text-left"
                                                    >
                                                        <i className="fas fa-arrow-right text-primary text-xs flex-shrink-0"></i>
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{v}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {vocabData.relatedThemes.connectedThemes.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                                <i className="fas fa-link text-blue-500"></i> Thèmes connexes
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {vocabData.relatedThemes.connectedThemes.map((ct, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setSelectedTheme(ct); setVocabData(null); }}
                                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-full text-blue-700 dark:text-blue-300 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                    >
                                                        {ct}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Generate sub-theme */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                                            <i className="fas fa-magic text-emerald-500"></i> Explorer un sous-thème
                                        </h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                id="sub-theme-input"
                                                placeholder={`Ex: "${vocabData.theme} formel", "${vocabData.theme} quotidien"...`}
                                                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-emerald-400 text-gray-800 dark:text-gray-100"
                                            />
                                            <button
                                                onClick={() => {
                                                    const inp = document.getElementById('sub-theme-input') as HTMLInputElement;
                                                    if (inp?.value) generate({ subTheme: inp.value });
                                                }}
                                                disabled={isGenerating}
                                                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                <i className="fas fa-search mr-1"></i> Explorer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Panel */}
                        {showChatPanel && (
                            <div className="flex flex-col w-full md:w-1/2 border-l border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                {/* Chat header */}
                                <div className="flex-shrink-0 px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                    <i className="fas fa-robot text-primary text-sm"></i>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Assistant IA</span>
                                    {chatHistory.length > 0 && (
                                        <button
                                            onClick={handleCopyFullChat}
                                            title="Copier toute la conversation"
                                            className="ml-auto mr-1 text-gray-400 hover:text-primary transition-colors flex items-center gap-1 text-xs px-2 py-0.5 rounded-full hover:bg-primary/10"
                                        >
                                            <i className="fas fa-copy text-xs"></i>
                                            <span>Copier tout</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowChatPanel(false)}
                                        className={`${chatHistory.length > 0 ? '' : 'ml-auto'} text-gray-400 hover:text-gray-600 transition-colors`}
                                    >
                                        <i className="fas fa-times text-sm"></i>
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {chatHistory.length === 0 && (
                                        <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                                            <i className="fas fa-comment-dots text-3xl mb-2 block"></i>
                                            <p>Demandez-moi des mots supplémentaires,<br/>des explications culturelles, des phrases d'exemple...</p>
                                        </div>
                                    )}
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-0.5`}>
                                            <div
                                                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                                    msg.role === 'user'
                                                        ? 'bg-primary text-white rounded-br-none'
                                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: renderChatContent(msg.content) }}
                                            />
                                            {msg.role === 'assistant' && (
                                                <button
                                                    onClick={() => handleCopyMessage(msg.content)}
                                                    title="Copier ce message"
                                                    className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 transition-colors text-[10px] flex items-center gap-1 px-1"
                                                >
                                                    <i className="fas fa-copy"></i>
                                                    <span>Copier</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {isChatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-2xl rounded-bl-none">
                                                <i className="fas fa-circle-notch fa-spin text-primary text-sm"></i>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Quick suggestions */}
                                {chatHistory.length === 0 && (
                                    <div className="flex-shrink-0 px-3 pb-2 flex flex-wrap gap-1.5">
                                        {[
                                            `Donne-moi 5 expressions idiomatiques sur "${currentTheme}"`,
                                            'Explique la différence culturelle',
                                            'Crée un mini exercice de conversation',
                                        ].map((sug, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setChatInput(sug); }}
                                                className="text-xs px-2.5 py-1 bg-white dark:bg-gray-800 border border-primary/30 dark:border-primary text-primary dark:text-primary rounded-full hover:bg-primary/10 dark:hover:dark:bg-primary/20 transition-colors"
                                            >
                                                {sug.length > 30 ? sug.slice(0, 30) + '…' : sug}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Chat input */}
                                <div className="flex-shrink-0 p-3 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !isChatLoading && handleChatSend()}
                                        placeholder="Posez une question…"
                                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-primary text-gray-800 dark:text-gray-100"
                                    />
                                    <button
                                        onClick={handleChatSend}
                                        disabled={isChatLoading || !chatInput.trim()}
                                        className="px-3 py-2 bg-primary hover:hover:bg-primary/90 text-white rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        <i className="fas fa-paper-plane text-sm"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Loading overlay when generating from result screen */}
            {isGenerating && vocabData && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl px-8 py-6 shadow-2xl flex flex-col items-center gap-3">
                        <i className="fas fa-circle-notch fa-spin text-primary text-3xl"></i>
                        <p className="text-gray-700 dark:text-gray-200 font-medium">Génération en cours…</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VocabularyLabTab;
