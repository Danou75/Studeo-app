import React, { useState, useEffect, useRef } from 'react';
import { Tutor, Flashcard, FlashcardClassic, ConversationSession } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getThemeGradient } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';
import { FloatingHeaderToggle } from './ui/FloatingHeaderToggle';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTTS } from '../hooks/useTTS';
import { ChatMessage, generateLabResponse } from '../services/conversationService';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';
import { getLanguageCode } from '../utils/languageDetection';
import { isIOSDevice } from '../hooks/useMediaRecorderTranscribe';
import { VocabularyLabTab } from './VocabularyLabTab';
import { ShadowingLabTab } from './ShadowingLabTab';

// Views
import { ChatModeView } from './language-lab/ChatModeView';
import { ConversationModeView } from './language-lab/ConversationModeView';
import { PronunciationCoachView } from './language-lab/PronunciationCoachView';
import { ScenarioModeView } from './language-lab/ScenarioModeView';
import { StudyModeView } from './language-lab/StudyModeView';

// Hooks
import { useConversationMode } from './language-lab/hooks/useConversationMode';
import { usePronunciationCoach } from './language-lab/hooks/usePronunciationCoach';
import { useScenarioMode } from './language-lab/hooks/useScenarioMode';
import { useStudyMode } from './language-lab/hooks/useStudyMode';

interface LanguageLabScreenProps {
    tutor: Tutor | null;
    onBack: () => void;
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
    onSaveShadowingSession?: (session: import('../types').SavedShadowingSession) => void;
    initialShadowingSession?: import('../types').SavedShadowingSession;
}

