import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tutor, TutorCategory } from '../types';

interface TutorState {
    guestTutors: Tutor[];
    tutorsRoomCategory: TutorCategory;
    
    setGuestTutors: (updater: Tutor[] | ((prev: Tutor[]) => Tutor[])) => void;
    setTutorsRoomCategory: (category: TutorCategory) => void;
    
    addGuestTutor: (tutor: Tutor) => void;
    updateGuestTutor: (tutorId: string, updatedTutor: Tutor) => void;
    removeGuestTutor: (tutorId: string) => void;
}

export const useTutorStore = create<TutorState>()(
    persist(
        (set) => ({
            guestTutors: [],
            tutorsRoomCategory: 'languages',

            setGuestTutors: (updater) => set((state) => ({
                guestTutors: typeof updater === 'function' ? updater(state.guestTutors) : updater
            })),
            
            setTutorsRoomCategory: (category) => set({ tutorsRoomCategory: category }),
            
            addGuestTutor: (tutor) => set((state) => ({ guestTutors: [...state.guestTutors, tutor] })),
            updateGuestTutor: (tutorId, updatedTutor) => set((state) => ({
                guestTutors: state.guestTutors.map(t => t.id === tutorId ? updatedTutor : t)
            })),
            removeGuestTutor: (tutorId) => set((state) => ({
                guestTutors: state.guestTutors.filter(t => t.id !== tutorId)
            }))
        }),
        {
            name: 'studeo-tutors-storage',
            partialize: (state) => ({
                guestTutors: state.guestTutors,
                // Don't persist tutorsRoomCategory
            })
        }
    )
);
