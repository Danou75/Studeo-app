/**
 * Service de tracking de progression pour les tutoriels
 * Sauvegarde locale (localStorage) de l'historique de l'utilisateur
 */

import type { TutorType, SkillLevel } from './tutorialSuggestionsService';

export interface CompletedTutorial {
    title: string;
    tutorType: TutorType;
    level: SkillLevel;
    completedAt: string; // ISO date
    timeSpent?: number; // en secondes
}

export interface TutorProgress {
    currentLevel: SkillLevel;
    completedTutorials: CompletedTutorial[];
    totalTimeSpent: number; // en secondes
    lastActivity: string; // ISO date
}

export interface UserProgress {
    chess: TutorProgress;
    music: TutorProgress;
    drawing: TutorProgress;
    coding: TutorProgress;
}

const STORAGE_KEY = 'studeo_tutorial_progress';

/**
 * Initialise la progression par défaut pour un tuteur
 */
function getDefaultTutorProgress(): TutorProgress {
    return {
        currentLevel: 'beginner',
        completedTutorials: [],
        totalTimeSpent: 0,
        lastActivity: new Date().toISOString()
    };
}

/**
 * Récupère la progression complète de l'utilisateur
 */
export function getUserProgress(): UserProgress {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return {
                chess: getDefaultTutorProgress(),
                music: getDefaultTutorProgress(),
                drawing: getDefaultTutorProgress(),
                coding: getDefaultTutorProgress()
            };
        }
        const parsed = JSON.parse(stored);
        return {
            chess: parsed.chess || getDefaultTutorProgress(),
            music: parsed.music || getDefaultTutorProgress(),
            drawing: parsed.drawing || getDefaultTutorProgress(),
            coding: parsed.coding || getDefaultTutorProgress()
        };
    } catch (error) {
        console.error('Erreur lors de la lecture de la progression:', error);
        return {
            chess: getDefaultTutorProgress(),
            music: getDefaultTutorProgress(),
            drawing: getDefaultTutorProgress(),
            coding: getDefaultTutorProgress()
        };
    }
}

/**
 * Sauvegarde la progression de l'utilisateur
 */
function saveUserProgress(progress: UserProgress): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la progression:', error);
    }
}

/**
 * Récupère la progression pour un tuteur spécifique
 */
export function getTutorProgress(tutorType: TutorType): TutorProgress {
    const progress = getUserProgress();
    return progress[tutorType];
}

/**
 * Marque un tutoriel comme complété
 */
export function markTutorialCompleted(
    tutorType: TutorType,
    title: string,
    level: SkillLevel,
    timeSpent?: number
): void {
    const progress = getUserProgress();
    const tutorProgress = progress[tutorType];

    // Vérifier si le tutoriel n'est pas déjà complété
    const alreadyCompleted = tutorProgress.completedTutorials.some(
        t => t.title === title
    );

    if (!alreadyCompleted) {
        const completed: CompletedTutorial = {
            title,
            tutorType,
            level,
            completedAt: new Date().toISOString(),
            timeSpent
        };

        tutorProgress.completedTutorials.push(completed);
        if (timeSpent) {
            tutorProgress.totalTimeSpent += timeSpent;
        }
    }

    tutorProgress.lastActivity = new Date().toISOString();

    // Recalculer le niveau automatiquement
    tutorProgress.currentLevel = calculateLevel(tutorProgress);

    progress[tutorType] = tutorProgress;
    saveUserProgress(progress);
}

/**
 * Calcule le niveau approprié basé sur la progression
 */
function calculateLevel(tutorProgress: TutorProgress): SkillLevel {
    const completed = tutorProgress.completedTutorials;
    
    // Compter les tutoriels par niveau
    const beginnerCount = completed.filter(t => t.level === 'beginner').length;
    const intermediateCount = completed.filter(t => t.level === 'intermediate').length;
    const advancedCount = completed.filter(t => t.level === 'advanced').length;

    // Règles de progression :
    // - 0-2 tutoriels débutants → Débutant
    // - 3+ tutoriels débutants → Intermédiaire
    // - 3+ tutoriels intermédiaires → Avancé
    
    if (advancedCount >= 1 || intermediateCount >= 3) {
        return 'advanced';
    }
    
    if (beginnerCount >= 3 || intermediateCount >= 1) {
        return 'intermediate';
    }
    
    return 'beginner';
}

/**
 * Obtient le niveau suggéré pour un tuteur
 */
export function getSuggestedLevelForTutor(tutorType: TutorType): SkillLevel {
    const progress = getTutorProgress(tutorType);
    return progress.currentLevel;
}

