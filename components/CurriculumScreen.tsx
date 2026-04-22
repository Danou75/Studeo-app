import React from 'react';
import { StudyProgram, StudyModule, ConversationSession, SavedVocabList, Lesson, SavedShadowingSession } from '../types';
import { useStudyContentStore } from '../stores/useStudyContentStore';
import { useCurriculum } from './curriculum/hooks/useCurriculum';
import { CurriculumHeader } from './curriculum/views/CurriculumHeader';
import { CurriculumDetailView } from './curriculum/views/CurriculumDetailView';
import { CurriculumTabsView } from './curriculum/views/CurriculumTabsView';
import { SuggestionsCatalogView } from './curriculum/views/SuggestionsCatalogView';
import { CurriculumModals } from './curriculum/views/CurriculumModals';

interface CurriculumScreenProps {
    onBack: () => void;
    onGenerateContent: (program: StudyProgram, module: StudyModule) => Promise<StudyProgram | undefined>;
    onStartModule: (module: StudyModule, tutorId: string) => void;
    onStartQuiz: (module: StudyModule, tutorId: string) => void;
    onDeleteProgram: (id: string) => void;
    onRenameProgram: (id: string, newTitle: string) => void;
    onSelectLesson: (lesson: Lesson, source?: 'curriculum' | 'generator') => void;
    onDeleteLesson: (id: string) => void;
    onRenameLesson: (id: string, newTopic: string) => void;
    onDrawingChallenge?: (module: StudyModule) => void;
    onStartTutorial?: (topic: string) => void;
    onNewProgram?: () => void;
    onSuggestedProgram: (topic: string, category: string) => void;
    onDeleteConvSession?: (id: string) => void;
    onRenameConvSession?: (id: string, newTitle: string) => void;
    onResumeConvSession?: (session: ConversationSession) => void;
    onDeleteVocabList?: (id: string) => void;
    onRenameVocabList?: (id: string, newTheme: string) => void;
    onOpenVocabInLab?: (vocab: SavedVocabList) => void;
    onDeleteShadowingSession?: (id: string) => void;
    onRenameShadowingSession?: (id: string, newTheme: string) => void;
    onOpenShadowingInLab?: (session: SavedShadowingSession) => void;
    onNavigateToSettings?: () => void;
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = (props) => {
    const programs = useStudyContentStore(s => s.studyPrograms);
    const lessons = useStudyContentStore(s => s.savedLessons);
    const customSuggestions = useStudyContentStore(s => s.curriculumSuggestions);
    const setCustomSuggestions = useStudyContentStore(s => s.setCurriculumSuggestions);
    const savedConvSessions = useStudyContentStore(s => s.savedConvSessions);
    const savedVocabLists = useStudyContentStore(s => s.savedVocabLists);
    const savedShadowingSessions = useStudyContentStore(s => s.savedShadowingSessions);

    const curriculum = useCurriculum({
        programs,
        lessons: lessons || [],
        savedConvSessions: savedConvSessions || [],
        savedVocabLists: savedVocabLists || [],
        savedShadowingSessions: savedShadowingSessions || [],
        customSuggestions,
        setCustomSuggestions,
        onGenerateContent: props.onGenerateContent,
        onStartModule: props.onStartModule,
    });
    const {
        viewMode,
        activeTab,
        setActiveTab,
        selectedTutorId,
        setSelectedTutorId,
        tutorsWithContent,
        filteredPrograms,
        filteredLessons,
        filteredSavedConvSessions,
        filteredSavedVocabLists,
        filteredSavedShadowingSessions,
        setSelectedVocab,
        selectedVocab,
    } = curriculum;
    const handleConfirmRename = () => {
        if (curriculum.renameType === 'program') {
            props.onRenameProgram(curriculum.renameItemId!, curriculum.newTitle);
        } else if (curriculum.renameType === 'lesson') {
            props.onRenameLesson(curriculum.renameItemId!, curriculum.newTitle);
        } else if (curriculum.renameType === 'conversation') {
            props.onRenameConvSession?.(curriculum.renameItemId!, curriculum.newTitle);
        } else if (curriculum.renameType === 'vocab') {
            props.onRenameVocabList?.(curriculum.renameItemId!, curriculum.newTitle);
        } else if (curriculum.renameType === 'shadowing') {
            props.onRenameShadowingSession?.(curriculum.renameItemId!, curriculum.newTitle);
        }
        curriculum.setIsRenameModalOpen(false);
    };

    if (curriculum.selectedProgram) {
        return (
            <CurriculumDetailView
                program={curriculum.selectedProgram}
                onBack={() => curriculum.setSelectedProgram(null)}
                onNavigateToSettings={props.onNavigateToSettings}
                onExportProgram={curriculum.handleExportProgram}
                onShare={curriculum.handleShare}
                isExporting={curriculum.isExporting}
                loadingModuleId={curriculum.loadingModuleId}
                onModuleClick={curriculum.handleModuleClick}
                onStartQuiz={props.onStartQuiz}
                onDrawingChallenge={props.onDrawingChallenge}
                onStartTutorial={props.onStartTutorial}
                onRegenerateModule={async (module) => {
                    // This function is directly awaited inside CurriculumDetailView logic,
                    // but we need to reset the loading state managed by the hook
                    // However, we didn't expose setLoadingModuleId directly, so let's just delegate to generate
                    // Since hook's handleModuleClick handles generate, we add regenerate. Wait, let's just pass `onGenerateContent`
                    // and handle setLoadingModuleId? Let's just fix the prop.
                    // Instead of fixing the prop here, I will just call `onGenerateContent` in the prop.
                    await props.onGenerateContent(curriculum.selectedProgram!, module);
                }}
            />
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative">
            <CurriculumHeader
                onBack={props.onBack}
                onNavigateToSettings={props.onNavigateToSettings}
                viewMode={curriculum.viewMode}
                setViewMode={curriculum.setViewMode}
                onNewProgram={props.onNewProgram}
                selectedTutorId={selectedTutorId}
                setSelectedTutorId={setSelectedTutorId}
                tutorsWithContent={tutorsWithContent}
            />

            <div className="p-4 md:p-6 flex-1 overflow-y-auto min-h-0 pb-32">
                <CurriculumTabsView
                    viewMode={viewMode}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    programs={filteredPrograms}
                    lessons={filteredLessons}
                    savedConvSessions={filteredSavedConvSessions}
                    savedVocabLists={filteredSavedVocabLists}
                    savedShadowingSessions={filteredSavedShadowingSessions}
                    onSelectProgram={curriculum.setSelectedProgram}
                    onSelectLesson={props.onSelectLesson}
                    onDeleteProgram={props.onDeleteProgram}
                    onDeleteLesson={props.onDeleteLesson}
                    onDeleteConvSession={props.onDeleteConvSession}
                    onDeleteVocabList={props.onDeleteVocabList}
                    onDeleteShadowingSession={props.onDeleteShadowingSession}
                    onResumeConvSession={props.onResumeConvSession}
                    onOpenVocabInLab={props.onOpenVocabInLab}
                    onOpenShadowingInLab={props.onOpenShadowingInLab}
                    setSelectedVocab={setSelectedVocab}
                    openRenameModal={curriculum.openRenameModal}
                />

                {curriculum.activeTab !== 'conversations' && curriculum.activeTab !== 'vocabulary' && curriculum.activeTab !== 'shadowing' && (
                    <SuggestionsCatalogView
                        customSuggestions={curriculum.customSuggestions}
                        viewMode={viewMode}
                        isRenewingCatalog={curriculum.isRenewingCatalog}
                        setShowRenewModal={curriculum.setShowRenewModal}
                        handleDeleteSuggestion={curriculum.handleDeleteSuggestion}
                        onSuggestedProgram={props.onSuggestedProgram}
                    />
                )}
            </div>

            <CurriculumModals
                selectedVocab={selectedVocab}
                setSelectedVocab={setSelectedVocab}
                onOpenVocabInLab={props.onOpenVocabInLab}
                isRenameModalOpen={curriculum.isRenameModalOpen}
                setIsRenameModalOpen={curriculum.setIsRenameModalOpen}
                renameType={curriculum.renameType}
                newTitle={curriculum.newTitle}
                setNewTitle={curriculum.setNewTitle}
                onConfirmRename={handleConfirmRename}
                showRenewModal={curriculum.showRenewModal}
                setShowRenewModal={curriculum.setShowRenewModal}
                renewStrategy={curriculum.renewStrategy}
                setRenewStrategy={curriculum.setRenewStrategy}
                renewPreferences={curriculum.renewPreferences}
                setRenewPreferences={curriculum.setRenewPreferences}
                isRenewingCatalog={curriculum.isRenewingCatalog}
                handleRenewCatalog={curriculum.handleRenewCatalog}
            />
        </div>
    );
};
