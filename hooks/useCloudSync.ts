/**
 * useCloudSync.ts — Coordinateur de la synchronisation cloud.
 * 
 * Compose les hooks spécialisés pour gérer :
 *  - L'état et les verrous (useCloudState)
 *  - L'envoi des données (useCloudPush)
 *  - La récupération des données (useCloudPull)
 * 
 * Avant refactoring : ~400 lignes monolithiques.
 * Après refactoring  : ~130 lignes d'orchestration.
 */
import { useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { useQuizStore } from '../stores/useQuizStore';

import { useCloudState } from './cloud-sync/useCloudState';
import { useCloudPush }  from './cloud-sync/useCloudPush';
import { useCloudPull }  from './cloud-sync/useCloudPull';

export function useCloudSync(
    user: User | null,
    coordinator: any,
    flashcards: any,
    gamification: any,
    theme: any,
    analyticsData: any,
    langCache: any,
    config: any,
    screen: string
) {
    const { history, persistentErrors, setHistory, setPersistentErrors } = useQuizStore();
    
    // 1. Gestion des états et verrous
    const state = useCloudState();

    // 2. Logique d'envoi (Push)
    const { pushCloudData } = useCloudPush({
        user, coordinator, flashcards, gamification, theme, analyticsData, langCache,
        history, persistentErrors,
        isInitialSyncProgress: state.isInitialSyncProgress,
        setCloudStatus: state.setCloudStatus,
        setCanAutoPush: state.setCanAutoPush
    });

    // 3. Logique de récupération (Pull)
    const { loadCloudData } = useCloudPull({
        user, coordinator, flashcards, gamification, theme, langCache,
        setHistory, setPersistentErrors,
        isInitialSyncProgress: state.isInitialSyncProgress,
        setCloudStatus: state.setCloudStatus,
        setCanAutoPush: state.setCanAutoPush,
        userHasModified: state.userHasModified
    });

    // ── Exposition des méthodes globales via window (pour compatibilité) ─────
    useEffect(() => {
        (window as any).__studeo_cloudStatus = state.cloudStatus;
        (window as any).__studeo_pushCloud   = () => pushCloudData(false);
        (window as any).__studeo_pullCloud   = (force?: boolean) => loadCloudData(false, force);
    }, [state.cloudStatus, pushCloudData, loadCloudData]);

    // ── Effet 1 : Détection des modifications locales ──
    useEffect(() => {
        if (!state.isInitialSyncProgress.current && (window as any)._initialPullDone) {
            console.log("[Sync] Modification locale détectée. Auto-push autorisé.");
            state.userHasModified.current = true;
        }
    }, [
        flashcards.flashcardSets, 
        coordinator.studyPrograms, 
        coordinator.savedLessons,
        theme.themeMode,
        theme.themeStyle,
        gamification.gamificationData,
        analyticsData,
        persistentErrors,
        coordinator.guestTutors,
        langCache.entries
    ]);

    // ── Effet 2 : Synchronisation automatique réactive (Debounced) ──
    useEffect(() => {
        if (!user || state.isInitialSyncProgress.current || !state.canAutoPush || !state.userHasModified.current) return;

        const timeoutId = setTimeout(() => {
             pushCloudData(true);
        }, 2000);
        
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
        persistentErrors,
        config, 
        coordinator.guestTutors,
        langCache.entries
    ]);

    // ── Effet 3 : Chargement initial à la connexion ──
    useEffect(() => {
        if (user) {
            const timer = setTimeout(() => {
               console.log(`[Sync] Utilisateur connecté: ${user.id}. Lancement du pull initial.`);
               loadCloudData(false, true); 
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [user?.id]);

    return {
        cloudStatus: state.cloudStatus,
        pushCloudData,
        loadCloudData,
        setCanAutoPush: state.setCanAutoPush,
        userHasModified: state.userHasModified
    };
}
