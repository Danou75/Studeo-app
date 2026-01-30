import React from 'react';
import { Tutor } from '../types';
import { TUTORS } from '../constants';
import { ThemeMode, ThemeStyle, getThemeGradient } from '../constants/themes';
import { useTranslation } from '../contexts/LanguageContext';
import { Button } from './ui/Button';

interface TutorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTutor: (tutor: Tutor) => void;
    guestTutors: Tutor[];
    themeMode: ThemeMode;
    themeStyle: ThemeStyle;
}

export const TutorSelectionModal: React.FC<TutorSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelectTutor,
    guestTutors,
    themeMode,
    themeStyle
}) => {
    const { t } = useTranslation();
    
    if (!isOpen) return null;

    // Filter only language tutors + guest
    const languageTutors = TUTORS.filter(t => t.category === 'languages');
    const allTutors = [...languageTutors, ...guestTutors];

    // Helper function to get tutor description
    const getTutorDescription = (tutor: Tutor): string => {
        if (tutor.category !== 'guest') {
            return t(`tutors.descriptions.${tutor.id}` as any);
        }
        
        // Guest tutor logic
        // 1. If we have the subject stored (New way)
        if (tutor.subject) {
            return t('tutors.descriptions.guest', { subject: tutor.subject });
        }
        
        // 2. Fallback: try to fix broken description 'tutors.descriptions.guest'
        if (tutor.description === 'tutors.descriptions.guest') {
            // Try to extract from system prompt
            const match = tutor.systemPrompt.match(/expert en (.*?)\.|expert in (.*?)\./);
            const extracted = match ? (match[1] || match[2]) : null;
            
            if (extracted) {
                return t('tutors.descriptions.guest', { subject: extracted });
            }
            // Worst case fallback
            return t('tutors.guest.badge') + " (Expert)";
        }
        
        return tutor.description;
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col text-text animate-fade-in w-full overflow-hidden">
            {/* Header */}
            <div 
                className={`pt-safe p-6 shadow-lg relative overflow-hidden transition-all duration-500 ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
                style={{ background: getThemeGradient(themeStyle, themeMode) }}
            >
                <div className="relative z-10">
                    <Button 
                        variant="secondary" 
                        onClick={onClose} 
                        size="sm" 
                        className={`mb-4 ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm transition-all`}
                    >
                        <i className="fas fa-home mr-2"></i> Accueil
                    </Button>

                    <h2 className="text-3xl font-bold flex items-center gap-3 drop-shadow-sm text-inherit">
                         🎙️ {t('lab.study.selectTutorTitle')}
                    </h2>
                    <p className="opacity-80 mt-1 text-base text-inherit">{t('lab.study.selectTutorDesc')}</p>
                </div>
            </div>

            {/* List */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allTutors.map(tutor => (
                        <button
                            key={tutor.id}
                            onClick={() => onSelectTutor(tutor)}
                            className="w-full bg-background-secondary hover:bg-background border border-border p-5 rounded-2xl hover:border-primary transition-all flex items-center gap-5 group shadow-sm hover:shadow-xl text-left transform hover:-translate-y-1"
                        >
                            <span className="text-5xl group-hover:scale-110 transition-transform bg-background rounded-2xl w-20 h-20 flex items-center justify-center shadow-inner">
                                {tutor.emoji}
                            </span>
                            <div className="flex-1">
                                <h3 className="font-bold text-xl text-text group-hover:text-primary transition-colors mb-1">{tutor.name}</h3>
                                <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">
                                    {getTutorDescription(tutor)}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <i className="fas fa-chevron-right"></i>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
