import React, { useState } from 'react';
import { StudyProgram, StudyModule } from '../types';
import { Button } from './ui/Button';
import { ThemeStyle, ThemeMode, getThemeGradient } from '../constants/themes';
import { TUTORS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { AILoader } from './AILoader';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useTranslation } from '../contexts/LanguageContext';

import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { markdownToRTF } from '../utils/rtfExport';

interface CurriculumScreenProps {
    onBack: () => void;
    programs: StudyProgram[];
    onGenerateContent: (program: StudyProgram, module: StudyModule) => Promise<StudyProgram | undefined>;
    onStartModule: (module: StudyModule, tutorId: string) => void;
    onStartQuiz: (module: StudyModule, tutorId: string) => void;
    onDeleteProgram: (id: string) => void;
    onDrawingChallenge?: (module: StudyModule) => void;
    onStartTutorial?: (topic: string) => void;
    onNewProgram?: () => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({ 
    onBack, 
    programs,
    onGenerateContent,
    onStartModule,
    onStartQuiz,
    onDeleteProgram,
    onDrawingChallenge,
    onStartTutorial,
    onNewProgram,
    themeMode, 
    themeStyle 
}) => {
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null);
    const { showToast } = useToast();
    const { showConfirmation } = useConfirmation();
    const { t } = useTranslation();
    const [isExporting, setIsExporting] = useState(false);

    const selectedProgram = programs.find(p => p.id === selectedProgramId) || null;
    const setSelectedProgram = (prog: StudyProgram | null) => setSelectedProgramId(prog?.id || null);

    const getTutor = (tutorId: string) => TUTORS.find(t => t.id === tutorId);

