/**
 * useUpdater.ts — Gestion des mises à jour Studeo.
 *
 * Stratégie duale :
 * - Environnement Tauri (desktop) → Updater natif Tauri v1 (checkUpdate / installUpdate)
 *   avec vérification cryptographique de signature ed25519.
 * - Environnement Web/PWA → fetch du version.json sur GitHub (fallback propre).
 *
 * Remplace la logique manuelle de checkForUpdates dans useAppCoordinator.
 *
 * Utilisation :
 *   const { updateStatus, latestVersion, isCheckingUpdate, checkForUpdates, installAndRelaunch } = useUpdater();
 */

import { useState, useCallback, useEffect } from 'react';
import { UpdateStatus } from '../types';

// ── Détection de l'environnement Tauri ────────────────────────────────────────
const isTauri = (): boolean =>
    typeof window !== 'undefined' && !!(window as any).__TAURI_IPC__;

// ── URL du manifest de la dernière version ────────────────────────────────────
const LATEST_JSON_URL = 'https://raw.githubusercontent.com/Danou75/Studeo-app/main/releases/latest.json';
const VERSION_JSON_URL = 'https://raw.githubusercontent.com/Danou75/Studeo-app/main/public/version.json';

// ── Récupération de la version courante injectée par Vite ─────────────────────
const getCurrentVersion = (): string => {
    // @ts-ignore — __APP_VERSION__ est défini dans vite.config.ts via define
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.3.0';
};

// ── Comparaison sémantique (x.y.z) ────────────────────────────────────────────
const isNewerVersion = (remote: string, local: string): boolean => {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if ((r[i] || 0) > (l[i] || 0)) return true;
        if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
};

// ─────────────────────────────────────────────────────────────────────────────
export interface UpdaterResult {
    updateStatus:       UpdateStatus;
    latestVersion:      string | null;
    isCheckingUpdate:   boolean;
    updateNotes:        string | null;
    /** Lance la vérification. silent=true → pas de toast, erreurs silencieuses. */
    checkForUpdates:    (silent?: boolean) => Promise<void>;
    /** Télécharge et installe la mise à jour puis relance l'app (Tauri only). */
    installAndRelaunch: () => Promise<void>;
}

export const useUpdater = (
    onToast: (msg: string, type: 'success' | 'error' | 'info', duration?: number) => void
): UpdaterResult => {
    const [updateStatus,     setUpdateStatus]     = useState<UpdateStatus>(null);
    const [latestVersion,    setLatestVersion]    = useState<string | null>(null);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [updateNotes,      setUpdateNotes]      = useState<string | null>(null);

    // ── Stratégie Tauri natif ─────────────────────────────────────────────────
    const checkWithTauriUpdater = useCallback(async (silent: boolean): Promise<boolean> => {
        try {
            const currentVersion = getCurrentVersion();
            // Tauri v1: checkUpdate() returns { shouldUpdate, manifest }
            const { checkUpdate } = await import('@tauri-apps/api/updater');
            const { shouldUpdate, manifest } = await checkUpdate();

            if (shouldUpdate && manifest) {
                setUpdateStatus('available');
                setLatestVersion(manifest.version ?? null);
                setUpdateNotes(manifest.body ?? null);
                if (!silent) {
                    onToast(
                        `🚀 Studeo v${manifest.version} est disponible ! Rendez-vous dans Paramètres pour mettre à jour.`,
                        'info', 10000
                    );
                }
            } else {
                setUpdateStatus('up-to-date');
                setLatestVersion(currentVersion);
                if (!silent) onToast('Votre application est à jour ! 🎉', 'success');
            }
            return true;
        } catch (err) {
            console.warn('[Updater] Tauri updater failed, falling back to version.json:', err);
            return false;
        }
    }, [onToast]);

    // ── Stratégie Web/PWA fallback ────────────────────────────────────────────
    const checkWithVersionJson = useCallback(async (silent: boolean): Promise<void> => {
        const currentVersion = getCurrentVersion();

        // Essai 1 : /version.json local (même origine → pas de CORS)
        if (!isTauri()) {
            try {
                const localRes = await fetch(`/version.json?t=${Date.now()}`);
                if (localRes.ok) {
                    const { version } = await localRes.json();
                    if (version) {
                        setLatestVersion(version);
                        if (isNewerVersion(version, currentVersion)) {
                            setLatestVersion(version);
                            setUpdateStatus('available');
                            if (!silent) onToast(`🚀 Studeo v${version} est disponible !`, 'info', 8000);
                        } else {
                            setLatestVersion(currentVersion);
                            setUpdateStatus('up-to-date');
                            if (!silent) onToast('Application à jour ! 🎉', 'success');
                        }
                        return;
                    }
                }
            } catch {}
        }

        // Essai 2 : GitHub Raw (latest.json format Tauri, puis version.json de fallback)
        for (const url of [LATEST_JSON_URL, VERSION_JSON_URL]) {
            try {
                const res = await fetch(`${url}?t=${Date.now()}`);
                if (!res.ok) continue;
                const data = await res.json();
                const version = data.version ?? data.tag_name?.replace('v', '');
                if (!version) continue;

                setLatestVersion(version);
                setUpdateNotes(data.notes ?? null);

                if (isNewerVersion(version, currentVersion)) {
                    setLatestVersion(version);
                    setUpdateStatus('available');
                    if (!silent) onToast(`🚀 Studeo v${version} est disponible !`, 'info', 8000);
                } else {
                    setLatestVersion(currentVersion);
                    setUpdateStatus('up-to-date');
                    if (!silent) onToast('Application à jour ! 🎉', 'success');
                }
                return;
            } catch {}
        }

        // Tous les endpoints ont échoué
        setUpdateStatus('error');
        if (!silent) onToast('Impossible de vérifier les mises à jour.', 'error');
    }, [onToast]);

    // ── Entrée principale ─────────────────────────────────────────────────────
    const checkForUpdates = useCallback(async (silent = true): Promise<void> => {
        setIsCheckingUpdate(true);
        try {
            if (isTauri()) {
                const handled = await checkWithTauriUpdater(silent);
                if (!handled) await checkWithVersionJson(silent);
            } else {
                await checkWithVersionJson(silent);
            }
        } finally {
            setIsCheckingUpdate(false);
        }
    }, [checkWithTauriUpdater, checkWithVersionJson]);

    // ── Installation et relance (Tauri uniquement) ────────────────────────────
    const installAndRelaunch = useCallback(async (): Promise<void> => {
        if (!isTauri()) {
            onToast('La mise à jour automatique n\'est disponible que dans l\'app desktop.', 'info');
            return;
        }
        try {
            onToast('⏳ Téléchargement de la mise à jour...', 'info', 30000);
            // Tauri v1 : installUpdate dans updater, relaunch dans process
            const { installUpdate } = await import('@tauri-apps/api/updater');
            const { relaunch }      = await import('@tauri-apps/api/process');
            await installUpdate();
            await relaunch();
        } catch (err) {
            console.error('[Updater] Install failed:', err);
            onToast('Erreur lors de l\'installation. Réessayez depuis les Paramètres.', 'error');
        }
    }, [onToast]);

    // ── Vérification automatique au démarrage (différée) ─────────────────────
    useEffect(() => {
        const timer = setTimeout(() => checkForUpdates(true), 6000);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        updateStatus,
        latestVersion,
        isCheckingUpdate,
        updateNotes,
        checkForUpdates,
        installAndRelaunch,
    };
};
