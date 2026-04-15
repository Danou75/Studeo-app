
import { Navigate, useNavigate } from 'react-router-dom';
import { CompletionScreen } from '../components/CompletionScreen';
import { useQuizSessionStore } from '../stores/useQuizSessionStore';
import { useQuizStore } from '../stores/useQuizStore';
import { useFlashcards } from '../hooks/useFlashcards';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useStudyContentStore } from '../stores/useStudyContentStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function CompletionRoute() {
    const navigate          = useNavigate();
    const quizSession       = useQuizSessionStore();
    const { history }       = useQuizStore();
    const flashcards        = useFlashcards();
    const gamification       = useGamificationStore();
    const { currentLesson } = useStudyContentStore();
    const coordinator       = useAppCoordinator();

    if (!quizSession.lastResult || !quizSession.quizConfig) {
        return <Navigate to="/" replace />;
    }

    return (
        <CompletionScreen
            lastResult={quizSession.lastResult}
            incorrectCards={quizSession.incorrectCards}
            persistentErrors={coordinator.getPersistentErrorCards(flashcards.allFlashcards)}
            history={history}
            onStartRevision={() => navigate('/revision')}
            onRestart={() => navigate('/')}
            onRestartSameQuiz={() =>
                quizSession.quizConfig &&
                coordinator.onStartQuiz(quizSession.quizCards, quizSession.quizConfig)
            }
            onBackToSetup={() => navigate('/setup')}
            quizConfig={quizSession.quizConfig}
            onDeleteHistoryEntry={coordinator.deleteHistoryEntry}
            onResetPersistentError={coordinator.resetPersistentError}
            newAchievements={gamification.newAchievements}
            onBackToLesson={currentLesson ? coordinator.handleBackToLesson : undefined}
            onBackToLanguageLab={() => navigate('/language-lab')}
            onGenerateBonusExercises={currentLesson ? coordinator.handleGenerateBonusExercises : undefined}
            isProgramCompleted={coordinator.isProgramCompleted}
            onResetProgramCompletion={() => coordinator.setIsProgramCompleted(false)}
        />
    );
}
