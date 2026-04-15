import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlashcards } from '../hooks/useFlashcards';
import { useStudyContentStore } from '../stores/useStudyContentStore';

const LibraryScreen = lazy(() =>
    import('../components/LibraryScreen').then(m => ({ default: m.LibraryScreen }))
);

/**
 * LibraryRoute — Charge LibraryScreen sans useAppCoordinator.
 *
 * useAppCoordinator (826 lignes) déclenche useAnalytics sur tout l'historique
 * des quiz, ce qui peut bloquer le thread JS quelques secondes et provoquer
 * le "Page ne répondant pas" sur les grandes bases de données.
 *
 * LibrarySuggestions est lu directement depuis le store Zustand.
 */
export default function LibraryRoute() {
    const navigate = useNavigate();
    const flashcards = useFlashcards();

    // Accès direct au store — évite d'instancier le coordinateur complet
    const librarySuggestions    = useStudyContentStore(s => s.librarySuggestions);
    const setLibrarySuggestions = useStudyContentStore(s => s.setLibrarySuggestions);

    return (
        <Suspense fallback={null}>
            <LibraryScreen
                onBack={() => navigate(-1)}
                onImport={flashcards.createSet}
                onAddCardsToSet={flashcards.addCards}
                userSets={flashcards.flashcardSets}
                onDeleteSet={flashcards.deleteSet}
                onRenameSet={flashcards.renameSet}
                currentSetName={flashcards.currentSetName}
                onSelectSet={flashcards.setCurrentSetName}
                onStartQuiz={() => navigate('/setup')}
                customCollections={librarySuggestions}
                setCustomCollections={setLibrarySuggestions}
                onNavigateToSettings={() => navigate('/settings')}
            />
        </Suspense>
    );
}
