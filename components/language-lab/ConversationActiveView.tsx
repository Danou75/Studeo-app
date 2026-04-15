/**
 * ConversationActiveView.tsx — Chat en cours de causerie.
 * Extrait de ConversationModeView pour le mode `conversation_active`.
 */
import React from 'react';
import { ChatMessage } from '../../services/conversationService';
import { LabMessageBubble } from './LabMessageBubble';

export interface ConversationActiveViewProps {
    convThemeLabel:       string;
    convTimerMinutes:     number;
    convTimeLeft:         number;
    isGeneratingOpener:   boolean;
    convMessages:         ChatMessage[];
    draftMessage:         string;
    setDraftMessage:      (msg: string) => void;
    listeningStatus:      string;
    convMessagesEndRef:   React.RefObject<HTMLDivElement>;
    speak:                (text: string) => void;
    handlePinMessage:     (msg: any) => void;
    handleSendConvMessage:(text: string) => void;
    handleEndConversation:() => void;
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
}) => (
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

        {/* Draft message */}
        {draftMessage && (
            <div className="flex w-full justify-end animate-fade-in-up">
                <div className={`max-w-[85%] rounded-2xl rounded-br-none px-4 py-3 shadow-sm ${
                    listeningStatus === 'listening'
                        ? 'bg-primary/5 border border-primary/30 text-primary'
                        : 'bg-primary text-white flex flex-col min-w-[12rem] sm:min-w-[16rem]'
                }`}>
                    {listeningStatus === 'listening'
                        ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-pulse w-2 h-2 rounded-full bg-red-500" />
                                <span>{draftMessage}</span>
                            </div>
                        ) : (
                            <>
                                <textarea
                                    value={draftMessage}
                                    onChange={e => setDraftMessage(e.target.value)}
                                    className="bg-transparent text-white w-full outline-none resize-none m-0 p-0 overflow-hidden leading-relaxed"
                                    style={{ minHeight: '24px' }}
                                    ref={el => {
                                        if (el) {
                                            el.style.height = 'auto';
                                            el.style.height = `${el.scrollHeight}px`;
                                        }
                                    }}
                                    onInput={e => {
                                        const t = e.target as HTMLTextAreaElement;
                                        t.style.height = 'auto';
                                        t.style.height = `${t.scrollHeight}px`;
                                    }}
                                />
                                <div className="text-[10px] text-white/70 mt-1 pt-1 flex items-center justify-end border-t border-white/20 select-none">
                                    <i className="fas fa-pencil-alt mr-1.5" /> Éditable avant envoi
                                </div>
                            </>
                        )}
                </div>
            </div>
        )}

        <div ref={convMessagesEndRef} />
    </div>
);
