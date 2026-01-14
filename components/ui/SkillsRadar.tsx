import React from 'react';
import { AnalyticsData } from '../../types';

interface SkillsRadarProps {
    stats: AnalyticsData['languageStats'];
    size?: number;
}

export const SkillsRadar: React.FC<SkillsRadarProps> = ({ stats, size = 300 }) => {
    const center = size / 2;
    const radius = (size / 2) - 40; // Marge pour les labels
    
    // Convertir les stats en tableau pour le tracé
    const languages = Object.entries(stats);
    
    // Si pas assez de données, afficher un message
    if (languages.length < 3) {
        return (
            <div 
                className="flex items-center justify-center bg-background-secondary rounded-full border border-border border-dashed"
                style={{ width: size, height: size }}
            >
                <p className="text-center text-text-muted text-sm px-8">
                    Étudiez au moins 3 langues pour débloquer le radar de compétences ! 🕸️
                    <br/>
                    <span className="text-xs opacity-70">(Actuellement : {languages.length})</span>
                </p>
            </div>
        );
    }

    // Calculer les coordonnées pour un angle donné et une valeur (0-100)
    const getPoint = (value: number, index: number, total: number) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2; // -PI/2 pour commencer en haut
        const r = (value / 100) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return { x, y };
    };

    const totalLangs = languages.length;
    
    // Points du polygone de données
    const dataPoints = languages.map(([_, data], i) => {
        // Score pondéré : Précision, mais réduit si peu de cartes étudiées (< 20 cartes)
        const confidence = Math.min(data.cardsStudied / 20, 1); 
        const score = data.accuracy * confidence;
        return getPoint(score, i, totalLangs);
    });

    const polygonPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    // Grille de fond (niveaux 25%, 50%, 75%, 100%)
    const levels = [25, 50, 75, 100];
    
    const getEmoji = (code: string) => {
        const map: Record<string, string> = { fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', pt: '🇵🇹', de: '🇩🇪' };
        return map[code] || '🌐';
    };

    return (
        <svg width={size} height={size} className="overflow-visible">
            {/* Grille concentrique */}
            {levels.map(level => {
                const points = languages.map((_, i) => {
                    const p = getPoint(level, i, totalLangs);
                    return `${p.x},${p.y}`;
                }).join(' ');
                
                return (
                    <polygon 
                        key={level} 
                        points={points} 
                        fill="none" 
                        stroke="currentColor" 
                        strokeOpacity={0.1} 
                        strokeWidth="1"
                    />
                );
            })}

            {/* Rayons (axes) */}
            {languages.map((_, i) => {
                const p = getPoint(100, i, totalLangs);
                return (
                    <line 
                        key={i} 
                        x1={center} 
                        y1={center} 
                        x2={p.x} 
                        y2={p.y} 
                        stroke="currentColor" 
                        strokeOpacity={0.1} 
                        strokeWidth="1" 
                    />
                );
            })}

            {/* Zone de données (Compétences) */}
            <polygon 
                points={polygonPath} 
                className="fill-primary/20 stroke-primary" 
                strokeWidth="2"
            />
            
            {/* Points aux sommets */}
            {dataPoints.map((p, i) => (
                <circle 
                    key={i} 
                    cx={p.x} 
                    cy={p.y} 
                    r="4" 
                    className="fill-primary" 
                />
            ))}

            {/* Labels (Langues) */}
            {languages.map(([lang, data], i) => {
                // Positionner le label un peu plus loin que le rayon max
                const angle = (Math.PI * 2 * i) / totalLangs - Math.PI / 2;
                const labelR = radius + 25;
                const x = center + labelR * Math.cos(angle);
                const y = center + labelR * Math.sin(angle);
                
                return (
                    <g key={lang} transform={`translate(${x}, ${y})`}>
                        <text 
                            textAnchor="middle" 
                            dominantBaseline="middle" 
                            className="fill-text text-sm font-bold"
                        >
                            {getEmoji(lang)} {lang.toUpperCase()}
                        </text>
                        <text
                             y="14"
                             textAnchor="middle"
                             className="fill-text-muted text-xs"
                        >
                            {Math.round(data.accuracy)}%
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};
