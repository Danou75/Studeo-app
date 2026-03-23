import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashcards } from '../../hooks/useFlashcards';

vi.mock('../../services/fileParser', () => ({
    parseFile: vi.fn()
}));

vi.mock('../../utils/security', () => ({
    sanitizeFileName: (name: string) => name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
}));

// Mock ToastContext
const mockShowToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast }),
    ToastProvider: ({ children }: { children: any }) => children,
}));

// Mock ConfirmationContext
vi.mock('../../contexts/ConfirmationContext', () => ({
    useConfirmation: () => ({
        showConfirmation: vi.fn((config: any) => {
            if (config.onConfirm) config.onConfirm();
        }),
    }),
    ConfirmationProvider: ({ children }: { children: any }) => children,
}));

// Pas de mock de useLocalStorage : jsdom fournit window.localStorage

describe('useFlashcards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('should initialize with default flashcards', () => {
        const { result } = renderHook(() => useFlashcards());
        expect(result.current.allFlashcards).toBeDefined();
        expect(result.current.currentSetName).toBeDefined();
    });

    it('should provide handleFileImport function', () => {
        const { result } = renderHook(() => useFlashcards());
        expect(typeof result.current.handleFileImport).toBe('function');
    });

    it('should provide handleSaveEditedCards function', () => {
        const { result } = renderHook(() => useFlashcards());
        expect(typeof result.current.handleSaveEditedCards).toBe('function');
    });

    it('should validate JSON structure in handleSaveEditedCards', () => {
        const { result } = renderHook(() => useFlashcards());

        let success: boolean;
        act(() => {
            success = result.current.handleSaveEditedCards('not a json');
        });

        expect(success!).toBe(false);
        // Le hook appelle showToast (pas alert) pour signaler les erreurs de validation
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error');
    });

    it('should reject non-array JSON in handleSaveEditedCards', () => {
        const { result } = renderHook(() => useFlashcards());

        let success: boolean;
        act(() => {
            success = result.current.handleSaveEditedCards(JSON.stringify({ type: 'classic' }));
        });

        expect(success!).toBe(false);
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error');
    });

    it('should validate flashcard structure', () => {
        const { result } = renderHook(() => useFlashcards());

        let success: boolean;
        act(() => {
            // Carte "classic" sans le champ terms — doit être rejetée
            success = result.current.handleSaveEditedCards(JSON.stringify([{ type: 'classic' }]));
        });

        expect(success!).toBe(false);
        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error');
    });
});
