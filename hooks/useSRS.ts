import { useCallback } from 'react';
import { Flashcard } from '../types';
import { calculateSRS, isDueForReview } from '../utils/srsAlgorithm';

export const useSRS = () => {
  
  /**
   * Met à jour les données SRS d'une carte après une réponse
   */
  const updateCardSRS = useCallback((card: Flashcard, isCorrect: boolean): Flashcard => {
    const newSRSData = calculateSRS(card.srsData, isCorrect);
    
    return {
      ...card,
      srsData: newSRSData
    };
  }, []);

  /**
   * Filtre les cartes qui doivent être révisées aujourd'hui
   */
  const getDueCards = useCallback((cards: Flashcard[]): Flashcard[] => {
    return cards.filter(card => isDueForReview(card.srsData));
  }, []);

  /**
   * Obtient les statistiques globales SRS
   */
  const getSRSStats = useCallback((cards: Flashcard[]) => {
    const totalCards = cards.length;
    const dueCards = getDueCards(cards).length;
    const newCards = cards.filter(c => !c.srsData).length;
    const learningCards = cards.filter(c => c.srsData && c.srsData.interval < 21).length;
    const masteredCards = cards.filter(c => c.srsData && c.srsData.interval >= 21).length;

    return {
      totalCards,
      dueCards,
      newCards,
      learningCards,
      masteredCards
    };
  }, [getDueCards]);

  return {
    updateCardSRS,
    getDueCards,
    getSRSStats
  };
};
