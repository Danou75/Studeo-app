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
import { INITIAL_GAMIFICATION_DATA } from './utils/achievements';
import { DEFAULT_FLASHCARDS, DEFAULT_FLASHCARD_SET_NAME } from './constants';
import { Screen } from "./types";
import { ConfirmationProvider } from "./contexts/ConfirmationContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { migrateLocalStorage } from "./utils/migration";
import { ChatService } from "./services/chatService";
import { getDeviceName } from "./utils/deviceInfo";


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
  const [canAutoPush, setCanAutoPush] = React.useState(false);
  const [cloudStatus, setCloudStatus] = React.useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const userHasModified = React.useRef(false);

  // Verrou au démarrage DUR : On bloque l'auto-push pendant 60s sur mobile, 30s sur desktop
  React.useEffect(() => {
    const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    const delay = isMobile ? 60000 : 30000;
    
    console.log(`[Sync] App start. Blocking auto-push for ${delay/1000}s`);
    const timer = setTimeout(() => {
      // On ne débloque l'auto-push que si on a déjà fait un premier chargement (loadCloudData)
      if (canAutoPush === false && (window as any)._initialPullDone) {
          setCanAutoPush(true);
          console.log("[Sync] Auto-push unlocked");
      }
    }, delay); 
    return () => clearTimeout(timer);
  }, []);

  const pushCloudData = async (silent = false) => {
    if (!user) {
        if (!silent) coordinator.showToast("Vous devez être connecté pour synchroniser vos données sur le Cloud.", "warning");
        return;
    }
    if (isInitialSyncProgress.current) return;
    isInitialSyncProgress.current = true;
    setCloudStatus('syncing');
    const deviceName = getDeviceName();
    
    if (!silent) coordinator.showToast(`☁️ Sauvegarde en cours depuis "${deviceName}"...`, "info", 2000);
    console.log(`[Sync] Pushing data for user ${user.id} from device: ${deviceName}`);
    
    try {
        // Capturer l'état actuel pour éviter les changements pendant l'envoi
        const currentSets = { ...flashcards.flashcardSets };
        const currentPrograms = [...coordinator.studyPrograms];
        const currentLessons = [...coordinator.savedLessons];
        const currentHistory = [...quizSession.history];
        
        const knownDevicesRaw = localStorage.getItem('studeo_known_devices');
        const knownDevices = knownDevicesRaw ? JSON.parse(knownDevicesRaw) : [];
        if (deviceName && !knownDevices.includes(deviceName)) {
            knownDevices.push(deviceName);
            localStorage.setItem('studeo_known_devices', JSON.stringify(knownDevices));
        }

        // 1. Sync Profile
        const profileSync = await syncService.syncProfile(user.id, {
            theme_mode: theme.themeMode,
            theme_style: theme.themeStyle,
            gamification_data: gamification.gamificationData,
            analytics_data: analyticsData,
            curriculum_suggestions: coordinator.curriculumSuggestions,
            library_suggestions: coordinator.librarySuggestions,
            quiz_history: currentHistory,
            persistent_errors: quizSession.persistentErrors,
            last_sync_device: deviceName,
            known_devices: knownDevices,
            guest_tutors: coordinator.guestTutors
        });
        if (!profileSync.success) {
            throw new Error(`Profil: ${profileSync.error?.message || "Erreur inconnue"}`);
        }

        // 2. Sync Flashcards
        const cardsSyncOk = await syncService.syncFlashcards(user.id, currentSets);
        if (!cardsSyncOk) throw new Error("Échec de la synchronisation des flashcards");

        // 3. Sync Programs
        const programsSyncOk = await syncService.syncStudyPrograms(user.id, currentPrograms);
        if (!programsSyncOk) throw new Error("Échec de la synchronisation des programmes");

        // 4. Sync Lessons
        const lessonsSyncOk = await syncService.syncSavedLessons(user.id, currentLessons);
        if (!lessonsSyncOk) throw new Error("Échec de la synchronisation des cours");

        // 5. Sync Chat
        const chatSessions = ChatService.getSessions();
        if (chatSessions.length > 0) {
            await syncService.syncChatSessions(user.id, chatSessions);
        }
        
        console.log("☁️ Cloud Push: OK");
        setCanAutoPush(true); // Une fois qu'on a poussé ou tiré manuellement, on peut auto-sync
        setCloudStatus('synced');
        setTimeout(() => setCloudStatus('idle'), 5000);
        
        if (!silent) coordinator.showToast(`✅ Sauvegardé avec succès ! (Appareil: ${deviceName})`, "success", 3000);
        return true;
    } catch (e: any) {
        console.error("☁️ Cloud Push Error:", e);
        setCloudStatus('error');
        if (!silent) {
            const msg = e.message || "Erreur de sauvegarde cloud";
            coordinator.showToast(`❌ ${msg}`, "error", 5000);
        }
        return false;
    } finally {
        // On garde le verrou un peu plus longtemps pour éviter l'effet rebond
        setTimeout(() => {
            isInitialSyncProgress.current = false;
        }, 3000);
    }
  };

  const reloadApp = () => {
    if (window.confirm("Voulez-vous recharger l'application pour appliquer les mises à jour ?")) {
        window.location.reload();
    }
  };

  // Marquer qu'une modification locale a eu lieu (pour autoriser l'auto-push plus tard)
  React.useEffect(() => {
    // Si on n'est pas en train de charger du cloud, et que le premier chargement est fait,
    // toute modification de ces états est considérée comme venant de l'utilisateur.
    if (!isInitialSyncProgress.current && (window as any)._initialPullDone) {
        console.log("[Sync] Local modification detected. Auto-push will be allowed.");
        userHasModified.current = true;
    }
  }, [
      flashcards.flashcardSets, 
      coordinator.studyPrograms, 
      coordinator.savedLessons,
      theme.themeMode,
      theme.themeStyle,
      gamification.gamificationData,
      analyticsData,
      quizSession.persistentErrors,
      coordinator.guestTutors
  ]);

  // Synchronisation automatique (Réactive)
  React.useEffect(() => {
    // CONDITION CRITIQUE : N'envoyer au cloud QUE si l'utilisateur a modifié quelque chose LOCALEMENT
    // et que le verrou initial est levé.
    if (!user || isInitialSyncProgress.current || !canAutoPush || !userHasModified.current) return;

    const timeoutId = setTimeout(() => {
         pushCloudData(true);
    }, 2000); // Délai de 2 secondes pour éviter de saturer Supabase
    
    return () => clearTimeout(timeoutId);
  }, [
      user, 
      screen,
      flashcards.flashcardSets, 
      coordinator.studyPrograms, 
      coordinator.savedLessons,
      coordinator.curriculumSuggestions, 
      coordinator.librarySuggestions,
      theme.themeMode,
      theme.themeStyle,
      gamification.gamificationData,
      analyticsData,
      quizSession.persistentErrors,
      config, // Ajouté pour déclencher la synchro quand on change le nom de l'appareil
      coordinator.guestTutors
  ]);


  // Récupération des données Cloud (Au login ou au démarrage si déjà connecté)
  const loadCloudData = async (silent = false, force = false) => {
      if (!user || isInitialSyncProgress.current) return;
      isInitialSyncProgress.current = true;
      setCloudStatus('syncing');
      
      // if (!silent) coordinator.showToast("☁️ Synchronisation Cloud en cours...", "info", 1000); // Shorter or removed
      
      try {
          // 1. Profil & Thème & Suggestions (Bypass cache avec timestamp)
          const cloudProfile = await syncService.getProfile(user.id);
          console.log(`[Sync] ${new Date().toLocaleTimeString()} - Pulled profile for ${user.email} (ID: ${user.id}). Last update: ${cloudProfile?.updated_at}`);
          
          if (cloudProfile) {
              if (cloudProfile.theme_mode) theme.setThemeMode(cloudProfile.theme_mode as any);
              if (cloudProfile.theme_style) theme.setThemeStyle(cloudProfile.theme_style as any);
              if (cloudProfile.curriculum_suggestions) coordinator.setCurriculumSuggestions(cloudProfile.curriculum_suggestions);
              if (cloudProfile.library_suggestions) coordinator.setLibrarySuggestions(cloudProfile.library_suggestions);
              
              if (cloudProfile.gamification_data) {
                  gamification.setGamificationData(cloudProfile.gamification_data);
              }
              
              if (cloudProfile.quiz_history && Array.isArray(cloudProfile.quiz_history)) {
                  quizSession.setHistory(cloudProfile.quiz_history);
              }
              if (cloudProfile.persistent_errors) {
                  quizSession.setPersistentErrors(cloudProfile.persistent_errors);
              }
              if (cloudProfile.guest_tutors && Array.isArray(cloudProfile.guest_tutors)) {
                  coordinator.setGuestTutors(cloudProfile.guest_tutors);
              }

              if (cloudProfile.known_devices) {
                  localStorage.setItem('studeo_known_devices', JSON.stringify(cloudProfile.known_devices));
              }

              if (cloudProfile.updated_at) {
                  const lastDate = new Date(cloudProfile.updated_at);
                  const device = cloudProfile.last_sync_device || "Inconnu";
                  (window as any)._lastSyncMsg = `(Dernière synchro : ${lastDate.toLocaleDateString()} ${lastDate.toLocaleTimeString()} depuis ${device})`;
              }
          } else if (force) {
              // Mode FORCE et pas de profil cloud: on réinitialise tout par mesure de sécurité
              console.log("[Sync] Force Pull: No cloud profile found, resetting to defaults.");
              theme.setThemeMode('light');
              theme.setThemeStyle('default');
              coordinator.setCurriculumSuggestions([]);
              coordinator.setLibrarySuggestions([]);
              gamification.setGamificationData(INITIAL_GAMIFICATION_DATA);
              quizSession.setHistory([]);
              quizSession.setPersistentErrors({});
              coordinator.setGuestTutors([]);
          }

          // 2. Flashcards
          const cloudSetsRaw = await syncService.getFlashcards(user.id);
          if (cloudSetsRaw && Array.isArray(cloudSetsRaw) && cloudSetsRaw.length > 0) {
              flashcards.setFlashcardSets(prev => {
                  if (force) {
                      // Mode FORCE: On repart de zéro localement
                      console.log("[Sync] Force Overwrite: Applying cloud cards directly");
                      const forcedMerged: Record<string, any[]> = {};
                      cloudSetsRaw.forEach((item: any) => {
                          forcedMerged[item.name] = item.cards;
                      });
                      return forcedMerged;
                  }

                  const merged = { ...prev };
                  cloudSetsRaw.forEach((item: any) => {
                      const setName = item.name;
                      const cloudCards = item.cards as any[];
                      
                      if (!merged[setName]) {
                          merged[setName] = cloudCards;
                      } else {
                          // Merge logic
                          const localCards = merged[setName];
                          const localMap = new Map(localCards.map(c => [c.id, c]));
                          
                          cloudCards.forEach(cc => {
                              const lc = localMap.get(cc.id);
                              if (!lc) {
                                  localMap.set(cc.id, cc);
                              } else {
                                  const cloudLast = cc.srsData?.lastReviewed ? new Date(cc.srsData.lastReviewed).getTime() : 0;
                                  const localLast = lc.srsData?.lastReviewed ? new Date(lc.srsData.lastReviewed).getTime() : 0;
                                  if (cloudLast >= localLast) {
                                      localMap.set(cc.id, cc);
                                  }
                              }
                          });
                          merged[setName] = Array.from(localMap.values());
                      }
                  });
                  return merged;
              });
          } else if (force) {
              // Cloud vide et mode force : on remet les cartes par défaut
              console.log("[Sync] Force Pull: No cloud cards found, resetting to defaults.");
              flashcards.setFlashcardSets({
                  [DEFAULT_FLASHCARD_SET_NAME]: DEFAULT_FLASHCARDS,
              });
              flashcards.setCurrentSetName(DEFAULT_FLASHCARD_SET_NAME);
          }

          // 3. Programmes d'étude
          const cloudPrograms = await syncService.getStudyPrograms(user.id);
          if (cloudPrograms && cloudPrograms.length > 0) {
              if (coordinator.setStudyPrograms) {
                  coordinator.setStudyPrograms(prev => {
                      if (force) return cloudPrograms;
                      
                      const map = new Map(prev.map(p => [p.id, p]));
                      cloudPrograms.forEach(cp => {
                          const existing = map.get(cp.id);
                          if (!existing || cp.lastActiveAt > existing.lastActiveAt) {
                              map.set(cp.id, cp);
                          }
                      });
                      return Array.from(map.values());
                  });
              }
          }

          // 4. Lessons
          const cloudLessons = await syncService.getSavedLessons(user.id);
          if (cloudLessons && cloudLessons.length > 0) {
              if (coordinator.setSavedLessons) {
                  coordinator.setSavedLessons(prev => {
                      const map = new Map(prev.map(l => [l.id, l]));
                      cloudLessons.forEach(cl => {
                          if (!map.has(cl.id)) {
                              map.set(cl.id, cl);
                          }
                      });
                      // On garde l'ordre antichronologique (les plus récents en premier)
                      return Array.from(map.values()).sort((a, b) => 
                        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                      );
                  });
              }
          }
          
          // 5. Chat Sessions (Bidirectional Sync)
          if (force) ChatService.clearAllSessions();
          
          const localSessions = ChatService.getSessions();
          const cloudChat = await syncService.getChatSessions(user.id);
          
          if (cloudChat) {
              const merged = force ? [] : [...localSessions];
              let hasChanges = false;
              
              cloudChat.forEach(cs => {
                  const existingIndex = merged.findIndex(m => m.id === cs.id);
                  if (existingIndex === -1) {
                      merged.push(cs);
                      hasChanges = true;
                  } else if (new Date(cs.updatedAt).getTime() > new Date(merged[existingIndex].updatedAt).getTime()) {
                      merged[existingIndex] = cs;
                      hasChanges = true;
                  }
              });
              
              if (hasChanges || force) {
                  ChatService.saveSessions(merged);
              }
              
              if (merged.length > 0 && hasChanges) {
                  await syncService.syncChatSessions(user.id, merged);
              }
          }

          if (!silent) {
              const extraInfo = (window as any)._lastSyncMsg || "";
              coordinator.showToast(`✅ Synchronisation Cloud terminée ! ${extraInfo}`, "success", 10000);
              delete (window as any)._lastSyncMsg;
          }
          (window as any)._initialPullDone = true;
          setCloudStatus('synced');
          setTimeout(() => setCloudStatus('idle'), 5000);
          
          setCanAutoPush(true); // Après un pull réussi, on peut auto-sync les futurs changements
          userHasModified.current = false; // On reset car ce qu'on a vient du cloud
      } catch (e: any) {
          console.error("☁️ Cloud Pull Error:", e);
          setCloudStatus('error');
          if (!silent) {
            coordinator.showToast("Erreur de récupération cloud", "error");
          }
      } finally {
          // IMPORTANT: Après un pull (chargement), on verrouille toute sauvegarde sortante 
          // pendant 10 secondes pour laisser le temps au state React de se stabiliser
          // et éviter d'écraser le cloud avec un état local encore "ancien".
          setTimeout(() => {
             isInitialSyncProgress.current = false;
          }, 10000); 
      }
  };

  // Déclencher le chargement initial dès que l'utilisateur est disponible
  React.useEffect(() => {
     if (user) {
         // Délai de précaution pour laisser les modales se fermer proprement avant le grand nettoyage
         const timer = setTimeout(() => {
            console.log(`[Sync] User switched: ${user.id}. Starting full sync.`);
            loadCloudData(false, true); // Visible au démarrage pour voir les infos de synchro
         }, 100);
         return () => clearTimeout(timer);
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

  const handleOpenAuth = () => {
    setIsAuthModalOpen(true);
  };

  const renderScreen = () => {
    switch (screen) {
      case "home":
        const dueCardsCount = srs.getDueCards(flashcards.allFlashcards).length;
        return (
          <HomeScreen
            streak={gamification.gamificationData.streak.currentStreak}
            dueCardsCount={dueCardsCount}
            flashcardSets={flashcards.flashcardSets}
            onNavigateToQuiz={() => handleNavigate("setup")}
            onNavigateToSRS={coordinator.handleNavigateToSRS}
            onNavigateToAIGenerator={coordinator.handleNavigateToAIGenerator}
            onNavigateToTutorsRoom={() => handleNavigate("tutors-room")}
            onNavigateToConjugator={() => handleNavigate("conjugator")}
            onNavigateToDashboard={() => handleNavigate("dashboard")}
            onNavigateToSettings={() => handleNavigate("settings")}
            onNavigateToCurriculum={() => handleNavigate("curriculum")}
            onNavigateToKnowledgeMap={() => handleNavigate("knowledge-map")}
            onNavigateToLibrary={() => handleNavigate("library")}
            onNavigateToVideoLab={() => handleNavigate("video-lab")}
            onNavigateToChat={() => handleNavigate("chat")}
            onNavigateToLanguageLab={() => handleNavigate("tutor-selection")}

            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            onThemeModeChange={theme.setThemeMode}
            onThemeStyleChange={theme.setThemeStyle}
            onShowHelp={() => setIsHelpModalOpen(true)}
            onOpenAuth={handleOpenAuth}
            onSyncPush={() => pushCloudData(false)}
            cloudStatus={cloudStatus}
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
              isProgramCompleted={coordinator.isProgramCompleted}
              onResetProgramCompletion={() => coordinator.setIsProgramCompleted(false)}
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
            onSyncPush={() => pushCloudData(false)}
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
            onBack={handleBack}
            onAddCards={(cards) => { flashcards.addCards(cards); handleNavigate('setup', 'conjugator'); }}
            onCreateSet={(name, cards) => { flashcards.createSet(name, cards); handleNavigate('setup', 'conjugator'); }}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            onNavigateToSettings={() => handleNavigate("settings", "conjugator")}
          />
        );

      case "settings":
        return (
          <SettingsScreen 
            onBack={handleBack}
            onSyncPush={() => pushCloudData(false)}
            onSyncPull={() => {
                if (window.confirm("Attention : Cette action va remplacer toutes vos données locales (cartes, progrès, historique) par la version du Cloud. Souhaitez-vous continuer ?")) {
                    console.log("[Sync] Manual Pull Triggered");
                    loadCloudData(false, true);
                }
            }}
            onReloadApp={reloadApp}
            onShowAuth={() => setIsAuthModalOpen(true)}
            user={user}
          />
        );

      case "ai-generator":
        return (
          <AIGeneratorModal
            isOpen={true}
            onClose={handleBack}
            onCardsGenerated={(cards) => { coordinator.handleAICardsGenerated(cards); handleNavigate('setup', 'ai-generator'); }}
            onCreateSet={(name, cards) => { flashcards.createSet(name, cards); handleNavigate('setup', 'ai-generator'); }}
            onAddCards={(cards) => { flashcards.addCards(cards); handleNavigate('setup', 'ai-generator'); }}
            onLessonGenerated={coordinator.handleLessonGenerated}
            onCurriculumGenerated={coordinator.handleCurriculumGenerated}

            availableLanguages={availableLanguages}
            initialTopic={aiModalInitialTopic}
            initialMode={aiModalInitialMode}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            onShowSavedLessons={() => handleNavigate("saved-lessons", "ai-generator")}
            onNavigateToSettings={() => handleNavigate("settings", "ai-generator")}
            guestTutors={coordinator.guestTutors}
          />
        );

      case "tutor-selection":
        return (
          <TutorSelectionModal
            isOpen={true}
            onClose={handleBack}
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
                handleNavigate("setup", "chat");
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
                onNavigateToSettings={() => handleNavigate("settings", "language-lab")}
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
            onStartQuiz={() => handleNavigate("setup", "library")}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            customCollections={coordinator.librarySuggestions}
            setCustomCollections={coordinator.setLibrarySuggestions}
            onNavigateToSettings={() => handleNavigate("settings", "library")}
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
            onNavigateToSettings={() => handleNavigate("settings", "video-lab")}
          />
        );

      case "curriculum":
        return (
          <CurriculumScreen
            onBack={handleBack}
            programs={coordinator.studyPrograms}
            lessons={coordinator.savedLessons}
            onGenerateContent={coordinator.handleGenerateModuleContent}
            onStartModule={coordinator.handleStartModule}
            onStartQuiz={coordinator.handleStartModuleQuiz}
            onDeleteProgram={coordinator.handleDeleteProgram}
            onRenameProgram={coordinator.handleRenameProgram}
            onSelectLesson={coordinator.handleSelectLesson}
            onDeleteLesson={coordinator.handleDeleteLesson}
            onRenameLesson={coordinator.handleRenameLesson}
            onSuggestedProgram={coordinator.handleSuggestedProgram}
            onDrawingChallenge={() => setScreen("drawing-challenge")}
            onNewProgram={() => setScreen("tutors-room")}
            onNavigateToSettings={() => handleNavigate("settings", "curriculum")}
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
              }, `Quiz : ${currentLesson.topic}`)}
              onGenerateExercises={coordinator.handleInteractiveExercises}
              onGenerateQuiz={coordinator.handleGenerateQuizFromLesson}
              onNavigateToSettings={() => handleNavigate("settings", "lesson")}
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
            onShowReview={() => handleNavigate("reviewAll", "setup")}
            onShowEdit={() => setIsEditModalOpen(true)}
            onShowDashboard={() => handleNavigate("dashboard", "setup")}
            onShowSettings={() => handleNavigate("settings", "setup")}
            onManageSets={() => setIsSetsManagerOpen(true)}
            voiceEngine={voiceEngine}
            setVoiceEngine={setVoiceEngine}
            autoPlayAudio={autoPlayAudio}
            setAutoPlayAudio={setAutoPlayAudio}
            streak={gamification.gamificationData.streak.currentStreak}
            onBack={handleBack}
            setCurrentSetName={flashcards.setCurrentSetName}
            flashcardSets={flashcards.flashcardSets}
            themeMode={theme.themeMode}
            themeStyle={theme.themeStyle}
            cloudStatus={cloudStatus}
          />
        );
    }
  };

  return (
    <div 
      className={`h-full w-full overflow-hidden flex flex-col font-sans transition-colors duration-500 ${theme.themeStyle === 'apple' ? 'bg-[#E8E8ED] dark:bg-black' : 'bg-gray-100 dark:bg-gray-900'}`}
      style={{ height: '100dvh' }}
    >
        <main className={`mx-auto transition-all duration-500 relative flex flex-col overflow-hidden ${
          theme.themeStyle === 'apple' 
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl border-none md:border border-white/10' 
            : 'bg-white dark:bg-gray-800 border-none md:border border-border'
        } ${
          ['home', 'drawing-tutorial', 'srs-preview', 'tutors-room', 'ai-generator', 'conjugator', 'curriculum', 'setup', 'chat', 'tutor-selection', 'language-lab', 'knowledge-map', 'video-lab', 'dashboard', 'library', 'reviewAll', 'completion', 'lesson', 'exercises', 'drawing-challenge', 'music-challenge', 'chess-challenge', 'progress', 'revision', 'settings', 'saved-lessons', 'quiz'].includes(screen)
            ? 'w-full max-w-6xl flex-1 min-h-0 p-0 md:rounded-3xl md:my-2 shadow-2xl' 
            : 'w-[95%] max-w-4xl flex-initial p-6 rounded-3xl shadow-2xl my-auto'
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
          onResetData={() => {
              coordinator.resetAllData();
              userHasModified.current = false;
              setCanAutoPush(false);
          }}
          user={user}
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
