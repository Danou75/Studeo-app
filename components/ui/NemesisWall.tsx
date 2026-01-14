import React from 'react';
import { CardDifficulty, Flashcard } from '../../types';
import { Button } from './Button';
import { useTranslation } from '../../contexts/LanguageContext';

interface NemesisWallProps {
    cardDifficulties: CardDifficulty[];
    allFlashcards: Flashcard[];
    onStartNemesisQuiz: (cards: Flashcard[]) => void;
}

export const NemesisWall: React.FC<NemesisWallProps> = ({ cardDifficulties, allFlashcards, onStartNemesisQuiz }) => {
    const { t } = useTranslation();
    
    // 1. Filtrer et trier les cartes difficiles (au moins 2 erreurs pour être qualifiée de Nemesis)
    const nemesisCardsData = cardDifficulties
        .filter(d => d.errorCount >= 2)
        .sort((a, b) => b.errorCount - a.errorCount)
        .slice(0, 5);

    // 2. Retrouver le contenu des cartes
    const nemesisCards: Flashcard[] = [];
    const displayItems: { id: string; question: string; errorCount: number; accuracy: number }[] = [];

    nemesisCardsData.forEach(d => {
        const card = allFlashcards.find(c => c.id === d.cardId);
        if (card) {
            nemesisCards.push(card);
            
            // Tenter de trouver une "question" affichable (premier champ non-id)
            let question = "Carte inconnue";
            if (card.type === 'classic') {
                const keys = Object.keys(card.terms).filter(k => k !== 'id');
                if (keys.length > 0) question = card.terms[keys[0]];
            } else if (card.type === 'mcq' && card.mcqData) {
                const keys = Object.keys(card.mcqData.question);
                if (keys.length > 0) question = card.mcqData.question[keys[0]];
            }

            const accuracy = Math.round(((d.totalAttempts - d.errorCount) / d.totalAttempts) * 100);

            displayItems.push({
                id: d.cardId,
                question,
                errorCount: d.errorCount,
                accuracy
            });
        }
    });

    if (displayItems.length === 0) {
        return (
            <div className="bg-background-secondary p-6 rounded-lg shadow border-l-4 border-green-500">
                <h2 className="text-xl font-semibold mb-2">{t('dashboard.nemesis.emptyTitle')}</h2>
                <p className="text-text-muted">
                    {t('dashboard.nemesis.emptyText')}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-background-secondary p-6 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-semibold flex items-center text-red-600 dark:text-red-400">
                        <i className="fas fa-skull-crossbones mr-2"></i> {t('dashboard.nemesis.title')}
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                        {t('dashboard.nemesis.subtitle')}
                    </p>
                </div>
                <Button 
                    onClick={() => onStartNemesisQuiz(nemesisCards)}
                    variant="danger"
                    size="sm"
                >
                    {t('dashboard.nemesis.attackButton')}
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
                {displayItems.map(item => (
                    <div key={item.id} className="bg-background-tertiary p-3 rounded border border-red-200 dark:border-red-900 flex flex-col justify-between">
                        <p className="font-medium text-sm line-clamp-2 mb-2" title={item.question}>
                            {item.question}
                        </p>
                        <div className="text-right">
                            <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                                {t('dashboard.nemesis.errorsLabel', { count: item.errorCount }).replace('{count}', item.errorCount.toString())}
                            </span>
                            <p className="text-[10px] text-text-muted mt-1">
                                {t('dashboard.nemesis.accuracyLabel', { accuracy: item.accuracy }).replace('{accuracy}', item.accuracy.toString())}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
