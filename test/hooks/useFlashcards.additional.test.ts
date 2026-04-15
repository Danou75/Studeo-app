import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashcards } from '../../hooks/useFlashcards';

// Mock des dépendances
vi.mock('../../services/fileParser', () => ({
    parseFile: vi.fn()
}));

vi.mock('../../utils/security', () => ({
    sanitizeFileName: (name: string) => name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
}));

const mockShowToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast }),
    ToastProvider: ({ children }: { children: any }) => children,
}));

vi.mock('../../contexts/ConfirmationContext', () => ({
    useConfirmation: () => ({
        showConfirmation: (config: any) => {
            // Appeler onConfirm immédiatement pour simuler la confirmation
            if (config.onConfirm) config.onConfirm();
        },
    }),
    ConfirmationProvider: ({ children }: { children: any }) => children,
}));

describe('useFlashcards - Additional Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should add cards to current set', () => {
        const { result } = renderHook(() => useFlashcards());
        
        const newCards = [
            { id: '1', type: 'classic', terms: { fr: 'test', en: 'test' } },
            { id: '2', type: 'classic', terms: { fr: 'test2', en: 'test2' } }
        ];
        
        act(() => {
            result.current.addCards(newCards);
        });
        
        // Vérifier que les cartes ont été ajoutées
        expect(result.current.allFlashcards.length).toBeGreaterThanOrEqual(2);
    });

    it('should replace cards in current set', () => {
        const { result } = renderHook(() => useFlashcards());
        
        const replacementCards = [
            { id: 'new-1', type: 'classic', terms: { fr: 'remplacement', en: 'replacement' } }
        ];
        
        act(() => {
            result.current.replaceCards(replacementCards);
        });
        
        expect(result.current.allFlashcards).toEqual(replacementCards);
    });

    it('should create a new set', () => {
        const { result } = renderHook(() => useFlashcards());
        
        const newSetCards = [
            { id: 'set-1', type: 'classic', terms: { fr: 'nouveau', en: 'new' } }
        ];
        
        act(() => {
            result.current.createSet('newSet', newSetCards);
        });
        
        expect(result.current.flashcardSets['newSet']).toEqual(newSetCards);
        expect(result.current.currentSetName).toBe('newSet');
    });

    it('should delete a set', () => {
        const { result } = renderHook(() => useFlashcards());
        
        // Créer un set d'abord
        act(() => {
            result.current.createSet('tempSet', []);
        });
        
        // Supprimer le set
        act(() => {
            result.current.deleteSet('tempSet');
        });
        
        expect(result.current.flashcardSets['tempSet']).toBeUndefined();
    });

    it('should rename a set', () => {
        const { result } = renderHook(() => useFlashcards());
        
        // Créer un set
        act(() => {
            result.current.createSet('oldName', [{ id: '1', type: 'classic', terms: { fr: 'test', en: 'test' } }]);
        });
        
        // Renommer le set
        act(() => {
            result.current.renameSet('oldName', 'newName');
        });
        
        expect(result.current.flashcardSets['oldName']).toBeUndefined();
        expect(result.current.flashcardSets['newName']).toBeDefined();
        expect(result.current.currentSetName).toBe('newName');
    });

    it('should reset all progress', () => {
        const { result } = renderHook(() => useFlashcards());
        
        // Créer des cartes avec srsData
        const cardsWithProgress = [
            { 
                id: '1', 
                type: 'classic', 
                terms: { fr: 'test', en: 'test' },
                srsData: { interval: 1, easeFactor: 2.5, lastReview: Date.now() }
            }
        ];
        
        act(() => {
            result.current.replaceCards(cardsWithProgress);
        });
        
        // Appeler resetAllProgress - le mock de confirmation appelle directement onConfirm
        act(() => {
            result.current.resetAllProgress();
        });
        
        // Vérifier que srsData a été supprimé
        const cardsAfterReset = result.current.allFlashcards;
        expect(cardsAfterReset[0].srsData).toBeUndefined();
    });

    it('should handle file import successfully', async () => {
        const mockFile = new File(['[{"type":"classic","terms":{"fr":"test","en":"test"}}]'], 'test.json', { type: 'application/json' });
        
        const { parseFile } = await import('../../services/fileParser');
        vi.mocked(parseFile).mockResolvedValue({
            flashcards: [{ id: 'imported', type: 'classic', terms: { fr: 'test', en: 'test' } }],
            name: 'test'
        });
        
        const { result } = renderHook(() => useFlashcards());
        
        await act(async () => {
            await result.current.handleFileImport(mockFile);
        });
        
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('fiches importées avec succès'),
            'success'
        );
    });

    it('should handle file import error', async () => {
        const mockFile = new File(['invalid'], 'test.json', { type: 'application/json' });
        
        const { parseFile } = await import('../../services/fileParser');
        vi.mocked(parseFile).mockRejectedValue(new Error('Invalid file'));
        
        const { result } = renderHook(() => useFlashcards());
        
        await act(async () => {
            await result.current.handleFileImport(mockFile);
        });
        
        expect(mockShowToast).toHaveBeenCalledWith(
            expect.stringContaining('Erreur lors de l\'importation'),
            'error'
        );
    });

    it('should handle various flashcard types in handleSaveEditedCards', () => {
        const { result } = renderHook(() => useFlashcards());
        
        const mixedCards = [
            { type: 'classic', terms: { fr: 'bonjour', en: 'hello' } },
            { 
                type: 'mcq', 
                mcqData: { 
                    question: { fr: 'Quelle est la capitale?' }, 
                    answer: { fr: 'Paris' }, 
                    distractors: [{ fr: 'Lyon' }, { fr: 'Marseille' }]
                }
            },
            { 
                type: 'cloze',
                clozeData: { 
                    text: 'La capitale de la France est {{c1}}',
                    answers: ['Paris']
                }
            }
        ];
        
        let success: boolean;
        act(() => {
            success = result.current.handleSaveEditedCards(JSON.stringify(mixedCards));
        });
        
        expect(success).toBe(true);
        expect(result.current.allFlashcards.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle flat object cards in handleSaveEditedCards', () => {
        const { result } = renderHook(() => useFlashcards());
        
        const flatCards = [
            { fr: 'bonjour', en: 'hello', es: 'hola' },
            { fr: 'au revoir', en: 'goodbye' }
        ];
        
        let success: boolean;
        act(() => {
            success = result.current.handleSaveEditedCards(JSON.stringify(flatCards));
        });
        
        expect(success).toBe(true);
        expect(result.current.allFlashcards.length).toBeGreaterThanOrEqual(2);
        // Vérifier que les cartes ont bien été converties en format classic
        expect(result.current.allFlashcards[0].type).toBe('classic');
        expect(result.current.allFlashcards[0].terms).toBeDefined();
    });
});
