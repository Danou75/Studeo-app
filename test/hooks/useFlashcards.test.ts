import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashcards } from '../../hooks/useFlashcards';

// Mock dependencies
vi.mock('../../hooks/useLocalStorage', () => ({
    useLocalStorage: (key: string, initialValue: any) => {
        const setValue = vi.fn();
        return [initialValue, setValue] as const;
    }
}));

vi.mock('../../services/fileParser', () => ({
    parseFile: vi.fn()
}));

vi.mock('../../utils/security', () => ({
    sanitizeFileName: (name: string) => name.replace(/[^a-zA-Z0-9_\-\.]/g, '_')
}));

describe('useFlashcards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();
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
        
        const invalidJson = 'not a json';
        const success = result.current.handleSaveEditedCards(invalidJson);
        
        expect(success).toBe(false);
        expect(global.alert).toHaveBeenCalled();
    });

    it('should reject non-array JSON in handleSaveEditedCards', () => {
        const { result } = renderHook(() => useFlashcards());
        
        const nonArrayJson = JSON.stringify({ type: 'classic' });
        const success = result.current.handleSaveEditedCards(nonArrayJson);
        
        expect(success).toBe(false);
    });

    it('should validate flashcard structure', () => {
        const { result } = renderHook(() => useFlashcards());
        
        const invalidCard = JSON.stringify([{ type: 'classic' }]); // Missing terms
        const success = result.current.handleSaveEditedCards(invalidCard);
        
        expect(success).toBe(false);
    });
});
