import React, { Dispatch, SetStateAction } from 'react';
import { PronunciationChallenge } from './pronunciationUtils';

export interface PronunciationCoachViewProps {
    activeLang: string;
    t: (key: string) => string;
    pronunciationChallenges: PronunciationChallenge[];
    setPronunciationChallenges: Dispatch<SetStateAction<PronunciationChallenge[]>>;
    pronunciationType: 'challenges' | 'dialogue';
    currentChallengeIndex: number;
    setCurrentChallengeIndex: Dispatch<SetStateAction<number>>;
    pronunciationResult: {score: number, feedback: string} | null;
    setPronunciationResult: Dispatch<SetStateAction<{score: number, feedback: string} | null>>;
    isGeneratingChallenges: boolean;
    dialogueTopic: string;
    setDialogueTopic: (topic: string) => void;
    dialogueLevel: 'beginner' | 'intermediate' | 'advanced';
    setDialogueLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void;
    showTopicInput: boolean;
    setShowTopicInput: (show: boolean) => void;
    generatePronunciationChallenges: (mode?: 'challenges' | 'dialogue') => void;
    speak: (text: string) => void;
    transcript: string;
    resetTranscript: () => void;
    listeningStatus: string;
    startListening: () => void;
    stopListening: () => void;
}

export const PronunciationCoachView: React.FC<PronunciationCoachViewProps> = ({
    activeLang,
    t,
    pronunciationChallenges,
    setPronunciationChallenges,
    pronunciationType,
    currentChallengeIndex,
    setCurrentChallengeIndex,
    pronunciationResult,
    setPronunciationResult,
    isGeneratingChallenges,
    dialogueTopic,
    setDialogueTopic,
    dialogueLevel,
    setDialogueLevel,
    showTopicInput,
    setShowTopicInput,
    generatePronunciationChallenges,
    speak,
    transcript,
    resetTranscript,
    listeningStatus,
    startListening,
    stopListening
}) => {
    return (
        <div className="flex-1 flex flex-col p-4 overflow-hidden relative bg-gray-50 dark:bg-gray-900">
            {!pronunciationChallenges.length ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-5xl shadow-lg mb-4 text-white">
                        🎙️
                    </div>
                    <h2 className="text-2xl font-bold">Coach de Prononciation</h2>
                    <p className="text-gray-600 dark:text-gray-300 max-w-md">
                        L'IA va générer des phrases ciblées pour travailler votre accent en {t('languages.' + (activeLang.includes('-') ? activeLang.split('-')[0] : activeLang)) || (activeLang.includes('-') ? activeLang.split('-')[0].toUpperCase() : activeLang.toUpperCase())}.
                    </p>
                    <button 
                        onClick={() => generatePronunciationChallenges('challenges')}
                        disabled={isGeneratingChallenges}
                        className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl shadow-lg font-bold text-lg hover:opacity-90 transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                        {isGeneratingChallenges ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-random"></i>}
                        {isGeneratingChallenges ? "Génération..." : "10 Défis Aléatoires"}
                    </button>

                    
                    {!showTopicInput ? (
                        <button 
                            onClick={() => setShowTopicInput(true)}
                            className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-xl shadow-lg font-bold text-lg hover:opacity-90 transition-transform hover:scale-105 flex items-center justify-center gap-3"
                        >
                            <i className="fas fa-comments"></i> Dialogue (Roleplay)
                        </button>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex flex-col gap-3 border border-primary/30 animate-fade-in-up w-full sm:w-80">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Sujet du dialogue (optionnel) :</label>
                            <input 
                                type="text" 
                                value={dialogueTopic}
                                onChange={(e) => setDialogueTopic(e.target.value)}
                                placeholder="Ex: Au restaurant, Entretien..."
                                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-gray-50 dark:bg-gray-700"
                            />
                            
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-2">Niveau :</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDialogueLevel('beginner')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                                        dialogueLevel === 'beginner' 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    🌱 Débutant
                                </button>
                                <button
                                    onClick={() => setDialogueLevel('intermediate')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                                        dialogueLevel === 'intermediate' 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    📚 Intermédiaire
                                </button>
                                <button
                                    onClick={() => setDialogueLevel('advanced')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                                        dialogueLevel === 'advanced' 
                                            ? 'bg-primary text-white' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    🎓 Avancé
                                </button>
                            </div>
                            
                            <div className="flex gap-2 mt-2">
                                <button 
                                    onClick={() => setShowTopicInput(false)}
                                    className="flex-1 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm font-bold"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={() => generatePronunciationChallenges('dialogue')}
                                    disabled={isGeneratingChallenges}
                                    className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:hover:bg-primary/90 transition-colors"
                                >
                                    {isGeneratingChallenges ? <i className="fas fa-spinner fa-spin"></i> : "Générer"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                 <div className="flex-1 flex flex-col items-center justify-start space-y-6 pt-2 max-w-2xl mx-auto w-full overflow-y-auto min-h-0 px-2 pb-10">
                    {/* PROGRESS */}
                    <div className="w-full flex justify-between items-center text-sm text-gray-500 px-2">
                        <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full font-mono">
                            {pronunciationType === 'challenges' ? `Défi ${currentChallengeIndex + 1} / ${pronunciationChallenges.length}` : `Réplique ${currentChallengeIndex + 1} / ${pronunciationChallenges.length}`}
                        </span>
                        <button onClick={() => setPronunciationChallenges([])} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fas fa-times mr-1"></i> Quitter</button>
                    </div>

                    {/* CARD */}
                    <div className={`bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl w-full border border-gray-100 dark:border-gray-700 relative transition-all ${pronunciationResult?.score && pronunciationResult.score > 80 ? 'ring-2 ring-green-400' : ''}`}>
                        {pronunciationType === 'challenges' && (
                            <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-xs font-bold uppercase tracking-wider ${
                                pronunciationChallenges[currentChallengeIndex].difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                pronunciationChallenges[currentChallengeIndex].difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {pronunciationChallenges[currentChallengeIndex].difficulty}
                            </div>
                        )}

                        {pronunciationType === 'dialogue' && (
                            <div className="absolute top-0 left-0 px-4 py-2 rounded-br-2xl text-xs font-bold bg-primary/20 text-primary uppercase tracking-wider">
                                {pronunciationChallenges[currentChallengeIndex].speaker === 'A' ? 'Personnage A' : 'Personnage B'}
                            </div>
                        )}

                        <div className="mb-6 mt-4">
                            {pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai' && (
                                  <p className="text-center text-xs text-gray-400 mb-2 uppercase tracking-widest"><i className="fas fa-headphones mr-1"></i> Écoutez l'interlocuteur</p>
                            )}
                             {pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'user' && (
                                  <p className="text-center text-xs text-primary mb-2 uppercase tracking-widest"><i className="fas fa-microphone mr-1"></i> À votre tour</p>
                            )}

                            <h3 className={`font-bold text-center mb-4 leading-snug py-2 break-words hyphens-auto ${
                                pronunciationChallenges[currentChallengeIndex].text.length > 80 ? 'text-lg' :
                                pronunciationChallenges[currentChallengeIndex].text.length > 50 ? 'text-xl' :
                                pronunciationChallenges[currentChallengeIndex].text.length > 30 ? 'text-2xl' : 'text-3xl'
                            } ${pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai' ? 'text-gray-500 italic' : 'text-text dark:text-gray-100'}`}>
                                {pronunciationChallenges[currentChallengeIndex].text}
                            </h3>
                            
                            {pronunciationChallenges[currentChallengeIndex].phonetic && (
                                <p className="text-center text-gray-400 font-mono text-lg opacity-70">/{pronunciationChallenges[currentChallengeIndex].phonetic}/</p>
                            )}
                            {pronunciationChallenges[currentChallengeIndex].translation && (
                                <p className="text-center text-sm text-gray-400 italic mt-2 border-t border-gray-100 dark:border-gray-700 pt-2 mx-10">{pronunciationChallenges[currentChallengeIndex].translation}</p>
                            )}
                        </div>

                        {pronunciationChallenges[currentChallengeIndex].focus && (
                            <div className="bg-blue-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6 border border-blue-100 dark:border-gray-600">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-300 mb-1">
                                    <i className="fas fa-info-circle"></i> Conseil
                                </h4>
                                <p className="text-gray-700 dark:text-gray-300 italic text-sm">
                                    {pronunciationChallenges[currentChallengeIndex].focus}
                                </p>
                            </div>
                        )}

                         {/* ACTIONS */}
                        <div className="flex justify-center gap-6">
                            <button 
                                onClick={() => speak(pronunciationChallenges[currentChallengeIndex].text)}
                                className="w-14 h-14 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shadow-sm"
                                title="Écouter le modèle"
                            >
                                <i className="fas fa-volume-up text-xl"></i>
                            </button>
                            
                            {/* Auto-advance for AI lines in Dialogue */}
                            {pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai' && (
                                 <button 
                                    onClick={() => {
                                         if (currentChallengeIndex < pronunciationChallenges.length - 1) {
                                            setCurrentChallengeIndex(prev => (prev as number) + 1);
                                        }
                                    }}
                                    className="w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors shadow-sm animate-pulse"
                                    title="Continuer"
                                >
                                    <i className="fas fa-arrow-right text-xl"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* RECORDING AREA (Hidden for AI turns in dialogue) */}
                    {!(pronunciationType === 'dialogue' && pronunciationChallenges[currentChallengeIndex].role === 'ai') && (
                    <div className="flex flex-col items-center justify-center space-y-4 w-full">
                        {pronunciationResult ? (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 w-full animate-fade-in-up text-center">
                                <div className="text-4xl mb-2">{pronunciationResult.feedback.includes('Excellent') || pronunciationResult.score > 80 ? '🌟' : pronunciationResult.score > 50 ? '👍' : '🤔'}</div>
                                <div className={`text-2xl font-bold mb-1 ${
                                    pronunciationResult.score > 80 ? 'text-green-500' : 
                                    pronunciationResult.score > 50 ? 'text-yellow-500' : 'text-orange-500'
                                }`}>
                                    {pronunciationResult.score}% - {pronunciationResult.feedback}
                                </div>
                                <p className="text-gray-400 text-sm mb-4">Vous avez dit : "{transcript}"</p>
                                
                                <div className="flex justify-center gap-4">
                                    <button 
                                        onClick={() => {
                                            setPronunciationResult(null);
                                            resetTranscript();
                                            // Auto-start will trigger via useEffect
                                        }}
                                        className="px-4 py-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <i className="fas fa-redo mr-2"></i> Réessayer
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setPronunciationResult(null);
                                            resetTranscript();
                                            if (currentChallengeIndex < pronunciationChallenges.length - 1) {
                                                setCurrentChallengeIndex(prev => (prev as number) + 1);
                                            } else {
                                                // End of session
                                                setPronunciationChallenges([]);
                                            }
                                        }}
                                        className="px-6 py-2 rounded-lg bg-primary text-white font-bold shadow hover:bg-primary-dark transition-colors"
                                    >
                                        Suivant <i className="fas fa-arrow-right ml-2"></i>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={listeningStatus === 'listening' ? stopListening : (listeningStatus === 'processing' ? undefined : startListening)}
                                    disabled={listeningStatus === 'processing'}
                                    className={`w-24 h-24 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 mb-4 ${
                                        listeningStatus === 'listening' 
                                            ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200'
                                        : listeningStatus === 'processing'
                                            ? 'bg-gray-400 text-white cursor-wait ring-4 ring-gray-200'
                                        : 'bg-primary text-white'
                                    }`}
                                >
                                    <i className={`fas fa-${listeningStatus === 'listening' ? 'stop' : listeningStatus === 'processing' ? 'spinner fa-spin' : 'microphone'} text-4xl`}></i>
                                </button>
                                <p className={`text-sm animate-pulse ${listeningStatus === 'listening' ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                                    {listeningStatus === 'listening' ? "J'écoute..." : "Appuyez pour parler"}
                                </p>
                                {transcript && <p className="mt-4 text-gray-400 text-sm italic max-w-md text-center">"{transcript}"</p>}
                            </div>
                        )}
                    </div>
                    )}
                </div>
            )}
        </div>
    );
};
