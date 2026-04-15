import { Navigate } from 'react-router-dom';
import { QuizScreen } from '../components/QuizScreen';
import { useQuizSessionStore } from '../stores/useQuizSessionStore';
import { useStudyContentStore } from '../stores/useStudyContentStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function QuizRoute() {
    const quizSession = useQuizSessionStore();
    const { currentLesson } = useStudyContentStore();
    const coordinator = useAppCoordinator();

    if (!quizSession.quizConfig) {
        return <Navigate to="/setup" replace />;
    }

    return (
        <QuizScreen
            quizCards={quizSession.quizCards}
            quizConfig={quizSession.quizConfig}
            onQuizEnd={coordinator.onQuizEnd}
            onBackToLesson={currentLesson ? coordinator.handleBackToLesson : undefined}
        />
    );
}
