/**
 * ConversationActiveView.tsx — Chat en cours de causerie.
 * Extrait de ConversationModeView pour le mode `conversation_active`.
 */
import React from 'react';
import { ChatMessage } from '../../services/conversationService';
import { LabMessageBubble } from './LabMessageBubble';

export interface ConversationActiveViewProps {
    convThemeLabel:        string;
    convTimerMinutes:      number;
    convTimeLeft:          number;
    isGeneratingOpener:    boolean;
    convMessages:          ChatMessage[];
    draftMessage:          string;
    setDraftMessage:       (msg: string) => void;
    listeningStatus:       string;
    convMessagesEndRef:    React.RefObject<HTMLDivElement>;
    speak:                 (text: string) => void;
    handlePinMessage:      (msg: any) => void;
    handleSendConvMessage: (text: string) => void;
    handleEndConversation: () => void;
    startListening:        () => void;
    stopListening:         () => void;
}

export const ConversationActiveView: React.FC<ConversationActiveViewProps> = ({
    convThemeLabel,
    convTimerMinutes,
    convTimeLeft,
    isGeneratingOpener,
    convMessages,
    draftMessage,
    setDraftMessage,
    listeningStatus,
    convMessagesEndRef,
    speak,
    handlePinMessage,
    handleSendConvMessage,
    handleEndConversation,
    startListening,
    stopListening,
}) => {
    const isListening = listeningStatus === 'listening';

    const handleSend = () => {
        if (!draftMessage.trim()) return;
        handleSendConvMessage(draftMessage);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            {/* ── Scrollable messages area ── */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-4 min-h-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold">
                        <i className="fas fa-comments" /> {convThemeLabel}
                    </div>

                    {convTimerMinutes > 0 && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${convTimeLeft <= 30 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                            <i className="fas fa-stopwatch" />
                            {Math.floor(convTimeLeft / 60)}:{(convTimeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    )}

                    <button
                        onClick={handleEndConversation}
                        className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors shadow-sm"
                    >
                        <i className="fas fa-flag-checkered mr-1" /> Terminer
                    </button>
                </div>

                {/* Typing indicator */}
                {isGeneratingOpener && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none px-5 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-100" />
                                <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce delay-200" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages */}
                {convMessages.map((msg, idx) => (
                    <LabMessageBubble
                        key={idx}
                        msg={msg}
                        onSpeak={speak}
                        onPin={handlePinMessage}
                        onSuggestionClick={handleSendConvMessage}
                    />
                ))}

                {/* Live draft preview while recording */}
                {isListening && draftMessage && (
                    <div className="flex w-full justify-end animate-fade-in-up">
                        <div className="max-w-[85%] rounded-2xl rounded-br-none px-4 py-3 shadow-sm bg-primary/5 border border-primary/30 text-primary">
                            <div className="flex items-center gap-2">
                                <span className="animate-pulse w-2 h-2 rounded-full bg-red-500" />
                                <span>{draftMessage}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={convMessagesEndRef} />
            </div>

            {/* ── Input footer ── */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-safe flex items-end gap-2 relative z-20">
                {/* Listening animation */}
                {isListening && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 px-4 py-1.5 rounded-full shadow-lg border border-red-100 dark:border-red-900/30 flex items-center gap-2 animate-fade-in-up text-xs font-bold text-red-500 uppercase tracking-widest">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce delay-75" />
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce delay-150" />
                        </div>
                        J'écoute…
                    </div>
                )}

                <textarea
                    className={`flex-1 max-h-28 min-h-[44px] p-3 rounded-2xl border resize-none text-sm focus:outline-none transition-all shadow-inner
                        bg-gray-50 dark:bg-gray-700/50 text-gray-800 dark:text-white placeholder-gray-400
                        ${isListening ? 'border-red-300 dark:border-red-500/50 ring-2 ring-red-100 dark:ring-red-900/20' : 'border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-primary/30 focus:border-primary/40'}`}
                    placeholder={isListening ? 'J\'écoute…' : 'Répondez en ' + convThemeLabel.split(' ')[0] + '…'}
                    value={draftMessage}
                    onChange={e => setDraftMessage(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    rows={1}
                />

                {/* Mic button */}
                <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center transition-all shadow-sm
                        ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-primary text-white hover:bg-primary-dark active:scale-95'}`}
                    title={isListening ? 'Arrêter' : 'Parler'}
                >
                    <i className={`fas fa-${isListening ? 'stop' : 'microphone'} text-base`} />
                </button>

                {/* Send button */}
                <button
                    onClick={handleSend}
                    disabled={!draftMessage.trim()}
                    className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center transition-all shadow-sm active:scale-95
                        ${!draftMessage.trim() ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    title="Envoyer"
                >
                    <i className="fas fa-paper-plane text-sm" />
                </button>
            </div>
        </div>
    );
};
