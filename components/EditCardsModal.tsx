import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { Button } from './ui/Button';

interface EditCardsModalProps {
    isOpen: boolean;
    cards: Flashcard[];
    onSave: (jsonString: string) => boolean;
    onClose: () => void;
}

export const EditCardsModal: React.FC<EditCardsModalProps> = ({ isOpen, cards, onSave, onClose }) => {
    const [jsonText, setJsonText] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Remove ID for simpler editing; it will be regenerated on save.
            const editableCards = cards.map(c => {
                const { id, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
                return rest;
            });
            setJsonText(JSON.stringify(editableCards, null, 2));
            setError('');
        }
    }, [isOpen, cards]);

    const handleSave = () => {
       const success = onSave(jsonText);
       if (success) {
           setError('');
       } else {
           setError('Sauvegarde échouée. Vérifiez le format JSON et la structure des fiches.');
       }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-bold text-text">Modifier les fiches (JSON)</h3>
                </div>
                <div className="p-4 flex-grow overflow-y-auto min-h-0">
                    <textarea
                        className="w-full h-full min-h-[50vh] p-2 font-mono text-sm bg-background-secondary border border-border rounded-md focus:ring-2 focus:ring-primary outline-none text-text"
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                        aria-label="Éditeur JSON des fiches"
                    />
                </div>
                 {error && <p className="p-4 text-error text-sm">{error}</p>}
                <div className="p-4 border-t border-border flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleSave}>Sauvegarder</Button>
                </div>
            </div>
        </div>
    );
};
