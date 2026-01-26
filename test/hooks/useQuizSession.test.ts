import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizSession } from '../../hooks/useQuizSession';
import { Flashcard, QuizConfig } from '../../types';

// Mock localStorage
vi.mock('../../hooks/useLocalStorage', () => ({
    useLocalStorage: (key: string, initialValue: any) => {
        const setValue = vi.fn((newValue) => {
            if (typeof newValue === 'function') {
                return newValue(initialValue);
            }
            return newValue;
        });
        return [initialValue, setValue] as const;
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
            expect(result.current.quizConfig?.quizName).toBe('Test Set');
        });

        it('should shuffle cards when shuffle is enabled', () => {
            const { result } = renderHook(() => useQuizSession());

            const orderedIds = mockCards.map(c => c.id);

            act(() => {
                result.current.startQuiz(
                    mockCards,
                    mockConfig,
                    'local',
                    true,
                    'Test Set'
                );
            });

            const quizIds = result.current.quizCards.map(c => c.id);
            
            // Note: This test might occasionally fail due to random shuffle
            // In production, you'd want to mock Math.random for deterministic testing
            expect(quizIds).toHaveLength(orderedIds.length);
            expect(quizIds.sort()).toEqual(orderedIds.sort());
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
    });

    describe('recordAnswer', () => {
        it('should record correct answer', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            act(() => {
                result.current.recordAnswer(mockCards[0].id, true);
            });

            expect(result.current.incorrectCards).toHaveLength(0);
        });

        it('should record incorrect answer', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            act(() => {
                result.current.recordAnswer(mockCards[0].id, false);
            });

            expect(result.current.incorrectCards).toHaveLength(1);
            expect(result.current.incorrectCards[0].id).toBe(mockCards[0].id);
        });

        it('should track persistent errors', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            // First error
            act(() => {
                result.current.recordAnswer(mockCards[0].id, false);
            });

            // Second error on same card
            act(() => {
                result.current.recordAnswer(mockCards[0].id, false);
            });

            // Third error on same card
            act(() => {
                result.current.recordAnswer(mockCards[0].id, false);
            });

            const persistentErrors = result.current.getPersistentErrorCards(mockCards);
            expect(persistentErrors.length).toBeGreaterThan(0);
        });
    });

    describe('completeQuiz', () => {
        it('should create quiz result with correct data', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            // Answer some questions
            act(() => {
                result.current.recordAnswer(mockCards[0].id, true);
                result.current.recordAnswer(mockCards[1].id, false);
                result.current.recordAnswer(mockCards[2].id, true);
            });

            act(() => {
                result.current.completeQuiz();
            });

            expect(result.current.lastResult).toBeDefined();
            expect(result.current.lastResult?.totalCount).toBe(3);
            expect(result.current.lastResult?.correctCount).toBe(2);
        });

        it('should add result to history', () => {
            const { result } = renderHook(() => useQuizSession());

            const initialHistoryLength = result.current.history.length;

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test');
            });

            act(() => {
                result.current.recordAnswer(mockCards[0].id, true);
            });

            act(() => {
                result.current.completeQuiz();
            });

            expect(result.current.history.length).toBe(initialHistoryLength + 1);
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
                result.current.recordAnswer(mockCards[0].id, false);
                result.current.recordAnswer(mockCards[0].id, false);
                result.current.recordAnswer(mockCards[0].id, false);
            });

            let persistentErrors = result.current.getPersistentErrorCards(mockCards);
            const initialCount = persistentErrors.length;

            act(() => {
                result.current.resetPersistentError(mockCards[0].id);
            });

            persistentErrors = result.current.getPersistentErrorCards(mockCards);
            expect(persistentErrors.length).toBeLessThan(initialCount);
        });
    });

    describe('deleteHistoryEntry', () => {
        it('should remove entry from history', () => {
            const { result } = renderHook(() => useQuizSession());

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test 1');
                result.current.recordAnswer(mockCards[0].id, true);
                result.current.completeQuiz();
            });

            act(() => {
                result.current.startQuiz(mockCards, mockConfig, 'local', true, 'Test 2');
                result.current.recordAnswer(mockCards[0].id, true);
                result.current.completeQuiz();
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
});
