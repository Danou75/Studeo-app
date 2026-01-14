import { useMemo } from 'react';
import { QuizHistoryEntry, AnalyticsData, DailyActivity } from '../types';

export const useAnalytics = (history: QuizHistoryEntry[]) => {
  
  const analyticsData: AnalyticsData = useMemo(() => {
    // 1. Activités quotidiennes
    const activitiesMap = new Map<string, DailyActivity>();
    
    // 2. Difficulté des cartes (nécessiterait un historique par carte, on approxime avec ce qu'on a)
    // Note: Pour une vraie difficulté par carte, il faudrait stocker les résultats détaillés par carte dans l'historique.
    // Pour l'instant, on va se baser sur les stats globales.
    
    let totalTime = 0;
    let totalCards = 0;
    let totalCorrect = 0;
    
    const langStats: Record<string, { cardsStudied: number; accuracy: number; studyTime: number }> = {};

    history.forEach(entry => {
      const date = entry.date.split('T')[0];
      
      // Mise à jour activité quotidienne
      if (!activitiesMap.has(date)) {
        activitiesMap.set(date, {
          date,
          cardsStudied: 0,
          quizzesTaken: 0,
          studyTime: 0,
          accuracy: 0
        });
      }
      
      const activity = activitiesMap.get(date)!;
      activity.cardsStudied += entry.totalCount;
      activity.quizzesTaken += 1;
      // On estime le temps si non présent (ex: 5 sec par carte)
      const duration = entry.duration || (entry.totalCount * 5); 
      activity.studyTime += duration;
      
      // Calculer la moyenne pondérée de précision pour la journée
      const currentTotalCorrect = (activity.accuracy / 100) * (activity.cardsStudied - entry.totalCount);
      const newTotalCorrect = currentTotalCorrect + entry.correctCount;
      activity.accuracy = (newTotalCorrect / activity.cardsStudied) * 100;

      // Stats globales
      totalTime += duration;
      totalCards += entry.totalCount;
      totalCorrect += entry.correctCount;

      // Stats par langue
      const lang = entry.answerLang; // On utilise la langue cible
      if (lang) { // Protection contre undefined
        if (!langStats[lang]) {
          langStats[lang] = { cardsStudied: 0, accuracy: 0, studyTime: 0 };
        }
        
        const ls = langStats[lang];
        
        // Sécurisation des valeurs d'entrée
        const correct = typeof entry.correctCount === 'number' && !isNaN(entry.correctCount) ? entry.correctCount : 0;
        const total = typeof entry.totalCount === 'number' && !isNaN(entry.totalCount) ? entry.totalCount : 0;
        const time = typeof duration === 'number' && !isNaN(duration) ? duration : 0;

        // Initialisation si nécessaire (protection supplémentaire)
        if (isNaN(ls.accuracy)) ls.accuracy = 0;
        if (isNaN(ls.cardsStudied)) ls.cardsStudied = 0;
        if (isNaN(ls.studyTime)) ls.studyTime = 0;
        
        // Accumulation
        ls.accuracy += correct;       // accuracy sert de totalCorrect temporaire
        ls.cardsStudied += total;
        ls.studyTime += time;
        
        // Log pour débogage (à retirer plus tard)
        // console.log(`[Analytics] ${lang}: +${correct}/${total} (Total: ${ls.accuracy}/${ls.cardsStudied})`);
      }
    });

    // Finalisation des calculs par langue
    Object.keys(langStats).forEach(lang => {
      const ls = langStats[lang];
      if (ls.cardsStudied > 0) {
        // Calcul final de la précision : (totalCorrect / totalCards) * 100
        ls.accuracy = Math.round((ls.accuracy / ls.cardsStudied) * 100);
      } else {
        ls.accuracy = 0;
      }
    });

    const dailyActivities = Array.from(activitiesMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      dailyActivities,
      cardDifficulties: [], // À implémenter avec un historique plus détaillé
      totalStudyTime: totalTime,
      totalCardsStudied: totalCards,
      averageAccuracy: totalCards > 0 ? (totalCorrect / totalCards) * 100 : 0,
      languageStats: langStats
    };
  }, [history]);

  return analyticsData;
};
