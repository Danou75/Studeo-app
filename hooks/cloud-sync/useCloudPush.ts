/**
 * useCloudPush.ts — Logique d'envoi des données vers le cloud.
 * 
 * Responsabilité :
 *  - Extraire les données de tous les stores (flashcards, quiz, profil, etc.)
 *  - Envoyer les données via syncService
 *  - Mettre à jour le statut Cloud
 */
import { User } from '@supabase/supabase-js';
import { syncService } from '../../services/syncService';
import { ChatService } from '../../services/chatService';
import { getDeviceName } from '../../utils/deviceInfo';

export interface UseCloudPushParams {
    user: User | null;
    coordinator: any;
    flashcards: any;
    gamification: any;
    theme: any;
    analyticsData: any;
    langCache: any;
    history: any[];
    persistentErrors: Record<string, any>;
    // State indicators
    isInitialSyncProgress: React.MutableRefObject<boolean>;
    setCloudStatus: (s: 'idle' | 'syncing' | 'synced' | 'error') => void;
    setCanAutoPush: (b: boolean) => void;
}

export function useCloudPush(p: UseCloudPushParams) {
    const pushCloudData = async (silent = false) => {
        if (!p.user) {
            if (!silent) p.coordinator.showToast("Vous devez être connecté pour synchroniser vos données sur le Cloud.", "warning");
            return false;
        }
        if (p.isInitialSyncProgress.current) return false;
        
        p.isInitialSyncProgress.current = true;
        p.setCloudStatus('syncing');
        const deviceName = getDeviceName();
        
        if (!silent) p.coordinator.showToast(`☁️ Sauvegarde en cours depuis "${deviceName}"...`, "info", 2000);
        console.log(`[Sync] Pushing data for user ${p.user.id} from device: ${deviceName}`);
        
        try {
            const currentSets = { ...p.flashcards.flashcardSets };
            const currentPrograms = [...p.coordinator.studyPrograms];
            const currentLessons = [...p.coordinator.savedLessons];
            const currentHistory = [...p.history];
            
            const knownDevicesRaw = localStorage.getItem('studeo_known_devices');
            const knownDevices = knownDevicesRaw ? JSON.parse(knownDevicesRaw) : [];
            if (deviceName && !knownDevices.includes(deviceName)) {
                knownDevices.push(deviceName);
                localStorage.setItem('studeo_known_devices', JSON.stringify(knownDevices));
            }

            const profileSync = await syncService.syncProfile(p.user.id, {
                theme_mode: p.theme.themeMode,
                theme_style: p.theme.themeStyle,
                gamification_data: {
                    ...p.gamification.gamificationData,
                    conjugation_cache: p.langCache.entries
                },
                analytics_data: p.analyticsData,
                curriculum_suggestions: p.coordinator.curriculumSuggestions,
                library_suggestions: p.coordinator.librarySuggestions,
                quiz_history: currentHistory,
                persistent_errors: p.persistentErrors,
                last_sync_device: deviceName,
                known_devices: knownDevices,
                guest_tutors: p.coordinator.guestTutors
            });
            if (!profileSync.success) throw new Error(`Profil: ${profileSync.error?.message || "Erreur inconnue"}`);

            const cardsSyncOk = await syncService.syncFlashcards(p.user.id, currentSets);
            if (!cardsSyncOk) throw new Error("Échec de la synchronisation des flashcards");

            const programsSyncOk = await syncService.syncStudyPrograms(p.user.id, currentPrograms);
            if (!programsSyncOk) throw new Error("Échec de la synchronisation des programmes");

            const lessonsSyncOk = await syncService.syncSavedLessons(p.user.id, currentLessons);
            if (!lessonsSyncOk) throw new Error("Échec de la synchronisation des cours");

            const chatSessions = ChatService.getSessions();
            if (chatSessions.length > 0) {
                await syncService.syncChatSessions(p.user.id, chatSessions);
            }
            
            console.log("☁️ Cloud Push: OK");
            p.setCanAutoPush(true);
            p.setCloudStatus('synced');
            setTimeout(() => p.setCloudStatus('idle'), 5000);
            
            if (!silent) p.coordinator.showToast(`✅ Sauvegardé avec succès ! (Appareil: ${deviceName})`, "success", 3000);
            return true;
        } catch (e: any) {
            console.error("☁️ Cloud Push Error:", e);
            p.setCloudStatus('error');
            if (!silent) {
                const msg = e.message || "Erreur de sauvegarde cloud";
                p.coordinator.showToast(`❌ ${msg}`, "error", 5000);
            }
            return false;
        } finally {
            setTimeout(() => {
                p.isInitialSyncProgress.current = false;
            }, 3000);
        }
    };

    return { pushCloudData };
}
