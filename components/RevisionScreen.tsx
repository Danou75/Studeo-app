// FIX: Implemented the RevisionScreen component to allow users to review their incorrect answers.
import React from 'react';
import { Flashcard, QuizConfig } from '../types';
import { Button } from './ui/Button';
import { LANGUAGE_CONFIG } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

interface RevisionScreenProps {
    cards: Flashcard[];
    quizConfig: QuizConfig;
    onBack: () => void;
    onRestartQuiz: () => void;
}

export const RevisionScreen: React.FC<RevisionScreenProps> = ({ cards, quizConfig, onBack, onRestartQuiz }) => {
    const { t } = useTranslation();
    const { questionLang, answerLang } = quizConfig;
    
    const questionLangConfig = LANGUAGE_CONFIG[questionLang] || { name: questionLang.toUpperCase(), emoji: '🌐' };
    const answerLangConfig = LANGUAGE_CONFIG[answerLang] || { name: answerLang.toUpperCase(), emoji: '🌐' };

    return (
        <div className="flex-1 min-h-0 flex flex-col text-text overflow-hidden pt-safe p-6">
            <div className="flex justify-between items-center mb-6 shrink-0">
                 <h2 className="text-3xl font-bold text-warning">{t('review.errorTitle')}</h2>
                 <Button variant="secondary" onClick={onBack}>
                    <i className="fas fa-arrow-left mr-2"></i> {t('common.back')}
                 </Button>
            </div>
            
            {cards.length > 0 ? (
                <div className="flex-1 flex flex-col min-h-0">
                    <p className="mb-4 shrink-0">{t('review.errorList', { count: cards.length })}</p>
                    <div className="flex-1 bg-background-secondary rounded-lg shadow-inner overflow-y-auto min-h-0">
                        <table className="min-w-full text-left text-sm">
                            <thead className="border-b border-border bg-background-tertiary sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 font-semibold">{questionLangConfig.emoji} {t('review.question')} ({t('languages.' + questionLang) || questionLangConfig.name})</th>
                                    <th className="px-4 py-2 font-semibold">{answerLangConfig.emoji} {t('review.answer')} ({t('languages.' + answerLang) || answerLangConfig.name})</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cards.map(card => (
                                    <tr key={card.id} className="border-b border-border hover:bg-warning/10 transition-colors">
                                         <td className="px-4 py-3">{
                                             (() => {
                                                 const terms = (card as any).terms;
                                                 const mcqData = (card as any).mcqData;
                                                 const clozeData = (card as any).clozeData;
                                                 if (terms) return terms[questionLang] || '–';
                                                 if (mcqData) return mcqData.question[questionLang] || '–';
                                                 if (clozeData) return clozeData.text[questionLang] || '–';
                                                 return (card as any)[questionLang] || '–';
                                             })()
                                         }</td>
                                         <td className="px-4 py-3 font-semibold text-primary">{
                                             (() => {
                                                 const terms = (card as any).terms;
                                                 const mcqData = (card as any).mcqData;
                                                 const clozeData = (card as any).clozeData;
                                                 if (terms) return terms[answerLang] || '–';
                                                 if (mcqData) return mcqData.answer[answerLang] || '–';
                                                 if (clozeData) return clozeData.answers[answerLang]?.join(', ') || '–';
                                                 return (card as any)[answerLang] || '–';
                                             })()
                                         }</td>
                                     </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="mt-6 text-center shrink-0">
                        <Button variant="special" size="lg" onClick={onRestartQuiz}>
                            <i className="fas fa-redo mr-2"></i> {t('review.restartWithError', { count: cards.length })}
                        </Button>
                     </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <p className="text-xl text-green-500 font-semibold mb-4">{t('review.congrats')}</p>
                    <Button onClick={onBack} size="lg">
                        {t('common.back')}
                    </Button>
                </div>
            )}
        </div>
    );
};
