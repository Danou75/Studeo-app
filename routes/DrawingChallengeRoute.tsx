import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

const DrawingChallengeScreen = lazy(() =>
    import('../components/DrawingChallengeScreen').then(m => ({ default: m.DrawingChallengeScreen }))
);

export default function DrawingChallengeRoute() {
    const navigate = useNavigate();
    return (
        <Suspense fallback={null}>
            <DrawingChallengeScreen onBack={() => navigate(-1)} />
        </Suspense>
    );
}
