/**
 * ConversationSummaryView.tsx — Bilan de causerie + plan de révision personnalisé.
 * Extrait de ConversationModeView pour le mode `conversation_summary`.
 */
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ConversationSummary, LessonSuggestion } from '../../services/conversationService';
import { Tutor, ConversationSession } from '../../types';
import { RemedialLessonModal } from './RemedialLessonModal';

export interface ConversationSummaryViewProps {
    tutor:                      Tutor | null;
    activeLang:                 string;
    convTheme:                  string;
    convThemeLabel:             string;
    convMessages:               ChatMessage[];
    convSummary:                ConversationSummary | null;
    isGeneratingSummary:        boolean;
    isGeneratingLesson:         boolean;
    remedialMessages:           ChatMessage[];
    setRemedialMessages:        (msgs: ChatMessage[]) => void;
    remedialKey:                number;
    remedialDraft:              string;
    setRemedialDraft:           (v: string) => void;
    isSendingRemedial:          boolean;
    showRemedialModal:          boolean;
    setShowRemedialModal:       (b: boolean) => void;
    onSaveConvSession?:         (session: ConversationSession) => void;
    onLaunchAIGenerator?:       (topic: string, mode?: 'quiz' | 'lesson' | 'curriculum' | 'mixed-quiz', context?: string) => void;
    showToast:                  (msg: string, type: 'success' | 'error' | 'info') => void;
    handleExport:               (format: 'md' | 'rtf') => void;
    handleGenerateLesson:       () => void;
    handleEndConversation:      () => void;
    handleStartTargetedLesson:  (prompt: string, key: string) => void;
    handleSendRemedialMessage:  () => void;
    startConversation:          (theme: string, themeLabel: string) => void;
    startScenario:              (themePrompt: string) => void;
    setLabMode:                 (mode: any) => void;
}

