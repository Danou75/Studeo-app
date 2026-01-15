import React, { useState, useEffect } from 'react';
import { Tutor, TutorCategory } from '../types';
import { TUTORS } from '../constants';
import { ThemeMode, ThemeStyle, getThemeGradient } from '../constants/themes';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useTranslation } from '../contexts/LanguageContext';

interface TutorsRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTutor: (tutor: Tutor) => void;
    onGenerateCurriculum: (tutor: Tutor) => void;
    onDrawingChallenge?: () => void;
    onMusicChallenge?: () => void;
    onChessChallenge?: () => void;
    onCodingChallenge?: () => void;
    onStartTutorial?: (tutorId?: string) => void;
    guestTutors: Tutor[];
    onAddGuestTutor: (tutor: Tutor) => void;
    onUpdateGuestTutor: (tutorId: string, tutor: Tutor) => void;
    onRemoveGuestTutor: (tutorId: string) => void;
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
    onOpenLanguageLab?: () => void;
    selectedCategory: TutorCategory;
    onSelectCategory: (category: TutorCategory) => void;
    onNavigateToSettings: () => void;
    onNavigateToProgress: () => void;
    onStartChat?: (tutorName: string, tutorSubject: string) => void;
}

export const TutorsRoomModal: React.FC<TutorsRoomModalProps> = ({ 
    isOpen, 
    onClose, 
    onSelectTutor, 
    onGenerateCurriculum, 
    onDrawingChallenge, 
    onMusicChallenge,
    onChessChallenge,
    onCodingChallenge,
    onStartTutorial, 
    guestTutors,
    onAddGuestTutor,
    onUpdateGuestTutor,
    onRemoveGuestTutor,
    themeMode, 
    themeStyle,
    onOpenLanguageLab,
    selectedCategory,
    onSelectCategory,
    onNavigateToSettings,
    onNavigateToProgress,
    onStartChat
}) => {
    const { showConfirmation } = useConfirmation();
    const { t } = useTranslation();
    
    // Form inputs state
    const [guestName, setGuestName] = useState('');
    const [guestSubject, setGuestSubject] = useState('');
    const [guestStyle, setGuestStyle] = useState('');
    const [guestEmoji, setGuestEmoji] = useState('🎓');
    const [guestIsLanguageTutor, setGuestIsLanguageTutor] = useState(false);
    const [guestLanguage, setGuestLanguage] = useState('fr-FR'); // Default to French

    // Pagination State
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 4;

    useEffect(() => {
        setCurrentPage(0);
    }, [selectedCategory]);

    if (!isOpen) return null;

    const categories: { id: TutorCategory; name: string; emoji: string }[] = [
        { id: 'languages', name: t('tutors.categories.languages'), emoji: '🌍' },
        { id: 'culture', name: t('tutors.categories.culture'), emoji: '🏛️' },
        { id: 'sciences', name: t('tutors.categories.sciences'), emoji: '🔬' },
        { id: 'arts', name: t('tutors.categories.arts'), emoji: '🎨' },
        { id: 'practical', name: t('tutors.categories.practical'), emoji: '🛠️' },
        { id: 'guest', name: t('tutors.categories.guest'), emoji: '✨' },
    ];

    const filteredTutors = TUTORS.filter(t => t.category === selectedCategory);
    
    // Calculate Pagination
    const totalPages = Math.ceil(filteredTutors.length / ITEMS_PER_PAGE);
    const displayedTutors = filteredTutors.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    const [editingTutorId, setEditingTutorId] = useState<string | null>(null);

    const handleCreateGuestTutor = () => {
        if (!guestName.trim() || !guestSubject.trim()) return;
        
        const tutorData: Tutor = {
            id: editingTutorId || `guest-${Date.now()}`,
            name: guestName,
            emoji: guestEmoji,
            category: 'guest',
            description: t('tutors.descriptions.guest', { subject: guestSubject }),
            systemPrompt: t('tutors.guest.systemPrompt', { 
                name: guestName, 
                subject: guestSubject, 
                style: guestStyle || t('tutors.guest.defaultStyle') 
            }),
            isLanguageTutor: guestIsLanguageTutor,
            subject: guestSubject
        };
        
        // Use explicitly selected language instead of auto-detection
        tutorData.language = guestLanguage;
        
        if (editingTutorId) {
            onUpdateGuestTutor(editingTutorId, tutorData);
            setEditingTutorId(null);
        } else {
            onAddGuestTutor(tutorData);
        }
        
        // Reset form
        setGuestName('');
        setGuestSubject('');
        setGuestStyle('');
        setGuestEmoji('🎓');
        setGuestIsLanguageTutor(false);
        setGuestLanguage('fr-FR');
    };

    const handleEditTutor = (tutor: Tutor) => {
        setGuestName(tutor.name);
        setGuestSubject(tutor.subject || '');
        setGuestEmoji(tutor.emoji);
        setGuestIsLanguageTutor(tutor.isLanguageTutor || false);
        setGuestLanguage(tutor.language || 'fr-FR');
        // Extract style from systemPrompt if possible
        const styleMatch = tutor.systemPrompt.match(/Ton style d'enseignement est : (.+?)\n/);
        setGuestStyle(styleMatch ? styleMatch[1] : '');
        setEditingTutorId(tutor.id);
    };

    const handleCancelEdit = () => {
        setEditingTutorId(null);
        setGuestName('');
        setGuestSubject('');
        setGuestStyle('');
        setGuestEmoji('🎓');
        setGuestIsLanguageTutor(false);
        setGuestLanguage('fr-FR');
    };

    return (
        <div className="flex flex-col text-text h-full">
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Header */}
                <div 
                    className={`transition-all duration-500 p-3 md:p-6 shadow-lg relative overflow-hidden shrink-0 ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                    style={{ background: getThemeGradient(themeStyle, themeMode) }}
                >
                    <div className="flex justify-between items-center">
                        <button
                            onClick={onClose}
                            className={`hover:opacity-80 rounded-lg px-4 py-2 transition-all flex items-center gap-2 ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'}`}
                        >
                            <i className="fas fa-home text-inherit"></i> Accueil
                        </button>
                        
                        <div className="flex-1 text-center">
                            <h2 className="text-xl md:text-3xl font-bold flex items-center justify-center gap-2 md:gap-3 text-inherit">
                                🎓 {t('tutors.title')}
                            </h2>
                            <p className="opacity-90 mt-1 md:mt-2 text-[10px] md:text-base text-inherit">
                                {t('tutors.subtitle')}
                            </p>
                        </div>
                        
                        <div className="w-auto flex justify-end gap-2">
                            <button
                                onClick={onNavigateToProgress}
                                className={`hover:opacity-80 rounded-lg px-4 py-2 transition-all flex items-center gap-2 font-semibold ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'}`}
                                title="Mes Progrès"
                            >
                                <i className="fas fa-chart-line text-xl text-inherit"></i>
                                <span className="hidden md:inline text-inherit">Mes Progrès</span>
                            </button>
                            <button
                                onClick={onNavigateToSettings}
                                className={`hover:opacity-80 rounded-lg px-3 py-2 transition-all ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'}`}
                                title={t('common.settings')}
                            >
                                <i className="fas fa-cog text-xl text-inherit"></i>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-x-auto no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => onSelectCategory(cat.id)}
                            className={`flex-1 py-3 md:py-4 px-4 md:px-6 font-semibold transition-all whitespace-nowrap overflow-hidden text-ellipsis ${
                                selectedCategory === cat.id
                                    ? 'bg-white dark:bg-gray-800 text-primary border-b-2 border-primary'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span className="text-2xl mr-2">{cat.emoji}</span>
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {selectedCategory === 'guest' ? (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Form for creating/editing guest tutor */}
                            <div className="bg-white dark:bg-gray-700 rounded-xl p-8 shadow-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                                <div className="text-center mb-8">
                                    <div className="text-6xl mb-4">✨</div>
                                    <h3 className="text-2xl font-bold text-text mb-2">
                                        {editingTutorId ? 'Modifier le Professeur' : t('tutors.guest.title')}
                                    </h3>
                                    <p className="text-text-muted">{t('tutors.guest.subtitle')}</p>
                                </div>
                                
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('tutors.guest.labelName')}</label>
                                        <input 
                                            type="text" 
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                            placeholder={t('tutors.guest.placeholderName')}
                                            className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none text-text"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('tutors.guest.labelSubject')}</label>
                                        <input 
                                            type="text" 
                                            value={guestSubject}
                                            onChange={(e) => setGuestSubject(e.target.value)}
                                            placeholder={t('tutors.guest.placeholderSubject')}
                                            className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none text-text"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('tutors.guest.labelStyle')}</label>
                                        <textarea 
                                            value={guestStyle}
                                            onChange={(e) => setGuestStyle(e.target.value)}
                                            placeholder={t('tutors.guest.placeholderStyle')}
                                            className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none h-24 resize-none text-text"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('tutors.guest.labelEmoji')}</label>
                                        <div className="flex gap-2 text-2xl">
                                            {['🎓', '🕵️‍♂️', '👩‍🔬', '🧙‍♂️', '🤖', '🦉', '🧠'].map(emoji => (
                                                <button
                                                    key={emoji}
                                                    onClick={() => setGuestEmoji(emoji)}
                                                    className={`p-2 rounded hover:bg-background-tertiary transition-colors ${guestEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer" onClick={() => setGuestIsLanguageTutor(!guestIsLanguageTutor)}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${guestIsLanguageTutor ? 'bg-primary border-primary' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'}`}>
                                            {guestIsLanguageTutor && <i className="fas fa-check text-white text-xs"></i>}
                                        </div>
                                        <label className="text-sm font-medium text-text cursor-pointer select-none">
                                            {t('tutors.guest.labelIsLanguageTutor')}
                                        </label>
                                    </div>

                                    {/* Language Selector - shown when it's a language tutor */}
                                    {guestIsLanguageTutor && (
                                        <div>
                                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                                Langue enseignée
                                            </label>
                                            <select
                                                value={guestLanguage}
                                                onChange={(e) => setGuestLanguage(e.target.value)}
                                                className="w-full p-3 rounded-lg bg-background border border-border focus:border-primary outline-none text-text"
                                            >
                                                <option value="fr-FR">🇫🇷 Français</option>
                                                <option value="en-US">🇬🇧 Anglais</option>
                                                <option value="es-ES">🇪🇸 Espagnol</option>
                                                <option value="it-IT">🇮🇹 Italien</option>
                                                <option value="pt-PT">🇵🇹 Portugais</option>
                                                <option value="de-DE">🇩🇪 Allemand</option>
                                                <option value="ru-RU">🇷🇺 Russe</option>
                                                <option value="zh-CN">🇨🇳 Chinois</option>
                                                <option value="ja-JP">🇯🇵 Japonais</option>
                                                <option value="ko-KR">🇰🇷 Coréen</option>
                                                <option value="ar-SA">🇸🇦 Arabe</option>
                                                <option value="tr-TR">🇹🇷 Turc</option>
                                                <option value="nl-NL">🇳🇱 Néerlandais</option>
                                                <option value="pl-PL">🇵🇱 Polonais</option>
                                                <option value="el-GR">🇬🇷 Grec</option>
                                                <option value="hi-IN">🇮🇳 Hindi</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        {editingTutorId && (
                                            <button 
                                                onClick={handleCancelEdit}
                                                className="flex-1 py-4 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-bold text-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                                            >
                                                Annuler
                                            </button>
                                        )}
                                        <button 
                                            onClick={handleCreateGuestTutor}
                                            disabled={!guestName.trim() || !guestSubject.trim()}
                                            className="flex-1 py-4 bg-primary text-white rounded-lg font-bold text-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                        >
                                            {editingTutorId ? 'Enregistrer' : t('tutors.guest.createButton')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* List of existing guest tutors */}
                            {guestTutors.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-text px-2">Professeurs Invités ({guestTutors.length})</h3>
                                    {guestTutors.map(tutor => (
                                        <div key={tutor.id} className="bg-white dark:bg-gray-700 rounded-lg p-5 border-2 border-primary shadow-xl text-left group animate-fade-in relative">
                                            <div className="absolute top-4 right-4 flex gap-2">
                                                <button 
                                                    onClick={() => handleEditTutor(tutor)}
                                                    className="text-blue-400 hover:text-blue-600 p-2"
                                                    title="Modifier"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        showConfirmation({
                                                            title: t('tutors.guest.dismissTitle'),
                                                            message: t('tutors.guest.dismissMessage'),
                                                            confirmText: t('tutors.guest.dismissConfirm'),
                                                            variant: 'warning',
                                                            onConfirm: () => onRemoveGuestTutor(tutor.id)
                                                        });
                                                    }}
                                                    className="text-red-400 hover:text-red-600 p-2"
                                                    title={t('tutors.guest.dismissConfirm')}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="text-6xl animate-bounce-subtle">
                                                    {tutor.emoji}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">{t('tutors.guest.badge')}</div>
                                                    <h3 className="text-2xl font-bold text-text mb-1">
                                                        {tutor.name}
                                                    </h3>
                                                    <p className="text-text-muted">
                                                        {(() => {
                                                            if (tutor.category !== 'guest') return tutor.description;
                                                            
                                                            // 1. If we have the subject stored (New way)
                                                            if (tutor.subject) {
                                                                return t('tutors.descriptions.guest', { subject: tutor.subject });
                                                            }
                                                            
                                                            // 2. Fallback: try to fix broken description 'tutors.descriptions.guest'
                                                            if (tutor.description === 'tutors.descriptions.guest') {
                                                                const match = tutor.systemPrompt.match(/expert en (.*?)\.|expert in (.*?)\./);
                                                                const extracted = match ? (match[1] || match[2]) : null;
                                                                
                                                                if (extracted) {
                                                                     return t('tutors.descriptions.guest', { subject: extracted });
                                                                }
                                                                return t('tutors.guest.badge') + " (Expert)";
                                                            }
                                                            
                                                            return tutor.description;
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 flex-wrap">
                                                {/* Language Lab (Only if Language Tutor) */}
                                                {onOpenLanguageLab && tutor.isLanguageTutor && (
                                                    <button
                                                        onClick={() => {
                                                            onSelectTutor(tutor);
                                                            onOpenLanguageLab();
                                                        }}
                                                        className="flex-1 py-3 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-lg font-bold hover:from-blue-500 hover:to-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2 min-w-[120px]"
                                                    >
                                                        <i className="fas fa-microphone-alt"></i> {t('tutors.actions.lab')}
                                                    </button>
                                                )}

                                                {/* Chat (Always for everyone) */}
                                                {onStartChat && (
                                                    <button
                                                        onClick={() => onStartChat(tutor.name, tutor.description)}
                                                        className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-bold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md flex items-center justify-center gap-2 min-w-[120px]"
                                                    >
                                                        <i className="fas fa-comments"></i> Discuter
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => onSelectTutor(tutor)}
                                                    className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-md flex items-center justify-center gap-2 min-w-[100px]"
                                                >
                                                    <i className="fas fa-bolt"></i> {t('tutors.actions.quiz')}
                                                </button>
                                                <button
                                                    onClick={() => onGenerateCurriculum(tutor)}
                                                    className="flex-1 py-3 bg-background-tertiary border border-border text-text rounded-lg font-bold hover:bg-background-secondary transition-colors shadow-md flex items-center justify-center gap-2 min-w-[100px]"
                                                >
                                                    <i className="fas fa-map"></i> {t('tutors.actions.program')}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayedTutors.map(tutor => (
                                <div
                                    key={tutor.id}
                                    className="bg-white dark:bg-gray-700 rounded-lg p-5 border-2 border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary hover:shadow-lg transition-all text-left group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="text-5xl group-hover:scale-110 transition-transform">
                                            {tutor.emoji}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-text mb-1 group-hover:text-primary transition-colors">
                                                {tutor.name}
                                            </h3>
                                            <p className="text-sm text-text-muted mb-4">
                                                {t(`tutors.descriptions.${tutor.id}` as any)}
                                            </p>
                                            <div className="flex gap-2 relative z-10 flex-wrap">
                                                {/* Boutons spéciaux pour les professeurs interactifs (Arts) */}
                                                {['maitre-leonard', 'prof-melodia', 'gm-kaspar', 'prof-turing'].includes(tutor.id) ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (tutor.id === 'maitre-leonard' && onDrawingChallenge) onDrawingChallenge();
                                                                if (tutor.id === 'prof-melodia' && onMusicChallenge) onMusicChallenge();
                                                                if (tutor.id === 'gm-kaspar' && onChessChallenge) onChessChallenge();
                                                                if (tutor.id === 'prof-turing' && onCodingChallenge) onCodingChallenge();
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded font-medium text-sm hover:from-purple-700 hover:to-pink-700 transition-all shadow-md min-w-[80px]"
                                                        >
                                                            {tutor.id === 'maitre-leonard' ? `🎨 ${t('tutors.actions.challenge')}` : 
                                                             tutor.id === 'prof-melodia' ? `🎹 ${t('tutors.actions.challenge')}` : 
                                                             tutor.id === 'prof-turing' ? `💻 Défi Code` :
                                                             `♟️ ${t('tutors.actions.challenge')}`}
                                                        </button>
                                                        {onStartTutorial && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onStartTutorial(tutor.id);
                                                                }}
                                                                className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded font-medium text-sm hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md min-w-[80px]"
                                                            >
                                                                {tutor.id === 'maitre-leonard' ? `✍️ ${t('tutors.actions.tuto')}` : 
                                                                 tutor.id === 'prof-melodia' ? `🎵 ${t('tutors.actions.tuto')}` : 
                                                                 tutor.id === 'prof-turing' ? `👨‍💻 ${t('tutors.actions.tuto')}` :
                                                                 `♟️ ${t('tutors.actions.tuto')}`}
                                                            </button>
                                                        )}
                                                        {onStartChat && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const subject = t(`tutors.descriptions.${tutor.id}` as any);
                                                                    onStartChat(tutor.name, subject);
                                                                }}
                                                                className="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md min-w-[80px]"
                                                            >
                                                                💬 Discuter
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectTutor(tutor);
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-primary text-white rounded font-medium text-sm hover:bg-primary-dark transition-colors min-w-[70px]"
                                                        >
                                                            ⚡️ {t('tutors.actions.quiz')}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onGenerateCurriculum(tutor);
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-background-tertiary border border-border text-text rounded font-medium text-sm hover:bg-background-secondary transition-colors min-w-[70px]"
                                                        >
                                                            🗺️ {t('tutors.actions.programShort')}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {onOpenLanguageLab && tutor.category === 'languages' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onSelectTutor(tutor);
                                                                    onOpenLanguageLab();
                                                                }}
                                                                className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded font-medium text-sm hover:from-blue-500 hover:to-indigo-600 transition-all shadow-sm"
                                                            >
                                                                🎙️ {t('tutors.actions.lab')}
                                                            </button>
                                                        )}
                                                        {onStartChat && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Fix: Get translated description
                                                                    const subject = t(`tutors.descriptions.${tutor.id}` as any);
                                                                    onStartChat(tutor.name, subject);
                                                                }}
                                                                className="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm"
                                                            >
                                                                💬 Discuter
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onSelectTutor(tutor);
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-primary text-white rounded font-medium text-sm hover:bg-primary-dark transition-colors min-w-[70px]"
                                                        >
                                                            ⚡️ {t('tutors.actions.quiz')}
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onGenerateCurriculum(tutor);
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-background-tertiary border border-border text-text rounded font-medium text-sm hover:bg-background-secondary transition-colors min-w-[70px]"
                                                        >
                                                            🗺️ {t('tutors.actions.programShort')}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            </div>

                            {/* Pagination - Sous Onglets */}
                            {totalPages > 1 && (
                                <div className="flex justify-center border-t border-gray-100 dark:border-gray-600 pt-4 mt-6">
                                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1">
                                        {Array.from({ length: totalPages }).map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(i)}
                                                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                                    currentPage === i 
                                                        ? 'bg-white dark:bg-gray-600 text-primary shadow-sm scale-100' 
                                                        : 'text-text-muted hover:text-text hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                Page {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        {t('tutors.info')}
                    </p>
                </div>
            </div>
        </div>
    );
};
