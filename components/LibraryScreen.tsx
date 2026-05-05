import React, { useState, useMemo } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { AILoader } from './ui/AILoader';
import { Button } from './ui/Button';
import { Flashcard } from '../types';
import { useToast } from '../contexts/ToastContext';
import { v4 as uuidv4 } from 'uuid';
import { generateFlashcardsWithAI } from '../services/aiCardGenerator';
import { useAIConfig } from '../contexts/AIConfigContext';
import { DEFAULT_FLASHCARD_SET_NAME } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getThemeGradient } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';
import { ChatService } from '../services/chatService';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { FloatingHeaderToggle } from './ui/FloatingHeaderToggle';
import { TUTORS } from '../constants';
import { useFlashcardStore } from '../stores/useFlashcardStore';

interface LibraryItem {
    id: string;
    title: string;
    description: string;
    category: string;
    cardsCount: number;
    cards: Flashcard[];
    tutorId?: string;
}

const LIBRARY_COLLECTIONS: LibraryItem[] = [
    {
        id: '1',
        title: 'Verbes Irréguliers Italiens',
        description: 'Les 50 verbes les plus utilisés avec leur conjugaison complète.',
        category: 'Langues',
        cardsCount: 50,
        tutorId: 'maestro-italiano',
        cards: [
            { id: uuidv4(), type: 'classic', terms: { fr: 'Être', it: 'Essere' } },
            { id: uuidv4(), type: 'classic', terms: { fr: 'Avoir', it: 'Avere' } },
            { id: uuidv4(), type: 'classic', terms: { fr: 'Aller', it: 'Andare' } },
            { id: uuidv4(), type: 'classic', terms: { fr: 'Faire', it: 'Fare' } },
            { id: uuidv4(), type: 'mcq', mcqData: { 
                question: { fr: 'Comment dit-on "Il peut" ?' }, 
                answer: { it: 'Lui può' }, 
                distractors: [{ it: 'Lui deve' }, { it: 'Lui veut' }, { it: 'Lui sait' }] 
            } }
        ]
    },
    {
        id: '2',
        title: 'Théorie de la Musique : Intervalles',
        description: 'Apprenez à identifier les quintes, quartes et tierces.',
        category: 'Musique',
        cardsCount: 24,
        tutorId: 'prof-melodia',
        cards: [
            { id: uuidv4(), type: 'classic', terms: { fr: 'Quinte Juste', en: 'Perfect Fifth (3.5 tones)' } },
            { id: uuidv4(), type: 'classic', terms: { fr: 'Tierce Majeure', en: 'Major Third (2 tones)' } }
        ]
    },
    {
        id: '3',
        title: 'Anatomie : Le Squelette',
        description: 'Les principaux os du corps humain pour les étudiants en médecine.',
        category: 'Sciences',
        cardsCount: 40,
        tutorId: 'prof-biotique',
        cards: [
            { id: uuidv4(), type: 'classic', terms: { fr: 'Fémur', la: 'Os femoris' } },
            { id: uuidv4(), type: 'classic', terms: { fr: 'Humérus', la: 'Humerus' } }
        ]
    }
];

