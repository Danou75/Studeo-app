import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useAIConfig } from '../../../contexts/AIConfigContext';
import { useToast } from '../../../contexts/ToastContext';
import { useTTS } from '../../../hooks/useTTS';
import { useConjugationCache, CacheEntry, ConjugationCacheEntry } from '../../../hooks/useConjugationCache';
import { ConjugationResult, Flashcard, ConjugationTable } from '../../../types';
import { conjugateVerb } from '../../../services/conjugationService';
import { translateText, TranslationResult } from '../../../services/translationService';
import { v4 as uuidv4 } from 'uuid';
import { TUTORS } from '../../../constants';

import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

export function useConjugator(props: {
    defaultLang?: string;
    onAddCards?: (cards: Flashcard[]) => void;
    onCreateSet?: (name: string, cards: Flashcard[]) => void;
    onStartQuiz?: (cards: Flashcard[], questionLang: string, answerLang: string) => void;
}) {
    const { defaultLang = 'it', onAddCards, onCreateSet, onStartQuiz } = props;
    const [verb, setVerb] = useState('');
    const [language, setLanguage] = useState(defaultLang);
    const [result, setResult] = useState<ConjugationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();
    
    const [mode, setMode] = useState<'conjugate' | 'translate' | 'library'>('conjugate');
    const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
    const [selectedLibraryKeys, setSelectedLibraryKeys] = useState<Set<string>>(new Set());
    
    // Quiz modal
    const [showConjugQuizModal, setShowConjugQuizModal] = useState(false);
    const [conjQuizData, setConjQuizData] = useState<{
        conjEntries: ConjugationCacheEntry[];
        translationCards: Flashcard[];
        availableTenses: { tense: string; tenseName: string }[];
        selectedTenses: Set<string>;
    } | null>(null);

    // Repetitor
    const [repetitorTable, setRepetitorTable] = useState<ConjugationTable | null>(null);
    const [setName, setSetName] = useState('');
    const [isNewSet, setIsNewSet] = useState(true);

    const { config } = useAIConfig();
    const { showToast } = useToast();
    
    // Cache
    const cache = useConjugationCache();
    const [suggestions, setSuggestions] = useState<CacheEntry[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [fromCache, setFromCache] = useState(false);
    const [libraryFilter, setLibraryFilter] = useState<'all' | 'conjugation' | 'translation'>('all');
    const [librarySearch, setLibrarySearch] = useState('');
    const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
    const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list'>(() => {
        return (localStorage.getItem('studeo_library_view_mode') as 'grid' | 'list') || 'grid';
    });

    const inputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('studeo_library_view_mode', libraryViewMode);
    }, [libraryViewMode]);

    // One-time migration: assign tutorId by langCode to existing entries
    useEffect(() => {
        cache.migrateTutorIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tutorsWithContent = useMemo(() => {
        const uniqueTutorIds = new Set(cache.entries.map(e => e.tutorId).filter(Boolean));
        return TUTORS.filter(tutor => uniqueTutorIds.has(tutor.id));
    }, [cache.entries]);

    const tutorFilteredEntries = useMemo(() => {
        if (!selectedTutorId) return cache.entries;
        return cache.entries.filter(e => e.tutorId === selectedTutorId);
    }, [cache.entries, selectedTutorId]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const updateSuggestions = useCallback((query: string, currentMode: 'conjugate' | 'translate' | 'library', currentLang: string) => {
        if (currentMode === 'library') return;
        const effectiveMode = currentMode === 'conjugate' ? 'conjugate' : 'translate';
        const s = cache.getSuggestions(query, effectiveMode, currentLang);
        setSuggestions(s);
        setShowSuggestions(s.length > 0);
    }, [cache]);

    const getOppositeLang = (lang: string) => lang === 'fr' ? 'en' : 'fr';

    const LANGUAGES = [
        { code: 'fr', name: t('languages.fr'), flag: '🇫🇷' },
        { code: 'en', name: t('languages.en'), flag: '🇬🇧' },
        { code: 'es', name: t('languages.es'), flag: '🇪🇸' },
        { code: 'it', name: t('languages.it'), flag: '🇮🇹' },
        { code: 'de', name: t('languages.de'), flag: '🇩🇪' },
        { code: 'pt', name: t('languages.pt'), flag: '🇵🇹' },
        { code: 'pl', name: t('languages.pl'), flag: '🇵🇱' },
        { code: 'ru', name: t('languages.ru'), flag: '🇷🇺' },
        { code: 'tr', name: t('languages.tr'), flag: '🇹🇷' },
    ];

    const getSpeechLang = (langCode: string) => {
        switch (langCode) {
            case 'fr': return 'fr-FR';
            case 'en': return 'en-US';
            case 'es': return 'es-ES';
            case 'it': return 'it-IT';
            case 'de': return 'de-DE';
            case 'pt': return 'pt-PT';
            case 'pl': return 'pl-PL';
            case 'ru': return 'ru-RU';
            case 'tr': return 'tr-TR';
            default: return 'en-US';
        }
    };

    const currentTutorId = TUTORS.find(t => (t as any).language === language)?.id;
    const { speak, availableVoices, selectedVoice, setSelectedVoice } = useTTS(getSpeechLang(language), currentTutorId);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);

    const handleModeSwitch = (newMode: 'conjugate' | 'translate' | 'library') => {
        setMode(newMode);
        setResult(null);
        setTranslationResult(null);
        setError(null);
        setShowSuggestions(false);
    };

    const handleConjugate = async (e?: React.FormEvent, forcedVerb?: string) => {
        e?.preventDefault();
        const targetVerb = (forcedVerb ?? verb).trim();
        if (!targetVerb) return;

        setShowSuggestions(false);
        setFromCache(false);

        const cached = cache.findConjugation(targetVerb, language);
        if (cached) {
            setResult(cached.result);
            setSelectedItems({});
            setSetName(`${t('conjugator.title')}: ${cached.result.verb} (${cached.result.language})`);
            setFromCache(true);
            showToast('⚡ Chargé depuis la bibliothèque', 'success');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setSelectedItems({});

        try {
            let modelName = config.geminiModel;
            let apiKey: string | undefined = undefined;
            let apiUrl: string | undefined = undefined;

            switch(config.provider) {
                case 'gemini': apiKey = config.geminiApiKey; modelName = config.geminiModel; break;
                case 'openai': apiKey = config.openaiApiKey; modelName = config.openaiModel || 'gpt-4o'; break;
                case 'anthropic': apiKey = config.anthropicApiKey; modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620'; break;
                case 'mistral': apiKey = config.mistralApiKey; modelName = config.mistralModel || 'mistral-large-latest'; break;
                case 'local': apiUrl = config.localApiUrl; modelName = config.localModelName; break;
            }

            const langName = LANGUAGES.find(l => l.code === language)?.name || language;
            const data = await conjugateVerb(targetVerb, langName, config.provider, modelName, apiUrl, apiKey);
            setResult(data);
            setSetName(`${t('conjugator.title')}: ${data.verb} (${data.language})`);
            const conjTutorId = TUTORS.find(t => (t as any).language === language)?.id;
            cache.saveConjugation(targetVerb, language, langName, data, conjTutorId);
        } catch (err: any) {
            console.error(err);
            setError(`${t('common.error')}: ${err.message || String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleTranslate = async (e?: React.FormEvent, forcedText?: string) => {
        e?.preventDefault();
        const targetText = (forcedText ?? verb).trim();
        if (!targetText) return;

        setShowSuggestions(false);
        setFromCache(false);

        const cached = cache.findTranslation(targetText, language);
        if (cached) {
            setTranslationResult(cached.result);
            setSetName(`Traduction: ${cached.result.original} (${cached.result.language})`);
            setFromCache(true);
            showToast('⚡ Chargé depuis la bibliothèque', 'success');
            return;
        }

        setLoading(true);
        setError(null);
        setTranslationResult(null);
        setResult(null);

        try {
            let modelName = config.geminiModel;
            let apiKey: string | undefined = undefined;
            let apiUrl: string | undefined = undefined;

            switch(config.provider) {
                case 'gemini': apiKey = config.geminiApiKey; modelName = config.geminiModel; break;
                case 'openai': apiKey = config.openaiApiKey; modelName = config.openaiModel || 'gpt-4o'; break;
                case 'anthropic': apiKey = config.anthropicApiKey; modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620'; break;
                case 'mistral': apiKey = config.mistralApiKey; modelName = config.mistralModel || 'mistral-large-latest'; break;
                case 'local': apiUrl = config.localApiUrl; modelName = config.localModelName; break;
            }

            const langName = LANGUAGES.find(l => l.code === language)?.name || language;
            const data = await translateText(targetText, langName, config.provider, modelName, apiUrl, apiKey);
            setTranslationResult(data);
            setSetName(`Traduction: ${data.original} (${data.language})`);
            const transTutorId = TUTORS.find(t => (t as any).language === language)?.id;
            cache.saveTranslation(targetText, language, langName, data, transTutorId);
        } catch (err: any) {
            console.error(err);
            setError(`${t('common.error')}: ${err.message || String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (tenseName: string, pronoun: string) => {
        const key = `${tenseName}-${pronoun}`;
        setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const selectAllTense = (tenseName: string, forms: string[]) => {
        const allSelected = forms.every(p => selectedItems[`${tenseName}-${p}`]);
        const newSelection = { ...selectedItems };
        forms.forEach(p => { newSelection[`${tenseName}-${p}`] = !allSelected; });
        setSelectedItems(newSelection);
    };

    const handleFormChange = (tableIndex: number, pronoun: string, newForm: string) => {
        if (!result) return;
        const newResult = { ...result };
        newResult.tables = newResult.tables.map((table, idx) => {
            if (idx !== tableIndex) return table;
            return { ...table, forms: { ...table.forms, [pronoun]: newForm } };
        });
        setResult(newResult);
    };

    // Export handler
    const handleExport = async (format: 'md' | 'doc') => {
        if (!result || isExporting) return;
        setIsExporting(true);
        try {
            let content = '';
            const verbName = result.verb.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            let fileName = `conjugaison_${verbName}_${language}`;
            let mimeType = '';
            let extension = format === 'md' ? 'md' : 'rtf';

            if (format === 'md') {
                content = `# Conjugaison : ${result.verb.toUpperCase()} (${result.language})\n\n`;
                if (result.translation) content += `**Traduction :** ${result.translation}\n\n`;
                if (result.definition) content += `> ${result.definition}\n\n`;
                if (result.example) content += `**Exemple :** ${result.example}\n\n`;

                result.tables.forEach(table => {
                    content += `### ${table.tenseName} (${table.tense})\n\n`;
                    content += `| Personne | Forme |\n| --- | --- |\n`;
                    Object.entries(table.forms).forEach(([pronoun, form]) => {
                        content += `| ${pronoun} | **${form}** |\n`;
                    });
                    content += `\n`;
                });
                mimeType = 'text/markdown';
            } else {
                const escapeRTF = (str: string) => {
                    if (!str) return '';
                    let escaped = str.replace(/[\\{}]/g, (c) => `\\${c}`);
                    return escaped.replace(/[^\x00-\x7F]/g, (c) => {
                        return `\\u${c.charCodeAt(0)}?`;
                    });
                };
                let rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1036{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}{\\f1\\fnil\\fcharset0 Times New Roman;}}\n{\\colortbl ;\\red233\\green30\\blue99;\\red63\\green81\\blue181;\\red103\\green58\\blue183;\\red102\\green102\\blue102;}\n\\viewkind4\\uc1\\f0\\fs32\\b\\cf1 CONJUGAISON : ${escapeRTF(result.verb.toUpperCase())} (${escapeRTF(result.language)}) \\b0\\cf0\\fs24 \\par\n\\par\n${result.translation ? `\\b\\cf2 Traduction : ${escapeRTF(result.translation)}\\cf0\\b0 \\par\n` : ''}${result.definition ? `\\cf4 Definition : ${escapeRTF(result.definition)}\\cf0 \\par\n` : ''}${result.example ? `\\i Exemple : ${escapeRTF(result.example)}\\i0 \\par\n` : ''}\\par\n`;

                result.tables.forEach(table => {
                    rtf += `\\fs28\\b\\cf3 ${escapeRTF(table.tenseName || '')}\\cf0\\b0\\fs24 \\par\n\\trowd\\trgaph108\\trleft-108\n\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx3000\n\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx7000\n\\b Personne \\b0 \\cell \\b Forme \\b0 \\cell \\row\n`;
                    Object.entries(table.forms).forEach(([pronoun, form]) => {
                        rtf += `\\trowd\\trgaph108\\trleft-108\n\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx3000\n\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx7000\n${escapeRTF(pronoun)} \\cell \\b ${escapeRTF(form)} \\b0 \\cell \\row\n`;
                    });
                    rtf += `\\par\n`;
                });
                rtf += `\\par\\fs18\\cf4 Genere par Studeo\\cf0\\fs24 }`;
                content = rtf;
                mimeType = 'application/rtf';
            }

            // @ts-ignore
            if (window.__TAURI_IPC__) {
                const filePath = await save({
                    filters: [{ name: format === 'md' ? 'Markdown' : 'Rich Text Format', extensions: [extension] }],
                    defaultPath: `${fileName}.${extension}`
                });
                if (filePath) {
                    await writeTextFile(filePath, content);
                    showToast(t('common.success'), 'success');
                }
            } else {
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${fileName}.${extension}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(t('common.success'), 'success');
            }
        } catch (err) {
            console.error("Export error:", err);
            showToast(t('common.error'), 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const cleanupMarkdownForShare = (text: string) => {
        return text.replace(/^#+ (.*)$/gm, (_, p1) => p1.toUpperCase())
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/^- (.*)$/gm, '• $1')
            .replace(/> (.*)$/gm, '« $1 »')
            .trim();
    };

    const handleShare = async () => {
        let shareText = '';
        let title = '';

        if (mode === 'conjugate' && result) {
            title = `Conjugaison de ${result.verb}`;
            shareText = `${result.verb.toUpperCase()} (${result.language.toUpperCase()})\n`;
            if (result.translation) shareText += `Traduction : ${result.translation}\n`;
            if (result.definition) shareText += `\n"${result.definition}"\n`;
            if (result.example) shareText += `\nExemple : ${result.example}\n\n`;
            
            result.tables.forEach(table => {
                shareText += `--- ${table.tenseName.toUpperCase()} ---\n`;
                Object.entries(table.forms).forEach(([pronoun, form]) => {
                    shareText += `${pronoun} : ${form}\n`;
                });
                shareText += '\n';
            });
        } else if (mode === 'translate' && translationResult) {
            title = `Traduction de ${translationResult.original}`;
            shareText = `ORIGINAL : ${translationResult.original}\n`;
            shareText += `TRADUCTION (${translationResult.language.toUpperCase()}) : ${translationResult.translated}\n\n`;
            
            if (translationResult.context) shareText += `CONTEXTE :\n${cleanupMarkdownForShare(translationResult.context)}\n\n`;
            if (translationResult.examples?.length) {
                shareText += `EXEMPLES :\n`;
                translationResult.examples.forEach(ex => shareText += `• ${cleanupMarkdownForShare(ex)}\n`);
                shareText += '\n';
            }
            if (translationResult.notes) shareText += `NOTES :\n${cleanupMarkdownForShare(translationResult.notes)}\n\n`;
        }

        if (!shareText) return;
        shareText += `Partagé via Studeo`;

        if (navigator.share) {
            try { await navigator.share({ title, text: shareText }); } 
            catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('Share error:', err);
                    showToast("Erreur lors du partage", "error");
                }
            }
        } else {
            showToast("Le partage n'est pas supporté sur cet appareil", "info");
        }
    };

    const handleCreateCards = () => {
        if (!result) return;
        if (!onAddCards && !onCreateSet) return;
        const newCards: Flashcard[] = [];
        const timestamp = new Date().toISOString();

        result.tables.forEach(table => {
            Object.entries(table.forms).forEach(([pronoun, form]) => {
                if (selectedItems[`${table.tenseName}-${pronoun}`]) {
                    newCards.push({
                        id: uuidv4(),
                        type: 'classic',
                        terms: {
                            [getOppositeLang(language)]: `${pronoun} (${result.verb}) [${table.tenseName}]`,
                            [language]: form.trim()
                        },
                        srsData: {
                            interval: 0, repetitions: 0, easeFactor: 2.5,
                            nextReview: timestamp, lastReviewed: timestamp
                        }
                    });
                }
            });
        });

        if (newCards.length > 0) {
            if (isNewSet && onCreateSet && setName.trim()) {
                onCreateSet(setName, newCards);
                showToast(t('conjugator.createSuccess', { count: newCards.length, name: setName }), 'success');
            } else if (onAddCards) {
                onAddCards(newCards);
                showToast(t('conjugator.addSuccess', { count: newCards.length }), 'success');
            }
            setSelectedItems({});
        } else {
            showToast(t('conjugator.selectWarning'), 'warning');
        }
    };

    const toggleLibraryItem = (key: string) => {
        setSelectedLibraryKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    // Pronouns
    const FRENCH_PRONOUN_MAP: Record<string, string> = {
        'io': 'je', 'tu': 'tu', 'lui/lei/lei': 'il/elle', 'noi': 'nous', 'voi': 'vous', 'loro': 'ils/elles',
        'yo': 'je', 'tú': 'tu', 'él/ella/ud.': 'il/elle', 'nosotros': 'nous', 'vosotros': 'vous', 'ellos/ellas/uds.': 'ils/elles',
        'i': 'je', 'you': 'tu', 'he/she/it': 'il/elle', 'we': 'nous', 'they': 'ils/elles',
        'ich': 'je', 'du': 'tu', 'er/sie/es': 'il/elle', 'wir': 'nous', 'ihr': 'vous', 'sie': 'ils/elles',
        'eu': 'je', 'tu / você': 'tu', 'ele/ela/você': 'il/elle', 'nós': 'nous', 'vós / vocês': 'vous', 'eles/elas/vocês': 'ils/elles',
    };
    const getFrenchPronoun = (pronoun: string) => FRENCH_PRONOUN_MAP[pronoun.toLowerCase()] || pronoun;

    const getCanonicalPronounOrder = (pronoun: string): number => {
        const p = pronoun.toLowerCase().trim();
        if (p === 'io' || p === 'yo' || p === 'ich' || p === 'eu' || p === 'i' || p === 'je') return 0;
        if (p === 'tu' || p === 't\u00fa' || p === 'du' || p === 'you' || p.startsWith('tu /')) return 1;
        if (p.includes('lui') || p.includes('lei') || p.includes('\u00e9l') || p.startsWith('er/') || p.startsWith('he/') || p.startsWith('il/') || p.startsWith('ele/')) return 2;
        if (p === 'noi' || p === 'nosotros' || p === 'nous' || p === 'wir' || p === 'we' || p === 'n\u00f3s') return 3;
        if (p === 'voi' || p === 'vosotros' || p === 'vous' || p === 'ihr' || p.startsWith('you (pl') || p.startsWith('v\u00f3s')) return 4;
        if (p === 'loro' || p.startsWith('ellos') || p === 'sie' || p === 'they' || p.startsWith('ils') || p.startsWith('eles')) return 5;
        return 99;
    };

    const sortedFormEntries = (forms: Record<string, string>): [string, string][] =>
        Object.entries(forms).sort(([a], [b]) => getCanonicalPronounOrder(a) - getCanonicalPronounOrder(b));

    const buildConjugationCards = (conjEntries: ConjugationCacheEntry[], selectedTenses: Set<string>): Flashcard[] => {
        const cards: Flashcard[] = [];
        for (const entry of conjEntries) {
            const frVerb = entry.result.translation || entry.verb;
            for (const table of entry.result.tables) {
                if (!selectedTenses.has(table.tense)) continue;
                for (const [pronoun, form] of sortedFormEntries(table.forms)) {
                    if (!form || form === '-') continue;
                    const frPronoun = getFrenchPronoun(pronoun);
                    cards.push({
                        id: uuidv4(), type: 'classic' as const,
                        terms: { recto: `${frPronoun} - ${frVerb} (${table.tenseName})`, verso: form }
                    });
                }
            }
        }
        return cards;
    };

    const handleLaunchLibraryQuiz = (filteredEntries: any[]) => {
        const toQuiz = filteredEntries.filter(e => selectedLibraryKeys.has(e.key));
        if (toQuiz.length === 0) { showToast('Sélectionnez au moins une entrée', 'warning'); return; }
        if (!onStartQuiz) { showToast('Fonction non disponible', 'error'); return; }

        const conjEntries = toQuiz.filter(e => e.type === 'conjugation') as ConjugationCacheEntry[];
        const transEntries = toQuiz.filter(e => e.type === 'translation');

        const translationCards: Flashcard[] = transEntries.map(entry => ({
            id: uuidv4(), type: 'classic' as const,
            terms: { recto: entry.result.original, verso: entry.result.translated }
        }));

        if (conjEntries.length === 0) {
            showToast(`${translationCards.length} fiches prêtes ! Lancement...`, 'success');
            setTimeout(() => onStartQuiz(translationCards, 'recto', 'verso'), 300);
            return;
        }

        const tenseMap = new Map<string, string>();
        for (const entry of conjEntries) {
            for (const table of entry.result.tables) {
                if (!tenseMap.has(table.tense)) tenseMap.set(table.tense, table.tenseName);
            }
        }
        const availableTenses = Array.from(tenseMap.entries()).map(([tense, tenseName]) => ({ tense, tenseName }));

        setConjQuizData({
            conjEntries, translationCards, availableTenses,
            selectedTenses: new Set(availableTenses.map(t => t.tense)),
        });
        setShowConjugQuizModal(true);
    };

    const handleLaunchConjugQuiz = () => {
        if (!conjQuizData || !onStartQuiz) return;
        const { conjEntries, translationCards, selectedTenses } = conjQuizData;
        const conjCards = buildConjugationCards(conjEntries, selectedTenses);
        const allCards = [...conjCards, ...translationCards];
        if (allCards.length === 0) { showToast('Aucune fiche générée — vérifiez les temps sélectionnés', 'warning'); return; }
        setShowConjugQuizModal(false);
        showToast(`${allCards.length} fiches prêtes ! Lancement...`, 'success');
        setTimeout(() => onStartQuiz(allCards, 'recto', 'verso'), 300);
    };

        const selectedCount = Object.values(selectedItems).filter(Boolean).length;

    return {
        // State
        verb, setVerb, language, setLanguage, mode, setMode: handleModeSwitch,
        result, setResult, translationResult, setTranslationResult, loading, error, setError, isExporting,
        
        // Cache/Suggestions
        cache, suggestions, showSuggestions, setShowSuggestions, fromCache, setFromCache,
        updateSuggestions, inputRef, suggestionsRef,
        
        // Library
        libraryFilter, setLibraryFilter, librarySearch, setLibrarySearch,
        selectedTutorId, setSelectedTutorId, tutorsWithContent,
        tutorFilteredEntries,
        libraryViewMode, setLibraryViewMode, selectedLibraryKeys, setSelectedLibraryKeys,
        toggleLibraryItem, cacheEntries: tutorFilteredEntries, cacheEntryCount: tutorFilteredEntries.length,
        clearAll: cache.clearAll, deleteEntry: cache.deleteEntry,
        
        // Settings / TTS
        showVoiceSettings, setShowVoiceSettings, speak, availableVoices, selectedVoice, setSelectedVoice,
        getSpeechLang, LANGUAGES,
        
        // Actions
        handleConjugate, handleTranslate, handleExport, handleShare, handleCreateCards,
        
        // Selection
        selectedItems, toggleSelection, selectAllTense, handleFormChange, selectedCount,
        setName, setSetName, isNewSet, setIsNewSet, sortedFormEntries,
        
        // Tutor Filter
        selectedTutor: config.selectedTutor,
        
        // Quiz
        showConjugQuizModal, setShowConjugQuizModal, conjQuizData, setConjQuizData,
        handleLaunchLibraryQuiz, handleLaunchConjugQuiz, buildConjugationCards,
        
        // Repetitor
        repetitorTable, setRepetitorTable
    };
}
