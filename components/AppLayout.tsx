/**
 * AppLayout.tsx — Layout racine de l'application.
 *
 * Contient :
 *   - Hooks globaux (cloud sync, theme shortcuts, migration)
 *   - Modals globales (EditCards, Sets, Help, Auth, PWA)
 *   - Wrapper visuel responsive (conteneur main + thème)
 *
 * Les routes enfants sont rendues via {children} (passé par Outlet dans router.tsx).
 */

import React from 'react';
import { useLocation } from 'react-router-dom';

import { EditCardsModal }       from './EditCardsModal';
import { SetsManagementModal }  from './SetsManagementModal';
import { HelpModal }            from './HelpModal';
import { AuthModal }            from './AuthModal';
import { PWAInstallPrompt }     from './PWAInstallPrompt';
import { ThemeProvider }        from '../contexts/ThemeContext';

import { useAuth }              from '../contexts/AuthContext';
import { useAppCoordinator }    from '../hooks/useAppCoordinator';
import { useCloudSync }         from '../hooks/useCloudSync';
import { useConjugationCache }  from '../hooks/useConjugationCache';
import { migrateLocalStorage }  from '../utils/migration';

import { useFlashcards }         from '../hooks/useFlashcards';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useThemeStore }        from '../stores/useThemeStore';
import { useUIStore }           from '../stores/useUIStore';
import { useAppNavigationStore } from '../stores/useAppNavigationStore';

import { THEME_STYLES, ThemeStyle } from '../constants/themes';
import { PATH_TO_SCREEN }       from '../hooks/useAppNavigation';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
    const location   = useLocation();
    const { user }   = useAuth();
    const coordinator = useAppCoordinator();

    const { isEditModalOpen, setIsEditModalOpen } = useAppNavigationStore();

    const flashcards    = useFlashcards();
    const gamification  = useGamificationStore();
    const themeStore    = useThemeStore();
    const ui            = useUIStore();
    const langCache     = useConjugationCache();

    const [isSetsManagerOpen, setIsSetsManagerOpen] = React.useState(false);
    const [isHelpModalOpen,   setIsHelpModalOpen]   = React.useState(false);
    const [isAuthModalOpen,   setIsAuthModalOpen]   = React.useState(false);

    // ── Migration localStorage (une fois au démarrage) ──────────────────────
    React.useEffect(() => {
        migrateLocalStorage();
    }, []);

    // ── Exposition des handlers globaux via coordinator ──────────────────────
    // Le coordinator a besoin de ces setters pour ouvrir les modals globaux.
    React.useEffect(() => {
        (window as any).__studeo_openSetsManager  = () => setIsSetsManagerOpen(true);
        (window as any).__studeo_openHelp         = () => setIsHelpModalOpen(true);
        (window as any).__studeo_openAuth         = () => setIsAuthModalOpen(true);
    }, []);

    // ── Raccourcis clavier changement de thème ───────────────────────────────
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const currentIndex = THEME_STYLES.indexOf(themeStore.themeStyle as ThemeStyle);
                    const delta = e.key === 'ArrowRight' ? 1 : -1;
                    const nextIndex = (currentIndex + delta + THEME_STYLES.length) % THEME_STYLES.length;
                    themeStore.setThemeStyle(THEME_STYLES[nextIndex]);
                    coordinator.showToast(`Thème: ${THEME_STYLES[nextIndex]}`, 'info', 1000);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [themeStore.themeStyle, themeStore.setThemeStyle, coordinator.showToast]);

    // ── Cloud Sync ───────────────────────────────────────────────────────────
    const currentScreen = PATH_TO_SCREEN[location.pathname] ?? 'home';
    const { cloudStatus, pushCloudData, loadCloudData, setCanAutoPush, userHasModified } = useCloudSync(
        user, coordinator, flashcards, gamification, themeStore, ui, langCache, coordinator.config, currentScreen
    );

    // Exposer cloudStatus/push pour les routes qui en ont besoin
    React.useEffect(() => {
        (window as any).__studeo_cloudStatus  = cloudStatus;
        (window as any).__studeo_pushCloud    = () => pushCloudData(false);
        (window as any).__studeo_pullCloud    = (force?: boolean) => loadCloudData(false, force);
    }, [cloudStatus, pushCloudData, loadCloudData]);

    const reloadApp = () => {
        if (window.confirm("Voulez-vous recharger l'application pour appliquer les mises à jour ?")) {
            window.location.reload();
        }
    };
    (window as any).__studeo_reloadApp = reloadApp;

    // ── Styling dynamique du conteneur principal ─────────────────────────────
    const isFullScreen = !['/'].includes(location.pathname) ||
        ['/setup', '/quiz', '/completion', '/review', '/revision', '/dashboard',
         '/srs', '/conjugator', '/curriculum', '/ai-generator', '/chat', '/tutor-selection',
         '/language-lab', '/knowledge-map', '/video-lab', '/dashboard', '/library',
         '/review', '/completion', '/lesson', '/exercises', '/drawing-challenge',
         '/music-challenge', '/chess-challenge', '/progress', '/revision', '/settings',
         '/saved-lessons', '/quiz', '/tutors'].some(p => location.pathname.startsWith(p));

    return (
        <ThemeProvider>
            <div
                translate="no"
                className="h-full w-full overflow-hidden flex flex-col font-sans transition-colors duration-500 text-text"
                style={{
                    height: '100dvh',
                    background: `linear-gradient(135deg, var(--color-background) 0%, var(--color-background-secondary) 100%)`
                }}
            >
                <main className={`mx-auto transition-all duration-500 relative flex flex-col overflow-hidden ${
                    themeStore.themeStyle === 'apple'
                        ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-3xl border-none md:border border-white/10'
                        : 'bg-transparent border-none md:border border-border backdrop-blur-sm'
                } ${
                    isFullScreen
                        ? 'w-full max-w-6xl flex-1 min-h-0 p-0 md:rounded-3xl md:my-2 shadow-2xl'
                        : 'w-[95%] max-w-4xl flex-initial p-6 rounded-3xl shadow-2xl my-auto'
                }`}>
                    {children}
                </main>

                {/* ── Modals globales ── */}
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
                    onForceRefresh={() => loadCloudData(false)}
                    onResetData={() => {
                        coordinator.resetAllData();
                        userHasModified.current = false;
                        setCanAutoPush(false);
                    }}
                    user={user}
                />
                <PWAInstallPrompt />
            </div>
        </ThemeProvider>
    );
};