/**
 * Vérifie si un tutoriel a été complété
 */
export function isTutorialCompleted(tutorType: TutorType, title: string): boolean {
    const progress = getTutorProgress(tutorType);
    return progress.completedTutorials.some(t => t.title === title);
}

/**
 * Obtient les statistiques pour un tuteur
 */
export interface TutorStats {
    totalCompleted: number;
    beginnerCompleted: number;
    intermediateCompleted: number;
    advancedCompleted: number;
    totalTimeSpent: number; // en secondes
    averageTimePerTutorial: number; // en secondes
    currentStreak: number; // jours consécutifs
    lastActivity: Date | null;
}

export function getTutorStats(tutorType: TutorType): TutorStats {
    const progress = getTutorProgress(tutorType);
    const completed = progress.completedTutorials;

    const beginnerCompleted = completed.filter(t => t.level === 'beginner').length;
    const intermediateCompleted = completed.filter(t => t.level === 'intermediate').length;
    const advancedCompleted = completed.filter(t => t.level === 'advanced').length;

    const totalCompleted = completed.length;
    const averageTimePerTutorial = totalCompleted > 0 
        ? progress.totalTimeSpent / totalCompleted 
        : 0;

    // Calculer la série de jours consécutifs
    const currentStreak = calculateStreak(completed);

    return {
        totalCompleted,
        beginnerCompleted,
        intermediateCompleted,
        advancedCompleted,
        totalTimeSpent: progress.totalTimeSpent,
        averageTimePerTutorial,
        currentStreak,
        lastActivity: progress.lastActivity ? new Date(progress.lastActivity) : null
    };
}

/**
 * Calcule le nombre de jours consécutifs d'activité
 */
function calculateStreak(completed: CompletedTutorial[]): number {
    if (completed.length === 0) return 0;

    // Trier par date décroissante
    const sorted = [...completed].sort((a, b) => 
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const tutorial of sorted) {
        const tutorialDate = new Date(tutorial.completedAt);
        tutorialDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor(
            (currentDate.getTime() - tutorialDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === streak) {
            streak++;
        } else if (diffDays > streak) {
            break;
        }
    }

    return streak;
}

/**
 * Obtient les tutoriels recommandés basés sur la progression
 */
export function getRecommendedTutorials(
    tutorType: TutorType,
    allSuggestions: Array<{ title: string; level: SkillLevel; category: string }>
): Array<{ title: string; level: SkillLevel; category: string; reason: string }> {
    const progress = getTutorProgress(tutorType);
    const currentLevel = progress.currentLevel;
    const completed = progress.completedTutorials.map(t => t.title);

    // Filtrer les tutoriels non complétés
    const notCompleted = allSuggestions.filter(s => !completed.includes(s.title));

    // Prioriser :
    // 1. Tutoriels du niveau actuel non complétés
    // 2. Tutoriels du niveau précédent non complétés
    // 3. Tutoriels du niveau suivant (pour challenge)

    const recommendations: Array<{ title: string; level: SkillLevel; category: string; reason: string }> = [];

    // Niveau actuel
    const currentLevelTutorials = notCompleted.filter(s => s.level === currentLevel);
    recommendations.push(...currentLevelTutorials.slice(0, 3).map(s => ({
        ...s,
        reason: 'Adapté à votre niveau actuel'
    })));

    // Niveau précédent (si pas débutant)
    if (currentLevel !== 'beginner') {
        const previousLevel = currentLevel === 'advanced' ? 'intermediate' : 'beginner';
        const previousLevelTutorials = notCompleted.filter(s => s.level === previousLevel);
        recommendations.push(...previousLevelTutorials.slice(0, 2).map(s => ({
            ...s,
            reason: 'Pour consolider vos bases'
        })));
    }

    // Niveau suivant (challenge)
    if (currentLevel !== 'advanced') {
        const nextLevel = currentLevel === 'beginner' ? 'intermediate' : 'advanced';
        const nextLevelTutorials = notCompleted.filter(s => s.level === nextLevel);
        recommendations.push(...nextLevelTutorials.slice(0, 1).map(s => ({
            ...s,
            reason: 'Défi : niveau supérieur !'
        })));
    }

    return recommendations.slice(0, 6);
}

/**
 * Réinitialise la progression pour un tuteur (utile pour debug/tests)
 */
export function resetTutorProgress(tutorType: TutorType): void {
    const progress = getUserProgress();
    progress[tutorType] = getDefaultTutorProgress();
    saveUserProgress(progress);
}

/**
 * Réinitialise toute la progression
 */
export function resetAllProgress(): void {
    localStorage.removeItem(STORAGE_KEY);
}
