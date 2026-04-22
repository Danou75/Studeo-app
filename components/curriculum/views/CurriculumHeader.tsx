import { Tutor } from '../../../types';
import { Button } from '../../ui/Button';
import { getThemeGradient } from '../../../constants/themes';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from '../../../contexts/LanguageContext';

interface CurriculumHeaderProps {
    onBack: () => void;
    onNavigateToSettings?: () => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    onNewProgram?: () => void;
    selectedTutorId: string | null;
    setSelectedTutorId: (id: string | null) => void;
    tutorsWithContent: Tutor[];
}

export const CurriculumHeader: React.FC<CurriculumHeaderProps> = ({
    onBack,
    onNavigateToSettings,
    viewMode,
    setViewMode,
    onNewProgram,
    selectedTutorId,
    setSelectedTutorId,
    tutorsWithContent
}) => {
    const { t } = useTranslation();
    const { themeMode, themeStyle } = useTheme();

    return (
        <div 
            className={`transition-all duration-500 pt-safe p-3 md:p-6 shadow-lg relative overflow-hidden shrink-0 group ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
            style={{ background: getThemeGradient(themeStyle, themeMode) }}
        >
            {onNavigateToSettings && (
                <button 
                    onClick={onNavigateToSettings}
                    className="hidden sm:block absolute bottom-4 right-6 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 hover:bg-white/10 rounded-xl"
                    title="Paramètres de l'IA"
                >
                    <i className="fas fa-cog text-inherit"></i>
                </button>
            )}
            
            <div className="relative z-20 flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        onClick={onBack} 
                        size="sm" 
                        className={`transition-all w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                    >
                        <i className="fas fa-chevron-left mr-1 sm:mr-2 text-inherit"></i> <span className="hidden sm:inline">Retour</span>
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={() => window.location.hash = '#/'} 
                        size="sm" 
                        className={`transition-all w-fit hidden sm:flex ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                    >
                        <i className="fas fa-home mr-2 text-inherit"></i> Accueil
                    </Button>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-black/10 dark:bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-inherit opacity-50 hover:opacity-100'}`}
                        title="Vue Grille"
                    >
                        <i className="fas fa-th-large text-xs"></i>
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 text-primary shadow-sm' : 'text-inherit opacity-50 hover:opacity-100'}`}
                        title="Vue Liste"
                    >
                        <i className="fas fa-list text-xs"></i>
                    </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {onNewProgram && (
                        <Button 
                            variant="secondary"
                            onClick={onNewProgram} 
                            size="sm" 
                            className={`transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm font-bold shadow-lg transform hover:scale-105 active:scale-95`}
                        >
                            <i className="fas fa-plus mr-1 sm:mr-2"></i> <span className="hidden sm:inline">{t('curriculum.new')}</span><span className="inline sm:hidden">Nouveau</span>
                        </Button>
                    )}
                    {onNavigateToSettings && (
                        <button 
                            onClick={onNavigateToSettings}
                            className={`sm:hidden p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center w-8 h-8 ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white backdrop-blur-sm shadow-md'}`}
                            title="Paramètres de l'IA"
                        >
                            <i className="fas fa-cog text-inherit"></i>
                        </button>
                    )}
                </div>
            </div>

            <div className="relative z-10 flex flex-col">
                <h1 className="text-2xl md:text-3xl font-black drop-shadow-sm flex items-center gap-3 text-inherit">
                    <span className="text-2xl md:text-3xl text-inherit">🗺️</span> {t('curriculum.title')}
                </h1>
                <p className="opacity-80 mt-1 text-base text-inherit">{t('curriculum.subtitle')}</p>
            </div>

            {/* Tutor Filter Dropdown */}
            {tutorsWithContent.length > 0 && (
                <div className="relative z-20 mt-4 sm:mt-6 flex items-center gap-2 sm:gap-3">
                    <div className="relative w-fit sm:max-w-xs">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                            <i className="fas fa-filter text-xs"></i>
                        </div>
                        <select
                            value={selectedTutorId || ''}
                            onChange={(e) => setSelectedTutorId(e.target.value || null)}
                            className={`w-full pl-9 pr-10 py-2.5 text-sm font-bold rounded-xl border appearance-none cursor-pointer transition-all outline-none focus:ring-2 focus:ring-white/20 ${
                                themeStyle === 'apple' && themeMode === 'light'
                                    ? 'bg-black/5 text-primary border-black/10'
                                    : 'bg-white/10 text-white border-white/20 backdrop-blur-sm'
                            }`}
                            translate="no"
                        >
                            <option value="">👤 {t('library.allTeachers') || t('curriculum.allTeachers') || t('common.all')}</option>
                            {tutorsWithContent.map(tutor => (
                                <option key={tutor.id} value={tutor.id}>
                                    {tutor.emoji} {tutor.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                            <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                    </div>
                    
                    {selectedTutorId && (
                        <button
                            onClick={() => setSelectedTutorId(null)}
                            className={`p-2.5 rounded-xl border transition-all hover:bg-white/10 active:scale-95 ${
                                themeStyle === 'apple' && themeMode === 'light'
                                    ? 'bg-black/5 text-primary border-black/10'
                                    : 'bg-white/10 text-white border-white/20 backdrop-blur-sm'
                            }`}
                            title="Effacer le filtre"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
