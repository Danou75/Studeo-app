import { useLocalStorage } from './useLocalStorage';
import { Flashcard } from '../types';
import { DEFAULT_FLASHCARDS, DEFAULT_FLASHCARD_SET_NAME, CUSTOM_CARDS_NAME } from '../constants';
import { parseFile } from '../services/fileParser';
import { sanitizeFileName } from '../utils/security';
import { v4 as uuidv4 } from 'uuid';
import { useMemo } from 'react';

import { useToast } from '../contexts/ToastContext';
import { useConfirmation } from '../contexts/ConfirmationContext';

export const useFlashcards = () => {
    const { showToast } = useToast();
    const { showConfirmation } = useConfirmation();
    const [flashcardSets, setFlashcardSets] = useLocalStorage<Record<string, Flashcard[]>>('flashcardSets', {
        [DEFAULT_FLASHCARD_SET_NAME]: DEFAULT_FLASHCARDS,
    });
    const [currentSetName, setCurrentSetName] = useLocalStorage<string>('currentFlashcardSet', DEFAULT_FLASHCARD_SET_NAME);
    
    const allFlashcards = useMemo(() => flashcardSets[currentSetName] || [], [flashcardSets, currentSetName]);

    const handleFileImport = async (file: File) => {
        try {
            const { flashcards, name } = await parseFile(file);
            const safeName = sanitizeFileName(name);
            const safeFileName = sanitizeFileName(file.name);
            
            const newSetName = safeName || CUSTOM_CARDS_NAME;
            setFlashcardSets(prev => ({ ...prev, [newSetName]: flashcards }));
            setCurrentSetName(newSetName);
            showToast(`${flashcards.length} fiches importées avec succès depuis "${safeFileName}" dans la liste "${newSetName}" !`, 'success');
        } catch (error) {
            console.error(error);
            showToast(`Erreur lors de l'importation du fichier : ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
    };

    const handleSaveEditedCards = (jsonString: string): boolean => {
        try {
            const parsedData = JSON.parse(jsonString);
            if (!Array.isArray(parsedData)) throw new Error("Le JSON doit être un tableau.");
            
            const newCards: Flashcard[] = parsedData.map((item: any) => {
                const id = uuidv4();
                
                if (item.type === 'mcq') {
                    if (!item.mcqData?.question || !item.mcqData?.answer) {
                        throw new Error('Structure QCM invalide');
                    }
                    return {
                        id,
                        type: 'mcq',
                        mcqData: item.mcqData,
                        srsData: item.srsData
                    } as any;
                } else if (item.type === 'cloze') {
                    if (!item.clozeData?.text || !item.clozeData?.answers) {
                        throw new Error('Structure texte à trous invalide');
                    }
                    return {
                        id,
                        type: 'cloze',
                        clozeData: item.clozeData,
                        srsData: item.srsData
                    } as any;
                } else if (item.type === 'classic') {
                    if (!item.terms) {
                        throw new Error('Structure classique invalide');
                    }
                    return {
                        id,
                        type: 'classic',
                        terms: item.terms,
                        srsData: item.srsData
                    } as any;
                } else {
                    // Hybrid / Flat object logic: if it's not a recognized type, 
                    // and doesn't have terms/mcqData/clozeData, it's a flat classic card.
                    if (!item.terms && !item.mcqData && !item.clozeData) {
                        const terms: Record<string, string> = {};
                        Object.keys(item).forEach(key => {
                            if (!['id', 'type', 'srsData', 'mnemonic'].includes(key) && typeof item[key] === 'string') {
                                terms[key] = item[key];
                            }
                        });
                        if (Object.keys(terms).length > 0) {
                            return { id, type: 'classic', terms, srsData: item.srsData } as any;
                        }
                    }
                    // If it specifically has terms, then it's classic
                    if (item.terms) return { id, type: 'classic', terms: item.terms, srsData: item.srsData } as any;
                    
                    throw new Error("Format de fiche non reconnu. Utilisez 'type': 'classic' ou 'mcq', ou un objet simple.");
                }
            });

            setFlashcardSets(prev => ({...prev, [currentSetName]: newCards }));
            return true;
        } catch (e) {
            console.error("Erreur de parsing JSON:", e);
            showToast(`Erreur de validation : ${e instanceof Error ? e.message : String(e)}`, 'error');
            return false;
        }
    };

    const resetToDefaults = () => {
        showConfirmation({
            title: "Réinitialiser",
            message: "Êtes-vous sûr de vouloir réinitialiser toutes les cartes aux valeurs par défaut ? Toutes vos modifications seront perdues.",
            confirmText: "Réinitialiser tout",
            variant: 'danger',
            onConfirm: () => {
                setFlashcardSets({
                    [DEFAULT_FLASHCARD_SET_NAME]: DEFAULT_FLASHCARDS,
                });
                setCurrentSetName(DEFAULT_FLASHCARD_SET_NAME);
                showToast('Cartes réinitialisées avec succès !', 'success');
            }
        });
    };

    const addCards = (newCards: Flashcard[], targetSetName?: string) => {
        setFlashcardSets(prev => {
            const dest = targetSetName || currentSetName;
            // If target set doesn't exist and was specified, create it implicitly? 
            // Better to rely on createSet for logic, but here we assume it exists or fallback to empty array.
            // If it doesn't exist, we create it.
            const currentCards = prev[dest] || [];
            return {
                ...prev,
                [dest]: [...currentCards, ...newCards]
            };
        });
    };

    const replaceCards = (newCards: Flashcard[]) => {
        setFlashcardSets(prev => ({
            ...prev,
            [currentSetName]: newCards
        }));
    };

    const createSet = (name: string, cards: Flashcard[]) => {
        setFlashcardSets(prev => ({
            ...prev,
            [name]: cards
        }));
        setCurrentSetName(name);
    };

    const deleteSet = (name: string) => {
        setFlashcardSets(prev => {
            const newSets = { ...prev };
            delete newSets[name];
            
            // Ensure at least one set remains
            if (Object.keys(newSets).length === 0) {
                 newSets[DEFAULT_FLASHCARD_SET_NAME] = [];
            }
            return newSets;
        });
        
        if (currentSetName === name) {
            setCurrentSetName(DEFAULT_FLASHCARD_SET_NAME);
        }
    };

    const renameSet = (oldName: string, newName: string) => {
        if (!newName || newName === oldName) return;
        
        setFlashcardSets(prev => {
            if (prev[newName]) {
                showToast(`Une liste nommée "${newName}" existe déjà.`, 'warning');
                return prev;
            }
            
            const cards = prev[oldName];
            if (!cards) return prev;
            
            const newSets = { ...prev };
            delete newSets[oldName];
            newSets[newName] = cards;
            return newSets;
        });
        
        if (currentSetName === oldName) {
            setCurrentSetName(newName);
        }
    };

    return {
        flashcardSets,
        setFlashcardSets,
        currentSetName,
        setCurrentSetName,
        allFlashcards,
        handleFileImport,
        handleSaveEditedCards,
        resetToDefaults,
        addCards,
        replaceCards,
        createSet,
        deleteSet,
        renameSet,
        resetAllProgress: () => {
            showConfirmation({
                title: "Réinitialiser la progression",
                message: "Voulez-vous vraiment remettre à zéro toute votre progression (statistiques d'apprentissage) ? Vos cartes seront conservées.",
                confirmText: "Réinitialiser",
                variant: 'danger',
                onConfirm: () => {
                    setFlashcardSets(prev => {
                        const newSets: Record<string, Flashcard[]> = {};
                        Object.keys(prev).forEach(setName => {
                            newSets[setName] = prev[setName].map(card => ({
                                ...card,
                                srsData: undefined
                            }));
                        });
                        return newSets;
                    });
                    showToast('Progression remise à zéro.', 'success');
                }
            });
        }
    };
};
