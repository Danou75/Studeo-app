import { useState, useCallback, useEffect } from 'react';
import { GamificationData, Achievement } from '../types';
import { INITIAL_GAMIFICATION_DATA, checkAchievements } from '../utils/achievements';
import { useLocalStorage } from './useLocalStorage';

export const useGamification = () => {
  const [gamificationData, setGamificationData] = useLocalStorage<GamificationData>(
    'flashcardsGamification',
    INITIAL_GAMIFICATION_DATA
  );

  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  // Synchronisation automatique au chargement (migration/rétroactif)
  useEffect(() => {
    const unlocked = checkAchievements(gamificationData);
    if (unlocked.length > 0) {
        setGamificationData(current => {
            const newData = { ...current };
            let hasChanged = false;
            newData.achievements = newData.achievements.map(a => {
                const newlyUnlocked = unlocked.find(u => u.id === a.id);
                if (newlyUnlocked && !a.unlockedAt) {
                    hasChanged = true;
                    return newlyUnlocked;
                }
                return a;
            });
            return hasChanged ? newData : current;
        });
    }
  }, []);

  /**
   * Met à jour les données de gamification après une session de quiz
   */
  const updateGamification = useCallback((sessionStats: {
    correctCount: number;
    totalCount: number;
    duration: number;
    language: string;
  }) => {
    setGamificationData(currentData => {
      const newData = { ...currentData };
      const today = new Date().toISOString().split('T')[0];
      const lastStudyDate = newData.streak.lastStudyDate.split('T')[0];

      // Mise à jour du streak
      if (lastStudyDate === today) {
        // Déjà étudié aujourd'hui, pas de changement de streak
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastStudyDate === yesterdayStr) {
          // Continue le streak
          newData.streak.currentStreak += 1;
        } else {
          // Streak brisé (ou premier jour)
          newData.streak.currentStreak = 1;
        }
        newData.streak.lastStudyDate = new Date().toISOString();
      }

      // Mise à jour du plus long streak
      if (newData.streak.currentStreak > newData.streak.longestStreak) {
        newData.streak.longestStreak = newData.streak.currentStreak;
      }

      // Mise à jour des totaux
      newData.totalQuizzes += 1;
      newData.totalStudyTime += sessionStats.duration;

      if (sessionStats.correctCount === sessionStats.totalCount && sessionStats.totalCount > 0) {
        newData.perfectQuizzes += 1;
      }

      // Mise à jour du progrès par langue
      const lang = sessionStats.language;
      if (lang && lang !== 'unknown') {
          if (!newData.languageProgress[lang]) {
              newData.languageProgress[lang] = {
                  language: lang,
                  masteredCards: 0,
                  totalCards: 0,
                  level: 'beginner',
                  accuracy: 0
              };
          }
          const lp = newData.languageProgress[lang];
          lp.totalCards += sessionStats.totalCount;
          
          // On considère "maîtrisée" une carte réussie dans cette session pour la progression globale
          lp.masteredCards += sessionStats.correctCount;
          
          // Recalculer la précision moyenne pour cette langue
          if (lp.totalCards > 0) {
              lp.accuracy = Math.round((lp.masteredCards / lp.totalCards) * 100);
          }
          
          // Mise à jour du niveau (simplifié)
          if (lp.masteredCards > 500) lp.level = 'expert';
          else if (lp.masteredCards > 200) lp.level = 'advanced';
          else if (lp.masteredCards > 50) lp.level = 'intermediate';
          else lp.level = 'beginner';
      }

      // Vérification des nouveaux succès
      const unlocked = checkAchievements(newData);
      
      // Cas spécial : Speed Demon (n'est pas basé sur des totaux cumulés mais sur une session)
      if (sessionStats.totalCount >= 10 && sessionStats.duration > 0 && sessionStats.duration <= 30) {
          const speedDemon = newData.achievements.find(a => a.id === 'speed_demon');
          if (speedDemon && !speedDemon.unlockedAt) {
              speedDemon.unlockedAt = new Date().toISOString();
              unlocked.push(speedDemon);
          }
      }

      if (unlocked.length > 0) {
        // Marquer comme débloqués dans les données
        newData.achievements = newData.achievements.map(a => {
          const newlyUnlocked = unlocked.find(u => u.id === a.id);
          return newlyUnlocked ? newlyUnlocked : a;
        });
        setNewAchievements(unlocked);
      }

      return newData;
    });
  }, [setGamificationData]);

  const clearNewAchievements = () => setNewAchievements([]);

  return {
    gamificationData,
    setGamificationData,
    updateGamification,
    newAchievements,
    clearNewAchievements
  };
};