interface LibraryScreenProps {
    onBack: () => void;
    onImport: (name: string, cards: Flashcard[], tutorId?: string) => void;
    onAddCardsToSet?: (newCards: Flashcard[], targetSetName?: string) => void;
    userSets?: Record<string, Flashcard[]>;
    onDeleteSet?: (name: string) => void;
    onRenameSet?: (oldName: string, newName: string) => void;
    currentSetName?: string;
    onSelectSet?: (name: string) => void;
    onStartQuiz?: () => void;
    customCollections?: any[];
    setCustomCollections?: (collections: any[] | ((prev: any[]) => any[])) => void;
    onNavigateToSettings?: () => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ 
    onBack, 
    onImport, 
    onAddCardsToSet,
    userSets = {}, 
    onDeleteSet, 
    onRenameSet, 
    currentSetName, 
    onSelectSet, 
    onStartQuiz,
    customCollections: propsCustomCollections = [],
    setCustomCollections: propsSetCustomCollections,
    onNavigateToSettings
}) => {
    // Sync Fallback
    const [localCollections, setLocalCollections] = useLocalStorage<LibraryItem[]>('library_custom_catalog', []);
    const customCollections = propsSetCustomCollections ? propsCustomCollections : localCollections;
    const setCustomCollections = propsSetCustomCollections || setLocalCollections;

    const { flashcardSetsMetadata } = useFlashcardStore();
    const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);

    const { t, language } = useTranslation();
    const { showToast } = useToast();
    const { showConfirmation } = useConfirmation();
    const { config } = useAIConfig();
    const { themeMode, themeStyle } = useTheme();
    const { showHeader, toggleHeader } = useCollapsibleHeader();
    const [search, setSearch] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRenewingCatalog, setIsRenewingCatalog] = useState(false);
    const [cardCount, setCardCount] = useState(20);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [isAppending, setIsAppending] = useState<string | null>(null);

    const [showRenewModal, setShowRenewModal] = useState(false);
    const [renewPreferences, setRenewPreferences] = useState('');
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState('');
    const [newName, setNewName] = useState('');
    const [renameType, setRenameType] = useState<'user' | 'curated'>('user');
    const [renameId, setRenameId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({ title: '', description: '', category: 'Mes Idées' });
    const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('library_view_mode', 'grid');
    const [previewCards, setPreviewCards] = useState<Flashcard[] | null>(null);
    const [previewTitle, setPreviewTitle] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const filteredCollections = useMemo(() => {
        return LIBRARY_COLLECTIONS.filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                                 item.category.toLowerCase().includes(search.toLowerCase());
            const matchesTutor = !selectedTutorId || item.tutorId === selectedTutorId;
            return matchesSearch && matchesTutor;
        });
    }, [search, selectedTutorId]);

    const generateCompleteCollection = async (topicToGen: string, countToGen: number, itemId?: string) => {
        if (itemId) setGeneratingId(itemId);
        else setIsGenerating(true);
        try {
            let apiKey = '';
            let modelName = '';
            let apiUrl = undefined;

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
                if (itemId) setGeneratingId(null);
                else setIsGenerating(false);
                return;
            }

            const response = await generateFlashcardsWithAI({
                topic: topicToGen,
                sourceLang: language,
                targetLang: language,
                count: countToGen,
                difficulty: 'intermediate',
                context: `Génère une collection de référence EXACTE de ${countToGen} fiches pour un utilisateur de bibliothèque sur le thème : ${topicToGen}. Sois très académique et précis. Tu DOIS fournir précisément ${countToGen} concepts distincts.`,
                provider: config.provider,
                apiKey: apiKey || '',
                modelName: modelName || 'gemini-2.5-flash',
                apiUrl: apiUrl || ''
            });

            onImport(topicToGen, response, config.selectedTutor?.id);
            showToast(`Collection "${topicToGen}" (${response.length} fiches) ajoutée !`, 'success');
        } catch (error: any) {
            console.error("Library Generation Error:", error);
            const errorMessage = typeof error === 'string' ? error : (error.message || "Erreur lors de la génération");
            showToast(errorMessage, "error");
        } finally {
            setIsGenerating(false);
            setGeneratingId(null);
        }
    };

    const handleGenerateLibraryItem = async () => {
        if (!search.trim()) return;
        await generateCompleteCollection(search, cardCount);
    };

    const handleAppendCards = async (item: LibraryItem) => {
        if (!onAddCardsToSet) return;
        
        setIsAppending(item.id);
        try {
            const countToGen = 10; // Valeur par défaut pour l'ajout
            showToast(`L'IA génère ${countToGen} fiches supplémentaires pour "${item.title}"...`, 'info');

            let apiKey = '';
            let modelName = '';
            let apiUrl = undefined;

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

            const response = await generateFlashcardsWithAI({
                topic: item.title,
                sourceLang: language,
                targetLang: language,
                count: countToGen,
                difficulty: 'intermediate',
                context: `Génère EXACTEMENT ${countToGen} fiches COMPLÉMENTAIRES (différentes des fiches de base) sur le thème : ${item.title}. Tu DOIS impérativement fournir ${countToGen} nouvelles fiches.`,
                provider: config.provider,
                apiKey: apiKey || '',
                modelName: modelName || 'gemini-2.5-flash',
                apiUrl: apiUrl || ''
            });

            onAddCardsToSet(response, item.title);
            showToast(`${response.length} nouvelles fiches ajoutées à la liste "${item.title}" !`, 'success');
        } catch (error: any) {
            console.error("Append Error:", error);
            showToast("Erreur lors de l'ajout de fiches", "error");
        } finally {
            setIsAppending(null);
        }
    };

    const handleImport = async (item: LibraryItem) => {
        const executeImport = async () => {
            // Si c'est une collection système (ID '1', '2', '3') ou une AI suggérée sans cartes
            const isSkeleton = item.cards.length < item.cardsCount || item.cards.length === 0;
            
            if (isSkeleton) {
                showToast(`Génération de la collection complète "${item.title}"...`, 'info');
                await generateCompleteCollection(item.title, item.cardsCount, item.id);
            } else {
                onImport(item.title, item.cards, item.tutorId);
                showToast(t('library.importSuccess', { name: item.title }), 'success');
            }
        };

        if (userSets[item.title]) {
            showConfirmation({
                title: "Liste déjà existante",
                message: `Une liste nommée "${item.title}" existe déjà. Voulez-vous l'écraser par cette nouvelle version ?`,
                confirmText: "Écraser",
                variant: 'warning',
                onConfirm: executeImport
            });
        } else {
            await executeImport();
        }
    };

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

            // Prompt dédié pour éviter les hallucinations sur le fonctionnement de l'IA
            const systemPrompt = "Tu es un expert en éducation et un conservateur de bibliothèque. Ta mission est de suggérer des thèmes d'apprentissage réels, académiques et stimulants. NE PARLE JAMAIS de l'IA, des prompts ou de la génération de fiches. Concentre-toi sur le SAVOIR.";
            const userPrompt = `Génère 3 suggestions de thèmes d'étude pour un catalogue.
Chaque thème doit être un sujet de connaissance (Histoire, Sciences, Littérature, etc.).
${preferences.trim() ? `L'utilisateur s'intéresse particulièrement à : "${preferences}"` : "Varie les sujets pour couvrir différents domaines du savoir."}

Format JSON STRICT (tableau d'objets) :
[
  {"titre": "Nom du Sujet (ex: Les Trous Noirs)", "description": "Une phrase résumant l'intérêt du sujet."},
  {"titre": "Autre Sujet", "description": "Résumé..."},
  {"titre": "Troisième Sujet", "description": "Résumé..."}
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
                throw new Error("Impossible de parser les suggestions. Veuillez réessayer.");
            }

            const newItems: LibraryItem[] = suggestions.map((s: any) => ({
                id: uuidv4(),
                title: s.titre || s.title || 'Sujet inconnu',
                description: s.description || 'Pas de description disponible',
                category: 'IA Suggéré',
                cardsCount: 20,
                cards: [],
                tutorId: config.selectedTutor?.id
            }));

            setCustomCollections(newItems);
            showToast("Nouveaux sujets ajoutés au catalogue !", "success");

        } catch (error: any) {
            console.error("Catalog Renewal Error:", error);
            showToast("Erreur lors du renouvellement des suggestions.", "error");
        } finally {
            setIsRenewingCatalog(false);
        }
    };

    const handleDeleteLibraryItem = (id: string, title: string) => {
        if (confirm(`Supprimer la suggestion "${title}" ?`)) {
            setCustomCollections((prev: LibraryItem[]) => prev.filter((item: LibraryItem) => item.id !== id));
            showToast(`Suggestion "${title}" supprimée`, 'success');
        }
    };

    /**
     * Normalise une fiche brute (provenant d'un fichier JSON externe) vers
     * le format interne Studeo (FlashcardClassic | FlashcardMCQ | FlashcardCloze).
     * Gère les formats courants : Studeo, Quizlet, Anki, front/back, question/answer, etc.
     */
    const normalizeCard = (raw: any, idx: number): Flashcard | null => {
        if (!raw || typeof raw !== 'object') return null;

        // ── Déjà au format Studeo ──────────────────────────────────────────────
        if (raw.type === 'classic' && raw.terms && typeof raw.terms === 'object') {
            return { id: raw.id || uuidv4(), type: 'classic', terms: raw.terms, srsData: raw.srsData, mnemonic: raw.mnemonic };
        }
        if (raw.type === 'mcq' && raw.mcqData) {
            return { id: raw.id || uuidv4(), type: 'mcq', mcqData: raw.mcqData, srsData: raw.srsData, mnemonic: raw.mnemonic };
        }
        if (raw.type === 'cloze' && raw.clozeData) {
            return { id: raw.id || uuidv4(), type: 'cloze', clozeData: raw.clozeData, srsData: raw.srsData, mnemonic: raw.mnemonic };
        }

        // ── Format MCQ explicite ───────────────────────────────────────────────
        if (raw.type === 'mcq' && raw.question && raw.answer) {
            const q = typeof raw.question === 'string' ? { fr: raw.question } : raw.question;
            const a = typeof raw.answer === 'string' ? { fr: raw.answer } : raw.answer;
            const distractors = Array.isArray(raw.distractors)
                ? raw.distractors.map((d: any) => typeof d === 'string' ? { fr: d } : d)
                : Array.isArray(raw.options)
                    ? raw.options.filter((o: any) => o !== (raw.answer || '')).map((o: any) => ({ fr: String(o) }))
                    : undefined;
            return { id: raw.id || uuidv4(), type: 'mcq', mcqData: { question: q, answer: a, distractors } };
        }

        // ── Format question / answer (MCQ si options présentes, sinon classic) ─
        if (raw.question !== undefined && raw.answer !== undefined) {
            // Si des options alternatives sont présentes → MCQ
            if (Array.isArray(raw.options) && raw.options.length > 1) {
                const q = { fr: String(raw.question) };
                const a = { fr: String(raw.answer) };
                const distractors = raw.options
                    .filter((o: any) => String(o) !== String(raw.answer))
                    .map((o: any) => ({ fr: String(o) }));
                return { id: raw.id || uuidv4(), type: 'mcq', mcqData: { question: q, answer: a, distractors } };
            }
            // Sinon → classic (question = recto, answer = verso)
            const terms: Record<string, string> = {};
            if (raw.questionLang) terms[raw.questionLang] = String(raw.question);
            else terms['recto'] = String(raw.question);
            if (raw.answerLang) terms[raw.answerLang] = String(raw.answer);
            else terms['verso'] = String(raw.answer);
            return { id: raw.id || uuidv4(), type: 'classic', terms };
        }

        // ── Format front / back (Quizlet, Anki export…) ───────────────────────
        if (raw.front !== undefined && raw.back !== undefined) {
            return {
                id: raw.id || uuidv4(),
                type: 'classic',
                terms: {
                    recto: String(raw.front),
                    verso: String(raw.back),
                }
            };
        }

        // ── Format term / definition ───────────────────────────────────────────
        if (raw.term !== undefined && raw.definition !== undefined) {
            return {
                id: raw.id || uuidv4(),
                type: 'classic',
                terms: {
                    terme: String(raw.term),
                    définition: String(raw.definition),
                }
            };
        }

        // ── Format word / translation ──────────────────────────────────────────
        if (raw.word !== undefined && raw.translation !== undefined) {
            return {
                id: raw.id || uuidv4(),
                type: 'classic',
                terms: {
                    mot: String(raw.word),
                    traduction: String(raw.translation),
                }
            };
        }

        // ── Format générique : premier champ string = recto, second = verso ───
        const keys = Object.keys(raw).filter(k => k !== 'id' && typeof raw[k] === 'string');
        if (keys.length >= 2) {
            const terms: Record<string, string> = {};
            keys.slice(0, 4).forEach(k => { terms[k] = String(raw[k]); });
            return { id: raw.id || uuidv4(), type: 'classic', terms };
        }

        // ── Impossible à convertir ─────────────────────────────────────────────
        console.warn(`[Import] Fiche #${idx + 1} ignorée (format non reconnu):`, raw);
        return null;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Réinitialise l'input pour permettre le réimport du même fichier
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = JSON.parse(event.target?.result as string);

                let rawCards: any[] = [];
                let title = file.name.replace(/\.json$/i, '');

                if (Array.isArray(content)) {
                    // Format 1 : tableau direct
                    rawCards = content;
                } else if (content.cards && Array.isArray(content.cards)) {
                    // Format 2 : { title?, cards[] }
                    rawCards = content.cards;
                    if (content.title) title = content.title;
                } else if (content.name && content.terms && Array.isArray(content.terms)) {
                    // Format 3 : export Quizlet { name, terms[] }
                    rawCards = content.terms;
                    title = content.name;
                } else if (content.deck && Array.isArray(content.deck)) {
                    // Format 4 : { deck[] }
                    rawCards = content.deck;
                    if (content.deckName || content.name) title = content.deckName || content.name;
                } else {
                    throw new Error("Format JSON non reconnu. Attendu : tableau de fiches ou objet { cards: [...] }");
                }

                if (rawCards.length === 0) {
                    showToast("Le fichier ne contient aucune fiche.", "error");
                    return;
                }

                // Normalisation de chaque fiche
                const normalized: Flashcard[] = rawCards
                    .map((raw, idx) => normalizeCard(raw, idx))
                    .filter((c): c is Flashcard => c !== null);

                if (normalized.length === 0) {
                    showToast("Aucune fiche n'a pu être lue. Vérifiez le format du fichier.", "error");
                    return;
                }

                const skipped = rawCards.length - normalized.length;
                onImport(title, normalized);
                showToast(
                    skipped > 0
                        ? `${normalized.length} fiche(s) importée(s) (${skipped} ignorée(s) — format non reconnu).`
                        : `${normalized.length} fiche(s) importée(s) avec succès !`,
                    skipped > 0 ? 'info' : 'success'
                );
            } catch (err: any) {
                console.error("[Import JSON] Erreur :", err);
                showToast(err?.message || "Erreur lors de la lecture du fichier JSON", "error");
            }
        };
        reader.readAsText(file);
    };

    const handleEnrich = async (item: LibraryItem) => {
        const executeEnrich = async () => {
            await generateCompleteCollection(item.title, cardCount, item.id);
        };

        if (userSets[item.title]) {
            showConfirmation({
                title: "Liste déjà existante",
                message: `Une liste nommée "${item.title}" existe déjà. Voulez-vous l'écraser par la version enrichie par l'IA ?`,
                confirmText: "Écraser",
                variant: 'warning',
                onConfirm: executeEnrich
            });
        } else {
            await executeEnrich();
        }
    };
    const userSetsList = useMemo(() => {
        const raw = Object.entries(userSets).map(([name, cards]) => ({
            id: `user-set-${name}`,
            name,
            count: cards.length,
            category: 'Mes Listes',
            isUser: true,
            isActive: name.trim() === (currentSetName || '').trim(),
            tutorId: flashcardSetsMetadata[name]?.tutorId
        }));
        
        // Final unique deduplication to prevent React crash (NotFoundError)
        const seen = new Set();
        return raw.filter(set => {
            if (seen.has(set.id)) return false;
            seen.add(set.id);
            const matchesSearch = !search || set.name.toLowerCase().includes(search.toLowerCase());
            const matchesTutor = !selectedTutorId || set.tutorId === selectedTutorId;
            return matchesSearch && matchesTutor;
        });
    }, [userSets, flashcardSetsMetadata, currentSetName, search, selectedTutorId]);

    const staticCollections = useMemo(() => {
        const customFiltered = customCollections.filter(item => !selectedTutorId || item.tutorId === selectedTutorId);
        const combined = [...customFiltered, ...filteredCollections];
        
        // Final unique deduplication to prevent React crash (NotFoundError)
        const seen = new Set();
        return combined.filter(item => {
            const uniqueId = item.id || item.title;
            if (seen.has(uniqueId)) return false;
            seen.add(uniqueId);
            return true;
        });
    }, [customCollections, filteredCollections, selectedTutorId]);

    // Dynamic tutors with content - calculated from unfiltered sources to avoid circular dependency
    const tutorsWithContent = useMemo(() => {
        const userTutorIds = Object.values(flashcardSetsMetadata).map(m => m.tutorId).filter(Boolean);
        const curatedTutorIds = LIBRARY_COLLECTIONS.map(item => item.tutorId).filter(Boolean);
        const customTutorIds = (customCollections || []).map(item => item.tutorId).filter(Boolean);
        const uniqueTutorIds = new Set([...userTutorIds, ...curatedTutorIds, ...customTutorIds]);
        return TUTORS.filter(tutor => uniqueTutorIds.has(tutor.id));
    }, [flashcardSetsMetadata]); // Only depend on global metadata to maintain list stability

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative" translate="no">
            {/* Bouton flottant toggle */}
            <FloatingHeaderToggle showHeader={showHeader} onToggle={toggleHeader} />

            {/* Header — amovible */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
                showHeader ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
             <div 
                className={`transition-all duration-500 pt-safe p-3 md:p-6 shadow-lg relative overflow-hidden group ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                {onNavigateToSettings && (
                    <button 
                        onClick={onNavigateToSettings}
                        className="hidden sm:block absolute bottom-4 right-6 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 hover:bg-white/10 rounded-xl"
                        title="Paramètres de l'IA"
                    >
                        <i className="fas fa-cog text-inherit"></i>
                    </button>
                )}
                {/* Ligne des Boutons de Navigation/Action */}
                <div className="relative z-20 flex justify-between items-center mb-6">
                    <Button 
                        variant="secondary" 
                        onClick={onBack} 
                        size="sm" 
                        className={`transition-all w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                    >
                        <i className="fas fa-home md:mr-2 text-inherit"></i> <span className="hidden sm:inline">Accueil</span>
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

                    <div className="flex items-center gap-2 sm:gap-3">
                        {onStartQuiz && (
                            <Button 
                                variant="secondary" 
                                onClick={onStartQuiz} 
                                className={`transition-all border-transparent backdrop-blur-sm rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2 group ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80`}
                            >
                                <i className="fas fa-play-circle text-base sm:text-lg animate-pulse"></i>
                                <span className="font-bold uppercase tracking-wider text-[10px] hidden sm:inline">Lecteur</span>
                            </Button>
                        )}
                        {onNavigateToSettings && (
                             <button onClick={onNavigateToSettings} className={`sm:hidden w-8 h-8 flex items-center justify-center rounded-xl transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white backdrop-blur-sm shadow-md'}`}>
                                <i className="fas fa-cog"></i>
                            </button>
                        )}
                    </div>
                </div>

                {/* Titres du Header */}
                <div className="relative z-10 flex flex-col">
                    <h1 className="text-xl md:text-3xl font-black drop-shadow-sm text-inherit">
                        {t('home.features.library.title')}
                    </h1>
                    <p className="opacity-80 mt-1 text-xs md:text-base text-inherit">
                        {t('home.features.library.description', { 
                            setsCount: Object.keys(userSets).length, 
                            cardsCount: Object.values(userSets).reduce((acc, cards) => acc + cards.length, 0)
                        })}
                    </p>
                </div>
             </div>
            </div>

             <div className="p-4 md:p-6 flex-1 max-w-6xl mx-auto w-full overflow-y-auto min-h-0 pb-32">

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="relative flex-1">
                        <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-text-muted text-sm border-r border-border pr-4"></i>
                        <input 
                            type="text"
                            placeholder={search ? `Chercher "${search}"...` : t('library.searchPlaceholder')}
                            className="w-full pl-16 pr-6 py-3.5 bg-background-secondary border border-border rounded-xl shadow-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="relative group shrink-0" translate="no">
                        <select
                            value={selectedTutorId || ''}
                            onChange={(e) => setSelectedTutorId(e.target.value || null)}
                            className="appearance-none bg-background-secondary border border-border rounded-xl px-4 py-3.5 pr-10 text-sm font-medium text-text focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer hover:bg-background-tertiary w-fit sm:w-auto min-w-[150px]"
                        >
                            <option value="">👤 {t('library.allTeachers') || t('curriculum.allTeachers') || 'Tous les professeurs'}</option>
                            {tutorsWithContent.map(tutor => (
                                <option key={tutor.id} value={tutor.id}>
                                    {tutor.emoji} {tutor.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                            <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".json"
                    />
                    <Button 
                        variant="secondary" 
                        className="rounded-xl px-6 h-auto py-3.5 text-sm shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <i className="fas fa-file-import mr-2"></i> Importer
                    </Button>
                </div>

                <div className="space-y-12">
                    {userSetsList.length > 0 && (
                        <div>
                            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-primary uppercase tracking-tighter">
                                <i className="fas fa-folder-open"></i> Mes Collections
                            </h2>
                            <div 
                                className={viewMode === 'grid' 
                                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                    : "flex flex-col gap-2"
                                }
                            >
                                {userSetsList.map((set) => (
                                    <div 
                                        key={set.id} 
                                        onClick={() => !set.isActive && onSelectSet?.(set.name)}
                                        className={`group relative bg-white dark:bg-gray-800 border-2 rounded-2xl transition-all cursor-pointer ${
                                            viewMode === 'grid' 
                                                ? 'p-5 flex flex-col justify-between min-h-[160px]' 
                                                : 'p-4 flex flex-col sm:flex-row sm:items-center gap-4 min-h-0'
                                        } ${
                                            set.isActive 
                                                ? 'border-primary shadow-lg ring-4 ring-primary/5 bg-primary/[0.02]' 
                                                : 'border-border hover:border-primary/50 hover:shadow-xl hover:bg-primary/[0.03]'
                                        }`}
                                    >
                                            <div className={viewMode === 'grid' ? "flex flex-col gap-2 mb-2" : "flex flex-wrap items-center gap-3 flex-1 min-w-0"}>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg outline outline-1 outline-primary/20 shrink-0">
                                                        {set.category}
                                                    </span>
                                                    
                                                    {/* Tutor Badge */}
                                                    {set.tutorId && (
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                                                            <span>{TUTORS.find(t => t.id === set.tutorId)?.emoji}</span>
                                                            <span>{TUTORS.find(t => t.id === set.tutorId)?.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            
                                            {viewMode === 'list' && (
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-bold text-text group-hover:text-primary transition-colors">
                                                        {set.name}
                                                    </h3>
                                                    <p className="text-xs text-text-muted font-medium">
                                                        {t('library.cardsCount', { count: set.count })}
                                                    </p>
                                                </div>
                                            )}

                                            <div className={`flex gap-1 transition-all duration-200 ${viewMode === 'grid' ? 'opacity-0 group-hover:opacity-100' : ''}`}>
                                                {onRenameSet && set.name !== DEFAULT_FLASHCARD_SET_NAME && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRenameTarget(set.name);
                                                            setNewName(set.name);
                                                            setRenameType('user');
                                                            setRenameId(null);
                                                            setIsRenameModalOpen(true);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                        title="Renommer"
                                                    >
                                                        <i className="fas fa-edit text-[10px]"></i>
                                                    </button>
                                                )}
                                                {onDeleteSet && set.name !== DEFAULT_FLASHCARD_SET_NAME && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Supprimer la liste "${set.name}" ?`)) {
                                                                onDeleteSet(set.name);
                                                            }
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <i className="fas fa-trash-alt text-[10px]"></i>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreviewCards(userSets[set.name]);
                                                        setPreviewTitle(set.name);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="Aperçu"
                                                >
                                                    <i className="fas fa-eye text-[10px]"></i>
                                                </button>
                                            </div>
                                        </div>

                                        {viewMode === 'grid' && (
                                            <div className="flex-1">
                                                <h3 className="text-base font-bold text-text mb-1 leading-tight group-hover:text-primary transition-colors">
                                                    {set.name}
                                                </h3>
                                                <p className="text-xs text-text-muted font-medium">
                                                    {t('library.cardsCount', { count: set.count })}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className={viewMode === 'grid' ? "mt-4" : "w-full sm:w-32 sm:shrink-0"}>
                                            {set.isActive ? (
                                                <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 p-2 rounded-xl border border-primary/20">
                                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--color-primary-rgb),0.5)]"></div>
                                                    ACTIF
                                                </div>
                                            ) : (
                                                <Button 
                                                    variant="primary" 
                                                    className="w-full rounded-xl py-1.5 text-xs font-bold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectSet?.(set.name);
                                                    }}
                                                >
                                                    <i className="fas fa-play text-[10px] mr-2"></i> Activer
                                                </Button>
                                            )}
                                            
                                            {set.name === DEFAULT_FLASHCARD_SET_NAME && (
                                                <p className="text-[9px] text-center text-text-muted mt-2 opacity-50 italic">
                                                    (Système)
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {staticCollections.length > 0 && (
                        <div>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-background-secondary/50 p-4 md:p-6 rounded-[2rem] border border-border/50">
                                <div>
                                    <h2 className="text-xl font-black flex items-center gap-2 text-text-secondary uppercase tracking-tighter">
                                        <i className="fas fa-compass text-primary"></i> Découvrir & Développer
                                    </h2>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Sujets d'étude suggérés par l'IA</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                                    {/* Sélecteur de Densité Global */}
                                    <div className="flex items-center gap-4 bg-background px-4 py-2 rounded-2xl border border-border shadow-sm min-w-[200px]">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-primary leading-none mb-1">Nombre de fiches</span>
                                            <input 
                                                type="range" 
                                                min="5" 
                                                max="30" 
                                                step="5"
                                                value={cardCount}
                                                onChange={(e) => setCardCount(parseInt(e.target.value))}
                                                className="w-24 h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                        </div>
                                        <div className="bg-primary text-white text-xs font-black min-w-[28px] h-7 flex items-center justify-center rounded-lg shadow-sm">
                                            {cardCount}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button 
                                            variant="secondary" 
                                            size="sm"
                                            className="rounded-xl py-2 px-4 border-dashed text-[10px] font-bold h-10"
                                            onClick={() => setShowRenewModal(true)}
                                            disabled={isRenewingCatalog}
                                        >
                                            {isRenewingCatalog ? <AILoader size="sm" /> : <><i className="fas fa-sync-alt mr-2"></i> Renouveler</>}
                                        </Button>
                                        <Button 
                                            variant="secondary" 
                                            size="sm"
                                            className="rounded-xl py-2 px-4 border-dashed text-[10px] font-bold h-10"
                                            onClick={() => setIsAddModalOpen(true)}
                                        >
                                            <i className="fas fa-plus mr-2"></i> Ajouter
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div 
                                className={viewMode === 'grid' 
                                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                    : "flex flex-col gap-2"
                                }
                            >
                                {staticCollections.map((item) => (
                                    <div 
                                        key={item.id || item.title} 
                                        className={`group bg-white dark:bg-gray-800 border border-border rounded-2xl transition-all hover:shadow-xl ${
                                            viewMode === 'grid'
                                                ? 'p-5 flex flex-col justify-between min-h-[180px] hover:-translate-y-1'
                                                : 'p-4 flex flex-col md:flex-row md:items-center gap-4 min-h-0'
                                        }`}
                                    >
                                        <div className={viewMode === 'grid' ? "flex flex-col h-full" : "flex flex-col sm:flex-row sm:items-center gap-4 flex-1 min-w-0"}>
                                            <div className={viewMode === 'grid' ? "flex flex-col gap-2 mb-2" : "flex flex-wrap items-center gap-3 shrink-0"}>
                                                <span className="px-2.5 py-0.5 bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider rounded-lg outline outline-1 outline-accent/20 shrink-0 self-start">
                                                    {item.category}
                                                </span>
                                                
                                                {/* Tutor Badge */}
                                                {item.tutorId && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[10px] font-medium text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 self-start">
                                                        <span>{TUTORS.find(t => t.id === item.tutorId)?.emoji}</span>
                                                        <span>{TUTORS.find(t => t.id === item.tutorId)?.name}</span>
                                                    </div>
                                                )}
                                                
                                                {viewMode === 'grid' && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] text-text-muted font-bold">
                                                            {t('library.cardsCount', { count: item.cardsCount })}
                                                        </span>

                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRenameTarget(item.title);
                                                                    setNewName(item.title);
                                                                    setRenameType('curated');
                                                                    setRenameId(item.id);
                                                                    setIsRenameModalOpen(true);
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                                title="Renommer"
                                                            >
                                                                <i className="fas fa-edit text-[10px]"></i>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAppendCards(item);
                                                                }}
                                                                disabled={isAppending === item.id}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                                                                title="Ajouter 10 fiches"
                                                            >
                                                                {isAppending === item.id ? (
                                                                    <i className="fas fa-circle-notch fa-spin text-[10px]"></i>
                                                                ) : (
                                                                    <i className="fas fa-plus-square text-[10px]"></i>
                                                                )}
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteLibraryItem(item.id, item.title);
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                                                                title="Supprimer"
                                                            >
                                                                <i className="fas fa-trash-alt text-[10px]"></i>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (item.cards && item.cards.length > 0) {
                                                                        setPreviewCards(item.cards);
                                                                        setPreviewTitle(item.title);
                                                                    } else {
                                                                        showToast("Générez ou importez cette collection pour voir les fiches.", "info");
                                                                    }
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                                title="Aperçu"
                                                            >
                                                                <i className="fas fa-eye text-[10px]"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-bold group-hover:text-primary transition-colors leading-tight ${viewMode === 'grid' ? 'text-base mb-1' : 'text-base'}`}>
                                                    {item.title}
                                                </h3>
                                                <p className={`text-[10px] text-text-secondary line-clamp-2 italic opacity-70 ${viewMode === 'list' && 'hidden sm:block'}`}>
                                                    "{item.description}"
                                                </p>
                                                {viewMode === 'list' && (
                                                    <span className="text-[10px] text-text-muted font-bold mt-1 block">
                                                        {t('library.cardsCount', { count: item.cardsCount })}
                                                    </span>
                                                )}
                                            </div>

                                            {viewMode === 'list' && (
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRenameTarget(item.title);
                                                            setNewName(item.title);
                                                            setRenameType('curated');
                                                            setRenameId(item.id);
                                                            setIsRenameModalOpen(true);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                        title="Renommer"
                                                    >
                                                        <i className="fas fa-edit text-[10px]"></i>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAppendCards(item);
                                                        }}
                                                        disabled={isAppending === item.id}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                                                        title="Ajouter 10 fiches"
                                                    >
                                                        {isAppending === item.id ? (
                                                            <i className="fas fa-circle-notch fa-spin text-[10px]"></i>
                                                        ) : (
                                                            <i className="fas fa-plus-square text-[10px]"></i>
                                                        )}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteLibraryItem(item.id, item.title);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Supprimer"
                                                    >
                                                        <i className="fas fa-trash-alt text-[10px]"></i>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.cards && item.cards.length > 0) {
                                                                setPreviewCards(item.cards);
                                                                setPreviewTitle(item.title);
                                                            } else {
                                                                showToast("Générez ou importez cette collection pour voir les fiches.", "info");
                                                            }
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-secondary text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                        title="Aperçu"
                                                    >
                                                        <i className="fas fa-eye text-[10px]"></i>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className={`flex gap-2 shrink-0 ${viewMode === 'grid' ? 'flex-col mt-4' : 'flex-row w-full md:w-64 items-center mt-2 md:mt-0'}`}>
                                            <Button 
                                                variant="primary" 
                                                className={`rounded-xl py-1.5 text-xs font-bold ${viewMode === 'grid' ? 'w-full' : 'flex-1'}`}
                                                onClick={() => handleImport(item)}
                                                loading={generatingId === item.id}
                                            >
                                                <i className="fas fa-download mr-1 md:mr-2"></i> {viewMode === 'grid' ? 'Importer' : ''}
                                            </Button>
                                            <Button 
                                                variant="secondary" 
                                                className={`rounded-xl py-1.5 text-[10px] font-medium border-dashed ${viewMode === 'grid' ? 'w-full' : 'flex-1'}`}
                                                onClick={() => handleEnrich(item)}
                                                loading={generatingId === item.id}
                                            >
                                                <i className="fas fa-plus-circle mr-1.5"></i> {viewMode === 'grid' ? 'Enrichir via IA' : 'Enrichir'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {userSetsList.length === 0 && staticCollections.length === 0 && (
                    <div className="text-center py-20 bg-primary/5 rounded-[3rem] border border-dashed border-primary/20 animate-fade-in">
                        <div className="text-6xl mb-6">✨</div>
                        <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">Bibliothèque Infinie</h2>
                        <p className="text-text-secondary max-w-md mx-auto mb-8 italic">
                            Nous n'avons pas de collection "{search}" en rayon, mais notre bibliothécaire IA peut vous en créer une complète en quelques secondes.
                        </p>

                        <div className="text-[10px] text-text-muted italic">
                            Ajustez la densité en haut de la section pour changer le nombre de fiches.
                        </div>

                        <Button 
                            variant="primary" 
                            size="lg" 
                            className="rounded-2xl px-12 shadow-xl shadow-primary/20"
                            onClick={handleGenerateLibraryItem}
                            loading={isGenerating}
                            disabled={!search.trim()}
                        >
                            <i className="fas fa-magic mr-3"></i> Créer la collection "{search}"
                        </Button>
                    </div>
                )}
             </div>

            {/* Modal de Préférences de Renouvellement */}
            {showRenewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border animate-zoom-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <i className="fas fa-compass text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Renouveler le catalogue</h3>
                                <p className="text-xs text-text-muted">L'IA va générer de nouvelles suggestions.</p>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                                Thèmes préférés (Optionnel)
                            </label>
                            <textarea
                                value={renewPreferences}
                                onChange={(e) => setRenewPreferences(e.target.value)}
                                placeholder="Ex: Histoire de l'art, Physique quantique, Cuisine italienne..."
                                className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none text-sm min-h-[100px] resize-none transition-all"
                            />
                            <p className="text-[10px] text-text-muted mt-2 italic">
                                <i className="fas fa-info-circle mr-1"></i>
                                Laissez vide pour des suggestions aléatoires et variées.
                            </p>
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

            {/* Modal de Renommage */}
            {isRenameModalOpen && renameTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-border animate-zoom-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <i className="fas fa-edit text-xl"></i>
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Renommer la collection</h3>
                                <p className="text-xs text-text-muted">Changez le nom de votre liste.</p>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                                Nouveau nom
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none text-lg font-bold transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <Button variant="secondary" onClick={() => setIsRenameModalOpen(false)} className="rounded-xl">
                                Annuler
                            </Button>
                            <Button 
                                variant="primary" 
                                onClick={() => {
                                    if (newName.trim()) {
                                        if (renameType === 'user' && onRenameSet) {
                                            onRenameSet(renameTarget, newName.trim());
                                        } else if (renameType === 'curated' && renameId) {
                                            setCustomCollections((prev: LibraryItem[]) => prev.map((item: LibraryItem) => 
                                                item.id === renameId ? { ...item, title: newName.trim() } : item
                                            ));
                                        }
                                        setIsRenameModalOpen(false);
                                        showToast(`Collection renommée en "${newName.trim()}"`, 'success');
                                    }
                                }} 
                                disabled={!newName.trim() || newName === renameTarget}
                                className="rounded-xl px-6"
                            >
                                <i className="fas fa-check mr-2"></i> Enregistrer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'Aperçu des Fiches */}
            {previewCards && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-background w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] flex flex-col shadow-2xl border border-border overflow-hidden animate-zoom-in">
                        <div className="p-6 md:p-8 border-b border-border bg-background-secondary flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-2xl font-black text-primary leading-tight">{previewTitle}</h3>
                                <p className="text-xs text-text-muted font-bold mt-1 uppercase tracking-widest">{previewCards.length} fiches dans cette collection</p>
                            </div>
                            <button 
                                onClick={() => setPreviewCards(null)}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-background text-text-muted hover:text-text hover:bg-border transition-all"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {previewCards.map((card, idx) => (
                                    <div key={`preview-card-${card.id || idx}-${idx}`} className="p-5 rounded-2xl border border-border bg-background-secondary hover:border-primary/30 transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] font-black px-2 py-0.5 bg-primary/10 text-primary rounded-lg uppercase tracking-wider">{card.type}</span>
                                            <span className="text-[10px] text-text-muted font-mono opacity-50">#{idx + 1}</span>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            {card.type === 'classic' && card.terms && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    {Object.entries(card.terms).map(([lang, text], tIdx) => (
                                                        <div key={`preview-term-${lang}-${tIdx}`}>
                                                            <div className="text-[10px] font-bold text-text-muted uppercase tracking-tighter mb-1">{lang}</div>
                                                            <div className="text-sm font-semibold text-text">{text}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {card.type === 'mcq' && card.mcqData && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-tighter mb-1">Question</div>
                                                        <div className="text-sm font-semibold text-text">{card.mcqData.question.fr || Object.values(card.mcqData.question)[0]}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-bold text-success uppercase tracking-tighter mb-1">Réponse Correcte</div>
                                                        <div className="text-sm font-bold text-success">{card.mcqData.answer.fr || Object.values(card.mcqData.answer)[0]}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {card.type === 'cloze' && card.clozeData && (
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-tighter mb-1">Texte à trous</div>
                                                        <div className="text-sm font-semibold text-text italic">"{card.clozeData.text.fr || Object.values(card.clozeData.text)[0]}"</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-bold text-success uppercase tracking-tighter mb-1">Solutions</div>
                                                        <div className="text-sm font-bold text-success">
                                                            {(card.clozeData.answers.fr || Object.values(card.clozeData.answers)[0]).join(', ')}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-background-secondary flex justify-center shrink-0">
                            <Button variant="primary" onClick={() => setPreviewCards(null)} className="rounded-2xl px-12">
                                Fermer l'aperçu
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'Ajout Manuel */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-border animate-zoom-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <i className="fas fa-plus"></i>
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Nouveau sujet</h3>
                                <p className="text-xs text-text-muted">Créez votre propre piste de réflexion.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-1">Titre de la collection</label>
                                <input
                                    type="text"
                                    value={newItem.title}
                                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                    placeholder="Ex: Les fondamentaux de la mécanique quantique"
                                    className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2 ml-1">Description / Notes</label>
                                <textarea
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                    placeholder="De quoi s'agit-il ?"
                                    className="w-full p-4 rounded-2xl bg-background-secondary border border-border focus:ring-4 focus:ring-primary/10 outline-none transition-all min-h-[100px]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 justify-end">
                            <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2 font-bold text-text-muted hover:text-text transition-colors">
                                Annuler
                            </button>
                            <Button 
                                variant="primary" 
                                onClick={() => {
                                    if (newItem.title.trim()) {
                                        const item: LibraryItem = {
                                            id: uuidv4(),
                                            title: newItem.title.trim(),
                                            description: newItem.description.trim() || 'Sujet personnalisé',
                                            category: 'Mes Projets',
                                            cardsCount: 20,
                                            cards: []
                                        };
                                        setCustomCollections((prev: LibraryItem[]) => [item, ...prev]);
                                        setIsAddModalOpen(false);
                                        setNewItem({ title: '', description: '', category: 'Mes Idées' });
                                        showToast(`Sujet "${item.title}" ajouté !`, 'success');
                                    }
                                }} 
                                disabled={!newItem.title.trim()}
                                className="rounded-2xl px-10"
                            >
                                Ajouter
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