export const LanguageLabScreen: React.FC<LanguageLabScreenProps> = ({
    tutor,
    onBack,
    onAddCards,
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
    onStartFlashcardQuiz,
    onSaveShadowingSession,
    initialShadowingSession,
}) => {
    const { config } = useAIConfig();
    const { showToast } = useToast();
    const { t } = useTranslation();
    const { themeMode, themeStyle } = useTheme();
    const [targetLang, setTargetLang] = useState(getLanguageCode(tutor));
    const [activeLang, setActiveLang] = useState(targetLang);
    const [labMode, setLabMode] = useState<'chat' | 'scenario_list' | 'scenario_play' | 'study' | 'pronunciation' | 'conversation_select' | 'conversation_active' | 'conversation_summary' | 'vocabulary' | 'shadowing'>('chat');

    // Chat Mode Stats
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draftMessage, setDraftMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Vocab session active (communiqué par VocabularyLabTab via onSessionActive)

    // Affichage temporaire du header pendant un exercice (bouton flottant)
    const [showHeaderOverride, setShowHeaderOverride] = useState(false);
    // Réinitialise l'override quand l'utilisateur navigue vers un autre onglet
    useEffect(() => { setShowHeaderOverride(false); }, [labMode]);

    useEffect(() => {
        const lang = getLanguageCode(tutor);
        setTargetLang(lang);
        setActiveLang(lang);
    }, [tutor]);

    // TTS & Speech — pass tutor.id so each professor keeps its own voice preference
    const { speak, availableVoices, selectedVoice, setSelectedVoice } = useTTS(activeLang, tutor?.id);
    const [showVoicePanel, setShowVoicePanel] = useState(false);
    
    // We only need speech recognition for the active screen
    const { 
        transcript, 
        status: listeningStatus, 
        startListening, 
        stopListening, 
        resetTranscript 
    } = useSpeechRecognition(activeLang);

    // Link transcript to draft message — fire on ANY transcript change
    // (covers both native webkitSpeechRecognition and iOS PWA MediaRecorder fallback
    // where the transcript is set async after status already returned to 'idle').
    useEffect(() => {
        if (transcript) setDraftMessage(transcript);
    }, [transcript]);

    // Auto-verify pronunciation when the mic stops and a transcript is ready.
    const prevListeningStatusRef = useRef(listeningStatus);
    useEffect(() => {
        const wasActive =
            prevListeningStatusRef.current === 'listening' ||
            prevListeningStatusRef.current === 'processing';
        const isNowIdle = listeningStatus === 'idle';
        if (wasActive && isNowIdle && transcript && labMode === 'pronunciation') {
            pronunModeProps.verifyPronunciation(transcript);
        }
        prevListeningStatusRef.current = listeningStatus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listeningStatus]);

    // Cleanup TTS on unmount or tutor change
    useEffect(() => { 
        return () => { window.speechSynthesis.cancel(); }; 
    }, [tutor]);

    // Restores etc...
    useEffect(() => {
        if (initialVocabList) {
            setLabMode('vocabulary');
        }
    }, [initialVocabList?.id]);

    useEffect(() => {
        if (initialShadowingSession) {
            setLabMode('shadowing');
        }
    }, [initialShadowingSession?.id]);

    useEffect(() => {
        if (!initialSession && !initialVocabList && vocabLabCache && vocabLabCache['__active_theme__']) {
            setLabMode('vocabulary');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Flashcards
    const handlePinMessage = (msg: ChatMessage) => {
        if (msg.role !== 'assistant') return;
        const parts = msg.content.split('|||');
        const term = parts[0].trim();
        const def = parts.length > 1 ? parts[1].trim() : '';
        if (!term) return;

        const newCard: FlashcardClassic = {
            id: uuidv4(),
            type: 'classic',
            terms: {
                [activeLang.substring(0, 2)]: term, 
                'fr': def || t('lab.noTranslate')
            }
        };

        const targetSetName = t('lab.study.vocabSet', { lang: activeLang.substring(0, 2).toUpperCase() });
        // Correctly typecast since we pass exactly Flashcard interface fields
        onAddCards([newCard as any], targetSetName);
        showToast(t('lab.addedToSet', { name: targetSetName }), 'success');
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || !tutor) return;
        const userMsg: ChatMessage = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);
        setDraftMessage('');
        resetTranscript();
        
        try {
            const responseText = await generateLabResponse(
                tutor, messages, text, config,
                { enableCorrection: false, activeLanguage: activeLang, conversationTheme: '' }
            );
            const aiMsg: ChatMessage = { role: 'assistant', content: responseText };
            setMessages(prev => [...prev, aiMsg]);
            speak(responseText.split('|||')[0].replace(/\[.*?\]/g, '').trim());
            
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'system', content: t('lab.chat.errorConnection') }]);
        } finally {
            setIsProcessing(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    // Sub-Modes Hooks
    const studyModeProps = useStudyMode({ t, showToast, activeLang, config, tutor, onAddCards: (cards, name) => onAddCards(cards as any, name) });
    const scenarioModeProps = useScenarioMode(tutor, config, activeLang, speak, resetTranscript, setDraftMessage, showToast, t, setLabMode);
    const pronunModeProps = usePronunciationCoach({ activeLang, config, showToast, t });
    const convModeProps = useConversationMode(
        tutor, config, activeLang, speak, resetTranscript, setDraftMessage, () => {}, showToast, t, setLabMode, setIsProcessing, targetedLessonsProps, onSetTargetedLessonsProps, onClearAiGenCache, onUpdateSession, initialSession, labMode
    );

    if (!tutor) return null;

    const bgGradient = getThemeGradient(themeStyle, themeMode);
    const isDark = themeMode === 'dark';
    const isLightHeader = !isDark && themeStyle === 'apple';

    // Masquer le header pendant les exercices actifs pour gagner de l'espace sur petit écran.
    // Pour le chat : seulement quand une conversation est en cours (messages > 0).
    const isExerciseActive =
        (labMode === 'chat' && messages.length > 0) ||
        labMode === 'scenario_play' ||
        labMode === 'conversation_active' ||
        labMode === 'shadowing' ||
        labMode === 'pronunciation' ||
        labMode === 'vocabulary';

    return (
        <div className={`h-full flex flex-col ${isDark ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>

            {/* Bouton flottant — affiche/masque les onglets pendant un exercice */}
            {isExerciseActive && (
                <FloatingHeaderToggle 
                    showHeader={showHeaderOverride} 
                    onToggle={() => setShowHeaderOverride(v => !v)} 
                />
            )}

            {/* Header principal — masqué pendant un exercice, révélé via le bouton flottant */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isExerciseActive && !showHeaderOverride ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-80 opacity-100'
            }`}>
            <div 
                className={`pt-12 pb-4 px-6 ${isLightHeader ? 'text-gray-900' : 'text-white'} shadow-md relative z-10 rounded-b-3xl`}
                style={{ background: bgGradient }}
            >
                <div className="flex justify-between items-center mb-6">
                    <button onClick={onBack} className={`w-10 h-10 ${isLightHeader ? 'bg-black/5 hover:bg-black/10' : 'bg-white/20 hover:bg-white/30'} backdrop-blur-md rounded-full flex items-center justify-center transition-colors`}>
                        <i className="fas fa-chevron-left" />
                    </button>
                    <div className="flex-1 text-center">
                        <h1 className="font-extrabold text-xl tracking-tight leading-none drop-shadow-sm">{t('lab.title')}</h1>
                        <p className={`text-xs font-medium ${isLightHeader ? 'text-gray-700/80' : 'text-white/80'} mt-1 flex items-center justify-center gap-1`}>
                            <i className="fas fa-robot opacity-70"></i> {tutor.name}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(labMode === 'vocabulary' || labMode === 'shadowing') && onNavigateToCurriculum ? (
                            <button onClick={onNavigateToCurriculum} title="Mes Leçons & Programmes" className={`w-10 h-10 ${isLightHeader ? 'bg-black/5 hover:bg-black/10' : 'bg-white/20 hover:bg-white/30'} backdrop-blur-md rounded-full flex items-center justify-center transition-colors`}>
                                <i className="fas fa-book-open" />
                            </button>
                        ) : null}

                        {/* Voice selector — for all AI-speaking modes except shadowing (which has its own) */}
                        {labMode !== 'vocabulary' && labMode !== 'shadowing' && availableVoices.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowVoicePanel(v => !v)}
                                    title="Voix du professeur"
                                    className={`h-10 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                                        isLightHeader ? 'bg-black/5 hover:bg-black/10 text-gray-800' : 'bg-white/20 hover:bg-white/30 text-white'
                                    }`}
                                >
                                    <i className="fas fa-volume-up text-sm" />
                                    <span className="max-w-[70px] truncate hidden sm:inline">{selectedVoice?.name.split(' ')[0] ?? '…'}</span>
                                    <i className="fas fa-chevron-down text-[9px] opacity-70" />
                                </button>

                                {showVoicePanel && (
                                    <>
                                        {/* Backdrop */}
                                        <div className="fixed inset-0 z-40" onClick={() => setShowVoicePanel(false)} />
                                        {/* Panel */}
                                        <div className="absolute top-12 right-0 w-60 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl overflow-hidden">
                                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Voix ({activeLang.toUpperCase()})</span>
                                                <button onClick={() => setShowVoicePanel(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-6 h-6 flex items-center justify-center">
                                                    <i className="fas fa-times text-xs" />
                                                </button>
                                            </div>
                                            <div className="max-h-52 overflow-y-auto">
                                                {availableVoices.map(v => (
                                                    <button
                                                        key={v.name}
                                                        onClick={() => { setSelectedVoice(v); setShowVoicePanel(false); }}
                                                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-all hover:bg-gray-50 dark:hover:bg-gray-700/60 ${
                                                            selectedVoice?.name === v.name
                                                                ? 'bg-primary/5 dark:bg-primary/10 text-primary font-semibold'
                                                                : 'text-gray-700 dark:text-gray-300'
                                                        }`}
                                                    >
                                                        <i className={`fas fa-${selectedVoice?.name === v.name ? 'check-circle text-primary' : 'circle text-gray-200 dark:text-gray-600'} text-[11px] flex-shrink-0`} />
                                                        <span className="truncate flex-1">{v.name}</span>
                                                        {v.localService && <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">local</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {onNavigateToSettings ? (
                            <button onClick={onNavigateToSettings} className={`w-10 h-10 ${isLightHeader ? 'bg-black/5 hover:bg-black/10' : 'bg-white/20 hover:bg-white/30'} backdrop-blur-md rounded-full flex items-center justify-center transition-colors`}>
                                <i className="fas fa-cog" />
                            </button>
                        ) : (
                            <div className="w-10 h-10" />
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/10 backdrop-blur-md p-1 rounded-2xl gap-1 overflow-x-auto no-scrollbar scroll-smooth snap-x">
                    {[
                        { id: 'chat', icon: 'comments', label: t('lab.tabs.chat') },
                        { id: 'conversation_select', icon: 'microphone-alt', label: t('lab.tabs.conversation') },
                        { id: 'scenario_list', icon: 'theater-masks', label: t('lab.tabs.scenarios') },
                        { id: 'study', icon: 'book-open', label: t('lab.tabs.study') },
                        { id: 'pronunciation', icon: 'bullhorn', label: t('lab.tabs.prononciation') },
                        { id: 'vocabulary', icon: 'spell-check', label: t('lab.tabs.vocab') },
                        { id: 'shadowing', icon: 'wave-square', label: 'Shadowing' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (tab.id === 'conversation_select') {
                                    setLabMode(convModeProps.convSummary ? 'conversation_summary' : convModeProps.convMessages.length > 0 ? 'conversation_active' : 'conversation_select');
                                } else if (tab.id === 'scenario_list') {
                                    setLabMode(scenarioModeProps.activeScenario.length > 0 ? 'scenario_play' : 'scenario_list');
                                } else {
                                    setLabMode(tab.id as any);
                                }
                            }}
                            className={`snap-start flex-1 min-w-[90px] py-2 px-3 rounded-xl flex flex-col items-center gap-1 transition-all duration-300 ${
                                labMode.startsWith(tab.id.split('_')[0]) 
                                    ? (isLightHeader ? 'bg-gray-800 text-white shadow-sm scale-100 font-bold' : 'bg-white text-gray-900 shadow-sm scale-100 font-bold') 
                                    : (isLightHeader ? 'text-gray-700 hover:bg-black/5 opacity-80 scale-95 font-medium' : 'text-white hover:bg-white/10 opacity-80 scale-95 font-medium')
                            }`}
                        >
                            <i className={`fas fa-${tab.icon} ${labMode.startsWith(tab.id.split('_')[0]) && !isLightHeader ? 'text-primary' : ''} text-lg mb-0.5`} />
                            <span className="text-[10px] whitespace-nowrap">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            {/* Fin header principal */}
            </div>

            {/* Content Area */}
            {labMode === 'chat' && (
                <>
                    <ChatModeView
                        labMode={labMode}
                        messages={messages}
                        draftMessage={draftMessage}
                        setDraftMessage={setDraftMessage}
                        listeningStatus={listeningStatus}
                        isProcessing={isProcessing}
                        speak={speak}
                        handlePinMessage={handlePinMessage as any}
                        handleSendMessage={handleSendMessage}
                        messagesEndRef={messagesEndRef}
                        t={t}
                    />
                    {/* Controls Footer */}
                    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-8 flex items-end gap-2 relative z-20">
                        {listeningStatus === 'listening' && (
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg border border-red-100 dark:border-red-900/30 flex items-center gap-3 animate-fade-in-up">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-red-500"></div>
                                    <div className="w-1.5 h-1.5 rounded-full animate-bounce delay-75 bg-red-500"></div>
                                    <div className="w-1.5 h-1.5 rounded-full animate-bounce delay-150 bg-red-500"></div>
                                </div>
                                <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                                    {t('lab.chat.listening')}
                                </span>
                            </div>
                        )}
                        {/* Hint iOS : appuyer sur ⏹ pour transcrire */}
                        {listeningStatus === 'listening' && typeof window !== 'undefined' && isIOSDevice() && (
                            <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow whitespace-nowrap">
                                📱 Appuyez sur ⏹ pour transcrire
                            </div>
                        )}
                        <textarea
                            className={`flex-[3] max-h-32 min-h-[50px] p-3 rounded-2xl border transition-all resize-none shadow-inner text-sm focus:outline-none ${isDark ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-primary/20 focus:border-primary/30'} ${listeningStatus === 'listening' ? 'border-red-300 dark:border-red-500/50 ring-4 ring-red-50 dark:ring-red-900/20' : ''}`}
                            placeholder={listeningStatus === 'listening' ? t('lab.chat.listening') : t('lab.chat.inputPlaceholder')}
                            value={draftMessage}
                            onChange={(e) => setDraftMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(draftMessage);
                                }
                            }}
                            disabled={isProcessing}
                        />
                        <button
                            onClick={listeningStatus === 'listening' ? stopListening : (listeningStatus === 'processing' ? undefined : startListening)}
                            disabled={listeningStatus === 'processing'}
                            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all flex-shrink-0 shadow-sm ${
                                listeningStatus === 'listening' ? 'bg-red-500 text-white animate-pulse' : 
                                listeningStatus === 'processing' ? 'bg-gray-400 text-white cursor-wait' : 
                                'bg-primary text-white hover:bg-primary-dark active:scale-95'
                            }`}
                            title={listeningStatus === 'listening' ? "Arrêter d'écouter" : listeningStatus === 'processing' ? "Transcription en cours..." : "Parler"}
                        >
                            <i className={`fas fa-${listeningStatus === 'listening' ? 'stop' : listeningStatus === 'processing' ? 'spinner fa-spin' : 'microphone'} text-lg`} />
                        </button>
                        <button
                            onClick={() => handleSendMessage(draftMessage)}
                            disabled={!draftMessage.trim() || isProcessing}
                            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all flex-shrink-0 active:scale-95 shadow-sm ${!draftMessage.trim() || isProcessing ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        >
                            <i className="fas fa-paper-plane text-[15px]" />
                        </button>
                    </div>
                </>
            )}

            {labMode.startsWith('conversation') && (
                <ConversationModeView
                    labMode={labMode}
                    tutor={tutor as any}
                    activeLang={activeLang}
                    listeningStatus={listeningStatus}
                    startListening={startListening}
                    stopListening={stopListening}
                    draftMessage={draftMessage}
                    setDraftMessage={setDraftMessage}
                    speak={speak}
                    handlePinMessage={handlePinMessage}
                    startScenario={scenarioModeProps.startScenario}
                    setLabMode={setLabMode}
                    showToast={showToast}
                    handleExport={() => {}}
                    onSaveConvSession={onSaveConvSession}
                    onLaunchAIGenerator={onLaunchAIGenerator}
                    {...convModeProps}
                />
            )}

            {labMode.startsWith('scenario') && (
                <ScenarioModeView
                    labMode={labMode}
                    tutor={tutor}
                    speak={speak}
                    handlePinMessage={handlePinMessage}
                    handleExport={() => {}}
                    draftMessage={draftMessage}
                    setLabMode={setLabMode}
                    listeningStatus={listeningStatus}
                    startListening={startListening}
                    stopListening={stopListening}
                    t={t as any}
                    {...scenarioModeProps}
                />
            )}

            {labMode === 'study' && (
                <StudyModeView t={t as any} {...studyModeProps} />
            )}
            
            {labMode === 'pronunciation' && (
                <PronunciationCoachView 
                    listeningStatus={listeningStatus}
                    startListening={startListening}
                    stopListening={stopListening}
                    activeLang={activeLang}
                    transcript={transcript}
                    resetTranscript={resetTranscript}
                    speak={speak}
                    t={t as any}
                    {...pronunModeProps}
                />
            )}

            {labMode === 'vocabulary' && (
                <VocabularyLabTab 
                    config={config}
                    activeLang={activeLang}
                    onAddCards={onAddCards}
                    onSaveVocabList={onSaveVocabList}
                    initialVocab={initialVocabList}
                    vocabLabCache={vocabLabCache}
                    onSetVocabLabCache={onSetVocabLabCache}
                    tutorId={tutor.id}
                    onLaunchQuiz={onStartFlashcardQuiz}
                />
            )}

            {labMode === 'shadowing' && (
                <ShadowingLabTab
                    config={config}
                    activeLang={activeLang}
                    tutor={tutor}
                    onSaveSession={onSaveShadowingSession}
                    initialSession={initialShadowingSession}
                />
            )}
        </div>
    );
};
