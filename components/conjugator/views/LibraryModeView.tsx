import React, { useMemo } from 'react';
import { CacheEntry } from '../../../hooks/useConjugationCache';
import { Tutor } from '../../../types';
import { TUTORS } from '../../../constants';
interface LibraryModeViewProps {
    mode: 'conjugate' | 'translate' | 'library';
    libraryFilter: 'all' | 'conjugation' | 'translation';
    setLibraryFilter: (f: 'all' | 'conjugation' | 'translation') => void;
    librarySearch: string;
    setLibrarySearch: (s: string) => void;
    libraryViewMode: 'grid' | 'list';
    setLibraryViewMode: (m: 'grid' | 'list') => void;
    cacheEntries: CacheEntry[];
    clearAll: () => void;
    deleteEntry: (key: string) => void;
    selectedLibraryKeys: Set<string>;
    setSelectedLibraryKeys: (keys: Set<string>) => void;
    toggleLibraryItem: (key: string) => void;
    onStartQuiz?: boolean;
    onCreateSet?: boolean;
    handleLaunchLibraryQuiz: (filtered: CacheEntry[]) => void;
    LANGUAGES: any[];
    setVerb: (v: string) => void;
    setFromCache: (fc: boolean) => void;
    setMode: (m: 'conjugate' | 'translate' | 'library') => void;
    setResult: (res: any) => void;
    setTranslationResult: (res: any) => void;
    selectedTutorId: string | null;
    setSelectedTutorId: (id: string | null) => void;
    tutorsWithContent: Tutor[];
}

