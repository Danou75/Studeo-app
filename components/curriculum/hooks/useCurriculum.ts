import { useState, useMemo, useEffect } from 'react';
import { StudyProgram, StudyModule, SavedVocabList, Lesson, ConversationSession } from '../../../types';
import { TUTORS } from '../../../constants';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmation } from '../../../contexts/ConfirmationContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useAIConfig } from '../../../contexts/AIConfigContext';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { ChatService } from '../../../services/chatService';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { markdownToRTF } from '../../../utils/rtfExport';
import { v4 as uuidv4 } from 'uuid';

export interface SuggestedProgram {
    id: string;
    title: string;
    description: string;
    category: string;
}

export interface UseCurriculumOptions {
    programs: StudyProgram[];
    lessons?: Lesson[];
    savedConvSessions?: ConversationSession[];
    savedVocabLists?: SavedVocabList[];
    customSuggestions?: any[];
    setCustomSuggestions?: (suggestions: any[] | ((prev: any[]) => any[])) => void;
    onGenerateContent: (program: StudyProgram, module: StudyModule) => Promise<StudyProgram | undefined>;
    onStartModule: (module: StudyModule, tutorId: string) => void;
}

export const useCurriculum = ({
    programs,
    lessons = [],
    savedConvSessions = [],
    savedVocabLists = [],
    customSuggestions: propsCustomSuggestions,
    setCustomSuggestions: propsSetCustomSuggestions,
    onGenerateContent,
    onStartModule
}: UseCurriculumOptions) => {
    const [localSuggestions, setLocalSuggestions] = useLocalStorage<SuggestedProgram[]>('curriculum_suggestions_catalog', []);
    const customSuggestions = (propsCustomSuggestions ? propsCustomSuggestions : localSuggestions) as SuggestedProgram[];
    const setCustomSuggestions = propsSetCustomSuggestions || setLocalSuggestions;

    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameItemId, setRenameItemId] = useState<string | null>(null);
    const [renameType, setRenameType] = useState<'program' | 'lesson' | 'conversation' | 'vocab'>('program');
    const [newTitle, setNewTitle] = useState('');
    
    // Renew Preferences
    const [isRenewingCatalog, setIsRenewingCatalog] = useState(false);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewPreferences, setRenewPreferences] = useState('');
    const [renewStrategy, setRenewStrategy] = useState<'replace' | 'append'>('replace');
    
    const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('curriculum_view_mode', 'grid');
    const [activeTab, setActiveTab] = useLocalStorage<'programs' | 'lessons' | 'conversations' | 'vocabulary'>('curriculum_active_tab', 'programs');
    const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
    const [selectedVocab, setSelectedVocab] = useState<SavedVocabList | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const { config } = useAIConfig();
    const { showToast } = useToast();
    const { showConfirmation } = useConfirmation();
    const { t } = useTranslation();

    const selectedProgram = programs.find(p => p.id === selectedProgramId) || null;
    const setSelectedProgram = (prog: StudyProgram | null) => setSelectedProgramId(prog?.id || null);

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
                modelName: modelName || 'gemini-2.5-flash',
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
                setCustomSuggestions((prev: SuggestedProgram[]) => [...newItems, ...prev]);
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
            setCustomSuggestions((prev: SuggestedProgram[]) => prev.filter((item: SuggestedProgram) => item.id !== id));
            showToast(`Suggestion "${title}" supprimée`, 'success');
        }
    };

    const handleExportProgram = async (format: 'md' | 'rtf', tutorName?: string) => {
        if (!selectedProgram || isExporting) return;
        setIsExporting(true);

        try {
            let markdown = `# Programme d'étude : ${selectedProgram.topic}\n\n`;
            markdown += `**Niveau :** ${selectedProgram.targetLevel}\n`;
            if (tutorName) markdown += `**Tuteur :** ${tutorName}\n\n`;

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

    const cleanupMarkdownForShare = (text: string) => {
        return text
            .replace(/^#+ (.*)$/gm, (_, p1) => p1.toUpperCase())
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/^- (.*)$/gm, '• $1')
            .trim();
    };

    const handleShare = async () => {
        if (!selectedProgram) return;

        let shareText = `${selectedProgram.topic.toUpperCase()}\nNIVEAU : ${selectedProgram.targetLevel.toUpperCase()}\n\n`;
        
        selectedProgram.modules.forEach((module, index) => {
            shareText += `--- MODULE ${index + 1} : ${module.title.toUpperCase()} ---\n`;
            if (module.description) shareText += `${cleanupMarkdownForShare(module.description)}\n`;
            if (module.lessonContent) {
                const cleanLesson = cleanupMarkdownForShare(module.lessonContent);
                shareText += `\nEXTRAIT DU CONTENU :\n${cleanLesson.substring(0, 500)}${cleanLesson.length > 500 ? '...' : ''}\n`;
            }
            shareText += `\n`;
        });

        shareText += `--------------------------\nPartagé via Studeo`;

        const shareData = {
            title: selectedProgram.topic,
            text: shareText,
        };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Erreur de partage:', err);
                    showToast("Erreur lors du partage", "error");
                }
            }
        } else {
            showToast("Le partage n'est pas supporté sur cet appareil", "info");
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

    // Deriving tutors who have actual content in the curriculum based on the active tab
    const tutorsWithContent = useMemo(() => {
        return TUTORS.filter(tutor => {
            switch (activeTab) {
                case 'programs':
                    return programs.some(p => p.tutorId === tutor.id);
                case 'lessons':
                    return lessons.some(l => l.tutorId === tutor.id && l.source !== 'curriculum');
                case 'conversations':
                    return savedConvSessions.some(s => s.tutorId === tutor.id);
                case 'vocabulary':
                    return savedVocabLists.some(v => v.tutorId === tutor.id);
                default:
                    return false;
            }
        });
    }, [programs, lessons, savedConvSessions, savedVocabLists, activeTab]);

    // Intelligent Filter Reactivity: Reset if selected tutor is no longer available
    useEffect(() => {
        if (selectedTutorId && !tutorsWithContent.some(t => t.id === selectedTutorId)) {
            setSelectedTutorId(null);
        }
    }, [tutorsWithContent, selectedTutorId]);

    // Centralized Filtered Content
    const filteredPrograms = useMemo(() => 
        selectedTutorId ? programs.filter(p => p.tutorId === selectedTutorId) : programs
    , [programs, selectedTutorId]);

    const filteredLessons = useMemo(() => {
        const base = selectedTutorId ? lessons.filter(l => l.tutorId === selectedTutorId) : lessons;
        return base.filter(l => l.source !== 'curriculum');
    }, [lessons, selectedTutorId]);

    const filteredSavedConvSessions = useMemo(() => 
        selectedTutorId ? savedConvSessions.filter(s => s.tutorId === selectedTutorId) : savedConvSessions
    , [savedConvSessions, selectedTutorId]);

    const filteredSavedVocabLists = useMemo(() => 
        selectedTutorId ? savedVocabLists.filter(v => v.tutorId === selectedTutorId) : savedVocabLists
    , [savedVocabLists, selectedTutorId]);

    const openRenameModal = (type: 'program' | 'lesson' | 'conversation' | 'vocab', id: string, currentTitle: string) => {
        setRenameItemId(id);
        setRenameType(type);
        setNewTitle(currentTitle);
        setIsRenameModalOpen(true);
    };

    return {
        // State
        selectedProgram,
        setSelectedProgram,
        loadingModuleId,
        customSuggestions,
        viewMode,
        setViewMode,
        activeTab,
        setActiveTab,
        selectedTutorId,
        setSelectedTutorId,
        tutorsWithContent,
        filteredPrograms,
        filteredLessons,
        filteredSavedConvSessions,
        filteredSavedVocabLists,
        selectedVocab,
        setSelectedVocab,
        isExporting,
        
        // Rename Modal State
        isRenameModalOpen,
        setIsRenameModalOpen,
        renameItemId,
        renameType,
        newTitle,
        setNewTitle,
        openRenameModal,

        // Renew Modal State
        showRenewModal,
        setShowRenewModal,
        isRenewingCatalog,
        renewPreferences,
        setRenewPreferences,
        renewStrategy,
        setRenewStrategy,

        // Handlers
        handleRenewCatalog,
        handleDeleteSuggestion,
        handleExportProgram,
        handleShare,
        handleModuleClick,
    };
};
