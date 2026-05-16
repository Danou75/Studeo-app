import React from 'react';
import { Button } from '../../ui/Button';
import { AILoader } from '../../ui/AILoader';
import { useTranslation } from '../../../contexts/LanguageContext';
import { CacheEntry } from '../../../hooks/useConjugationCache';

interface ConjugatorInputProps {
    mode: 'conjugate' | 'translate' | 'library';
    verb: string;
    setVerb: (v: string) => void;
    handleConjugate: (e?: React.FormEvent, forcedVerb?: string) => void;
    handleTranslate: (e?: React.FormEvent, forcedText?: string) => void;
    updateSuggestions: (query: string, mode: 'conjugate' | 'translate' | 'library', lang: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
    LANGUAGES: any[];
    loading: boolean;
    showSuggestions: boolean;
    setShowSuggestions: (show: boolean) => void;
    suggestions: CacheEntry[];
    setMode: (mode: 'conjugate' | 'translate' | 'library') => void;
    fromCache: boolean;
    setResult: (res: any) => void;
    setTranslationResult: (res: any) => void;
    setError: (err: any) => void;
    setFromCache: (fc: boolean) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    suggestionsRef: React.RefObject<HTMLDivElement>;
}

export const ConjugatorInput: React.FC<ConjugatorInputProps> = ({
    mode, verb, setVerb, handleConjugate, handleTranslate, updateSuggestions, 
    language, setLanguage, LANGUAGES, loading, showSuggestions, setShowSuggestions,
    suggestions, setMode, fromCache, setResult, setTranslationResult, setError,
    setFromCache, inputRef, suggestionsRef
}) => {
    const { t } = useTranslation();

    if (mode === 'library') return null;

    return (
        <div className="bg-background-secondary p-6 rounded-xl shadow-lg border border-border/50">
            <form onSubmit={mode === 'conjugate' ? handleConjugate : handleTranslate} className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium mb-1 text-text-secondary">
                        {mode === 'conjugate' ? t('conjugator.verbLabel') : t('conjugator.textToTranslate')}
                    </label>
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
    );
};
