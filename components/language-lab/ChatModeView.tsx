import React from 'react';
import { ChatMessage } from '../../services/conversationService';
import { LabMessageBubble } from './LabMessageBubble';

interface ChatModeViewProps {
    labMode: string;
    messages: ChatMessage[];
    draftMessage: string;
    setDraftMessage: (text: string) => void;
    listeningStatus: 'idle' | 'listening' | 'processing' | 'error';
    isProcessing: boolean;
    speak: (text: string) => void;
    handlePinMessage: (msg: any) => void;
    handleSendMessage: (text: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    t: (key: string) => string;
}

export const ChatModeView: React.FC<ChatModeViewProps> = ({
    labMode,
    messages,
    draftMessage,
    setDraftMessage,
    listeningStatus,
    isProcessing,
    speak,
    handlePinMessage,
    handleSendMessage,
    messagesEndRef,
    t
}) => {
    if (labMode !== 'chat') return null;

    return (
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
    );
};
