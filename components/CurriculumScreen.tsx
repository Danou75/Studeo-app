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
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from '../services/chatService';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SuggestedProgram {
    id: string;
    title: string;
    description: string;
    category: string;
}

interface CurriculumScreenProps {
    onBack: () => void;
    programs: StudyProgram[];
    onGenerateContent: (program: StudyProgram, module: StudyModule) => Promise<StudyProgram | undefined>;
    onStartModule: (module: StudyModule, tutorId: string) => void;
    onStartQuiz: (module: StudyModule, tutorId: string) => void;
    onDeleteProgram: (id: string) => void;
    onRenameProgram: (id: string, newTitle: string) => void;
    onDrawingChallenge?: (module: StudyModule) => void;
    onStartTutorial?: (topic: string) => void;
    onNewProgram?: () => void;
    onSuggestedProgram: (topic: string, category: string) => void;
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
    onRenameProgram,
    onSuggestedProgram,
    themeMode, 
    themeStyle 
}) => {
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameProgramId, setRenameProgramId] = useState<string | null>(null);
    const [newTitle, setNewTitle] = useState('');
    const [isRenewingCatalog, setIsRenewingCatalog] = useState(false);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewPreferences, setRenewPreferences] = useState('');
    const [renewStrategy, setRenewStrategy] = useState<'replace' | 'append'>('replace');
    const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('curriculum_view_mode', 'grid');
    const [customSuggestions, setCustomSuggestions] = useLocalStorage<SuggestedProgram[]>('curriculum_suggestions_catalog', []);
    
    const { config } = useAIConfig();
    const { showToast } = useToast();
    const { showConfirmation } = useConfirmation();
    const { t } = useTranslation();
    const [isExporting, setIsExporting] = useState(false);

    const handleRenewCatalog = async (preferences: string = '') => {
        setIsRenewingCatalog(true);
        setShowRenewModal(false);
        try {
            let apiKey = '';
            let modelName = '';
            let apiUrl = '';

            switch (config.provider) {
                case 'gemini':
                    apiKey = config.geminiApiKey || '';
                    modelName = config.geminiModel || '';
                    break;
                case 'openai':
                    apiKey = config.openaiApiKey || '';
                    modelName = config.openaiModel || 'gpt-4o';
                    break;
                case 'anthropic':
                    apiKey = config.anthropicApiKey || '';
                    modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620';
                    break;
                case 'mistral':
                    apiKey = config.mistralApiKey || '';
                    modelName = config.mistralModel || 'mistral-large-latest';
                    break;
                case 'local':
                    apiKey = '';
                    modelName = config.localModelName || '';
                    apiUrl = config.localApiUrl || '';
                    break;
            }

            if (!apiKey && config.provider !== 'local') {
                showToast(`Configuration manquante pour ${config.provider}`, "error");
                setIsRenewingCatalog(false);
                return;
            }

            const systemPrompt = "Tu es un expert en éducation et un concepteur de programmes d'études. Ta mission est de suggérer des parcours d'apprentissage réels, structurés et passionnants. NE PARLE JAMAIS de l'IA ou de la génération.";
            const userPrompt = `Génère 3 suggestions de programmes d'étude thématiques.
Chaque programme doit être un sujet d'apprentissage structuré (ex: "Les bases du piano", "L'histoire de la Rome Antique", "Apprendre le Python").
${preferences.trim() ? `L'utilisateur s'intéresse particulièrement à : "${preferences}"` : "Varie les sujets pour couvrir différents domaines du savoir."}

Format JSON STRICT (tableau d'objets) :
[
  {"titre": "Nom du Parcours (ex: Astrophysique pour débutants)", "description": "Un résumé du parcours et de ce qu'on y apprend.", "categorie": "Sciences"},
  {"titre": "Autre Sujet", "description": "Résumé...", "categorie": "Histoire"},
  {"titre": "Troisième Sujet", "description": "Résumé...", "categorie": "Art"}
]`;

            const responseText = await ChatService.generateAIResponse({
                provider: config.provider,
                apiKey: apiKey || '',
                apiUrl: apiUrl || '',
                modelName: modelName || 'gemini-1.5-flash',
                prompt: userPrompt,
                systemPrompt
            });

            const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBracket = cleanedJson.indexOf('[');
            const lastBracket = cleanedJson.lastIndexOf(']');
            let suggestions = [];
            
            if (firstBracket !== -1 && lastBracket !== -1) {
                suggestions = JSON.parse(cleanedJson.substring(firstBracket, lastBracket + 1));
            } else {
                throw new Error("Format JSON invalide");
            }

            const newItems: SuggestedProgram[] = suggestions.map((s: any) => ({
                id: uuidv4(),
                title: s.titre || s.title || 'Sujet inconnu',
                description: s.description || 'Pas de description disponible',
                category: s.categorie || s.category || 'IA Suggéré'
            }));

            if (renewStrategy === 'replace') {
                setCustomSuggestions(newItems);
            } else {
                setCustomSuggestions(prev => [...newItems, ...prev]);
            }
            showToast(renewStrategy === 'replace' ? "Suggestions renouvelées !" : "Nouvelles suggestions ajoutées !", "success");

        } catch (error: any) {
            console.error("Catalog Renewal Error:", error);
            showToast("Erreur lors du renouvellement des suggestions.", "error");
        } finally {
            setIsRenewingCatalog(false);
        }
    };

    const handleDeleteSuggestion = (id: string, title: string) => {
        if (confirm(`Supprimer la suggestion "${title}" ?`)) {
            setCustomSuggestions(prev => prev.filter(item => item.id !== id));
            showToast(`Suggestion "${title}" supprimée`, 'success');
        }
    };

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
            {/* Ligne des Boutons de Navigation/Action */}
            <div className="relative z-20 flex justify-between items-center mb-6">
                <Button 
                    variant="secondary" 
                    onClick={onBack} 
                    size="sm" 
                    className={`transition-all w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                >
                    <i className="fas fa-home mr-2 text-inherit"></i> Accueil
                </Button>

                {/* Toggle de vue centré */}
                <div className="flex items-center gap-1.5 p-1 bg-black/10 dark:bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-inherit opacity-50 hover:opacity-100'}`}
                        title="Vue Grille"
                    >
                        <i className="fas fa-th-large text-xs"></i>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-inherit opacity-50 hover:opacity-100'}`}
                        title="Vue Liste"
                    >
                        <i className="fas fa-list text-xs"></i>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {onNewProgram && (
                        <Button onClick={onNewProgram} size="sm" className="bg-white/90 hover:bg-white text-primary border-none font-bold shadow-lg transform hover:scale-105 active:scale-95 transition-all">
                            <i className="fas fa-plus mr-2"></i> {t('curriculum.new')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Titres du Header */}
            <div className="relative z-10 flex flex-col">
                <h1 className="text-2xl md:text-3xl font-black drop-shadow-sm flex items-center gap-3 text-inherit">
                    <span className="text-2xl md:text-3xl text-inherit">🗺️</span> {t('curriculum.title')}
                </h1>
                <p className="opacity-80 mt-1 text-base text-inherit">{t('curriculum.subtitle')}</p>
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
                <div className={viewMode === 'list' ? "flex flex-col gap-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                    {programs.map(program => {
                        const tutor = getTutor(program.tutorId);
                        const progress = Math.round((program.modules.filter(m => m.status === 'completed').length / program.modules.length) * 100);

                        return (
                            <div 
                                key={program.id}
                                onClick={() => setSelectedProgram(program)}
                                className={`bg-background border border-border rounded-2xl transition-all cursor-pointer group flex overflow-hidden relative ${
                                    viewMode === 'grid' 
                                        ? 'flex-col shadow-lg hover:shadow-xl hover:border-primary' 
                                        : 'flex-row items-center p-4 gap-4 hover:bg-background-secondary'
                                }`}
                            >
                                {/* Actions Overlay (Grid) or Inline (List) */}
                                <div className={viewMode === 'grid' 
                                    ? "absolute bottom-[70px] right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                    : "flex gap-2 order-last"
                                }>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setRenameProgramId(program.id);
                                            setNewTitle(program.topic);
                                            setIsRenameModalOpen(true);
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
                                                title: "Supprimer le parcours",
                                                message: `Êtes-vous sûr de vouloir supprimer définitivement le parcours "${program.topic}" ?`,
                                                confirmText: "Supprimer",
                                                variant: "danger",
                                                onConfirm: () => onDeleteProgram(program.id)
                                            });
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 shadow-sm border border-border transition-colors focus:ring-2 focus:ring-red-500/20 outline-none"
                                        title="Supprimer"
                                    >
                                        <i className="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>

                                {/* Content */}
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
                                            <div 
                                                className="bg-primary h-full transition-all duration-1000" 
                                                style={{ width: `${progress}%` }}
                                            ></div>
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
            )}

            {/* Section Découvrir & Développer */}
            <div className="mt-16 mb-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-background-secondary/50 p-4 md:p-6 rounded-[2rem] border border-border/50">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-2 text-text-secondary uppercase tracking-tighter">
                            <i className="fas fa-compass text-primary"></i> Découvrir & Développer
                        </h2>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Parcours d'étude suggérés par l'IA</p>
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm"
                            className="rounded-xl py-2 px-4 border-dashed text-[10px] font-bold h-10"
                            onClick={() => setShowRenewModal(true)}
                            disabled={isRenewingCatalog}
                        >
                            {isRenewingCatalog ? <AILoader size="sm" /> : <><i className="fas fa-magic mr-2"></i> Générer des idées</>}
                        </Button>
                    </div>
                </div>

                {customSuggestions.length === 0 ? (
                    <div className="text-center py-12 bg-primary/5 rounded-[2rem] border border-dashed border-primary/20">
                        <p className="text-sm text-text-secondary italic">Cliquez sur "Générer des idées" en haut à droite pour obtenir des suggestions de parcours.</p>
                    </div>
                ) : (
                    <div className={viewMode === 'list' ? "flex flex-col gap-2" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                        {customSuggestions.map(suggestion => (
                            <div 
                                key={suggestion.id}
                                className={`bg-white dark:bg-gray-800 border border-border rounded-2xl transition-all group relative flex ${
                                    viewMode === 'grid' 
                                        ? 'flex-col p-6 hover:shadow-xl' 
                                        : 'flex-row items-center p-4 gap-4 hover:bg-background-secondary'
                                }`}
                            >
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleDeleteSuggestion(suggestion.id, suggestion.title)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 transition-colors"
                                    >
                                        <i className="fas fa-trash-alt text-xs"></i>
                                    </button>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold uppercase rounded mb-3 inline-block">
                                        {suggestion.category}
                                    </span>
                                    <h3 className={`font-bold group-hover:text-primary transition-colors ${viewMode === 'grid' ? 'text-lg mb-2' : 'text-base mb-0'}`}>
                                        {suggestion.title}
                                    </h3>
                                    <p className={`text-xs text-text-muted italic opacity-70 ${viewMode === 'grid' ? 'mb-6 line-clamp-3' : 'line-clamp-1'}`}>
                                        "{suggestion.description}"
                                    </p>
                                </div>

                                <Button 
                                    variant="primary" 
                                    className={viewMode === 'grid' ? "w-full rounded-xl mt-auto" : "rounded-xl px-6 shrink-0"}
                                    onClick={() => onSuggestedProgram(suggestion.title, suggestion.category)}
                                >
                                    <i className="fas fa-magic mr-2"></i> {viewMode === 'grid' ? 'Créer ce parcours' : 'Créer'}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Modal de renommage */}
        {isRenameModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden animate-scale-in">
                    <div className="p-6 border-b border-border">
                        <h3 className="text-xl font-bold">Modifier le nom du parcours</h3>
                    </div>
                    <div className="p-6">
                        <input
                            autoFocus
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newTitle.trim()) {
                                    onRenameProgram(renameProgramId!, newTitle);
                                    setIsRenameModalOpen(false);
                                } else if (e.key === 'Escape') {
                                    setIsRenameModalOpen(false);
                                }
                            }}
                            className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                            placeholder="Nouveau nom du parcours..."
                        />
                    </div>
                    <div className="p-6 bg-background-secondary flex justify-end gap-3">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsRenameModalOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button 
                            disabled={!newTitle.trim()}
                            onClick={() => {
                                onRenameProgram(renameProgramId!, newTitle);
                                setIsRenameModalOpen(false);
                            }}
                        >
                            Enregistrer
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal Preferences de Renouvellement */}
        {showRenewModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border animate-zoom-in">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <i className="fas fa-compass text-xl"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-black">Renouveler les idées</h3>
                            <p className="text-xs text-text-muted">L'IA va suggérer de nouveaux thèmes d'étude.</p>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                            Méthode de génération
                        </label>
                        <div className="flex gap-2 p-1 bg-background-secondary rounded-2xl border border-border">
                            <button
                                onClick={() => setRenewStrategy('replace')}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${renewStrategy === 'replace' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm shadow-primary/10' : 'text-text-muted hover:text-text'}`}
                            >
                                <i className="fas fa-sync-alt mr-2"></i> Remplacer tout
                            </button>
                            <button
                                onClick={() => setRenewStrategy('append')}
                                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${renewStrategy === 'append' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm shadow-primary/10' : 'text-text-muted hover:text-text'}`}
                            >
                                <i className="fas fa-plus mr-2"></i> Ajouter aux existants
                            </button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                            Thèmes préférés (Optionnel)
                        </label>
                        <textarea
                            value={renewPreferences}
                            onChange={(e) => setRenewPreferences(e.target.value)}
                            placeholder="Ex: Programmation, Histoire Médiévale, Cuisine Japonaise..."
                            className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none text-sm min-h-[100px] resize-none transition-all"
                        />
                    </div>

                    <div className="flex gap-3 justify-end">
                        <Button variant="secondary" onClick={() => setShowRenewModal(false)} className="rounded-xl">
                            Annuler
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={() => handleRenewCatalog(renewPreferences)} 
                            className="rounded-xl px-6"
                            loading={isRenewingCatalog}
                        >
                            <i className="fas fa-magic mr-2"></i> Générer
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};
