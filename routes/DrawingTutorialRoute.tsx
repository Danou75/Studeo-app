import { lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const DrawingTutorialScreen = lazy(() =>
    import('../components/DrawingTutorialScreen').then(m => ({ default: m.DrawingTutorialScreen }))
);

export default function DrawingTutorialRoute() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const tutorId = params.get('tutorId') || 'maitre-leonard';
    const topic   = params.get('topic') || undefined;

    return (
        <Suspense fallback={null}>
            <DrawingTutorialScreen
                onBack={() => navigate(-1)}
                initialTopic={topic}
                tutorId={tutorId}
            />
        </Suspense>
    );
}