export const LibraryModeView: React.FC<LibraryModeViewProps> = ({
    mode, libraryFilter, setLibraryFilter, librarySearch, setLibrarySearch,
    libraryViewMode, setLibraryViewMode, cacheEntries, clearAll, deleteEntry,
    selectedLibraryKeys, setSelectedLibraryKeys, toggleLibraryItem, onStartQuiz,
    onCreateSet, handleLaunchLibraryQuiz, LANGUAGES, setVerb, setFromCache,
    setMode, setResult, setTranslationResult,
    selectedTutorId
}) => {
    if (mode !== 'library') return null;

    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = norm(librarySearch);

    const filtered = cacheEntries.filter((e) => {
        // Tutor filter
        if (selectedTutorId && (e as any).tutorId !== selectedTutorId) return false;
        
        // Type filter
        if (libraryFilter === 'conjugation' && e.type !== 'conjugation') return false;
        if (libraryFilter === 'translation' && e.type !== 'translation') return false;
        
        // Search filter
        if (q) {
            const label = e.type === 'conjugation' ? (e as any).verb : (e as any).text;
            return norm(label || '').includes(q);
        }
        return true;
    });

    // Final unique deduplication to prevent React crash (NotFoundError)
    const uniqueFiltered = useMemo(() => {
        const seen = new Set();
        return filtered.filter(item => {
            if (!item || !item.key) return false;
            if (seen.has(item.key)) return false;
            seen.add(item.key);
            return true;
        });
    }, [filtered]);

    const allSelected = uniqueFiltered.length > 0 && uniqueFiltered.every(e => selectedLibraryKeys.has(e.key));

    return (
        <div className="space-y-4 animate-slide-up" translate="no">
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
                {cacheEntries.length > 0 && (
                    <button
                        onClick={() => { if (window.confirm('Vider toute la bibliothèque ?')) clearAll(); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-red-400/20 transition-all"
                    >
                        <i className="fas fa-trash-alt"></i>
                        Tout vider
                    </button>
                )}
            </div>

            {/* Filter Dropdown removed from here. Handled by ConjugatorHeader */}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-background-secondary rounded-xl p-3 border border-border/30 flex items-center gap-3">
                    <span className="text-2xl">📖</span>
                    <div>
                        <div className="text-xl font-black text-primary">{cacheEntries.filter(e => e.type === 'conjugation').length}</div>
                        <div className="text-xs text-text-muted">Conjugaisons</div>
                    </div>
                </div>
                <div className="bg-background-secondary rounded-xl p-3 border border-border/30 flex items-center gap-3">
                    <span className="text-2xl">🌐</span>
                    <div>
                        <div className="text-xl font-black text-accent">{cacheEntries.filter(e => e.type === 'translation').length}</div>
                        <div className="text-xs text-text-muted">Traductions</div>
                    </div>
                </div>
            </div>

            {/* Entries list */}
            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="text-5xl mb-4">📭</span>
                    <p className="font-bold text-text text-lg mb-1">
                        {cacheEntries.length === 0 ? 'Bibliothèque vide' : 'Aucun résultat'}
                    </p>
                    <p className="text-text-muted text-sm max-w-xs">
                        {cacheEntries.length === 0
                            ? 'Conjuguez ou traduisez un mot pour le sauvegarder automatiquement.'
                            : 'Essayez un autre terme de recherche.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-3 bg-background-secondary border border-border/50 rounded-xl px-4 py-2.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => {
                                    if (allSelected) setSelectedLibraryKeys(new Set());
                                    else setSelectedLibraryKeys(new Set(filtered.map(e => e.key)));
                                }}
                                className="w-4 h-4 accent-primary cursor-pointer"
                            />
                            <span className="text-xs font-bold text-text-muted">
                                {selectedLibraryKeys.size > 0
                                    ? `${selectedLibraryKeys.size} sélectionné${selectedLibraryKeys.size > 1 ? 's' : ''}`
                                    : 'Tout sélectionner'}
                            </span>
                        </label>
                        {selectedLibraryKeys.size > 0 && onStartQuiz && onCreateSet && (
                            <button
                                onClick={() => handleLaunchLibraryQuiz(filtered)}
                                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wide shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                            >
                                <i className="fas fa-play-circle"></i>
                                Lancer Quiz ({selectedLibraryKeys.size})
                            </button>
                        )}
                    </div>

                    <div 
                        key={libraryViewMode}
                        className={libraryViewMode === 'grid' 
                            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" 
                            : "flex flex-col gap-2"
                        }
                    >
                        {uniqueFiltered.map((entry) => {
                            const isConj = entry.type === 'conjugation';
                            const label = isConj ? (entry as any).verb : (entry as any).text;
                            const langFlag = LANGUAGES.find(l => l.code === entry.langCode)?.flag ?? '';
                            const isLibSelected = selectedLibraryKeys.has(entry.key);
                            const langName = entry.langName;
                            const dateStr = entry.savedAt && !isNaN(new Date(entry.savedAt).getTime())
                                ? new Date(entry.savedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '';
                            
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
                                        key={`list-${entry.key}`}
                                        onClick={() => toggleLibraryItem(entry.key)}
                                        className={`group bg-background-secondary rounded-xl border hover:shadow-sm transition-all duration-200 overflow-hidden flex items-center p-3 gap-3 cursor-pointer ${isLibSelected ? 'border-primary bg-primary/5' : 'border-border/30 hover:border-primary/40'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${isLibSelected ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                            {isLibSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                                        </div>
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
                                                <span className="text-[10px] text-text-muted hidden sm:inline">{langName}</span>
                                                <span className="text-[10px] text-text-muted">{dateStr}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
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
                                                onClick={() => deleteEntry(entry.key)}
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
                                ? `${Object.keys((entry as any).result?.tables?.[0]?.forms ?? {}).length > 0 ? Object.entries((entry as any).result?.tables?.[0]?.forms ?? {}).slice(0,2).map(([p,f]) => `${p} ${f}`).join(' · ') : ''}…`
                                : ((entry as any).result?.translated || '').slice(0, 60) + '…';

                            return (
                                <div
                                    key={`grid-${entry.key}`}
                                    onClick={() => toggleLibraryItem(entry.key)}
                                    className={`group rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer ${isLibSelected ? 'bg-primary/5 border-primary shadow-md' : 'bg-background-secondary border-border/30 hover:border-primary/40 hover:shadow-lg'}`}
                                >
                                    <div className={`h-1 ${isConj ? 'bg-gradient-to-r from-primary to-primary/50' : 'bg-gradient-to-r from-accent to-accent/50'}`}></div>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${isLibSelected ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                                                {isLibSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border" style={{ color: isConj ? 'var(--color-primary)' : 'var(--color-accent)', borderColor: isConj ? 'var(--color-primary)' : 'var(--color-accent)', background: isConj ? 'var(--color-primary-light, #fdf)' : 'var(--color-accent-light, #eff)' }}>
                                                        {isConj ? '📖 Conjugaison' : '🌐 Traduction'}
                                                    </span>
                                                    <span className="text-sm">{langFlag}</span>
                                                </div>
                                                <h3 className="font-black text-lg text-text capitalize leading-tight truncate">{label}</h3>
                                                <p className="text-xs text-text-muted mt-0.5">
                                                    {langName} · {dateStr}
                                                    {(entry as any).tutorId && (
                                                        <>
                                                            {' · '}
                                                            <span className="text-primary font-bold">
                                                                {TUTORS.find(t => t.id === (entry as any).tutorId)?.emoji} {TUTORS.find(t => t.id === (entry as any).tutorId)?.name}
                                                            </span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => deleteEntry(entry.key)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <i className="fas fa-trash-alt text-xs"></i>
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-text-muted italic truncate mb-3">{preview}</p>

                                        <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
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
                </>
            )}
        </div>
    );
};
