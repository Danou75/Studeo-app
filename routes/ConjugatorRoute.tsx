import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlashcards } from '../hooks/useFlashcards';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

const ConjugatorScreen = lazy(() =>
    import('../components/ConjugatorScreen').then(m => ({ default: m.ConjugatorScreen }))
);

export default function ConjugatorRoute() {
    const navigate    = useNavigate();
    const flashcards  = useFlashcards();
    const coordinator = useAppCoordinator();

    return (
        <Suspense fallback={null}>
            <ConjugatorScreen
                onBack={() => navigate(-1)}
                onAddCards={(cards) => {
                    flashcards.addCards(cards);
                    navigate('/setup');
                }}
                onCreateSet={(name, cards) => flashcards.createSet(name, cards)}
                onStartQuiz={(cards, questionLang, answerLang) => {
                    coordinator.onStartQuiz(cards, {
                        questionLang,
                        answerLang,
                        mode: 'mcq',
                        gameMode: 'normal',
                        voiceGender: 'female',
                    });
                }}
                onNavigateToSettings={() => navigate('/settings')}
            />
        </Suspense>
    );
}
