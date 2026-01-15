import React from 'react';
import { Button } from './ui/Button';
import { getTutorStats, getUserProgress, type TutorProgress } from '../services/progressTrackingService';
import type { TutorType } from '../services/tutorialSuggestionsService';

interface ProgressScreenProps {
    onBack: () => void;
}

// Fonction helper pour afficher "il y a X temps"
function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR');
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ onBack }) => {
    const progress = getUserProgress();

    // Calculer les badges débloqués
    const getBadges = (tutorType: TutorType, tutorProgress: TutorProgress) => {
        const stats = getTutorStats(tutorType);
        const badges: Array<{ icon: string; title: string; description: string; unlocked: boolean }> = [];

        // Badge "Premiers pas"
        badges.push({
            icon: '🌱',
            title: 'Premiers pas',
            description: 'Compléter 1 tutoriel',
            unlocked: stats.totalCompleted >= 1
        });

        // Badge "Étudiant assidu"
        badges.push({
            icon: '📚',
            title: 'Étudiant assidu',
            description: 'Compléter 5 tutoriels',
            unlocked: stats.totalCompleted >= 5
        });

        // Badge "Expert"
        badges.push({
            icon: '🎓',
            title: 'Expert',
            description: 'Compléter 10 tutoriels',
            unlocked: stats.totalCompleted >= 10
        });

        // Badge "Maître"
        badges.push({
            icon: '👑',
            title: 'Maître',
            description: 'Compléter 20 tutoriels',
            unlocked: stats.totalCompleted >= 20
        });

        // Badge "Série"
        badges.push({
            icon: '🔥',
            title: 'En feu !',
            description: '3 jours consécutifs',
            unlocked: stats.currentStreak >= 3
        });

        // Badge "Niveau avancé"
        badges.push({
            icon: '⭐',
            title: 'Niveau avancé',
            description: 'Atteindre le niveau avancé',
            unlocked: tutorProgress.currentLevel === 'advanced'
        });

        return badges;
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    };

    const getLevelLabel = (level: string): string => {
        switch (level) {
            case 'beginner': return '🌱 Débutant';
            case 'intermediate': return '📚 Intermédiaire';
            case 'advanced': return '🎓 Avancé';
            default: return level;
        }
    };

    const getLevelColor = (level: string): string => {
        switch (level) {
            case 'beginner': return 'bg-green-500';
            case 'intermediate': return 'bg-blue-500';
            case 'advanced': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    const tutors: Array<{ type: TutorType; name: string; emoji: string; progress: TutorProgress }> = [
        { type: 'chess', name: 'Grand Maître Kaspar', emoji: '♟️', progress: progress.chess },
        { type: 'music', name: 'Prof Mélodia', emoji: '🎹', progress: progress.music },
        { type: 'drawing', name: 'Maître Léonard', emoji: '🐢', progress: progress.drawing }
    ];

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden relative">
            {/* Header */}
            <div className="p-3 md:p-6 shrink-0 border-b border-border bg-background-secondary shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
                    <Button onClick={onBack} variant="secondary" size="sm" className="shrink-0">
                        <i className="fas fa-home mr-1 md:mr-2"></i> <span className="hidden sm:inline">Accueil</span>
                    </Button>
                    <h1 className="text-lg md:text-3xl font-bold text-primary flex items-center gap-2 md:gap-3 text-center truncate">
                        <i className="fas fa-chart-line text-inherit hidden xs:inline"></i>
                        Mes Progrès
                    </h1>
                    <div className="w-8 md:w-24"></div> 
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50 min-h-0 pb-32">
                <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {tutors.map(({ type, name, emoji, progress: tutorProgress }) => {
                    const stats = getTutorStats(type);
                    const badges = getBadges(type, tutorProgress);
                    const unlockedBadges = badges.filter(b => b.unlocked).length;

                    return (
                        <div key={type} className="bg-background-secondary rounded-2xl p-6 border border-border shadow-lg">
                            {/* En-tête */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl">{emoji}</span>
                                    <div>
                                        <h3 className="font-bold text-lg">{name}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${getLevelColor(tutorProgress.currentLevel)} text-white`}>
                                            {getLevelLabel(tutorProgress.currentLevel)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Statistiques */}
                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-secondary">Tutoriels complétés</span>
                                    <span className="font-bold text-lg text-primary">{stats.totalCompleted}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-secondary">Temps total</span>
                                    <span className="font-semibold">{formatTime(stats.totalTimeSpent)}</span>
                                </div>

                                {stats.totalCompleted > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-text-secondary">Temps moyen</span>
                                        <span className="font-semibold">{formatTime(stats.averageTimePerTutorial)}</span>
                                    </div>
                                )}

                                {stats.currentStreak > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-text-secondary">Série actuelle</span>
                                        <span className="font-semibold text-orange-500">🔥 {stats.currentStreak} jour{stats.currentStreak > 1 ? 's' : ''}</span>
                                    </div>
                                )}
                            </div>

                            {/* Répartition par niveau */}
                            {stats.totalCompleted > 0 && (
                                <div className="mb-4">
                                    <p className="text-xs text-text-secondary mb-2">Répartition :</p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 text-center">
                                            <div className="text-2xl font-bold text-success">{stats.beginnerCompleted}</div>
                                            <div className="text-xs text-text-secondary">🌱</div>
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="text-2xl font-bold text-info">{stats.intermediateCompleted}</div>
                                            <div className="text-xs text-text-secondary">📚</div>
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="text-2xl font-bold text-accent">{stats.advancedCompleted}</div>
                                            <div className="text-xs text-text-secondary">🎓</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Badges */}
                            <div className="pt-4 border-t border-border">
                                <p className="text-xs text-text-secondary mb-2">Badges : {unlockedBadges}/{badges.length}</p>
                                <div className="flex flex-wrap gap-2">
                                    {badges.map((badge, idx) => (
                                        <div
                                            key={idx}
                                            className={`text-2xl ${badge.unlocked ? 'opacity-100' : 'opacity-20 grayscale'}`}
                                            title={`${badge.title}: ${badge.description} ${badge.unlocked ? '✓' : ''}`}
                                        >
                                            {badge.icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tutoriels récents */}
            <div className="bg-background-secondary rounded-2xl p-6 border border-border shadow-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-history text-primary"></i>
                    Activité récente
                </h2>

                {(() => {
                    // Combiner tous les tutoriels complétés et trier par date
                    const allCompleted = [
                        ...progress.chess.completedTutorials,
                        ...progress.music.completedTutorials,
                        ...progress.drawing.completedTutorials
                    ].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

                    if (allCompleted.length === 0) {
                        return (
                            <div className="text-center py-8 text-text-secondary">
                                <i className="fas fa-inbox text-4xl mb-3 opacity-30"></i>
                                <p>Aucun tutoriel complété pour le moment</p>
                                <p className="text-sm mt-2">Commencez votre apprentissage !</p>
                            </div>
                        );
                    }

                    return (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {allCompleted.slice(0, 10).map((tutorial, idx) => {
                                const tutorEmoji = tutorial.tutorType === 'chess' ? '♟️' : tutorial.tutorType === 'music' ? '🎹' : '🐢';
                                const levelIcon = tutorial.level === 'beginner' ? '🌱' : tutorial.level === 'intermediate' ? '📚' : '🎓';
                                const date = new Date(tutorial.completedAt);
                                const timeAgo = getTimeAgo(date);

                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{tutorEmoji}</span>
                                            <div>
                                                <div className="font-semibold">{tutorial.title}</div>
                                                <div className="text-xs text-text-secondary flex items-center gap-2">
                                                    <span>{levelIcon} {tutorial.level}</span>
                                                    {tutorial.timeSpent && <span>• {formatTime(tutorial.timeSpent)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-text-secondary text-right">
                                            {timeAgo}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
        </div>
    </div>
</div>
    );
};
