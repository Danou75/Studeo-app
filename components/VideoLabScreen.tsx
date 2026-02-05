import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { generateFlashcardsWithAI } from '../services/aiCardGenerator';
import { useAIConfig } from '../contexts/AIConfigContext';
import { v4 as uuidv4 } from 'uuid';
import { Flashcard, Lesson } from '../types';
import { getThemeGradient, ThemeMode, ThemeStyle } from '../constants/themes';
import { TUTORS } from '../constants';
import { AILoader } from './ui/AILoader';

interface VideoLabScreenProps {
    onBack: () => void;
    onAddCards: (cards: Flashcard[]) => void;
    onCreateSet: (name: string, cards: Flashcard[]) => void;
    onLessonGenerated?: (lesson: Lesson) => void;
    onShowSavedLessons?: () => void;
    initialURL?: string;
    onURLChange?: (url: string) => void;
    initialAnalysis?: { summary?: string; videoTitle?: string } | null;
    onAnalysisChange?: (analysis: { summary?: string; videoTitle?: string } | null) => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
}

export const VideoLabScreen: React.FC<VideoLabScreenProps> = ({ 
    onBack, onAddCards, onCreateSet, onLessonGenerated, onShowSavedLessons,
    initialURL = "", onURLChange, initialAnalysis = null, onAnalysisChange,
    themeMode,
    themeStyle
}) => {
    const { t, language } = useTranslation();
    const { showToast } = useToast();
    const { config } = useAIConfig();
    
    const [url, setUrl] = useState(initialURL);
    const [videoTitle, setVideoTitle] = useState(initialAnalysis?.videoTitle || '');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isNewSet, setIsNewSet] = useState(false);
    const [setName, setSetName] = useState('');
    const [cardCount, setCardCount] = useState(10);
    const [analysisResult, setAnalysisResult] = useState<{ summary?: string; vocabulary?: any[]; cards?: Flashcard[] } | null>(initialAnalysis);
    const [transcript, setTranscript] = useState<string | null>(null);
    const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
    const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
    const [generationType, setGenerationType] = useState<'quiz' | 'srs' | null>(null);
    const [showTranscriptModal, setShowTranscriptModal] = useState(false);
    const [manualTranscript, setManualTranscript] = useState('');
    const [isExtractingTranscript, setIsExtractingTranscript] = useState(false);
    const [selectedTutorId, setSelectedTutorId] = useState('');

    // Sync back to coordinator
    React.useEffect(() => {
        if (onURLChange) onURLChange(url);
    }, [url, onURLChange]);

    React.useEffect(() => {
        if (onAnalysisChange) onAnalysisChange(analysisResult ? { summary: analysisResult.summary, videoTitle } : null);
    }, [analysisResult, videoTitle, onAnalysisChange]);

    const handleAIAnalysis = async (currentTitle: string, currentTranscript: string | null | undefined, author: string = "Inconnu", detectedLang: string | null = "fr", detectedWordCount: number | null = 0) => {
        try {
            // Configuration IA
            const aiKey = config.provider === 'gemini' ? config.geminiApiKey 
                           : config.provider === 'openai' ? config.openaiApiKey 
                           : config.provider === 'anthropic' ? config.anthropicApiKey
                           : config.provider === 'mistral' ? config.mistralApiKey : '';
            
            const aiModel = config.provider === 'gemini' ? config.geminiModel 
                           : config.provider === 'mistral' ? config.mistralModel
                           : config.provider === 'anthropic' ? config.anthropicModel
                           : config.provider === 'openai' ? config.openaiModel
                           : config.provider === 'local' ? config.localModelName
                           : 'gpt-4o';

            // Construction du prompt intelligent
            let contextPrompt = '';
            
            if (currentTranscript && currentTranscript.length > 100) {
                // Mode haute fidélité
                contextPrompt = `
                    VIDÉO YOUTUBE - ANALYSE HAUTE FIDÉLITÉ
                    
                    Titre: "${currentTitle}"
                    Auteur: ${author}
                    Langue: ${detectedLang}
                    Longueur estimée: ${detectedWordCount || currentTranscript.split(/\s+/).length} mots
                    
                    TRANSCRIPTION COMPLÈTE:
                    ${currentTranscript.substring(0, 20000)}
                    
                    INSTRUCTIONS:
                    Tu disposes de la transcription de cette vidéo.
                    1. Fais un résumé structuré et exhaustif en 8-12 points clés
                    2. Identifie les concepts principaux et les arguments développés
                    3. Mentionne les exemples concrets donnés dans la vidéo
                    4. Reste fidèle au contenu RÉEL de la transcription
                    5. Structure ton résumé avec des titres et sous-sections en Markdown (##, ###, bullets)
                    6. INDIQUE que c'est une analyse basée sur la TRANSCRIPTION.
                    
                    Base-toi UNIQUEMENT sur la transcription fournie.
                `;
            } else {
                // Mode métadonnées
                contextPrompt = `
                    VIDÉO YOUTUBE - ANALYSE PAR MÉTADONNÉES
                    
                    Titre: "${currentTitle}"
                    Auteur: ${author}
                    URL: ${url}
                    
                    ⚠️ ATTENTION: La transcription n'est pas disponible.
                    
                    INSTRUCTIONS:
                    1. Si tu connais cette vidéo ou ce sujet, fais un résumé basé sur tes connaissances
                    2. Sinon, explique de manière générale ce que le titre suggère
                    3. INDIQUE CLAIREMENT que tu n'as pas accès à la transcription
                    4. Suggère à l'utilisateur d'activer les sous-titres sur YouTube si possible
                `;
            }

            // Génération du résumé par l'IA
            const response = await generateFlashcardsWithAI({
                topic: `Analyse: ${currentTitle}`,
                sourceLang: language || 'fr',
                targetLang: language || 'fr',
                count: 1,
                difficulty: 'intermediate',
                context: contextPrompt,
                provider: config.provider,
                apiKey: aiKey,
                apiUrl: config.localApiUrl,
                modelName: aiModel
            });

            // Extraction du résumé
            const firstCard = response[0];
            let summaryText = "Résumé indisponible.";
            
            if (firstCard) {
                if (firstCard.type === 'mcq') {
                    const q = firstCard.mcqData.question;
                    summaryText = q[language] || q['fr'] || Object.values(q)[0] || "Analyse réussie.";
                } else if (firstCard.type === 'classic') {
                    summaryText = firstCard.terms[language] || firstCard.terms['fr'] || Object.values(firstCard.terms)[0] || "Analyse réussie.";
                }
            }
            
            setAnalysisResult({
                summary: summaryText,
                vocabulary: [] 
            });

            return true;
        } catch (error) {
            console.error("[VideoLab] AI Analysis failed:", error);
            throw error;
        }
    };

    const handleAnalyze = async () => {
        if (!url.trim() || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            showToast(t('video.error'), 'error');
            return;
        }

        setIsAnalyzing(true);
        setTranscript(null);
        setVideoTitle('');
        
        try {
            const { analyzeYouTubeVideo } = await import('../services/youtubeService');
            const analysis = await analyzeYouTubeVideo(url);
            
            if (!analysis) {
                throw new Error("Impossible d'analyser cette vidéo. Vérifiez que le lien est valide.");
            }

            setVideoTitle(analysis.metadata.title);
            setTranscript(analysis.transcript);

            // APPEL DE LA NOUVELLE FONCTION DÉPORTÉE
            await handleAIAnalysis(
                analysis.metadata.title, 
                analysis.transcript, 
                analysis.metadata.author, 
                analysis.language, 
                analysis.wordCount
            );
            
            const successMsg = analysis.hasTranscript 
                ? `✅ Analyse haute fidélité (${analysis.wordCount} mots extraits)`
                : `⚠️ Analyse par métadonnées (transcription indisponible)`;
            
            showToast(successMsg, analysis.hasTranscript ? 'success' : 'info');
            
        } catch (error: any) {
            console.error("[VideoLab] Analysis failed:", error);
            
            // Messages d'erreur détaillés
            let errorMsg = t('video.analyzeError');
            
            if (error.message) {
                if (error.message.includes('API')) {
                    errorMsg = `Erreur IA: ${error.message}`;
                } else if (error.message.includes('quota')) {
                    errorMsg = 'Quota API dépassé. Essayez un autre fournisseur IA.';
                } else if (error.message.includes('key')) {
                    errorMsg = 'Clé API manquante ou invalide. Vérifiez vos paramètres.';
                } else {
                    errorMsg = error.message;
                }
            }
            
            showToast(errorMsg, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCreateLesson = async () => {
        if (!url || !analysisResult) return;
        setIsGeneratingLesson(true);
        
        try {
            const lessonTitle = videoTitle || `Leçon : ${url}`;
            
            // Configuration IA
            const apiKey = config.provider === 'gemini' ? config.geminiApiKey 
                           : config.provider === 'openai' ? config.openaiApiKey 
                           : config.provider === 'anthropic' ? config.anthropicApiKey
                           : config.provider === 'mistral' ? config.mistralApiKey : '';
            
            const modelName = config.provider === 'gemini' ? config.geminiModel 
                           : config.provider === 'mistral' ? config.mistralModel
                           : config.provider === 'anthropic' ? config.anthropicModel
                           : config.provider === 'openai' ? config.openaiModel
                           : config.provider === 'local' ? config.localModelName
                           : 'gpt-4o';

            let lessonContent = "";
            
            console.log('[VideoLab] Creating lesson with:', {
                hasTranscript: !!transcript,
                transcriptLength: transcript?.length || 0,
                videoTitle,
                analysisResult: !!analysisResult
            });
            
            if (transcript && transcript.length > 100) {
                // Mode haute fidélité: génération d'un cours complet basé sur la transcription
                showToast("📚 Rédaction du cours détaillé en cours...", "info");
                
                // Import de la fonction de génération de leçon
                const { generateLessonWithAI } = await import('../services/aiLessonGenerator');
                
                const lesson = await generateLessonWithAI({
                    topic: lessonTitle,
                    count: 1,
                    difficulty: 'advanced',
                    context: `
                        VIDÉO YOUTUBE - TRANSCRIPTION COMPLÈTE
                        
                        Titre: "${lessonTitle}"
                        
                        TRANSCRIPTION INTÉGRALE (${transcript.split(/\s+/).length} mots):
                        ${transcript.substring(0, 30000)}
                        
                        INSTRUCTIONS POUR LE COURS:
                        1. Crée un cours magistral complet et structuré en Markdown
                        2. Base-toi UNIQUEMENT sur la transcription fournie
                        3. Structure le cours avec des titres clairs (##, ###)
                        4. Utilise des emojis pour rendre le cours visuel
                        5. Mets en gras les concepts importants
                        6. Inclus les exemples concrets mentionnés dans la vidéo
                        7. Le cours doit être exhaustif (minimum 800 mots)
                        8. Ajoute une section "Points Clés à Retenir" à la fin
                        
                        NE GÉNÈRE PAS DE QUESTIONS. Génère un COURS COMPLET.
                    `,
                    provider: config.provider,
                    apiKey,
                    apiUrl: config.localApiUrl,
                    modelName,
                    sourceLang: language,
                    targetLang: language
                }, selectedTutorId || undefined);
                
                lessonContent = lesson.content;
            } else {
                // Mode métadonnées: cours basé sur le résumé
                lessonContent = `
# 📺 ${lessonTitle}

## ⚠️ Note Importante
Cette leçon a été générée à partir des métadonnées de la vidéo uniquement, car la transcription n'était pas disponible.

## 📝 Résumé
${analysisResult.summary || "Résumé non disponible."}

---

**💡 Conseil**: Pour un cours plus détaillé, activez les sous-titres sur YouTube et réessayez l'analyse.
                `.trim();
            }

            const lesson: Lesson = {
                id: uuidv4(),
                topic: lessonTitle,
                content: lessonContent,
                tutorId: selectedTutorId || 'intelligent-assistant',
                createdAt: new Date().toISOString(),
                flashcards: []
            };

            if (onLessonGenerated) {
                onLessonGenerated(lesson);
            }
            
            const successMsg = transcript 
                ? "✅ Cours détaillé créé avec succès !"
                : "⚠️ Cours créé (basé sur métadonnées uniquement)";
            
            showToast(successMsg, transcript ? 'success' : 'info');
            
        } catch (error: any) {
            console.error("[VideoLab] Lesson creation error:", error);
            
            let errorMsg = "Erreur lors de la création de la leçon";
            if (error.message) {
                if (error.message.includes('API') || error.message.includes('key')) {
                    errorMsg = `Erreur IA: ${error.message}`;
                } else {
                    errorMsg = error.message;
                }
            }
            
            showToast(errorMsg, "error");
        } finally {
            setIsGeneratingLesson(false);
        }
    };

    const handleManualTranscriptSubmit = () => {
        if (manualTranscript.trim().length < 50) {
            showToast("La transcription est trop courte (minimum 50 caractères)", "error");
            return;
        }
        
        setTranscript(manualTranscript.trim());
        setShowTranscriptModal(false);
        showToast(`✅ Transcription manuelle ajoutée (${manualTranscript.trim().split(/\s+/).length} mots)`, "success");
        
        // Relancer l'analyse avec la transcription manuelle
        if (analysisResult) {
            setIsAnalyzing(true);
            handleAIAnalysis(videoTitle, manualTranscript.trim())
                .then(() => {
                    showToast("✨ Résumé IA mis à jour avec la transcription !", "success");
                })
                .catch(() => {
                    showToast("Erreur lors de la mise à jour du résumé IA", "error");
                })
                .finally(() => setIsAnalyzing(false));
        }
    };

    const handleForcedExtraction = async () => {
        setIsExtractingTranscript(true);
        try {
            const { analyzeYouTubeVideo } = await import('../services/youtubeService');
            const analysis = await analyzeYouTubeVideo(url);
            if (analysis?.hasTranscript) {
                setTranscript(analysis.transcript);
                showToast("✅ Transcription récupérée ! Mise à jour de l'analyse...", "success");
                
                // Relancer l'analyse IA avec la nouvelle transcription
                setIsAnalyzing(true);
                await handleAIAnalysis(analysis.metadata.title, analysis.transcript, analysis.metadata.author);
                setIsAnalyzing(false);
                
                showToast("✨ Analyse haute fidélité terminée !", "success");
            } else {
                showToast("❌ Impossible de récupérer la transcription automatiquement.", "error");
            }
        } catch (e) {
            showToast("Erreur lors de l'extraction.", "error");
        } finally {
            setIsExtractingTranscript(false);
        }
    };

    const handleGenerateCards = async (type: 'quiz' | 'srs') => {
        if (!url) return;
        setIsGeneratingQuiz(true);
        setGenerationType(type);
        try {
            const apiKey = config.provider === 'gemini' ? config.geminiApiKey 
                           : config.provider === 'openai' ? config.openaiApiKey 
                           : config.provider === 'anthropic' ? config.anthropicApiKey
                           : config.provider === 'mistral' ? config.mistralApiKey : '';

            const behaviorPrompt = type === 'quiz' 
                ? `Génère un quiz de compréhension complet. Questions variées sur les concepts.`
                : `EXTRACTION SRS : Concentre-toi sur le vocabulaire technique, les définitions précises et les termes clés à mémoriser. Format Terme -> Définition.`;

            const response = await generateFlashcardsWithAI({
                topic: videoTitle ? `${type === 'quiz' ? 'Quiz' : 'Vocabulaire'}: ${videoTitle}` : `Vidéo: ${url}`,
                sourceLang: language,
                targetLang: language,
                count: cardCount,
                difficulty: 'intermediate',
                context: `
                    Titre: ${videoTitle || "Inconnu"}
                    Résumé: ${analysisResult?.summary || "Non analysé"}
                    TRANSCRIPTION : ${transcript ? transcript.substring(0, 10000) : "Indisponible"}
                    
                    ${behaviorPrompt}
                    
                    INSTRUCTIONS:
                    - Génère exactement ${cardCount} fiches.
                    - Si la transcription est présente, extrais des questions précises sur les propos tenus.
                    - Base-toi uniquement sur le sujet vidéo.
                `,
                provider: config.provider,
                apiKey,
                apiUrl: config.localApiUrl,
                modelName: config.provider === 'gemini' ? config.geminiModel 
                           : config.provider === 'mistral' ? config.mistralModel
                           : config.provider === 'anthropic' ? config.anthropicModel
                           : config.provider === 'openai' ? config.openaiModel
                           : config.provider === 'local' ? config.localModelName
                           : 'gpt-4o'
            }, selectedTutorId || undefined);

            if (isNewSet && setName.trim()) {
                onCreateSet(setName.trim(), response);
            } else {
                onAddCards(response);
            }
            
            showToast(`${response.length} fiches générées avec succès !`, 'success');
        } catch (error) {
            console.error(error);
            showToast("Erreur lors de la génération", "error");
        } finally {
            setIsGeneratingQuiz(false);
            setGenerationType(null);
        }
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background overflow-hidden relative">
            {/* Global AI Loading Overlay for critical actions */}
            {(isAnalyzing || isGeneratingQuiz || isGeneratingLesson || isExtractingTranscript) && (
                <div className="absolute inset-0 z-[100] bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] shadow-2xl border border-primary/20 flex flex-col items-center gap-6 max-w-sm text-center">
                        <AILoader size="lg" text="Traitement IA" />
                        <div>
                            <h3 className="text-xl font-black text-primary mb-2">
                                {isExtractingTranscript ? "Extraction des sous-titres..." :
                                 isAnalyzing ? "Analyse de la vidéo..." : 
                                 isGeneratingLesson ? "Rédaction du cours..." : 
                                 "Génération des fiches..."}
                            </h3>
                            <p className="text-sm text-text-secondary">
                                {isExtractingTranscript ? "Nous tentons de récupérer la transcription brute de la vidéo via les canaux secondaires." :
                                 isAnalyzing ? "Nous extrayons les points clés et la transcription pour vous." : 
                                 "L'IA structure les informations de manière pédagogique."}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Header Redesign */}
            <header 
                className={`shrink-0 pt-safe p-4 md:p-6 shadow-lg relative overflow-hidden transition-all duration-500 z-10 ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                <div className="max-w-4xl mx-auto w-full relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <Button 
                            variant="secondary" 
                            onClick={onBack} 
                            size="sm" 
                            className={`${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm transition-all`}
                        >
                            <i className="fas fa-home mr-2 text-inherit"></i> Accueil
                        </Button>

                        <Button 
                            variant="secondary" 
                            onClick={onShowSavedLessons} 
                            size="sm" 
                            className={`${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm transition-all`}
                        >
                            <i className="fas fa-history mr-2 text-inherit"></i> Historique
                        </Button>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-4xl md:text-5xl drop-shadow-lg">🎬</span>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black drop-shadow-sm text-inherit">
                                {t('video.title')}
                            </h1>
                            <p className="opacity-80 mt-1 text-sm md:text-base text-inherit">{t('video.subtitle')}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50 min-h-0 pb-32">
                <div className="max-w-4xl mx-auto w-full pb-32">

                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-border relative overflow-hidden">
                    {/* Background Icon - Moved and dimmed more */}
                    <div className="absolute -top-6 -right-6 p-8 text-red-500/[0.03] text-9xl -rotate-12 pointer-events-none">
                        <i className="fab fa-youtube"></i>
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col gap-6">
                            {/* Ligne 1 : URL (Pleine largeur) */}
                            <div className="w-full">
                                <label className="block text-sm font-black uppercase tracking-widest text-text-secondary mb-3 italic">
                                    {t('video.analyze')}
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-red-500 group-focus-within:scale-110 transition-transform">
                                        <i className="fab fa-youtube text-2xl"></i>
                                    </div>
                                    <input 
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder={t('video.placeholder')}
                                        className="w-full pl-14 pr-6 py-4 bg-background border border-border rounded-2xl focus:ring-4 focus:ring-red-500/20 outline-none transition-all text-lg shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Ligne 2 : Tuteur et Bouton */}
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-black uppercase tracking-widest text-text-secondary mb-3 italic">
                                        {t('ai.actions.chooseTutor')}
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary pointer-events-none">
                                            <i className="fas fa-user-graduate"></i>
                                        </div>
                                        <select
                                            value={selectedTutorId}
                                            onChange={(e) => setSelectedTutorId(e.target.value)}
                                            className="w-full pl-12 pr-10 py-4 bg-background border border-border rounded-2xl focus:ring-4 focus:ring-red-500/20 outline-none transition-all text-lg shadow-inner appearance-none cursor-pointer"
                                        >
                                            <option value="">{t('ai.actions.defaultAssistant')}</option>
                                            {TUTORS.map(tutor => (
                                                <option key={tutor.id} value={tutor.id}>
                                                    {tutor.emoji} {tutor.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                                            <i className="fas fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-auto">
                                    <Button 
                                        variant="primary" 
                                        size="lg" 
                                        className="w-full md:px-10 py-4 h-[60px] rounded-2xl bg-gradient-to-r from-red-600 to-red-500 border-none hover:shadow-lg hover:shadow-red-500/30 transition-all font-black uppercase tracking-widest"
                                        onClick={handleAnalyze}
                                        loading={isAnalyzing}
                                    >
                                        {t('video.analyze')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                        {url && !isAnalyzing && (
                            <div className="mt-6 flex flex-col gap-3 animate-slide-up">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={isNewSet} 
                                        onChange={(e) => setIsNewSet(e.target.checked)}
                                        className="w-5 h-5 accent-red-500"
                                    />
                                    <span className="font-bold text-sm">Créer un nouveau paquet dédié à cette vidéo</span>
                                </label>
                                {isNewSet && (
                                    <input 
                                        type="text"
                                        placeholder="Nom du paquet (ex: Histoire, Sciences...)"
                                        value={setName}
                                        onChange={(e) => setSetName(e.target.value)}
                                        className="px-4 py-2 bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm"
                                    />
                                )}
                            </div>
                        )}
                    </div>

                    {analysisResult && !isAnalyzing && (
                        <div className="mt-8 flex items-center justify-between p-4 bg-green-500/5 rounded-2xl border border-green-500/10 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${transcript ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-orange-400'}`}></div>
                                <span className="text-sm font-bold text-text-secondary">
                                    {transcript ? "Transcription détectée ✅ (Analyse haute fidélité)" : "Transcription indisponible (Analyse par métadonnées)"}
                                </span>
                            </div>
                            {!transcript && (
                                <div className="mt-2 text-xs text-text-secondary bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm animate-pulse">
                                    <div className="flex items-center gap-2 mb-2 text-orange-800 dark:text-orange-200">
                                        <i className="fas fa-magic"></i>
                                        <strong className="text-sm">Transcription non trouvée :</strong>
                                    </div>
                                    <ul className="list-disc list-inside mt-1 space-y-1 opacity-80 mb-4">
                                        <li>La vidéo bloque peut-être l'extraction standard.</li>
                                        <li>Les sous-titres sont peut-être désactivés.</li>
                                    </ul>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={handleForcedExtraction}
                                            disabled={isExtractingTranscript}
                                            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                        >
                                            {isExtractingTranscript ? (
                                                <i className="fas fa-spinner fa-spin"></i>
                                            ) : (
                                                <i className="fas fa-robot"></i>
                                            )}
                                            {isExtractingTranscript ? "Extraction en cours..." : "Tenter l'extraction forcée"}
                                        </button>

                                        <button
                                            onClick={() => setShowTranscriptModal(true)}
                                            className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 text-text-primary border border-border rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <i className="fas fa-paste"></i>
                                            Coller Manuellement
                                        </button>
                                    </div>
                                </div>
                            )}
                            {transcript && <span className="text-[10px] bg-green-500 text-white px-2 py-1 rounded-full font-black uppercase tracking-tighter">HD Mode</span>}
                        </div>
                    )}

                    {analysisResult && !isAnalyzing && (
                        <div className="mt-8 flex items-center justify-between p-6 bg-red-500/5 rounded-2xl border border-red-500/10">
                            <div>
                                <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-1 uppercase tracking-wider">
                                    Nombre de fiches à générer
                                </label>
                                <p className="text-xs text-text-secondary">Choisissez la densité de votre révision</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="20" 
                                    step="1"
                                    value={cardCount}
                                    onChange={(e) => setCardCount(parseInt(e.target.value))}
                                    className="w-32 h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                                />
                                <span className="bg-red-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black shadow-lg">
                                    {cardCount}
                                </span>
                            </div>
                        </div>
                    )}

                    {analysisResult && !isAnalyzing && (
                        <div className="mt-12 p-8 bg-red-500/0 rounded-3xl animate-slide-up">
                            <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                                <i className="fas fa-magic text-red-500"></i>
                                {t('video.extractSummary')}
                            </h3>
                            <p className="text-text-secondary leading-relaxed mb-6 italic bg-white/50 dark:bg-black/20 p-6 rounded-2xl border border-border/50">
                                {analysisResult.summary}
                            </p>
                        </div>
                    )}
                </div>

                {/* Features Info - Now Interactive Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    {[
                        { 
                            id: 'lesson', 
                            icon: '📚', 
                            title: 'Créer une Leçon', 
                            desc: 'Transformez la vidéo en cours.', 
                            action: () => handleCreateLesson(),
                            active: !!analysisResult,
                            loading: isGeneratingLesson
                        },
                        { 
                            id: 'quiz', 
                            icon: '🧠', 
                            title: t('video.extractQuiz'), 
                            desc: 'Vérifiez vos acquis.', 
                            action: () => handleGenerateCards('quiz'),
                            active: !!analysisResult,
                            loading: isGeneratingQuiz && generationType === 'quiz'
                        },
                        { 
                            id: 'srs', 
                            icon: '🗂️', 
                            title: 'Extraction SRS', 
                            desc: 'Mémorisez les termes clés.', 
                            action: () => handleGenerateCards('srs'),
                            active: !!analysisResult,
                            loading: isGeneratingQuiz && generationType === 'srs'
                        }
                    ].map((feature, i) => (
                        <button 
                            key={i} 
                            onClick={feature.action}
                            disabled={!url || isAnalyzing || (isGeneratingQuiz && generationType !== null) || (feature.id !== 'summary' && !analysisResult)}
                            className={`p-6 bg-white dark:bg-gray-800 rounded-3xl border border-border text-center transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group ${!feature.active && feature.id !== 'summary' ? 'opacity-50 grayscale' : 'grayscale-0'}`}
                        >
                            {feature.loading && (
                                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-20">
                                    <AILoader size="md" />
                                </div>
                            )}
                            <div className="text-3xl mb-3 group-hover:scale-125 transition-transform duration-300">{feature.icon}</div>
                            <h4 className="font-bold mb-1">{feature.title}</h4>
                            <p className="text-xs text-text-secondary">{feature.desc}</p>
                            {feature.active && feature.id !== 'summary' && !feature.loading && (
                                <div className="mt-4 text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                                    Prêt à générer
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Modal pour coller la transcription manuellement */}
        {showTranscriptModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowTranscriptModal(false)}>
                <div className="bg-background rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-bold text-text-primary">📋 Coller la transcription</h3>
                        <button
                            onClick={() => setShowTranscriptModal(false)}
                            className="text-text-secondary hover:text-text-primary transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📖 Comment obtenir la transcription ?</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                            <li className="flex flex-col gap-1">
                                <span>
                                    <a href={`https://youtubetranscript.com/?v=${url.split('v=')[1]?.split('&')[0] || url.split('/').pop()}`} target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800">
                                        Source 1 (Rapide)
                                    </a> ou 
                                    <a href={`https://downsub.com/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer" className="ml-1 underline font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">
                                        Source 2 (Plus robuste)
                                    </a>
                                </span>
                                <span className="text-[10px] opacity-70 italic">Ces services tiers extraient le texte pour vous en un clic.</span>
                            </li>
                            <li>
                                Si besoin, ouvrez directement la <a href={`${url}${url.includes('?') ? '&' : '?'}cc_load_policy=1&cc_lang_pref=fr`} target="_blank" rel="noopener noreferrer" className="underline font-bold text-blue-600 dark:text-blue-400">vidéo sur YouTube</a>
                            </li>
                            <li>Cliquez sur le bouton <strong>"..."</strong> sous la vidéo</li>
                            <li>Sélectionnez <strong>"Afficher la transcription"</strong></li>
                            <li>Copiez tout le texte (Ctrl+A puis Ctrl+C)</li>
                            <li>Collez-le dans le champ ci-dessous</li>
                        </ol>
                    </div>

                    <textarea
                        value={manualTranscript}
                        onChange={(e) => setManualTranscript(e.target.value)}
                        placeholder="Collez ici la transcription complète de la vidéo YouTube...

Exemple:
Bonjour à tous dans cette vidéo nous allons voir comment...
Les quatre étapes principales sont...
Premièrement il faut..."
                        className="w-full h-64 px-4 py-3 bg-background border-2 border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                    />

                    <div className="mt-2 text-xs text-text-secondary">
                        {manualTranscript.trim().length > 0 && (
                            <span className="text-green-600 dark:text-green-400">
                                ✓ {manualTranscript.trim().split(/\s+/).length} mots • {manualTranscript.trim().length} caractères
                            </span>
                        )}
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => setShowTranscriptModal(false)}
                            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-text-primary rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleManualTranscriptSubmit}
                            disabled={manualTranscript.trim().length < 50}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            ✅ Valider la transcription
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};
