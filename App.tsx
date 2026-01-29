import React, { lazy, Suspense } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { SetupScreen } from "./components/SetupScreen";
import { QuizScreen } from "./components/QuizScreen";
import { CompletionScreen } from "./components/CompletionScreen";
import { ReviewAllScreen } from "./components/ReviewAllScreen";
import { RevisionScreen } from "./components/RevisionScreen";
import { EditCardsModal } from "./components/EditCardsModal";
import { DashboardScreen } from "./components/DashboardScreen";
import { AIGeneratorModal } from "./components/AIGeneratorModal";
import { SRSReviewScreen } from "./components/SRSReviewScreen";
import { HelpModal } from "./components/HelpModal";
import { SetsManagementModal } from './components/SetsManagementModal';
import { SettingsScreen } from "./components/SettingsScreen";
import { SavedLessonsModal } from "./components/SavedLessonsModal";
import { TutorsRoomModal } from "./components/TutorsRoomModal";
import { TutorSelectionModal } from "./components/TutorSelectionModal";
import { ExerciseScreen } from "./components/ExerciseScreen";

// Lazy loaded components (non-critical, loaded on demand)
const ConjugatorScreen = lazy(() => import("./components/ConjugatorScreen").then(m => ({ default: m.ConjugatorScreen })));
const LessonScreen = lazy(() => import("./components/LessonScreen").then(m => ({ default: m.LessonScreen })));
const CurriculumScreen = lazy(() => import("./components/CurriculumScreen").then(m => ({ default: m.CurriculumScreen })));
const DrawingChallengeScreen = lazy(() => import("./components/DrawingChallengeScreen").then(m => ({ default: m.DrawingChallengeScreen })));
const DrawingTutorialScreen = lazy(() => import("./components/DrawingTutorialScreen").then(m => ({ default: m.DrawingTutorialScreen })));
const LanguageLabScreen = lazy(() => import("./components/LanguageLabScreen").then(m => ({ default: m.LanguageLabScreen })));
const MusicChallengeScreen = lazy(() => import("./components/MusicChallengeScreen").then(m => ({ default: m.MusicChallengeScreen })));
const ChessChallengeScreen = lazy(() => import("./components/ChessChallengeScreen").then(m => ({ default: m.ChessChallengeScreen })));
const CodingChallengeScreen = lazy(() => import("./components/CodingChallengeScreen").then(m => ({ default: m.CodingChallengeScreen })));
const KnowledgeMapScreen = lazy(() => import("./components/KnowledgeMapScreen").then(m => ({ default: m.KnowledgeMapScreen })));
const LibraryScreen = lazy(() => import("./components/LibraryScreen").then(m => ({ default: m.LibraryScreen })));
const VideoLabScreen = lazy(() => import("./components/VideoLabScreen").then(m => ({ default: m.VideoLabScreen })));

import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

import { AuthModal } from "./components/AuthModal";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { syncService } from "./services/syncService";

import { ProgressScreen } from "./components/ProgressScreen";
import { ChatScreen } from "./components/ChatScreen";
import { AIConfigProvider } from "./contexts/AIConfigContext";
import { ToastProvider } from "./contexts/ToastContext";
import { useAppCoordinator } from "./hooks/useAppCoordinator";
import { Screen } from "./types";
import { ConfirmationProvider } from "./contexts/ConfirmationContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { migrateLocalStorage } from "./utils/migration";


