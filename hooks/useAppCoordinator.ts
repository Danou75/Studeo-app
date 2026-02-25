import { useState, useEffect } from 'react';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useToast } from '../contexts/ToastContext';
import { useFlashcards } from '../hooks/useFlashcards';
import { useQuizSession } from '../hooks/useQuizSession';
import { useGamification } from '../hooks/useGamification';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTheme } from '../hooks/useTheme';
import { useSRS } from '../hooks/useSRS';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useStudyContent } from '../hooks/useStudyContent';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Flashcard, QuizConfig, Lesson, StudyProgram, StudyModule, Tutor, TutorCategory, QuizResult, UpdateStatus } from '../types';

import { generateModuleContent, generateBonusExercises } from '../services/curriculumService';
import { generateExercisesFromLesson } from '../services/exerciseGenerationService';
import { generateFlashcardsWithAI } from '../services/aiCardGenerator';
import { ChatService } from '../services/chatService';
import { TUTORS, DEFAULT_FLASHCARDS, DEFAULT_FLASHCARD_SET_NAME } from '../constants';
import { INITIAL_GAMIFICATION_DATA } from '../utils/achievements';
import { getAIClientConfig } from '../utils/aiConfigHelper';
import { deduplicateCards } from '../utils/flashcardHelpers';



