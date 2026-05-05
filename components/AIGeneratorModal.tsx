import React, { useState } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { readTextFile, readBinaryFile } from '@tauri-apps/api/fs';
import { AIGenerationConfig, Flashcard, Lesson, StudyProgram, AIGenerationLevel } from '../types';
import { generateFlashcardsWithAI } from '../services/aiCardGenerator';
import { generateLessonWithAI } from '../services/aiLessonGenerator';
import { generateStudyProgram } from '../services/curriculumService';
import { getYouTubeTranscript } from '../services/youtubeService';
import { Button } from './ui/Button';
import { useAIConfig } from '../contexts/AIConfigContext';
import { getThemeGradient } from '../constants/themes';
import { TUTORS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { AILoader } from './ui/AILoader';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { FloatingHeaderToggle } from './ui/FloatingHeaderToggle';

interface AIGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCardsGenerated: (cards: Flashcard[]) => void;
    onCreateSet?: (name: string, cards: Flashcard[]) => void;
    onAddCards?: (cards: Flashcard[]) => void;
    onLessonGenerated?: (lesson: Lesson) => void;
    onCurriculumGenerated?: (program: StudyProgram) => void;
    availableLanguages: string[];
    initialTopic?: string;
    initialMode?: 'quiz' | 'lesson' | 'curriculum' | 'mixed-quiz' | undefined;
    initialContext?: string;
    onShowSavedLessons?: () => void;
    onNavigateToSettings?: () => void;
    guestTutors?: any[];
    initialTutor?: any;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
    isOpen,
    onClose,
    onCardsGenerated,
    onCreateSet,
    onAddCards,
    onLessonGenerated,
    onCurriculumGenerated,
    availableLanguages,
    initialTopic = '',
    initialMode,
    initialContext = '',
    onShowSavedLessons,
    onNavigateToSettings,
    guestTutors = [],
    initialTutor
}) => {
    const [generationType, setGenerationType] = useState<'quiz' | 'lesson' | 'curriculum' | 'mixed-quiz'>('quiz');
    const [topic, setTopic] = useState('');
    const [setName, setSetName] = useState('');
    const [isNewSet, setIsNewSet] = useState(true);
    const [sourceLang, setSourceLang] = useState('fr');
    const { showToast } = useToast();
    const { t } = useTranslation();
    const { themeMode, themeStyle } = useTheme();
    const { showHeader, toggleHeader } = useCollapsibleHeader();

    const { config, setSelectedTutor } = useAIConfig();

    // Synchronisation du tuteur si fourni initialement (ex: retour d'une causerie spécifique)
    React.useEffect(() => {
        if (initialTutor && (!config.selectedTutor || config.selectedTutor.id !== initialTutor.id)) {
            setSelectedTutor(initialTutor);
        }
    }, [initialTutor, config.selectedTutor?.id, setSelectedTutor]);

    const isLanguageTutor = !config.selectedTutor || config.selectedTutor.category === 'languages';

    React.useEffect(() => {
        const tutor = config.selectedTutor;
        
        if (tutor && tutor.category === 'languages' && tutor.language) {
            if (generationType === 'quiz' || generationType === 'mixed-quiz') {
                // Pour un quiz : On apprend la langue cible (ex: FR -> IT)
                setSourceLang('fr');
                setTargetLang(tutor.language);
            } else {
                // Pour un cours ou programme : On rédige en français, mais la langue CIBLE reste celle du prof
                setSourceLang('fr');
                setTargetLang(tutor.language);
            }
        } else {
            // Pour les autres tuteurs ou sans tuteur, tout en français par défaut
            setSourceLang('fr');
            setTargetLang('fr');
        }
    }, [config.selectedTutor, generationType]);
    
    
    React.useEffect(() => {
        if (isOpen) {
            if (initialTopic) setTopic(initialTopic);
            if (initialMode) setGenerationType(initialMode);
            if (initialContext) setContext(initialContext);
        }
    }, [isOpen, initialTopic, initialMode, initialContext]);
    
    const [targetLang, setTargetLang] = useState('en');
    const [count, setCount] = useState(10);
    const [difficulty, setDifficulty] = useState<AIGenerationLevel>('intermediate');
    const [context, setContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [inputType, setInputType] = useState<'text' | 'file' | 'image' | 'media' | 'transcript'>('text');
    const [transcriptText, setTranscriptText] = useState('');
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [fileBase64, setFileBase64] = useState<string | null>(null);
    const [fileMimeType, setFileMimeType] = useState<string>('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
    
    const [mediaType, setMediaType] = useState<'url' | 'file'>('url');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaBase64, setMediaBase64] = useState<string | null>(null);
    const [mediaMimeType, setMediaMimeType] = useState<string>('');

    const [isFormDirty, setIsFormDirty] = useState(false);

    // Persistence des champs (Brouillon)
    React.useEffect(() => {
        const saved = localStorage.getItem('ai_generator_draft');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // On charge le brouillon si : 
                // 1. Aucune valeur initiale n'est fournie via les props
                // 2. OU si le brouillon était basé sur le même initialTopic (reprise de session Labo)
                const isResumeSession = initialTopic && data.initialTopicSource === initialTopic;
                
                if (isResumeSession || !initialTopic) {
                    if (data.topic) setTopic(data.topic);
                    if (data.context) setContext(data.context);
                    if (data.generationType) setGenerationType(data.generationType);
                    if (data.count) setCount(data.count);
                    if (data.difficulty) setDifficulty(data.difficulty);
                    if (data.sourceLang) setSourceLang(data.sourceLang);
                    if (data.targetLang) setTargetLang(data.targetLang);
                }
            } catch (e) {
                console.error("Failed to load AI Generator draft", e);
            }
        }
        // Attendre un peu pour que les états soient stables avant d'activer la sauvegarde
        setTimeout(() => setIsFormDirty(true), 1000);
    }, []);

    React.useEffect(() => {
        if (!isFormDirty) return;
        const draft = { 
            topic, count, difficulty, context, sourceLang, targetLang, generationType,
            initialTopicSource: initialTopic 
        };
        localStorage.setItem('ai_generator_draft', JSON.stringify(draft));
    }, [topic, count, difficulty, context, sourceLang, targetLang, generationType, isFormDirty, initialTopic]);
    
    // ... (rest of useEffects) ...



    React.useEffect(() => {
        if (topic) {
            const cleanTopic = topic.trim();
            if (cleanTopic) {
                const langInfo = `${sourceLang.toUpperCase()}-${targetLang.toUpperCase()}`;
                setSetName(`${cleanTopic} (${langInfo})`);
            }
        }
    }, [topic, sourceLang, targetLang]);
    


    const handleFileSelect = async () => {
        try {
            // @ts-ignore
            if (!window.__TAURI_IPC__) {
                showToast(t('ai.errors.desktopOnly'), 'warning');
                return;
            }

            const selected = await open({
                multiple: false,
                filters: [{
                    name: t('files.text'),
                    extensions: ['txt', 'md', 'json', 'csv', 'pdf']
                }]
            });

            if (selected && typeof selected === 'string') {
                setSelectedFilePath(selected);
                const fileName = selected.split(/[\\/]/).pop();
                if (fileName) setTopic(fileName);

                if (selected.toLowerCase().endsWith('.pdf')) {
                    const contents = await readBinaryFile(selected);
                    let binary = '';
                    const bytes = new Uint8Array(contents);
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = window.btoa(binary);
                    setFileBase64(base64);
                    setFileMimeType('application/pdf');
                    setFileContent('');
                } else {
                    const content = await readTextFile(selected);
                    setFileContent(content);
                    setFileBase64(null);
                    setFileMimeType('');
                }
            }
        } catch (err) {
            console.error("Erreur lecture fichier:", err);
            setError(t('ai.errors.invalidFile'));
        }
    };

    const handleImageSelect = async () => {
        try {
            // @ts-ignore
            if (!window.__TAURI_IPC__) {
                showToast(t('ai.errors.desktopOnly'), 'warning');
                return;
            }

            const selected = await open({
                multiple: false,
                filters: [{
                    name: t('files.images'),
                    extensions: ['png', 'jpg', 'jpeg', 'webp', 'pdf']
                }]
            });

            if (selected && typeof selected === 'string') {
                setSelectedFilePath(selected);
                const contents = await readBinaryFile(selected);
                
                // Convert Uint8Array to Base64
                let binary = '';
                const bytes = new Uint8Array(contents);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = window.btoa(binary);
                
                setImageBase64(base64);
                
                // Determine mime type
                const ext = selected.toLowerCase().split('.').pop();
                let mime = 'image/jpeg';
                if (ext === 'png') mime = 'image/png';
                else if (ext === 'webp') mime = 'image/webp';
                else if (ext === 'pdf') mime = 'application/pdf';
                
                setImageMimeType(mime);
                
                const fileName = selected.split(/[\\/]/).pop();
                if (fileName) setTopic(fileName.split('.')[0]); // Remove extension
            }
        } catch (err) {
            console.error("Erreur lecture image:", err);
            setError(t('ai.errors.imageRead'));
        }
    };

    const handleMediaSelect = async () => {
        try {
            // @ts-ignore
            if (!window.__TAURI_IPC__) {
                showToast(t('ai.errors.desktopOnly'), 'warning');
                return;
            }

            const selected = await open({
                multiple: false,
                filters: [{
                    name: t('files.media'),
                    extensions: ['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'mov', 'webm']
                }]
            });

            if (selected && typeof selected === 'string') {
                setSelectedFilePath(selected);
                const contents = await readBinaryFile(selected);
                
                // Convert Uint8Array to Base64
                let binary = '';
                const bytes = new Uint8Array(contents);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = window.btoa(binary);
                
                setMediaBase64(base64);
                
                // Guess mime type
                const ext = selected.split('.').pop()?.toLowerCase();
                let mime = 'audio/mp3';
                if (['mp4', 'mov', 'webm'].includes(ext || '')) mime = `video/${ext}`;
                else if (['wav'].includes(ext || '')) mime = 'audio/wav';
                else if (['m4a'].includes(ext || '')) mime = 'audio/mp4';
                
                setMediaMimeType(mime);
                
                const fileName = selected.split(/[\\/]/).pop();
                if (fileName) setTopic(fileName.split('.')[0]); 
            }
        } catch (err) {
            console.error("Erreur lecture média:", err);
            setError(t('ai.errors.mediaRead'));
        }
    };
    
    const handleGenerate = async () => {
        // Validation dynamique des clés
        let apiKey = '';
        let modelName = '';
        let apiUrl = '';

        if (config.provider === 'gemini') {
            apiKey = config.geminiApiKey;
            modelName = config.geminiModel;
            if (!apiKey?.trim()) { setError(t('ai.config.geminiKey')); return; }
        } else if (config.provider === 'openai') {
            apiKey = config.openaiApiKey || '';
            modelName = config.openaiModel || 'gpt-4o';
            if (!apiKey?.trim()) { setError(t('ai.config.openaiKey')); return; }
        } else if (config.provider === 'anthropic') {
            apiKey = config.anthropicApiKey || '';
            modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620';
            if (!apiKey?.trim()) { setError(t('ai.config.anthropicKey')); return; }
        } else if (config.provider === 'mistral') {
            apiKey = config.mistralApiKey || '';
            modelName = config.mistralModel || 'mistral-large-latest';
            if (!apiKey?.trim()) { setError(t('ai.config.mistralKey')); return; }
        } else if (config.provider === 'local') {
            apiUrl = config.localApiUrl;
            modelName = config.localModelName;
            if (!apiUrl?.trim()) { setError(t('ai.config.localUrl')); return; }
        }
        
        if (!topic.trim()) {
            setError(t('ai.errors.noTopicTitle'));
            return;
        }

        if (inputType === 'file' && !fileContent && !fileBase64) {
            setError(t('ai.errors.invalidFile'));
            return;
        }

        if (inputType === 'image' && !imageBase64) {
            setError(t('ai.errors.invalidImage'));
            return;
        }

        if (inputType === 'media') {
            if (mediaType === 'url' && !mediaUrl.trim()) {
                setError(t('ai.errors.invalidUrl'));
                return;
            }
            if (mediaType === 'file' && !mediaBase64) {
                setError(t('ai.errors.invalidMedia'));
                return;
            }
        }

        if (inputType === 'transcript' && !transcriptText.trim()) {
            setError(t('ai.errors.noTopic')); // Or a more specific error
            return;
        }

        setIsGenerating(true);
        setError(null);

        let fullContext = context.trim();
        let youtubeTranscript = null;

        if (inputType === 'media' && mediaType === 'url' && mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be')) {
            try {
                youtubeTranscript = await getYouTubeTranscript(mediaUrl);
            } catch (ytErr) {
                console.error("Failed to get YT transcript:", ytErr);
            }
        }
        if (inputType === 'file' && fileContent) {
            fullContext = `
DOCUMENTS SOURCE FOURNIS PAR L'UTILISATEUR (Fichier: ${selectedFilePath}) :
--- DÉBUT DU CONTENU FICHIER ---
${fileContent.slice(0, 50000)} 
--- FIN DU CONTENU FICHIER ---

INSTRUCTION : Utilise ce contenu comme source de vérité principale pour générer le contenu demandé.
CONTEXTE SUPPLÉMENTAIRE : ${context}
            `.trim();
        } else if (inputType === 'transcript' && transcriptText) {
            fullContext = `
TRANSCRIPT FOURNI PAR L'UTILISATEUR :
--- DÉBUT DU TRANSCRIPT ---
${transcriptText}
--- FIN DU TRANSCRIPT ---

INSTRUCTION : Utilise ce texte comme source unique de vérité. Ne pas halluciner d'informations non présentes.
CONTEXTE SUPPLÉMENTAIRE : ${context}
            `.trim();
        }

        if (inputType === 'media' && mediaType === 'url') {
             fullContext = `
DOCUMENTS SOURCE (URL Média) : ${mediaUrl}
${youtubeTranscript ? `--- TRANSCRIPTION YOUTUBE (Auto-extraite) ---
${youtubeTranscript}
--- FIN TRANSCRIPTION ---` : ''}
INSTRUCTION : Ce lien pointe vers une vidéo ou un podcast. Utilise ce contenu (si accessible) ou son sujet comme base.
CONTEXTE UTILISATEUR : ${context}
            `.trim();
        } else if (inputType === 'media' && mediaType === 'file') {
             // Enhance prompt for Multimodal or Rich Context
            const mediaConfig = (inputType === 'media' && mediaType === 'file' && mediaBase64) ? {
                data: mediaBase64,
                mimeType: mediaMimeType,
                name: selectedFilePath || undefined
            } : undefined;

            if (mediaConfig || (fullContext && fullContext.includes('DOCUMENTS SOURCE'))) {
                fullContext = `
DOCUMENTS SOURCES (Analyse requise) : L'utilisateur a fourni un fichier ou une transcription.
INSTRUCTION PRIORITAIRE : Analyse les données jointes ou le contexte technique fourni ci-dessous. Le cours doit être basé sur le contenu de ces sources de vérité (résumé, explication, correction d'exercice, etc.). Ne te fie pas uniquement au titre du sujet si les sources fournissent des détails divergents (évite les hallucinations basées sur le titre).

${fullContext}`;
            } else {
                // Le fichier est passé via aiConfig.media, on ajoute juste une note au contexte
                fullContext = `
INSTRUCTION : Un fichier audio/vidéo est joint à cette requête. Analyse-le pour générer le contenu.
CONTEXTE UTILISATEUR : ${context}
                `.trim();
            }
        }

        const aiConfig: AIGenerationConfig = {
            topic: topic.trim(),
            sourceLang,
            targetLang,
            count: (generationType === 'quiz' || generationType === 'mixed-quiz') ? count : 1,
            difficulty,
            isMixed: generationType === 'mixed-quiz',
            context: fullContext || undefined,
            provider: config.provider,
            apiKey, 
            modelName,
            apiUrl,
            image: undefined, // Route via media to preserve mimeType
            media: (inputType === 'media' && mediaType === 'file' && mediaBase64) ? {
                data: mediaBase64,
                mimeType: mediaMimeType,
                name: selectedFilePath || undefined
            } : (inputType === 'file' && fileBase64) ? {
                 data: fileBase64,
                 mimeType: fileMimeType,
                 name: selectedFilePath || undefined
            } : (inputType === 'image' && imageBase64) ? {
                data: imageBase64,
                mimeType: imageMimeType,
                name: selectedFilePath || undefined
            } : undefined
        };

        try {
            const tutorId = config.selectedTutor?.id;
            
            if (generationType === 'lesson') {
                if (!tutorId) throw new Error(t('ai.errors.noTutorLesson'));
                if (!onLessonGenerated) throw new Error(t('ai.errors.lessonNotSupported'));
                
                const lesson = await generateLessonWithAI(aiConfig, tutorId);
                onLessonGenerated(lesson);
            } else if (generationType === 'curriculum') {
                 if (!config.selectedTutor) throw new Error(t('ai.errors.noTutorCurriculum'));
                 if (!onCurriculumGenerated) throw new Error(t('ai.errors.curriculumNotConnected'));

                 const program = await generateStudyProgram(
                    config.selectedTutor,
                    topic,
                    difficulty, // On utilise difficulty comme "Niveau cible"
                    config.provider,
                    apiKey,
                    modelName,
                    apiUrl,
                    (inputType === 'media' && mediaType === 'file' && mediaBase64) ? { data: mediaBase64, mimeType: mediaMimeType } : undefined
                 );
                 onCurriculumGenerated(program);
            } else if (generationType === 'quiz' || generationType === 'mixed-quiz') {
                const generatedCards = await generateFlashcardsWithAI(aiConfig, tutorId);
                
                if (isNewSet && onCreateSet && setName.trim()) {
                    onCreateSet(setName.trim(), generatedCards);
                    showToast(t('conjugator.createSuccess', { count: generatedCards.length, name: setName.trim() }), 'success');
                } else if (onAddCards) {
                     onAddCards(generatedCards);
                     showToast(t('conjugator.addSuccess', { count: generatedCards.length }), 'success');
                } else {
                     onCardsGenerated(generatedCards);
                }
            }
            
            setTopic('');
            setContext('');
            setCount(10);
            
        } catch (err) {
            console.error("Erreur capturée dans le modal:", err);
            if (err instanceof Error) {
                setError(err.message);
            } else if (typeof err === 'string') {
                setError(err);
            } else {
                setError(t('ai.errors.unknown'));
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleResetForm = () => {
        setTopic('');
        setContext('');
        setCount(10);
        setDifficulty('intermediate');
        setSetName('');
        setInputType('text');
        setSelectedFilePath(null);
        setTranscriptText('');
        showToast(t('common.reset') || 'Champs réinitialisés', 'info');
    };

    if (!isOpen) return null;

    return (
        <div className="flex-1 min-h-0 flex flex-col text-text overflow-hidden">
            {/* Bouton flottant toggle */}
            <FloatingHeaderToggle showHeader={showHeader} onToggle={toggleHeader} />

            {/* Header avec gradient — amovible */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
                showHeader ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
            <div 
                className={`pt-safe p-6 transition-all duration-500 group relative ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                {onNavigateToSettings && (
                    <button 
                        onClick={onNavigateToSettings}
                        className="absolute bottom-4 right-6 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 hover:bg-white/10 rounded-xl"
                        title="Paramètres de l'IA"
                    >
                        <i className="fas fa-cog text-inherit"></i>
                    </button>
                )}
                {/* Ligne 1 : Navigation */}
                <div className="relative flex flex-wrap justify-between items-center gap-2 mb-4">
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            onClick={onClose} 
                            size="sm" 
                            className={`${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm relative z-10 transition-all`}
                        >
                            <i className="fas fa-arrow-left mr-1 sm:mr-2"></i>
                            <span className="hidden xs:inline">{t('common.back') || 'Retour'}</span>
                            <span className="xs:hidden">Retour</span>
                        </Button>

                        <Button 
                            variant="secondary"
                            onClick={handleResetForm}
                            size="sm"
                            className={`${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm relative z-10 transition-all font-bold`}
                            title={t('common.reset') || "Réinitialiser les champs"}
                        >
                            <i className="fas fa-undo sm:mr-2"></i>
                            <span className="hidden sm:inline">RAZ</span>
                        </Button>
                    </div>

                    {onShowSavedLessons && (
                        <Button 
                            variant="secondary"
                            onClick={onShowSavedLessons}
                            size="sm"
                            className={`${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm relative z-10 transition-all`}
                        >
                            <i className="fas fa-history mr-1 sm:mr-2"></i>
                            <span className="hidden sm:inline">{t('ai.actions.savedLessons')}</span>
                            <span className="sm:hidden">Historique</span>
                        </Button>
                    )}
                </div>

                {/* Ligne 2 : Titre centré */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold drop-shadow-sm mb-2 text-inherit">
                        {!initialMode ? t('ai.header.generateWithAI') : 
                         initialMode === 'quiz' ? t('ai.header.quizCreator') : 
                         initialMode === 'curriculum' ? t('ai.header.curriculumCreation') : 
                         t('ai.header.aiAssistant')}
                    </h2>
                    
                    <div className="flex flex-col items-center gap-2 mt-2">
                        <label className="text-[10px] opacity-70 uppercase font-black tracking-widest text-inherit">{t('ai.actions.chooseTutor')}</label>
                        <select
                            value={config.selectedTutor?.id || ''}
                            onChange={(e) => {
                                const tutor = [...TUTORS, ...guestTutors].find(t => t.id === e.target.value) || null;
                                setSelectedTutor(tutor);
                            }}
                            className={`border-none rounded-full px-6 py-1.5 text-xs outline-none backdrop-blur-md cursor-pointer transition-all appearance-none text-center min-w-[200px] ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary focus:ring-black/20' : 'bg-white/20 text-white focus:ring-white/50'}`}
                        >
                            <option value="" className="text-gray-800">{t('ai.actions.defaultAssistant')}</option>
                            {TUTORS.map(tutor => (
                                <option key={tutor.id} value={tutor.id} className="text-gray-800">
                                    {tutor.emoji} {tutor.name}
                                </option>
                            ))}
                            {guestTutors.map(tutor => (
                                <option key={tutor.id} value={tutor.id} className="text-gray-800">
                                    {tutor.emoji} {tutor.name} (Invité)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            </div>

            <div className="p-3 md:p-6 flex-1 overflow-y-auto min-h-0 pb-32">
                {/* Grille de sélection du type — 2 colonnes sur mobile */}
                <div className={`grid grid-cols-2 gap-2 md:gap-4 mb-6 ${
                    /* Si un seul mode initial, on réduit à 1 colonne */
                    (initialMode === 'quiz' || initialMode === 'curriculum') ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'
                }`}>
                    {/* Option Quiz */}
                    {(initialMode === 'quiz' || !initialMode) && (
                        <button
                            onClick={() => setGenerationType('quiz')}
                            className={`py-2.5 px-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                generationType === 'quiz'
                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                    : 'border-border bg-background hover:bg-background-secondary text-text-secondary'
                            }`}
                        >
                            <i className="fas fa-layer-group text-lg flex-shrink-0"></i>
                            <div className="text-left min-w-0">
                                <div className="text-xs font-semibold leading-tight">{t('ai.type.quiz')}</div>
                                <div className="text-[10px] opacity-70 leading-tight line-clamp-2">{t('ai.type.quizDesc')}</div>
                            </div>
                        </button>
                    )}

                    {/* Option Quiz Mixte */}
                    {(initialMode === 'quiz' || !initialMode) && (
                        <button
                            onClick={() => setGenerationType('mixed-quiz')}
                            className={`py-2.5 px-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                generationType === 'mixed-quiz'
                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                    : 'border-border bg-background hover:bg-background-secondary text-text-secondary'
                            }`}
                        >
                            <i className="fas fa-random text-lg flex-shrink-0"></i>
                            <div className="text-left min-w-0">
                                <div className="text-xs font-semibold leading-tight">{t('ai.type.mixed')}</div>
                                <div className="text-[10px] opacity-70 leading-tight line-clamp-2">{t('ai.type.mixedDesc')}</div>
                            </div>
                        </button>
                    )}
                    
                    {/* Option Leçon/Cours */}
                    {initialMode !== 'quiz' && (
                        <button
                            onClick={() => setGenerationType('lesson')}
                            className={`py-2.5 px-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                generationType === 'lesson'
                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                    : 'border-border bg-background hover:bg-background-secondary text-text-secondary'
                            }`}
                        >
                            <i className="fas fa-book-open text-lg flex-shrink-0"></i>
                            <div className="text-left min-w-0">
                                <div className="text-xs font-semibold leading-tight">{t('ai.type.lesson')}</div>
                                <div className="text-[10px] opacity-70 leading-tight line-clamp-2">{t('ai.type.lessonDesc')}</div>
                            </div>
                        </button>
                    )}

                    {/* Option Programme */}
                    {(initialMode === 'curriculum' || !initialMode) && (
                        <button
                            onClick={() => setGenerationType('curriculum')}
                            className={`py-2.5 px-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                generationType === 'curriculum'
                                    ? 'border-primary bg-primary/10 text-primary font-bold'
                                    : 'border-border bg-background hover:bg-background-secondary text-text-secondary'
                            }`}
                        >
                            <i className="fas fa-map-signs text-lg flex-shrink-0"></i>
                            <div className="text-left min-w-0">
                                <div className="text-xs font-semibold leading-tight">
                                    {initialMode === 'curriculum' ? t('ai.type.specializedCurriculum') : t('ai.type.curriculum')}
                                </div>
                                <div className="text-[10px] opacity-70 leading-tight line-clamp-2">
                                    {initialMode === 'curriculum' ? t('ai.type.specializedCurriculumDesc') : t('ai.type.curriculumDesc')}
                                </div>
                            </div>
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="bg-info/10 border border-info/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <i className="fas fa-info-circle text-info mt-1"></i>
                            <div className="flex-1 flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-text mb-1">
                                        {t('ai.config.current')}
                                    </p>
                                    <p className="text-sm text-text-secondary">
                                        <strong>{t('ai.config.provider')}</strong> {
                                            config.provider === 'gemini' ? '🔷 Google Gemini' :
                                            config.provider === 'openai' ? '🟢 OpenAI' :
                                            config.provider === 'anthropic' ? '🧠 Anthropic' :
                                            config.provider === 'mistral' ? '🌪️ Mistral AI' :
                                            '🖥️ IA Locale'
                                        }
                                        <span className="ml-2">
                                            • <strong>{t('ai.config.model')}</strong> {
                                                config.provider === 'gemini' ? config.geminiModel :
                                                config.provider === 'openai' ? (config.openaiModel || 'gpt-4o') :
                                                config.provider === 'anthropic' ? (config.anthropicModel || 'claude-3-5-sonnet-20241022') :
                                                config.provider === 'mistral' ? (config.mistralModel || 'mistral-large-latest') :
                                                config.localModelName
                                            }
                                        </span>
                                    </p>
                                    {((config.provider === 'gemini' && !config.geminiApiKey) ||
                                      (config.provider === 'openai' && !config.openaiApiKey) ||
                                      (config.provider === 'anthropic' && !config.anthropicApiKey) ||
                                      (config.provider === 'mistral' && !config.mistralApiKey)) && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                            {t('ai.config.missingKey')}
                                        </p>
                                    )}
                                </div>
                                {onNavigateToSettings && (
                                    <button 
                                        onClick={onNavigateToSettings}
                                        className="text-info/50 hover:text-info transition-colors p-1 text-sm"
                                        title={t('common.settings')}
                                    >
                                        <i className="fas fa-cog"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex border-b border-border mb-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        <div className="flex min-w-full">
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${inputType === 'text' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                            onClick={() => setInputType('text')}
                        >
                            <i className="fas fa-keyboard mr-2"></i> {t('ai.input.text')}
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${inputType === 'file' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                            onClick={() => setInputType('file')}
                        >
                            <i className="fas fa-file-alt mr-2"></i> {t('ai.input.file')}
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${inputType === 'image' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                            onClick={() => setInputType('image')}
                        >
                            <i className="fas fa-image mr-2"></i> {t('ai.input.image')}
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${inputType === 'media' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                            onClick={() => setInputType('media')}
                        >
                            <i className="fas fa-play-circle mr-2"></i> {t('ai.input.media')}
                        </button>
                        <button
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${inputType === 'transcript' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
                            onClick={() => setInputType('transcript')}
                        >
                            <i className="fas fa-quote-right mr-2"></i> {t('ai.input.transcript')}
                        </button>
                        </div>
                    </div>

                    {(inputType === 'file' || inputType === 'image' || (inputType === 'media' && mediaType === 'file')) && (
                        <div className="mb-4">
                            <div 
                                onClick={inputType === 'media' ? handleMediaSelect : (inputType === 'file' ? handleFileSelect : handleImageSelect)}
                                className="border-2 border-dashed border-border hover:border-primary rounded-lg p-6 text-center cursor-pointer transition-colors bg-background-secondary"
                            >
                                {selectedFilePath ? (
                                    <div className="text-primary truncate">
                                        <i className={`fas ${inputType === 'file' ? 'fa-check-circle' : inputType === 'image' ? 'fa-image' : 'fa-file-audio'} text-2xl mb-2`}></i>
                                        <div className="font-bold">{selectedFilePath.split(/[\\/]/).pop()}</div>
                                        <div className="text-xs text-text-muted mt-1 truncate">{selectedFilePath}</div>
                                        {inputType === 'image' && imageBase64 && <div className="mt-2 text-xs text-green-600">{t('ai.input.imageLoaded')}</div>}
                                        {inputType === 'media' && mediaBase64 && <div className="mt-2 text-xs text-green-600">{t('ai.input.mediaLoaded')} ({mediaMimeType})</div>}
                                    </div>
                                ) : (
                                    <div className="text-text-muted">
                                        <i className={`fas ${inputType === 'file' ? 'fa-cloud-upload-alt' : inputType === 'image' ? 'fa-camera-retro' : 'fa-upload'} text-3xl mb-2`}></i>
                                        <p className="font-medium">
                                            {inputType === 'file' ? t('ai.input.clickSelectFile') : inputType === 'image' ? t('ai.input.clickSelectImage') : t('ai.input.clickSelectMedia')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {inputType === 'media' && (
                        <div className="mb-4 bg-background-secondary p-4 rounded-lg">
                            <div className="flex gap-4 mb-3 border-b border-border pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="mediaType" 
                                        checked={mediaType === 'url'} 
                                        onChange={() => setMediaType('url')} 
                                    />
                                    <span>{t('ai.input.mediaRadioUrl')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="mediaType" 
                                        checked={mediaType === 'file'} 
                                        onChange={() => {
                                            setMediaType('file');
                                            setSelectedFilePath(null);
                                            setMediaBase64(null);
                                        }} 
                                    />
                                    <span>{t('ai.input.mediaRadioFile')}</span>
                                </label>
                            </div>

                            {mediaType === 'url' ? (
                                <div>
                                    <input 
                                        type="text" 
                                        placeholder={t('ai.input.urlPlaceholder')} 
                                        value={mediaUrl}
                                        onChange={(e) => setMediaUrl(e.target.value)}
                                        className="w-full p-2 border border-border rounded bg-background"
                                    />
                                    <p className="text-xs text-text-muted mt-1">
                                        {t('ai.input.urlHint')}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-text-muted">{t('ai.input.fileHint')}</p>
                            )}
                        </div>
                    )}

                    {inputType === 'transcript' && (
                        <div className="mb-4">
                            <textarea
                                value={transcriptText}
                                onChange={(e) => setTranscriptText(e.target.value)}
                                placeholder={t('ai.input.transcriptPlaceholder')}
                                className="w-full h-48 p-4 border border-border rounded-lg bg-background-secondary text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                            <p className="text-[10px] text-text-muted mt-2 px-1 italic">
                                <i className="fas fa-info-circle mr-1"></i> {t('ai.input.transcriptHint')}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            {(inputType !== 'text') ? t('ai.labels.topicTitle') : 
                             ((generationType === 'quiz' || generationType === 'mixed-quiz') ? t('ai.labels.topicSubject') : 
                              generationType === 'curriculum' ? t('ai.labels.topicProgram') : 
                              t('ai.labels.topicLesson'))}
                        </label>
                        {(() => {
                            const getTopicPlaceholder = () => {
                                if (inputType !== 'text') return t('ai.labels.topicDefault');
                                
                                const tutor = config.selectedTutor;
                                if (!tutor) {
                                    if (generationType === 'quiz' || generationType === 'mixed-quiz') return t('ai.placeholders.capitals');
                                    if (generationType === 'curriculum') return t('ai.placeholders.webDesigner');
                                    return t('ai.placeholders.quantum');
                                }
                                
                                switch (tutor.category) {
                                    case 'languages':
                                        return t('ai.placeholders.cooking');
                                    case 'sciences':
                                        if (tutor.id === 'prof-biotique') return t('ai.placeholders.photosynthesis');
                                        if (tutor.id === 'prof-volt') return t('ai.placeholders.newton');
                                        if (tutor.id === 'prof-molecula') return t('ai.placeholders.periodic');
                                        if (tutor.id === 'prof-eureka') return t('ai.placeholders.solar');
                                        return t('ai.placeholders.scientific');
                                    case 'culture':
                                        if (tutor.id === 'prof-chronos') return t('ai.placeholders.ww1');
                                        if (tutor.id === 'prof-atlas') return t('ai.placeholders.climates');
                                        if (tutor.id === 'prof-plume') return t('ai.placeholders.romanticism');
                                        if (tutor.id === 'prof-sofia') return t('ai.placeholders.cave');
                                        if (tutor.id === 'prof-muse') return t('ai.placeholders.impressionism');
                                        if (tutor.id === 'prof-curio') return t('ai.placeholders.cinema');
                                        if (tutor.id === 'maitre-lexis') return "Droit constitutionnel, Procédure pénale, Droit des contrats...";
                                        return t('ai.placeholders.culture');
                                    case 'arts':
                                        if (tutor.id === 'prof-melodia') return t('ai.placeholders.scales');
                                        if (tutor.id === 'gm-kaspar') return t('ai.placeholders.gambit');
                                        if (tutor.id === 'maitre-leonard') return t('ai.placeholders.perspective');
                                        if (tutor.id === 'prof-turing') return "Introduction à Python, Créer une page HTML, Les boucles en C++...";
                                        return t('ai.placeholders.artHistory');
                                    case 'practical':
                                        if (tutor.id === 'prof-brico') return "Poser du carrelage, Rénover un meuble, Installer une prise électrique...";
                                        if (tutor.id === 'chef-gaston') return "Cuisson des œufs, Techniques de découpe, Pâte feuilletée...";
                                        if (tutor.id === 'coach-vita') return "Programme prise de masse, Étirements post-effort, Nutrition sportive...";
                                        if (tutor.id === 'sommelier-bacchus') return "Cépages de Bordeaux, Accords mets-vins, Dégustation du vin...";
                                        return "Techniques pratiques, Savoir-faire, Compétences du quotidien...";
                                    default:
                                        return (generationType === 'quiz' || generationType === 'mixed-quiz') ? t('ai.placeholders.travel') : t('ai.placeholders.revolution');
                                }
                            };

                            return (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder={getTopicPlaceholder()}
                                        className="w-full p-3 pr-10 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary"
                                    />
                                    {topic && (
                                        <button
                                            onClick={() => setTopic('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors opacity-50 hover:opacity-100"
                                            type="button"
                                            title="Effacer"
                                        >
                                            <i className="fas fa-times text-sm"></i>
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {(generationType === 'quiz' || generationType === 'mixed-quiz') && (
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-background-secondary transition-colors">
                                <input 
                                    type="checkbox" 
                                    checked={isNewSet} 
                                    onChange={(e) => setIsNewSet(e.target.checked)}
                                    className="w-5 h-5 accent-primary"
                                />
                                <span className="font-bold text-sm">Créer un nouveau paquet de fiches</span>
                            </label>

                            {isNewSet && (
                                <div className="animate-slide-up">
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        {t('ai.labels.setName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={setName}
                                        onChange={(e) => setSetName(e.target.value)}
                                        placeholder={t('ai.labels.setNamePlaceholder')}
                                        className="w-full p-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            )}
                        </div>
                    )}


                    {generationType !== 'curriculum' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                {t('ai.labels.sourceLang')}
                            </label>
                            <select
                                value={sourceLang}
                                onChange={(e) => setSourceLang(e.target.value)}
                                disabled={!isLanguageTutor}
                                className={`w-full p-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary ${!isLanguageTutor ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                            >
                                {availableLanguages && availableLanguages.length > 0 ? availableLanguages.map((lang) => (
                                    <option key={lang} value={lang}>{t('languages.' + lang) || lang.toUpperCase()}</option>
                                )) : (
                                    <>
                                        <option value="fr">{t('languages.fr')}</option>
                                        <option value="en">{t('languages.en')}</option>
                                        <option value="es">{t('languages.es')}</option>
                                        <option value="it">{t('languages.it')}</option>
                                        <option value="pt">{t('languages.pt')}</option>
                                        <option value="de">{t('languages.de')}</option>
                                    </>
                                )}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                {t('ai.labels.targetLang')}
                            </label>
                            <select
                                value={targetLang}
                                onChange={(e) => setTargetLang(e.target.value)}
                                disabled={!isLanguageTutor}
                                className={`w-full p-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary ${!isLanguageTutor ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                            >
                                {availableLanguages && availableLanguages.length > 0 ? availableLanguages.map((lang) => (
                                    <option key={lang} value={lang}>{t('languages.' + lang) || lang.toUpperCase()}</option>
                                )) : (
                                    <>
                                        <option value="fr">{t('languages.fr')}</option>
                                        <option value="en">{t('languages.en')}</option>
                                        <option value="es">{t('languages.es')}</option>
                                        <option value="it">{t('languages.it')}</option>
                                        <option value="pt">{t('languages.pt')}</option>
                                        <option value="de">{t('languages.de')}</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {(generationType === 'quiz' || generationType === 'mixed-quiz') && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    {t('ai.labels.numCards')}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={count}
                                    onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                                    className="w-full p-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        )}
                        <div className={(generationType === 'lesson' || generationType === 'curriculum') ? 'col-span-2' : ''}>
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                {t('ai.labels.difficulty')}
                            </label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as AIGenerationLevel)}
                                className="w-full p-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary"
                            >
                                <option value="beginner">{t('ai.difficulty.beginner')}</option>
                                <option value="intermediate">{t('ai.difficulty.intermediate')}</option>
                                <option value="advanced">{t('ai.difficulty.advanced')}</option>
                                <option value="university">{t('ai.difficulty.university')}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            {(generationType === 'quiz' || generationType === 'mixed-quiz') ? t('ai.labels.contextQuiz') : t('ai.labels.contextLesson')}
                        </label>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder={(generationType === 'quiz' || generationType === 'mixed-quiz') ? t('ai.labels.contextQuiz') : t('ai.labels.contextPlaceholderLesson')}
                            rows={3}
                            className="w-full p-3 border border-border rounded-lg bg-background text-text focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {error && (
                        <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating || !topic.trim()}
                            className="flex-1 overflow-hidden relative"
                        >
                            {isGenerating ? (
                                <div className="flex items-center justify-center gap-3">
                                    <AILoader size="sm" className="brightness-200" />
                                    <span className="animate-pulse">
                                        {(generationType === 'quiz' || generationType === 'mixed-quiz') ? t('ai.generating') : 
                                         generationType === 'curriculum' ? t('ai.actions.creatingProgram') :
                                         t('ai.actions.writingLesson')}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <i className={`fas ${(generationType === 'quiz' || generationType === 'mixed-quiz') ? 'fa-magic' : generationType === 'curriculum' ? 'fa-map-signs' : 'fa-pen-fancy'} mr-2`}></i>
                                    {(generationType === 'quiz' || generationType === 'mixed-quiz') ? t('ai.generate') : generationType === 'curriculum' ? t('ai.type.curriculum') : t('ai.actions.writeLesson')}
                                </>
                            )}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={onClose}
                            disabled={isGenerating}
                        >
                            {t('common.cancel')}
                        </Button>
                    </div>

                    <div className="bg-info/10 border border-info rounded-lg p-3 text-sm text-info">
                        <i className="fas fa-info-circle mr-2"></i>
                        {(generationType === 'quiz' || generationType === 'mixed-quiz') 
                            ? t('ai.labels.quizInfo')
                            : t('ai.labels.lessonInfo')}
                    </div>
                </div>
            </div>
        </div>
    );
};
