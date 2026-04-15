
import { useNavigate } from 'react-router-dom';
import { HomeScreen } from '../components/HomeScreen';
import { useAuth } from '../contexts/AuthContext';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function HomeRoute() {
    const navigate = useNavigate();
    const { user }  = useAuth();
    const coordinator = useAppCoordinator();

    const cloudStatus = (window as any).__studeo_cloudStatus ?? 'idle';

    return (
        <HomeScreen
            onNavigateToQuiz={()           => navigate('/setup')}
            onNavigateToSRS={coordinator.handleNavigateToSRS}
            onNavigateToAIGenerator={()    => navigate('/ai-generator')}
            onNavigateToTutorsRoom={()     => navigate('/tutors')}
            onNavigateToConjugator={()     => navigate('/conjugator')}
            onNavigateToDashboard={()      => navigate('/dashboard')}
            onNavigateToSettings={()       => navigate('/settings')}
            onNavigateToCurriculum={()     => navigate('/curriculum')}
            onNavigateToKnowledgeMap={()   => navigate('/knowledge-map')}
            onNavigateToLibrary={()        => navigate('/library')}
            onNavigateToVideoLab={()       => navigate('/video-lab')}
            onNavigateToChat={()           => navigate('/chat')}
            onNavigateToLanguageLab={()    => navigate('/tutor-selection')}
            onShowHelp={() => (window as any).__studeo_openHelp?.()}
            onOpenAuth={() => (window as any).__studeo_openAuth?.()}
            onSyncPush={() => (window as any).__studeo_pushCloud?.()}
            cloudStatus={cloudStatus}
            user={user}
        />
    );
}
