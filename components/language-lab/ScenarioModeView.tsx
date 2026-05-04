import React, { useState, useEffect } from 'react';
import { isIOSDevice } from '../../hooks/useMediaRecorderTranscribe';
import { Tutor } from '../../types';
import { ScenarioStep } from '../../services/conversationService';

export const getScenarioThemes = (t: any) => [
    { id: 'restaurant', emoji: '🍝', label: t('lab.scenarios.themes.restaurant'), prompt: t('lab.scenarios.themes.prompts.restaurant') },
    { id: 'coffee', emoji: '☕', label: t('lab.scenarios.themes.coffee'), prompt: t('lab.scenarios.themes.prompts.coffee') },
    { id: 'hotel', emoji: '🏨', label: t('lab.scenarios.themes.hotel'), prompt: t('lab.scenarios.themes.prompts.hotel') },
    { id: 'market', emoji: '🍎', label: t('lab.scenarios.themes.market'), prompt: t('lab.scenarios.themes.prompts.market') },
    { id: 'direction', emoji: '🗺️', label: t('lab.scenarios.themes.direction'), prompt: t('lab.scenarios.themes.prompts.direction') },
    { id: 'meet', emoji: '🤝', label: t('lab.scenarios.themes.meet'), prompt: t('lab.scenarios.themes.prompts.meet') },
];

export interface ScenarioModeViewProps {
    labMode: string;
    t: (key: string) => string;
    tutor: Tutor | null;
    startScenario: (themePrompt: string) => void;
    handleExport: (format: 'md' | 'rtf') => void;
    isGeneratingScenario: boolean;
    activeScenario: ScenarioStep[];
    scenarioStepIndex: number;
    speak: (text: string) => void;
    handlePinMessage: (msg: any) => void;
    scenarioFeedback: 'waiting' | 'success' | 'retry';
    draftMessage: string;
    setLabMode: (mode: any) => void;
    showScenarioEndPrompt: boolean;
    setShowScenarioEndPrompt: (show: boolean) => void;
    // Response interface
    handleScenarioUserResponse: (text: string) => void;
    startListening: () => void;
    stopListening: () => void;
    listeningStatus: string;
}

export const ScenarioModeView: React.FC<ScenarioModeViewProps> = ({
    labMode,
    t,
    tutor,
    startScenario,
    handleExport,
    isGeneratingScenario,
    activeScenario,
    scenarioStepIndex,
    speak,
    handlePinMessage,
    scenarioFeedback,
    draftMessage,
    setLabMode,
    showScenarioEndPrompt,
    setShowScenarioEndPrompt,
    handleScenarioUserResponse,
    startListening,
    stopListening,
    listeningStatus,
}) => {
    const [showCustomScenarioModal, setShowCustomScenarioModal] = useState(false);
    const [customTopic, setCustomTopic] = useState('');

    // ── Local textarea state (découplé de draftMessage pour permettre la saisie manuelle) ──
    // draftMessage est mis à jour UNIQUEMENT par la transcription vocale.
    // textInput permet aussi l'edition manuelle entre deux sessions d'enregistrement.
    const [textInput, setTextInput] = useState('');
    useEffect(() => {
        // Sync depuis draftMessage quand un nouveau transcript arrive (ou reset)
        setTextInput(draftMessage);
    }, [draftMessage]);

    if (labMode !== 'scenario_list' && labMode !== 'scenario_play') {
        return null;
    }

    return (
        <>
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

            {/* SCENARIO PLAY MODE */}
            {labMode === 'scenario_play' && (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start p-6 bg-gray-50 dark:bg-gray-900 text-center pb-4">
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

                            {/* Draft live preview while recording */}
                            {draftMessage && listeningStatus === 'listening' && (
                                <div className="text-lg font-medium text-primary min-h-[30px] animate-pulse flex items-center gap-2 justify-center">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                    "{draftMessage}…"
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

                    {/* ── Response footer (only when waiting for user) ── */}
                    {!isGeneratingScenario && activeScenario[scenarioStepIndex] && scenarioFeedback !== 'success' && (
                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex items-end gap-2 relative z-20">
                            {/* Listening pulse */}
                            {listeningStatus === 'listening' && (
                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow border border-red-100 dark:border-red-900/30 text-red-500 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                    J'écoute…
                                </div>
                            )}
 
                            {/* iOS hint */}
                            {listeningStatus === 'listening' && typeof window !== 'undefined' && isIOSDevice() && (
                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow whitespace-nowrap">
                                    📱 Appuyez sur ⏹ pour transcrire
                                </div>
                            )}
                            <textarea
                                className={`flex-1 max-h-24 min-h-[44px] p-3 rounded-2xl border resize-none text-sm focus:outline-none transition-all
                                    bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white placeholder-gray-400
                                    ${listeningStatus === 'listening'
                                        ? 'border-red-300 dark:border-red-500/50 ring-2 ring-red-100 dark:ring-red-900/20'
                                        : 'border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/30'}`}
                                placeholder={listeningStatus === 'listening' ? 'J\'écoute… (appuyez ⏹ pour valider)' : 'Tapez ou parlez votre réponse…'}
                                value={textInput}
                                onChange={e => {
                                    if (listeningStatus !== 'listening' && listeningStatus !== 'processing') {
                                        setTextInput(e.target.value);
                                    }
                                }}
                                readOnly={listeningStatus === 'listening' || listeningStatus === 'processing'}
                                id="scenario-response-input"
                            />
 
                            {/* Mic */}
                            <button
                                onClick={listeningStatus === 'listening' ? stopListening : (listeningStatus === 'processing' ? undefined : startListening)}
                                disabled={listeningStatus === 'processing'}
                                className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all shadow
                                    ${listeningStatus === 'listening'
                                        ? 'bg-red-500 text-white animate-pulse'
                                        : listeningStatus === 'processing'
                                        ? 'bg-gray-400 text-white cursor-wait'
                                        : 'bg-primary text-white hover:bg-primary-dark active:scale-95'}`}
                                title={listeningStatus === 'listening' ? 'Arrêter' : listeningStatus === 'processing' ? 'Transcription...' : 'Parler'}
                            >
                                <i className={`fas fa-${listeningStatus === 'listening' ? 'stop' : listeningStatus === 'processing' ? 'spinner fa-spin' : 'microphone'} text-base`} />
                            </button>
 
                            {/* Send / Validate */}
                            <button
                                onClick={() => {
                                    const text = textInput.trim();
                                    if (text) handleScenarioUserResponse(text);
                                }}
                                disabled={(!textInput.trim() && listeningStatus !== 'listening') || listeningStatus === 'processing'}
                                className={`w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center transition-all shadow active:scale-95
                                    ${((!textInput.trim() && listeningStatus !== 'listening') || listeningStatus === 'processing')
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-green-500 text-white hover:bg-green-600'}`}
                                title="Valider ma réponse"
                            >
                                <i className="fas fa-check text-base" />
                            </button>
                        </div>
                    )}
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
        </>
    );
};
