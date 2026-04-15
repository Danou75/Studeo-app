import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ThemeMode, ThemeStyle } from '../constants/themes';

interface ThemeState {
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeStyle: (style: ThemeStyle) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeMode: 'auto',
      themeStyle: 'default',
      setThemeMode: (mode) => set({ themeMode: mode }),
      setThemeStyle: (style) => set({ themeStyle: style }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
