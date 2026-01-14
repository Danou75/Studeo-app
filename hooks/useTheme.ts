import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { ThemeMode, ThemeStyle, THEMES } from '../constants/themes';

export const useTheme = () => {
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('themeMode', 'auto');
  const [themeStyle, setThemeStyle] = useLocalStorage<ThemeStyle>('themeStyle', 'default');
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>('light');

  // Détecter le thème système
  const getSystemTheme = (): 'light' | 'dark' => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  // Appliquer le thème au DOM avec CSS variables
  const applyTheme = (mode: 'light' | 'dark', style: ThemeStyle) => {
    const root = document.documentElement;
    const theme = THEMES[style];
    const colors = theme.colors[mode];

    // Ajouter/retirer la classe dark pour Tailwind
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Appliquer les variables CSS personnalisées
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-hover', colors.primaryHover);
    root.style.setProperty('--color-primary-light', colors.primaryLight);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-secondary-hover', colors.secondaryHover);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-background-secondary', colors.backgroundSecondary);
    root.style.setProperty('--color-background-tertiary', colors.backgroundTertiary);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-text-muted', colors.textMuted);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-border-hover', colors.borderHover);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-info', colors.info);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-light', colors.accentLight);

    setCurrentMode(mode);
  };

  // Calculer et appliquer le thème effectif
  useEffect(() => {
    let effectiveMode: 'light' | 'dark';

    if (themeMode === 'auto') {
      effectiveMode = getSystemTheme();
    } else {
      effectiveMode = themeMode;
    }

    applyTheme(effectiveMode, themeStyle);
  }, [themeMode, themeStyle]);

  // Écouter les changements du thème système (uniquement en mode auto)
  useEffect(() => {
    if (themeMode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light', themeStyle);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, themeStyle]);

  return {
    themeMode,
    themeStyle,
    currentMode,
    setThemeMode,
    setThemeStyle,
    currentTheme: THEMES[themeStyle],
  };
};
