/**
 * useCloudState.ts — Gestion de l'état de synchronisation cloud.
 * 
 * Inclus :
 *  - Statut de synchro (idle, syncing, synced, error)
 *  - Autorisation d'auto-push (avec délai au démarrage)
 *  - Indicateur de modification utilisateur
 */
import { useState, useRef, useEffect } from 'react';

export function useCloudState() {
    const isInitialSyncProgress = useRef(false);
    const [canAutoPush, setCanAutoPush] = useState(false);
    const [cloudStatus, setCloudStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
    const userHasModified = useRef(false);

    // Verrou au démarrage : On bloque l'auto-push pendant 60s sur mobile, 30s sur desktop
    useEffect(() => {
        const isMobile = /Android|iPhone/i.test(navigator.userAgent);
        const delay = isMobile ? 60000 : 30000;
        
        console.log(`[Sync] Décollage de l'app. Blocage de l'auto-push pendant ${delay/1000}s`);
        const timer = setTimeout(() => {
            // On débloque seulement si un pull initial a été fait ou tenté
            if ((window as any)._initialPullDone) {
                setCanAutoPush(true);
                console.log("[Sync] Auto-push déverrouillé");
            }
        }, delay); 
        return () => clearTimeout(timer);
    }, []);

    return {
        isInitialSyncProgress,
        canAutoPush,
        setCanAutoPush,
        cloudStatus,
        setCloudStatus,
        userHasModified
    };
}
