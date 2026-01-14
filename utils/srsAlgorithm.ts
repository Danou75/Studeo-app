import { SRSData } from '../types';

/**
 * Implémentation de l'algorithme SuperMemo 2 (SM-2)
 * Source: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

// Qualité de la réponse (0-5)
// 5 - réponse parfaite
// 4 - réponse correcte avec hésitation nulle
// 3 - réponse correcte avec difficulté
// 2 - réponse incorrecte, mais le bon mot semblait facile à retrouver
// 1 - réponse incorrecte, le bon mot est familier
// 0 - absence totale de réponse

export const INITIAL_SRS_DATA: SRSData = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReview: new Date().toISOString(),
  lastReviewed: new Date().toISOString(),
};

/**
 * Calcule les nouvelles données SRS basées sur la performance
 * @param currentData Données SRS actuelles (ou undefined si nouvelle carte)
 * @param grade Note de 0 à 5 (ou booléen pour compatibilité simple)
 */
export const calculateSRS = (
  currentData: SRSData = INITIAL_SRS_DATA,
  grade: number | boolean
): SRSData => {
  // Conversion booléen -> note SM-2
  // Si c'est un booléen : true = 4 (Bon), false = 1 (Mauvais)
  let numericGrade: number;
  if (typeof grade === 'boolean') {
    numericGrade = grade ? 4 : 1;
  } else {
    numericGrade = grade;
  }

  // Limiter la note entre 0 et 5
  numericGrade = Math.max(0, Math.min(5, numericGrade));

  let { easeFactor, interval, repetitions } = currentData;

  if (numericGrade >= 3) {
    // Réponse correcte
    if (repetitions === 0) {
      // Première révision : adapter l'intervalle selon le grade
      if (numericGrade === 5) {
        interval = 6;  // Facile : 6 jours
      } else if (numericGrade === 4) {
        interval = 3;  // Moyen : 3 jours
      } else {
        interval = 1;  // Difficile (grade 3) : 1 jour
      }
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Réponse incorrecte
    repetitions = 0;
    interval = 1;
  }

  // Mise à jour du facteur de facilité (Ease Factor)
  // Formule SM-2 : EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - numericGrade) * (0.08 + (5 - numericGrade) * 0.02));
  
  // Le facteur de facilité ne peut pas descendre en dessous de 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calcul de la prochaine date de révision
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor: parseFloat(easeFactor.toFixed(2)),
    interval,
    repetitions,
    nextReview: nextReviewDate.toISOString(),
    lastReviewed: new Date().toISOString(),
  };
};

/**
 * Vérifie si une carte doit être révisée
 */
export const isDueForReview = (srsData?: SRSData): boolean => {
  if (!srsData) return true; // Nouvelle carte
  const now = new Date();
  const reviewDate = new Date(srsData.nextReview);
  return reviewDate <= now;
};
