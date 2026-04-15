import React from 'react';
import { Button } from '../../ui/Button';
import { AILoader } from '../../AILoader';
import { SuggestedProgram } from '../hooks/useCurriculum';

interface SuggestionsCatalogViewProps {
    customSuggestions: SuggestedProgram[];
    viewMode: 'grid' | 'list';
    isRenewingCatalog: boolean;
    setShowRenewModal: (show: boolean) => void;
    handleDeleteSuggestion: (id: string, title: string) => void;
    onSuggestedProgram: (topic: string, category: string) => void;
}

export const SuggestionsCatalogView: React.FC<SuggestionsCatalogViewProps> = ({
    customSuggestions,
    viewMode,
    isRenewingCatalog,
    setShowRenewModal,
    handleDeleteSuggestion,
    onSuggestedProgram
}) => {
    return (
        <div className="mt-16 mb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-background-secondary/50 p-4 md:p-6 rounded-[2rem] border border-border/50">
                <div>
                    <h2 className="text-xl font-black flex items-center gap-2 text-text-secondary uppercase tracking-tighter">
                        <i className="fas fa-compass text-primary"></i> Découvrir & Développer
                    </h2>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">
                        Parcours d'étude suggérés par l'IA
                    </p>
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
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSuggestion(suggestion.id, suggestion.title);
                                    }}
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
                                className={viewMode === 'grid' ? "w-full rounded-xl mt-auto z-10" : "rounded-xl px-6 shrink-0 z-10"}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSuggestedProgram(suggestion.title, suggestion.category);
                                }}
                            >
                                <i className="fas fa-magic mr-2"></i> {viewMode === 'grid' ? 'Créer ce parcours' : 'Créer'}
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
