/**
 * RemedialLessonModal.tsx — Modal de leçon interactive (remedial).
 * Extrait de ConversationModeView. S'ouvre depuis ConversationSummaryView.
 */
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ConversationSummary } from '../../services/conversationService';
import { Tutor, ConversationSession } from '../../types';
import { InteractiveMessageRenderer } from './MessageRenderers';

export interface RemedialLessonModalProps {
    tutor:                  Tutor | null;
    activeLang:             string;
    convTheme:              string;
    convThemeLabel:         string;
    convMessages:           ChatMessage[];
    convSummary:            ConversationSummary | null;
    remedialMessages:       ChatMessage[];
    remedialKey:            number;
    remedialDraft:          string;
    setRemedialDraft:       (v: string) => void;
    isSendingRemedial:      boolean;
    handleSendRemedialMessage: () => void;
    setShowRemedialModal:   (b: boolean) => void;
    onSaveConvSession?:     (session: ConversationSession) => void;
    showToast:              (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RemedialLessonModal: React.FC<RemedialLessonModalProps> = ({
    tutor,
    activeLang,
    convTheme,
    convThemeLabel,
    convMessages,
    convSummary,
    remedialMessages,
    remedialKey,
    remedialDraft,
    setRemedialDraft,
    isSendingRemedial,
    handleSendRemedialMessage,
    setShowRemedialModal,
    onSaveConvSession,
    showToast,
}) => {
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
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-3xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-primary/30 dark:border-primary">

                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-primary/10 dark:bg-primary/30">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowRemedialModal(false)}
                            className="text-primary dark:text-primary hover:text-primary dark:hover:text-primary/80 transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-white dark:bg-gray-800/50 px-3 py-2 rounded-xl border border-primary/30 dark:border-primary shadow-sm"
                        >
                            <i className="fas fa-chevron-left text-[10px]" />
                            <span>Retour</span>
                        </button>
                        <h3 className="font-bold text-lg text-primary dark:text-primary m-0 p-0 hidden sm:flex items-center gap-2">
                            <i className="fas fa-book-reader" /> Leçon interactive : {tutor?.name}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {onSaveConvSession && (
                            <button
                                onClick={() => {
                                    onSaveConvSession(buildSession());
                                    showToast('Causerie + leçon sauvegardées !', 'success');
                                }}
                                title="Sauvegarder la causerie et la leçon"
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-sm font-bold flex items-center gap-1.5"
                            >
                                <i className="fas fa-save" /> <span className="hidden sm:inline">Sauvegarder</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowRemedialModal(false)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <i className="fas fa-times text-xl" />
                        </button>
                    </div>
                </div>

                {/* Chat scroll area */}
                <div key={remedialKey} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-gray-50/50 dark:bg-gray-900/50">
                    {remedialMessages.map((msg, i) => (
                        <div key={`${remedialKey}-${i}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-4 sm:p-5 text-sm sm:text-base ${
                                msg.role === 'user'
                                    ? 'bg-primary text-white rounded-2xl rounded-tr-sm max-w-[85%]'
                                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-2xl rounded-tl-sm text-text max-w-none w-full remedial-md'
                            }`}>
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
                                <i className="fas fa-circle-notch fa-spin text-primary text-lg" />
                            </div>
                        </div>
                    )}
                    <div id="remedial-box-end" />
                </div>

                {/* Input */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <div className="flex gap-2 items-end max-w-4xl mx-auto relative">
                        <textarea
                            value={remedialDraft}
                            onChange={e => setRemedialDraft(e.target.value)}
                            onKeyDown={e => {
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
                            className="absolute right-2 bottom-2 bg-primary text-white rounded-xl w-10 h-10 flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 hover:scale-105 transition-all shadow-md"
                        >
                            <i className="fas fa-paper-plane text-sm" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
