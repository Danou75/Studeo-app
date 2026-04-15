import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

const MusicChallengeScreen = lazy(() =>
    import('../components/MusicChallengeScreen').then(m => ({ default: m.MusicChallengeScreen }))
);

export default function MusicChallengeRoute() {
    const navigate = useNavigate();
    return (
        <Suspense fallback={null}>
            <MusicChallengeScreen onBack={() => navigate(-1)} />
        </Suspense>
    );
}
