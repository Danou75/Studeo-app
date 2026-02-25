import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { DrawingSubmissionModal } from './DrawingSubmissionModal';
import { useAIConfig } from '../contexts/AIConfigContext';
import { generateDrawingTutorial, DrawingTutorial } from '../services/drawingTutorialService';
import { ChessBoard } from './ChessBoard';
import { 
    getRandomSuggestions, 
    getAllSuggestions,
    type TutorType, 
    type SkillLevel 
} from '../services/tutorialSuggestionsService';
import {
    markTutorialCompleted,
    getSuggestedLevelForTutor,
    isTutorialCompleted,
    getRecommendedTutorials,
    getTutorStats
} from '../services/progressTrackingService';

const getPiecesFromFen = (fen: string) => {
    const pieces: Record<string, string> = {};
    const rows = fen.split(' ')[0].split('/');
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
    rows.forEach((row, rIdx) => {
        let fIdx = 0;
        for (const char of row) {
            if (/\d/.test(char)) {
                fIdx += parseInt(char);
            } else {
                const rank = 8 - rIdx;
                const file = files[fIdx];
                pieces[`${file}${rank}`] = char;
                fIdx++;
            }
        }
    });
    return pieces;
};

const ChessGridBackground = () => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            {/* Bordure extérieure pour ne pas empiéter sur l'espace de jeu */}
            <div className="relative p-1 bg-[#8b4513] rounded shadow-2xl border-2 border-[#5d2e0d] w-full h-full">
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full bg-[#b58863]">
                    {Array.from({ length: 64 }).map((_, i) => {
                        const row = Math.floor(i / 8);
                        const col = i % 8;
                        const isDark = (row + col) % 2 === 1;
                        return (
                            <div 
                                key={i} 
                                className={`relative w-full h-full ${isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'}`} 
                            >
                                {col === 0 && <span className="absolute left-0.5 top-0.5 text-[8px] font-bold opacity-30">{ranks[row]}</span>}
                                {row === 7 && <span className="absolute right-0.5 bottom-0.5 text-[8px] font-bold opacity-30">{files[col]}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

interface DrawingTutorialScreenProps {
    onBack: () => void;
    initialTopic?: string;
    tutorId?: string; // "maitre-leonard" or "prof-melodia"
}

export const DrawingTutorialScreen: React.FC<DrawingTutorialScreenProps> = ({ onBack, initialTopic, tutorId = 'maitre-leonard' }) => {
    const { config } = useAIConfig();
    
    const isMusic = tutorId === 'prof-melodia';
    const isChess = tutorId === 'gm-kaspar';
    const isCode = tutorId === 'prof-turing';
    const tutorEmoji = isMusic ? '🎹' : isChess ? '♟️' : isCode ? '💻' : '🐢';
    const tutorName = isMusic ? 'Mélodia' : isChess ? 'Grand Maître Kaspar' : isCode ? 'Prof. Turing' : 'Léonard';
    
    // States
    const [topic, setTopic] = useState(initialTopic || '');
    const [isLoading, setIsLoading] = useState(false);
    const [tutorial, setTutorial] = useState<DrawingTutorial | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [animationKey, setAnimationKey] = useState(0); // Clé pour forcer le replay de l'animation CSS
    
    // Déterminer le type de tuteur et initialiser le niveau basé sur la progression
    const tutorType: TutorType = isCode ? 'coding' : isChess ? 'chess' : isMusic ? 'music' : 'drawing';
    const suggestedLevel = getSuggestedLevelForTutor(tutorType);
    const [selectedLevel, setSelectedLevel] = useState<SkillLevel>(suggestedLevel); // Niveau sélectionné
    const [tutorialStartTime, setTutorialStartTime] = useState<number | null>(null); // Pour tracker le temps

    useEffect(() => {
        setAnimationKey(prev => prev + 1);
    }, [currentStepIndex]);

    // Si on a un sujet initial, on lance la génération auto
    useEffect(() => {
        if (initialTopic) {
            handleGenerateTutorial();
        }
    }, [initialTopic]);

    const handleGenerateTutorial = async () => {
        if (!topic.trim()) return;
        
        setIsLoading(true);
        setError(null);
        setTutorial(null);
        setCurrentStepIndex(0);

        try {
            const data = await generateDrawingTutorial(topic, config, tutorName);
            setTutorial(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Impossible de générer le tutoriel. Vérifiez votre connexion ou votre configuration.");
        } finally {
            setIsLoading(false);
        }
    };

    // Démarrer le chronomètre quand le tutoriel est généré
    useEffect(() => {
        if (tutorial && !tutorialStartTime) {
            setTutorialStartTime(Date.now());
        }
    }, [tutorial, tutorialStartTime]);

    const handleNext = () => {
        if (tutorial && currentStepIndex < tutorial.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            // Fin du tuto - Marquer comme complété
            if (tutorial && tutorialStartTime) {
                const timeSpent = Math.floor((Date.now() - tutorialStartTime) / 1000); // en secondes
                
                // Déterminer le niveau du tutoriel (on utilise selectedLevel)
                markTutorialCompleted(tutorType, tutorial.topic, selectedLevel, timeSpent);
            }
            
            if (isChess || isMusic) {
                setIsCompleted(true);
            } else {
                setIsSubmissionModalOpen(true);
            }
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden">
            {/* Header */}
            <header className="shrink-0 pt-safe p-4 md:p-6 border-b bg-background-secondary shadow-sm relative z-10">
                <div className="max-w-6xl mx-auto w-full flex justify-between items-center">
                    <Button onClick={onBack} variant="secondary" size="sm">
                        <i className="fas fa-home mr-2"></i> Accueil
                    </Button>
                    <div className="flex items-center gap-2">
                         <span className="text-2xl md:text-3xl">{tutorEmoji}</span>
                         <h1 className="text-lg md:text-xl font-bold text-primary">Pas à Pas avec {tutorName}</h1>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50 min-h-0 pb-32">
                <div className="max-w-6xl mx-auto w-full pb-32">

            {/* Input Phase (si pas de tuto généré) */}
            {!tutorial && !isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full">
                    <div className="bg-background-secondary p-12 rounded-2xl shadow-lg border border-border w-full text-center">
                        <i className={`fas ${isMusic ? 'fa-music' : isChess ? 'fa-chess' : isCode ? 'fa-code' : 'fa-pencil-alt'} text-6xl text-primary mb-6`}></i>
                        <h2 className="text-3xl font-bold mb-4">Que voulez-vous {isMusic ? 'apprendre' : isChess ? 'étudier' : isCode ? 'coder' : 'dessiner'} ?</h2>
                        <p className="text-lg text-text-secondary mb-8">{tutorName} va décomposer la notion en étapes simples.</p>
                        
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={isMusic ? "Ex: Accords barrés, Lecture de rythme..." : isChess ? "Ex: Gambit Dame, Finale de pions..." : isCode ? "Ex: Boucle For, Classe Python, Promesses JS..." : "Ex: Perspective, Portrait, Anatomie..."}
                                className="flex-1 p-4 text-lg rounded-xl bg-background border border-border focus:border-primary outline-none shadow-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateTutorial()}
                            />
                            <Button onClick={handleGenerateTutorial} disabled={!topic.trim()} size="lg" className="px-8 text-lg">
                                C'est parti !
                            </Button>
                        </div>

                        {/* Recommandations personnalisées */}
                        {(() => {
                            const stats = getTutorStats(tutorType);
                            if (stats.totalCompleted > 0) {
                                const allSuggestions = getAllSuggestions(tutorType);
                                const recommended = getRecommendedTutorials(tutorType, allSuggestions);
                                
                                if (recommended.length > 0) {
                                    return (
                                        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                                            <p className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                                                <i className="fas fa-star"></i>
                                                Recommandé pour vous
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {recommended.slice(0, 4).map(r => {
                                                    const isCompleted = isTutorialCompleted(tutorType, r.title);
                                                    return (
                                                        <button
                                                            key={r.title}
                                                            onClick={() => setTopic(r.title)}
                                                            className={`group relative text-xs px-3 py-1.5 rounded-full transition-all ${
                                                                isCompleted 
                                                                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                                                                    : 'bg-white dark:bg-background border border-primary/30 text-primary hover:bg-primary/10'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                {isCompleted && '✓ '}
                                                                {r.level === 'beginner' && '🌱'}
                                                                {r.level === 'intermediate' && '📚'}
                                                                {r.level === 'advanced' && '🎓'}
                                                                {r.title}
                                                            </span>
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-background-secondary border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                                <div className="text-xs font-semibold text-primary">{r.reason}</div>
                                                                <div className="text-xs text-text-secondary">{r.category}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }
                            }
                            return null;
                        })()}

                        {/* Sélecteur de niveau */}
                        <div className="mt-6 mb-4">
                            <p className="text-sm text-text-secondary mb-2">Niveau suggéré :</p>
                            <div className="flex gap-2 justify-center">
                                {(['beginner', 'intermediate', 'advanced'] as SkillLevel[]).map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            selectedLevel === level
                                                ? level === 'beginner' 
                                                    ? 'bg-green-500 text-white shadow-lg scale-105' 
                                                    : level === 'intermediate'
                                                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                                                    : 'bg-purple-500 text-white shadow-lg scale-105'
                                                : level === 'beginner' 
                                                    ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30' 
                                                    : level === 'intermediate'
                                                    ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                    : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                        } hover:opacity-80`}
                                    >
                                        {level === 'beginner' ? '🌱 Débutant' : level === 'intermediate' ? '📚 Intermédiaire' : '🎓 Avancé'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Suggestions intelligentes */}
                        <div className="mt-4">
                            <p className="text-xs text-text-secondary mb-2">Suggestions :</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {(() => {
                                    const suggestions = getRandomSuggestions(tutorType, 6, selectedLevel);
                                    return suggestions.map(s => {
                                        const isCompleted = isTutorialCompleted(tutorType, s.title);
                                        return (
                                            <button
                                                key={s.title}
                                                onClick={() => setTopic(s.title)}
                                                className={`group relative text-xs px-3 py-1.5 rounded-full transition-all ${
                                                    isCompleted 
                                                        ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                                                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                }`}
                                                title={s.description}
                                            >
                                                <span className="flex items-center gap-1">
                                                    {isCompleted && '✓ '}
                                                    {s.level === 'beginner' && '🌱'}
                                                    {s.level === 'intermediate' && '📚'}
                                                    {s.level === 'advanced' && '🎓'}
                                                    {s.title}
                                                </span>
                                                {/* Tooltip au survol */}
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-background-secondary border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                                    <div className="text-xs font-semibold text-primary">{s.category}</div>
                                                    <div className="text-xs text-text-secondary">{s.description}</div>
                                                    {isCompleted && <div className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Complété</div>}
                                                </div>
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                    
                    {error && (
                        <div className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/20 p-3 rounded-lg">
                            {error}
                        </div>
                    )}
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <i className="fas fa-spinner fa-spin text-6xl text-primary mb-6"></i>
                    <p className="text-xl font-medium animate-pulse">{tutorName} réfléchit à la méthode...</p>
                </div>
            )}

            {/* Tutorial Display */}
            {tutorial && !isCompleted && (
                <div className="flex-1 flex flex-col items-center w-full">
                    
                    {/* Progress Bar */}
                    <div className="w-full flex gap-1 mb-8">
                        {tutorial.steps.map((_, idx) => (
                            <div 
                                key={idx}
                                className={`h-2 flex-1 rounded-full transition-all ${
                                    idx <= currentStepIndex ? 'bg-primary' : 'bg-background-tertiary'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Step Card with Grid Layout */}
                    <div className="bg-background-secondary border border-border rounded-2xl p-8 shadow-xl w-full flex-1 flex flex-col gap-6 relative overflow-hidden">
                        
                        {/* watermark bg */}
                        <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 pointer-events-none z-0">
                            {currentStepIndex + 1}
                        </div>

                        {/* Image Column (Animation) */}
                        <div className="w-full flex items-center justify-center bg-white rounded-xl border-2 border-border border-dashed p-4 shadow-inner relative z-10 overflow-hidden min-h-[600px]">
                            {/* Container pour l'animation agrandie */}
                            <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
                                {tutorial.steps[currentStepIndex].codeBlock ? (
                                    <div className="w-full h-full p-6 bg-[#1e1e1e] text-[#d4d4d4] rounded-xl overflow-auto font-mono text-sm shadow-inner border border-[#333]">
                                        <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-2">
                                            <span className="text-xs text-[#569cd6] uppercase font-bold">{tutorial.steps[currentStepIndex].codeBlock.language}</span>
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                                <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                            </div>
                                        </div>
                                        <pre className="whitespace-pre-wrap leading-relaxed">
                                            {tutorial.steps[currentStepIndex].codeBlock.code}
                                        </pre>
                                    </div>
                                ) : (tutorial.steps[currentStepIndex].fen && isChess) ? (
                                    <div className="w-full h-full flex items-center justify-center pointer-events-none transform scale-125">
                                        <ChessBoard 
                                            pieces={getPiecesFromFen(tutorial.steps[currentStepIndex].fen || '')}
                                            arrows={tutorial.steps[currentStepIndex].arrows}
                                            orientation="white"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Replay Button */}
                                        <button 
                                            onClick={() => setAnimationKey(prev => prev + 1)}
                                            className="absolute top-4 right-4 p-3 bg-white border border-border text-primary hover:bg-primary hover:text-white rounded-full shadow-md transition-all z-20 flex items-center gap-2 text-sm font-bold"
                                            title="Rejouer le tracé"
                                        >
                                            <i className="fas fa-play"></i>
                                        </button>

                                        {isChess && <ChessGridBackground />}

                                        <svg width="0" height="0" className="absolute">
                                            <defs>
                                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                                                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                                                </marker>
                                            </defs>
                                        </svg>

                                        <style>{`
                                            @keyframes draw {
                                                from { stroke-dashoffset: 3000; opacity: 0; }
                                                to { stroke-dashoffset: 0; opacity: 1; }
                                            }
                                            .new-lines path, .new-lines line, .new-lines rect, .new-lines circle, .new-lines ellipse, .new-lines polyline, .new-lines polygon, .new-lines text {
                                                stroke-dasharray: 3000;
                                                stroke-dashoffset: 3000;
                                                animation: draw 6s ease-in-out forwards;
                                            }
                                        `}</style>
        
                                        {tutorial.steps[currentStepIndex].svgCode ? (
                                            <div 
                                                key={animationKey} 
                                                className="relative z-10 w-full h-full [&>svg]:w-full [&>svg]:h-full overflow-visible"
                                                dangerouslySetInnerHTML={{ __html: tutorial.steps[currentStepIndex].svgCode }}
                                            />
                                        ) : (
                                            <div className="text-center text-text-secondary">
                                                <i className="fas fa-image text-4xl mb-2 opacity-30"></i>
                                                <p>Pas d'image</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Text Column (Instructions en dessous) */}
                        <div className="w-full flex flex-col items-center text-center relative z-10 pt-4 border-t border-border">
                            <div className="mb-2 text-primary font-bold uppercase tracking-wider text-sm">
                                Étape {currentStepIndex + 1} / {tutorial.steps.length}
                            </div>
                            
                            <h2 className="text-2xl font-bold mb-4 text-text max-w-2xl">
                                {tutorial.steps[currentStepIndex].instruction}
                            </h2>
                            
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 text-sm text-text-secondary flex items-center gap-2">
                                <i className="fas fa-info-circle text-primary"></i>
                                <p>Prenez votre temps avant de passer à la suite.</p>
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-full flex justify-between mt-6">
                        <Button 
                            onClick={handlePrev} 
                            variant="secondary"
                            disabled={currentStepIndex === 0}
                            className="w-32"
                        >
                            <i className="fas fa-arrow-left mr-2"></i> Précédent
                        </Button>

                        <div className="text-center md:hidden">
                            {currentStepIndex + 1} / {tutorial.steps.length}
                        </div>

                        <Button 
                            onClick={handleNext} 
                            className="w-32"
                            variant="primary"
                        >
                            {currentStepIndex === tutorial.steps.length - 1 ? (
                                <>Valider <i className="fas fa-check ml-2"></i></>
                            ) : (
                                <>Suivant <i className="fas fa-arrow-right ml-2"></i></>
                            )}
                        </Button>
                    </div>
                </div>
            )}
            {/* Success State (for non-submission tutorials) */}
            {isCompleted && (
                <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full text-center">
                    <div className="bg-background-secondary p-8 rounded-2xl shadow-lg border border-border w-full">
                        <div className="text-6xl mb-6 animate-bounce">🏆</div>
                        <h2 className="text-3xl font-bold mb-4">Félicitations !</h2>
                        <p className="text-lg text-text-secondary mb-8">
                            Vous avez terminé votre étude sur <strong>{tutorial?.topic}</strong> avec {tutorName}.
                        </p>
                        <Button onClick={onBack} size="lg" className="w-full">
                            Revenir à l'accueil
                        </Button>
                    </div>
                </div>
            )}

            {/* Final Submission Modal */}
            <DrawingSubmissionModal
                isOpen={isSubmissionModalOpen}
                onClose={() => setIsSubmissionModalOpen(false)}
                challenge={`Reproduire le dessin : ${tutorial?.topic}`}
                criteria={`Le dessin doit respecter les étapes : ${tutorial?.steps.map(s => s.instruction).join(', ')}.`}
                apiKey={
                    config.provider === 'mistral' ? (config.mistralApiKey || '') :
                    config.provider === 'openai' ? (config.openaiApiKey || '') :
                    (config.geminiApiKey || '')
                }
                provider={config.provider}
                modelName={
                    config.provider === 'mistral' ? (config.mistralModel || 'pixtral-12b-2409') :
                    config.provider === 'openai' ? (config.openaiModel || 'gpt-4o') :
                    (config.geminiModel || 'gemini-2.5-flash')
                }
                tutorName={tutorName}
            />
                </div>
            </div>
        </div>
    );
};
