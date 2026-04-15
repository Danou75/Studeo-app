import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';

const CodingChallengeScreen = lazy(() =>
    import('../components/CodingChallengeScreen').then(m => ({ default: m.CodingChallengeScreen }))
);

export default function CodingChallengeRoute() {
    const navigate = useNavigate();
    return (
        <Suspense fallback={null}>
            <CodingChallengeScreen onBack={() => navigate(-1)} />
        </Suspense>
    );
}
