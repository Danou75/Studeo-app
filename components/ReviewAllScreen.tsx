import React from 'react';
import { Flashcard } from '../types';
import { Button } from './ui/Button';
import { LANGUAGE_CONFIG } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

interface ReviewAllScreenProps {
    cards: Flashcard[];
    allColumns: string[];
    onBack: () => void;
    onHome: () => void;
}

export const ReviewAllScreen: React.FC<ReviewAllScreenProps> = ({ cards, allColumns, onBack, onHome }) => {
    const { t } = useTranslation();
    
    return (
        <div className="flex flex-col h-full text-text overflow-hidden pt-safe p-4 md:p-6">
            <div className="flex justify-between items-center mb-6 shrink-0">
                 <h2 className="text-3xl font-bold text-primary">{t('review.title')}</h2>
                 <Button variant="secondary" onClick={onHome} className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800">
                    <i className="fas fa-home mr-2"></i> Accueil
                 </Button>
            </div>
            
            <p className="mb-4 shrink-0">{t('review.fullList', { count: cards.length })}</p>
            
            <div className="w-full overflow-auto bg-background-secondary rounded-lg shadow-inner flex-1 mb-6 min-h-0">
                <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-border bg-background-tertiary sticky top-0">
                        <tr>
                             <th className="px-4 py-2 font-semibold">{t('review.type')}</th>
                            {allColumns.map(col => (
                                <th key={col} className="px-4 py-2 font-semibold">
                                    {t('languages.' + col) || LANGUAGE_CONFIG[col]?.name || col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cards.map((card, index) => {
                            if (index === 0) console.log('🔍 DEBUG Review Card 0:', card);
                            return (
                                <tr key={card.id} className="border-b border-border hover:bg-primary/10">
                                    <td className="px-4 py-2 font-medium text-text-muted">{card.type}</td>
                                    {allColumns.map(col => (
                                        <td key={`${card.id}-${col}`} className="px-4 py-2">
                                            {(() => {
                                                const terms = (card as any).terms;
                                                const mcqData = (card as any).mcqData;
                                                const clozeData = (card as any).clozeData;

                                                if (terms) return terms[col] || '–';
                                                if (mcqData) {
                                                    return (
                                                        <div className="text-xs">
                                                            <div><span className="font-bold text-text-muted">Q:</span> {mcqData.question[col] || '–'}</div>
                                                            <div><span className="font-bold text-success">R:</span> {mcqData.answer[col] || '–'}</div>
                                                        </div>
                                                    );
                                                }
                                                if (clozeData) {
                                                    return (
                                                        <div className="text-xs">
                                                            <div><span className="font-bold text-text-muted">Cloze:</span> {clozeData.text[col] || '–'}</div>
                                                            <div><span className="font-bold text-success">{t('review.solutions')}:</span> {clozeData.answers[col]?.join(', ') || '–'}</div>
                                                        </div>
                                                    );
                                                }
                                                // Fallback for flat objects
                                                return (card as any)[col] || '–';
                                            })()}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {cards.length === 0 && <p className="p-4 text-center text-text-muted">{t('review.noCards')}</p>}
            </div>

             <div className="mt-auto text-center">
                <Button onClick={onBack} className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800">
                    <i className="fas fa-arrow-left mr-2"></i> {t('common.back')}
                </Button>
             </div>
        </div>
    );
};