const AppContent: React.FC = () => {
  const coordinator = useAppCoordinator();
  const { 
      screen, setScreen, 
      config,
      flashcards, quizSession, gamification, analyticsData, srs, theme,
      isEditModalOpen, setIsEditModalOpen,
      voiceEngine, setVoiceEngine, autoPlayAudio, setAutoPlayAudio,
      availableLanguages,
      aiModalInitialTopic, aiModalInitialMode,
      currentLesson,
      srsPreviewCards, srsPreviewConfig,
      guestTutors, addGuestTutor, updateGuestTutor, removeGuestTutor
  } = coordinator;

  const [isSetsManagerOpen, setIsSetsManagerOpen] = React.useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = React.useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  
  const { user } = useAuth();


  
  // Migration des clés localStorage (une fois au démarrage)
  React.useEffect(() => {
    migrateLocalStorage();
  }, []);

  
  // Navigation Stack History
  const [, setScreenHistory] = React.useState<Screen[]>([]);

  const handleNavigate = (target: Screen, from: Screen = screen) => {
    setScreenHistory(prev => [...prev, from]);
    setScreen(target);
  };

   const handleBack = () => {
    setScreenHistory(prev => {
        const newHistory = [...prev];
        const prevScreen = newHistory.pop();
        if (prevScreen) {
            setScreen(prevScreen);
        } else {
            setScreen("home");
        }
        return newHistory;
    });
  };

  const isInitialSyncProgress = React.useRef(false);

  // Synchronisation automatique (Réactive)
  React.useEffect(() => {
    if (!user || isInitialSyncProgress.current) return;

    const timeoutId = setTimeout(async () => {
         try {
             // 1. Sync Profile (Incluant suggestions)
             await syncService.syncProfile(user.id, {
                 theme_mode: theme.themeMode,
                 theme_style: theme.themeStyle,
                 gamification_data: gamification.gamificationData,
                 analytics_data: analyticsData,
                 curriculum_suggestions: coordinator.curriculumSuggestions,
                 library_suggestions: coordinator.librarySuggestions
             });

             // 2. Sync Flashcards
             await syncService.syncFlashcards(user.id, flashcards.flashcardSets);

             // 3. Sync Programs
             await syncService.syncStudyPrograms(user.id, coordinator.studyPrograms);

             // 4. Sync Lessons
             await syncService.syncSavedLessons(user.id, coordinator.savedLessons);
             
             console.log("☁️ Cloud Sync: OK");
         } catch (e) {
             console.error("☁️ Cloud Sync Error:", e);
         }
    }, 2000); // Délai de 2 secondes pour éviter de saturer Supabase
    
    return () => clearTimeout(timeoutId);
  }, [
      user, 
      flashcards.flashcardSets, 
      coordinator.studyPrograms, 
      coordinator.savedLessons,
      coordinator.curriculumSuggestions, 
      coordinator.librarySuggestions,
      theme.themeMode,
      theme.themeStyle,
      gamification.gamificationData,
      analyticsData
  ]);


  // Récupération des données Cloud (Au login ou au démarrage si déjà connecté)
  const loadCloudData = async (silent = false) => {
      if (!user || isInitialSyncProgress.current) return;
      isInitialSyncProgress.current = true;
      
      if (!silent) coordinator.showToast("☁️ Synchronisation Cloud en cours...", "info");
      
      try {
          // 1. Profil & Thème & Suggestions
          const cloudProfile = await syncService.getProfile(user.id);
          if (cloudProfile) {
              if (cloudProfile.theme_mode) theme.setThemeMode(cloudProfile.theme_mode as any);
              if (cloudProfile.theme_style) theme.setThemeStyle(cloudProfile.theme_style as any);
              if (cloudProfile.curriculum_suggestions) coordinator.setCurriculumSuggestions(cloudProfile.curriculum_suggestions);
              if (cloudProfile.library_suggestions) coordinator.setLibrarySuggestions(cloudProfile.library_suggestions);
          }

          // 2. Flashcards
          const cloudSets = await syncService.getFlashcards(user.id);
          if (cloudSets && Object.keys(cloudSets).length > 0) {
              flashcards.setFlashcardSets(cloudSets);
          }

          // 3. Programmes d'étude
          const cloudPrograms = await syncService.getStudyPrograms(user.id);
          if (cloudPrograms && cloudPrograms.length > 0) {
              if (coordinator.setStudyPrograms) coordinator.setStudyPrograms(cloudPrograms);
          }

          // 4. Lessons
          const cloudLessons = await syncService.getSavedLessons(user.id);
          if (cloudLessons && cloudLessons.length > 0) {
              if (coordinator.setSavedLessons) coordinator.setSavedLessons(cloudLessons);
          }

          if (!silent) coordinator.showToast("☁️ Données cloud récupérées !", "success");
      } catch (e) {
          console.error("Load Cloud Error:", e);
          if (!silent) coordinator.showToast("Erreur de récupération cloud", "error");
      } finally {
          setTimeout(() => {
             isInitialSyncProgress.current = false;
          }, 3000);
      }
  };

  // Déclencher le chargement initial dès que l'utilisateur est disponible
  React.useEffect(() => {
     if (user) {
         loadCloudData(true); // Silencieux au démarrage
     }
  }, [user?.id]);





  const [selectedTutorialTopic, setSelectedTutorialTopic] = React.useState<string | undefined>(undefined);
  const [activeTutorId, setActiveTutorId] = React.useState<string>("maitre-leonard");
  const [chatTutorName, setChatTutorName] = React.useState<string | undefined>(undefined);
  const [chatTutorSubject, setChatTutorSubject] = React.useState<string | undefined>(undefined);

  const handleStartChat = (tutorName: string, tutorSubject: string) => {
    setChatTutorName(tutorName);
    setChatTutorSubject(tutorSubject);
    handleNavigate("chat", "tutors-room");
  };


  const handleStartTutorial = (tutorId: string = "maitre-leonard", topic?: string) => {
    setActiveTutorId(tutorId);
    setSelectedTutorialTopic(topic);
    handleNavigate("drawing-tutorial", "tutors-room");
  };

  const renderScreen = () => {
    switch (screen) {
      case "home":
        const dueCardsCount = srs.getDueCards(flashcards.allFlashcards).length;
        return (
          <HomeScreen
            streak={gamification.gamificationData.streak.currentStreak}
            dueCardsCount={dueCardsCount}
            totalCards={flashcards.allFlashcards.length}
            onNavigateToQuiz={() => setScreen("setup")}
            onNavigateToSRS={coordinator.handleNavigateToSRS}
            onNavigateToAIGenerator={coordinator.handleNavigateToAIGenerator}
            onNavigateToTutorsRoom={() => setScreen("tutors-room")}
            onNavigateToConjugator={() => setScreen("conjugator")}
            onNavigateToDashboard={() => setScreen("dashboard")}
            onNavigateToSettings={() => setScreen("settings")}
            onNavigateToCurriculum={() => setScreen("curriculum")}
            onNavigateToKnowledgeMap={() => setScreen("knowledge-map")}
            onNavigateToLibrary={() => setScreen("library")}
            onNavigateToVideoLab={() => setScreen("video-lab")}
            onNavigateToChat={() => setScreen("chat")}
            onNavigateToLanguageLab={() => setScreen("tutor-selection")}

            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            onThemeModeChange={theme.setThemeMode}
            onThemeStyleChange={theme.setThemeStyle}
            onShowHelp={() => setIsHelpModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            user={user}
          />
        );

      case "quiz":
        if (quizSession.quizConfig) {
          return (
            <QuizScreen
              quizCards={quizSession.quizCards}
              quizConfig={quizSession.quizConfig}
              onQuizEnd={coordinator.onQuizEnd}
              onBackToLesson={currentLesson ? coordinator.handleBackToLesson : undefined}
            />
          );
        }
        setScreen("setup");
        return null;

      case "completion":
        if (quizSession.lastResult && quizSession.quizConfig) {
          return (
            <CompletionScreen
              lastResult={quizSession.lastResult}
              incorrectCards={quizSession.incorrectCards}
              persistentErrors={quizSession.getPersistentErrorCards(flashcards.allFlashcards)}
              history={quizSession.history}
              onStartRevision={() => setScreen("revision")}
              onRestart={() => setScreen("home")}
              onRestartSameQuiz={() =>
                quizSession.quizConfig && coordinator.onStartQuiz(quizSession.quizCards, quizSession.quizConfig)
              }
              onBackToSetup={() => setScreen("setup")}
              quizConfig={quizSession.quizConfig}
              onDeleteHistoryEntry={quizSession.deleteHistoryEntry}
              onResetPersistentError={quizSession.resetPersistentError}
              newAchievements={gamification.newAchievements}
              onBackToLesson={currentLesson ? coordinator.handleBackToLesson : undefined}
              onGenerateBonusExercises={currentLesson ? coordinator.handleGenerateBonusExercises : undefined}
            />
          );
        }
        setScreen("home");
        return null;

      case "reviewAll":
        const allColumns = Array.from(new Set(flashcards.allFlashcards.flatMap((card) => {
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
        })));
        return (
          <ReviewAllScreen
            cards={flashcards.allFlashcards}
            allColumns={allColumns}
            onBack={() => setScreen("setup")}
            onHome={() => setScreen("home")}
          />
        );

      case "revision":
        if (quizSession.quizConfig) {
          return (
            <RevisionScreen
              cards={quizSession.incorrectCards}
              quizConfig={quizSession.quizConfig}
              onBack={() => setScreen("completion")}
              onRestartQuiz={() => coordinator.onStartQuiz(quizSession.incorrectCards, quizSession.quizConfig!)}
            />
          );
        }
        setScreen("home");
        return null;

      case "dashboard":
        return (
          <DashboardScreen
            gamificationData={gamification.gamificationData}
            analyticsData={analyticsData}
            onBack={() => setScreen("home")}
            allFlashcards={flashcards.allFlashcards}
            onStartQuiz={coordinator.onStartQuiz}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
          />
        );

      case "srs-preview":
        return (
          <SRSReviewScreen
            dueCards={srsPreviewCards}
            questionLang={srsPreviewConfig?.questionLang || "fr"}
            answerLang={srsPreviewConfig?.answerLang || "it"}
            onStartReview={coordinator.onStartSRSReview}
            onCancel={() => setScreen("home")}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
          />
        );

      case "conjugator":
        return (
          <ConjugatorScreen
            onBack={() => setScreen("home")}
            onAddCards={(cards) => { flashcards.addCards(cards); setScreen('setup'); }}
            onCreateSet={(name, cards) => { flashcards.createSet(name, cards); setScreen('setup'); }}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
          />
        );

      case "settings":
        return <SettingsScreen onBack={handleBack} />;

      case "ai-generator":
        return (
          <AIGeneratorModal
            isOpen={true}
            onClose={handleBack}
            onCardsGenerated={(cards) => { coordinator.handleAICardsGenerated(cards); setScreen('setup'); }}
            onCreateSet={(name, cards) => { flashcards.createSet(name, cards); setScreen('setup'); }}
            onAddCards={(cards) => { flashcards.addCards(cards); setScreen('setup'); }}
            onLessonGenerated={coordinator.handleLessonGenerated}
            onCurriculumGenerated={coordinator.handleCurriculumGenerated}

            availableLanguages={availableLanguages}
            initialTopic={aiModalInitialTopic}
            initialMode={aiModalInitialMode}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            onShowSavedLessons={() => handleNavigate("saved-lessons", "ai-generator")}
            onNavigateToSettings={() => handleNavigate("settings", "ai-generator")}
          />
        );

      case "tutor-selection":
        return (
          <TutorSelectionModal
            isOpen={true}
            onClose={() => setScreen("home")}
            onSelectTutor={(tutor) => {
                 coordinator.setSelectedTutor(tutor);
                 setScreen("language-lab");
            }}
            guestTutors={guestTutors}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
          />
        );

      case "tutors-room":
        return (
          <TutorsRoomModal
            isOpen={true}
            onClose={() => setScreen("home")}
            onSelectTutor={(tutor) => {
                setScreenHistory(prev => [...prev, "tutors-room"]);
                coordinator.handleSelectTutor(tutor);
            }}
            onGenerateCurriculum={(tutor) => {
                setScreenHistory(prev => [...prev, "tutors-room"]);
                coordinator.handleGenerateCurriculum(tutor);
            }}
            onDrawingChallenge={() => handleNavigate("drawing-challenge", "tutors-room")}
            onMusicChallenge={() => handleNavigate("music-challenge", "tutors-room")}
            onChessChallenge={() => handleNavigate("chess-challenge", "tutors-room")}
            onCodingChallenge={() => handleNavigate("coding-challenge", "tutors-room")}
            onStartTutorial={(tutorId) => handleStartTutorial(tutorId)}
            onOpenLanguageLab={() => handleNavigate("language-lab", "tutors-room")}
            guestTutors={guestTutors}
            onAddGuestTutor={addGuestTutor}
            onUpdateGuestTutor={updateGuestTutor}
            onRemoveGuestTutor={removeGuestTutor}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            selectedCategory={coordinator.tutorsRoomCategory}
            onSelectCategory={coordinator.setTutorsRoomCategory}
            onNavigateToSettings={() => handleNavigate("settings", "tutors-room")}
            onNavigateToProgress={() => handleNavigate("progress", "tutors-room")}
            onStartChat={handleStartChat}
          />
        );

      case "drawing-challenge":
        return <DrawingChallengeScreen onBack={handleBack} />;

      case "drawing-tutorial":
        return (
            <DrawingTutorialScreen 
                onBack={handleBack} 
                initialTopic={selectedTutorialTopic} 
                tutorId={activeTutorId}
            />
        );

      case "music-challenge":
        return <MusicChallengeScreen onBack={handleBack} />;

      case "chess-challenge":
        return <ChessChallengeScreen onBack={handleBack} />;

      case "coding-challenge":
        return <CodingChallengeScreen onBack={handleBack} />;

      case "progress":
        return <ProgressScreen onBack={handleBack} />;

      case "chat":
        return (
          <ChatScreen 
            onBack={handleBack} 
            tutorName={chatTutorName}
            tutorSubject={chatTutorSubject}
            onStartQuiz={(cards) => {
                // Créer un set dédié pour ce quiz
                const setName = `${chatTutorName || 'Tuteur'} - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
                
                // Utiliser les fonctions du hook flashcards
                flashcards.createSet(setName, cards);
                flashcards.setCurrentSetName(setName);
                
                // Rediriger vers l'écran de configuration du quiz (Setup)
                setScreen("setup");
            }}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
          />
        );

      case "language-lab":
        return (
            <LanguageLabScreen
                tutor={config.selectedTutor || guestTutors[0]}
                onBack={handleBack}
                themeMode={theme.themeMode}
                themeStyle={theme.themeStyle}
                onAddCards={flashcards.addCards}
                onCreateSet={flashcards.createSet}
                flashcardSets={flashcards.flashcardSets}
            />
        );

      case "knowledge-map":
        return <KnowledgeMapScreen flashcardSets={flashcards.flashcardSets} onBack={handleBack} onResetProgress={flashcards.resetAllProgress} themeMode={theme.themeMode} themeStyle={theme.themeStyle} />;

      case "library":
        return (
          <LibraryScreen 
            onBack={handleBack} 
            onImport={flashcards.createSet}
            onAddCardsToSet={flashcards.addCards}
            userSets={flashcards.flashcardSets}
            onDeleteSet={flashcards.deleteSet}
            onRenameSet={flashcards.renameSet}
            currentSetName={flashcards.currentSetName}
            onSelectSet={flashcards.setCurrentSetName}
            onStartQuiz={() => setScreen("setup")}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            customCollections={coordinator.librarySuggestions}
            setCustomCollections={coordinator.setLibrarySuggestions}
          />
        );

      case "video-lab":
        return (
          <VideoLabScreen 
            onBack={handleBack} 
            onAddCards={(cards) => { flashcards.addCards(cards); coordinator.showToast("Fiches ajoutées avec succès !", "success"); }} 
            onCreateSet={(name, cards) => { flashcards.createSet(name, cards); coordinator.showToast(`Dossier "${name}" créé !`, "success"); }} 
            onLessonGenerated={coordinator.handleLessonGenerated}
            onShowSavedLessons={() => handleNavigate("saved-lessons", "video-lab")}
            initialURL={coordinator.videoLabURL}
            onURLChange={coordinator.setVideoLabURL}
            initialAnalysis={coordinator.videoLabAnalysis}
            onAnalysisChange={coordinator.setVideoLabAnalysis}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
          />
        );

      case "curriculum":
        return (
          <CurriculumScreen
            onBack={() => setScreen("home")}
            programs={coordinator.studyPrograms}
            onGenerateContent={coordinator.handleGenerateModuleContent}
            onStartModule={coordinator.handleStartModule}
            onStartQuiz={coordinator.handleStartModuleQuiz}
            onDeleteProgram={coordinator.handleDeleteProgram}
            onRenameProgram={coordinator.handleRenameProgram}
            onSuggestedProgram={coordinator.handleSuggestedProgram}
            onDrawingChallenge={() => setScreen("drawing-challenge")}
            onNewProgram={() => setScreen("tutors-room")}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            customSuggestions={coordinator.curriculumSuggestions}
            setCustomSuggestions={coordinator.setCurriculumSuggestions}
          />
        );

      case "lesson":
        if (currentLesson) {
          return (
            <LessonScreen
              lesson={currentLesson}
              onBack={() => {
                if (currentLesson.source === 'curriculum') {
                    setScreen("curriculum");
                } else {
                    setScreen("saved-lessons");
                }
              }}
              onHome={() => setScreen("home")}
              onSave={coordinator.handleSaveLesson}
              onNewLesson={coordinator.handleLessonSuggestion}
              onStartQuiz={(cards) => coordinator.onStartQuiz(cards, {
                questionLang: 'fr',
                answerLang: 'fr',
                mode: 'mixed',
                voiceGender: 'female',
                gameMode: 'normal'
              })}
              onGenerateExercises={coordinator.handleInteractiveExercises}
              onGenerateQuiz={coordinator.handleGenerateQuizFromLesson}
            />
          );
        }
        setScreen("home");
        return null;

      case "exercises":
        if (currentLesson && currentLesson.exercises) {
            return (
                <ExerciseScreen 
                    exerciseSet={currentLesson.exercises}
                    onBack={() => setScreen("lesson")}
                    onHome={() => setScreen("home")}
                    onComplete={coordinator.handleExerciseComplete}
                />
            );
        }
        setScreen("lesson");
        return null;

      case "saved-lessons":
        return (
          <SavedLessonsModal
            isOpen={screen === "saved-lessons"}
            onClose={handleBack}
            lessons={coordinator.savedLessons}
            onSelectLesson={coordinator.handleSelectLesson}
            onDeleteLesson={coordinator.handleDeleteLesson}
          />
        );

      case "setup":
      default:
        return (
          <SetupScreen
            allFlashcards={flashcards.allFlashcards}
            flashcardSetName={flashcards.currentSetName}
            onStartQuiz={coordinator.onStartQuiz}
            onShowSRSPreview={coordinator.onShowSRSPreview}
            onFileImport={flashcards.handleFileImport}
            onShowReview={() => setScreen("reviewAll")}
            onShowEdit={() => setIsEditModalOpen(true)}
            onShowDashboard={() => setScreen("dashboard")}
            onShowSettings={() => setScreen("settings")}
            onManageSets={() => setIsSetsManagerOpen(true)}
            voiceEngine={voiceEngine}
            setVoiceEngine={setVoiceEngine}
            autoPlayAudio={autoPlayAudio}
            setAutoPlayAudio={setAutoPlayAudio}
            streak={gamification.gamificationData.streak.currentStreak}
            onBack={() => setScreen("home")}
            setCurrentSetName={flashcards.setCurrentSetName}
            flashcardSets={flashcards.flashcardSets}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
          />
        );
    }
  };

  return (
    <div 
      className={`h-full w-full overflow-hidden flex flex-col p-1 md:p-2.5 font-sans transition-colors duration-500 ${theme.themeStyle === 'apple' ? 'bg-[#E8E8ED] dark:bg-black' : 'bg-gray-100 dark:bg-gray-900'}`}
      style={{ height: '100dvh' }}
    >
        <main className={`mx-auto rounded-3xl shadow-2xl transition-all duration-500 relative flex flex-col overflow-hidden ${
          theme.themeStyle === 'apple' 
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl border border-white/10' 
            : 'bg-white dark:bg-gray-800'
        } ${
          ['home', 'drawing-tutorial', 'srs-preview', 'tutors-room', 'ai-generator', 'conjugator', 'curriculum', 'setup', 'chat', 'tutor-selection', 'language-lab', 'knowledge-map', 'video-lab', 'dashboard', 'library', 'reviewAll', 'completion', 'lesson', 'exercises', 'drawing-challenge', 'music-challenge', 'chess-challenge', 'progress', 'revision', 'settings', 'saved-lessons', 'quiz'].includes(screen)
            ? 'w-full max-w-6xl flex-1 min-h-0 p-0' 
            : 'w-[95%] max-w-4xl flex-initial p-6'
        }`}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-text-secondary">Chargement...</p>
              </div>
            </div>
          }>
            {renderScreen()}
          </Suspense>
        </main>

        <EditCardsModal
          isOpen={isEditModalOpen}
          cards={flashcards.allFlashcards}
          onSave={coordinator.onSaveEditedCardsWrapper}
          onClose={() => setIsEditModalOpen(false)}
        />
        <SetsManagementModal
        isOpen={isSetsManagerOpen}
        onClose={() => setIsSetsManagerOpen(false)}
        flashcardSets={flashcards.flashcardSets}
        currentSetName={flashcards.currentSetName}
        onRenameSet={flashcards.renameSet}
        onDeleteSet={flashcards.deleteSet}
        onSelectSet={flashcards.setCurrentSetName}
      />
      
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)} 
      />

      <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          themeMode={theme.themeMode}
          themeStyle={theme.themeStyle}
          onForceRefresh={() => loadCloudData(false)}
      />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AIConfigProvider>
        <ToastProvider>
          <ConfirmationProvider>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
          </ConfirmationProvider>
        </ToastProvider>
      </AIConfigProvider>
    </LanguageProvider>
  );
};

export default App; // ...
