/**
 * useCloudPull.ts — Logique de récupération et hydratation depuis le cloud.
 * 
 * Responsabilité :
 *  - Récupérer le profil et les données (flashcards, programmes, etc.)
 *  - Fusionner les données cloud avec les données locales
 *  - Gérer le mode "Force" (écrasement local)
 */
import { User } from '@supabase/supabase-js';
import { syncService } from '../../services/syncService';
import { ChatService } from '../../services/chatService';
import { INITIAL_GAMIFICATION_DATA } from '../../utils/achievements';
import { DEFAULT_FLASHCARDS, DEFAULT_FLASHCARD_SET_NAME } from '../../constants';

export interface UseCloudPullParams {
    user: User | null;
    coordinator: any;
    flashcards: any;
    gamification: any;
    theme: any;
    langCache: any;
    setHistory: (h: any[]) => void;
    setPersistentErrors: (pe: Record<string, any>) => void;
    // State indicators
    isInitialSyncProgress: React.MutableRefObject<boolean>;
    setCloudStatus: (s: 'idle' | 'syncing' | 'synced' | 'error') => void;
    setCanAutoPush: (b: boolean) => void;
    userHasModified: React.MutableRefObject<boolean>;
}

export function useCloudPull(p: UseCloudPullParams) {
    const loadCloudData = async (silent = false, force = false) => {
        if (!p.user || p.isInitialSyncProgress.current) return;
        p.isInitialSyncProgress.current = true;
        p.setCloudStatus('syncing');
        
        try {
            const cloudProfile = await syncService.getProfile(p.user.id);
            console.log(`[Sync] Pulled profile for ${p.user.email}. Last update: ${cloudProfile?.updated_at}`);
            
            if (cloudProfile) {
                if (cloudProfile.theme_mode) p.theme.setThemeMode(cloudProfile.theme_mode as any);
                if (cloudProfile.theme_style) p.theme.setThemeStyle(cloudProfile.theme_style as any);
                if (cloudProfile.curriculum_suggestions) p.coordinator.setCurriculumSuggestions(cloudProfile.curriculum_suggestions);
                if (cloudProfile.library_suggestions) p.coordinator.setLibrarySuggestions(cloudProfile.library_suggestions);
                
                if (cloudProfile.gamification_data) {
                    p.gamification.setGamificationData(cloudProfile.gamification_data);
                }
                
                if (cloudProfile.quiz_history && Array.isArray(cloudProfile.quiz_history)) {
                    p.setHistory(cloudProfile.quiz_history);
                }
                if (cloudProfile.persistent_errors) {
                    p.setPersistentErrors(cloudProfile.persistent_errors);
                }
                if (cloudProfile.guest_tutors && Array.isArray(cloudProfile.guest_tutors)) {
                    p.coordinator.setGuestTutors(cloudProfile.guest_tutors);
                }
                if (cloudProfile.known_devices) {
                    localStorage.setItem('studeo_known_devices', JSON.stringify(cloudProfile.known_devices));
                }

                // Lang Cache Merge
                const cloudCacheFromGamif = cloudProfile.gamification_data?.conjugation_cache;
                if (cloudCacheFromGamif && Array.isArray(cloudCacheFromGamif)) {
                    const localEntries = [...p.langCache.entries];
                    const localKeys = new Set(localEntries.map(e => e.key));
                    let hasChanges = false;
                    
                    cloudCacheFromGamif.forEach((ce: any) => {
                        if (!localKeys.has(ce.key)) {
                            localEntries.push(ce);
                            hasChanges = true;
                        } else {
                            const idx = localEntries.findIndex(le => le.key === ce.key);
                            if (idx !== -1 && new Date(ce.lastAccessedAt) > new Date(localEntries[idx].lastAccessedAt)) {
                                localEntries[idx] = ce;
                                hasChanges = true;
                            }
                        }
                    });
                    if (hasChanges || force) p.langCache.hydrate(localEntries);
                }

                if (cloudProfile.updated_at) {
                    const lastDate = new Date(cloudProfile.updated_at);
                    const device = cloudProfile.last_sync_device || "Inconnu";
                    (window as any)._lastSyncMsg = `(Dernière synchro : ${lastDate.toLocaleDateString()} ${lastDate.toLocaleTimeString()} depuis ${device})`;
                }
            } else if (force) {
                console.log("[Sync] Force Pull: resetting to defaults.");
                p.theme.setThemeMode('light');
                p.theme.setThemeStyle('default');
                p.coordinator.setCurriculumSuggestions([]);
                p.coordinator.setLibrarySuggestions([]);
                p.gamification.setGamificationData(INITIAL_GAMIFICATION_DATA);
                p.setHistory([]);
                p.setPersistentErrors({});
                p.coordinator.setGuestTutors([]);
            }

            // Flashcards Sync
            const cloudSetsRaw = await syncService.getFlashcards(p.user.id);
            if (cloudSetsRaw && Array.isArray(cloudSetsRaw) && cloudSetsRaw.length > 0) {
                p.flashcards.setFlashcardSets((prev: any) => {
                    if (force) {
                        const forcedMerged: Record<string, any[]> = {};
                        cloudSetsRaw.forEach((item: any) => { forcedMerged[item.name] = item.cards; });
                        return forcedMerged;
                    }
                    const merged = { ...prev };
                    cloudSetsRaw.forEach((item: any) => {
                        const setName = item.name;
                        const cloudCards = item.cards as any[];
                        if (!merged[setName]) {
                            merged[setName] = cloudCards;
                        } else {
                            const localCards = merged[setName];
                            const localMap = new Map(localCards.map((c: any) => [c.id, c]));
                            cloudCards.forEach(cc => {
                                const lc: any = localMap.get(cc.id);
                                if (!lc) localMap.set(cc.id, cc);
                                else {
                                    const cloudLast = cc.srsData?.lastReviewed ? new Date(cc.srsData.lastReviewed).getTime() : 0;
                                    const localLast = lc.srsData?.lastReviewed ? new Date(lc.srsData.lastReviewed).getTime() : 0;
                                    if (cloudLast >= localLast) localMap.set(cc.id, cc);
                                }
                            });
                            merged[setName] = Array.from(localMap.values());
                        }
                    });
                    return merged;
                });
            } else if (force) {
                p.flashcards.setFlashcardSets({ [DEFAULT_FLASHCARD_SET_NAME]: DEFAULT_FLASHCARDS });
                p.flashcards.setCurrentSetName(DEFAULT_FLASHCARD_SET_NAME);
            }

            // Study Programs Sync
            const cloudPrograms = await syncService.getStudyPrograms(p.user.id);
            if (cloudPrograms && cloudPrograms.length > 0) {
                if (p.coordinator.setStudyPrograms) {
                    p.coordinator.setStudyPrograms((prev: any) => {
                        if (force) return cloudPrograms;
                        const map = new Map(prev.map((pr: any) => [pr.id, pr]));
                        cloudPrograms.forEach(cp => {
                            const existing: any = map.get(cp.id);
                            if (!existing || cp.lastActiveAt > existing.lastActiveAt) map.set(cp.id, cp);
                        });
                        return Array.from(map.values());
                    });
                }
            }

            // Saved Lessons Sync
            const cloudLessons = await syncService.getSavedLessons(p.user.id);
            if (cloudLessons && cloudLessons.length > 0) {
                if (p.coordinator.setSavedLessons) {
                    p.coordinator.setSavedLessons((prev: any) => {
                        const map = new Map(prev.map((l: any) => [l.id, l]));
                        cloudLessons.forEach(cl => { if (!map.has(cl.id)) map.set(cl.id, cl); });
                        return Array.from(map.values()).sort((a: any, b: any) => 
                          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                        );
                    });
                }
            }
            
            // Chat Sessions Sync
            if (force) ChatService.clearAllSessions();
            const localSessions = ChatService.getSessions();
            const cloudChat = await syncService.getChatSessions(p.user.id);
            if (cloudChat) {
                const merged = force ? [] : [...localSessions];
                let hasChanges = false;
                cloudChat.forEach(cs => {
                    const existingIndex = merged.findIndex(m => m.id === cs.id);
                    if (existingIndex === -1) { merged.push(cs); hasChanges = true; }
                    else if (new Date(cs.updatedAt).getTime() > new Date(merged[existingIndex].updatedAt).getTime()) {
                        merged[existingIndex] = cs; hasChanges = true;
                    }
                });
                if (hasChanges || force) ChatService.saveSessions(merged);
                if (merged.length > 0 && hasChanges) await syncService.syncChatSessions(p.user.id, merged);
            }

            if (!silent) {
                const extraInfo = (window as any)._lastSyncMsg || "";
                p.coordinator.showToast(`✅ Synchronisation Cloud terminée ! ${extraInfo}`, "success", 10000);
                delete (window as any)._lastSyncMsg;
            }
            (window as any)._initialPullDone = true;
            p.setCloudStatus('synced');
            setTimeout(() => p.setCloudStatus('idle'), 5000);
            p.setCanAutoPush(true);
            p.userHasModified.current = false;
        } catch (e: any) {
            console.error("☁️ Cloud Pull Error:", e);
            p.setCloudStatus('error');
            if (!silent) p.coordinator.showToast("Erreur de récupération cloud", "error");
        } finally {
            setTimeout(() => { p.isInitialSyncProgress.current = false; }, 10000); 
        }
    };

    return { loadCloudData };
}
