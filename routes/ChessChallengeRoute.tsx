import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

const ChessChallengeScreen = lazy(() =>
    import('../components/ChessChallengeScreen').then(m => ({ default: m.ChessChallengeScreen }))
);

export default function ChessChallengeRoute() {
    const navigate = useNavigate();
    return (
        <Suspense fallback={null}>
            <ChessChallengeScreen onBack={() => navigate(-1)} />
        </Suspense>
    );
}
