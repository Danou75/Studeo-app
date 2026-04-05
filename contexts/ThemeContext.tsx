import React, { createContext, useContext } from 'react';
import { ThemeMode, ThemeStyle } from '../constants/themes';

interface ThemeContextValue {
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeStyle: (style: ThemeStyle) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{
  value: ThemeContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
);

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
