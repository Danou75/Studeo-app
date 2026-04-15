
import { useNavigate } from 'react-router-dom';
import { SavedLessonsModal } from '../components/SavedLessonsModal';
import { useStudyContentStore } from '../stores/useStudyContentStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function SavedLessonsRoute() {
    const navigate      = useNavigate();
    const { savedLessons } = useStudyContentStore();
    const coordinator   = useAppCoordinator();

    return (
        <SavedLessonsModal
            isOpen={true}
            onClose={() => navigate(-1)}
            lessons={savedLessons}
            onSelectLesson={coordinator.handleSelectLesson}
            onDeleteLesson={coordinator.handleDeleteLesson}
        />
    );
}
