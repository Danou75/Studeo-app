import React from 'react';
import { ConjugationCacheEntry } from '../../../hooks/useConjugationCache';
import { Flashcard } from '../../../types';

interface ConjugQuizModalViewProps {
    conjQuizData: {
        conjEntries: ConjugationCacheEntry[];
        translationCards: Flashcard[];
        availableTenses: { tense: string; tenseName: string }[];
        selectedTenses: Set<string>;
    } | null;
    showModal: boolean;
    onClose: () => void;
    onLaunch: () => void;
    setConjQuizData: React.Dispatch<React.SetStateAction<any>>;
    buildConjugationCards: (entries: ConjugationCacheEntry[], tenses: Set<string>) => Flashcard[];
}

export const ConjugQuizModalView: React.FC<ConjugQuizModalViewProps> = ({
    conjQuizData, showModal, onClose, onLaunch, setConjQuizData, buildConjugationCards
}) => {
    if (!showModal || !conjQuizData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">🎯 Quiz de Conjugaison</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-xl">✕</button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {conjQuizData.conjEntries.length} verbe{conjQuizData.conjEntries.length > 1 ? 's' : ''} sélectionné{conjQuizData.conjEntries.length > 1 ? 's' : ''} :{' '}
                    <span className="font-bold text-primary">{conjQuizData.conjEntries.map(e => e.verb).join(', ')}</span>
                </p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Temps à inclure</span>
                        <button onClick={() => setConjQuizData((prev: any) => {
                            if (!prev) return prev;
                            const allSelected = prev.selectedTenses.size === prev.availableTenses.length;
                            return { ...prev, selectedTenses: allSelected ? new Set() : new Set(prev.availableTenses.map((t: any) => t.tense)) };
                        })} className="text-xs font-bold text-primary hover:underline">
                            {conjQuizData.selectedTenses.size === conjQuizData.availableTenses.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto">
                        {conjQuizData.availableTenses.map(({ tense, tenseName }) => {
                            const isSelected = conjQuizData.selectedTenses.has(tense);
                            const formCount = conjQuizData.conjEntries.reduce((sum, entry) => {
                                const table = entry.result.tables.find(t => t.tense === tense);
                                return sum + (table ? Object.values(table.forms).filter(f => f && f !== '-').length : 0);
                            }, 0);
                            return (
                                <label key={tense} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                                    <input type="checkbox" checked={isSelected} onChange={() => setConjQuizData((prev: any) => {
                                        if (!prev) return prev;
                                        const next = new Set(prev.selectedTenses);
                                        if (next.has(tense)) next.delete(tense); else next.add(tense);
                                        return { ...prev, selectedTenses: next };
                                    })} className="w-4 h-4 accent-primary rounded" />
                                    <span className={`flex-1 font-semibold text-sm ${isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>{tenseName}</span>
                                    <span className="text-xs text-gray-400">{formCount} forme{formCount > 1 ? 's' : ''}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
                {(() => {
                    const count = buildConjugationCards(conjQuizData.conjEntries, conjQuizData.selectedTenses).length + conjQuizData.translationCards.length;
                    return (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20">
                            <i className="fas fa-layer-group text-primary text-sm"></i>
                            <span className="text-sm font-bold text-primary">{count} fiche{count > 1 ? 's' : ''} générée{count > 1 ? 's' : ''}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">fr → {conjQuizData.conjEntries[0]?.langName || 'cible'}</span>
                        </div>
                    );
                })()}
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm">Annuler</button>
                    <button onClick={onLaunch} disabled={conjQuizData.selectedTenses.size === 0} className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition text-sm flex items-center justify-center gap-2">
                        <i className="fas fa-play"></i> Lancer le quiz
                    </button>
                </div>
            </div>
        </div>
    );
};
