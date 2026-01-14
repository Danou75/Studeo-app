import { useState } from 'react';
import { Screen } from '../types';

export const useAppNavigation = () => {
    const [screen, setScreen] = useState<Screen>("home");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const navigateTo = (newScreen: Screen) => {
        setScreen(newScreen);
    };

    const toggleEditModal = (isOpen?: boolean) => {
        setIsEditModalOpen(prev => isOpen !== undefined ? isOpen : !prev);
    };

    return {
        screen,
        setScreen, // Gardé pour compatibilité directe si besoin, mais navigateTo est préférable
        navigateTo,
        isEditModalOpen,
        setIsEditModalOpen, // Gardé pour compatibilité
        toggleEditModal
    };
};