export const useAppCoordinator = () => {
    // ------------------------------------------------------------
    // 1. STATE MANAGEMENT & HOOKS
    // ------------------------------------------------------------
    const navigation = useAppNavigation();
    const studyContent = useStudyContent();
    const { config, setSelectedTutor } = useAIConfig();
    const { showToast } = useToast();

    const [voiceEngine, setVoiceEngine] = useState<QuizConfig["voiceEngine"]>("local");
    const [autoPlayAudio, setAutoPlayAudio] = useState(true);
    const [isProgramCompleted, setIsProgramCompleted] = useState(false);

    // SRS Preview State (Peut être extrait dans un useSRSUI plus tard)
    const [srsPreviewCards, setSrsPreviewCards] = useState<Flashcard[]>([]);
    const [srsPreviewConfig, setSrsPreviewConfig] = useState<Omit<QuizConfig, "voiceEngine" | "autoPlayAudio" | "quizName"> | null>(null);

    // AI Modal State
    const [aiModalInitialTopic, setAiModalInitialTopic] = useState("");
    const [aiModalInitialMode, setAiModalInitialMode] = useState<"quiz" | "lesson" | "curriculum" | undefined>(undefined);

    // Guest Tutors (Multiple)
    const [guestTutors, setGuestTutors] = useLocalStorage<Tutor[]>('guestTutors', []);

    // Helper functions for guest tutors
    const addGuestTutor = (tutor: Tutor) => {
        setGuestTutors(prev => [...prev, tutor]);
    };

    const updateGuestTutor = (tutorId: string, updatedTutor: Tutor) => {
        setGuestTutors(prev => prev.map(t => t.id === tutorId ? updatedTutor : t));
    };

    const removeGuestTutor = (tutorId: string) => {
        setGuestTutors(prev => prev.filter(t => t.id !== tutorId));
    };

    // Tutors Room State persistence
    const [tutorsRoomCategory, setTutorsRoomCategory] = useState<TutorCategory>('languages');

    // Video Lab State persistence
    const [videoLabURL, setVideoLabURL] = useState("");
    const [videoLabAnalysis, setVideoLabAnalysis] = useState<{ summary?: string; videoTitle?: string } | null>(null);

    // Update State
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    // ------------------------------------------------------------
    // 2. LOGIC HOOKS INTEGRATION
    // ------------------------------------------------------------
    const flashcards = useFlashcards();
    const quizSession = useQuizSession();
    const gamification = useGamification();
    const analyticsData = useAnalytics(quizSession.history);
    const srs = useSRS();
    const theme = useTheme();

    // ------------------------------------------------------------
    // 3. COMPUTED DATA
    // ------------------------------------------------------------
    // Detect languages from cards
    const detectedLanguages = Array.from(new Set(
        flashcards.allFlashcards.flatMap((card) => {
            const terms = (card as any).terms;
            const mcqData = (card as any).mcqData;
            const clozeData = (card as any).clozeData;
            const cols: string[] = [];

            if (terms) cols.push(...Object.keys(terms));
            if (mcqData) {
                if (mcqData.question) cols.push(...Object.keys(mcqData.question));
                if (mcqData.answer) cols.push(...Object.keys(mcqData.answer));
            }
            if (clozeData && clozeData.text) cols.push(...Object.keys(clozeData.text));

            if (cols.length === 0) {
                Object.keys(card).forEach(key => {
                    if (!['id', 'type', 'srsData', 'mnemonic'].includes(key)) {
                        cols.push(key);
                    }
                });
            }
            return cols;
        })
    ));
    const availableLanguages = Array.from(new Set(["fr", "en", "es", "it", "pt", "de", ...detectedLanguages]));

    // ------------------------------------------------------------
    // 4. AUTO-UPDATE CHECK
    // ------------------------------------------------------------
    const checkForUpdates = async (silent = true) => {
        setIsCheckingUpdate(true);
        console.log("[UpdateCheck] Starting check...");
        try {
            const checkUrl = `https://raw.githubusercontent.com/Danou75/Studeo-app/main/public/version.json?t=${Date.now()}`;
            const response = await fetch(checkUrl);
            if (!response.ok) throw new Error("Impossible de joindre le serveur de mise à jour.");
            
            const data = await response.json();
            const remoteVersion = data.version;
            
            // @ts-ignore - __APP_VERSION__ is defined by Vite
            const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.7.2';

            console.log(`[UpdateCheck] Version Comparison - Local: v${currentVersion}, Remote: v${remoteVersion}`);
            setLatestVersion(remoteVersion);
            
            if (remoteVersion === currentVersion) {
                setUpdateStatus('up-to-date');
                console.log("[UpdateCheck] Application is up to date.");
                if (!silent) showToast("Votre application est à jour ! 🎉", "success");
            } else {
                setUpdateStatus('available');
                console.log(`[UpdateCheck] Update available: v${remoteVersion}`);
                showToast(`🚀 Une nouvelle version (v${remoteVersion}) est disponible ! Allez dans les paramètres pour mettre à jour.`, "info", 10000);
            }
        } catch (err) {
            console.error("[UpdateCheck] Error:", err);
            setUpdateStatus('error');
            if (!silent) showToast("Erreur lors de la vérification des mises à jour.", "error");
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    // Initial check at launch
    useEffect(() => {
        // En différé pour ne pas ralentir le démarrage immédiat
        console.log("[UpdateCheck] Initial check scheduled in 5s...");
        const timer = setTimeout(() => {
            checkForUpdates(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);


    // ------------------------------------------------------------
    // 4. ACTION HANDLERS
    // ------------------------------------------------------------
    
    // Helper pour changer le thème selon le prof (Logique UI)
    const applyTutorTheme = (tutorName: string) => {
        const name = tutorName.toLowerCase();
        if (name.includes('français') || name.includes('french')) theme.setThemeStyle('french');
        else if (name.includes('english') || name.includes('anglais')) theme.setThemeStyle('english');
        else if (name.includes('italian') || name.includes('italien')) theme.setThemeStyle('italian');
        else if (name.includes('español') || name.includes('spanish') || name.includes('espagnol')) theme.setThemeStyle('spanish');
        else if (name.includes('portugais') || name.includes('português') || name.includes('portuguese')) theme.setThemeStyle('portuguese');
    };

    const handleSelectTutor = (tutor: Tutor) => {
        setSelectedTutor(tutor);
        setAiModalInitialTopic("");
        setAiModalInitialMode("quiz");
        applyTutorTheme(tutor.name);
        navigation.setScreen("ai-generator");
    };

    const handleGenerateCurriculum = (tutor: Tutor) => {
        setSelectedTutor(tutor);
        setAiModalInitialTopic("");
        setAiModalInitialMode("curriculum");
        applyTutorTheme(tutor.name);
        navigation.setScreen("ai-generator");
    };

    const handleNavigateToAIGenerator = () => {
        setSelectedTutor(null);
        setAiModalInitialTopic("");
        setAiModalInitialMode(undefined);
        navigation.setScreen("ai-generator");
    };

    const handleSuggestedProgram = (topic: string, category: string) => {
        setAiModalInitialTopic(topic);
        setAiModalInitialMode("curriculum");
        
        // Sélection d'un tuteur adapté à la catégorie (Ordre de priorité : Spécifique -> Général)
        let tutorId = 'prof-curio'; // Par défaut
        const lowerCat = category.toLowerCase();
        const lowerTopic = topic.toLowerCase();

        // 1. Détection de thèmes spécifiques
        if (lowerTopic.includes('renaissance') || lowerCat.includes('renaissance')) tutorId = 'maitre-leonard';
        else if (lowerTopic.includes('italien') || lowerCat.includes('italien')) tutorId = 'maestro-italiano';
        else if (lowerTopic.includes('anglais') || lowerTopic.includes('english') || lowerCat.includes('english')) tutorId = 'mister-english';
        else if (lowerTopic.includes('polonais') || lowerTopic.includes('polish') || lowerTopic.includes('polski') || lowerCat.includes('polonais')) tutorId = 'nauczyciel-polski';
        else if (lowerTopic.includes('échecs') || lowerCat.includes('échecs')) tutorId = 'gm-kaspar';
        else if (lowerTopic.includes('astrophysique') || lowerTopic.includes('cosmos') || lowerCat.includes('cosmos')) tutorId = 'prof-cosmos';
        
        // 2. Détection par catégorie générale (si non trouvé au dessus)
        else if (lowerCat.includes('histoire')) tutorId = 'prof-chronos';
        else if (lowerCat.includes('géo') || lowerCat.includes('atlas')) tutorId = 'prof-atlas';
        else if (lowerCat.includes('art') || lowerCat.includes('peinture') || lowerCat.includes('dessin')) tutorId = 'prof-muse';
        else if (lowerCat.includes('science')) tutorId = 'prof-eureka';
        else if (lowerCat.includes('math') || lowerCat.includes('algèbre') || lowerCat.includes('calcul')) tutorId = 'prof-newton';
        else if (lowerCat.includes('physique')) tutorId = 'prof-volt';
        else if (lowerCat.includes('chimie')) tutorId = 'prof-molecula';
        else if (lowerCat.includes('programmation') || lowerCat.includes('code') || lowerCat.includes('python')) tutorId = 'prof-turing';
        else if (lowerCat.includes('littérature')) tutorId = 'prof-plume';
        else if (lowerCat.includes('philoso')) tutorId = 'prof-sofia';
        else if (lowerCat.includes('cuisine') || lowerCat.includes('gastro')) tutorId = 'chef-gaston';
        else if (lowerCat.includes('sport') || lowerCat.includes('fitness')) tutorId = 'coach-vita';
        else if (lowerCat.includes('vin') || lowerCat.includes('oenologie')) tutorId = 'sommelier-bacchus';
        else if (lowerCat.includes('droit') || lowerCat.includes('justice')) tutorId = 'maitre-lexis';
        
        const tutor = TUTORS.find(t => t.id === tutorId) || null;
        setSelectedTutor(tutor);
        
        navigation.setScreen("ai-generator");
    };

    const handleLessonSuggestion = (topic: string) => {
        setAiModalInitialTopic(topic);
        setAiModalInitialMode("lesson");
        navigation.setScreen("ai-generator");
    };

    const onStartQuiz = (cards: Flashcard[], config: Omit<QuizConfig, "voiceEngine" | "autoPlayAudio" | "quizName">, quizName?: string) => {
        quizSession.startQuiz(cards, config, voiceEngine, autoPlayAudio, flashcards.currentSetName, quizName);
        navigation.setScreen("quiz");
    };

    const onShowSRSPreview = (cards: Flashcard[], config: Omit<QuizConfig, "voiceEngine" | "autoPlayAudio" | "quizName">) => {
        setSrsPreviewCards(cards);
        setSrsPreviewConfig(config);
        navigation.setScreen("srs-preview");
    };

    const onStartSRSReview = () => {
        if (srsPreviewConfig && srsPreviewCards.length > 0) {
            quizSession.startQuiz(srsPreviewCards, srsPreviewConfig, voiceEngine, autoPlayAudio, flashcards.currentSetName);
            navigation.setScreen("quiz");
        }
    };

    const handleGenerateModuleContent = async (program: StudyProgram, module: StudyModule) => {
        try {
            const tutor = TUTORS.find(t => t.id === program.tutorId) || guestTutors.find(t => t.id === program.tutorId);
            if (!tutor) throw new Error("Tuteur non trouvé");

            showToast(`✨ Génération du contenu pour "${module.title}" en cours...`, 'info', 3000);

            // Configuration IA
            let aiConfig;
            try {
                aiConfig = getAIClientConfig(config);
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Configuration IA invalide', 'error');
                return;
            }

            const content = await generateModuleContent(
                tutor,
                program,
                module,
                config.provider,
                aiConfig.apiKey,
                aiConfig.modelName,
                aiConfig.apiUrl
            );


            // Mise à jour du module avec le contenu généré
            const updatedModule: StudyModule = {
                ...module,
                lessonContent: content.lessonContent,
                flashcards: content.flashcards,
                status: 'unlocked'
            };

            // Mise à jour du programme dans la liste
            const updatedProgram: StudyProgram = {
                ...program,
                modules: program.modules.map(m => m.id === module.id ? updatedModule : m),
                lastActiveAt: new Date().toISOString()
            };

            studyContent.handleCurriculumGenerated(updatedProgram, () => {});
            showToast(`📚 Le cours "${module.title}" est prêt !`, 'success', 3000);
            return updatedProgram;
        } catch (e) {
            console.error("Critical error in handleGenerateModuleContent:", e);
            const errorMessage = e instanceof Error ? e.message : "Erreur inconnue";
            showToast(`Erreur lors de la génération du contenu : ${errorMessage}`, 'error', 5000);
            return undefined;
        }
    };

    const handleStartModule = (module: StudyModule, tutorId: string = '') => {
        if (!module.lessonContent) return;

        const lesson: Lesson = {
            id: module.id,
            topic: module.title,
            content: module.lessonContent,
            tutorId: tutorId,
            flashcards: module.flashcards,
            createdAt: new Date().toISOString(),
            source: 'curriculum'
        };

        studyContent.setCurrentLesson(lesson);
        navigation.setScreen("lesson");
    };

    const handleStartModuleQuiz = (module: StudyModule, tutorId?: string) => {
        if (!module.flashcards || module.flashcards.length === 0) {
            showToast("Veuillez d'abord générer le contenu du module pour accéder aux exercices.", 'warning');
            return;
        }

        const tutor = TUTORS.find(t => t.id === tutorId) || guestTutors.find(t => t.id === tutorId);
        const quizName = `Module : ${module.title}`;

        // Utilisation directe de quizSession pour garantir le passage du titre
        quizSession.startQuiz(
            module.flashcards, 
            {
                questionLang: 'fr',
                answerLang: tutor?.language || 'fr',
                voiceGender: "female",
                mode: "mcq",
                gameMode: "normal",
                tutorId,
                tutorCategory: tutor?.category
            }, 
            voiceEngine, 
            autoPlayAudio, 
            flashcards.currentSetName, // Garde le set name pour référence technique
            quizName // Titre forcé
        );

        navigation.setScreen("quiz");
        showToast(`Lancement de : ${quizName}`, 'info');
    };

    const handleBackToLesson = () => {
        if (studyContent.currentLesson) {
            navigation.setScreen("lesson");
        } else {
            navigation.setScreen("home");
        }
    };

    const handleGenerateBonusExercises = async () => {
        if (!studyContent.currentLesson) return;
        
        // Trouver le tuteur si non sélectionné (cas d'une leçon chargée depuis l'historique)
        let activeTutor = config.selectedTutor;
        if (!activeTutor && studyContent.currentLesson.tutorId) {
            const tutorId = studyContent.currentLesson.tutorId;
            activeTutor = TUTORS.find(t => t.id === tutorId) || guestTutors.find(t => t.id === tutorId) || null;
            // Si on a trouvé le tuteur, on le définit comme actif pour la suite
            if (activeTutor) setSelectedTutor(activeTutor);
        }

        if (!activeTutor) {
            showToast("Impossible de trouver le professeur associé à cette leçon.", 'warning');
            navigation.setScreen('tutors-room');
            return;
        }
        
        showToast("✨ Génération d'exercices plus difficiles...", 'info', 3000);

        try {
            // Configuration IA
            let aiConfig;
            try {
                aiConfig = getAIClientConfig(config);
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Configuration IA invalide', 'error');
                return;
            }

            const newCards = await generateBonusExercises(
                activeTutor,
                studyContent.currentLesson.topic,
                studyContent.currentLesson.content,
                config.provider,
                aiConfig.apiKey,

                aiConfig.modelName,

                aiConfig.apiUrl
            );
            
            if (newCards && newCards.length > 0) {
                 onStartQuiz(newCards, {
                    questionLang: 'fr',
                    answerLang: 'fr',
                    voiceGender: "female",
                    mode: "classic",
                    gameMode: "normal",
                    tutorId: activeTutor.id,
                    tutorCategory: activeTutor.category
                 });
            } else {
                showToast("Désolé, je n'ai pas pu générer de nouveaux exercices.", 'warning');
            }
        } catch (e) {
            showToast("Erreur lors de la génération des exercices bonus.", 'error');
            console.error(e);
        }
    };

    const handleNavigateToSRS = () => {
        const dueCards = srs.getDueCards(flashcards.allFlashcards);
        if (dueCards.length === 0) {
            showToast("Aucune carte à réviser pour le moment. Revenez plus tard ! 🎉", "info");
            return;
        }

        // Détection dynamique de langue (simplifié)
        const pairCounts: Record<string, number> = {};
        
        dueCards.forEach(card => {
            const terms = (card as any).terms;
            const mcqData = (card as any).mcqData;
            const clozeData = (card as any).clozeData;
            let keys: string[] = [];

            if (terms) keys = Object.keys(terms);
            else if (mcqData) keys = [...Object.keys(mcqData.question || {}), ...Object.keys(mcqData.answer || {})];
            else if (clozeData) keys = Object.keys(clozeData.text || {});
            else {
                keys = Object.keys(card).filter(k => !['id', 'type', 'srsData', 'mnemonic'].includes(k));
            }
            
            const source = keys.find(k => k === 'fr') || keys[0];
            const target = keys.find(k => k !== source && k !== 'id') || keys[1];
            
            if (source && target) {
                const pairKey = `${source}:${target}`;
                pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
            }
        });

        let bestPair = "fr:en"; 
        let maxCount = 0;
        
        Object.entries(pairCounts).forEach(([pair, count]) => {
            if (count > maxCount) {
                maxCount = count;
                bestPair = pair;
            }
        });
        
        const [questionLang, answerLang] = bestPair.split(':');

        const validDueCards = dueCards.filter(card => {
            const terms = (card as any).terms;
            const mcqData = (card as any).mcqData;
            const clozeData = (card as any).clozeData;

            if (terms) return terms[questionLang] && terms[answerLang];
            if (mcqData) return mcqData.question[questionLang] && mcqData.answer[answerLang];
            if (clozeData) return clozeData.text[questionLang] && clozeData.answers[answerLang];
            
            // Fallback for flat objects
            return (card as any)[questionLang] && (card as any)[answerLang];
        });

         if (validDueCards.length === 0) {
            showToast(`Aucune carte à réviser pour la paire ${questionLang.toUpperCase()} - ${answerLang.toUpperCase()}.`, 'info');
            return;
        }

        const uniqueCards = deduplicateCards(validDueCards, questionLang, answerLang);
        const shuffledCards = [...uniqueCards].sort(() => 0.5 - Math.random());
        onShowSRSPreview(shuffledCards, {
            questionLang,
            answerLang,
            voiceGender: "female",
            mode: "classic",
            gameMode: "normal",
            isSRSMode: true,
        });
    };

    const onQuizEnd = (result: QuizResult, mistakes: Flashcard[], updatedCards?: Flashcard[]) => {
        try {
            quizSession.endQuiz(result, mistakes);

            // Validation du module si score suffisant (70%)
            if (studyContent.currentLesson && result.totalCount > 0) {
                const score = result.correctCount / result.totalCount;
                if (score >= 0.7) {
                    const status = studyContent.markCurrentModuleComplete(studyContent.currentLesson);
                    if (status.programCompleted) {
                        setIsProgramCompleted(true);
                    }
                }
            }

            if (updatedCards) {
                const currentSet = flashcards.flashcardSets[flashcards.currentSetName] || [];
                const updatedSet = currentSet.map((card: Flashcard) => {
                    const updatedCard = updatedCards.find((u) => u.id === card.id);
                    return updatedCard || card;
                });
                flashcards.setFlashcardSets(prev => ({
                    ...prev,
                    [flashcards.currentSetName]: updatedSet
                }));
            }

            gamification.updateGamification({
                correctCount: result.correctCount,
                totalCount: result.totalCount,
                duration: result.duration || 0,
                language: quizSession.quizConfig?.answerLang || "unknown",
            });

            navigation.setScreen("completion");
        } catch (error) {
            console.error("Error in onQuizEnd:", error);
            navigation.setScreen("completion");
        }
    };

    const onSaveEditedCardsWrapper = (jsonString: string) => {
        const success = flashcards.handleSaveEditedCards(jsonString);
        if (success) navigation.setIsEditModalOpen(false);
        return success;
    };

    const handleAICardsGenerated = (newCards: Flashcard[]) => {
        const newListName = `Généré par IA (${new Date().toLocaleTimeString()})`;
        flashcards.setFlashcardSets((prev: Record<string, Flashcard[]>) => ({ ...prev, [newListName]: newCards }));
        flashcards.setCurrentSetName(newListName);
        showToast(`${newCards.length} cartes générées avec succès dans "${newListName}" !`, "success");
    };

    // Proxy les handlers de studyContent pour garder la même API pour l'instant
    const handleLessonGenerated = (lesson: Lesson) => studyContent.handleLessonGenerated(lesson, navigation.setScreen);
    const handleCurriculumGenerated = (program: StudyProgram) => studyContent.handleCurriculumGenerated(program, navigation.setScreen);

    const handleSelectLesson = (lesson: Lesson, source?: 'curriculum' | 'generator') => {
        studyContent.setCurrentLesson({ ...lesson, source: source || lesson.source || 'generator' });
        navigation.setScreen('lesson');
    };

    const handleInteractiveExercises = async () => {
        const lesson = studyContent.currentLesson;
        if (!lesson) return;

        // Si les exercices existent déjà, on navigue vers l'écran d'exercices
        if (lesson.exercises) {
            navigation.setScreen("exercises");
            return;
        }

        // Sinon, on génère les exercices
        try {
            showToast("✨ Génération des exercices interactifs en cours...", "info", 3000);

            // Configuration IA
            let aiConfig;
            try {
                aiConfig = getAIClientConfig(config);
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Configuration IA invalide', 'error');
                return;
            }

            const exerciseSet = await generateExercisesFromLesson({
                lessonContent: lesson.content,
                lessonTopic: lesson.topic,
                lessonId: lesson.id,
                provider: config.provider,
                apiKey: aiConfig.apiKey,
                modelName: aiConfig.modelName,
                apiUrl: aiConfig.apiUrl,
                count: 8, // Par défaut

                difficulty: 'medium'
            });

            // Mise à jour de la leçon
            const updatedLesson: Lesson = {
                ...lesson,
                exercises: exerciseSet
            };

            studyContent.setCurrentLesson(updatedLesson);
            studyContent.updateSavedLesson(updatedLesson);
            
            // Si la leçon est sauvegardée, on pourrait vouloir la mettre à jour dans le stockage aussi
            // studyContent.updateSavedLesson(updatedLesson); // (Hypothétique si vous avez cette fonction)

            showToast("✅ Exercices générés avec succès !", "success");
            
            // Optionnel : Naviguer directement ou laisser l'utilisateur cliquer
            // navigation.setScreen("exercises"); 

        } catch (error) {
            console.error("Erreur génération exercices:", error);
            showToast("Impossible de générer les exercices.", "error");
        }
    };

    const handleExerciseComplete = (result: any) => {
        // Ici on pourrait sauvegarder les résultats dans les stats / gamification
        console.log("Exercises Completed:", result);
        
        // Ajout de points de gamification
        gamification.updateGamification({
            correctCount: result.totalScore > 0 ? Math.round(result.totalScore / 10) : 0, // 10 pts = 1 xp
            totalCount: result.maxScore > 0 ? Math.round(result.maxScore / 10) : 0,
            duration: result.totalTime,
            language: 'fr' // Par défaut ou détecté
        });

        // Retour à la leçon ou dashboard
        // navigation.setScreen("lesson"); // Déjà géré par le bouton retour de l'écran de fin
    };

    const handleGenerateQuizFromLesson = async () => {
        const lesson = studyContent.currentLesson;
        if (!lesson) return;

        try {
            showToast("🧠 Génération du quiz de révision...", "info", 3000);

            // Configuration IA
            let aiConfig;
            try {
                aiConfig = getAIClientConfig(config);
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Configuration IA invalide', 'error');
                return;
            }

            // Détection de la langue cible basée sur le tuteur
            const tutor = TUTORS.find(t => t.id === lesson.tutorId) || guestTutors.find(t => t.id === lesson.tutorId);
            const targetLang = tutor?.language || 'fr';

            const cards = await generateFlashcardsWithAI({
                topic: lesson.topic,
                sourceLang: 'fr',
                targetLang: targetLang,
                count: 10,
                difficulty: 'intermediate',
                context: lesson.content,
                provider: config.provider,
                apiKey: aiConfig.apiKey,
                modelName: aiConfig.modelName,
                apiUrl: aiConfig.apiUrl
            });


            if (!cards || cards.length === 0) {
                 throw new Error("Aucune carte générée");
            }

            const updatedLesson: Lesson = { ...lesson, flashcards: cards };
            studyContent.setCurrentLesson(updatedLesson);
            studyContent.updateSavedLesson(updatedLesson);
            
            const setName = `Quiz: ${lesson.topic.substring(0, 30)}`;
            flashcards.setFlashcardSets((prev: Record<string, Flashcard[]>) => ({ ...prev, [setName]: cards }));

            showToast(`✅ ${cards.length} cartes générées !`, "success");

        } catch (error) {
            console.error("Erreur génération quiz:", error);
            showToast("Erreur lors de la génération du quiz.", "error");
        }
    };

    return {
        config,
        // Navigation (delegated)
        screen: navigation.screen,
        setScreen: navigation.setScreen,
        isEditModalOpen: navigation.isEditModalOpen,
        setIsEditModalOpen: navigation.setIsEditModalOpen,
        
        voiceEngine, setVoiceEngine,
        autoPlayAudio, setAutoPlayAudio,
        srsPreviewCards, srsPreviewConfig,
        
        // Study Content (delegated)
        currentLesson: studyContent.currentLesson,
        savedLessons: studyContent.savedLessons,
        setSavedLessons: studyContent.setSavedLessons,
        studyPrograms: studyContent.studyPrograms,
        setStudyPrograms: studyContent.setStudyPrograms,
        curriculumSuggestions: studyContent.curriculumSuggestions,
        setCurriculumSuggestions: studyContent.setCurriculumSuggestions,
        librarySuggestions: studyContent.librarySuggestions,
        setLibrarySuggestions: studyContent.setLibrarySuggestions,
        
        aiModalInitialTopic, aiModalInitialMode,
        
        // Hooks Data
        flashcards,
        quizSession,
        gamification,
        analyticsData,
        srs,
        theme,
        availableLanguages,
        guestTutors,
        setGuestTutors,
        addGuestTutor,
        updateGuestTutor,
        removeGuestTutor,

        // Handlers
        handleSelectTutor,
        setSelectedTutor,
        handleGenerateCurriculum,
        handleCurriculumGenerated,
        handleLessonGenerated,
        handleLessonSuggestion,
        handleSuggestedProgram,
        handleSaveLesson: studyContent.handleSaveLesson,
        handleSelectLesson,
        onStartQuiz,
        handleGenerateQuizFromLesson,
        onShowSRSPreview,
        onStartSRSReview,
        handleGenerateModuleContent,
        handleDeleteProgram: studyContent.handleDeleteProgram,
        handleRenameProgram: studyContent.handleRenameProgram,
        handleDeleteLesson: studyContent.handleDeleteLesson,
        handleRenameLesson: studyContent.handleRenameLesson,
        handleMarkModuleComplete: studyContent.markCurrentModuleComplete,
        handleStartModule,
        handleStartModuleQuiz,
        handleBackToLesson,
        handleGenerateBonusExercises,
        handleInteractiveExercises,
        handleExerciseComplete,
        handleNavigateToSRS,
        onQuizEnd,
        onSaveEditedCardsWrapper,
        handleNavigateToAIGenerator,
        handleAICardsGenerated,
        showToast,
        
        resetAllData: () => {
            console.log("[Coordinator] Total reset of local data");
            flashcards.setFlashcardSets({
                [DEFAULT_FLASHCARD_SET_NAME]: DEFAULT_FLASHCARDS,
            });
            flashcards.setCurrentSetName(DEFAULT_FLASHCARD_SET_NAME);
            studyContent.setSavedLessons([]);
            studyContent.setStudyPrograms([]);
            studyContent.setCurriculumSuggestions([]);
            studyContent.setLibrarySuggestions([]);
            gamification.setGamificationData(INITIAL_GAMIFICATION_DATA);
            quizSession.setHistory([]);
            quizSession.setPersistentErrors({});
            ChatService.clearAllSessions();
        },
        
        // Tutors Room State
        tutorsRoomCategory,
        setTutorsRoomCategory,

        // Video Lab State
        videoLabURL, setVideoLabURL,
        videoLabAnalysis, setVideoLabAnalysis,
        isProgramCompleted, setIsProgramCompleted,
        
        // Update Management
        latestVersion,
        updateStatus,
        isCheckingUpdate,
        checkForUpdates
    };
};
