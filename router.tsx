/**
 * router.tsx — Déclaration centralisée de toutes les routes Studeo.
 * Utilise createHashRouter (compatible Tauri file:// + PWA offline).
 *
 * Structure :
 *   - AppLayout : Layout racine (providers visuels, modals globaux, gestion thème)
 *   - Routes imbriquées : chaque écran est un composant Route autonome
 */

import React, { lazy, Suspense } from 'react';
import {
    createHashRouter,
    RouterProvider,
    Outlet,
    Navigate,
    useLocation,
} from 'react-router-dom';

// ─── Lazy loaded routes ────────────────────────────────────────────────────────
const HomeRoute             = lazy(() => import('./routes/HomeRoute'));
const SetupRoute            = lazy(() => import('./routes/SetupRoute'));
const QuizRoute             = lazy(() => import('./routes/QuizRoute'));
const CompletionRoute       = lazy(() => import('./routes/CompletionRoute'));
const ReviewAllRoute        = lazy(() => import('./routes/ReviewAllRoute'));
const RevisionRoute         = lazy(() => import('./routes/RevisionRoute'));
const DashboardRoute        = lazy(() => import('./routes/DashboardRoute'));
const SRSPreviewRoute       = lazy(() => import('./routes/SRSPreviewRoute'));
const ConjugatorRoute       = lazy(() => import('./routes/ConjugatorRoute'));
const SettingsRoute         = lazy(() => import('./routes/SettingsRoute'));
const LessonRoute           = lazy(() => import('./routes/LessonRoute'));
const ExercisesRoute        = lazy(() => import('./routes/ExercisesRoute'));
const AIGeneratorRoute      = lazy(() => import('./routes/AIGeneratorRoute'));
const TutorsRoomRoute       = lazy(() => import('./routes/TutorsRoomRoute'));
const TutorSelectionRoute   = lazy(() => import('./routes/TutorSelectionRoute'));
const CurriculumRoute       = lazy(() => import('./routes/CurriculumRoute'));
const SavedLessonsRoute     = lazy(() => import('./routes/SavedLessonsRoute'));
const DrawingChallengeRoute = lazy(() => import('./routes/DrawingChallengeRoute'));
const DrawingTutorialRoute  = lazy(() => import('./routes/DrawingTutorialRoute'));
const MusicChallengeRoute   = lazy(() => import('./routes/MusicChallengeRoute'));
const ChessChallengeRoute   = lazy(() => import('./routes/ChessChallengeRoute'));
const CodingChallengeRoute  = lazy(() => import('./routes/CodingChallengeRoute'));
const KnowledgeMapRoute     = lazy(() => import('./routes/KnowledgeMapRoute'));
const LibraryRoute          = lazy(() => import('./routes/LibraryRoute'));
const VideoLabRoute         = lazy(() => import('./routes/VideoLabRoute'));
const ProgressRoute         = lazy(() => import('./routes/ProgressRoute'));
const ChatRoute             = lazy(() => import('./routes/ChatRoute'));
const LanguageLabRoute      = lazy(() => import('./routes/LanguageLabRoute'));

// ─── Layout racine ────────────────────────────────────────────────────────────
// Importé depuis AppLayout pour rester propre
import { AppLayout } from './components/AppLayout';
import { RouteErrorElement } from './components/RouteErrorBoundary';

// ─── Fallback de chargement ────────────────────────────────────────────────────
const RouteLoader = () => (
    <div className="flex items-center justify-center h-full">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-text-secondary">Chargement...</p>
        </div>
    </div>
);

/**
 * PageWrapper — Force le démontage/remontage complet de la page à chaque changement d'URL.
 * C'est la protection ultime contre les erreurs NotFoundError de React causées par
 * les extensions de traduction qui manipulent le DOM de façon asynchrone.
 */
const PageWrapper = () => {
    const location = useLocation();
    return (
        <div key={location.pathname} className="contents" translate="no">
            <Outlet />
        </div>
    );
};

// ─── Arbre des routes ─────────────────────────────────────────────────────────
const router = createHashRouter([
    {
        path: '/',
        errorElement: <RouteErrorElement />,
        element: (
            <AppLayout>
                <Suspense fallback={<RouteLoader />}>
                    <PageWrapper />
                </Suspense>
            </AppLayout>
        ),
        children: [
            { index: true,                  element: <HomeRoute /> },
            { path: 'setup',                element: <SetupRoute /> },
            { path: 'quiz',                 element: <QuizRoute /> },
            { path: 'completion',           element: <CompletionRoute /> },
            { path: 'review',               element: <ReviewAllRoute /> },
            { path: 'revision',             element: <RevisionRoute /> },
            { path: 'dashboard',            element: <DashboardRoute /> },
            { path: 'srs',                  element: <SRSPreviewRoute /> },
            { path: 'conjugator',           element: <ConjugatorRoute /> },
            { path: 'settings',             element: <SettingsRoute /> },
            { path: 'lesson',               element: <LessonRoute /> },
            { path: 'exercises',            element: <ExercisesRoute /> },
            { path: 'ai-generator',         element: <AIGeneratorRoute /> },
            { path: 'tutors',               element: <TutorsRoomRoute /> },
            { path: 'tutor-selection',      element: <TutorSelectionRoute /> },
            { path: 'curriculum',           element: <CurriculumRoute /> },
            { path: 'saved-lessons',        element: <SavedLessonsRoute /> },
            { path: 'drawing-challenge',    element: <DrawingChallengeRoute /> },
            { path: 'drawing-tutorial',     element: <DrawingTutorialRoute /> },
            { path: 'music-challenge',      element: <MusicChallengeRoute /> },
            { path: 'chess-challenge',      element: <ChessChallengeRoute /> },
            { path: 'coding-challenge',     element: <CodingChallengeRoute /> },
            { path: 'knowledge-map',        element: <KnowledgeMapRoute /> },
            { path: 'library',              element: <LibraryRoute /> },
            { path: 'video-lab',            element: <VideoLabRoute /> },
            { path: 'progress',             element: <ProgressRoute /> },
            { path: 'chat',                 element: <ChatRoute /> },
            { path: 'language-lab',         element: <LanguageLabRoute /> },
            // Catch-all → home
            { path: '*',                    element: <Navigate to="/" replace /> },
        ],
    },
]);

// ─── Export ───────────────────────────────────────────────────────────────────
export { router };

export const AppRouter: React.FC = () => <RouterProvider router={router} />;
