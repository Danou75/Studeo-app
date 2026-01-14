import { useState, useCallback } from 'react';
import { GamificationData, Achievement } from '../types';
import { INITIAL_GAMIFICATION_DATA, checkAchievements } from '../utils/achievements';
import { useLocalStorage } from './useLocalStorage';

export const useGamification = () => {
  const [gamificationData, setGamificationData] = useLocalStorage<GamificationData>(
    'flashcardsGamification',
    INITIAL_GAMIFICATION_DATA
  );

  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

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

      // Vérification des nouveaux succès
      const unlocked = checkAchievements(newData);
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
    updateGamification,
    newAchievements,
    clearNewAchievements
  };
};
