import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { Lesson, StudyProgram, ConversationSession, SavedVocabList, SavedShadowingSession } from '../types';

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface StudyContentState {
    // Transient
    currentLesson: Lesson | null;

    // Persisted
    savedLessons: Lesson[];
    studyPrograms: StudyProgram[];
    curriculumSuggestions: any[];
    librarySuggestions: any[];
    savedConvSessions: ConversationSession[];
    savedVocabLists: SavedVocabList[];
    savedShadowingSessions: SavedShadowingSession[];

    // Actions
    setCurrentLesson: (lesson: Lesson | null) => void;
    setSavedLessons: (updater: Lesson[] | ((prev: Lesson[]) => Lesson[])) => void;
    setStudyPrograms: (updater: StudyProgram[] | ((prev: StudyProgram[]) => StudyProgram[])) => void;
    setCurriculumSuggestions: (updater: any[] | ((prev: any[]) => any[])) => void;
    setLibrarySuggestions: (updater: any[] | ((prev: any[]) => any[])) => void;
    setSavedConvSessions: (updater: ConversationSession[] | ((prev: ConversationSession[]) => ConversationSession[])) => void;
    setSavedVocabLists: (updater: SavedVocabList[] | ((prev: SavedVocabList[]) => SavedVocabList[])) => void;
    setSavedShadowingSessions: (updater: SavedShadowingSession[] | ((prev: SavedShadowingSession[]) => SavedShadowingSession[])) => void;
}

export const useStudyContentStore = create<StudyContentState>()(
    persist(
        (setState) => ({
            currentLesson: null,
            savedLessons: [],
            studyPrograms: [],
            curriculumSuggestions: [],
            librarySuggestions: [],
            savedConvSessions: [],
            savedVocabLists: [],
            savedShadowingSessions: [],

            setCurrentLesson: (lesson) => setState({ currentLesson: lesson }),

            setSavedLessons: (updater) => setState((state) => ({
                savedLessons: typeof updater === 'function' ? updater(state.savedLessons) : updater,
            })),

            setStudyPrograms: (updater) => setState((state) => ({
                studyPrograms: typeof updater === 'function' ? updater(state.studyPrograms) : updater,
            })),

            setCurriculumSuggestions: (updater) => setState((state) => ({
                curriculumSuggestions: typeof updater === 'function' ? updater(state.curriculumSuggestions) : updater,
            })),

            setLibrarySuggestions: (updater) => setState((state) => ({
                librarySuggestions: typeof updater === 'function' ? updater(state.librarySuggestions) : updater,
            })),

            setSavedConvSessions: (updater) => setState((state) => ({
                savedConvSessions: typeof updater === 'function' ? updater(state.savedConvSessions) : updater,
            })),

            setSavedVocabLists: (updater) => setState((state) => ({
                savedVocabLists: typeof updater === 'function' ? updater(state.savedVocabLists) : updater,
            })),

            setSavedShadowingSessions: (updater) => setState((state) => ({
                savedShadowingSessions: typeof updater === 'function' ? updater(state.savedShadowingSessions) : updater,
            })),
        }),
        {
            name: 'studeo-study-content-storage',
            storage: createJSONStorage(() => idbStorage),
            partialize: (state) => ({
                savedLessons: state.savedLessons,
                studyPrograms: state.studyPrograms,
                curriculumSuggestions: state.curriculumSuggestions,
                librarySuggestions: state.librarySuggestions,
                savedConvSessions: state.savedConvSessions,
                savedVocabLists: state.savedVocabLists,
                savedShadowingSessions: state.savedShadowingSessions,
            }),
        }
    )
);