    const handleExportProgram = async (format: 'md' | 'rtf') => {
        if (!selectedProgram || isExporting) return;
        setIsExporting(true);

        try {
            let markdown = `# Programme d'étude : ${selectedProgram.topic}\n\n`;
            markdown += `**Niveau :** ${selectedProgram.targetLevel}\n`;
            const tutor = getTutor(selectedProgram.tutorId);
            if (tutor) markdown += `**Tuteur :** ${tutor.name}\n\n`;

            selectedProgram.modules.forEach((module, index) => {
                markdown += `## Module ${index + 1} : ${module.title}\n\n`;
                markdown += `${module.description}\n\n`;
                if (module.lessonContent) {
                    markdown += `### Contenu de la leçon\n\n${module.lessonContent}\n\n`;
                }
            });

            // @ts-ignore
            if (window.__TAURI_IPC__) {
                const baseName = selectedProgram.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filePath = await save({
                    defaultPath: `programme_${baseName}.${format}`,
                    filters: [{ name: format === 'md' ? 'Markdown' : 'Rich Text Format', extensions: [format] }]
                });

                if (filePath) {
                    const finalContent = format === 'md' ? markdown : markdownToRTF(markdown, selectedProgram.topic);
                    await writeTextFile(filePath, finalContent);
                    showToast(`Succès ! Programme exporté en .${format}`, 'success');
                }
            } else {
                const finalContent = format === 'md' ? markdown : markdownToRTF(markdown, selectedProgram.topic);
                const blob = new Blob([finalContent], { type: format === 'md' ? 'text/markdown' : 'application/rtf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `programme_${selectedProgram.topic.replace(/\s+/g, '_')}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(`Fichier .${format} généré !`, 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            showToast('Erreur lors de l\'exportation', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleModuleClick = async (module: StudyModule) => {
        if (loadingModuleId) return;

        if (module.status === 'locked') {
            showToast(t('curriculum.moduleLocked'), 'warning');
            return;
        }
        
        if (module.status === 'unlocked' && !module.lessonContent) {
            showConfirmation({
                title: t('curriculum.generateTitle'),
                message: t('curriculum.generateConfirm', { title: module.title }),
                confirmText: t('curriculum.generateButton'),
                variant: 'info',
                onConfirm: async () => {
                    setLoadingModuleId(module.id);
                    try {
                        await onGenerateContent(selectedProgram!, module);
                    } finally {
                        setLoadingModuleId(null);
                    }
                }
            });
        } else {
            if (selectedProgram) {
                onStartModule(module, selectedProgram.tutorId);
            }
        }
    };

    if (selectedProgram) {
        const tutor = getTutor(selectedProgram.tutorId);

        return (
            <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative">
                {/* Header Programme */}
                <div 
                    className={`transition-all duration-500 p-3 md:p-6 shadow-lg relative overflow-hidden shrink-0 ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                    style={{ background: getThemeGradient(themeStyle, themeMode) }}
                >
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <Button 
                                variant="secondary" 
                                onClick={() => setSelectedProgram(null)} 
                                size="sm" 
                                className={`transition-all mb-2 md:mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                            >
                                <i className="fas fa-arrow-left mr-2 text-inherit"></i> {t('curriculum.backToList')}
                            </Button>

                            <div className="flex gap-2 items-center">
                                <div className="flex gap-1 bg-white/10 p-1 rounded-xl border border-white/20 backdrop-blur-sm shadow-inner">
                                    <button 
                                        onClick={() => handleExportProgram('md')}
                                        disabled={isExporting}
                                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/5 text-primary' : 'hover:bg-white/20 text-white'}`}
                                        title="Markdown"
                                    >
                                        {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fab fa-markdown"></i>} <span className="hidden sm:inline">MD</span>
                                    </button>
                                    <div className="w-px h-4 bg-white/20 self-center"></div>
                                    <button 
                                        onClick={() => handleExportProgram('rtf')}
                                        disabled={isExporting}
                                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 rounded-lg flex items-center gap-1.5 transition-all text-white disabled:opacity-50"
                                        title="Word/RTF"
                                    >
                                        {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-file-word"></i>} <span className="hidden sm:inline">RTF</span>
                                    </button>
                                </div>
                                <Button 
                                    variant="secondary"
                                    onClick={() => {
                                        showConfirmation({
                                            title: t('curriculum.deleteTitle'),
                                            message: t('curriculum.deleteConfirm'),
                                            confirmText: t('common.delete'),
                                            variant: 'danger',
                                            onConfirm: () => {
                                                onDeleteProgram(selectedProgram.id);
                                                setSelectedProgram(null);
                                            }
                                        });
                                    }}
                                    size="sm"
                                    className="bg-red-500/20 hover:bg-red-500/40 text-white border-transparent backdrop-blur-sm shadow-inner rounded-xl h-10 w-10 p-0 flex items-center justify-center"
                                    title={t('curriculum.deleteTitle')}
                                >
                                    <i className="fas fa-trash"></i>
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="text-4xl bg-white/20 p-2.5 rounded-2xl backdrop-blur-md shadow-inner">
                                {tutor?.emoji || '🎓'}
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black drop-shadow-sm">{selectedProgram.topic}</h1>
                                <div className="flex items-center gap-2 mt-1 opacity-90">
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                        {selectedProgram.targetLevel}
                                    </span>
                                    <span className="text-sm font-medium">{t('curriculum.withTutor', { name: tutor?.name })}</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* ProgressBar */}
                        <div className="mt-6 bg-black/20 rounded-full h-1.5 w-full overflow-hidden">
                            <div 
                                className="bg-white h-full rounded-full transition-all duration-1000"
                                style={{ width: `${(selectedProgram.modules.filter(m => m.status === 'completed').length / selectedProgram.modules.length) * 100}%` }}
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
                        {selectedProgram.modules.map((module, index) => {
                            const isLocked = module.status === 'locked';
                            const isCompleted = module.status === 'completed';
                            const isUnlocked = module.status === 'unlocked';
                            
                            return (
                                <div 
                                    key={module.id} 
                                    className={`relative transition-all duration-300 ${isLocked ? 'opacity-50 grayscale' : 'hover:scale-[1.02]'}`}
                                    onClick={() => handleModuleClick(module)}
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
                                                                    onStartQuiz(module, selectedProgram.tutorId);
                                                                }}
                                                                title={t('curriculum.practice')}
                                                            >
                                                                <i className="fas fa-dumbbell"></i>
                                                            </Button>
                                                            
                                                            {selectedProgram.tutorId === 'maitre-leonard' && onDrawingChallenge && (
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

                                                            {selectedProgram.tutorId === 'maitre-leonard' && onStartTutorial && (
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
                                                                        onConfirm: () => {
                                                                            setLoadingModuleId(module.id);
                                                                            onGenerateContent(selectedProgram, module).then(() => {
                                                                                setLoadingModuleId(null);
                                                                            });
                                                                        }
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
    }

    // VUE LISTE DES PROGRAMMES
    return (
    <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative">
        {/* Header */}
        <div 
            className={`transition-all duration-500 p-3 md:p-6 shadow-lg relative overflow-hidden shrink-0 ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
            style={{ background: getThemeGradient(themeStyle, themeMode) }}
        >
            <div className="relative z-10 flex justify-between items-start">
                <div className="flex flex-col">
                    <Button 
                        variant="secondary" 
                        onClick={onBack} 
                        size="sm" 
                        className={`transition-all mb-2 md:mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                    >
                        <i className="fas fa-home mr-2 text-inherit"></i> Accueil
                    </Button>
                    <h1 className="text-2xl md:text-3xl font-black drop-shadow-sm flex items-center gap-3 text-inherit">
                        <span className="text-2xl md:text-3xl text-inherit">🗺️</span> {t('curriculum.title')}
                    </h1>
                    <p className="opacity-80 mt-1 text-base text-inherit">{t('curriculum.subtitle')}</p>
                </div>
                {onNewProgram && (
                    <Button onClick={onNewProgram} size="sm" className="bg-white/90 hover:bg-white text-primary border-none font-bold shadow-lg transform hover:scale-105 active:scale-95 transition-all">
                        <i className="fas fa-plus mr-2"></i> {t('curriculum.new')}
                    </Button>
                )}
            </div>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-y-auto min-h-0 pb-32">

            {programs.length === 0 ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {programs.map(program => {
                        const tutor = getTutor(program.tutorId);
                        const progress = Math.round((program.modules.filter(m => m.status === 'completed').length / program.modules.length) * 100);

                        return (
                            <div 
                                key={program.id}
                                onClick={() => setSelectedProgram(program)}
                                className="bg-background rounded-xl shadow-lg border border-border hover:shadow-xl hover:border-primary transition-all cursor-pointer group flex flex-col overflow-hidden"
                            >
                                <div className="p-6 flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="text-4xl bg-background-secondary w-16 h-16 flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                                            {tutor?.emoji || '🎓'}
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary`}>
                                            {program.targetLevel}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                        {program.topic}
                                    </h3>
                                    <p className="text-sm text-text-muted mb-4">
                                        {t('curriculum.withTutor', { name: tutor?.name })}
                                    </p>
                                    
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>{t('curriculum.progressLabel')}</span>
                                            <span className="font-bold">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-background-tertiary rounded-full h-2">
                                            <div 
                                                className="bg-primary h-2 rounded-full transition-all" 
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-background-secondary p-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wider group-hover:bg-primary group-hover:text-white transition-colors">
                                    {t('curriculum.continue')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
    );
};
