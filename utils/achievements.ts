import { Achievement, GamificationData } from '../types';

export const ACHIEVEMENTS_LIST: Achievement[] = [
  // Streaks
  {
    id: 'streak_7',
    name: 'Semaine de feu',
    description: 'Étudiez pendant 7 jours consécutifs',
    icon: '🔥',
    target: 7
  },
  {
    id: 'streak_30',
    name: 'Habitude en béton',
    description: 'Étudiez pendant 30 jours consécutifs',
    icon: '📅',
    target: 30
  },
  {
    id: 'streak_100',
    name: 'Légende vivante',
    description: 'Étudiez pendant 100 jours consécutifs',
    icon: '👑',
    target: 100
  },

  // Cartes maîtrisées
  {
    id: 'cards_100',
    name: 'Débutant curieux',
    description: 'Maîtrisez 100 cartes',
    icon: '🌱',
    target: 100
  },
  {
    id: 'cards_500',
    name: 'Apprenant sérieux',
    description: 'Maîtrisez 500 cartes',
    icon: '📚',
    target: 500
  },
  {
    id: 'cards_1000',
    name: 'Polyglotte en devenir',
    description: 'Maîtrisez 1000 cartes',
    icon: '🧠',
    target: 1000
  },

  // Performance
  {
    id: 'perfect_10',
    name: 'Sans faute',
    description: 'Obtenez 100% à 10 quiz',
    icon: '🎯',
    target: 10
  },
  {
    id: 'perfect_50',
    name: 'Perfectionniste',
    description: 'Obtenez 100% à 50 quiz',
    icon: '✨',
    target: 50
  },
  {
    id: 'perfect_100',
    name: 'Maître Zen',
    description: 'Obtenez 100% à 100 quiz',
    icon: '🧘',
    target: 100
  },

  // Spéciaux
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Répondez à 10 questions en moins de 30 secondes',
    icon: '⚡',
    target: 1
  },
  {
    id: 'first_quiz',
    name: 'Premier pas',
    description: 'Terminez votre premier quiz',
    icon: '🏁',
    target: 1
  },
  {
    id: 'night_owl',
    name: 'Oiseau de nuit',
    description: 'Étudiez après 23h',
    icon: '🦉',
    target: 1
  },
  {
    id: 'early_bird',
    name: 'Lève-tôt',
    description: 'Étudiez avant 7h du matin',
    icon: '🌅',
    target: 1
  }
];

export const INITIAL_GAMIFICATION_DATA: GamificationData = {
  achievements: ACHIEVEMENTS_LIST,
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: '',
  },
  languageProgress: {},
  totalQuizzes: 0,
  perfectQuizzes: 0,
  totalStudyTime: 0,
};

/**
 * Vérifie les nouveaux succès débloqués
 */
export const checkAchievements = (data: GamificationData): Achievement[] => {
  const unlocked: Achievement[] = [];
  const now = new Date();
  const hour = now.getHours();

  // Vérifier chaque achievement non débloqué
  data.achievements.forEach(achievement => {
    if (achievement.unlockedAt) return; // Déjà débloqué

    let isUnlocked = false;

    switch (achievement.id) {
      case 'streak_7':
        isUnlocked = data.streak.currentStreak >= 7;
        break;
      case 'streak_30':
        isUnlocked = data.streak.currentStreak >= 30;
        break;
      case 'streak_100':
        isUnlocked = data.streak.currentStreak >= 100;
        break;
      
      case 'cards_100':
      case 'cards_500':
      case 'cards_1000':
        const totalMastered = Object.values(data.languageProgress).reduce((acc, curr) => acc + curr.masteredCards, 0);
        isUnlocked = totalMastered >= (achievement.target || 0);
        break;

      case 'perfect_10':
      case 'perfect_50':
      case 'perfect_100':
        isUnlocked = data.perfectQuizzes >= (achievement.target || 0);
        break;
      
      case 'first_quiz':
        isUnlocked = data.totalQuizzes >= 1;
        break;

      case 'night_owl':
        isUnlocked = hour >= 23 || hour < 4;
        break;

      case 'early_bird':
        isUnlocked = hour >= 4 && hour < 7;
        break;

      case 'speed_demon':
        // Ce succès est généralement débloqué via un flag spécifique passé lors de l'update
        // ou vérifié directement dans useGamification si on a les stats de la session.
        break;
    }

    if (isUnlocked) {
      const unlockedAchievement = { ...achievement, unlockedAt: now.toISOString() };
      unlocked.push(unlockedAchievement);
    }
  });

  return unlocked;
};
