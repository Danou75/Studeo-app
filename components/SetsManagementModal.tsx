import React, { useState } from 'react';
import { Flashcard } from '../types';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useTranslation } from '../contexts/LanguageContext';

interface SetsManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    flashcardSets: Record<string, Flashcard[]>;
    currentSetName: string;
    onRenameSet: (oldName: string, newName: string) => void;
    onDeleteSet: (name: string) => void;
    onSelectSet: (name: string) => void;
}

export const SetsManagementModal: React.FC<SetsManagementModalProps> = ({
    isOpen,
    onClose,
    flashcardSets,
    currentSetName,
    onRenameSet,
    onDeleteSet,
    onSelectSet
}) => {
    const { showToast } = useToast();
    const { showConfirmation } = useConfirmation();
    const { t } = useTranslation();
    const [editingSet, setEditingSet] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    if (!isOpen) return null;

    const startEditing = (name: string) => {
        setEditingSet(name);
        setEditName(name);
    };

    const saveEdit = () => {
        if (editingSet && editName.trim() && editName !== editingSet) {
            onRenameSet(editingSet, editName.trim());
        }
        setEditingSet(null);
    };

    const cancelEdit = () => {
        setEditingSet(null);
        setEditName('');
    };

    const handleDelete = (name: string) => {
        if (Object.keys(flashcardSets).length <= 1) {
            showToast(t('sets.errorLast'), 'warning');
            return;
        }
        showConfirmation({
            title: t('sets.deleteTitle'),
            message: t('sets.deleteConfirm', { name }),
            confirmText: t('sets.delete'),
            variant: "danger",
            onConfirm: () => {
                onDeleteSet(name);
                showToast(t('sets.deleteDone', { name }), 'info');
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4 border border-border">
                <div className="p-6 border-b border-border flex justify-between items-center bg-background-secondary rounded-t-xl">
                    <h2 className="text-2xl font-bold text-text flex items-center gap-3">
                        <span className="text-3xl">🗂️</span> {t('sets.title')}
                    </h2>
                    <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
                    {Object.keys(flashcardSets).map(setName => (
                        <div 
                            key={setName} 
                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                                currentSetName === setName 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border bg-background-tertiary hover:border-primary/50'
                            }`}
                        >
                            <div className="flex-1 mr-4">
                                {editingSet === setName ? (
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="flex-1 p-2 rounded border border-primary focus:outline-none bg-background text-text"
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                        />
                                        <button onClick={saveEdit} className="text-green-600 hover:text-green-700 p-2"><i className="fas fa-check"></i></button>
                                        <button onClick={cancelEdit} className="text-red-600 hover:text-red-700 p-2"><i className="fas fa-times"></i></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3" onClick={() => onSelectSet(setName)}>
                                        <div className={`w-3 h-3 rounded-full ${currentSetName === setName ? 'bg-primary' : 'bg-gray-300'}`}></div>
                                        <span className={`font-semibold text-lg cursor-pointer ${currentSetName === setName ? 'text-primary' : 'text-text'}`}>
                                            {setName}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-background rounded-full text-text-muted border border-border">
                                            {t('sets.cardsCount', { count: flashcardSets[setName].length })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {!editingSet && (
                                    <>
                                        {currentSetName !== setName && (
                                            <button 
                                                onClick={() => onSelectSet(setName)}
                                                className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                title={t('sets.activeLabel')}
                                            >
                                                <i className="fas fa-check-circle"></i>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => startEditing(setName)}
                                            className="p-2 text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg dark:bg-blue-900/20 dark:hover:bg-blue-900/40"
                                            title={t('sets.rename')}
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(setName)}
                                            className="p-2 text-red-500 hover:text-red-600 transition-colors bg-red-50 hover:bg-red-100 rounded-lg dark:bg-red-900/20 dark:hover:bg-red-900/40"
                                            title={t('sets.delete')}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-border bg-background-secondary rounded-b-xl flex justify-end">
                    <Button onClick={onClose} variant="primary">
                        {t('sets.done')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
