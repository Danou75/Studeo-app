import React from 'react';
import { Button } from '../../ui/Button';
import { SavedVocabList } from '../../../types';

interface CurriculumModalsProps {
    // Vocab Detail Modal
    selectedVocab: SavedVocabList | null;
    setSelectedVocab: (vocab: SavedVocabList | null) => void;
    onOpenVocabInLab?: (vocab: SavedVocabList) => void;

    // Rename Modal
    isRenameModalOpen: boolean;
    setIsRenameModalOpen: (isOpen: boolean) => void;
    renameType: 'program' | 'lesson' | 'conversation' | 'vocab' | 'shadowing';
    newTitle: string;
    setNewTitle: (title: string) => void;
    onConfirmRename: () => void;

    // Renew Modal
    showRenewModal: boolean;
    setShowRenewModal: (show: boolean) => void;
    renewStrategy: 'replace' | 'append';
    setRenewStrategy: (strategy: 'replace' | 'append') => void;
    renewPreferences: string;
    setRenewPreferences: (prefs: string) => void;
    isRenewingCatalog: boolean;
    handleRenewCatalog: (preferences: string) => void;
}

export const CurriculumModals: React.FC<CurriculumModalsProps> = ({
    selectedVocab,
    setSelectedVocab,
    onOpenVocabInLab,

    isRenameModalOpen,
    setIsRenameModalOpen,
    renameType,
    newTitle,
    setNewTitle,
    onConfirmRename,

    showRenewModal,
    setShowRenewModal,
    renewStrategy,
    setRenewStrategy,
    renewPreferences,
    setRenewPreferences,
    isRenewingCatalog,
    handleRenewCatalog
}) => {
    /** Generate and download a Shadowing-ready .md file from the current vocab list */
    const handleExportMd = () => {
        if (!selectedVocab) return;
        const v = selectedVocab;
        const lines: string[] = [
            `# ${v.theme}`,
            ``,
            `> **Langue** : ${v.targetLanguage} · **Niveau** : ${v.difficulty}`,
            ``,
        ];

        if (v.words.length > 0) {
            lines.push(`## Mots & Vocabulaire`, ``);
            v.words.forEach(w => {
                lines.push(`- **${w.word}** — ${w.translation}`);
                if (w.example) lines.push(`  *${w.example}*`);
            });
            lines.push(``);
        }

        if (v.expressions.length > 0) {
            lines.push(`## Expressions`, ``);
            v.expressions.forEach(ex => {
                lines.push(`- **${ex.expression}** — ${ex.translation}`);
                if (ex.example) lines.push(`  *${ex.example}*`);
            });
            lines.push(``);
        }

        const content = lines.join('\n');
        const blob    = new Blob([content], { type: 'text/markdown' });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement('a');
        a.href        = url;
        a.download    = `${v.theme.replace(/[^a-z0-9]/gi, '_')}_shadowing.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
            {/* Vocab Detail Modal */}
            {selectedVocab && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedVocab(null)}>
                    <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-border" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-border flex items-start justify-between gap-4 bg-gradient-to-r from-primary to-primary text-white">
                            <div>
                                <h3 className="text-xl font-black">{selectedVocab.theme}</h3>
                                <p className="text-sm opacity-80 mt-0.5">
                                    {selectedVocab.targetLanguage.toUpperCase()} · {selectedVocab.difficulty} · {selectedVocab.wordCount} mots · {selectedVocab.exercises.length} exercices
                                </p>
                            </div>
                            <button onClick={() => setSelectedVocab(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-5 space-y-6">
                            {selectedVocab.words.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                                        <i className="fas fa-spell-check text-primary"></i> Mots ({selectedVocab.words.length})
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {selectedVocab.words.map((w, i) => (
                                            <div key={i} className="bg-background-secondary rounded-xl p-3 border border-border">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="font-bold text-text">{w.word}</span>
                                                    <span className="text-xs text-text-muted ml-2">{w.translation}</span>
                                                </div>
                                                {w.example && <p className="text-xs text-text-secondary mt-1 italic">{w.example}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedVocab.expressions.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                                        <i className="fas fa-comment-dots text-primary"></i> Expressions ({selectedVocab.expressions.length})
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        {selectedVocab.expressions.map((ex, i) => (
                                            <div key={i} className="bg-background-secondary rounded-xl p-3 border border-border">
                                                <div className="flex justify-between items-baseline flex-wrap gap-1">
                                                    <span className="font-bold text-text">{ex.expression}</span>
                                                    <span className="text-xs text-text-muted">{ex.translation}</span>
                                                </div>
                                                {ex.example && <p className="text-xs text-text-secondary mt-1 italic">{ex.example}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedVocab.exercises.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                                        <i className="fas fa-dumbbell text-pink-500"></i> Exercices ({selectedVocab.exercises.length})
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                        {selectedVocab.exercises.slice(0, 5).map((ex, i) => (
                                            <div key={i} className="bg-background-secondary rounded-xl p-3 border border-border">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg bg-pink-100 dark:bg-pink-900/20 text-pink-600">{ex.type}</span>
                                                </div>
                                                <p className="text-sm text-text">{ex.question || ex.sentence || 'Exercice'}</p>
                                                {ex.options && ex.options.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {ex.options.map((opt, j) => (
                                                            <span key={j} className={`text-xs px-2 py-0.5 rounded-lg border ${opt === ex.answer ? 'bg-green-100 dark:bg-green-900/20 text-green-700 border-green-300' : 'bg-background border-border text-text-muted'}`}>{opt}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {selectedVocab.exercises.length > 5 && (
                                            <p className="text-xs text-text-muted text-center">+ {selectedVocab.exercises.length - 5} autres exercices…</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {onOpenVocabInLab && (
                            <div className="p-4 border-t border-border bg-background-secondary flex items-center justify-between gap-3">
                                <p className="text-xs text-text-muted">
                                    Retrouvez ce vocabulaire en mode interactif avec exercices, chat IA et flashcards.
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Export .md for Shadowing */}
                                    {(selectedVocab!.words.length > 0 || selectedVocab!.expressions.length > 0) && (
                                        <button
                                            onClick={handleExportMd}
                                            title="Exporter mots & expressions en .md pour le Labo Shadowing"
                                            className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                                        >
                                            <i className="fas fa-microphone" />
                                            <span className="hidden sm:inline">Shadowing .md</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { onOpenVocabInLab(selectedVocab!); setSelectedVocab(null); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
                                    >
                                        <i className="fas fa-flask" />
                                        Ouvrir dans le Lab
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Modal de renommage */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-border">
                            <h3 className="text-xl font-bold">Modifier le nom</h3>
                        </div>
                        <div className="p-6">
                            <input
                                autoFocus
                                type="text"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newTitle.trim()) {
                                        onConfirmRename();
                                    } else if (e.key === 'Escape') {
                                        setIsRenameModalOpen(false);
                                    }
                                }}
                                className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                placeholder={renameType === 'program' ? "Nouveau nom du parcours..." : renameType === 'conversation' ? "Nouveau thème de la causerie..." : "Nouveau titre de la leçon..."}
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
                                onClick={onConfirmRename}
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
        </>
    );
};
