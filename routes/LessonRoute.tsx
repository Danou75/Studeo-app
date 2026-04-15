import { lazy, Suspense } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStudyContentStore } from '../stores/useStudyContentStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

const LessonScreen = lazy(() =>
    import('../components/LessonScreen').then(m => ({ default: m.LessonScreen }))
);

export default function LessonRoute() {
    const navigate          = useNavigate();
    const { currentLesson } = useStudyContentStore();
    const coordinator       = useAppCoordinator();

    if (!currentLesson) {
        return <Navigate to="/" replace />;
    }

    return (
        <Suspense fallback={null}>
            <LessonScreen
                lesson={currentLesson}
                onBack={() => {
                    if (currentLesson.source === 'curriculum') {
                        navigate('/curriculum');
                    } else {
                        navigate('/saved-lessons');
                    }
                }}
                onHome={() => navigate('/')}
                onSave={coordinator.handleSaveLesson}
                onNewLesson={coordinator.handleLessonSuggestion}
                onStartQuiz={(cards) =>
                    coordinator.onStartQuiz(cards, {
                        questionLang: 'fr',
                        answerLang:   'fr',
                        mode:         'mixed',
                        voiceGender:  'female',
                        gameMode:     'normal',
                    }, `Quiz : ${currentLesson.topic}`)
                }
                onGenerateExercises={coordinator.handleInteractiveExercises}
                onGenerateQuiz={coordinator.handleGenerateQuizFromLesson}
                onNavigateToSettings={() => navigate('/settings')}
            />
        </Suspense>
    );
}
