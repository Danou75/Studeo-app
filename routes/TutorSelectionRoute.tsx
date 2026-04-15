
import { useNavigate } from 'react-router-dom';
import { TutorSelectionModal } from '../components/TutorSelectionModal';
import { useTutorStore } from '../stores/useTutorStore';
import { useAIConfig } from '../contexts/AIConfigContext';

export default function TutorSelectionRoute() {
    const navigate = useNavigate();
    const { guestTutors } = useTutorStore();
    const { setSelectedTutor } = useAIConfig();

    return (
        <TutorSelectionModal
            isOpen={true}
            onClose={() => navigate(-1)}
            onSelectTutor={(tutor) => {
                setSelectedTutor(tutor);
                navigate('/language-lab');
            }}
            guestTutors={guestTutors}
        />
    );
}
