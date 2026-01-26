import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
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
            interval: srsData.interval || 0,
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
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const cards: Flashcard[] = [
                createMockCard('1', { nextReview: yesterday.toISOString() }),
                createMockCard('2', { nextReview: tomorrow.toISOString() }),
                createMockCard('3') // No SRS data - should be considered due
            ];

            const dueCards = result.current.getDueCards(cards);
            
            // Cards with past dates OR no SRS data are due
            expect(dueCards.length).toBeGreaterThanOrEqual(1);
            expect(dueCards.some(c => c.id === '1')).toBe(true);
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

        it('should include cards without SRS data as due', () => {
            const { result } = renderHook(() => useSRS());
            
            const cards: Flashcard[] = [
                createMockCard('1'),
                createMockCard('2')
            ];

            const dueCards = result.current.getDueCards(cards);
            
            // New cards (no SRS data) are considered due
            expect(dueCards).toHaveLength(2);
        });
    });

    describe('updateCardSRS', () => {
        it('should increase interval on correct answer (true)', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1', {
                easeFactor: 2.5,
                interval: 0,
                repetitions: 0
            });

            const updatedCard = result.current.updateCardSRS(card, true);
            
            expect(updatedCard.srsData).toBeDefined();
            // First correct answer should set interval to 3 (grade 4 in SM-2)
            expect(updatedCard.srsData!.interval).toBe(3);
            expect(updatedCard.srsData!.repetitions).toBe(1);
        });

        it('should reset on incorrect answer (false)', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1', {
                easeFactor: 2.5,
                interval: 14,
                repetitions: 5
            });

            const updatedCard = result.current.updateCardSRS(card, false);
            
            expect(updatedCard.srsData).toBeDefined();
            expect(updatedCard.srsData!.interval).toBe(1);
            expect(updatedCard.srsData!.repetitions).toBe(0);
        });

        it('should initialize SRS data for new cards', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1'); // No SRS data

            const updatedCard = result.current.updateCardSRS(card, true);
            
            expect(updatedCard.srsData).toBeDefined();
            expect(updatedCard.srsData!.easeFactor).toBe(2.5);
            expect(updatedCard.srsData!.interval).toBeGreaterThan(0);
            expect(updatedCard.srsData!.repetitions).toBe(1);
        });

        it('should update nextReview date correctly', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1', {
                interval: 0,
                repetitions: 0
            });

            const updatedCard = result.current.updateCardSRS(card, true);
            
            expect(updatedCard.srsData).toBeDefined();
            
            const nextReview = new Date(updatedCard.srsData!.nextReview);
            const now = new Date();
            
            // Next review should be in the future
            expect(nextReview.getTime()).toBeGreaterThan(now.getTime());
        });

        it('should maintain ease factor bounds (minimum 1.3)', () => {
            const { result } = renderHook(() => useSRS());
            
            // Card with low ease factor
            const card = createMockCard('1', {
                easeFactor: 1.4,
                interval: 1,
                repetitions: 1
            });

            // Multiple incorrect answers to try to push ease factor below 1.3
            let updatedCard = card;
            for (let i = 0; i < 5; i++) {
                updatedCard = result.current.updateCardSRS(updatedCard, false);
            }

            expect(updatedCard.srsData!.easeFactor).toBeGreaterThanOrEqual(1.3);
        });

        it('should increase interval progressively with correct answers', () => {
            const { result } = renderHook(() => useSRS());
            
            let card = createMockCard('1', {
                easeFactor: 2.5,
                interval: 0,
                repetitions: 0
            });

            // First correct answer
            card = result.current.updateCardSRS(card, true);
            const interval1 = card.srsData!.interval;

            // Second correct answer
            card = result.current.updateCardSRS(card, true);
            const interval2 = card.srsData!.interval;

            // Third correct answer
            card = result.current.updateCardSRS(card, true);
            const interval3 = card.srsData!.interval;

            // Intervals should increase
            expect(interval2).toBeGreaterThan(interval1);
            expect(interval3).toBeGreaterThan(interval2);
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
            
            expect(stats.totalCards).toBe(4);
            expect(stats.dueCards).toBeGreaterThanOrEqual(1); // At least the past-due card
            expect(stats.newCards).toBe(1);
            expect(stats.learningCards).toBeGreaterThan(0);
            expect(stats.masteredCards).toBeGreaterThan(0);
        });

        it('should handle empty card array', () => {
            const { result } = renderHook(() => useSRS());
            
            const stats = result.current.getSRSStats([]);
            
            expect(stats.dueCards).toBe(0);
            expect(stats.learningCards).toBe(0);
            expect(stats.masteredCards).toBe(0);
            expect(stats.newCards).toBe(0);
            expect(stats.totalCards).toBe(0);
        });

        it('should correctly categorize cards by interval', () => {
            const { result } = renderHook(() => useSRS());
            
            const cards: Flashcard[] = [
                createMockCard('1', { interval: 1 }),   // Learning (< 21)
                createMockCard('2', { interval: 7 }),   // Learning (< 21)
                createMockCard('3', { interval: 14 }),  // Learning (< 21)
                createMockCard('4', { interval: 21 }),  // Mastered (>= 21)
                createMockCard('5', { interval: 30 }),  // Mastered (>= 21)
                createMockCard('6')                     // New (no SRS data)
            ];

            const stats = result.current.getSRSStats(cards);
            
            expect(stats.learningCards).toBe(3);
            expect(stats.masteredCards).toBe(2);
            expect(stats.newCards).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle cards with missing SRS properties', () => {
            const { result } = renderHook(() => useSRS());
            
            const card = createMockCard('1');
            
            expect(() => {
                result.current.updateCardSRS(card, true);
            }).not.toThrow();
        });

        it('should handle very old review dates', () => {
            const { result } = renderHook(() => useSRS());
            
            const veryOld = new Date('2020-01-01');
            const card = createMockCard('1', {
                nextReview: veryOld.toISOString()
            });

            const dueCards = result.current.getDueCards([card]);
            
            expect(dueCards).toHaveLength(1);
        });

        it('should handle future review dates', () => {
            const { result } = renderHook(() => useSRS());
            
            const farFuture = new Date('2030-01-01');
            const card = createMockCard('1', {
                nextReview: farFuture.toISOString()
            });

            const dueCards = result.current.getDueCards([card]);
            
            expect(dueCards).toHaveLength(0);
        });
    });
});
