import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../../ui/Button';
import { Flashcard } from '../../../types';
import { TranslationResult } from '../../../services/translationService';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../../contexts/ToastContext';

interface TranslationResultViewProps {
    translationResult: TranslationResult | null;
    language: string;
    speak: (text: string) => void;
    onAddCards?: (cards: Flashcard[]) => void;
}

export const TranslationResultView: React.FC<TranslationResultViewProps> = ({
    translationResult, language, speak, onAddCards
}) => {
    const { showToast } = useToast();

    if (!translationResult) return null;

    return (
        <div className="space-y-4 md:space-y-6 animate-slide-up">
            <div className="bg-background-tertiary p-4 md:p-6 rounded-xl border-l-4 border-primary shadow-sm">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mb-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] md:text-sm text-text-muted uppercase tracking-wider mb-1">Original</p>
                                <h2 className="text-xl md:text-3xl font-bold break-words">{translationResult.original}</h2>
                            </div>
                            <div className="hidden md:block">
                                <i className="fas fa-arrow-right text-2xl text-primary"></i>
                            </div>
                            <div className="md:hidden flex justify-center py-1">
                                <i className="fas fa-arrow-down text-xl text-primary"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] md:text-sm text-text-muted uppercase tracking-wider mb-1">{translationResult.language}</p>
                                <h2 className="text-xl md:text-3xl font-bold text-primary break-words">{translationResult.translated}</h2>
                                <button onClick={() => speak(translationResult.translated)} className="mt-2 text-sm hover:text-primary transition-colors inline-flex items-center gap-1.5">
                                    <i className="fas fa-volume-up"></i> <span>Écouter</span>
                                </button>
                            </div>
                        </div>

                        {translationResult.context && (
                            <div className="bg-background/50 p-3 rounded-lg mb-3">
                                <p className="text-sm font-semibold text-text-secondary mb-1">
                                    <i className="fas fa-info-circle mr-1"></i> Contexte
                                </p>
                                <div className="text-text prose prose-sm md:prose-base max-w-none dark:prose-invert">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {translationResult.context}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {translationResult.examples && translationResult.examples.length > 0 && (
                            <div className="bg-background/50 p-3 rounded-lg mb-3">
                                <p className="text-sm font-semibold text-text-secondary mb-2">
                                    <i className="fas fa-book mr-1"></i> Exemples
                                </p>
                                <ul className="space-y-2">
                                    {translationResult.examples.map((example, idx) => (
                                        <li key={`example-${idx}-${example.substring(0, 10)}`} className="flex items-start gap-2">
                                            <span className="text-primary font-bold">•</span>
                                            <div className="text-text prose prose-sm max-w-none dark:prose-invert prose-p:my-0">
                                                <ReactMarkdown>{example}</ReactMarkdown>
                                            </div>
                                            <button onClick={() => speak(example)} className="ml-auto hover:text-primary transition-colors">
                                                <i className="fas fa-volume-up text-xs"></i>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {translationResult.notes && (
                            <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                                <p className="text-sm font-semibold text-accent mb-1">
                                    <i className="fas fa-lightbulb mr-1"></i> Notes
                                </p>
                                <div className="text-text-secondary text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {translationResult.notes}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                    <Button
                        onClick={() => {
                            const newCard: Flashcard = {
                                id: uuidv4(),
                                type: 'classic',
                                terms: {
                                    'fr': translationResult.original,
                                    [language]: translationResult.translated
                                },
                                srsData: {
                                    interval: 0, repetitions: 0, easeFactor: 2.5,
                                    nextReview: new Date().toISOString(), lastReviewed: new Date().toISOString()
                                }
                            };
                            if (onAddCards) {
                                onAddCards([newCard]);
                                showToast('Flashcard créée avec succès !', 'success');
                            }
                        }}
                        className="w-full md:w-auto"
                    >
                        <i className="fas fa-plus-circle mr-2"></i>
                        Créer une flashcard
                    </Button>
                </div>
            </div>
        </div>
    );
};
