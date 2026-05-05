import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface FloatingHeaderToggleProps {
    /** true = header visible via override, false = header masqué */
    showHeader: boolean;
    onToggle: () => void;
    /** Position verticale (défaut = safe-area-aware) */
    topStyle?: React.CSSProperties;
}

/**
 * FloatingHeaderToggle
 * Bouton flottant glassmorphism affiché en top-left pour révéler/masquer le header.
 * - Icône fa-chevron-up  → header masqué → clic révèle
 * - Icône fa-chevron-down → header visible → clic masque
 */
export const FloatingHeaderToggle: React.FC<FloatingHeaderToggleProps> = ({
    showHeader,
    onToggle,
    topStyle,
}) => {
    const { themeMode } = useTheme();
    const isDark = themeMode === 'dark';

    return (
        <button
            onClick={onToggle}
            style={topStyle ?? { top: 'env(safe-area-inset-top, 12px)', marginTop: '4px' }}
            className={`absolute left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center shadow-lg
                transition-all duration-300 backdrop-blur-md
                ${isDark
                    ? 'bg-gray-800/80 text-gray-200 border border-gray-700'
                    : 'bg-white/80 text-gray-700 border border-gray-200'
                }`}
            title={showHeader ? 'Masquer le menu' : 'Afficher le menu'}
            aria-label={showHeader ? 'Masquer le menu' : 'Afficher le menu'}
        >
            <i className={`fas fa-chevron-${showHeader ? 'up' : 'down'} text-xs`} />
        </button>
    );
};
