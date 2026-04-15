import React from 'react';
import { lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFlashcards } from '../hooks/useFlashcards';
import { useUIStore } from '../stores/useUIStore';
import { useAppCoordinator } from '../hooks/useAppCoordinator';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useTutorStore } from '../stores/useTutorStore';
import { TUTORS } from '../constants';
import { ConversationSession, SavedVocabList } from '../types';

const LanguageLabScreen = lazy(() =>
    import('../components/LanguageLabScreen').then(m => ({ default: m.LanguageLabScreen }))
);

export default function LanguageLabRoute() {
    const navigate    = useNavigate();
    const location    = useLocation();
    const flashcards  = useFlashcards();
    const coordinator = useAppCoordinator();
    const { config }  = useAIConfig();
    const { guestTutors } = useTutorStore();
    const {
        targetedLessons, setTargetedLessons,
        vocabLabCache,   setVocabLabCache,
    } = useUIStore();

    // ── État transitoire passé via navigate('/language-lab', { state: { session | vocab } })
    const routeState = location.state as {
        session?: ConversationSession;
        vocab?:   SavedVocabList;
    } | null;

    const initialSession   = routeState?.session;
    const initialVocabList = routeState?.vocab;

    // ── Résolution du tuteur : priorité à la session enregistrée
    const resolvedTutor = React.useMemo(() => {
        if (initialSession) {
            const found =
                TUTORS.find(t => t.id === initialSession.tutorId) ||
                guestTutors.find(t => t.id === initialSession.tutorId);
            if (found) return found;
            return {
                id:           initialSession.tutorId,
                name:         initialSession.tutorName || 'Tuteur',
                emoji:        '👨‍🏫',
                category:     'guest',
                systemPrompt: '',
                description:  'Session enregistrée',
            } as any;
        }
        return config.selectedTutor || guestTutors[0];
    }, [initialSession, config.selectedTutor, guestTutors]);

    return (
        <Suspense fallback={null}>
            <LanguageLabScreen
                tutor={resolvedTutor}
                onBack={() => navigate(-1)}
                onAddCards={flashcards.addCards}
                onCreateSet={flashcards.createSet}
                flashcardSets={flashcards.flashcardSets}
                onNavigateToSettings={() => navigate('/settings')}
                onSaveConvSession={coordinator.handleSaveConvSession}
                initialSession={initialSession}
                onLaunchAIGenerator={(topic, mode, context) => {
                    coordinator.handleLaunchAIVocabQuiz(topic, mode, context);
                }}
                onClearAiGenCache={coordinator.clearCardCache}
                targetedLessonsProps={targetedLessons}
                onSetTargetedLessonsProps={setTargetedLessons}
                onUpdateSession={(session) => {
                    navigate('/language-lab', {
                        state: { session, vocab: initialVocabList },
                        replace: true,
                    });
                }}
                onSaveVocabList={coordinator.handleSaveVocabList}
                initialVocabList={initialVocabList}
                vocabLabCache={vocabLabCache}
                onSetVocabLabCache={setVocabLabCache}
                onNavigateToCurriculum={() => navigate('/curriculum')}
                onStartFlashcardQuiz={(setName) => {
                    flashcards.setCurrentSetName(setName);
                    navigate('/setup');
                }}
            />
        </Suspense>
    );
}
