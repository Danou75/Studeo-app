import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

describe('useLocalStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should initialize with default value when localStorage is empty', () => {
        const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
        expect(result.current[0]).toBe('default');
    });

    it('should initialize with stored value when available', () => {
        localStorage.setItem('test-key', JSON.stringify('stored'));
        const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
        expect(result.current[0]).toBe('stored');
    });

    it('should update localStorage when value changes', () => {
        const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
        
        act(() => {
            result.current[1]('updated');
        });

        expect(result.current[0]).toBe('updated');
        expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
    });

    it('should handle complex objects', () => {
        const testObject = { name: 'Test', count: 42 };
        const { result } = renderHook(() => useLocalStorage('test-key', testObject));
        
        expect(result.current[0]).toEqual(testObject);
    });

    it('should use validator when provided', () => {
        const validator = (value: unknown): value is string => typeof value === 'string';
        localStorage.setItem('test-key', JSON.stringify(123)); // Invalid type
        
        const { result } = renderHook(() => useLocalStorage('test-key', 'default', validator));
        
        // Should fall back to default value due to validation failure
        expect(result.current[0]).toBe('default');
    });

    it('should handle localStorage quota exceeded', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
        
        const { result } = renderHook(() => useLocalStorage('test-key', ''));
        
        act(() => {
            result.current[1](largeData);
        });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    it('should handle corrupted JSON gracefully', () => {
        localStorage.setItem('test-key', 'invalid json{');
        const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
        
        expect(result.current[0]).toBe('default');
    });
});
