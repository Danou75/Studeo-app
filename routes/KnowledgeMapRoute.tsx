import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlashcards } from '../hooks/useFlashcards';

const KnowledgeMapScreen = lazy(() =>
    import('../components/KnowledgeMapScreen').then(m => ({ default: m.KnowledgeMapScreen }))
);

export default function KnowledgeMapRoute() {
    const navigate   = useNavigate();
    const flashcards = useFlashcards();

    return (
        <Suspense fallback={null}>
            <KnowledgeMapScreen
                flashcardSets={flashcards.flashcardSets}
                onBack={() => navigate(-1)}
                onResetProgress={flashcards.resetAllProgress}
            />
        </Suspense>
    );
}
