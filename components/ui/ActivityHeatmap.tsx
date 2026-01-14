import React from 'react';
import { DailyActivity } from '../../types';

interface ActivityHeatmapProps {
    activities: DailyActivity[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activities }) => {
    // 1. Générer les 365 derniers jours
    const today = new Date();
    const days: { date: Date; dateStr: string; activity?: DailyActivity }[] = [];
    
    // On remonte 52 semaines en arrière pour avoir une grille complète
    // On s'aligne sur le dimanche précédent d'il y a 52 semaines
    const endDate = new Date(today);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 365);
    
    // Ajuster au dimanche précédent pour aligner la grille
    while (startDate.getDay() !== 0) {
        startDate.setDate(startDate.getDate() - 1);
    }

    // Créer la map des activités pour accès O(1)
    const activityMap = new Map<string, DailyActivity>();
    activities.forEach(a => activityMap.set(a.date, a));

    // Remplir le tableau des jours
    const iterDate = new Date(startDate);
    while (iterDate <= endDate) {
        const dateStr = iterDate.toISOString().split('T')[0];
        days.push({
            date: new Date(iterDate),
            dateStr,
            activity: activityMap.get(dateStr)
        });
        iterDate.setDate(iterDate.getDate() + 1);
    }

    // 2. Définir les niveaux de couleur (basé sur le nombre de cartes ou temps)
    const getIntensityClass = (count: number) => {
        if (count === 0) return 'bg-gray-200 dark:bg-gray-800'; // Vide
        if (count < 10) return 'bg-green-200 dark:bg-green-900'; // Léger
        if (count < 30) return 'bg-green-400 dark:bg-green-700'; // Moyen
        if (count < 60) return 'bg-green-500 dark:bg-green-600'; // Fort
        return 'bg-green-600 dark:bg-green-500'; // Intense
    };

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    return (
        <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[700px]"> {/* Force width for scroll on mobile */}
                <div className="flex text-xs text-text-muted mb-2 gap-8 ml-8">
                    {/* Affichage approximatif des mois - à améliorer pour un alignement parfait */}
                    {Array.from({ length: 12 }).map((_, i) => {
                        const d = new Date(startDate);
                        d.setMonth(startDate.getMonth() + i);
                        return <span key={i}>{months[d.getMonth()]}</span>;
                    })}
                </div>
                
                <div className="flex gap-1">
                    {/* Labels Jours (Lun/Mer/Ven) */}
                    <div className="flex flex-col gap-1 text-[10px] text-text-muted justify-between pt-2 pb-2 mr-1">
                        <span className="h-3"></span>
                        <span className="h-3">Lun</span>
                        <span className="h-3"></span>
                        <span className="h-3">Mer</span>
                        <span className="h-3"></span>
                        <span className="h-3">Ven</span>
                        <span className="h-3"></span>
                    </div>

                    {/* Grille */}
                    <div 
                        className="grid gap-1 grid-flow-col" 
                        style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
                    >
                        {days.map((day, i) => {
                            const count = day.activity?.cardsStudied || 0;
                            const time = day.activity ? Math.round(day.activity.studyTime / 60) : 0;
                            
                            // Si on est sur les 2 premières lignes (haut de la grille), on affiche le tooltip en dessous
                            // sinon il risque d'être coupé ou de masquer les mois
                            const rowIndex = i % 7;
                            const isTopRow = rowIndex < 2;
                            const tooltipPosition = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';
                            
                            return (
                                <div
                                    key={day.dateStr}
                                    className={`w-3 h-3 rounded-sm ${getIntensityClass(count)} hover:ring-2 hover:ring-gray-400 cursor-pointer relative group transition-colors`}
                                >
                                    {/* Tooltip */}
                                    <div className={`absolute ${tooltipPosition} left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded z-50 whitespace-nowrap pointer-events-none shadow-lg border border-gray-700`}>
                                        <strong>{day.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
                                        <br />
                                        {count > 0 ? (
                                            <>
                                                🎴 {count} cartes<br />
                                                ⏱️ {time} min
                                            </>
                                        ) : (
                                            <span className="text-gray-400">Pas d'activité</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3 text-xs text-text-muted justify-end ml-8">
                    <span>Moins</span>
                    <div className="w-3 h-3 bg-gray-200 dark:bg-gray-800 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-sm"></div>
                    <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
                    <span>Plus</span>
                </div>
            </div>
        </div>
    );
};
