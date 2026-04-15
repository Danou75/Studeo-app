/**
 * useAppNavigationStore — Store Zustand minimal post-migration React Router.
 *
 * Ne contient plus screen / screenHistory / navigate / goBack.
 * Ces fonctionnalités sont désormais gérées nativement par React Router.
 *
 * Ce store conserve uniquement l'état UI des modals globales qui ne
 * peuvent pas vivre dans une URL (EditCardsModal ouvert ou non).
 */

import { create } from 'zustand';

interface AppNavigationState {
    isEditModalOpen: boolean;
    setIsEditModalOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
}

export const useAppNavigationStore = create<AppNavigationState>((set) => ({
    isEditModalOpen: false,

    setIsEditModalOpen: (updater) => set((state) => ({
        isEditModalOpen: typeof updater === 'function'
            ? updater(state.isEditModalOpen)
            : updater
    })),
}));
