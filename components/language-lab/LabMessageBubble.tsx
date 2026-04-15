import React, { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { ChatMessage } from '../../services/conversationService';
import { MdRenderer } from './MessageRenderers';

// Sub-component for Message Bubble to handle translation state locally
export const LabMessageBubble: React.FC<{ 
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
