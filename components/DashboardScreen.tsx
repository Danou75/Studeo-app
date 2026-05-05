
import React from 'react';
import { Flashcard, QuizConfig } from '../types';
import { Button } from './ui/Button';
import { ActivityHeatmap } from './ui/ActivityHeatmap';
import { SkillsRadar } from './ui/SkillsRadar';
import { NemesisWall } from './ui/NemesisWall';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useGamificationStore } from '../stores/useGamificationStore';
import { deduplicateCards } from "../utils/flashcardHelpers";
import { getThemeGradient } from "../constants/themes";
import { useFlashcardStore } from '../stores/useFlashcardStore';
import { useQuizStore } from '../stores/useQuizStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { FloatingHeaderToggle } from './ui/FloatingHeaderToggle';
interface DashboardScreenProps {
    onStartQuiz: (cards: Flashcard[], config: QuizConfig) => void;
    onBack: () => void;
    onSyncPush?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ 
    onStartQuiz, onBack, onSyncPush 
}) => {
    const { t } = useTranslation();
    const { themeMode, themeStyle } = useTheme();
    const { showHeader, toggleHeader } = useCollapsibleHeader();
    const gamificationData = useGamificationStore(s => s.gamificationData);
    const flashcardSets = useFlashcardStore(s => s.flashcardSets);
    const allFlashcards = Object.values(flashcardSets).flat();
    const history = useQuizStore(s => s.history);
    const analyticsData = useAnalytics(history);
    
    // Formater le temps d'étude
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const handleStartNemesisQuiz = (cards: Flashcard[]) => {
        // Configuration par défaut pour le quiz Nemesis
        // On essaie de deviner la langue dominante ou on met par défaut
        const config: QuizConfig = {
            questionLang: 'fr', 
            answerLang: 'en', // Faudra peut-être rendre ça dynamique
            mode: 'classic',
            gameMode: 'survival', // Mode survie pour le côté "Nemesis" !
            voiceEngine: 'local',
            autoPlayAudio: false,
            quizName: '😈 Nemesis Quiz'
        };
        const uniqueCards = deduplicateCards(cards, config.questionLang, config.answerLang);
        onStartQuiz(uniqueCards, config);
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative">
            {/* Bouton flottant toggle */}
            <FloatingHeaderToggle showHeader={showHeader} onToggle={toggleHeader} />

            {/* Header — amovible */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
                showHeader ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
            <div 
                className={`transition-all duration-500 pt-safe p-3 md:p-6 shadow-lg relative overflow-hidden ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <Button 
                            variant="secondary" 
                            onClick={onBack} 
                            size="sm" 
                            className={`mb-2 md:mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm transition-all`}
                        >
                            <i className="fas fa-home mr-2 text-inherit"></i> Accueil
                        </Button>
                        <h1 className="text-xl md:text-3xl font-black drop-shadow-sm text-inherit">
                            {t('dashboard.title')}
                        </h1>
                        <p className="opacity-80 mt-1 text-xs md:text-base text-inherit">Consultez vos progrès et vos succès</p>
                    </div>

                    {onSyncPush && (
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={onSyncPush}
                            className={`w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-blue-500/10 text-blue-600' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm transition-all`}
                        >
                            <i className="fas fa-cloud-upload-alt mr-2"></i> Sauvegarder
                        </Button>
                    )}
                </div>
            </div>
            </div>

            <div className="p-4 md:p-6 flex-1 overflow-y-auto min-h-0 space-y-4 md:space-y-6 pb-32">

            {/* Résumé Global */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-background-secondary p-4 rounded-lg shadow border-l-4 border-primary">
                    <p className="text-sm text-text-muted">{t('dashboard.summary.streak')}</p>
                    <p className="text-2xl font-bold">🔥 {t('dashboard.summary.days', { count: gamificationData.streak.currentStreak })}</p>
                </div>
                <div className="bg-background-secondary p-4 rounded-lg shadow border-l-4 border-primary">
                    <p className="text-sm text-text-muted">{t('dashboard.summary.totalQuizzes')}</p>
                    <p className="text-2xl font-bold">📝 {gamificationData.totalQuizzes}</p>
                </div>
                <div className="bg-background-secondary p-4 rounded-lg shadow border-l-4 border-info">
                    <p className="text-sm text-text-muted">{t('dashboard.summary.studyTime')}</p>
                    <p className="text-2xl font-bold">⏱️ {formatTime(gamificationData.totalStudyTime)}</p>
                </div>
                <div className="bg-background-secondary p-4 rounded-lg shadow border-l-4 border-accent">
                    <p className="text-sm text-text-muted">{t('dashboard.summary.avgAccuracy')}</p>
                    <p className="text-2xl font-bold">🎯 {Math.round(analyticsData.averageAccuracy)}%</p>
                </div>
            </div>

            {/* Graphique d'activité (Heatmap) */}
            <div className="bg-background-secondary p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-6">{t('dashboard.activity.title')}</h2>
                <ActivityHeatmap activities={analyticsData.dailyActivities} />
            </div>

            {/* Mur des Difficultés (Nemesis Wall) */}
            <NemesisWall 
                cardDifficulties={analyticsData.cardDifficulties}
                allFlashcards={allFlashcards}
                onStartNemesisQuiz={handleStartNemesisQuiz}
            />

            <div className="grid md:grid-cols-2 gap-6">
                {/* Statistiques par langue */}
                <div className="bg-background-secondary p-6 rounded-lg shadow flex flex-col">
                    <h2 className="text-xl font-semibold mb-6">{t('dashboard.skills.title')}</h2>
                    
                    {/* Radar Chart Centré */}
                    <div className="flex justify-center mb-6">
                        <SkillsRadar stats={analyticsData.languageStats} />
                    </div>

                    <div className="space-y-4 border-t border-border pt-4">
                        {Object.entries(analyticsData.languageStats).map(([lang, stats]) => (
                            <div key={lang} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">
                                        {lang === 'fr' ? '🇫🇷' : 
                                         lang === 'en' ? '🇬🇧' : 
                                         lang === 'es' ? '🇪🇸' : 
                                         lang === 'it' ? '🇮🇹' : 
                                         lang === 'pt' ? '🇵🇹' :
                                         lang === 'de' ? '🇩🇪' :
                                         lang === 'ru' ? '🇷🇺' :
                                         ['front', 'back', 'recto', 'verso'].includes(lang.toLowerCase()) ? '🗂️' : '🌐'}
                                    </span>
                                    <div>
                                        <p className="font-medium">{t('languages.' + lang) || lang.toUpperCase()}</p>
                                        <p className="text-xs text-text-muted">{stats.cardsStudied} {t('setup.cardsInSet', { count: stats.cardsStudied }).replace('{count}', stats.cardsStudied.toString())}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-primary">{Math.round(stats.accuracy)}%</p>
                                    <p className="text-xs text-text-muted">⏱️ {formatTime(stats.studyTime)}</p>
                                </div>
                            </div>
                        ))}
                        {Object.keys(analyticsData.languageStats).length === 0 && (
                            <p className="text-text-muted text-center italic">{t('common.error')}</p>
                        )}
                    </div>
                </div>

                {/* Derniers Succès */}
                <div className="bg-background-secondary p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">{t('dashboard.achievements.title')}</h2>
                    <div className="space-y-3">
                        {gamificationData.achievements
                            .filter(a => a.unlockedAt)
                            .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
                            .slice(0, 5)
                            .map(achievement => (
                                <div key={achievement.id} className="flex items-center p-3 bg-background-tertiary rounded">
                                    <span className="text-2xl mr-3">{achievement.icon}</span>
                                    <div>
                                        <p className="font-bold text-sm">{achievement.name}</p>
                                        <p className="text-xs text-text-secondary">{achievement.description}</p>
                                    </div>
                                    <div className="ml-auto text-xs text-text-muted">
                                        {new Date(achievement.unlockedAt!).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        {gamificationData.achievements.filter(a => a.unlockedAt).length === 0 && (
                            <p className="text-text-muted text-center italic">{t('dashboard.achievements.emptyText')}</p>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};
