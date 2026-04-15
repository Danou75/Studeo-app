
import { Navigate, useNavigate } from 'react-router-dom';
import { ExerciseScreen } from '../components/ExerciseScreen';
import { useStudyContentStore } from '../stores/useStudyContentStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function ExercisesRoute() {
    const navigate          = useNavigate();
    const { currentLesson } = useStudyContentStore();
    const coordinator       = useAppCoordinator();

    if (!currentLesson?.exercises) {
        return <Navigate to="/lesson" replace />;
    }

    return (
        <ExerciseScreen
            exerciseSet={currentLesson.exercises}
            onBack={() => navigate('/lesson')}
            onHome={() => navigate('/')}
            onComplete={coordinator.handleExerciseComplete}
        />
    );
}
