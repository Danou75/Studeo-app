import React from 'react';
import { ThemeMode, ThemeStyle, THEME_STYLES, THEMES } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeSelector: React.FC = () => {
  const { themeMode, themeStyle, setThemeMode, setThemeStyle } = useTheme();
  
  const onThemeModeChange = (mode: ThemeMode) => setThemeMode(mode);
  const onThemeStyleChange = (style: ThemeStyle) => setThemeStyle(style);
  const modes: { value: ThemeMode; icon: string; label: string }[] = [
    { value: 'light', icon: '☀️', label: 'Clair' },
    { value: 'dark', icon: '🌙', label: 'Sombre' },
    { value: 'auto', icon: '🔄', label: 'Auto' },
  ];

  return (
    <div className="grid grid-cols-2 gap-6 items-center">
      {/* Mode */}
      <div>
        <label className="text-sm font-medium block mb-2 text-center">Mode</label>
        <div className="grid grid-cols-3 gap-1">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onThemeModeChange(mode.value)}
              className={`p-1.5 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-0.5 h-14 ${
                themeMode === mode.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background-tertiary border-border hover:border-primary text-text'
              }`}
              title={mode.label}
            >
              <div className="text-lg">{mode.icon}</div>
              <div className="text-[9px] font-bold uppercase tracking-tighter">{mode.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div className="flex flex-col h-full justify-end pb-1">
        <label htmlFor="theme-style" className="text-sm font-medium block mb-2 text-center">Style</label>
        <div className="flex-1 flex items-center">
            <select
            id="theme-style"
            value={themeStyle}
            onChange={(e) => onThemeStyleChange(e.target.value as ThemeStyle)}
            className="w-full p-2.5 text-sm border-2 border-border bg-background text-text rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
            {THEME_STYLES.map((style) => {
                const theme = THEMES[style];
                return (
                <option key={style} value={style}>
                    {theme.emoji} {theme.name}
                </option>
                );
            })}
            </select>
        </div>
      </div>
    </div>
  );
};
