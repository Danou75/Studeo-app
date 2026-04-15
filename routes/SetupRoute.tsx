import { useNavigate } from 'react-router-dom';
import { SetupScreen } from '../components/SetupScreen';
import { useAppCoordinator } from '../hooks/useAppCoordinator';
import { useFlashcards } from '../hooks/useFlashcards';
import { useAppNavigationStore } from '../stores/useAppNavigationStore';

export default function SetupRoute() {
    const navigate    = useNavigate();
    const coordinator = useAppCoordinator();
    const flashcards  = useFlashcards();
    const { setIsEditModalOpen } = useAppNavigationStore();

    const cloudStatus = (window as any).__studeo_cloudStatus ?? 'idle';

    return (
        <SetupScreen
            onStartQuiz={coordinator.onStartQuiz}
            onShowSRSPreview={coordinator.onShowSRSPreview}
            onFileImport={flashcards.handleFileImport}
            onShowReview={() => navigate('/review')}
            onShowEdit={() => setIsEditModalOpen(true)}
            onShowDashboard={() => navigate('/dashboard')}
            onShowSettings={() => navigate('/settings')}
            onManageSets={() => (window as any).__studeo_openSetsManager?.()}
            onBack={() => navigate(-1)}
            cloudStatus={cloudStatus}
        />
    );
}
