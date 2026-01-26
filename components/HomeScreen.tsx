
import { ThemeMode, ThemeStyle, THEMES } from '../constants/themes';
import { useTranslation } from '../contexts/LanguageContext';

interface HomeScreenProps {
    streak: number;
    dueCardsCount: number;
    totalCards: number;
    onNavigateToQuiz: () => void;
    onNavigateToSRS: () => void;
    onNavigateToAIGenerator: () => void;
    onNavigateToTutorsRoom: () => void;
    onNavigateToConjugator: () => void;
    onNavigateToDashboard: () => void;
    onNavigateToSettings: () => void;
    onNavigateToCurriculum: () => void;
    onNavigateToKnowledgeMap: () => void;
    onNavigateToLibrary: () => void;
    onNavigateToVideoLab: () => void;
    onNavigateToChat: () => void;
    onNavigateToLanguageLab: () => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
    onThemeModeChange: (mode: ThemeMode) => void;
    onThemeStyleChange: (style: ThemeStyle) => void;
    onShowHelp: () => void;
    onOpenAuth: () => void;
    user: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
    streak,
    dueCardsCount,
    totalCards,
    onNavigateToQuiz,
    onNavigateToSRS,
    onNavigateToAIGenerator,
    onNavigateToTutorsRoom,
    onNavigateToConjugator,
    onNavigateToDashboard,
    onNavigateToSettings,
    onNavigateToCurriculum,
    onNavigateToKnowledgeMap,
    onNavigateToLibrary,
    onNavigateToVideoLab,
    onNavigateToChat,
    onNavigateToLanguageLab,
    themeMode,
    themeStyle,
    onThemeModeChange,
    onThemeStyleChange,
    onShowHelp,
    onOpenAuth,
    user
}) => {
    const { t, language, setLanguage } = useTranslation();

    // Récupération du thème actif pour le style dynamique
    const activeTheme = THEMES[themeStyle] || THEMES.default;
    const themeColors = activeTheme.colors[themeMode === 'dark' ? 'dark' : 'light'];
    
    // Création d'un gradient dynamique basé sur le thème
    const brandGradient = themeStyle === 'french' ? 'linear-gradient(to right, #0055A4, #ffffff, #EF4135)' :
                          themeStyle === 'italian' ? 'linear-gradient(to right, #009246, #ffffff, #CE2B37)' :
                          themeStyle === 'spanish' ? 'linear-gradient(to right, #AA151B, #F1BF00, #AA151B)' :
                          themeStyle === 'english' ? 'linear-gradient(to right, #012169, #C8102E)' :
                                                    themeStyle === 'apple' ? 'linear-gradient(to right, #1D1D1F, #86868B)' :
                          `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary || themeColors.primary})`;

    const Section = ({ title, icon, children }: { title: string, icon: string, children: React.ReactNode }) => (
        <div 
            className={`flex flex-col gap-3 md:gap-5 flex-1 p-4 md:p-6 rounded-3xl border shadow-sm transition-all duration-300 ${themeStyle === 'apple' ? 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl' : 'bg-white dark:bg-gray-800'}`}
            style={{ 
                borderColor: `${themeColors.primary}30`,
                boxShadow: `0 4px 20px -8px ${themeColors.primary}20`
            }}
        >
            <h3 className={`text-sm font-black flex items-center gap-2 uppercase tracking-widest`} style={{ color: themeColors.primary }}>
                <span className="text-xl filter drop-shadow-sm">{icon}</span> {title}
            </h3>
            <div className="grid gap-4 grid-cols-1 flex-1 content-start">
                {children}
            </div>
        </div>
    );

    const FeatureCard = ({ 
        icon, 
        title, 
        desc, 
        onClick, 
        colorClass, 
        badge 
    }: { 
        icon: string, 
        title: string, 
        desc: string, 
        onClick: () => void, 
        colorClass: string,
        badge?: string | number
    }) => (
        <button
            onClick={onClick}
            className={`group relative overflow-hidden rounded-2xl p-2.5 md:p-3 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border border-transparent hover:border-border/50 w-full shadow-sm flex flex-col justify-center flex-1 min-h-[80px] md:min-h-[110px] ${themeStyle === 'apple' ? 'bg-white/40 dark:bg-gray-800/40 backdrop-blur-md' : 'bg-gray-50/50 dark:bg-gray-700/50'}`}
        >
            <div className="relative z-10 flex items-center gap-3">
                <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-2xl md:text-3xl shadow-inner ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">{title}</h4>
                        {badge !== undefined && (
                            <span 
                                className={`ml-2 px-2.5 py-1 rounded-full text-xs font-black shadow-sm text-white animate-pulse`}
                                style={{ backgroundColor: themeColors.primary }}
                            >
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                </div>
                
                <div className="group-hover:translate-x-1 transition-all" style={{ color: themeColors.primary }}>
                    <i className="fas fa-chevron-right"></i>
                </div>
            </div>
        </button>
    );

    return (
        <div 
            className="flex-1 min-h-0 overflow-y-auto p-4 pb-20 w-full mx-auto transition-colors duration-500"
            style={{ 
                background: `linear-gradient(135deg, ${themeColors.background} 0%, ${themeColors.backgroundSecondary} 100%)`
            }}
        >
            {/* Header */}
            <div className="relative mb-4 py-2">
                <div className="text-center w-full">
                    <h1 
                        className="text-3xl sm:text-5xl md:text-7xl font-black mb-0 tracking-tighter drop-shadow-sm filter bg-clip-text text-transparent"
                        style={{ 
                            backgroundImage: brandGradient,
                            backgroundSize: '200% auto',
                        }}
                    >
                        Studeo
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs md:text-lg font-medium tracking-wide">
                        {themeStyle === 'french' && "L'outil pour tout apprendre"}
                        {themeStyle === 'english' && "The tool to learn everything"}
                        {themeStyle === 'spanish' && "La herramienta para aprender todo"}
                        {themeStyle === 'italian' && "Lo strumento per imparare tutto"}
                        {themeStyle === 'german' && "Das Werkzeug, um alles zu lernen"}
                        {themeStyle === 'russian' && "Инструмент, чтобы выучить все"}
                        {themeStyle !== 'french' && themeStyle !== 'english' && themeStyle !== 'spanish' && themeStyle !== 'italian' && themeStyle !== 'german' && themeStyle !== 'russian' && "L'outil pour tout apprendre"}
                    </p>
                </div>

                {/* Zone des Contrôles (Haut de page) */}
                <div className="flex flex-col md:absolute top-0 right-0 items-center md:items-end gap-3 p-2 mb-4 md:mb-0">
                    <div className="flex flex-wrap justify-center items-center gap-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                        <select 
                            value={themeStyle}
                            onChange={(e) => onThemeStyleChange(e.target.value as ThemeStyle)}
                            className="bg-transparent text-[10px] md:text-xs font-black outline-none cursor-pointer appearance-none px-2 py-1 text-center md:text-right hover:opacity-80 transition-opacity"
                            style={{ color: themeColors.primary }}
                        >
                            <option value="default">🎨 {window.innerWidth < 640 ? '' : 'Défaut'}</option>
                            <option value="french">🇫🇷 {window.innerWidth < 640 ? '' : 'France'}</option>
                            <option value="english">🇬🇧 {window.innerWidth < 640 ? '' : 'English'}</option>
                            <option value="spanish">🇪🇸 {window.innerWidth < 640 ? '' : 'España'}</option>
                            <option value="italian">🇮🇹 {window.innerWidth < 640 ? '' : 'Italia'}</option>
                            <option value="german">🇩🇪 {window.innerWidth < 640 ? '' : 'Deutsch'}</option>
                            <option value="russian">🇷🇺 {window.innerWidth < 640 ? '' : 'Pусский'}</option>
                            <option value="apple">🍎 {window.innerWidth < 640 ? '' : 'Apple'}</option>
                        </select>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5"></div>
                         <div className="flex bg-gray-100/50 dark:bg-gray-700/50 rounded-xl p-0.5">
                             <button 
                                onClick={() => setLanguage('fr')} 
                                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${language === 'fr' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-400'}`}
                                style={language === 'fr' ? { color: themeColors.primary } : {}}
                             >FR</button>
                             <button 
                                onClick={() => setLanguage('en')} 
                                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${language === 'en' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-400'}`}
                                style={language === 'en' ? { color: themeColors.primary } : {}}
                             >EN</button>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-2">
                        <div 
                            className="flex items-center gap-1.5 px-3 py-1.5 text-white shadow-md rounded-xl text-[10px] font-black"
                            style={{ backgroundColor: themeColors.primary }}
                        >
                            <i className="fas fa-fire"></i> {streak}
                        </div>
                        
                        <button 
                            onClick={onOpenAuth} 
                            className={`p-2 rounded-xl shadow-sm transition-all flex items-center gap-2 px-3 ${user ? 'bg-success/10 text-success border border-success/20' : 'bg-white/60 dark:bg-gray-800/60 text-gray-400 hover:text-primary'}`}
                            title="Synchronisation Cloud"
                        >
                            <i className={`fas ${user ? 'fa-cloud-check' : 'fa-cloud-upload-alt'}`}></i>
                            {user && <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Synchro ON</span>}
                        </button>

                        <button 
                            onClick={() => onThemeModeChange(themeMode === 'dark' ? 'light' : 'dark')} 
                            className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl shadow-sm text-gray-400 hover:text-primary transition-colors"
                        >
                            <i className={`fas fa-${themeMode === 'dark' ? 'sun' : 'moon'}`}></i>
                        </button>

                        <button 
                            onClick={onShowHelp} 
                            className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl shadow-sm text-gray-400 hover:text-primary transition-colors"
                        >
                            <i className="fas fa-question-circle"></i>
                        </button>

                        <button 
                            onClick={onNavigateToSettings} 
                            className="p-2 bg-white/60 dark:bg-gray-800/60 rounded-xl shadow-sm text-gray-400 hover:text-primary transition-colors"
                        >
                            <i className="fas fa-cog"></i>
                        </button>
                    </div>
                </div>

            </div>

            {/* GRILLE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                
                {/* COLONNE GAUCHE (Labo IA + Bibliothèque) */}
                <div className="flex flex-col gap-6 md:gap-8">
                    <Section title={t('home.sections.aiLab')} icon="⚡️">
                        <FeatureCard icon="✨" title={t('home.features.aiGenerator.title')} desc={t('home.features.aiGenerator.description')} onClick={onNavigateToAIGenerator} colorClass="bg-primary/10 text-primary"/>
                        <FeatureCard icon="💬" title={t('home.features.chat.title')} desc={t('home.features.chat.description')} onClick={onNavigateToChat} colorClass="bg-accent/10 text-accent"/>
                        <FeatureCard icon="👨‍🏫" title={t('home.features.tutorsRoom.title')} desc={t('home.features.tutorsRoom.description')} onClick={onNavigateToTutorsRoom} colorClass="bg-primary/10 text-primary"/>
                    </Section>
 
                    <Section title={t('home.sections.library')} icon="📚">
                        <FeatureCard icon="🧠" title={t('home.features.srs.title')} desc={t('home.cardsToReview', { count: dueCardsCount })} onClick={onNavigateToSRS} colorClass="bg-warning/10 text-warning" badge={dueCardsCount}/>
                        <FeatureCard icon="📂" title={t('home.features.library.title')} desc={`${t('home.totalCards', { count: totalCards })} (${language.toUpperCase()})`} onClick={onNavigateToLibrary} colorClass="bg-info/10 text-info"/>
                        <FeatureCard icon="🗺️" title={t('home.features.curriculum.title')} desc={t('home.features.curriculum.description')} onClick={onNavigateToCurriculum} colorClass="bg-info/10 text-info"/>
                    </Section>
                </div>
 
                {/* COLONNE DROITE (Zone Entraînement + Analyse) */}
                <div className="flex flex-col gap-6 md:gap-8">
                     <Section title={t('home.sections.training')} icon="🎯">
                        <FeatureCard icon="📝" title={t('home.features.quiz.title')} desc={t('home.features.quiz.description')} onClick={onNavigateToQuiz} colorClass="bg-success/10 text-success"/>
                        <FeatureCard icon="🔤" title={t('home.features.conjugator.title')} desc={t('home.features.conjugator.description')} onClick={onNavigateToConjugator} colorClass="bg-info/10 text-info"/>
                        <FeatureCard icon="🗣️" title={t('home.features.languageLab.title')} desc={t('home.features.languageLab.description')} onClick={onNavigateToLanguageLab} colorClass="bg-accent/10 text-accent"/>
                    </Section>
 
                    <Section title={t('home.sections.analysis')} icon="🔭">
                         <FeatureCard icon="📊" title={t('home.features.stats.title')} desc={t('home.features.stats.description')} onClick={onNavigateToDashboard} colorClass="bg-primary/10 text-primary"/>
                        <FeatureCard icon="🌌" title={t('home.features.knowledgeMap.title')} desc={t('home.features.knowledgeMap.description')} onClick={onNavigateToKnowledgeMap} colorClass="bg-accent/10 text-accent"/>
                        <FeatureCard icon="🎥" title={t('home.features.videoLearning.title')} desc={t('home.features.videoLearning.description')} onClick={onNavigateToVideoLab} colorClass="bg-error/10 text-error"/>
                    </Section>
                </div>
            </div>
            
             <div className="text-center text-[10px] mt-4 pb-2 font-mono uppercase tracking-widest opacity-30" style={{ color: themeColors.text }}>
                Studeo v2.4.0
            </div>
        </div>
    );
};
