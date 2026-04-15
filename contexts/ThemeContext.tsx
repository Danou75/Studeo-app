import React, { ReactNode, useEffect } from 'react';
import { ThemeStyle, THEMES } from '../constants/themes';
import { useThemeStore } from '../stores/useThemeStore';

export const useTheme = () => {
  const themeMode = useThemeStore(s => s.themeMode);
  const themeStyle = useThemeStore(s => s.themeStyle);
  const setThemeMode = useThemeStore(s => s.setThemeMode);
  const setThemeStyle = useThemeStore(s => s.setThemeStyle);

  const getSystemTheme = (): 'light' | 'dark' => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const currentMode = themeMode === 'auto' ? getSystemTheme() : themeMode;

  return {
    themeMode,
    themeStyle,
    currentMode,
    setThemeMode,
    setThemeStyle,
    currentTheme: THEMES[themeStyle] || THEMES['default'],
  };
};

export const ThemeProvider: React.FC<{ value?: any; children: ReactNode }> = ({ children }) => {
  const { themeMode, themeStyle } = useThemeStore();

  useEffect(() => {
    const getSystemTheme = (): 'light' | 'dark' => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    };

    const applyTheme = (mode: 'light' | 'dark', style: ThemeStyle) => {
      const root = document.documentElement;
      const theme = THEMES[style] || THEMES['default'];
      const colors = theme.colors[mode];

      if (mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

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
    };

    let effectiveMode: 'light' | 'dark' = themeMode === 'auto' ? getSystemTheme() : themeMode;
    applyTheme(effectiveMode, themeStyle);

    if (themeMode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light', themeStyle);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, themeStyle]);

  return <>{children}</>;
};
