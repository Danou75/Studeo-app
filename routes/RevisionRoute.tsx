
import { Navigate, useNavigate } from 'react-router-dom';
import { RevisionScreen } from '../components/RevisionScreen';
import { useQuizSessionStore } from '../stores/useQuizSessionStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function RevisionRoute() {
    const navigate    = useNavigate();
    const quizSession = useQuizSessionStore();
    const coordinator = useAppCoordinator();

    if (!quizSession.quizConfig) {
        return <Navigate to="/" replace />;
    }

    return (
        <RevisionScreen
            cards={quizSession.incorrectCards}
            quizConfig={quizSession.quizConfig}
            onBack={() => navigate('/completion')}
            onRestartQuiz={() =>
                coordinator.onStartQuiz(quizSession.incorrectCards, quizSession.quizConfig!)
            }
        />
    );
}
