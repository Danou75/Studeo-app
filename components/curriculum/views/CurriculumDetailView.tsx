import React from 'react';
import { StudyProgram, StudyModule } from '../../../types';
import { Button } from '../../ui/Button';
import { getThemeGradient } from '../../../constants/themes';
import { useTheme } from '../../../contexts/ThemeContext';
import { TUTORS } from '../../../constants';
import { AILoader } from '../../AILoader';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useConfirmation } from '../../../contexts/ConfirmationContext';

interface CurriculumDetailViewProps {
    program: StudyProgram;
    onBack: () => void;
    onNavigateToSettings?: () => void;
    onExportProgram: (format: 'md' | 'rtf', tutorName?: string) => void;
    onShare: () => void;
    isExporting: boolean;
    loadingModuleId: string | null;
    onModuleClick: (module: StudyModule) => void;
    onStartQuiz: (module: StudyModule, tutorId: string) => void;
    onDrawingChallenge?: (module: StudyModule) => void;
    onStartTutorial?: (topic: string) => void;
    onRegenerateModule: (module: StudyModule) => Promise<void>;
}

export const CurriculumDetailView: React.FC<CurriculumDetailViewProps> = ({
    program,
    onBack,
    onNavigateToSettings,
    onExportProgram,
    onShare,
    isExporting,
    loadingModuleId,
    onModuleClick,
    onStartQuiz,
    onDrawingChallenge,
    onStartTutorial,
    onRegenerateModule
}) => {
    const { t } = useTranslation();
    const { showConfirmation } = useConfirmation();
    const tutor = TUTORS.find(t => t.id === program.tutorId);
    const { themeMode, themeStyle } = useTheme();

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative">
            <div 
                className={`transition-all duration-500 pt-safe p-3 md:p-6 shadow-lg relative overflow-hidden shrink-0 group/header ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <Button 
                            variant="secondary" 
                            onClick={onBack} 
                            size="sm" 
                            className={`transition-all mb-2 md:mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                        >
                            <i className="fas fa-arrow-left mr-2 text-inherit"></i> {t('curriculum.backToList')}
                        </Button>

                        <div className="flex gap-3 md:gap-4 items-center">
                            {onNavigateToSettings && (
                                <Button
                                    variant="secondary"
                                    onClick={onNavigateToSettings}
                                    size="sm"
                                    className="bg-white/10 hover:bg-white/20 text-white border-transparent backdrop-blur-sm shadow-inner rounded-xl h-10 w-10 p-0 flex items-center justify-center transition-all md:opacity-0 md:group-hover/header:opacity-100 duration-300"
                                    title="Paramètres"
                                >
                                    <i className="fas fa-cog"></i>
                                </Button>
                            )}
                            <div className="flex gap-2 bg-white/10 p-1 md:p-1.5 rounded-xl border border-white/20 backdrop-blur-sm shadow-inner md:opacity-0 md:translate-x-4 md:group-hover/header:opacity-100 md:group-hover/header:translate-x-0 transition-all duration-300">
                                <button 
                                    onClick={() => onExportProgram('md', tutor?.name)}
                                    disabled={isExporting}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/10 text-primary' : 'hover:bg-white/20 text-white'}`}
                                    title="Markdown"
                                >
                                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fab fa-markdown text-sm"></i>} <span className="hidden sm:inline">MD</span>
                                </button>
                                <div className="w-px h-4 bg-white/20 self-center"></div>
                                <button 
                                    onClick={() => onExportProgram('rtf', tutor?.name)}
                                    disabled={isExporting}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/10 text-primary' : 'hover:bg-white/20 text-white'}`}
                                    title="Word/RTF"
                                >
                                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-file-word text-sm"></i>} <span className="hidden sm:inline">RTF</span>
                                </button>
                                <div className="w-px h-4 bg-white/20 self-center"></div>
                                <button 
                                    onClick={onShare}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/10 text-primary' : 'hover:bg-white/20 text-white'}`}
                                    title="Partager ce parcours"
                                >
                                    <i className="fas fa-share-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="text-4xl bg-white/20 p-2.5 rounded-2xl backdrop-blur-md shadow-inner">
                            {tutor?.emoji || '🎓'}
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black drop-shadow-sm">{program.topic}</h1>
                            <div className="flex items-center gap-2 mt-1 opacity-90">
                                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                    {program.targetLevel}
                                </span>
                                <span className="text-sm font-medium">{t('curriculum.withTutor', { name: tutor?.name })}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* ProgressBar */}
                    <div className="mt-6 bg-black/20 rounded-full h-1.5 w-full overflow-hidden">
                        <div 
                            className="bg-white h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(program.modules.filter(m => m.status === 'completed').length / program.modules.length) * 100}%` }}
                        ></div>
                    </div>
                </div>
                
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
                     <i className="fas fa-map-signs text-9xl"></i>
                </div>
            </div>

            {/* Timeline Modules */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background-secondary min-h-0 pb-32">
                <div className="max-w-3xl mx-auto relative pl-8 border-l-2 border-border/50 space-y-8 py-4">
                    {program.modules.map((module, index) => {
                        const isLocked = module.status === 'locked';
                        const isCompleted = module.status === 'completed';
                        const isUnlocked = module.status === 'unlocked';
                        
                        return (
                            <div 
                                key={module.id} 
                                className={`relative transition-all duration-300 ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-[1.02]'}`}
                                onClick={() => onModuleClick(module)}
                            >
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[41px] top-6 w-5 h-5 rounded-full border-4 transition-colors z-10 ${
                                    isCompleted ? 'bg-green-500 border-green-200' : 
                                    isUnlocked ? 'bg-primary border-primary/30 animate-pulse' : 
                                    'bg-gray-400 border-gray-200'
                                }`}></div>

                                {/* Card */}
                                <div className={`bg-background rounded-xl p-5 shadow-md border cursor-pointer group ${
                                    isUnlocked ? 'border-primary shadow-primary/10 ring-1 ring-primary/20' : 'border-border'
                                }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`font-bold text-lg ${isUnlocked ? 'text-primary' : 'text-text'}`}>
                                            {module.title}
                                        </h3>
                                        <div className="text-xs font-mono opacity-50 bg-background-tertiary px-2 py-1 rounded">
                                            {t('curriculum.moduleLabel', { index: index + 1 })}
                                        </div>
                                    </div>
                                    
                                    <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                                        {module.description}
                                    </p>
                                    
                                    <div className="flex items-center gap-2">
                                        {isCompleted ? (
                                            <span className="text-green-600 text-sm font-bold flex items-center">
                                                <i className="fas fa-check-circle mr-1"></i> {t('curriculum.completed')}
                                            </span>
                                        ) : isLocked ? (
                                            <span className="text-text-muted text-sm flex items-center">
                                                <i className="fas fa-lock mr-1"></i> {t('curriculum.locked')}
                                            </span>
                                        ) : (
                                            <div className="flex gap-2 w-full">
                                                <Button 
                                                    size="sm" 
                                                    className="flex-1"
                                                    disabled={loadingModuleId === module.id}
                                                >
                                                    {loadingModuleId === module.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <AILoader size="sm" />
                                                            <span>IA travaille...</span>
                                                        </div>
                                                    ) : module.lessonContent ? (
                                                        `▶️ ${t('curriculum.start')}`
                                                    ) : (
                                                        `✨ ${t('curriculum.generateCourse')}`
                                                    )}
                                                </Button>
                                                
                                                {module.lessonContent && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onStartQuiz(module, program.tutorId);
                                                            }}
                                                            title={t('curriculum.practice')}
                                                        >
                                                            <i className="fas fa-dumbbell"></i>
                                                        </Button>
                                                        
                                                        {program.tutorId === 'maitre-leonard' && onDrawingChallenge && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDrawingChallenge(module);
                                                                }}
                                                                title={t('curriculum.drawingChallenge')}
                                                            >
                                                                <i className="fas fa-palette"></i>
                                                            </Button>
                                                        )}

                                                        {program.tutorId === 'maitre-leonard' && onStartTutorial && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="bg-info/10 text-info border-info/20 hover:bg-info/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onStartTutorial(module.title);
                                                                }}
                                                                title={t('curriculum.tutorial')}
                                                            >
                                                                <i className="fas fa-magic"></i>
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                showConfirmation({
                                                                    title: t('curriculum.regenerateTitle'),
                                                                    message: t('curriculum.regenerateConfirm', { title: module.title }),
                                                                    confirmText: t('curriculum.regenerateButton'),
                                                                    variant: 'warning',
                                                                    onConfirm: () => onRegenerateModule(module)
                                                                });
                                                            }}
                                                            title={t('curriculum.regenerateTooltip')}
                                                            disabled={loadingModuleId === module.id}
                                                        >
                                                            <i className={`fas fa-sync ${loadingModuleId === module.id ? 'fa-spin' : ''}`}></i>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
