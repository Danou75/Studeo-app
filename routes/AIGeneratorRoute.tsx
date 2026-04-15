
import { useNavigate } from 'react-router-dom';
import { AIGeneratorModal } from '../components/AIGeneratorModal';
import { useFlashcards } from '../hooks/useFlashcards';
import { useUIStore } from '../stores/useUIStore';
import { useTutorStore } from '../stores/useTutorStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function AIGeneratorRoute() {
    const navigate    = useNavigate();
    const flashcards  = useFlashcards();
    const coordinator = useAppCoordinator();
    const {
        aiModalInitialTopic,
        aiModalInitialMode,
        aiModalInitialContext,
    } = useUIStore();
    const { guestTutors } = useTutorStore();

    return (
        <AIGeneratorModal
            isOpen={true}
            onClose={() => navigate(-1)}
            onCardsGenerated={(cards) => {
                coordinator.handleAICardsGenerated(cards);
                navigate('/setup');
            }}
            onCreateSet={(name, cards) => {
                flashcards.createSet(name, cards);
                navigate('/setup');
            }}
            onAddCards={(cards) => {
                flashcards.addCards(cards);
                navigate('/setup');
            }}
            onLessonGenerated={coordinator.handleLessonGenerated}
            onCurriculumGenerated={coordinator.handleCurriculumGenerated}
            availableLanguages={coordinator.availableLanguages}
            initialTopic={aiModalInitialTopic}
            initialMode={aiModalInitialMode}
            initialContext={aiModalInitialContext}
            onShowSavedLessons={() => navigate('/saved-lessons')}
            onNavigateToSettings={() => navigate('/settings')}
            guestTutors={guestTutors}
            initialTutor={coordinator.config.selectedTutor || guestTutors[0]}
        />
    );
}
