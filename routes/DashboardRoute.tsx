
import { useNavigate } from 'react-router-dom';
import { DashboardScreen } from '../components/DashboardScreen';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function DashboardRoute() {
    const navigate    = useNavigate();
    const coordinator = useAppCoordinator();

    return (
        <DashboardScreen
            onBack={() => navigate('/')}
            onStartQuiz={coordinator.onStartQuiz}
            onSyncPush={() => (window as any).__studeo_pushCloud?.()}
        />
    );
}
