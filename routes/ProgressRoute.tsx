
import { useNavigate } from 'react-router-dom';
import { ProgressScreen } from '../components/ProgressScreen';

export default function ProgressRoute() {
    const navigate = useNavigate();
    return <ProgressScreen onBack={() => navigate(-1)} />;
}
