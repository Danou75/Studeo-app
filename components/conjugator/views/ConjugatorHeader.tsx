import React from 'react';
import { Button } from '../../ui/Button';
import { getThemeGradient } from '../../../constants/themes';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTranslation } from '../../../contexts/LanguageContext';
import { Tutor } from '../../../types';


interface ConjugatorHeaderProps {
    onBack: () => void;
    onNavigateToSettings?: () => void;

    mode: 'conjugate' | 'translate' | 'library';
    setMode: (mode: 'conjugate' | 'translate' | 'library') => void;
    cacheEntryCount: number;
    showVoiceSettings: boolean;
    setShowVoiceSettings: (show: boolean) => void;
    availableVoices?: SpeechSynthesisVoice[];
    selectedVoice?: SpeechSynthesisVoice | null;
    setSelectedVoice?: (voice: SpeechSynthesisVoice) => void;
    speak?: (text: string, rate?: number, voice?: SpeechSynthesisVoice | null) => void;
    language?: string;
    resultExists: boolean;
    handleExport: (format: 'md' | 'doc') => void;
    isExporting: boolean;
    handleShare: () => void;
    selectedCount: number;
    onAddCards?: boolean;
    handleCreateCards: () => void;
    
    selectedTutorId?: string | null;
    setSelectedTutorId?: (id: string | null) => void;
    tutorsWithContent?: Tutor[];
}

