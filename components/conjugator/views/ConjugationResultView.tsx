import React from 'react';
import { ConjugationResult, ConjugationTable } from '../../../types';
import { useTranslation } from '../../../contexts/LanguageContext';
import { Button } from '../../ui/Button';

interface ConjugationResultViewProps {
    result: ConjugationResult | null;
    language: string;
    LANGUAGES: any[];
    speak: (text: string) => void;
    selectAllTense: (tenseName: string, forms: string[]) => void;
    setRepetitorTable: (table: ConjugationTable) => void;
    sortedFormEntries: (forms: Record<string, string>) => [string, string][];
    selectedItems: Record<string, boolean>;
    toggleSelection: (tenseName: string, pronoun: string) => void;
    handleFormChange: (index: number, pronoun: string, value: string) => void;
    selectedCount: number;
    isNewSet: boolean;
    setIsNewSet: (v: boolean) => void;
    setName: string;
    setSetName: (v: string) => void;
    handleCreateCards: () => void;
}

export const ConjugationResultView: React.FC<ConjugationResultViewProps> = ({
    result, language, LANGUAGES, speak, selectAllTense, setRepetitorTable,
    sortedFormEntries, selectedItems, toggleSelection, handleFormChange,
    selectedCount, isNewSet, setIsNewSet, setName, setSetName, handleCreateCards
}) => {
    const { t } = useTranslation();

    if (!result) return null;

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="bg-background-tertiary p-6 rounded-xl border-l-4 border-primary shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold mb-2 capitalize">
                            {result.verb} 
                            <span className="text-sm font-normal text-text-muted opacity-70">
                                ({LANGUAGES.find(l => l.code === language)?.name})
                            </span>
                        </h2>
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
                {result.tables.map((table) => (
                    <div key={`table-${table.tenseName}`} className="bg-background-secondary rounded-xl overflow-hidden shadow-lg border border-border/30 hover:shadow-xl transition-all duration-300 group">
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
                            {sortedFormEntries(table.forms).map(([pronoun, form], index) => {
                                const isSelected = selectedItems[`${table.tenseName}-${pronoun}`];
                                return (
                                    <div 
                                        key={`form-${table.tenseName}-${pronoun}`} 
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
    );
};
