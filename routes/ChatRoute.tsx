import { useNavigate, useLocation } from 'react-router-dom';
import { ChatScreen } from '../components/ChatScreen';
import { useFlashcards } from '../hooks/useFlashcards';

export default function ChatRoute() {
    const navigate   = useNavigate();
    const location   = useLocation();
    const flashcards = useFlashcards();

    // Données passées via navigate('/chat', { state: { tutorName, tutorSubject } })
    const { tutorName, tutorSubject } = (location.state as any) ?? {};

    return (
        <ChatScreen
            onBack={() => navigate(-1)}
            tutorName={tutorName}
            tutorSubject={tutorSubject}
            onStartQuiz={(cards) => {
                const setName = `${tutorName || 'Tuteur'} - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
                flashcards.createSet(setName, cards);
                flashcards.setCurrentSetName(setName);
                navigate('/setup');
            }}
        />
    );
}
