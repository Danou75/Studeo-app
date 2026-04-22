import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

const CurriculumScreen = lazy(() =>
    import('../components/CurriculumScreen').then(m => ({ default: m.CurriculumScreen }))
);

export default function CurriculumRoute() {
    const navigate    = useNavigate();
    const coordinator = useAppCoordinator();

    return (
        <Suspense fallback={null}>
            <CurriculumScreen
                onBack={() => navigate(-1)}
                onGenerateContent={coordinator.handleGenerateModuleContent}
                onStartModule={coordinator.handleStartModule}
                onStartQuiz={coordinator.handleStartModuleQuiz}
                onDeleteProgram={coordinator.handleDeleteProgram}
                onRenameProgram={coordinator.handleRenameProgram}
                onSelectLesson={coordinator.handleSelectLesson}
                onDeleteLesson={coordinator.handleDeleteLesson}
                onRenameLesson={coordinator.handleRenameLesson}
                onSuggestedProgram={coordinator.handleSuggestedProgram}
                onDrawingChallenge={() => navigate('/drawing-challenge')}
                onNewProgram={() => navigate('/tutors')}
                onNavigateToSettings={() => navigate('/settings')}
                onDeleteConvSession={coordinator.handleDeleteConvSession}
                onRenameConvSession={coordinator.handleRenameConvSession}
                onResumeConvSession={(session) =>
                    navigate('/language-lab', { state: { session } })
                }
                onDeleteVocabList={coordinator.handleDeleteVocabList}
                onRenameVocabList={coordinator.handleRenameVocabList}
                onOpenVocabInLab={(vocab) =>
                    navigate('/language-lab', { state: { vocab } })
                }
                onDeleteShadowingSession={coordinator.handleDeleteShadowingSession}
                onRenameShadowingSession={coordinator.handleRenameShadowingSession}
                onOpenShadowingInLab={(session) =>
                    navigate('/language-lab', { state: { shadowingSession: session } })
                }
            />
        </Suspense>
    );
}
