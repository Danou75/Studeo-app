import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface FloatingHeaderToggleProps {
    showHeader: boolean;
    onToggle: () => void;
    /** floating=true (défaut) : absolute au centre en haut. false : inline centré entre header et contenu */
    floating?: boolean;
}

/**
 * FloatingHeaderToggle
 * En mode floating (défaut) : positionné en absolute au sommet du conteneur parent.
 * En mode junction : inline-block centré, à placer entre le header et le contenu scrollable.
 */
export const FloatingHeaderToggle: React.FC<FloatingHeaderToggleProps> = ({
    showHeader,
    onToggle,
    floating = true,
}) => {
    const { themeMode } = useTheme();
    const isDark = themeMode === 'dark';

    const positionClass = floating
        ? 'absolute left-1/2 -translate-x-1/2 z-50'
        : 'mx-auto block z-40';

    const topStyle: React.CSSProperties = floating
        ? { top: 'env(safe-area-inset-top, 12px)', marginTop: '4px' }
        : {};

    return (
        <button
            onClick={onToggle}
            style={topStyle}
            className={`${positionClass} w-9 h-9 rounded-full flex items-center justify-center shadow-lg
                transition-all duration-300 backdrop-blur-md
                ${isDark
                    ? 'bg-gray-800/80 text-gray-200 border border-gray-700'
                    : 'bg-white/80 text-gray-700 border border-gray-200'
                }`}
            title={showHeader ? 'Masquer le menu' : 'Afficher le menu'}
            aria-label={showHeader ? 'Masquer le menu' : 'Afficher le menu'}
        >
            <i className={`fas fa-${showHeader ? 'chevron-up' : 'th'} ${showHeader ? 'text-xs' : 'text-sm'}`} />
        </button>
    );
};
