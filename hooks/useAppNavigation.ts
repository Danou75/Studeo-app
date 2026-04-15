/**
 * useAppNavigation — Wrapper React Router autour de la navigation Studeo.
 * Remplace useAppNavigationStore.navigate / goBack / screen / screenHistory.
 * Utilise HashRouter (compatible Tauri file:// et PWA offline).
 *
 * ⚠️ Expose aussi les APIs legacy (screen, setScreen, isEditModalOpen)
 *    utilisées par useAppCoordinator  pour une migration progressive.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAppNavigationStore } from '../stores/useAppNavigationStore';
import { Screen } from '../types';

// ─── Mapping Screen → Path URL ────────────────────────────────────────────────
export const SCREEN_TO_PATH: Record<Screen, string> = {
    'home':               '/',
    'setup':              '/setup',
    'quiz':               '/quiz',
    'completion':         '/completion',
    'reviewAll':          '/review',
    'revision':           '/revision',
    'dashboard':          '/dashboard',
    'srs-preview':        '/srs',
    'srs-review':         '/srs-review',
    'conjugator':         '/conjugator',
    'settings':           '/settings',
    'lesson':             '/lesson',
    'exercises':          '/exercises',
    'ai-generator':       '/ai-generator',
    'tutors-room':        '/tutors',
    'tutor-selection':    '/tutor-selection',
    'curriculum':         '/curriculum',
    'saved-lessons':      '/saved-lessons',
    'drawing-challenge':  '/drawing-challenge',
    'drawing-tutorial':   '/drawing-tutorial',
    'music-challenge':    '/music-challenge',
    'chess-challenge':    '/chess-challenge',
    'coding-challenge':   '/coding-challenge',
    'knowledge-map':      '/knowledge-map',
    'library':            '/library',
    'video-lab':          '/video-lab',
    'progress':           '/progress',
    'chat':               '/chat',
    'language-lab':       '/language-lab',
    // Legacy / obsoletes (redirection vers home)
    'result':             '/',
    'history':            '/',
    'config':             '/settings',
    'statistics':         '/dashboard',
    'achievements':       '/dashboard',
};

// ─── Mapping inverse Path → Screen ────────────────────────────────────────────
export const PATH_TO_SCREEN: Record<string, Screen> = {};
const _seen = new Set<string>();
for (const [screen, path] of Object.entries(SCREEN_TO_PATH)) {
    if (!_seen.has(path)) {
        _seen.add(path);
        PATH_TO_SCREEN[path] = screen as Screen;
    }
}

// ─── Hook principal ────────────────────────────────────────────────────────────
export const useAppNavigation = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const navStore = useAppNavigationStore();

    /** Naviguer vers un screen */
    const goTo = (screen: Screen, state?: Record<string, unknown>) => {
        const path = SCREEN_TO_PATH[screen] ?? '/';
        navigate(path, { state });
    };

    /**
     * setScreen — API legacy utilisée par useAppCoordinator.
     * Equivalent à goTo() mais sans state.
     */
    const setScreen = (screen: Screen) => goTo(screen);

    /**
     * navigate(target, from) — API legacy, ignorait `from` (géré
     * automatiquement par l'historique du navigateur).
     */
    const navigateTo = (target: Screen, _from?: Screen) => goTo(target);

    /** Retour arrière natif du navigateur */
    const goBack = () => navigate(-1);

    /** Screen courant déduit du pathname */
    const screen = (PATH_TO_SCREEN[location.pathname] ?? 'home') as Screen;

    /** État transitoire passé via navigate(path, { state }) */
    const routeState = location.state as Record<string, unknown> | null;

    return {
        // API React Router
        goTo,
        goBack,
        screen,
        routeState,
        pathname: location.pathname,

        // API legacy (utilisée par useAppCoordinator et composants existants)
        setScreen,
        navigate: navigateTo,
        screenHistory: [] as Screen[],           // toujours vide — géré par router
        setScreenHistory: (_: unknown) => {},    // no-op

        // Modal state (délégué au store Zustand minimal)
        isEditModalOpen: navStore.isEditModalOpen,
        setIsEditModalOpen: navStore.setIsEditModalOpen,
    };
};
