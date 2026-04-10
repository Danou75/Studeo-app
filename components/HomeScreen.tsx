
import { ThemeMode, ThemeStyle, THEMES } from '../constants/themes';
import { useTranslation } from '../contexts/LanguageContext';

interface HomeScreenProps {
    streak: number;
    dueCardsCount: number;
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
    flashcardSets: Record<string, any[]>;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
    onThemeModeChange: (mode: ThemeMode) => void;
    onThemeStyleChange: (style: ThemeStyle) => void;
    onShowHelp: () => void;
    onOpenAuth: () => void;
    onSyncPush?: () => void;
    cloudStatus?: 'idle' | 'syncing' | 'synced' | 'error';
    user: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
    streak,
    dueCardsCount,
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
    flashcardSets,
    themeMode,
    themeStyle,
    onThemeModeChange,
    onThemeStyleChange: _onThemeStyleChange,
    onShowHelp,
    onOpenAuth,
    onSyncPush,
    cloudStatus,
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

    const Section = ({ title, icon, children, color = themeColors.primary }: { title: string, icon: string, children: React.ReactNode, color?: string }) => (
        <div 
            className={`flex flex-col gap-2 sm:gap-3 md:gap-5 flex-1 p-3 sm:p-4 md:p-6 rounded-2xl md:rounded-3xl border shadow-sm transition-all duration-300 ${themeStyle === 'apple' ? 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl' : 'bg-white dark:bg-gray-800'}`}
            style={{ 
                borderColor: `${color}30`,
                boxShadow: `0 4px 20px -8px ${color}20`
            }}
        >
            <h3 className={`text-[10px] sm:text-xs font-black flex items-center gap-1.5 uppercase tracking-widest`} style={{ color: color }}>
                <span className="text-base sm:text-xl filter drop-shadow-sm">{icon}</span> {title}
            </h3>
            <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 flex-1 content-start">
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
            className={`group relative overflow-hidden rounded-2xl p-2.5 md:p-3 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border border-transparent hover:border-border/50 w-full shadow-sm flex flex-col justify-center flex-1 min-h-[64px] md:min-h-[96px] active:scale-[0.98] ${themeStyle === 'apple' ? 'bg-white/40 dark:bg-gray-800/40 backdrop-blur-md' : 'bg-gray-50/50 dark:bg-gray-700/50'}`}
        >
            <div className="relative z-10 flex items-center gap-2.5 md:gap-3">
                <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-xl sm:text-2xl md:text-3xl shadow-inner flex-shrink-0 ${colorClass} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-extrabold text-sm sm:text-base md:text-lg text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors leading-tight">{title}</h4>
                        {badge !== undefined && (
                            <span 
                                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-black shadow-sm text-white animate-pulse flex-shrink-0`}
                                style={{ backgroundColor: themeColors.primary }}
                            >
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">{desc}</p>
                </div>
                
                <div className="group-hover:translate-x-1 transition-all flex-shrink-0 opacity-40 group-hover:opacity-100" style={{ color: themeColors.primary }}>
                    <i className="fas fa-chevron-right text-xs"></i>
                </div>
            </div>
        </button>
    );

    return (
        <div 
            className="flex-1 min-h-0 overflow-y-auto pt-safe p-3 sm:p-4 pb-20 w-full mx-auto transition-colors duration-500"
        >
            {/* Header / Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-6 md:mb-8 pt-1">
                {/* Logo & Slogan */}
                <div className="text-left w-full sm:flex-1 sm:min-w-0">
                    <h1 
                        className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter drop-shadow-sm filter bg-clip-text text-transparent"
                        style={{ 
                            backgroundImage: brandGradient,
                            backgroundSize: '200% auto',
                            lineHeight: 1.1,
                        }}
                    >
                        Studeo
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-[10px] md:text-xs font-medium tracking-wide mt-0.5">
                        {themeStyle === 'french' && "L'outil pour tout apprendre"}
                        {themeStyle === 'english' && "The tool to learn everything"}
                        {themeStyle === 'spanish' && "La herramienta para apprendre tout"}
                        {themeStyle === 'italian' && "Lo strumento per imparare tutto"}
                        {themeStyle === 'german' && "Das Werkzeug, um alles zu lernen"}
                        {themeStyle === 'russian' && "Инструмент, чтобы выучить все"}
                        {themeStyle !== 'french' && themeStyle !== 'english' && themeStyle !== 'spanish' && themeStyle !== 'italian' && themeStyle !== 'german' && themeStyle !== 'russian' && "L'outil pour tout apprendre"}
                    </p>
                </div>

                {/* Zone des Contrôles — ligne complète sur mobile, alignée à droite sur sm+ */}
                <div className="flex items-center gap-1.5 flex-shrink-0 z-30 flex-wrap">
                    {/* Streak */}
                    <div 
                        className="flex items-center gap-1 px-2 py-1.5 text-white shadow-md rounded-xl text-[10px] font-black"
                        style={{ backgroundColor: themeColors.primary }}
                    >
                        <i className="fas fa-fire text-xs"></i>
                        <span>{streak}</span>
                    </div>

                    {/* Langue UI */}
                    <div className="flex bg-white/80 dark:bg-gray-800/80 rounded-xl p-0.5 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                        <button 
                            onClick={() => setLanguage('fr')} 
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'fr' ? 'bg-primary text-white shadow-sm' : 'text-gray-400'}`}
                        >FR</button>
                        <button 
                            onClick={() => setLanguage('en')} 
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-primary text-white shadow-sm' : 'text-gray-400'}`}
                        >EN</button>
                    </div>

                    {/* Sync cloud */}
                    {user && onSyncPush && (
                        <button 
                            onClick={onSyncPush}
                            className={`p-2 rounded-xl shadow-sm transition-all border ${
                                cloudStatus === 'syncing' ? 'bg-blue-500 animate-pulse text-white border-blue-600' : 
                                cloudStatus === 'synced' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 border-green-500/30' :
                                cloudStatus === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-500 border-red-500/30' :
                                'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            }`}
                            title="Sauvegarder vers le Cloud"
                        >
                            <i className={`fas text-xs ${
                                cloudStatus === 'syncing' ? 'fa-sync-alt fa-spin' : 
                                cloudStatus === 'synced' ? 'fa-check' :
                                cloudStatus === 'error' ? 'fa-exclamation-triangle' :
                                'fa-cloud-upload-alt'
                            }`}></i>
                        </button>
                    )}

                    {/* Compte */}
                    <button 
                        onClick={onOpenAuth} 
                        className={`p-2 rounded-xl shadow-sm transition-all border ${
                            user 
                                ? 'bg-success/10 text-success border-success/20' 
                                : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 border-transparent'
                        }`}
                        title={user ? t('header.account') : 'Connexion'}
                    >
                        <i className={`fas text-xs ${user ? 'fa-user-check' : 'fa-cloud-upload-alt'}`}></i>
                    </button>

                    {/* Theme Indicator */}
                    <div 
                        className="flex items-center gap-1 px-2 py-1.5 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm border border-transparent cursor-help"
                        title={`Thème actuel : ${activeTheme.name} (Cmd+Flèches pour changer)`}
                    >
                        <span className="text-sm">{activeTheme.emoji}</span>
                    </div>

                    {/* Thème clair/sombre */}
                    <button 
                        onClick={() => onThemeModeChange(themeMode === 'dark' ? 'light' : 'dark')} 
                        className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm text-gray-400 hover:text-primary transition-colors border border-transparent"
                        title={themeMode === 'dark' ? 'Mode clair' : 'Mode sombre'}
                    >
                        <i className={`fas text-xs fa-${themeMode === 'dark' ? 'sun' : 'moon'}`}></i>
                    </button>

                    {/* Aide */}
                    <button 
                        onClick={onShowHelp} 
                        className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm text-gray-400 hover:text-primary transition-colors border border-transparent hidden sm:flex"
                        title="Aide"
                    >
                        <i className="fas fa-question-circle text-xs"></i>
                    </button>

                    {/* Paramètres */}
                    <button 
                        onClick={onNavigateToSettings} 
                        className="p-2 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm text-gray-400 hover:text-primary transition-colors border border-transparent"
                        title="Paramètres"
                    >
                        <i className="fas fa-cog text-xs"></i>
                    </button>
                </div>
            </div>

            {/* GRILLE 2 colonnes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                
                {/* COLONNE GAUCHE */}
                <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                    <Section title={t('home.sections.aiTutors')} icon="⚡️" color={themeColors.primary}>
                        <FeatureCard icon="👨‍🏫" title={t('home.features.tutorsRoom.title')} desc={t('home.features.tutorsRoom.description')} onClick={onNavigateToTutorsRoom} colorClass="bg-primary/10 text-primary"/>
                        <FeatureCard icon="💬" title={t('home.features.chat.title')} desc={t('home.features.chat.description')} onClick={onNavigateToChat} colorClass="bg-primary/10 text-primary"/>
                        <FeatureCard icon="✨" title={t('home.features.aiGenerator.title')} desc={t('home.features.aiGenerator.description')} onClick={onNavigateToAIGenerator} colorClass="bg-primary/10 text-primary"/>
                    </Section>

                    <Section title={t('home.sections.learningLabs')} icon="🔬" color={themeColors.accent}>
                        <FeatureCard icon="🗣️" title={t('home.features.languageLab.title')} desc={t('home.features.languageLab.description')} onClick={onNavigateToLanguageLab} colorClass="bg-accent/10 text-accent"/>
                        <FeatureCard icon="🎥" title={t('home.features.videoLearning.title')} desc={t('home.features.videoLearning.description')} onClick={onNavigateToVideoLab} colorClass="bg-accent/10 text-accent"/>
                    </Section>
                </div>

                {/* COLONNE DROITE */}
                <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                    <Section title={t('home.sections.libraryReview')} icon="📚" color={themeColors.info}>
                        <FeatureCard icon="🗺️" title={t('home.features.curriculum.title')} desc={t('home.features.curriculum.description')} onClick={onNavigateToCurriculum} colorClass="bg-info/10 text-info"/>
                        <FeatureCard 
                            icon="📂" 
                            title={t('home.features.library.title')} 
                            desc={t('home.features.library.description', { 
                                setsCount: Object.keys(flashcardSets).length, 
                                cardsCount: Object.values(flashcardSets).reduce((acc, set) => acc + set.length, 0) 
                            })} 
                            onClick={onNavigateToLibrary} 
                            colorClass="bg-info/10 text-info"
                        />
                        <FeatureCard icon="🧠" title={t('home.features.srs.title')} desc={t('home.cardsToReview', { count: dueCardsCount })} onClick={onNavigateToSRS} colorClass="bg-info/10 text-info" badge={dueCardsCount}/>
                    </Section>

                    <Section title={t('home.sections.training')} icon="🎯" color={themeColors.success}>
                        <FeatureCard icon="📝" title={t('home.features.quiz.title')} desc={t('home.features.quiz.description')} onClick={onNavigateToQuiz} colorClass="bg-success/10 text-success"/>
                        <FeatureCard icon="🔤" title={t('home.features.conjugator.title')} desc={t('home.features.conjugator.description')} onClick={onNavigateToConjugator} colorClass="bg-success/10 text-success"/>
                    </Section>
                </div>
            </div>

            {/* SECTION PLEINE LARGEUR — Carte du Savoir & Statistiques */}
            <div className="mt-3 sm:mt-4 md:mt-6 lg:mt-8">
                <div
                    className={`flex flex-col gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-6 rounded-2xl md:rounded-3xl border shadow-sm transition-all duration-300 ${themeStyle === 'apple' ? 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl' : 'bg-white dark:bg-gray-800'}`}
                    style={{ borderColor: `${themeColors.secondary || themeColors.primary}30`, boxShadow: `0 4px 20px -8px ${themeColors.secondary || themeColors.primary}20` }}
                >
                    <h3 className="text-[10px] sm:text-xs font-black flex items-center gap-1.5 uppercase tracking-widest" style={{ color: themeColors.secondary || themeColors.primary }}>
                        <span className="text-base sm:text-xl filter drop-shadow-sm">🔭</span> {t('home.sections.knowledgeStats')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                        <FeatureCard icon="🌌" title={t('home.features.knowledgeMap.title')} desc={t('home.features.knowledgeMap.description')} onClick={onNavigateToKnowledgeMap} colorClass="bg-warning/10 text-warning"/>
                        <FeatureCard icon="📊" title={t('home.features.stats.title')} desc={t('home.features.stats.description')} onClick={onNavigateToDashboard} colorClass="bg-warning/10 text-warning"/>
                    </div>
                </div>
            </div>
            
             <div className="text-center text-[10px] mt-4 pb-2 font-mono uppercase tracking-widest opacity-30" style={{ color: themeColors.text }}>
                Studeo v3.2.0
            </div>
        </div>
    );
};
