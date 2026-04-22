import React from 'react';
import { StudyProgram, ConversationSession, SavedVocabList, SavedShadowingSession } from '../../../types';
import { Lesson } from '../../../types';
import { TUTORS } from '../../../constants';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useConfirmation } from '../../../contexts/ConfirmationContext';

interface CurriculumTabsViewProps {
    viewMode: 'grid' | 'list';
    activeTab: 'programs' | 'lessons' | 'conversations' | 'vocabulary' | 'shadowing';
    setActiveTab: (tab: 'programs' | 'lessons' | 'conversations' | 'vocabulary' | 'shadowing') => void;
    programs: StudyProgram[];
    lessons: Lesson[];
    savedConvSessions: ConversationSession[];
    savedVocabLists: SavedVocabList[];
    savedShadowingSessions: SavedShadowingSession[];
    onSelectProgram: (program: StudyProgram) => void;
    onSelectLesson: (lesson: Lesson, source?: 'curriculum' | 'generator') => void;
    onDeleteProgram: (id: string) => void;
    onDeleteLesson: (id: string) => void;
    onDeleteConvSession?: (id: string) => void;
    onDeleteVocabList?: (id: string) => void;
    onDeleteShadowingSession?: (id: string) => void;
    onResumeConvSession?: (session: ConversationSession) => void;
    onOpenVocabInLab?: (vocab: SavedVocabList) => void;
    onOpenShadowingInLab?: (session: SavedShadowingSession) => void;
    setSelectedVocab: (vocab: SavedVocabList | null) => void;
    openRenameModal: (type: 'program' | 'lesson' | 'conversation' | 'vocab' | 'shadowing', id: string, currentTitle: string) => void;
}

