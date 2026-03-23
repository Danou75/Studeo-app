import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getThemeGradient, ThemeMode, ThemeStyle } from '../constants/themes';
import { Button } from './ui/Button';
import { conjugateVerb } from '../services/conjugationService';
import { translateText, TranslationResult } from '../services/translationService';
import { ConjugationResult, Flashcard, ConjugationTable } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { RepetitorScreen } from './RepetitorScreen';
import { useAIConfig } from '../contexts/AIConfigContext';
import { useTTS } from '../hooks/useTTS';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../contexts/LanguageContext';
import { AILoader } from './ui/AILoader';
import { useConjugationCache, CacheEntry } from '../hooks/useConjugationCache';

import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

interface ConjugatorScreenProps {
  onBack: () => void;
  defaultLang?: string;
  onAddCards?: (cards: Flashcard[]) => void;
  onCreateSet?: (name: string, cards: Flashcard[]) => void;
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  onNavigateToSettings?: () => void;
}

export const ConjugatorScreen: React.FC<ConjugatorScreenProps> = ({ 
  onBack, 
  defaultLang = 'it', 
  onAddCards, 
  onCreateSet,
  themeMode,
  themeStyle,
  onNavigateToSettings
}) => {
  const [verb, setVerb] = useState('');
  const [language, setLanguage] = useState(defaultLang);
  const [result, setResult] = useState<ConjugationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  
  // Mode selection: 'conjugate' | 'translate' | 'library'
  const [mode, setMode] = useState<'conjugate' | 'translate' | 'library'>('conjugate');
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  // Repetitor mode
  const [repetitorTable, setRepetitorTable] = useState<ConjugationTable | null>(null);
  const [setName, setSetName] = useState('');
  const [isNewSet, setIsNewSet] = useState(true);

  // Utiliser la configuration IA globale
  const { config } = useAIConfig();
  const { showToast } = useToast();

  // ── Cache & autocomplete ──────────────────────────────
  const cache = useConjugationCache();
  const [suggestions, setSuggestions] = useState<CacheEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'conjugation' | 'translation'>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('studeo_library_view_mode') as 'grid' | 'list') || 'grid';
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('studeo_library_view_mode', libraryViewMode);
  }, [libraryViewMode]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Update suggestions as the query changes
  const updateSuggestions = useCallback((query: string, currentMode: 'conjugate' | 'translate' | 'library', currentLang: string) => {
    if (currentMode === 'library') return;
    const effectiveMode = currentMode === 'conjugate' ? 'conjugate' : 'translate';
    const s = cache.getSuggestions(query, effectiveMode, currentLang);
    setSuggestions(s);
    setShowSuggestions(s.length > 0);
  }, [cache]);

  const getOppositeLang = (lang: string) => {
      // In Studeo, we usually study towards English or French.
      // If target is French, opposite is English. Otherwise, it's French.
      return lang === 'fr' ? 'en' : 'fr';
  };

  // TTS Hook
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

  const { speak, availableVoices, selectedVoice, setSelectedVoice } = useTTS(getSpeechLang(language));
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

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

  const handleConjugate = async (e?: React.FormEvent, forcedVerb?: string) => {
    e?.preventDefault();
    const targetVerb = (forcedVerb ?? verb).trim();
    if (!targetVerb) return;

    setShowSuggestions(false);
    setFromCache(false);

    // ── Check cache first ────────────────────
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
          case 'gemini':
              apiKey = config.geminiApiKey;
              modelName = config.geminiModel;
              break;
          case 'openai':
              apiKey = config.openaiApiKey;
              modelName = config.openaiModel || 'gpt-4o';
              break;
          case 'anthropic':
              apiKey = config.anthropicApiKey;
              modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620';
              break;
          case 'mistral':
              apiKey = config.mistralApiKey;
              modelName = config.mistralModel || 'mistral-large-latest';
              break;
          case 'local':
              apiUrl = config.localApiUrl;
              modelName = config.localModelName;
              break;
      }

      const langName = LANGUAGES.find(l => l.code === language)?.name || language;
      const data = await conjugateVerb(targetVerb, langName, config.provider, modelName, apiUrl, apiKey);
      setResult(data);
      setSetName(`${t('conjugator.title')}: ${data.verb} (${data.language})`);
      // Save to cache
      cache.saveConjugation(targetVerb, language, langName, data);
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

    // ── Check cache first ────────────────────
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
          case 'gemini':
              apiKey = config.geminiApiKey;
              modelName = config.geminiModel;
              break;
          case 'openai':
              apiKey = config.openaiApiKey;
              modelName = config.openaiModel || 'gpt-4o';
              break;
          case 'anthropic':
              apiKey = config.anthropicApiKey;
              modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620';
              break;
          case 'mistral':
              apiKey = config.mistralApiKey;
              modelName = config.mistralModel || 'mistral-large-latest';
              break;
          case 'local':
              apiUrl = config.localApiUrl;
              modelName = config.localModelName;
              break;
      }

      const langName = LANGUAGES.find(l => l.code === language)?.name || language;
      const data = await translateText(targetText, langName, config.provider, modelName, apiUrl, apiKey);
      setTranslationResult(data);
      setSetName(`Traduction: ${data.original} (${data.language})`);
      // Save to cache
      cache.saveTranslation(targetText, language, langName, data);
    } catch (err: any) {
      console.error(err);
      setError(`${t('common.error')}: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (tenseName: string, pronoun: string) => {
      const key = `${tenseName}-${pronoun}`;
      setSelectedItems(prev => ({
          ...prev,
          [key]: !prev[key]
      }));
  };

  const selectAllTense = (tenseName: string, forms: string[]) => {
      const allSelected = forms.every(p => selectedItems[`${tenseName}-${p}`]);
      const newSelection = { ...selectedItems };
      forms.forEach(p => {
          newSelection[`${tenseName}-${p}`] = !allSelected;
      });
      setSelectedItems(newSelection);
  };

  const handleFormChange = (tableIndex: number, pronoun: string, newForm: string) => {
      if (!result) return;
      
      const newResult = { ...result };
      // Copie profonde sécurisée pour react state
      newResult.tables = newResult.tables.map((table, idx) => {
          if (idx !== tableIndex) return table;
          return {
              ...table,
              forms: {
                  ...table.forms,
                  [pronoun]: newForm
              }
          };
      });
      
      setResult(newResult);
  };

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
          content += `| Personne | Forme |\n`;
          content += `| --- | --- |\n`;
          Object.entries(table.forms).forEach(([pronoun, form]) => {
            content += `| ${pronoun} | **${form}** |\n`;
          });
          content += `\n`;
        });
        mimeType = 'text/markdown';
      } else {
        // Format RTF (Rich Text Format) - Extremely stable and native on Mac (Pages/TextEdit)
        const escapeRTF = (str: string) => {
            if (!str) return '';
            // Escape special RTF characters
            let escaped = str.replace(/[\\{}]/g, (c) => `\\${c}`);
            // Escape Unicode characters for RTF (\uN?)
            return escaped.replace(/[^\x00-\x7F]/g, (c) => {
                const charCode = c.charCodeAt(0);
                return `\\u${charCode}?`;
            });
        };

        let rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1036{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}{\\f1\\fnil\\fcharset0 Times New Roman;}}
{\\colortbl ;\\red233\\green30\\blue99;\\red63\\green81\\blue181;\\red103\\green58\\blue183;\\red102\\green102\\blue102;}
\\viewkind4\\uc1\\f0\\fs32\\b\\cf1 CONJUGAISON : ${escapeRTF(result.verb.toUpperCase())} (${escapeRTF(result.language)}) \\b0\\cf0\\fs24 \\par
\\par
${result.translation ? `\\b\\cf2 Traduction : ${escapeRTF(result.translation)}\\cf0\\b0 \\par` : ''}
${result.definition ? `\\cf4 Definition : ${escapeRTF(result.definition)}\\cf0 \\par` : ''}
${result.example ? `\\i Exemple : ${escapeRTF(result.example)}\\i0 \\par` : ''}
\\par`;

        result.tables.forEach(table => {
          rtf += `\\fs28\\b\\cf3 ${escapeRTF(table.tenseName || '')}\\cf0\\b0\\fs24 \\par
\\trowd\\trgaph108\\trleft-108
\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx3000
\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx7000
\\b Personne \\b0 \\cell \\b Forme \\b0 \\cell \\row\n`;

          Object.entries(table.forms).forEach(([pronoun, form]) => {
            rtf += `\\trowd\\trgaph108\\trleft-108
\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx3000
\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx7000
${escapeRTF(pronoun)} \\cell \\b ${escapeRTF(form)} \\b0 \\cell \\row\n`;
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
          filters: [{
            name: format === 'md' ? 'Markdown' : 'Rich Text Format',
            extensions: [extension]
          }],
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
    return text
        .replace(/^#+ (.*)$/gm, (_, p1) => p1.toUpperCase())
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
        if (result.example) shareText += `\nExemple : ${result.example}\n`;
        
        shareText += '\n';
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
        shareText = `TRADUCTION (${translationResult.language.toUpperCase()}) : ${translationResult.translated}\n\n`;
        
        if (translationResult.context) {
            shareText += `CONTEXTE :\n${cleanupMarkdownForShare(translationResult.context)}\n\n`;
        }
        
        if (translationResult.examples && translationResult.examples.length > 0) {
            shareText += `EXEMPLES :\n`;
            translationResult.examples.forEach(ex => {
                shareText += `• ${cleanupMarkdownForShare(ex)}\n`;
            });
            shareText += '\n';
        }
        
        if (translationResult.notes) {
            shareText += `NOTES :\n${cleanupMarkdownForShare(translationResult.notes)}\n\n`;
        }
    }

    if (!shareText) return;

    shareText += `Partagé via Studeo`;

    if (navigator.share) {
        try {
            await navigator.share({
                title,
                text: shareText
            });
        } catch (err) {
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
      if (!onAddCards && !onCreateSet) return; // Need at least one handler

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
                          interval: 0,
                          repetitions: 0,
                          easeFactor: 2.5,
                          nextReview: timestamp,
                          lastReviewed: timestamp
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
          setSelectedItems({}); // Reset selection
      } else {
          showToast(t('conjugator.selectWarning'), 'warning');
      }
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  if (repetitorTable && result) {
    const langCode = LANGUAGES.find(l => l.name === result.language)?.code || language;
    
    return (
      <RepetitorScreen
        verb={result.verb}
        language={langCode}
        table={repetitorTable}
        onBack={() => setRepetitorTable(null)}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full text-text animate-fade-in overflow-hidden relative">
      {/* Header */}
      <div 
        className={`transition-all duration-500 pt-safe p-4 md:p-6 shadow-lg relative overflow-hidden shrink-0 group ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
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
          <div className="relative z-10 flex justify-between items-start">
              <div className="flex flex-col">
                  <Button 
                      variant="secondary" 
                      onClick={onBack} 
                      size="sm" 
                      className={`transition-all mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                  >
                      <i className="fas fa-home mr-2 text-inherit"></i> {t('common.home')}
                  </Button>
                  <h1 className="text-3xl font-black drop-shadow-sm text-inherit">
                      {t('conjugator.title')}
                  </h1>
                  <p className="opacity-80 mt-1 text-base text-inherit">
                      {mode === 'conjugate' ? t('conjugator.conjugateSubtitle') : mode === 'translate' ? t('conjugator.translateSubtitle') : '📚 Vos conjugaisons & traductions sauvegardées'}
                  </p>
                  
                  {/* Mode Selector */}
                  <div className={`inline-flex gap-0.5 mt-2 p-0.5 rounded-lg backdrop-blur-sm shadow-inner border ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/20'}`}>
                      <button
                          onClick={() => {
                              setMode('conjugate');
                              setResult(null);
                              setTranslationResult(null);
                              setError(null);
                              setShowSuggestions(false);
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                              mode === 'conjugate'
                                  ? 'bg-white text-primary shadow-md'
                                  : themeStyle === 'apple' && themeMode === 'light' 
                                      ? 'text-primary/40 hover:text-primary/60' 
                                      : 'text-white/70 hover:text-white'
                          }`}
                      >
                          <i className="fas fa-book mr-1.5"></i>Conjugaison
                      </button>
                      <button
                          onClick={() => {
                              setMode('translate');
                              setResult(null);
                              setTranslationResult(null);
                              setError(null);
                              setShowSuggestions(false);
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                              mode === 'translate'
                                  ? 'bg-white text-primary shadow-md'
                                  : themeStyle === 'apple' && themeMode === 'light' 
                                      ? 'text-primary/40 hover:text-primary/60' 
                                      : 'text-white/70 hover:text-white'
                          }`}
                      >
                          <i className="fas fa-language mr-1.5"></i>Traduction
                      </button>
                      <button
                          onClick={() => {
                              setMode('library');
                              setResult(null);
                              setTranslationResult(null);
                              setError(null);
                              setShowSuggestions(false);
                          }}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all relative ${
                              mode === 'library'
                                  ? 'bg-white text-primary shadow-md'
                                  : themeStyle === 'apple' && themeMode === 'light' 
                                      ? 'text-primary/40 hover:text-primary/60' 
                                      : 'text-white/70 hover:text-white'
                          }`}
                      >
                          <i className="fas fa-database mr-1.5"></i>Bibliothèque
                          {cache.entries.length > 0 && (
                              <span className="absolute -top-1 -right-1 bg-accent text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                  {cache.entries.length > 99 ? '99+' : cache.entries.length}
                              </span>
                          )}
                      </button>
                  </div>
              </div>

              <div className="flex gap-2 items-center">
                  {(result || translationResult) && (
                      <div className={`flex gap-1 p-1 rounded-xl backdrop-blur-sm shadow-inner border transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/20'}`}>
                          {mode === 'conjugate' && result && (
                              <>
                                <button 
                                    onClick={() => handleExport('md')}
                                    disabled={isExporting}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/5 text-primary' : 'hover:bg-white/20 text-white'}`}
                                    title={t('conjugator.exportMD')}
                                >
                                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fab fa-markdown"></i>} <span className="hidden sm:inline">MD</span>
                                </button>
                                <div className={`w-px h-4 self-center ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/10' : 'bg-white/20'}`}></div>
                                <button 
                                    onClick={() => handleExport('doc')}
                                    disabled={isExporting}
                                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/5 text-primary' : 'hover:bg-white/20 text-white'}`}
                                    title={t('conjugator.exportWord')}
                                >
                                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-file-word"></i>} <span className="hidden sm:inline">RTF</span>
                                </button>
                                <div className={`w-px h-4 self-center ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/10' : 'bg-white/20'}`}></div>
                              </>
                          )}
                          <button 
                              onClick={handleShare}
                              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/5 text-primary' : 'hover:bg-white/20 text-white'}`}
                              title="Partager"
                          >
                              <i className="fas fa-share-alt"></i> <span className="hidden sm:inline">Partager</span>
                          </button>
                      </div>
                  )}

                  <button 
                      onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all backdrop-blur-sm border ${
                          showVoiceSettings ? 'bg-white text-rose-600 border-white' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                      }`}
                      title={t('conjugator.voiceSettings')}
                  >
                      <i className="fas fa-sliders-h"></i>
                  </button>

                  {selectedCount > 0 && onAddCards && (
                      <Button onClick={handleCreateCards} size="sm" className="bg-white/90 hover:bg-white text-rose-600 border-none font-bold shadow-lg transform hover:scale-105 active:scale-95 transition-all">
                          <i className="fas fa-plus-circle mr-2"></i> {t('conjugator.createCards', { count: selectedCount })}
                      </Button>
                  )}
              </div>
          </div>
      </div>

      <div className="p-4 md:p-6 flex-1 overflow-y-auto min-h-0 pb-32">
        <div className="space-y-6">

       {showVoiceSettings && (
            <div className="absolute top-20 right-4 z-50 bg-background rounded-xl shadow-2xl border border-border w-72 overflow-hidden animate-fade-in-down">
                <div className="p-3 bg-background-secondary border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-sm text-text">{t('conjugator.voiceTitle', { lang: getSpeechLang(language) })}</h3>
                    <button onClick={() => setShowVoiceSettings(false)} className="text-text-muted hover:text-red-500">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {availableVoices.length === 0 ? (
                        <div className="text-center p-4 text-sm text-text-muted">{t('conjugator.noVoice')}</div>
                    ) : (
                        availableVoices.map((voice, idx) => (
                            <button
                                key={`${voice.name}-${idx}`}
                                onClick={() => {
                                    setSelectedVoice(voice);
                                    speak(t('conjugator.voiceTest'), 1, voice);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs md:text-sm flex items-center justify-between transition-colors ${
                                    selectedVoice?.name === voice.name 
                                        ? 'bg-primary/10 text-primary font-semibold border-primary border' 
                                        : 'hover:bg-background-secondary text-text'
                                }`}
                            >
                                <span className="truncate">{voice.name}</span>
                                {selectedVoice?.name === voice.name && <i className="fas fa-check"></i>}
                            </button>
                        ))
                    )}
                </div>
            </div>
        )}
        

        {/* Search + cache form — hidden in library mode */}
        {mode !== 'library' && (
        <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border/50">
        <form onSubmit={mode === 'conjugate' ? handleConjugate : handleTranslate} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
                <label className="block text-sm font-medium mb-1 text-text-secondary">
                    {mode === 'conjugate' ? t('conjugator.verbLabel') : t('conjugator.textToTranslate')}
                </label>
                {/* Input + autocomplete dropdown */}
                <div className="relative group/input">
                    <input
                        ref={inputRef}
                        type="text"
                        value={verb}
                        onChange={(e) => {
                            setVerb(e.target.value);
                            updateSuggestions(e.target.value, mode, language);
                        }}
                        onFocus={() => updateSuggestions(verb, mode, language)}
                        placeholder={mode === 'conjugate' ? t('conjugator.verbPlaceholder') : t('conjugator.translatePlaceholder')}
                        className="w-full p-3 pr-10 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none transition-all text-lg text-text"
                        autoFocus
                    />
                    {verb && (
                        <button
                            type="button"
                            onClick={() => {
                                setVerb('');
                                setResult(null);
                                setTranslationResult(null);
                                setError(null);
                                setFromCache(false);
                                setShowSuggestions(false);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500 transition-colors p-1"
                            title={t('common.clear')}
                        >
                            <i className="fas fa-times-circle"></i>
                        </button>
                    )}

                    {/* Autocomplete dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div
                            ref={suggestionsRef}
                            className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in"
                        >
                            <div className="px-3 pt-2 pb-1">
                                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Bibliothèque</span>
                            </div>
                            {suggestions.map((entry) => {
                                const label = entry.type === 'conjugation'
                                    ? (entry as any).verb
                                    : (entry as any).text;
                                const langFlag = LANGUAGES.find(l => l.code === entry.langCode)?.flag ?? '';
                                const dateStr = new Date(entry.lastAccessedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                                return (
                                    <button
                                        key={entry.key}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setVerb(label);
                                            setShowSuggestions(false);
                                            if (mode === 'conjugate') handleConjugate(undefined, label);
                                            else handleTranslate(undefined, label);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5 transition-colors text-left"
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                                            <i className="fas fa-bolt text-accent text-[10px]"></i>
                                        </span>
                                        <span className="flex-1 font-semibold text-text text-sm capitalize">{label}</span>
                                        <span className="text-xs text-text-muted">{langFlag}</span>
                                        <span className="text-[10px] text-text-muted/70 hidden sm:block">{dateStr}</span>
                                    </button>
                                );
                            })}
                            <div className="h-px bg-border/40 mx-3"></div>
                            <button
                                type="button"
                                onMouseDown={() => { setMode('library'); setShowSuggestions(false); }}
                                className="w-full px-3 py-2 text-[11px] text-primary font-semibold hover:bg-primary/5 transition-colors text-left flex items-center gap-2"
                            >
                                <i className="fas fa-database text-xs"></i>
                                Voir toute la bibliothèque
                            </button>
                        </div>
                    )}
                </div>

                {/* "From cache" badge */}
                {fromCache && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-accent font-semibold">
                        <i className="fas fa-bolt"></i>
                        Chargé instantanément depuis la bibliothèque
                    </div>
                )}
            </div>
            
            <div className="w-full md:w-48">
                <label className="block text-sm font-medium mb-1 text-text-secondary">{t('conjugator.targetLang')}</label>
                <select
                    value={language}
                    onChange={(e) => { setLanguage(e.target.value); setShowSuggestions(false); }}
                    className="w-full p-3 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer text-text"
                >
                    {LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                        </option>
                    ))}
                </select>
            </div>

            <Button 
                onClick={mode === 'conjugate' ? handleConjugate : handleTranslate} 
                disabled={loading || !verb.trim()}
                className="w-full md:w-auto h-[50px] min-w-[140px] relative overflow-hidden"
            >
                {loading ? (
                    <div className="flex items-center gap-3">
                        <AILoader size="sm" className="brightness-200" />
                        <span className="animate-pulse">Analyse...</span>
                    </div>
                ) : (
                    <><i className={`fas ${mode === 'conjugate' ? 'fa-magic' : 'fa-language'} mr-2`}></i> {mode === 'conjugate' ? t('conjugator.conjugate') : t('conjugator.translate')}</>
                )}
            </Button>
        </form>
      </div>
        )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg animate-fade-in">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
        </div>
      )}

      {/* Translation Results */}
      {translationResult && (
        <div className="space-y-4 md:space-y-6 animate-slide-up">
            <div className="bg-background-tertiary p-4 md:p-6 rounded-xl border-l-4 border-primary shadow-sm">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mb-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] md:text-sm text-text-muted uppercase tracking-wider mb-1">Original</p>
                                <h2 className="text-xl md:text-3xl font-bold break-words">{translationResult.original}</h2>
                            </div>
                            <div className="hidden md:block">
                                <i className="fas fa-arrow-right text-2xl text-primary"></i>
                            </div>
                            <div className="md:hidden flex justify-center py-1">
                                <i className="fas fa-arrow-down text-xl text-primary"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] md:text-sm text-text-muted uppercase tracking-wider mb-1">{translationResult.language}</p>
                                <h2 className="text-xl md:text-3xl font-bold text-primary break-words">{translationResult.translated}</h2>
                                <button onClick={() => speak(translationResult.translated)} className="mt-2 text-sm hover:text-primary transition-colors inline-flex items-center gap-1.5">
                                    <i className="fas fa-volume-up"></i> <span>Écouter</span>
                                </button>
                            </div>
                        </div>

                        {translationResult.context && (
                            <div className="bg-background/50 p-3 rounded-lg mb-3">
                                <p className="text-sm font-semibold text-text-secondary mb-1">
                                    <i className="fas fa-info-circle mr-1"></i> Contexte
                                </p>
                                <p className="text-text">{translationResult.context}</p>
                            </div>
                        )}

                        {translationResult.examples && translationResult.examples.length > 0 && (
                            <div className="bg-background/50 p-3 rounded-lg mb-3">
                                <p className="text-sm font-semibold text-text-secondary mb-2">
                                    <i className="fas fa-book mr-1"></i> Exemples
                                </p>
                                <ul className="space-y-2">
                                    {translationResult.examples.map((example, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-primary font-bold">•</span>
                                            <span className="text-text">{example}</span>
                                            <button onClick={() => speak(example)} className="ml-auto hover:text-primary transition-colors">
                                                <i className="fas fa-volume-up text-xs"></i>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {translationResult.notes && (
                            <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                                <p className="text-sm font-semibold text-accent mb-1">
                                    <i className="fas fa-lightbulb mr-1"></i> Notes
                                </p>
                                <p className="text-text-secondary text-sm">{translationResult.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Create Flashcard Button */}
                <div className="mt-4 pt-4 border-t border-border">
                    <Button
                        onClick={() => {
                            const newCard: Flashcard = {
                                id: uuidv4(),
                                type: 'classic',
                                terms: {
                                    'fr': translationResult.original,
                                    [language]: translationResult.translated
                                },
                                srsData: {
                                    interval: 0,
                                    repetitions: 0,
                                    easeFactor: 2.5,
                                    nextReview: new Date().toISOString(),
                                    lastReviewed: new Date().toISOString()
                                }
                            };
                            if (onAddCards) {
                                onAddCards([newCard]);
                                showToast('Flashcard créée avec succès !', 'success');
                            }
                        }}
                        className="w-full md:w-auto"
                    >
                        <i className="fas fa-plus-circle mr-2"></i>
                        Créer une flashcard
                    </Button>
                </div>
            </div>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-slide-up">
            <div className="bg-background-tertiary p-6 rounded-xl border-l-4 border-primary shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold mb-2 capitalize">{result.verb} <span className="text-sm font-normal text-text-muted opacity-70">({LANGUAGES.find(l => l.code === language)?.name})</span></h2>
                        {result.translation && (
                            <p className="text-xl text-primary font-medium mb-2">{result.translation}</p>
                        )}
                        {result.definition && (
                            <p className="text-text-secondary italic mb-2">"{result.definition}"</p>
                        )}
                        {result.example && (
                            <p className="text-sm bg-background/50 p-2 rounded inline-block text-text-muted">
                                📝 {t('conjugator.exampleLabel')} {result.example}
                                <button onClick={() => speak(result.example!)} className="ml-2 hover:text-primary transition-colors">
                                    <i className="fas fa-volume-up"></i>
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-sm text-text-muted italic text-center">
                <i className="fas fa-info-circle mr-1"></i> {t('conjugator.selectionInfo')}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                {result.tables.map((table, index) => (
                    <div key={index} className="bg-background-secondary rounded-xl overflow-hidden shadow-lg border border-border/30 hover:shadow-xl transition-all duration-300 group">
                        <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-3 border-b border-border/30 flex justify-between items-center gap-2 group-hover:from-primary/30 group-hover:to-accent/30 transition-all min-h-[64px]">
                            <div 
                                className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 flex-1 cursor-pointer min-w-0"
                                onClick={() => selectAllTense(table.tenseName, Object.keys(table.forms))}
                                title={t('conjugator.selectionTooltip')}
                            >
                                <h3 className="font-bold text-base md:text-lg text-primary leading-tight">
                                    {table.tenseName || t('conjugator.tenseHeader')}
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-background/50 text-text-muted border border-border/20 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                                    {table.tense || "—"}
                                </span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setRepetitorTable(table); }}
                                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-accent hover:opacity-90 text-white shadow-sm transition-all hover:scale-110 active:scale-95 ml-auto"
                                title={t('conjugator.practiceRepetitor')}
                            >
                                <i className="fas fa-microphone text-sm"></i>
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {Object.entries(table.forms).map(([pronoun, form]) => {
                                const isSelected = selectedItems[`${table.tenseName}-${pronoun}`];
                                return (
                                    <div 
                                        key={pronoun} 
                                        className={`grid grid-cols-[24px_auto_1fr_32px] md:grid-cols-[24px_auto_1fr_40px] items-center gap-3 py-2 px-3 rounded transition-colors cursor-pointer border ${isSelected ? 'bg-primary/10 border-primary' : 'bg-transparent border-transparent hover:bg-background/40'}`}
                                        onClick={() => toggleSelection(table.tenseName, pronoun)}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-text-secondary'}`}>
                                            {isSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                                        </div>

                                        <span className="text-text-muted font-medium text-right text-xs md:text-sm whitespace-nowrap pr-1">
                                            {pronoun}
                                        </span>

                                        <input 
                                            type="text"
                                            value={form}
                                            onChange={(e) => handleFormChange(index, pronoun, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full text-left text-text font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-1 transition-colors text-sm md:text-base min-w-0"
                                            title={t('conjugator.correctionTooltip')}
                                        />

                                        <div className="flex justify-end">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); speak(form); }} 
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-sm"
                                                title={t('conjugator.listenTooltip')}
                                            >
                                                <i className="fas fa-volume-up text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {selectedCount > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-background-secondary text-text px-6 py-4 rounded-2xl shadow-2xl border border-primary/20 flex items-center gap-4 animate-bounce-in z-50 backdrop-blur-sm bg-opacity-95">
                    <div className="flex flex-col mr-2">
                        <span className="font-bold text-lg text-primary">{selectedCount}</span>
                        <span className="text-xs text-text-muted">{t('conjugator.selectedCount', { count: selectedCount, plural: selectedCount > 1 ? 's' : '' })}</span>
                    </div>
                    
                    <div className="h-8 w-px bg-border mx-2"></div>

                     <div className="flex flex-col">
                        <label className="flex items-center gap-2 cursor-pointer mb-1">
                            <input 
                                type="checkbox" 
                                checked={isNewSet} 
                                onChange={(e) => setIsNewSet(e.target.checked)}
                                className="w-4 h-4 accent-primary"
                            />
                            <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{t('conjugator.setNameLabel')}</span>
                        </label>
                        {isNewSet && (
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={setName} 
                                    onChange={(e) => setSetName(e.target.value)}
                                    placeholder={t('conjugator.setNamePlaceholder')}
                                    className="bg-background border border-border rounded px-3 pr-8 py-1 text-sm w-48 focus:border-primary outline-none transition-colors text-text animate-slide-up"
                                />
                                {setName && (
                                    <button
                                        type="button"
                                        onClick={() => setSetName('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500 transition-colors"
                                    >
                                        <i className="fas fa-times text-[10px]"></i>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <Button onClick={handleCreateCards} size="lg" className="rounded-xl px-6 shadow-lg bg-primary hover:bg-primary/90 text-white ml-2">
                        <i className="fas fa-plus-circle mr-2"></i>
                        {t('conjugator.createButton')}
                    </Button>
                </div>
            )}
        </div>
      )}
      
      {/* Library panel */}
      {mode === 'library' && (
        <div className="space-y-4 animate-slide-up">
          {/* Header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm"></i>
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Rechercher dans la bibliothèque…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none text-sm text-text"
              />
            </div>
            <div className="flex gap-1 p-1 bg-background border border-border rounded-xl">
              {(['all', 'conjugation', 'translation'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setLibraryFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    libraryFilter === f
                      ? 'bg-primary text-white shadow'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {f === 'all' ? 'Tout' : f === 'conjugation' ? '📖 Conjugaisons' : '🌐 Traductions'}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1 p-1 bg-background border border-border rounded-xl">
              <button
                onClick={() => setLibraryViewMode('grid')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  libraryViewMode === 'grid'
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                    : 'text-text-muted hover:text-text hover:bg-background-secondary'
                }`}
                title="Affichage Grille"
              >
                <i className="fas fa-th-large"></i>
              </button>
              <button
                onClick={() => setLibraryViewMode('list')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  libraryViewMode === 'list'
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                    : 'text-text-muted hover:text-text hover:bg-background-secondary'
                }`}
                title="Affichage Liste"
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
            {cache.entries.length > 0 && (
              <button
                onClick={() => { if (window.confirm('Vider toute la bibliothèque ?')) cache.clearAll(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-400/20 transition-all"
              >
                <i className="fas fa-trash-alt"></i>
                Tout vider
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background-secondary rounded-xl p-3 border border-border/30 flex items-center gap-3">
              <span className="text-2xl">📖</span>
              <div>
                <div className="text-xl font-black text-primary">{cache.conjugationEntries.length}</div>
                <div className="text-xs text-text-muted">Conjugaisons</div>
              </div>
            </div>
            <div className="bg-background-secondary rounded-xl p-3 border border-border/30 flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <div className="text-xl font-black text-accent">{cache.translationEntries.length}</div>
                <div className="text-xs text-text-muted">Traductions</div>
              </div>
            </div>
          </div>

          {/* Entries list */}
          {(() => {
            const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const q = norm(librarySearch);
            const filtered = cache.entries.filter((e) => {
              if (libraryFilter === 'conjugation' && e.type !== 'conjugation') return false;
              if (libraryFilter === 'translation' && e.type !== 'translation') return false;
              if (q) {
                const label = e.type === 'conjugation' ? (e as any).verb : (e as any).text;
                return norm(label).includes(q);
              }
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="text-5xl mb-4">📭</span>
                  <p className="font-bold text-text text-lg mb-1">
                    {cache.entries.length === 0 ? 'Bibliothèque vide' : 'Aucun résultat'}
                  </p>
                  <p className="text-text-muted text-sm max-w-xs">
                    {cache.entries.length === 0
                      ? 'Conjuguez ou traduisez un mot pour le sauvegarder automatiquement.'
                      : 'Essayez un autre terme de recherche.'}
                  </p>
                </div>
              );
            }

            return (
              <div className={libraryViewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" 
                : "flex flex-col gap-2"
              }>
                {filtered.map((entry) => {
                  const isConj = entry.type === 'conjugation';
                  const label = isConj ? (entry as any).verb : (entry as any).text;
                  const langFlag = LANGUAGES.find(l => l.code === entry.langCode)?.flag ?? '';
                  const langName = entry.langName;
                  const dateStr = new Date(entry.savedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
                  
                  const handleLoad = () => {
                    setVerb(label);
                    setFromCache(false);
                    if (isConj) {
                      setMode('conjugate');
                      setResult((entry as any).result);
                      setTranslationResult(null);
                    } else {
                      setMode('translate');
                      setTranslationResult((entry as any).result);
                      setResult(null);
                    }
                  };

                  if (libraryViewMode === 'list') {
                    return (
                        <div
                          key={entry.key}
                          className="group bg-background-secondary rounded-xl border border-border/30 hover:border-primary/40 hover:shadow-sm transition-all duration-200 overflow-hidden flex items-center p-3 gap-3"
                        >
                           <div className={`w-1 self-stretch rounded-full ${isConj ? 'bg-primary' : 'bg-accent'}`}></div>
                           <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-text capitalize truncate">{label}</h3>
                                    <span className="text-sm shrink-0">{langFlag}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[10px] text-text-muted flex items-center gap-1">
                                        <i className={isConj ? "fas fa-book-open" : "fas fa-language"}></i>
                                        {isConj ? 'Conjugaison' : 'Traduction'}
                                    </span>
                                    <span className="text-[10px] text-text-muted hidden sm:inline">
                                        {langName}
                                    </span>
                                    <span className="text-[10px] text-text-muted">
                                        {dateStr}
                                    </span>
                                </div>
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-text-muted hidden md:block group-hover:block transition-all">
                                    <i className="fas fa-eye mr-1"></i>{entry.accessCount}
                                </span>
                                <button
                                    onClick={handleLoad}
                                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <i className="fas fa-bolt text-[10px]"></i>
                                    <span className="hidden sm:inline">Charger</span>
                                </button>
                                <button
                                    onClick={() => cache.deleteEntry(entry.key)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Supprimer"
                                >
                                    <i className="fas fa-trash-alt text-xs"></i>
                                </button>
                           </div>
                        </div>
                    );
                  }

                  const preview = isConj
                    ? `${Object.keys((entry as any).result.tables[0]?.forms ?? {}).length > 0 ? Object.entries((entry as any).result.tables[0]?.forms ?? {}).slice(0,2).map(([p,f]) => `${p} ${f}`).join(' · ') : ''}…`
                    : (entry as any).result.translated?.slice(0, 60) + '…';

                  return (
                    <div
                      key={entry.key}
                      className="group bg-background-secondary rounded-xl border border-border/30 hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      <div className={`h-1 ${isConj ? 'bg-gradient-to-r from-primary to-primary/50' : 'bg-gradient-to-r from-accent to-accent/50'}`}></div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border" style={{ color: isConj ? 'var(--color-primary)' : 'var(--color-accent)', borderColor: isConj ? 'var(--color-primary)' : 'var(--color-accent)', background: isConj ? 'var(--color-primary-light, #fdf)' : 'var(--color-accent-light, #eff)' }}>
                                {isConj ? '📖 Conjugaison' : '🌐 Traduction'}
                              </span>
                              <span className="text-sm">{langFlag}</span>
                            </div>
                            <h3 className="font-black text-lg text-text capitalize leading-tight truncate">{label}</h3>
                            <p className="text-xs text-text-muted mt-0.5">{langName} · {dateStr}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => cache.deleteEntry(entry.key)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                              title="Supprimer"
                            >
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-text-muted italic truncate mb-3">{preview}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-text-muted">
                            <i className="fas fa-eye mr-1"></i>{entry.accessCount} accès
                          </span>
                          <button
                            onClick={handleLoad}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all"
                          >
                            <i className="fas fa-bolt text-[10px]"></i>
                            Charger
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {!result && !translationResult && !loading && !error && mode !== 'library' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            {/* L'utilisateur veut cet espace vide par défaut */}
        </div>
      )}
      </div>
    </div>
  </div>
);
};
