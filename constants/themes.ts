// Définition des thèmes de l'application

export type ThemeMode = 'light' | 'dark' | 'auto';
// ThemeStyle is defined at the bottom now to include all types

export interface ThemeColors {
  // Couleurs principales
  primary: string;
  primaryHover: string;
  primaryLight: string;
  
  // Couleurs secondaires
  secondary: string;
  secondaryHover: string;
  
  // Arrière-plans
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Texte
  text: string;
  textSecondary: string;
  textMuted: string;
  
  // Bordures
  border: string;
  borderHover: string;
  
  // États
  success: string;
  error: string;
  warning: string;
  info: string;
  
  // Accents
  accent: string;
  accentLight: string;
}

export interface Theme {
  name: string;
  emoji: string;
  description: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

// Thème Classique (Ancien Défaut)
const classicTheme: Theme = {
  name: 'Classique Indigo',
  emoji: '🎨',
  description: 'Thème par défaut avec couleurs indigo',
  colors: {
    light: {
      primary: '#4F46E5',
      primaryHover: '#4338CA',
      primaryLight: '#818CF8',
      secondary: '#6B7280',
      secondaryHover: '#4B5563',
      background: '#FFFFFF',
      backgroundSecondary: '#F9FAFB',
      backgroundTertiary: '#F3F4F6',
      text: '#111827',
      textSecondary: '#374151',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      borderHover: '#4F46E5',
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
      accent: '#8B5CF6',
      accentLight: '#C4B5FD',
    },
    dark: {
      primary: '#6366F1',
      primaryHover: '#818CF8',
      primaryLight: '#A5B4FC',
      secondary: '#9CA3AF',
      secondaryHover: '#D1D5DB',
      background: '#111827',
      backgroundSecondary: '#1F2937',
      backgroundTertiary: '#374151',
      text: '#F9FAFB',
      textSecondary: '#E5E7EB',
      textMuted: '#9CA3AF',
      border: '#374151',
      borderHover: '#6366F1',
      success: '#34D399',
      error: '#F87171',
      warning: '#FBBF24',
      info: '#60A5FA',
      accent: '#A78BFA',
      accentLight: '#DDD6FE',
    },
  },
};

// Thème Français (Bleu-Blanc-Rouge)
const frenchTheme: Theme = {
  name: 'Français',
  emoji: '🇫🇷',
  description: 'Inspiré des couleurs de la France',
  colors: {
    light: {
      primary: '#0055A4',
      primaryHover: '#003D7A',
      primaryLight: '#4A90E2',
      secondary: '#EF4135',
      secondaryHover: '#C7352B',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#E8EAF6',
      text: '#1A1A1A',
      textSecondary: '#424242',
      textMuted: '#757575',
      border: '#E0E0E0',
      borderHover: '#0055A4',
      success: '#10B981',
      error: '#EF4135',
      warning: '#F59E0B',
      info: '#0055A4',
      accent: '#EF4135',
      accentLight: '#FFB3B3',
    },
    dark: {
      primary: '#4A90E2',
      primaryHover: '#6BA5E7',
      primaryLight: '#8CBAED',
      secondary: '#FF6B6B',
      secondaryHover: '#FF8787',
      background: '#0A1929',
      backgroundSecondary: '#1A2332',
      backgroundTertiary: '#2A3342',
      text: '#F5F5F5',
      textSecondary: '#E0E0E0',
      textMuted: '#9E9E9E',
      border: '#2A3342',
      borderHover: '#4A90E2',
      success: '#34D399',
      error: '#FF6B6B',
      warning: '#FBBF24',
      info: '#4A90E2',
      accent: '#FF6B6B',
      accentLight: '#FFCCCB',
    },
  },
};

// Thème Anglais (Rouge-Bleu britannique)
const englishTheme: Theme = {
  name: 'English',
  emoji: '🇬🇧',
  description: 'Inspired by British colors',
  colors: {
    light: {
      primary: '#012169',
      primaryHover: '#001A54',
      primaryLight: '#4A5A8A',
      secondary: '#C8102E',
      secondaryHover: '#A00D25',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#E8EAF0',
      text: '#1A1A1A',
      textSecondary: '#424242',
      textMuted: '#757575',
      border: '#E0E0E0',
      borderHover: '#012169',
      success: '#10B981',
      error: '#C8102E',
      warning: '#F59E0B',
      info: '#012169',
      accent: '#C8102E',
      accentLight: '#F5B7B1',
    },
    dark: {
      primary: '#4A5A8A',
      primaryHover: '#6A7AAA',
      primaryLight: '#8A9ACA',
      secondary: '#E74C3C',
      secondaryHover: '#EC7063',
      background: '#0D1117',
      backgroundSecondary: '#161B22',
      backgroundTertiary: '#21262D',
      text: '#F5F5F5',
      textSecondary: '#E0E0E0',
      textMuted: '#9E9E9E',
      border: '#21262D',
      borderHover: '#4A5A8A',
      success: '#34D399',
      error: '#E74C3C',
      warning: '#FBBF24',
      info: '#4A5A8A',
      accent: '#E74C3C',
      accentLight: '#FADBD8',
    },
  },
};

// Thème Italien (Vert-Blanc-Rouge)
const italianTheme: Theme = {
  name: 'Italiano',
  emoji: '🇮🇹',
  description: 'Ispirato ai colori italiani',
  colors: {
    light: {
      primary: '#009246',
      primaryHover: '#007A3D',
      primaryLight: '#4CAF50',
      secondary: '#CE2B37',
      secondaryHover: '#B8252F',
      background: '#FFFFFF',
      backgroundSecondary: '#F8F9FA',
      backgroundTertiary: '#E8F5E9',
      text: '#1A1A1A',
      textSecondary: '#424242',
      textMuted: '#757575',
      border: '#E0E0E0',
      borderHover: '#009246',
      success: '#009246',
      error: '#CE2B37',
      warning: '#F59E0B',
      info: '#2196F3',
      accent: '#CE2B37',
      accentLight: '#FFCDD2',
    },
    dark: {
      primary: '#4CAF50',
      primaryHover: '#66BB6A',
      primaryLight: '#81C784',
      secondary: '#EF5350',
      secondaryHover: '#E57373',
      background: '#0A1612',
      backgroundSecondary: '#1A2622',
      backgroundTertiary: '#2A3632',
      text: '#F5F5F5',
      textSecondary: '#E0E0E0',
      textMuted: '#9E9E9E',
      border: '#2A3632',
      borderHover: '#4CAF50',
      success: '#66BB6A',
      error: '#EF5350',
      warning: '#FBBF24',
      info: '#42A5F5',
      accent: '#EF5350',
      accentLight: '#FFCDD2',
    },
  },
};

// Thème Espagnol (Rouge-Jaune)
const spanishTheme: Theme = {
  name: 'Español',
  emoji: '🇪🇸',
  description: 'Inspirado en los colores españoles',
  colors: {
    light: {
      primary: '#C60B1E',
      primaryHover: '#A00916',
      primaryLight: '#E74C3C',
      secondary: '#FFC400',
      secondaryHover: '#FFB300',
      background: '#FFFFFF',
      backgroundSecondary: '#FFFBF0',
      backgroundTertiary: '#FFF3E0',
      text: '#1A1A1A',
      textSecondary: '#424242',
      textMuted: '#757575',
      border: '#FFE0B2',
      borderHover: '#C60B1E',
      success: '#10B981',
      error: '#C60B1E',
      warning: '#FFC400',
      info: '#2196F3',
      accent: '#FFC400',
      accentLight: '#FFECB3',
    },
    dark: {
      primary: '#E74C3C',
      primaryHover: '#EC7063',
      primaryLight: '#F1948A',
      secondary: '#FFD54F',
      secondaryHover: '#FFE082',
      background: '#1A0A0A',
      backgroundSecondary: '#2A1A1A',
      backgroundTertiary: '#3A2A2A',
      text: '#F5F5F5',
      textSecondary: '#E0E0E0',
      textMuted: '#9E9E9E',
      border: '#3A2A2A',
      borderHover: '#E74C3C',
      success: '#34D399',
      error: '#E74C3C',
      warning: '#FFD54F',
      info: '#42A5F5',
      accent: '#FFD54F',
      accentLight: '#FFF9C4',
    },
  },
};

// Thème Portugais (Vert-Rouge)
const portugueseTheme: Theme = {
  name: 'Português',
  emoji: '🇵🇹',
  description: 'Inspirado nas cores de Portugal',
  colors: {
    light: {
      primary: '#006600',       // Vert drapeau
      primaryHover: '#004d00',
      primaryLight: '#4d9900',
      secondary: '#FF0000',     // Rouge drapeau
      secondaryHover: '#cc0000',
      background: '#FFFFFF',
      backgroundSecondary: '#F5FFF5',
      backgroundTertiary: '#E8F5E9',
      text: '#1A1A1A',
      textSecondary: '#424242',
      textMuted: '#757575',
      border: '#C8E6C9',
      borderHover: '#006600',
      success: '#006600',
      error: '#FF0000',
      warning: '#FBC02D',
      info: '#1976D2',
      accent: '#FFD700',        // Jaune sphère armillaire
      accentLight: '#FFF9C4',
    },
    dark: {
      primary: '#43A047',
      primaryHover: '#66BB6A',
      primaryLight: '#81C784',
      secondary: '#E53935',
      secondaryHover: '#EF5350',
      background: '#0D1A0D',
      backgroundSecondary: '#142614',
      backgroundTertiary: '#1E331E',
      text: '#F5F5F5',
      textSecondary: '#E0E0E0',
      textMuted: '#9E9E9E',
      border: '#1E331E',
      borderHover: '#43A047',
      success: '#43A047',
      error: '#E53935',
      warning: '#FBC02D',
      info: '#42A5F5',
      accent: '#FFD700',
      accentLight: '#FFF9C4',
    },
  },
};

// Thème Allemand (Noir-Rouge-Or)
const germanTheme: Theme = {
  name: 'Deutsch',
  emoji: '🇩🇪',
  description: 'Inspiré des couleurs de l\'Allemagne',
  colors: {
    light: {
      primary: '#DD0000',       // Rouge drapeau
      primaryHover: '#B30000',
      primaryLight: '#FF4D4D',
      secondary: '#FFCC00',     // Or drapeau
      secondaryHover: '#E6B800',
      background: '#FFFFFF',
      backgroundSecondary: '#FFFDF5', // Très léger jaune
      backgroundTertiary: '#F5F5F5',
      text: '#000000',
      textSecondary: '#333333',
      textMuted: '#666666',
      border: '#E0E0E0',
      borderHover: '#000000',
      success: '#10B981',
      error: '#DD0000',
      warning: '#FFCC00',
      info: '#2196F3',
      accent: '#000000',        // Noir drapeau
      accentLight: '#484848',
    },
    dark: {
      primary: '#FFCC00',       // Or (plus lisible sur fond noir)
      primaryHover: '#FFE066',
      primaryLight: '#FFF0B3',
      secondary: '#FF4D4D',
      secondaryHover: '#FF8080',
      background: '#121212',
      backgroundSecondary: '#1E1E1E',
      backgroundTertiary: '#2C2C2C',
      text: '#FFFFFF',
      textSecondary: '#E0E0E0',
      textMuted: '#AAAAAA',
      border: '#333333',
      borderHover: '#FFCC00',
      success: '#34D399',
      error: '#FF6B6B',
      warning: '#FFCC00',
      info: '#42A5F5',
      accent: '#FF4D4D',
      accentLight: '#FF8080',
    },
  },
};

// Thème Russe (Blanc-Bleu-Rouge)
const russianTheme: Theme = {
  name: 'Pусский',
  emoji: '🇷🇺',
  description: 'Inspiré des couleurs de la Russie',
  colors: {
    light: {
      primary: '#0039A6',       // Bleu drapeau
      primaryHover: '#002D80',
      primaryLight: '#4D7CC9',
      secondary: '#D52B1E',     // Rouge drapeau
      secondaryHover: '#B02218',
      background: '#FFFFFF',
      backgroundSecondary: '#F5F9FF',
      backgroundTertiary: '#E8F1FA',
      text: '#1A1A1A',
      textSecondary: '#424242',
      textMuted: '#757575',
      border: '#E0E0E0',
      borderHover: '#0039A6',
      success: '#10B981',
      error: '#D52B1E',
      warning: '#F59E0B',
      info: '#0039A6',
      accent: '#D52B1E',
      accentLight: '#FFB3B3',
    },
    dark: {
      primary: '#4D7CC9',
      primaryHover: '#799FDF',
      primaryLight: '#A6C2EA',
      secondary: '#FF6B6B',
      secondaryHover: '#FF8787',
      background: '#0A1929',
      backgroundSecondary: '#152335',
      backgroundTertiary: '#202E42',
      text: '#F5F5F5',
      textSecondary: '#E0E0E0',
      textMuted: '#9E9E9E',
      border: '#202E42',
      borderHover: '#4D7CC9',
      success: '#34D399',
      error: '#FF6B6B',
      warning: '#FBBF24',
      info: '#4D7CC9',
      accent: '#FF6B6B',
      accentLight: '#FFCCCB',
    },
  },
};

// Thème Apple (style macOS/iOS)
const appleTheme: Theme = {
  name: 'Apple',
  emoji: '🍎',
  description: 'Design épuré style Apple',
  colors: {
    light: {
      primary: '#1D1D1F',
      primaryHover: '#000000',
      primaryLight: '#86868B',
      secondary: '#86868B',
      secondaryHover: '#6E6E73',
      background: '#F5F5F7',
      backgroundSecondary: '#FFFFFF',
      backgroundTertiary: 'rgba(255, 255, 255, 0.72)',
      text: '#1D1D1F',
      textSecondary: '#424245',
      textMuted: '#86868B',
      border: '#D2D2D7',
      borderHover: '#000000',
      success: '#28CD41',
      error: '#FF3B30',
      warning: '#FF9500',
      info: '#007AFF',
      accent: '#000000',
      accentLight: '#424245',
    },
    dark: {
      primary: '#0A84FF',
      primaryHover: '#409CFF',
      primaryLight: '#64A8FF',
      secondary: '#98989D',
      secondaryHover: '#AEAEB2',
      background: '#000000',
      backgroundSecondary: '#1C1C1E',
      backgroundTertiary: '#2C2C2E',
      text: '#FFFFFF',
      textSecondary: '#EBEBF5',
      textMuted: '#98989D',
      border: '#38383A',
      borderHover: '#0A84FF',
      success: '#30D158',
      error: '#FF453A',
      warning: '#FF9F0A',
      info: '#0A84FF',
      accent: '#5E5CE6',
      accentLight: '#BF5AF2',
    },
  },
};

// Thème Polonais (Blanc-Rouge)
const polishTheme: Theme = {
  name: 'Polski',
  emoji: '🇵🇱',
  description: 'Inspirowany kolorami Polski',
  colors: {
    light: {
      primary: '#DC143C',       // Rouge drapeau (crimson)
      primaryHover: '#B8102E',
      primaryLight: '#FF6B6B',
      secondary: '#FFFFFF',     // Blanc drapeau
      secondaryHover: '#F5F5F5',
      background: '#FFFFFF',
      backgroundSecondary: '#FFF5F5',
      backgroundTertiary: '#FFE8E8',
      text: '#1A1A1A',
      textSecondary: '#424242',
      textMuted: '#757575',
      border: '#FFD6D6',
      borderHover: '#DC143C',
      success: '#10B981',
      error: '#DC143C',
      warning: '#F59E0B',
      info: '#2196F3',
      accent: '#DC143C',
      accentLight: '#FFB3B3',
    },
    dark: {
      primary: '#FF6B6B',
      primaryHover: '#FF8787',
      primaryLight: '#FFA3A3',
      secondary: '#E0E0E0',
      secondaryHover: '#F5F5F5',
      background: '#1A0A0A',
      backgroundSecondary: '#2A1515',
      backgroundTertiary: '#3A2020',
      text: '#F5F5F5',
      textSecondary: '#E0E0E0',
      textMuted: '#9E9E9E',
      border: '#3A2020',
      borderHover: '#FF6B6B',
      success: '#34D399',
      error: '#FF6B6B',
      warning: '#FBBF24',
      info: '#42A5F5',
      accent: '#FF6B6B',
      accentLight: '#FFCCCB',
    },
  },
};

// Thème Test: Slate (SaaS Moderne)
const slateTheme: Theme = {
  name: 'Modern Slate',
  emoji: '🪨',
  description: 'Fond grisé/bleuté ultra-doux (Look Premium SaaS)',
  colors: {
    ...classicTheme.colors,
    light: {
      ...classicTheme.colors.light,
      background: '#F8FAFC',
      backgroundSecondary: '#F1F5F9',
      backgroundTertiary: '#E2E8F0',
    }
  }
};

// Thème Test: Warm (Chaleureux & Naturel)
const warmTheme: Theme = {
  name: 'Warm Ivory',
  emoji: '☕',
  description: 'Fond blanc cassé chaud, idéal pour la concentration',
  colors: {
    ...classicTheme.colors,
    light: {
      ...classicTheme.colors.light,
      background: '#FCFDF8',
      backgroundSecondary: '#F5F6F0',
      backgroundTertiary: '#EAEBDB',
    }
  }
};

// Thème Opal (Nouveau Défaut)
const defaultTheme: Theme = {
  name: 'Opal Glass (Défaut)',
  emoji: '✨',
  description: 'Fond très subtilement teinté d\'indigo/lavande',
  colors: {
    ...classicTheme.colors,
    light: {
      ...classicTheme.colors.light,
      background: '#F5F7FF',
      backgroundSecondary: '#EBEDFA',
      backgroundTertiary: '#DFE3F2',
    }
  }
};

export type ThemeStyle = 'default' | 'classic' | 'french' | 'english' | 'italian' | 'spanish' | 'portuguese' | 'german' | 'russian' | 'polish' | 'apple' | 'slate' | 'warm';
  