export const ConversationSummaryView: React.FC<ConversationSummaryViewProps> = ({
    tutor,
    activeLang,
    convTheme,
    convThemeLabel,
    convMessages,
    convSummary,
    isGeneratingSummary,
    isGeneratingLesson,
    remedialMessages,
    setRemedialMessages,
    remedialKey,
    remedialDraft,
    setRemedialDraft,
    isSendingRemedial,
    showRemedialModal,
    setShowRemedialModal,
    onSaveConvSession,
    onLaunchAIGenerator,
    showToast,
    handleExport,
    handleGenerateLesson,
    handleEndConversation,
    handleStartTargetedLesson,
    handleSendRemedialMessage,
    startConversation,
    startScenario,
    setLabMode,
}) => {
    const [showFullTranscript, setShowFullTranscript] = React.useState(false);

    const buildSession = (): ConversationSession => ({
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
    });

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 bg-gray-50 dark:bg-gray-900">
                {isGeneratingSummary ? (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                        <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-primary font-medium animate-pulse">Analyse de ta session en cours…</p>
                        <p className="text-xs text-text-muted">Cela peut prendre quelques secondes</p>
                    </div>
                ) : convSummary ? (
                    <div className="max-w-lg mx-auto space-y-5 animate-fade-in-up pb-10">

                        {/* Transcript toggle */}
                        <div className="text-center">
                            <button
                                onClick={() => setShowFullTranscript(v => !v)}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-2 justify-center mx-auto bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 transition-colors"
                            >
                                <i className={`fas fa-${showFullTranscript ? 'eye-slash' : 'eye'}`} />
                                {showFullTranscript ? 'Masquer le transcript complet' : "Relire l'intégralité de la causerie"}
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

                        {/* Fluency score */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center">
                            <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Score de fluidité</p>
                            <div className={`text-7xl font-black mb-1 ${convSummary.fluency_score >= 75 ? 'text-green-500' : convSummary.fluency_score >= 50 ? 'text-yellow-500' : 'text-orange-500'}`}>
                                {convSummary.fluency_score > 0 ? convSummary.fluency_score : '—'}
                            </div>
                            <p className="text-text-muted text-sm">/ 100</p>
                            {convSummary.strong_points.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                    {convSummary.strong_points.map((pt: string, i: number) => (
                                        <span key={i} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium">✓ {pt}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Corrections */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-orange-600">
                                <i className="fas fa-graduation-cap" /> Corrections
                            </h3>
                            {convSummary.errors.length > 0 ? (
                                <div className="space-y-3">
                                    {convSummary.errors.map((err: any, i: number) => (
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

                        {/* Vocabulaire clé */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-blue-600">
                                <i className="fas fa-book-open" /> Vocabulaire clé
                            </h3>
                            {convSummary.vocabulary.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {convSummary.vocabulary.map((v: any, i: number) => (
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
                                        onClick={() => handleStartTargetedLesson(
                                            `Je veux faire un exercice pour m'approprier ce vocabulaire : ${convSummary.vocabulary.map((v: any) => `${v.word} (${v.translation})`).join(', ')}. Propose-moi un quiz interactif (QCM ou phrases à compléter) pour vérifier si je maîtrise ces mots.`,
                                            'vocab_key'
                                        )}
                                        className="w-full py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800"
                                    >
                                        <i className="fas fa-tasks" /> S'entraîner sur ce vocabulaire (Leçon)
                                    </button>
                                    {onLaunchAIGenerator && (
                                        <button
                                            onClick={() => onLaunchAIGenerator(
                                                `Mots : ${convSummary.vocabulary.map((v: any) => v.word).join(', ')}`,
                                                'quiz',
                                                `ajoute d'autres mots à ce vocabulaire dont le thème général est: ${convThemeLabel || convTheme || 'Causerie libre'}`
                                            )}
                                            className="w-full py-2.5 bg-primary/10 dark:bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-primary/30 dark:border-primary"
                                        >
                                            <i className="fas fa-layer-group" /> Quiz complet des mots avec le générateur IA
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Points à travailler */}
                        {convSummary.error_patterns && convSummary.error_patterns.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-5 py-5 border border-amber-200 dark:border-amber-800">
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3">⚠️ Points à travailler</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {convSummary.error_patterns.map((pattern: string, i: number) => (
                                        <span key={i} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-3 py-1 rounded-full text-xs font-medium">{pattern}</span>
                                    ))}
                                </div>
                                <button
                                    onClick={() => handleStartTargetedLesson(
                                        `Je voudrais que tu m'expliques et me fasses travailler ces points faibles : ${convSummary.error_patterns!.join(', ')}. Fais un exercice ciblé pour chaque point.`,
                                        'patterns_key'
                                    )}
                                    className="w-full py-2.5 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-amber-200 dark:border-amber-700"
                                >
                                    <i className="fas fa-bolt" /> Étudier ces points spécifiques
                                </button>
                            </div>
                        )}

                        {/* Plan de révision */}
                        {convSummary.lesson_suggestions && convSummary.lesson_suggestions.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-bold text-text flex items-center gap-2 text-sm">
                                    <i className="fas fa-graduation-cap text-primary" /> Plan de révision personnalisé
                                </h3>
                                {convSummary.lesson_suggestions.map((lesson: LessonSuggestion, i: number) => (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                        {lesson.type === 'vocabulary' && (
                                            <>
                                                <div className="flex items-center gap-2 mb-3"><span className="text-2xl">📚</span><h4 className="font-bold text-sm">{lesson.title}</h4></div>
                                                {lesson.vocabulary_words && lesson.vocabulary_words.length > 0 ? (
                                                    <div className="space-y-2 mb-3">
                                                        {lesson.vocabulary_words.map((v: any, j: number) => (
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
                                                            onClick={() => handleStartTargetedLesson(
                                                                `Je veux apprendre et réviser ce vocabulaire suggéré : ${lesson.vocabulary_words!.map((v: any) => `${v.word} (${v.translation})`).join(', ')}. Fais-moi une leçon rapide suivie d'un quiz pour vérifier mes connaissances.`,
                                                                `vocab_lesson_${i}`
                                                            )}
                                                            className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-blue-200 dark:border-blue-800"
                                                        >
                                                            <i className="fas fa-graduation-cap" /> Exercice sur ce vocabulaire (Leçon)
                                                        </button>
                                                        {onLaunchAIGenerator && (
                                                            <button
                                                                onClick={() => onLaunchAIGenerator(
                                                                    `Révision : ${lesson.vocabulary_words!.map((v: any) => v.word).join(', ')}`,
                                                                    'quiz',
                                                                    `ajoute d'autres mots à ce vocabulaire dont le thème général est: ${convThemeLabel || convTheme || 'Causerie libre'}`
                                                                )}
                                                                className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-primary/30"
                                                            >
                                                                <i className="fas fa-layer-group" /> Quiz complet des mots avec le générateur IA
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
                                                    onClick={() => handleStartTargetedLesson(
                                                        `Je veux comprendre parfaitement cette règle de grammaire : "${lesson.grammar_focus!.rule}". Explication originale : ${lesson.grammar_focus!.explanation}. Explique-moi cela avec 3 nouveaux exemples très clairs, puis fais-moi passer un test de compréhension là-dessus.`,
                                                        `grammar_lesson_${i}`
                                                    )}
                                                    className="w-full py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-gray-600"
                                                >
                                                    <i className="fas fa-pencil-ruler" /> Exercice sur cette règle
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
                                                    onClick={() => {
                                                        if (lesson.scenario_prompt) {
                                                            setLabMode('scenario_list');
                                                            setTimeout(() => startScenario(lesson.scenario_prompt!), 100);
                                                        }
                                                    }}
                                                    className="w-full py-2.5 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
                                                >
                                                    <i className="fas fa-play-circle" /> Lancer ce scénario
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Prochaine causerie suggérée */}
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
                                    onClick={() => { if (tutor) startConversation(convSummary.next_theme_suggestion!, convSummary.next_theme_suggestion!); }}
                                    className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm shadow-primary/30"
                                >
                                    <i className="fas fa-comments" /> Lancer cette causerie
                                </button>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => {
                                    if (remedialMessages.length === 0) handleGenerateLesson();
                                    else setShowRemedialModal(true);
                                }}
                                disabled={isGeneratingLesson}
                                className="w-full py-4 rounded-xl bg-primary/10 dark:bg-primary/30 text-primary font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 border border-primary/30 dark:border-primary shadow-sm"
                            >
                                {isGeneratingLesson ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-magic" />}
                                {isGeneratingLesson ? 'Création de votre leçon...' : (remedialMessages.length > 0 ? 'Continuer ma leçon dynamique' : 'Générer une leçon de consolidation ciblée')}
                            </button>

                            {onSaveConvSession && (
                                <button
                                    onClick={() => {
                                        onSaveConvSession(buildSession());
                                        showToast('Causerie sauvegardée dans "Mes Leçons & Programmes" !', 'success');
                                    }}
                                    className="w-full py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2 border border-green-200 dark:border-green-800 text-sm"
                                >
                                    <i className="fas fa-save" /> Sauvegarder cette causerie
                                </button>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => handleExport('md')} className="flex-1 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-2 border border-blue-100 dark:border-blue-800">
                                    <i className="fab fa-markdown" /> Exporter
                                </button>
                                <button
                                    onClick={() => { setLabMode('conversation_select'); setRemedialMessages([]); }}
                                    className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 shadow-md"
                                >
                                    <i className="fas fa-redo" /> Nouvelle causerie
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

            {/* Remedial lesson modal */}
            {showRemedialModal && (
                <RemedialLessonModal
                    tutor={tutor}
                    activeLang={activeLang}
                    convTheme={convTheme}
                    convThemeLabel={convThemeLabel}
                    convMessages={convMessages}
                    convSummary={convSummary}
                    remedialMessages={remedialMessages}
                    remedialKey={remedialKey}
                    remedialDraft={remedialDraft}
                    setRemedialDraft={setRemedialDraft}
                    isSendingRemedial={isSendingRemedial}
                    handleSendRemedialMessage={handleSendRemedialMessage}
                    setShowRemedialModal={setShowRemedialModal}
                    onSaveConvSession={onSaveConvSession}
                    showToast={showToast}
                />
            )}
        </>
    );
};
