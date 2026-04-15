import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlashcards } from '../hooks/useFlashcards';
import { useAppCoordinator } from '../hooks/useAppCoordinator';
import { useUIStore } from '../stores/useUIStore';

const VideoLabScreen = lazy(() =>
    import('../components/VideoLabScreen').then(m => ({ default: m.VideoLabScreen }))
);

export default function VideoLabRoute() {
    const navigate    = useNavigate();
    const flashcards  = useFlashcards();
    const coordinator = useAppCoordinator();
    const {
        videoLabURL,      setVideoLabURL,
        videoLabAnalysis, setVideoLabAnalysis,
    } = useUIStore();

    return (
        <Suspense fallback={null}>
            <VideoLabScreen
                onBack={() => navigate(-1)}
                onAddCards={(cards) => {
                    flashcards.addCards(cards);
                    coordinator.showToast('Fiches ajoutées avec succès !', 'success');
                }}
                onCreateSet={(name, cards) => {
                    flashcards.createSet(name, cards);
                    coordinator.showToast(`Dossier "${name}" créé !`, 'success');
                }}
                onLessonGenerated={coordinator.handleLessonGenerated}
                onShowSavedLessons={() => navigate('/saved-lessons')}
                initialURL={videoLabURL}
                onURLChange={setVideoLabURL}
                initialAnalysis={videoLabAnalysis}
                onAnalysisChange={setVideoLabAnalysis}
                onNavigateToSettings={() => navigate('/settings')}
            />
        </Suspense>
    );
}