export const ConjugatorHeader: React.FC<ConjugatorHeaderProps> = ({
    onBack, onNavigateToSettings, mode, setMode, cacheEntryCount,
    showVoiceSettings, setShowVoiceSettings, resultExists, handleExport, isExporting, 
    availableVoices = [], selectedVoice = null, setSelectedVoice, speak,
    language = '',
    handleShare, selectedCount, onAddCards, handleCreateCards,
    selectedTutorId, setSelectedTutorId, tutorsWithContent = []
}) => {
    const { t } = useTranslation();
    const { themeMode, themeStyle } = useTheme();

    return (
        <div 
            className={`transition-all duration-500 pt-safe p-4 md:p-6 shadow-lg relative overflow-hidden shrink-0 group ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
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
            )}            <div className="relative z-10 flex flex-col gap-4">
                {/* Top Row: Back button & Settings actions */}
                <div className="flex justify-between items-center w-full">
                    <Button 
                        variant="secondary" 
                        onClick={onBack} 
                        size="sm" 
                        className={`transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                    >
                        <i className="fas fa-home mr-2 text-inherit"></i> {t('common.home')}
                    </Button>

                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            <button 
                                onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                                className={`w-10 h-10 rounded-xl inline-flex items-center justify-center transition-all backdrop-blur-sm border ${
                                    showVoiceSettings ? 'bg-white text-rose-600 border-white' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                                }`}
                                title={t('conjugator.voiceSettings')}
                            >
                                <i className="fas fa-sliders-h"></i>
                            </button>
                            
                            {showVoiceSettings && (
                                <div className="absolute top-12 right-0 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 w-72 overflow-hidden animate-fade-in-down origin-top-right">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center text-gray-800 dark:text-gray-200">
                                        <h3 className="font-bold text-sm">
                                            <i className="fas fa-volume-up mr-2 text-rose-500"></i>
                                            {t('quiz.voice.title', { lang: language })}
                                        </h3>
                                        <button onClick={() => setShowVoiceSettings(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <i className="fas fa-times"></i>
                                        </button>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                        {availableVoices.length === 0 ? (
                                            <div className="text-center p-4 text-sm text-gray-500 dark:text-gray-400">{t('quiz.voice.noVoice')}</div>
                                        ) : (
                                            availableVoices.map((voice, idx) => (
                                                <button
                                                    key={`${voice.name}-${idx}`}
                                                    onClick={() => {
                                                        if (setSelectedVoice) setSelectedVoice(voice);
                                                        if (speak) speak(t('quiz.voice.test'), 1, voice);
                                                    }}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs md:text-sm flex items-center justify-between transition-colors ${
                                                        selectedVoice?.name === voice.name 
                                                            ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-800/30' 
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent'
                                                    }`}
                                                >
                                                    <span className="truncate mr-2 font-medium">{voice.name}</span>
                                                    {selectedVoice?.name === voice.name && <i className="fas fa-check text-rose-500"></i>}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {onNavigateToSettings && (
                            <button 
                                onClick={onNavigateToSettings}
                                className={`w-10 h-10 rounded-xl inline-flex items-center justify-center transition-all backdrop-blur-sm border ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 hover:bg-black/10 text-primary border-black/10' : 'bg-white/10 hover:bg-white/20 text-white border-white/20'}`}
                                title="Paramètres de l'IA"
                            >
                                <i className="fas fa-cog"></i>
                            </button>
                        )}
                    </div>
                </div>

                {/* Middle Row: Title & Subtitle */}
                <div className="flex flex-col">
                    <h1 className="text-2xl sm:text-3xl font-black drop-shadow-sm text-inherit">
                        {t('conjugator.title')}
                    </h1>
                    <p className="opacity-80 mt-0.5 text-sm sm:text-base text-inherit">
                        {mode === 'conjugate' ? t('conjugator.conjugateSubtitle') : mode === 'translate' ? t('conjugator.translateSubtitle') : '📚 Vos conjugaisons & traductions sauvegardées'}
                    </p>
                </div>

                {/* Bottom Row: Mode selector & Export/Add Actions */}
                <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                    {/* Mode Selector */}
                    <div className={`inline-flex gap-0.5 p-0.5 rounded-lg backdrop-blur-sm shadow-inner border ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/20'} max-w-full overflow-x-auto`}>
                        <button
                            onClick={() => setMode('conjugate')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                                mode === 'conjugate'
                                    ? 'bg-white text-primary shadow-md'
                                    : themeStyle === 'apple' && themeMode === 'light' 
                                        ? 'text-primary/40 hover:text-primary/60' 
                                        : 'text-white/70 hover:text-white'
                            }`}
                        >
                            <i className="fas fa-book mr-1.5"></i>Conjugaison
                        </button>
                        <button
                            onClick={() => setMode('translate')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                                mode === 'translate'
                                    ? 'bg-white text-primary shadow-md'
                                    : themeStyle === 'apple' && themeMode === 'light' 
                                        ? 'text-primary/40 hover:text-primary/60' 
                                        : 'text-white/70 hover:text-white'
                            }`}
                        >
                            <i className="fas fa-language mr-1.5"></i>Traduction
                        </button>
                        <button
                            onClick={() => setMode('library')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all relative whitespace-nowrap ${
                                mode === 'library'
                                    ? 'bg-white text-primary shadow-md'
                                    : themeStyle === 'apple' && themeMode === 'light' 
                                        ? 'text-primary/40 hover:text-primary/60' 
                                        : 'text-white/70 hover:text-white'
                            }`}
                        >
                            <i className="fas fa-database mr-1.5"></i>Bibliothèque
                            {cacheEntryCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-accent text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                    {cacheEntryCount > 99 ? '99+' : cacheEntryCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Export Actions & Add Cards */}
                    <div className="flex flex-wrap items-center gap-2 max-w-full">
                        {resultExists && (
                            <div className={`flex items-center gap-1 p-1 rounded-xl backdrop-blur-sm shadow-inner border transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/10 border-white/20'}`}>
                                {mode === 'conjugate' && (
                                    <>
                                      <button 
                                          onClick={() => handleExport('md')}
                                          disabled={isExporting}
                                          className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/5 text-primary' : 'hover:bg-white/20 text-white'}`}
                                          title={t('conjugator.exportMD')}
                                      >
                                          {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fab fa-markdown text-xs"></i>} <span>MD</span>
                                      </button>
                                      <div className={`w-px h-4 self-center ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/10' : 'bg-white/20'}`}></div>
                                      <button 
                                          onClick={() => handleExport('doc')}
                                          disabled={isExporting}
                                          className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/5 text-primary' : 'hover:bg-white/20 text-white'}`}
                                          title={t('conjugator.exportWord')}
                                      >
                                          {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-file-word text-xs"></i>} <span>RTF</span>
                                      </button>
                                      <div className={`w-px h-4 self-center ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/10' : 'bg-white/20'}`}></div>
                                    </>
                                 )}
                                <button 
                                    onClick={handleShare}
                                    className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'hover:bg-black/5 text-primary' : 'hover:bg-white/20 text-white'}`}
                                    title="Partager"
                                >
                                    <i className="fas fa-share-alt text-xs"></i> <span>Partager</span>
                                </button>
                            </div>
                        )}

                        {selectedCount > 0 && onAddCards && (
                            <Button onClick={handleCreateCards} size="sm" className="bg-white/90 hover:bg-white text-rose-600 border-none font-bold shadow-lg transform hover:scale-105 active:scale-95 transition-all">
                                <i className="fas fa-plus-circle mr-1"></i> {t('conjugator.createCards', { count: selectedCount })}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tutor Filter Dropdown - Show only when there are tutors with content */}
            {mode === 'library' && tutorsWithContent.length > 0 && setSelectedTutorId && (
                <div className="relative z-20 mt-6 flex items-center gap-3 animate-fade-in">
                    <div className="relative flex-1 max-w-xs">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-70">
                            <i className="fas fa-filter text-xs text-inherit"></i>
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
                            <i className="fas fa-chevron-down text-xs text-inherit"></i>
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
                            <i className="fas fa-times text-inherit"></i>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
