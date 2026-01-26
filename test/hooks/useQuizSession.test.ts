import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizSession } from '../../hooks/useQuizSession';
import { Flashcard, QuizConfig, QuizHistoryEntry } from '../../types';
import React from 'react';

// Mock ConfirmationContext
vi.mock('../../contexts/ConfirmationContext', () => ({
    useConfirmation: () => ({
        showConfirmation: vi.fn((config) => {
            // Auto-confirm for tests
            if (config.onConfirm) {
                config.onConfirm();
            }
        })
    }),
    ConfirmationProvider: ({ children }: { children: React.ReactNode }) => children
}));

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

describe('useQuizSession', () => {
    const mockCards: Flashcard[] = [
        {
            id: '1',
            type: 'classic',
            terms: { fr: 'Bonjour', en: 'Hello' }
        },
        {
            id: '2',
            type: 'classic',
            terms: { fr: 'Au revoir', en: 'Goodbye' }
        },
        {
            id: '3',
            type: 'mcq',
            mcqData: {
                question: { fr: 'Quelle est la capitale de la France ?' },
                answer: { fr: 'Paris' },
                distractors: [
                    { fr: 'Lyon' },
                    { fr: 'Marseille' },
                    { fr: 'Toulouse' }
                ]
            }
        }
    ];

    const mockConfig: Omit<QuizConfig, 'voiceEngine' | 'autoPlayAudio' | 'quizName'> = {
        questionLang: 'fr',
        answerLang: 'en',
        mode: 'classic',
        gameMode: 'normal',
        voiceGender: 'female'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('startQuiz', () => {
        it('should initialize quiz session correctly', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(
                    mockCards,
                    mockConfig,
                    'local',
                    true,
                    'Test Set'
                );
            });

            expect(result.current.quizCards).toHaveLength(3);
            expect(result.current.quizConfig).toBeDefined();
            expect(result.current.quizConfig?.quizName).toContain('Test Set');
        });

        it('should build correct quiz name', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(
                    mockCards,
                    mockConfig,
                    'local',
                    true,
                    'My Vocabulary'
                );
            });

            const quizName = result.current.quizConfig?.quizName;
            expect(quizName).toContain('fr→en');
            expect(quizName).toContain('My Vocabulary');
        });

        it('should handle empty card array', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(
                    [],
                    mockConfig,
                    'local',
                    true,
                    'Empty Set'
                );
            });

            expect(result.current.quizCards).toHaveLength(0);
        });

        it('should set voice engine and autoplay settings', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(
                    mockCards,
                    mockConfig,
                    'gemini',
                    false,
                    'Test'
                );
            });

            expect(result.current.quizConfig?.voiceEngine).toBe('gemini');
            expect(result.current.quizConfig?.autoPlayAudio).toBe(false);
        });
    });

    describe('endQuiz', () => {
        it('should create quiz result with correct data', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            const quizResult = {
                correctCount: 2,
                totalCount: 3,
                mode: 'classic' as const
            };

            const mistakes = [mockCards[1]]; // One incorrect card

            act(() => {
                result.current.endQuiz(quizResult, mistakes);
            });

            expect(result.current.lastResult).toBeDefined();
            expect(result.current.lastResult?.totalCount).toBe(3);
            expect(result.current.lastResult?.correctCount).toBe(2);
            expect(result.current.incorrectCards).toHaveLength(1);
        });

        it('should add result to history', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            const initialHistoryLength = result.current.history.length;

            act(() => {
                result.current.endQuiz(
                    { correctCount: 3, totalCount: 3, mode: 'classic' },
                    []
                );
            });

            expect(result.current.history.length).toBe(initialHistoryLength + 1);
        });

        it('should track persistent errors', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            // First quiz with error on card 1
            act(() => {
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    [mockCards[0]]
                );
            });

            expect(result.current.persistentErrors[mockCards[0].id]).toBe(1);

            // Second quiz with error on same card
            act(() => {
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    [mockCards[0]]
                );
            });

            expect(result.current.persistentErrors[mockCards[0].id]).toBe(2);
        });

        it('should limit history to 50 entries', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            // Add 60 quiz results
            for (let i = 0; i < 60; i++) {
                act(() => {
                    result.current.endQuiz(
                        { correctCount: 3, totalCount: 3, mode: 'classic' },
                        []
                    );
                });
            }

            expect(result.current.history.length).toBeLessThanOrEqual(50);
        });
    });

    describe('getPersistentErrorCards', () => {
        it('should return cards with 2+ errors', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            // Create persistent error (2+ mistakes)
            act(() => {
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    [mockCards[0]]
                );
            });

            act(() => {
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    [mockCards[0]]
                );
            });

            const persistentErrors = result.current.getPersistentErrorCards(mockCards);
            expect(persistentErrors.length).toBeGreaterThan(0);
            expect(persistentErrors[0].id).toBe(mockCards[0].id);
        });

        it('should not return cards with only 1 error', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            // Only 1 mistake
            act(() => {
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    [mockCards[0]]
                );
            });

            const persistentErrors = result.current.getPersistentErrorCards(mockCards);
            expect(persistentErrors).toHaveLength(0);
        });
    });

    describe('resetPersistentError', () => {
        it('should reset error count for specific card', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            // Create persistent error
            act(() => {
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    [mockCards[0]]
                );
            });

            act(() => {
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    [mockCards[0]]
                );
            });

            expect(result.current.persistentErrors[mockCards[0].id]).toBe(2);

            act(() => {
                result.current.resetPersistentError(mockCards[0].id);
            });

            expect(result.current.persistentErrors[mockCards[0].id]).toBeUndefined();
        });
    });

    describe('deleteHistoryEntry', () => {
        it('should remove entry from history', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test 1');
                result.current.endQuiz(
                    { correctCount: 3, totalCount: 3, mode: 'classic' },
                    []
                );
            });

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test 2');
                result.current.endQuiz(
                    { correctCount: 2, totalCount: 3, mode: 'classic' },
                    []
                );
            });

            const historyLength = result.current.history.length;
            const firstEntryId = result.current.history[0].id;

            act(() => {
                result.current.deleteHistoryEntry(firstEntryId);
            });

            expect(result.current.history.length).toBe(historyLength - 1);
            expect(result.current.history.find(h => h.id === firstEntryId)).toBeUndefined();
        });
    });

    describe('Game Modes', () => {
        it('should handle timed mode', () => {
            const { result } = renderHook(() => useQuizSession());

            const timedConfig = {
                ...mockConfig,
                gameMode: 'timed' as const
            };

            act(() => {
                result.current.startQuiz(mockCards, timedConfig, 'local', true, 'Timed Test');
            });

            expect(result.current.quizConfig?.gameMode).toBe('timed');
        });

        it('should handle survival mode', () => {
            const { result } = renderHook(() => useQuizSession());

            const survivalConfig = {
                ...mockConfig,
                gameMode: 'survival' as const
            };

            act(() => {
                result.current.startQuiz(mockCards, survivalConfig, 'local', true, 'Survival Test');
            });

            expect(result.current.quizConfig?.gameMode).toBe('survival');
        });

        it('should handle sprint mode', () => {
            const { result } = renderHook(() => useQuizSession());

            const sprintConfig = {
                ...mockConfig,
                gameMode: 'sprint' as const
            };

            act(() => {
                result.current.startQuiz(mockCards, sprintConfig, 'local', true, 'Sprint Test');
            });

            expect(result.current.quizConfig?.gameMode).toBe('sprint');
        });
    });

    describe('Quiz Name Building', () => {
        it('should include mode in quiz name', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(
                    mockCards,
                    { ...mockConfig, mode: 'mcq' },
                    'local',
                    true,
                    'Test'
                );
            });

            expect(result.current.quizConfig?.quizName).toContain('QCM');
        });

        it('should include languages in quiz name', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(
                    mockCards,
                    { ...mockConfig, questionLang: 'it', answerLang: 'fr' },
                    'local',
                    true,
                    'Italian'
                );
            });

            expect(result.current.quizConfig?.quizName).toContain('it→fr');
        });
    });
});
