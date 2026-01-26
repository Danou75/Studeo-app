import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSRS } from '../../hooks/useSRS';
import { Flashcard, SRSData } from '../../types';

describe('useSRS', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    const createMockCard = (id: string, srsData?: Partial<SRSData>): Flashcard => ({
        id,
        type: 'classic',
        terms: { fr: 'Bonjour', en: 'Hello' },
        srsData: srsData ? {
            easeFactor: srsData.easeFactor || 2.5,
            interval: srsData.interval || 1,
            repetitions: srsData.repetitions || 0,
            nextReview: srsData.nextReview || new Date().toISOString(),
            lastReviewed: srsData.lastReviewed || new Date().toISOString()
        } : undefined
    });

    describe('getDueCards', () => {
        it('should return cards due for review today', () => {
            const { result } = renderHook(() => useSRS());
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const cards: Flashcard[] = [
                createMockCard('1', { nextReview: yesterday.toISOString() }),
                createMockCard('2', { nextReview: new Date(Date.now() + 86400000).toISOString() }), // Tomorrow
                createMockCard('3') // No SRS data
            ];

            const dueCards = result.current.getDueCards(cards);
            
            expect(dueCards).toHaveLength(1);
            expect(dueCards[0].id).toBe('1');
        });

        it('should return empty array when no cards are due', () => {
            const { result } = renderHook(() => useSRS());
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const cards: Flashcard[] = [
                createMockCard('1', { nextReview: tomorrow.toISOString() })
            ];

            const dueCards = result.current.getDueCards(cards);
            
            expect(dueCards).toHaveLength(0);
        });

        it('should handle cards without SRS data', () => {
            const { result } = renderHook(() => useSRS());
            
            const cards: Flashcard[] = [
                createMockCard('1'),
                createMockCard('2')
            ];

            const dueCards = result.current.getDueCards(cards);
            
            expect(dueCards).toHaveLength(0);
        });
    });

    describe('updateCardSRS', () => {
        it('should increase interval on "easy" rating', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1', {
                easeFactor: 2.5,
                interval: 1,
                repetitions: 1
            });

            const updatedCard = result.current.updateCardSRS(card, 'easy');
            
            expect(updatedCard.srsData).toBeDefined();
            expect(updatedCard.srsData!.interval).toBeGreaterThan(1);
            expect(updatedCard.srsData!.easeFactor).toBeGreaterThanOrEqual(2.5);
        });

        it('should decrease interval on "hard" rating', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1', {
                easeFactor: 2.5,
                interval: 7,
                repetitions: 3
            });

            const updatedCard = result.current.updateCardSRS(card, 'hard');
            
            expect(updatedCard.srsData).toBeDefined();
            expect(updatedCard.srsData!.interval).toBeLessThan(7);
        });

        it('should reset on "again" rating', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1', {
                easeFactor: 2.5,
                interval: 14,
                repetitions: 5
            });

            const updatedCard = result.current.updateCardSRS(card, 'again');
            
            expect(updatedCard.srsData).toBeDefined();
            expect(updatedCard.srsData!.interval).toBe(1);
            expect(updatedCard.srsData!.repetitions).toBe(0);
        });

        it('should initialize SRS data for new cards', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1'); // No SRS data

            const updatedCard = result.current.updateCardSRS(card, 'good');
            
            expect(updatedCard.srsData).toBeDefined();
            expect(updatedCard.srsData!.easeFactor).toBe(2.5);
            expect(updatedCard.srsData!.interval).toBeGreaterThan(0);
            expect(updatedCard.srsData!.repetitions).toBe(1);
        });

        it('should update nextReview date correctly', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1', {
                interval: 1,
                repetitions: 0
            });

            const updatedCard = result.current.updateCardSRS(card, 'good');
            
            expect(updatedCard.srsData).toBeDefined();
            
            const nextReview = new Date(updatedCard.srsData!.nextReview);
            const now = new Date();
            
            expect(nextReview.getTime()).toBeGreaterThan(now.getTime());
        });

        it('should maintain ease factor bounds (1.3 - 2.5)', () => {
            const { result } = renderHook(() => useSRS());
            
            // Test lower bound
            const hardCard = createMockCard('1', {
                easeFactor: 1.4,
                interval: 1,
                repetitions: 1
            });

            const updatedHard = result.current.updateCardSRS(hardCard, 'hard');
            expect(updatedHard.srsData!.easeFactor).toBeGreaterThanOrEqual(1.3);

            // Test upper bound
            const easyCard = createMockCard('2', {
                easeFactor: 2.4,
                interval: 1,
                repetitions: 1
            });

            const updatedEasy = result.current.updateCardSRS(easyCard, 'easy');
            expect(updatedEasy.srsData!.easeFactor).toBeLessThanOrEqual(2.5);
        });
    });

    describe('getSRSStats', () => {
        it('should calculate correct statistics', () => {
            const { result } = renderHook(() => useSRS());
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);

            const cards: Flashcard[] = [
                createMockCard('1', { nextReview: yesterday.toISOString(), interval: 1 }), // Due
                createMockCard('2', { nextReview: nextWeek.toISOString(), interval: 7 }), // Learning
                createMockCard('3', { nextReview: nextMonth.toISOString(), interval: 30 }), // Mastered
                createMockCard('4') // New
            ];

            const stats = result.current.getSRSStats(cards);
            
            expect(stats.dueCount).toBe(1);
            expect(stats.learningCount).toBeGreaterThan(0);
            expect(stats.masteredCount).toBeGreaterThan(0);
        });

        it('should handle empty card array', () => {
            const { result } = renderHook(() => useSRS());
            
            const stats = result.current.getSRSStats([]);
            
            expect(stats.dueCount).toBe(0);
            expect(stats.learningCount).toBe(0);
            expect(stats.masteredCount).toBe(0);
        });
    });
});
