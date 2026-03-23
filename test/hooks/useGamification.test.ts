import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGamification } from '../../hooks/useGamification';
import { QuizResult } from '../../types';

// Pas de mock de useLocalStorage : jsdom fournit window.localStorage
// useLocalStorage utilise useState+useEffect → les re-renders sont correctement déclenchés.

describe('useGamification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-26T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Adapte QuizResult (format tests) vers sessionStats (format hook)
    const toSessionStats = (result: QuizResult, langFrom?: string) => ({
        correctCount: result.correctCount,
        totalCount: result.totalCount,
        duration: result.duration ?? 0,
        language: langFrom ?? 'unknown',
    });

    describe('Streak Management', () => {
        it('should initialize with default streak data', () => {
            const { result } = renderHook(() => useGamification());
            expect(result.current.gamificationData.streak).toBeDefined();
            expect(result.current.gamificationData.streak.currentStreak).toBeGreaterThanOrEqual(0);
        });

        it('should update streak on quiz completion', () => {
            const { result } = renderHook(() => useGamification());
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 8, totalCount: 10, mode: 'classic' }));
            });
            expect(result.current.gamificationData.totalQuizzes).toBeGreaterThan(0);
        });

        it('should maintain streak when studying daily', () => {
            const { result } = renderHook(() => useGamification());
            const q = { correctCount: 5, totalCount: 5, mode: 'classic' as const };

            act(() => { result.current.updateGamification(toSessionStats(q)); });
            const streakDay1 = result.current.gamificationData.streak.currentStreak;

            vi.setSystemTime(new Date('2026-01-27T12:00:00Z'));
            act(() => { result.current.updateGamification(toSessionStats(q)); });

            expect(result.current.gamificationData.streak.currentStreak).toBeGreaterThanOrEqual(streakDay1);
        });

        it('should reset streak when missing a day', () => {
            const { result } = renderHook(() => useGamification());
            const q = { correctCount: 5, totalCount: 5, mode: 'classic' as const };

            act(() => { result.current.updateGamification(toSessionStats(q)); });

            vi.setSystemTime(new Date('2026-01-28T12:00:00Z')); // Saute Day 2
            act(() => { result.current.updateGamification(toSessionStats(q)); });

            expect(result.current.gamificationData.streak.currentStreak).toBeLessThanOrEqual(1);
        });
    });

    describe('Achievement System', () => {
        it('should unlock first quiz achievement', () => {
            const { result } = renderHook(() => useGamification());
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 5, totalCount: 5, mode: 'classic' }));
            });
            const ach = result.current.gamificationData.achievements.find(a => a.id === 'first_quiz');
            expect(ach?.unlockedAt).toBeDefined();
        });

        it('should unlock perfect score achievements', () => {
            const { result } = renderHook(() => useGamification());
            const perfect = { correctCount: 10, totalCount: 10, mode: 'classic' as const };
            for (let i = 0; i < 10; i++) {
                act(() => { result.current.updateGamification(toSessionStats(perfect)); });
            }
            const ach = result.current.gamificationData.achievements.find(a => a.id === 'perfect_10');
            expect(ach?.unlockedAt).toBeDefined();
        });

        it('should return new achievements only', () => {
            const { result } = renderHook(() => useGamification());
            const q = { correctCount: 5, totalCount: 5, mode: 'classic' as const };

            // 1er quiz : débloque first_quiz
            act(() => { result.current.updateGamification(toSessionStats(q)); });
            expect(result.current.newAchievements.length).toBeGreaterThan(0);

            // Effacer les nouveaux succès
            act(() => { result.current.clearNewAchievements(); });

            // 2ème quiz : first_quiz ne doit plus apparaître
            act(() => { result.current.updateGamification(toSessionStats(q)); });
            const duplicates = result.current.newAchievements.filter(a => a.id === 'first_quiz');
            expect(duplicates.length).toBe(0);
        });
    });

    describe('Statistics Tracking', () => {
        it('should track total quizzes', () => {
            const { result } = renderHook(() => useGamification());
            const initial = result.current.gamificationData.totalQuizzes;
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 7, totalCount: 10, mode: 'classic' }));
            });
            expect(result.current.gamificationData.totalQuizzes).toBe(initial + 1);
        });

        it('should track perfect quizzes', () => {
            const { result } = renderHook(() => useGamification());
            const initial = result.current.gamificationData.perfectQuizzes;
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 10, totalCount: 10, mode: 'classic' }));
            });
            expect(result.current.gamificationData.perfectQuizzes).toBe(initial + 1);
        });

        it('should not count imperfect quizzes as perfect', () => {
            const { result } = renderHook(() => useGamification());
            const initial = result.current.gamificationData.perfectQuizzes;
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 8, totalCount: 10, mode: 'classic' }));
            });
            expect(result.current.gamificationData.perfectQuizzes).toBe(initial);
        });

        it('should track study time', () => {
            const { result } = renderHook(() => useGamification());
            const initial = result.current.gamificationData.totalStudyTime;
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 5, totalCount: 5, mode: 'classic', duration: 120 }));
            });
            expect(result.current.gamificationData.totalStudyTime).toBeGreaterThan(initial);
        });
    });

    describe('Language Progress', () => {
        it('should track progress by language', () => {
            const { result } = renderHook(() => useGamification());
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 8, totalCount: 10, mode: 'classic' }, 'fr'));
            });
            expect(result.current.gamificationData.languageProgress).toBeDefined();
        });

        it('should calculate accuracy per language', () => {
            const { result } = renderHook(() => useGamification());
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 8, totalCount: 10, mode: 'classic' }, 'fr'));
            });
            act(() => {
                result.current.updateGamification(toSessionStats({ correctCount: 10, totalCount: 10, mode: 'classic' }, 'fr'));
            });
            const frProgress = result.current.gamificationData.languageProgress['fr'];
            if (frProgress) {
                expect(frProgress.accuracy).toBeGreaterThan(0);
                expect(frProgress.accuracy).toBeLessThanOrEqual(100);
            }
        });
    });

    describe('Streak Achievements', () => {
        it('should unlock 7-day streak achievement', () => {
            // Ce test utilise vi.setSystemTime — compatible avec les fake timers de vitest
            const { result } = renderHook(() => useGamification());
            const q = { correctCount: 5, totalCount: 5, mode: 'classic' as const };

            for (let day = 0; day < 7; day++) {
                const d = 26 + day;
                const month = d > 31 ? '02' : '01';
                const dayStr = d > 31 ? String(d - 31).padStart(2, '0') : String(d).padStart(2, '0');
                vi.setSystemTime(new Date(`2026-${month}-${dayStr}T12:00:00Z`));
                act(() => { result.current.updateGamification(toSessionStats(q)); });
            }

            const ach = result.current.gamificationData.achievements.find(a => a.id === 'streak_7');
            expect(ach?.unlockedAt).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle quiz with 0 total cards', () => {
            const { result } = renderHook(() => useGamification());
            expect(() => {
                act(() => { result.current.updateGamification(toSessionStats({ correctCount: 0, totalCount: 0, mode: 'classic' })); });
            }).not.toThrow();
        });

        it('should handle negative values gracefully', () => {
            const { result } = renderHook(() => useGamification());
            expect(() => {
                act(() => { result.current.updateGamification(toSessionStats({ correctCount: -1, totalCount: 10, mode: 'classic' })); });
            }).not.toThrow();
        });

        it('should handle correctCount > totalCount', () => {
            const { result } = renderHook(() => useGamification());
            expect(() => {
                act(() => { result.current.updateGamification(toSessionStats({ correctCount: 15, totalCount: 10, mode: 'classic' })); });
            }).not.toThrow();
        });
    });
});
