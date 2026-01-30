import React, { useState, useRef, useEffect } from 'react';
import { useColumns } from '../hooks/useColumns';
import { useSRS } from '../hooks/useSRS';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { Flashcard, VoiceGender, Language, QuizConfig, GameMode } from '../types';
import { Button } from './ui/Button';
import { LANGUAGE_CONFIG } from '../constants';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';
import { getThemeGradient, ThemeMode, ThemeStyle } from '../constants/themes';

interface SetupScreenProps {
    allFlashcards: Flashcard[];
    flashcardSetName: string;
    onStartQuiz: (cards: Flashcard[], config: Omit<QuizConfig, 'voiceEngine' | 'autoPlayAudio' | 'quizName'>) => void;
    onShowSRSPreview: (cards: Flashcard[], config: Omit<QuizConfig, 'voiceEngine' | 'autoPlayAudio' | 'quizName'>) => void;
    onFileImport: (file: File) => void;
    onShowReview: () => void;
    onShowEdit: () => void;
    voiceEngine: QuizConfig['voiceEngine'];
    setVoiceEngine: React.Dispatch<React.SetStateAction<QuizConfig['voiceEngine']>>;
    autoPlayAudio: boolean;
    setAutoPlayAudio: React.Dispatch<React.SetStateAction<boolean>>;
    streak: number;
    onBack?: () => void;
    setCurrentSetName: (name: string) => void;
    flashcardSets: Record<string, Flashcard[]>;
    onShowDashboard: () => void;
    onShowSettings?: () => void;
    onManageSets: () => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ 
    allFlashcards, 
    flashcardSetName, 
    onStartQuiz,
    onShowSRSPreview,
    onFileImport, 
    onShowReview, 
    onShowEdit, 
    voiceEngine, 
    setVoiceEngine, 
    autoPlayAudio, 
    setAutoPlayAudio,
    streak,
    onBack,
    setCurrentSetName,
    flashcardSets,
    onShowDashboard,
    onShowSettings,
    onManageSets,
    themeMode,
    themeStyle
}) => {
    const { config } = useAIConfig();
    const { showToast } = useToast();
    const { t } = useTranslation();
    
    const allColumns = useColumns(allFlashcards);
    const { getDueCards } = useSRS();

    const [questionLang, setQuestionLang] = useState<Language>('');
    const [answerLang, setAnswerLang] = useState<Language>('');
    const [voiceGender] = useState<VoiceGender>('female');
    const [numCards, setNumCards] = useState<number>(10);
    const [isShuffled, setIsShuffled] = useState(true);
    const [quizMode, setQuizMode] = useState<"classic" | "mcq" | "dictation" | "cloze" | "mixed">("classic");
    const [gameMode, setGameMode] = useState<GameMode>("normal");
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const isOnlineVoiceSupported = questionLang in LANGUAGE_CONFIG;

    useEffect(() => {
        if (allColumns.length > 0) {
            const currentQuestionLangIsValid = allColumns.includes(questionLang);
            const currentAnswerLangIsValid = allColumns.includes(answerLang);

            if (!currentQuestionLangIsValid) {
                setQuestionLang(allColumns.find(c => c.toLowerCase() === 'fr' || c.toLowerCase() === 'recto') || allColumns[0] || '');
            }
            if (!currentAnswerLangIsValid) {
                const defaultAnswer = allColumns.find(c => c.toLowerCase() === 'en' || c.toLowerCase() === 'it' || c.toLowerCase() === 'es' || c.toLowerCase() === 'verso');
                const candidate = allColumns.length > 1 ? (defaultAnswer || allColumns[1]) : (allColumns[0] || '');
                setAnswerLang(candidate);
            }
        } else {
            setQuestionLang('');
            setAnswerLang('');
        }
    }, [allColumns, questionLang, answerLang]);

    useEffect(() => {
        if (!isOnlineVoiceSupported && voiceEngine === 'gemini') {
            setVoiceEngine('local');
        }
    }, [isOnlineVoiceSupported, voiceEngine, setVoiceEngine]);

    const handleStartQuiz = () => {
        if (!questionLang || !answerLang) {
            showToast(t('setup.placeholders.selectLang'), 'warning');
            return;
        }
        
        const validCards = allFlashcards.filter(card => {
            const terms = (card as any).terms;
            const mcqData = (card as any).mcqData;
            const clozeData = (card as any).clozeData;

            if (terms) return terms[questionLang] && terms[answerLang];
            if (mcqData) return mcqData.question[questionLang] && mcqData.answer[answerLang];
            if (clozeData) return clozeData.text[questionLang] && clozeData.answers[answerLang];
            
            // Fallback for flat objects
            return (card as any)[questionLang] && (card as any)[answerLang];
        });

        const maxCards = validCards.length;
        
        if (maxCards === 0) {
            showToast(t('setup.noCardsFound'), 'warning');
            return;
        }
        
        const quizSize = Math.max(1, Math.min(numCards, maxCards));
        
        let cardsForQuiz = [...validCards];
        if (isShuffled) {
            cardsForQuiz.sort(() => 0.5 - Math.random());
        }
        
        const finalMode = quizMode;

        onStartQuiz(cardsForQuiz.slice(0, quizSize), { 
            questionLang, 
            answerLang, 
            voiceGender, 
            mode: finalMode, 
            gameMode,
            tutorId: config.selectedTutor?.id,
            tutorCategory: config.selectedTutor?.category
        });
    };
    
    const handleStartSRSReview = () => {
        if (!questionLang || !answerLang) {
            showToast(t('setup.placeholders.selectLang'), 'warning');
            return;
        }
        
        const dueCards = getDueCards(allFlashcards);
        
        const validDueCards = dueCards.filter(card => {
            const terms = (card as any).terms;
            const mcqData = (card as any).mcqData;
            const clozeData = (card as any).clozeData;

            if (terms) return terms[questionLang] && terms[answerLang];
            if (mcqData) return mcqData.question[questionLang] && mcqData.answer[answerLang];
            if (clozeData) return clozeData.text[questionLang] && clozeData.answers[answerLang];

            // Fallback for flat objects
            return (card as any)[questionLang] && (card as any)[answerLang];
        });
        
        if (validDueCards.length === 0) {
            showToast(t('setup.noDueCards'), 'info', 4000);
            return;
        }
        
        const shuffledCards = [...validDueCards].sort(() => 0.5 - Math.random());
        
        const finalMode = quizMode;
        
        onShowSRSPreview(shuffledCards, { 
            questionLang, 
            answerLang, 
            voiceGender, 
            mode: finalMode, 
            gameMode,
            isSRSMode: true
        });
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileImport(file);
        }
        if(e.target) e.target.value = '';
    };

    const handleExport = async () => {
        try {
            const dataStr = JSON.stringify(allFlashcards.map(c => {
                const { id, ...rest } = c;
                return rest;
            }), null, 2);
            const filePath = await save({
                defaultPath: `${flashcardSetName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`,
                filters: [{
                    name: 'JSON File',
                    extensions: ['json']
                }]
            });
            if (filePath) {
                await writeTextFile(filePath, dataStr);
                showToast(t('setup.exportSuccess'), 'success');
            }
        } catch (error) {
            console.error("Erreur lors de l'exportation:", error);
            showToast(t('setup.exportError', { error: error instanceof Error ? error.message : String(error) }), 'error');
        }
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative">
            {/* Header */}
            <div 
                className={`pt-safe p-3 md:p-6 shadow-lg relative overflow-hidden shrink-0 transition-all duration-500 ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                <div className="relative z-10 flex justify-between items-start">
                    <div className="flex flex-col">
                        <Button 
                            variant="secondary" 
                            onClick={onBack} 
                            size="sm" 
                            className={`mb-2 md:mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm transition-all`}
                        >
                            <i className="fas fa-home mr-2"></i> {t('common.home')}
                        </Button>
                        <h1 className="text-xl md:text-3xl font-black drop-shadow-sm text-inherit">
                            {t('setup.title')}
                        </h1>
                        <p className="opacity-80 mt-1 text-xs md:text-base text-inherit line-clamp-1">{t('setup.readySubtitle')}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onShowDashboard} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-transparent backdrop-blur-sm transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80`}
                        >
                            <span className="text-xl">🔥</span>
                            <span className="font-bold text-lg text-inherit">{streak}</span>
                            <span className="text-[10px] font-black ml-1 uppercase opacity-80 text-inherit">{t('setup.statsLabel')}</span>
                        </button>

                        {onShowSettings && (
                            <button 
                                onClick={onShowSettings}
                                className={`p-2.5 rounded-xl border-transparent backdrop-blur-sm transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80`}
                            >
                                <i className="fas fa-cog text-lg text-inherit"></i>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-3 md:p-6 flex-1 overflow-y-auto min-h-0 pb-32">
                <div className="w-full flex flex-col md:flex-row justify-center items-center gap-2 md:gap-4 text-sm md:text-base font-bold mb-3 text-center bg-background-secondary p-2.5 rounded-2xl border border-border/50 shadow-sm transition-all">
                    <span className="text-text-secondary whitespace-nowrap">{t('setup.currentSet')} :</span>
                    <select 
                        value={flashcardSetName} 
                        onChange={(e) => setCurrentSetName(e.target.value)}
                        className="bg-white dark:bg-gray-800 border border-primary/30 dark:border-primary/50 rounded-lg py-1 px-3 text-sm text-primary dark:text-primary-light hover:border-primary focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer transition-all max-w-full md:max-w-md shadow-sm"
                    >
                        {Object.keys(flashcardSets).map(setName => (
                            <option key={setName} value={setName}>
                                {setName} ({t('setup.cardsInSet', { count: flashcardSets[setName].length })})
                            </option>
                        ))}
                    </select>
                </div>

            {/* Sens de la Traduction Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 md:p-6 mb-4 md:mb-6 w-full max-w-4xl mx-auto">
                <h3 className="text-center text-lg md:text-xl font-black mb-4 md:mb-6 text-gray-800 dark:text-gray-200">{t('setup.directionLabel')}</h3>
                <div className="flex items-center justify-center gap-2 md:gap-12">
                    <div className="flex-1 max-w-[240px]">
                        <p className="text-center text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1 md:mb-2">{t('languages.question')}</p>
                        <select 
                            value={questionLang} 
                            onChange={e => setQuestionLang(e.target.value)} 
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-1.5 md:py-2 px-2 md:px-4 text-sm md:font-medium focus:ring-2 focus:ring-green-500/20 outline-none cursor-pointer"
                        >
                            {allColumns.map(lang => (
                                <option key={lang} value={lang}>
                                    {t('languages.' + lang) || LANGUAGE_CONFIG[lang]?.name || lang}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="text-primary">
                        <i className="fas fa-arrow-right text-lg md:text-2xl"></i>
                    </div>

                    <div className="flex-1 max-w-[240px]">
                        <p className="text-center text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1 md:mb-2">{t('languages.answer')}</p>
                        <select 
                            value={answerLang} 
                            onChange={e => setAnswerLang(e.target.value)} 
                            className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-1.5 md:py-2 px-2 md:px-4 text-sm md:font-medium focus:ring-2 focus:ring-green-500/20 outline-none cursor-pointer"
                        >
                            {allColumns.map(lang => (
                                <option key={lang} value={lang}>
                                    {t('languages.' + lang) || LANGUAGE_CONFIG[lang]?.name || lang}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {(() => {
                    const validCount = allFlashcards.filter(card => {
                        const terms = (card as any).terms;
                        const mcqData = (card as any).mcqData;
                        const clozeData = (card as any).clozeData;
                        if (terms) return terms[questionLang] && terms[answerLang];
                        if (mcqData) return mcqData.question[questionLang] && mcqData.answer[answerLang];
                        if (clozeData) return clozeData.text[questionLang] && clozeData.answers[answerLang];
                        // Flat object fallback
                        return (card as any)[questionLang] && (card as any)[answerLang];
                    }).length;

                    if (allColumns.length === 0) {
                        return (
                            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-xl">
                                <p className="text-red-500 dark:text-red-400 font-bold mb-2">
                                    <i className="fas fa-exclamation-circle mr-2"></i> {t('setup.noCardsFound')}
                                </p>
                                {allFlashcards.length > 0 && (
                                    <div className="text-[10px] text-gray-500 font-mono text-left opacity-70">
                                        Debug: {allFlashcards.length} fiches, 0 colonnes. Clés 1ère fiche: {JSON.stringify(Object.keys(allFlashcards[0] || {}))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    if (validCount === 0 && questionLang && answerLang) {
                        return <p className="text-orange-400 text-center mt-6 font-bold"><i className="fas fa-exclamation-triangle mr-2"></i> {t('setup.noCardsFound')}</p>;
                    }
                    return null;
                })()}
            </div>

            {/* Main Grid Area - Symmetric 2x2 Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl mx-auto pb-6">
                
                {/* Block 1: Quiz Modes */}
                <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl md:rounded-3xl p-3 md:p-6 border border-gray-100 dark:border-gray-800 flex flex-col h-full shadow-sm">
                    <h4 className="text-center font-bold text-gray-700 dark:text-gray-300 mb-3 md:mb-6 flex items-center justify-center gap-2 text-sm md:text-base">
                        <i className="fas fa-layer-group text-primary"></i> {t('setup.quizModeLabel')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {[
                            { id: 'classic', icon: 'fa-keyboard', label: t('setup.mode.classic') },
                            { id: 'mcq', icon: 'fa-list-ul', label: t('setup.mode.mcq') },
                            { id: 'dictation', icon: 'fa-microphone', label: t('setup.mode.dictation') },
                            { id: 'cloze', icon: 'fa-minus-square', label: t('setup.mode.cloze') },
                            { id: 'mixed', icon: 'fa-random', label: t('setup.mode.mixed') }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setQuizMode(mode.id as any)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                                    quizMode === mode.id 
                                        ? 'bg-primary border-primary text-white shadow-md' 
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary/50'
                                }`}
                            >
                                <i className={`fas ${mode.icon} text-lg mb-1`}></i>
                                <span className="text-[10px] font-black uppercase tracking-tighter">{mode.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Block 2: Count & Options */}
                <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl md:rounded-3xl p-3 md:p-6 border border-gray-100 dark:border-gray-800 flex flex-col h-full shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                        {/* Number selector */}
                        <div className="flex flex-col">
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <i className="fas fa-sort-numeric-up text-info"></i> {t('setup.placeholders.numCards')}
                            </h4>
                            <input 
                                type="number" 
                                value={numCards} 
                                onChange={e => setNumCards(Math.max(1, parseInt(e.target.value) || 1))} 
                                min="1" 
                                className="w-full text-center py-3 text-2xl font-black rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-4 focus:ring-info/20 outline-none text-info dark:text-info shadow-inner"
                            />
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-col">
                            <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <i className="fas fa-sliders-h text-accent"></i> {t('common.settings')}
                            </h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                    <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{t('setup.options.shuffle')}</span>
                                    <label className="inline-flex relative items-center cursor-pointer">
                                      <input type="checkbox" checked={isShuffled} onChange={() => setIsShuffled(!isShuffled)} className="sr-only peer" />
                                      <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                                {isOnlineVoiceSupported && (
                                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">{t('setup.options.autoVoice')}</span>
                                        <label className="inline-flex relative items-center cursor-pointer">
                                          <input type="checkbox" checked={autoPlayAudio} onChange={() => setAutoPlayAudio(!autoPlayAudio)} className="sr-only peer" />
                                          <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-info"></div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Block 3: Game Modes */}
                <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl md:rounded-3xl p-3 md:p-6 border border-gray-100 dark:border-gray-800 flex flex-col h-full shadow-sm">
                    <h4 className="text-center font-bold text-gray-700 dark:text-gray-300 mb-3 md:mb-6 flex items-center justify-center gap-2 text-sm md:text-base">
                         <i className="fas fa-gamepad text-primary"></i> {t('setup.gameMode.label')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { id: 'normal', icon: 'fa-play-circle', label: t('setup.gameMode.normal'), color: 'bg-primary' },
                            { id: 'timed', icon: 'fa-stopwatch', label: t('setup.gameMode.timed'), color: 'bg-warning' },
                            { id: 'survival', icon: 'fa-heart', label: t('setup.gameMode.survival'), color: 'bg-error' },
                            { id: 'sprint', icon: 'fa-running', label: t('setup.gameMode.sprint'), color: 'bg-primary-hover' }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setGameMode(mode.id as any)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-xs font-bold ${
                                    gameMode === mode.id 
                                        ? `${mode.color} border-transparent text-white shadow-md` 
                                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                                }`}
                            >
                                <i className={`fas ${mode.icon} text-lg`}></i> {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Block 4: Card Management */}
                <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 flex flex-col h-full shadow-sm">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-6 flex items-center justify-center gap-2">
                        <i className="fas fa-folder-open text-primary"></i> {t('setup.manageSets')}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <button onClick={onShowReview} className="p-3 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 rounded-xl transition-all flex flex-col items-center justify-center gap-1 group">
                            <i className="fas fa-book-open text-lg text-primary"></i>
                            <span className="text-[9px] font-bold uppercase text-primary">{t('setup.allSets')}</span>
                        </button>
                        <button onClick={onShowEdit} className="p-3 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 rounded-xl transition-all flex flex-col items-center justify-center gap-1 group">
                            <i className="fas fa-edit text-lg text-primary"></i>
                            <span className="text-[9px] font-bold uppercase text-primary">{t('setup.editCards')}</span>
                        </button>
                        <button onClick={onManageSets} className="p-3 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 rounded-xl transition-all flex flex-col items-center justify-center gap-1 group">
                            <i className="fas fa-tasks text-lg text-primary"></i>
                            <span className="text-[9px] font-bold uppercase text-primary">{t('setup.manageSets')}</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 rounded-xl transition-all flex flex-col items-center justify-center gap-1 group">
                            <i className="fas fa-upload text-lg text-primary"></i>
                            <span className="text-[9px] font-bold uppercase text-primary">{t('setup.import')}</span>
                        </button>
                        <button onClick={handleExport} className="p-3 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/20 border border-primary/10 dark:border-primary/20 rounded-xl transition-all flex flex-col items-center justify-center gap-1 group">
                            <i className="fas fa-download text-lg text-primary"></i>
                            <span className="text-[9px] font-bold uppercase text-primary">{t('setup.export')}</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,.csv,.md" className="hidden"/>
                    </div>
                </div>
            </div>

            {/* Bottom Buttons */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center pt-8 border-t border-gray-100 dark:border-gray-800">
                <Button 
                    size="lg" 
                    onClick={handleStartQuiz} 
                    className="w-full md:w-auto px-12 py-6 text-xl rounded-2xl font-black uppercase tracking-widest bg-gradient-to-r from-primary to-accent text-white shadow-xl hover:scale-105 transition-all outline-none border-none"
                >
                    <i className="fas fa-rocket mr-3"></i> {t('setup.start')}
                </Button>
                
                {(() => {
                    const dueCardsCount = getDueCards(allFlashcards).filter(card => {
                        const terms = (card as any).terms;
                        const mcqData = (card as any).mcqData;
                        const clozeData = (card as any).clozeData;
                        if (terms) return terms[questionLang] && terms[answerLang];
                        if (mcqData) return mcqData.question[questionLang] && mcqData.answer[answerLang];
                        if (clozeData) return clozeData.text[questionLang] && clozeData.answers[answerLang];
                        // Flat object fallback
                        return (card as any)[questionLang] && (card as any)[answerLang];
                    }).length;

                    return (
                        <button
                            onClick={handleStartSRSReview}
                            disabled={dueCardsCount === 0}
                            className={`relative px-10 py-5 rounded-2xl border-2 font-bold transition-all flex items-center gap-3 ${
                                dueCardsCount > 0 
                                    ? 'border-warning text-warning bg-warning/5 dark:bg-warning/10 shadow-md hover:scale-105' 
                                    : 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            <i className="fas fa-clock-rotate-left text-xl"></i>
                            <span className="uppercase tracking-widest">{t('setup.reviewDue', { count: dueCardsCount })}</span>
                            {dueCardsCount > 0 && (
                                <div className="absolute -top-3 -right-3 bg-error text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                    {dueCardsCount}
                                </div>
                            )}
                        </button>
                    );
                })()}
            </div>

                <div className="mt-8 text-center text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest opacity-50">
                    {t('setup.footerTagline')}
                </div>
            </div>
        </div>
    );
};