export const CurriculumTabsView: React.FC<CurriculumTabsViewProps> = ({
    viewMode,
    activeTab,
    setActiveTab,
    programs,
    lessons,
    savedConvSessions,
    savedVocabLists,
    savedShadowingSessions,
    onSelectProgram,
    onSelectLesson,
    onDeleteProgram,
    onDeleteLesson,
    onDeleteConvSession,
    onDeleteVocabList,
    onDeleteShadowingSession,
    onResumeConvSession,
    onOpenVocabInLab,
    onOpenShadowingInLab,
    setSelectedVocab,
    openRenameModal
}) => {
    const { t } = useTranslation();
    const { showConfirmation } = useConfirmation();

    const getTutor = (tutorId: string) => TUTORS.find(t => t.id === tutorId);

    const filteredPrograms = programs;
    const filteredLessons = lessons;
    const filteredConvSessions = savedConvSessions;
    const filteredVocabLists = savedVocabLists;
    const filteredShadowingSessions = savedShadowingSessions;

    return (
        <>
            {/* TABS SELECTOR */}
            <div className="flex gap-4 mb-8 border-b border-border overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('programs')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'programs' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                >
                    <i className="fas fa-map-marked-alt mr-2"></i> {t('curriculum.tabs.programs')} ({filteredPrograms.length})
                    {activeTab === 'programs' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('lessons')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'lessons' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                >
                    <i className="fas fa-book-open mr-2"></i> {t('curriculum.tabs.lessons')} ({filteredLessons.length})
                    {activeTab === 'lessons' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('conversations')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'conversations' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                >
                    <i className="fas fa-comments mr-2"></i> {t('curriculum.tabs.causeries')} ({filteredConvSessions.length})
                    {activeTab === 'conversations' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('vocabulary')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'vocabulary' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                >
                    <i className="fas fa-language mr-2"></i> {t('curriculum.tabs.vocab')} ({filteredVocabLists.length})
                    {activeTab === 'vocabulary' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('shadowing')}
                    className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === 'shadowing' ? 'text-primary' : 'text-text-muted hover:text-text'}`}
                >
                    <i className="fas fa-microphone mr-2" /> Shadowing ({filteredShadowingSessions.length})
                    {activeTab === 'shadowing' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                </button>
            </div>


            {/* TAB CONTENT */}
            {activeTab === 'programs' && (
                filteredPrograms.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 border-2 border-dashed border-border rounded-xl p-12">
                        <div className="bg-background-secondary p-6 rounded-full mb-4">
                            <i className="fas fa-map-marked-alt text-6xl text-text-muted"></i>
                        </div>
                        <h2 className="text-xl font-bold mb-2">{t('curriculum.noPrograms')}</h2>
                        <p className="max-w-md mx-auto mb-6">
                            {t('curriculum.noProgramsHelp')}
                        </p>
                    </div>
                ) : (
                    <div className={viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {filteredPrograms.map(program => {
                            const tutor = getTutor(program.tutorId);
                            const progress = Math.round((program.modules.filter(m => m.status === 'completed').length / program.modules.length) * 100);

                            return (
                                <div 
                                    key={program.id}
                                    onClick={() => onSelectProgram(program)}
                                    className={`bg-background border border-border rounded-2xl transition-all cursor-pointer group flex overflow-hidden relative ${
                                        viewMode === 'grid' 
                                            ? 'flex-col shadow-lg hover:shadow-xl hover:border-primary' 
                                            : 'flex-row items-center p-4 gap-4 hover:bg-background-secondary'
                                    }`}
                                >
                                    <div className={viewMode === 'grid' 
                                        ? "absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        : "flex gap-2 order-last"
                                    }>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRenameModal('program', program.id, program.topic);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary shadow-sm border border-border transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
                                            title="Renommer"
                                        >
                                            <i className="fas fa-edit text-xs"></i>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                showConfirmation({
                                                    title: t('curriculum.deleteTitle'),
                                                    message: t('curriculum.deleteConfirm'),
                                                    confirmText: t('common.delete'),
                                                    variant: 'danger',
                                                    onConfirm: () => onDeleteProgram(program.id)
                                                });
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 shadow-sm border border-border transition-colors focus:ring-2 focus:ring-red-500/20 outline-none"
                                            title="Supprimer"
                                        >
                                            <i className="fas fa-trash-alt text-xs"></i>
                                        </button>
                                    </div>

                                    <div className={`flex items-center justify-center shrink-0 ${
                                        viewMode === 'grid' ? 'p-6 pb-0' : 'w-16 h-16 bg-background-secondary rounded-xl'
                                    }`}>
                                        <div className={`${viewMode === 'grid' ? 'text-4xl bg-background-secondary w-16 h-16' : 'text-3xl'} flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform`}>
                                            {tutor?.emoji || '🎓'}
                                        </div>
                                    </div>

                                    <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'p-6' : 'px-2'}`}>
                                        {viewMode === 'grid' && (
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary`}>
                                                    {program.targetLevel}
                                                </span>
                                            </div>
                                        )}
                                        
                                        <h3 className={`font-bold group-hover:text-primary transition-colors ${viewMode === 'grid' ? 'text-xl mb-1' : 'text-base'}`}>
                                            {program.topic}
                                        </h3>
                                        
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-text-muted truncate">
                                                {t('curriculum.withTutor', { name: tutor?.name })}
                                            </p>
                                            {viewMode === 'list' && (
                                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                    {program.targetLevel}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className={viewMode === 'grid' ? "mt-4" : "mt-2 max-w-xs"}>
                                            <div className="flex justify-between text-[10px] mb-1">
                                                <span className="text-text-muted uppercase tracking-tighter font-bold">{t('curriculum.progressLabel')}</span>
                                                <span className="font-bold text-primary">{progress}%</span>
                                            </div>
                                            <div className="w-full bg-background-tertiary rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    {viewMode === 'grid' && (
                                        <div className="bg-background-secondary p-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-colors">
                                            {t('curriculum.continue')}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {activeTab === 'lessons' && (
                filteredLessons.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 border-2 border-dashed border-border rounded-xl p-12">
                        <div className="bg-background-secondary p-6 rounded-full mb-4">
                            <i className="fas fa-book text-6xl text-text-muted"></i>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Aucune leçon solo</h2>
                        <p className="max-w-md mx-auto mb-6">
                            Demandez à un professeur de vous créer une leçon personnalisée sur un sujet précis !
                        </p>
                    </div>
                ) : (
                    <div className={viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {filteredLessons.map(lesson => {
                            const tutor = getTutor(lesson.tutorId || '');
                            return (
                                <div 
                                    key={lesson.id}
                                    onClick={() => onSelectLesson(lesson, 'curriculum')}
                                    className={`bg-background border border-border rounded-2xl transition-all cursor-pointer group flex overflow-hidden relative ${
                                        viewMode === 'grid' 
                                            ? 'flex-col shadow-lg hover:shadow-xl hover:border-primary' 
                                            : 'flex-row items-center p-4 gap-4 hover:bg-background-secondary'
                                    }`}
                                >
                                    <div className={viewMode === 'grid' 
                                        ? "absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        : "flex gap-2 order-last"
                                    }>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRenameModal('lesson', lesson.id, lesson.topic);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary shadow-sm border border-border transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
                                            title="Renommer"
                                        >
                                            <i className="fas fa-edit text-xs"></i>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                showConfirmation({
                                                    title: "Supprimer la leçon",
                                                    message: `Êtes-vous sûr de vouloir supprimer définitivement la leçon "${lesson.topic}" ?`,
                                                    confirmText: "Supprimer",
                                                    variant: "danger",
                                                    onConfirm: () => onDeleteLesson(lesson.id)
                                                });
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 shadow-sm border border-border transition-colors focus:ring-2 focus:ring-red-500/20 outline-none"
                                            title="Supprimer"
                                        >
                                            <i className="fas fa-trash-alt text-xs"></i>
                                        </button>
                                    </div>

                                    <div className={`flex items-center justify-center shrink-0 ${
                                        viewMode === 'grid' ? 'p-6 pb-0' : 'w-16 h-16 bg-background-secondary rounded-xl'
                                    }`}>
                                        <div className={`${viewMode === 'grid' ? 'text-4xl bg-background-secondary w-16 h-16' : 'text-3xl'} flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform`}>
                                            {tutor?.emoji || '📖'}
                                        </div>
                                    </div>

                                    <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'p-6' : 'px-2'}`}>
                                        <h3 className={`font-bold group-hover:text-primary transition-colors ${viewMode === 'grid' ? 'text-base mb-1' : 'text-base'}`}>
                                            {lesson.topic}
                                        </h3>
                                        <p className="text-xs text-text-muted truncate">
                                            {lesson.createdAt ? new Date(lesson.createdAt).toLocaleDateString() : 'Date inconnue'}
                                        </p>
                                    </div>

                                    {viewMode === 'grid' && (
                                        <div className="bg-background-secondary p-3 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-colors">
                                            Lire la leçon
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {activeTab === 'conversations' && (
                filteredConvSessions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 border-2 border-dashed border-border rounded-xl p-12">
                        <div className="bg-background-secondary p-6 rounded-full mb-4">
                            <i className="fas fa-comments text-6xl text-text-muted"></i>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Aucune causerie sauvegardée</h2>
                        <p className="max-w-md mx-auto mb-6">
                            Terminez une causerie dans le Lab de Langues et cliquez sur « Sauvegarder cette causerie » pour la retrouver ici !
                        </p>
                    </div>
                ) : (
                    <div className={viewMode === 'list' ? "flex flex-col gap-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {filteredConvSessions.map(session => {
                            const sessionTutor = TUTORS.find(t => t.id === session.tutorId);
                            const date = new Date(session.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                            const hasLesson = session.remedialMessages && session.remedialMessages.length > 0;
                            return (
                                <div
                                    key={session.id}
                                    className={`bg-background border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex relative ${
                                        viewMode === 'grid' 
                                            ? 'flex-col min-h-[160px] justify-between' 
                                            : 'flex-row items-start gap-4'
                                    }`}
                                >
                                    <div className={viewMode === 'grid' 
                                        ? "absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        : "flex gap-2 order-last flex-col sm:flex-row ml-auto shrink-0"
                                    }>
                                        {hasLesson && onResumeConvSession && (
                                            <button
                                                onClick={() => onResumeConvSession(session)}
                                                className={`flex items-center justify-center gap-2 rounded-xl transition-colors border ${
                                                    viewMode === 'grid'
                                                        ? 'w-8 h-8 bg-primary/20 dark:bg-primary/30 text-primary/90 dark:text-primary/40 border-primary/30 dark:border-primary/90'
                                                        : 'px-3 py-2 bg-primary/20 dark:bg-primary/30 text-primary/90 dark:text-primary/40 text-xs font-bold border-primary/30 dark:border-primary/90 hover:bg-primary/30'
                                                }`}
                                                title="Reprendre la leçon"
                                            >
                                                <i className="fas fa-play"></i>
                                                {viewMode === 'list' && <span className="hidden sm:inline">Reprendre</span>}
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRenameModal('conversation', session.id, session.theme);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary transition-colors border border-border"
                                            title="Renommer"
                                        >
                                            <i className="fas fa-edit text-xs"></i>
                                        </button>
                                        {onDeleteConvSession && (
                                            <button
                                                onClick={() => {
                                                    showConfirmation({
                                                        title: 'Supprimer la causerie',
                                                        message: `Supprimer définitivement la causerie "${session.theme}" ?`,
                                                        confirmText: 'Supprimer',
                                                        variant: 'danger',
                                                        onConfirm: () => onDeleteConvSession(session.id)
                                                    });
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors border border-border"
                                                title="Supprimer"
                                            >
                                                <i className="fas fa-trash-alt text-xs"></i>
                                            </button>
                                        )}
                                    </div>

                                    <div className={viewMode === 'grid' ? "flex items-start gap-4 mb-4" : "flex items-start gap-4 flex-1"}>
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-3xl shrink-0">
                                            {sessionTutor?.emoji || '💬'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className={`font-bold text-text group-hover:text-primary transition-colors ${viewMode === 'grid' ? 'text-lg' : 'text-base'}`}>
                                                    {session.theme}
                                                </h3>
                                                {hasLesson && (
                                                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary/40 border border-primary/30 dark:border-primary">
                                                        <i className="fas fa-magic mr-1"></i>Leçon
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-muted mb-2">
                                                {sessionTutor?.name || session.tutorName} · {date} · {session.messages.length} messages
                                            </p>
                                            {viewMode === 'list' && session.summary && (
                                                <p className="text-xs text-text-secondary line-clamp-2 italic">
                                                    {session.summary.overall_feedback}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {viewMode === 'grid' && session.summary && (
                                        <p className="text-xs text-text-secondary line-clamp-2 italic border-t border-border pt-3 mt-auto">
                                            {session.summary.overall_feedback}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {activeTab === 'vocabulary' && (
                filteredVocabLists.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 border-2 border-dashed border-border rounded-xl p-12">
                        <div className="bg-background-secondary p-6 rounded-full mb-4">
                            <i className="fas fa-language text-6xl text-text-muted" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Aucun vocabulaire sauvegardé</h2>
                        <p className="max-w-md mx-auto mb-6">
                            Générez des listes de vocabulaire dans le <strong>Lab de Langues → Vocab</strong> et cliquez sur <strong>« Sauv. »</strong> pour les retrouver ici !
                        </p>
                    </div>
                ) : (
                    <div className={viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {filteredVocabLists.map(vocab => {
                            const diffColor = vocab.difficulty === 'débutant' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : vocab.difficulty === 'intermédiaire' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20';
                            const savedDate = new Date(vocab.savedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                            return (
                                <div
                                    key={vocab.id}
                                    className={`bg-background border border-border rounded-2xl transition-all cursor-pointer group flex overflow-hidden relative ${
                                        viewMode === 'grid' 
                                            ? 'flex-col shadow-lg hover:shadow-xl hover:border-primary' 
                                            : 'flex-row items-center p-4 gap-4 hover:bg-background-secondary'
                                    }`}
                                    onClick={() => setSelectedVocab(vocab)}
                                >
                                    <div className={viewMode === 'grid' 
                                        ? "absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                        : "flex gap-2 order-last"
                                    }>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openRenameModal('vocab', vocab.id, vocab.theme);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary shadow-sm border border-border transition-colors"
                                            title="Renommer"
                                        >
                                            <i className="fas fa-edit text-xs" />
                                        </button>
                                        {onDeleteVocabList && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showConfirmation({
                                                        title: 'Supprimer le vocabulaire',
                                                        message: `Supprimer définitivement "${vocab.theme}" ?`,
                                                        confirmText: 'Supprimer',
                                                        variant: 'danger',
                                                        onConfirm: () => onDeleteVocabList(vocab.id)
                                                    });
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors border border-border"
                                                title="Supprimer"
                                            >
                                                <i className="fas fa-trash-alt text-xs" />
                                            </button>
                                        )}
                                    </div>

                                    <div className={`flex items-center justify-center shrink-0 ${
                                        viewMode === 'grid' ? 'p-6 pb-0' : 'w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-xl'
                                    }`}>
                                        <div className={`${viewMode === 'grid' ? 'text-4xl bg-primary/10 dark:bg-primary/20 w-16 h-16' : 'text-3xl'} flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform`}>
                                            🗣️
                                        </div>
                                    </div>

                                    <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'p-6' : 'px-2'}`}>
                                        <h3 className={`font-bold group-hover:text-primary transition-colors ${viewMode === 'grid' ? 'text-base mb-1' : 'text-base'}`}>
                                            {vocab.theme}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg ${diffColor}`}>
                                                {vocab.difficulty}
                                            </span>
                                            <span className="text-[10px] text-text-muted">
                                                {vocab.wordCount} mots · {vocab.targetLanguage.toUpperCase()}
                                            </span>
                                            {viewMode === 'list' && (
                                                <span className="text-[10px] text-text-muted">
                                                    · {vocab.exercises.length} exercices · {savedDate}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {viewMode === 'grid' && (
                                        <div className="flex">
                                            <div className="flex-1 bg-background-secondary p-3 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-colors">
                                                Aperçu
                                            </div>
                                            {onOpenVocabInLab && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenVocabInLab(vocab); }}
                                                    className="bg-primary hover:bg-primary/90 text-white p-3 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0"
                                                    title="Ouvrir dans le Lab de Langues"
                                                >
                                                    <i className="fas fa-flask text-[11px]" /> Lab
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SHADOWING TAB ━ */}
            {activeTab === 'shadowing' && (
                filteredShadowingSessions.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 border-2 border-dashed border-border rounded-xl p-12">
                        <div className="bg-background-secondary p-6 rounded-full mb-4">
                            <i className="fas fa-microphone text-6xl text-text-muted" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Aucune session de shadowing sauvegardée</h2>
                        <p className="max-w-md mx-auto mb-6">
                            Terminez une session dans le <strong>Labo Shadowing</strong> et cliquez sur <strong>« 💾 Sauvegarder »</strong> pour la retrouver ici !
                        </p>
                    </div>
                ) : (
                    <div className={viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {filteredShadowingSessions.map(session => {
                            const levelColor = session.level === 'débutant'
                                ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                                : session.level === 'intermédiaire'
                                ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'text-red-600 bg-red-50 dark:bg-red-900/20';
                            const savedDate = new Date(session.savedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                            return (
                                <div
                                    key={session.id}
                                    className={`bg-background border border-border rounded-2xl transition-all cursor-pointer group flex overflow-hidden relative ${
                                        viewMode === 'grid'
                                            ? 'flex-col shadow-lg hover:shadow-xl hover:border-primary'
                                            : 'flex-row items-center p-4 gap-4 hover:bg-background-secondary'
                                    }`}
                                    onClick={() => onOpenShadowingInLab?.(session)}
                                >
                                    {/* Actions */}
                                    <div className={viewMode === 'grid'
                                        ? 'absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20'
                                        : 'flex gap-2 order-last'
                                    }>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openRenameModal('shadowing', session.id, session.theme); }}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary shadow-sm border border-border transition-colors"
                                            title="Renommer"
                                        >
                                            <i className="fas fa-edit text-xs" />
                                        </button>
                                        {onDeleteShadowingSession && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    showConfirmation({
                                                        title: 'Supprimer la session',
                                                        message: `Supprimer définitivement "${session.theme}" ?`,
                                                        confirmText: 'Supprimer',
                                                        variant: 'danger',
                                                        onConfirm: () => onDeleteShadowingSession(session.id)
                                                    });
                                                }}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors border border-border"
                                                title="Supprimer"
                                            >
                                                <i className="fas fa-trash-alt text-xs" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Icon */}
                                    <div className={`flex items-center justify-center shrink-0 ${
                                        viewMode === 'grid' ? 'p-6 pb-0' : 'w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-xl'
                                    }`}>
                                        <div className={`${viewMode === 'grid' ? 'text-4xl bg-primary/10 dark:bg-primary/20 w-16 h-16' : 'text-3xl'} flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform`}>
                                            🎙️
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'p-6' : 'px-2'}`}>
                                        <h3 className={`font-bold group-hover:text-primary transition-colors ${viewMode === 'grid' ? 'text-base mb-1' : 'text-base'}`}>
                                            {session.theme}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-lg ${levelColor}`}>
                                                {session.level}
                                            </span>
                                            <span className="text-[10px] text-text-muted">
                                                {session.phraseCount} expressions · {session.targetLanguage.toUpperCase()}
                                            </span>
                                            {viewMode === 'list' && (
                                                <span className="text-[10px] text-text-muted">· {savedDate}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Grid CTA */}
                                    {viewMode === 'grid' && (
                                        <div className="flex">
                                            <div className="flex-1 bg-background-secondary p-3 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-colors">
                                                Relancer
                                            </div>
                                            {onOpenShadowingInLab && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenShadowingInLab(session); }}
                                                    className="bg-primary hover:bg-primary/90 text-white p-3 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0"
                                                >
                                                    <i className="fas fa-microphone text-[11px]" /> Lab
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </>
    );
};
