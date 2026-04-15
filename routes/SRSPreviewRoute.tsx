
import { useNavigate } from 'react-router-dom';
import { SRSReviewScreen } from '../components/SRSReviewScreen';
import { useUIStore } from '../stores/useUIStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function SRSPreviewRoute() {
    const navigate    = useNavigate();
    const { srsPreviewCards, srsPreviewConfig } = useUIStore();
    const coordinator = useAppCoordinator();

    return (
        <SRSReviewScreen
            dueCards={srsPreviewCards}
            questionLang={srsPreviewConfig?.questionLang || 'fr'}
            answerLang={srsPreviewConfig?.answerLang || 'it'}
            onStartReview={coordinator.onStartSRSReview}
            onCancel={() => navigate('/')}
        />
    );
}
