import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { Button } from './ui/Button';
import { generateFlashcardsWithAI } from '../services/aiCardGenerator';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';
import { Flashcard } from '../types';

interface FeynmanVoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddCards: (cards: Flashcard[]) => void;
    onCreateSet: (name: string, cards: Flashcard[]) => void;
}

export const FeynmanVoiceModal: React.FC<FeynmanVoiceModalProps> = ({ isOpen, onClose, onAddCards, onCreateSet }) => {
    const { t, language } = useTranslation();
    const { config } = useAIConfig();
    const { showToast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);
    const [setName, setSetName] = useState('');
    const [isNewSet, setIsNewSet] = useState(false);
    
    // We use the current UI language for speech recognition
    const speechLang = language === 'fr' ? 'fr-FR' : 'en-US';
    const { status, transcript, startListening, stopListening, isSupported, error: micError } = useSpeechRecognition(speechLang);

    const [localTranscript, setLocalTranscript] = useState('');

    useEffect(() => {
        if (transcript) setLocalTranscript(transcript);
    }, [transcript]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!localTranscript) {
            showToast("Veuillez d'abord enregistrer une explication.", "warning");
            return;
        }

        if (isNewSet && !setName.trim()) {
            showToast("Veuillez donner un nom à votre nouveau paquet de fiches.", "warning");
            return;
        }

        setIsGenerating(true);
        try {
            const feynmanPrompt = `
                MÉTHODE FEYNMAN - ANALYSE PÉDAGOGIQUE APPROFONDIE
                
                # Ton Rôle
                Tu es un tuteur personnel expert utilisant la méthode Feynman. Tu combines rigueur intellectuelle et empathie pédagogique pour aider l'élève à consolider sa compréhension.
                
                # L'Explication de l'Élève
                "${localTranscript}"
                
                # Ta Mission
                1. **Analyse Bienveillante** : Identifie les forces de l'explication (concepts bien compris) et les zones d'amélioration (imprécisions, lacunes, erreurs conceptuelles).
                
                2. **Questions Socratiques** : Génère 5-10 flashcards QCM qui :
                   - Renforcent les points bien maîtrisés
                   - Comblent les lacunes identifiées
                   - Corrigent les erreurs avec douceur
                   - Approfondissent la compréhension
                   - Encouragent la réflexion critique
                
                3. **Approche Adaptative** :
                   - Si l'explication est solide : Propose des questions d'approfondissement
                   - Si l'explication est partielle : Cible les concepts manquants
                   - Si l'explication contient des erreurs : Propose des questions correctives sans jugement
                
                # Principes Pédagogiques
                - Questions claires et précises
                - Distracteurs plausibles mais clairement faux
                - Ton encourageant dans les formulations
                - Progression du simple au complexe
                - Exemples concrets quand pertinent
                
                FORMAT JSON UNIQUE (Tableau) :
                [
                    {
                        "question": "Question socratique basée sur l'analyse...",
                        "answer": "La réponse correcte avec explication si nécessaire",
                        "distractors": ["Faux plausible 1", "Faux plausible 2", "Faux plausible 3"]
                    }
                ]
                
                Réponds UNIQUEMENT avec le JSON.
            `;

            const apiKey = config.provider === 'gemini' ? config.geminiApiKey 
                           : config.provider === 'openai' ? config.openaiApiKey 
                           : config.provider === 'anthropic' ? config.anthropicApiKey
                           : config.provider === 'mistral' ? config.mistralApiKey : '';
            
            const modelName = config.provider === 'gemini' ? config.geminiModel
                              : config.provider === 'openai' ? config.openaiModel
                              : config.provider === 'anthropic' ? config.anthropicModel
                              : config.provider === 'mistral' ? config.mistralModel
                              : config.localModelName;

            const cards = await generateFlashcardsWithAI({
                topic: "Méthode Feynman",
                sourceLang: language,
                targetLang: language,
                count: 8,
                difficulty: "intermediate",
                context: feynmanPrompt,
                provider: config.provider,
                apiKey,
                modelName
            });

            if (isNewSet && setName.trim()) {
                onCreateSet(setName.trim(), cards);
                showToast(`Jeu "${setName.trim()}" créé avec succès !`, 'success');
            } else {
                onAddCards(cards);
                showToast(t('feynman.success'), 'success');
            }
            onClose();
        } catch (error) {
            console.error(error);
            showToast(error instanceof Error ? error.message : "Erreur lors de la génération", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-background border border-white/10 p-8 rounded-[2rem] shadow-2xl w-full max-w-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 text-4xl shadow-inner">
                        🎙️
                    </div>
                    
                    <h2 className="text-3xl font-black mb-2">{t('feynman.title')}</h2>
                    <p className="text-text-secondary mb-8 leading-relaxed max-w-md">
                        {t('feynman.subtitle')}
                    </p>

                    {/* Transcript Area */}
                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 min-h-[150px] relative">
                        <textarea
                            className="w-full h-full bg-transparent outline-none text-lg resize-none placeholder:opacity-30"
                            placeholder={t('feynman.placeholder')}
                            value={localTranscript}
                            onChange={(e) => setLocalTranscript(e.target.value)}
                        />
                        {status === 'listening' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-2xl">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s`, height: '24px' }}></div>
                                    ))}
                                </div>
                                <span className="ml-4 font-bold animate-pulse">{t('feynman.listening')}</span>
                            </div>
                        )}
                    </div>

                    {/* Target Choice */}
                    {localTranscript && !isGenerating && (
                        <div className="w-full mb-6 text-left animate-slide-up">
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={isNewSet} 
                                    onChange={(e) => setIsNewSet(e.target.checked)}
                                    className="w-5 h-5 accent-primary"
                                />
                                <span className="font-bold">Créer un nouveau paquet de fiches</span>
                            </label>
                            
                            {isNewSet && (
                                <input 
                                    type="text"
                                    placeholder="Nom du nouveau paquet..."
                                    value={setName}
                                    onChange={(e) => setSetName(e.target.value)}
                                    className="w-full mt-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-primary transition-all"
                                />
                            )}
                        </div>
                    )}

                    {!isSupported && <p className="text-red-500 text-sm mb-4">La reconnaissance vocale n'est pas supportée dans votre navigateur.</p>}
                    {micError && <p className="text-red-500 text-sm mb-4">{micError}</p>}

                    <div className="flex gap-4 w-full">
                        {status === 'listening' ? (
                            <Button 
                                variant="danger" 
                                className="flex-1 py-4 text-lg font-black animate-pulse"
                                onClick={stopListening}
                            >
                                <i className="fas fa-stop mr-3"></i>
                                {t('feynman.stop')}
                            </Button>
                        ) : (
                            <Button 
                                variant="primary" 
                                className="flex-1 py-4 text-lg font-black"
                                onClick={localTranscript ? handleGenerate : startListening}
                                loading={isGenerating}
                                disabled={!isSupported}
                            >
                                <i className={`fas ${localTranscript ? 'fa-magic' : 'fa-microphone'} mr-3`}></i>
                                {localTranscript ? t('feynman.stop') : t('feynman.record')}
                            </Button>
                        )}
                        
                        <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
                            {t('common.cancel')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
