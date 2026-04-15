
import { useNavigate } from 'react-router-dom';
import { TutorsRoomModal } from '../components/TutorsRoomModal';
import { useTutorStore } from '../stores/useTutorStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function TutorsRoomRoute() {
    const navigate    = useNavigate();
    const coordinator = useAppCoordinator();
    const {
        guestTutors,
        tutorsRoomCategory,
        setTutorsRoomCategory,
        addGuestTutor,
        updateGuestTutor,
        removeGuestTutor,
    } = useTutorStore();

    return (
        <TutorsRoomModal
            isOpen={true}
            onClose={() => navigate('/')}
            onSelectTutor={(tutor) => coordinator.handleSelectTutor(tutor)}
            onGenerateCurriculum={(tutor) => coordinator.handleGenerateCurriculum(tutor)}
            onDrawingChallenge={() => navigate('/drawing-challenge')}
            onMusicChallenge={() => navigate('/music-challenge')}
            onChessChallenge={() => navigate('/chess-challenge')}
            onCodingChallenge={() => navigate('/coding-challenge')}
            onStartTutorial={(tutorId) => navigate(`/drawing-tutorial?tutorId=${tutorId}`)}
            onOpenLanguageLab={() => navigate('/language-lab')}
            guestTutors={guestTutors}
            onAddGuestTutor={addGuestTutor}
            onUpdateGuestTutor={updateGuestTutor}
            onRemoveGuestTutor={removeGuestTutor}
            selectedCategory={tutorsRoomCategory}
            onSelectCategory={setTutorsRoomCategory}
            onNavigateToSettings={() => navigate('/settings')}
            onNavigateToProgress={() => navigate('/progress')}
            onStartChat={(tutorName, tutorSubject) =>
                navigate('/chat', { state: { tutorName, tutorSubject } })
            }
        />
    );
}
