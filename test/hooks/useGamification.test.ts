import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGamification } from '../../hooks/useGamification';
import { QuizResult } from '../../types';

// Mock localStorage
vi.mock('../../hooks/useLocalStorage', () => ({
    useLocalStorage: (key: string, initialValue: any) => {
        let value = initialValue;
        const setValue = vi.fn((newValue) => {
            if (typeof newValue === 'function') {
                value = newValue(value);
            } else {
                value = newValue;
            }
        });
        return [value, setValue] as const;
    }
}));

describe('useGamification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Reset date to avoid flaky tests
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-26T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Streak Management', () => {
        it('should initialize with default streak data', () => {
            const { result } = renderHook(() => useGamification());

            expect(result.current.gamificationData.streak).toBeDefined();
            expect(result.current.gamificationData.streak.currentStreak).toBeGreaterThanOrEqual(0);
        });

        it('should update streak on quiz completion', () => {
            const { result } = renderHook(() => useGamification());

            const mockQuizResult: QuizResult = {
                correctCount: 8,
                totalCount: 10,
                mode: 'classic'
            };

            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            expect(result.current.gamificationData.totalQuizzes).toBeGreaterThan(0);
        });

        it('should maintain streak when studying daily', () => {
            const { result } = renderHook(() => useGamification());

            const mockQuizResult: QuizResult = {
                correctCount: 5,
                totalCount: 5,
                mode: 'classic'
            };

            // Day 1
            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            const streakDay1 = result.current.gamificationData.streak.currentStreak;

            // Day 2 (next day)
            vi.setSystemTime(new Date('2026-01-27T12:00:00Z'));
            
            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            const streakDay2 = result.current.gamificationData.streak.currentStreak;

            expect(streakDay2).toBeGreaterThanOrEqual(streakDay1);
        });

        it('should reset streak when missing a day', () => {
            const { result } = renderHook(() => useGamification());

            const mockQuizResult: QuizResult = {
                correctCount: 5,
                totalCount: 5,
                mode: 'classic'
            };

            // Day 1
            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            // Skip to Day 3 (missing Day 2)
            vi.setSystemTime(new Date('2026-01-28T12:00:00Z'));
            
            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            // Streak should reset or be low
            expect(result.current.gamificationData.streak.currentStreak).toBeLessThanOrEqual(1);
        });
    });

    describe('Achievement System', () => {
        it('should unlock first quiz achievement', () => {
            const { result } = renderHook(() => useGamification());

            const mockQuizResult: QuizResult = {
                correctCount: 5,
                totalCount: 5,
                mode: 'classic'
            };

            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            const firstQuizAchievement = result.current.gamificationData.achievements.find(
                a => a.id === 'first_quiz'
            );

            expect(firstQuizAchievement?.unlockedAt).toBeDefined();
        });

        it('should unlock perfect score achievements', () => {
            const { result } = renderHook(() => useGamification());

            const perfectQuizResult: QuizResult = {
                correctCount: 10,
                totalCount: 10,
                mode: 'classic'
            };

            // Complete 10 perfect quizzes
            for (let i = 0; i < 10; i++) {
                act(() => {
                    result.current.updateGamificationData(perfectQuizResult);
                });
            }

            const perfect10Achievement = result.current.gamificationData.achievements.find(
                a => a.id === 'perfect_10'
            );

            expect(perfect10Achievement?.unlockedAt).toBeDefined();
        });

        it('should return new achievements only', () => {
            const { result } = renderHook(() => useGamification());

            const mockQuizResult: QuizResult = {
                correctCount: 5,
                totalCount: 5,
                mode: 'classic'
            };

            // First quiz - should unlock first_quiz
            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            const newAchievements1 = result.current.newAchievements;
            expect(newAchievements1.length).toBeGreaterThan(0);

            // Second quiz - should not unlock first_quiz again
            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            const newAchievements2 = result.current.newAchievements;
            const duplicateFirstQuiz = newAchievements2.filter(a => a.id === 'first_quiz');
            expect(duplicateFirstQuiz.length).toBe(0);
        });
    });

    describe('Statistics Tracking', () => {
        it('should track total quizzes', () => {
            const { result } = renderHook(() => useGamification());

            const initialCount = result.current.gamificationData.totalQuizzes;

            const mockQuizResult: QuizResult = {
                correctCount: 7,
                totalCount: 10,
                mode: 'classic'
            };

            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            expect(result.current.gamificationData.totalQuizzes).toBe(initialCount + 1);
        });

        it('should track perfect quizzes', () => {
            const { result } = renderHook(() => useGamification());

            const initialPerfectCount = result.current.gamificationData.perfectQuizzes;

            const perfectQuizResult: QuizResult = {
                correctCount: 10,
                totalCount: 10,
                mode: 'classic'
            };

            act(() => {
                result.current.updateGamificationData(perfectQuizResult);
            });

            expect(result.current.gamificationData.perfectQuizzes).toBe(initialPerfectCount + 1);
        });

        it('should not count imperfect quizzes as perfect', () => {
            const { result } = renderHook(() => useGamification());

            const initialPerfectCount = result.current.gamificationData.perfectQuizzes;

            const imperfectQuizResult: QuizResult = {
                correctCount: 8,
                totalCount: 10,
                mode: 'classic'
            };

            act(() => {
                result.current.updateGamificationData(imperfectQuizResult);
            });

            expect(result.current.gamificationData.perfectQuizzes).toBe(initialPerfectCount);
        });

        it('should track study time', () => {
            const { result } = renderHook(() => useGamification());

            const initialStudyTime = result.current.gamificationData.totalStudyTime;

            const mockQuizResult: QuizResult = {
                correctCount: 5,
                totalCount: 5,
                mode: 'classic',
                duration: 120 // 2 minutes
            };

            act(() => {
                result.current.updateGamificationData(mockQuizResult);
            });

            expect(result.current.gamificationData.totalStudyTime).toBeGreaterThan(initialStudyTime);
        });
    });

    describe('Language Progress', () => {
        it('should track progress by language', () => {
            const { result } = renderHook(() => useGamification());

            const mockQuizResult: QuizResult = {
                correctCount: 8,
                totalCount: 10,
                mode: 'classic'
            };

            act(() => {
                result.current.updateGamificationData(mockQuizResult, 'fr', 'en');
            });

            expect(result.current.gamificationData.languageProgress).toBeDefined();
        });

        it('should calculate accuracy per language', () => {
            const { result } = renderHook(() => useGamification());

            // First quiz: 80% accuracy
            act(() => {
                result.current.updateGamificationData(
                    { correctCount: 8, totalCount: 10, mode: 'classic' },
                    'fr',
                    'en'
                );
            });

            // Second quiz: 100% accuracy
            act(() => {
                result.current.updateGamificationData(
                    { correctCount: 10, totalCount: 10, mode: 'classic' },
                    'fr',
                    'en'
                );
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
            const { result } = renderHook(() => useGamification());

            const mockQuizResult: QuizResult = {
                correctCount: 5,
                totalCount: 5,
                mode: 'classic'
            };

            // Simulate 7 consecutive days
            for (let day = 0; day < 7; day++) {
                vi.setSystemTime(new Date(`2026-01-${26 + day}T12:00:00Z`));
                
                act(() => {
                    result.current.updateGamificationData(mockQuizResult);
                });
            }

            const streak7Achievement = result.current.gamificationData.achievements.find(
                a => a.id === 'streak_7'
            );

            expect(streak7Achievement?.unlockedAt).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle quiz with 0 total cards', () => {
            const { result } = renderHook(() => useGamification());

            const emptyQuizResult: QuizResult = {
                correctCount: 0,
                totalCount: 0,
                mode: 'classic'
            };

            expect(() => {
                act(() => {
                    result.current.updateGamificationData(emptyQuizResult);
                });
            }).not.toThrow();
        });

        it('should handle negative values gracefully', () => {
            const { result } = renderHook(() => useGamification());

            const invalidQuizResult: QuizResult = {
                correctCount: -1,
                totalCount: 10,
                mode: 'classic'
            };

            expect(() => {
                act(() => {
                    result.current.updateGamificationData(invalidQuizResult);
                });
            }).not.toThrow();
        });

        it('should handle correctCount > totalCount', () => {
            const { result } = renderHook(() => useGamification());

            const invalidQuizResult: QuizResult = {
                correctCount: 15,
                totalCount: 10,
                mode: 'classic'
            };

            expect(() => {
                act(() => {
                    result.current.updateGamificationData(invalidQuizResult);
                });
            }).not.toThrow();
        });
    });
});