  export const THEMES: Record<ThemeStyle, Theme> = {
    default: defaultTheme,
    classic: classicTheme,
    french: frenchTheme,
    english: englishTheme,
    italian: italianTheme,
    spanish: spanishTheme,
    portuguese: portugueseTheme,
    german: germanTheme,
    russian: russianTheme,
    polish: polishTheme,
    apple: appleTheme,
    slate: slateTheme,
    warm: warmTheme,
  };
  
  export const THEME_STYLES: ThemeStyle[] = ['default', 'classic', 'slate', 'warm', 'apple', 'french', 'english', 'italian', 'spanish', 'portuguese', 'german', 'russian', 'polish'];
 
 export const getThemeGradient = (style: ThemeStyle, mode: ThemeMode): string => {
   const isDark = mode === 'dark'; 
   
   switch (style) {
     case 'french':
       return isDark
         ? 'linear-gradient(135deg, #4285F4 0%, #FFFFFF 50%, #EA4335 100%)' // Bleu -> Blanc -> Rouge (Mode Sombre)
         : 'linear-gradient(135deg, #0055A4 0%, #9CA3AF 50%, #EF4135 100%)'; // Bleu -> Gris (pour lisibilité) -> Rouge (Mode Clair)
     case 'italian':
       return 'linear-gradient(135deg, #009246 0%, #CE2B37 100%)';
     case 'spanish':
       return 'linear-gradient(135deg, #AA151B 0%, #F1BF00 100%)';
     case 'portuguese':
       return 'linear-gradient(135deg, #006600 0%, #FF0000 100%)';
     case 'german':
        return 'linear-gradient(135deg, #000000 0%, #DD0000 50%, #FFCC00 100%)';
     case 'russian':
        // Blanc-Bleu-Rouge
        return isDark
            ? 'linear-gradient(135deg, #FFFFFF 0%, #4D7CC9 50%, #FF6B6B 100%)'
            : 'linear-gradient(135deg, #FFFFFF 0%, #0039A6 50%, #D52B1E 100%)';
     case 'english':
       return isDark
         ? 'linear-gradient(135deg, #60A5FA 0%, #F87171 100%)' // Bleu clair vers Rouge clair (Mode Sombre)
         : 'linear-gradient(135deg, #012169 0%, #C8102E 100%)'; // Bleu marine vers Rouge (Mode Clair)
     case 'polish':
       // Blanc-Rouge (drapeau polonais)
       return isDark
         ? 'linear-gradient(135deg, #F5F5F5 0%, #FF6B6B 100%)'
         : 'linear-gradient(135deg, #FFFFFF 0%, #DC143C 100%)';
     case 'apple':
      return isDark 
        ? 'linear-gradient(135deg, #1D1D1F 0%, #000000 100%)' 
        : 'linear-gradient(135deg, #FFFFFF 0%, #E8E8ED 100%)'; 
     default:
       const themeColors = THEMES['classic'].colors[isDark ? 'dark' : 'light'];
       return `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.accent} 100%)`;
   }
 };
