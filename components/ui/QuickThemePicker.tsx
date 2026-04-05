import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { THEMES, THEME_STYLES, ThemeStyle } from '../../constants/themes';

/**
 * QuickThemePicker — Bouton discret dans les headers pour changer rapidement de thème.
 * Affiche un petit popover avec les swatches de couleur de chaque thème.
 */
export const QuickThemePicker: React.FC = () => {
  const { themeStyle, themeMode, setThemeStyle, setThemeMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isDark = themeMode === 'dark';
  const currentTheme = THEMES[themeStyle];

  return (
    <div ref={ref} className="relative" style={{ zIndex: 50 }}>
      {/* Trigger button — discret, juste une palette + emoji du thème actif */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Changer de thème"
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all duration-200 text-xs font-semibold backdrop-blur-sm ${
          isDark ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        }`}
        style={{ border: isDark ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.1)' }}
      >
        <span className="text-sm leading-none">{currentTheme.emoji}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
          style={{
            background: isDark ? 'rgba(17,24,39,0.97)' : 'rgba(255,255,255,0.97)',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            backdropFilter: 'blur(16px)',
            minWidth: '240px',
          }}
        >
          {/* En-tête du popover */}
          <div
            className="px-3 py-2 flex items-center justify-between"
            style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)' }}
          >
            <span
              className="text-[11px] font-black uppercase tracking-widest"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
            >
              Thème couleur
            </span>
            {/* Toggle Dark/Light */}
            <button
              onClick={() => setThemeMode(isDark ? 'light' : 'dark')}
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all"
              style={{
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)',
              }}
            >
              <span>{isDark ? '☀️' : '🌙'}</span>
              <span>{isDark ? 'Clair' : 'Sombre'}</span>
            </button>
          </div>

          {/* Grille des thèmes */}
          <div className="p-2 grid grid-cols-3 gap-1.5">
            {THEME_STYLES.map((style: ThemeStyle) => {
              const theme = THEMES[style];
              const colors = theme.colors[isDark ? 'dark' : 'light'];
              const isActive = themeStyle === style;

              return (
                <button
                  key={style}
                  onClick={() => { setThemeStyle(style); setOpen(false); }}
                  title={theme.name}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all duration-150 group"
                  style={{
                    background: isActive
                      ? `${colors.primary}22`
                      : 'transparent',
                    border: isActive
                      ? `2px solid ${colors.primary}`
                      : '2px solid transparent',
                  }}
                >
                  {/* Swatch de couleur */}
                  <div
                    className="w-8 h-8 rounded-lg shadow-inner flex items-center justify-center text-base transition-transform duration-150 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.accent})`,
                    }}
                  >
                    <span
                      className="text-sm leading-none drop-shadow"
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                    >
                      {theme.emoji}
                    </span>
                  </div>
                  {/* Nom du thème */}
                  <span
                    className="text-[9px] font-bold leading-tight text-center w-full break-words"
                    style={{
                      color: isActive
                        ? colors.primary
                        : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'),
                    }}
                  >
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
