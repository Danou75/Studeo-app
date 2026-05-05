import React from 'react';
import { Flashcard, Language } from '../types';
import { Button } from './ui/Button';
import { useTranslation } from '../contexts/LanguageContext';
import { getThemeGradient } from '../constants/themes';
import { useTheme } from '../contexts/ThemeContext';
import { useCollapsibleHeader } from '../hooks/useCollapsibleHeader';
import { FloatingHeaderToggle } from './ui/FloatingHeaderToggle';

interface SRSReviewScreenProps {
  dueCards: Flashcard[];
  questionLang: Language;
  answerLang: Language;
  onStartReview: () => void;
  onCancel: () => void;
}

export const SRSReviewScreen: React.FC<SRSReviewScreenProps> = ({
  dueCards,
  questionLang,
  answerLang,
  onStartReview,
  onCancel
}) => {
  const { themeMode, themeStyle } = useTheme();
  const { t } = useTranslation();
  const { showHeader, toggleHeader } = useCollapsibleHeader();

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('srs.intervals.today');
    if (diffDays === 1) return t('srs.intervals.yesterday');
    if (diffDays < 7) return t('srs.intervals.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('srs.intervals.weeksAgo', { count: Math.floor(diffDays / 7) });
    return t('srs.intervals.monthsAgo', { count: Math.floor(diffDays / 30) });
  };

  const getIntervalLabel = (interval: number) => {
    if (interval === 0) return t('srs.intervals.new');
    if (interval === 1) return t('srs.intervals.intervalDay');
    if (interval < 7) return t('srs.intervals.intervalDays', { count: interval });
    if (interval < 30) return t('srs.intervals.intervalWeeks', { count: Math.floor(interval / 7) });
    return t('srs.intervals.intervalMonths', { count: Math.floor(interval / 30) });
  };

  const getMasteryLevel = (interval: number) => {
    if (interval === 0) return { label: t('srs.mastery.new'), color: "text-text-muted", bg: "bg-background-tertiary" };
    if (interval < 7) return { label: t('srs.mastery.learning'), color: "text-warning", bg: "bg-warning/10" };
    if (interval < 21) return { label: t('srs.mastery.ongoing'), color: "text-info", bg: "bg-info/10" };
    return { label: t('srs.mastery.mastered'), color: "text-success", bg: "bg-success/10" };
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden relative">
      {/* Bouton flottant toggle */}
      <FloatingHeaderToggle showHeader={showHeader} onToggle={toggleHeader} />

      {/* Header — amovible */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
          showHeader ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
      }`}>
      <div 
        className={`transition-all duration-500 p-4 md:p-6 shadow-lg relative overflow-hidden ${themeStyle === 'apple' && themeMode === 'light' ? 'text-primary' : 'text-white'} ${themeStyle === 'apple' ? 'backdrop-blur-md' : ''}`} 
        style={{ background: getThemeGradient(themeStyle, themeMode) }}
      >
          <div className="relative z-10 flex justify-between items-start">
              <div className="flex flex-col">
                  <Button 
                      variant="secondary" 
                      onClick={onCancel} 
                      size="sm" 
                      className={`transition-all mb-4 w-fit ${themeStyle === 'apple' && themeMode === 'light' ? 'bg-black/5 text-primary' : 'bg-white/20 text-white'} hover:opacity-80 border-transparent backdrop-blur-sm`}
                  >
                      <i className="fas fa-home mr-2 text-inherit"></i> {t('common.home')}
                  </Button>
                  <h1 className="text-3xl font-black drop-shadow-sm text-inherit">
                      {t('srs.title')}
                  </h1>
                  <p className="opacity-80 mt-1 text-base text-inherit">{t('srs.dueToday', { count: dueCards.length })}</p>
              </div>
          </div>
      </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto min-h-0">

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-background-secondary rounded-lg border border-border">
          <div className="text-2xl font-bold text-primary">{dueCards.length}</div>
          <div className="text-sm text-text-secondary">{t('srs.dueCards')}</div>
        </div>
        <div className="p-4 bg-background-secondary rounded-lg border border-border">
          <div className="text-2xl font-bold text-warning">
            {dueCards.filter(c => c.srsData && c.srsData.interval < 7).length}
          </div>
          <div className="text-sm text-text-secondary">{t('srs.learning')}</div>
        </div>
        <div className="p-4 bg-background-secondary rounded-lg border border-border">
          <div className="text-2xl font-bold text-success">
            {dueCards.filter(c => c.srsData && c.srsData.interval >= 21).length}
          </div>
          <div className="text-sm text-text-secondary">{t('srs.mastered')}</div>
        </div>
      </div>

      {/* Liste des cartes */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-text mb-4">{t('srs.dueCards')}</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {dueCards.map((card, index) => {
            const question = card.type === 'classic' && card.terms 
              ? card.terms[questionLang] 
              : card.type === 'mcq' && card.mcqData 
              ? card.mcqData.question[questionLang]
              : ((card as any)[questionLang] || '');
            
            const answer = card.type === 'classic' && card.terms 
              ? card.terms[answerLang] 
              : card.type === 'mcq' && card.mcqData 
              ? card.mcqData.answer[answerLang]
              : ((card as any)[answerLang] || '');

            const interval = card.srsData?.interval ?? 0;
            const mastery = getMasteryLevel(interval);
            const lastReviewed = card.srsData?.lastReviewed;

            return (
              <div 
                key={card.id} 
                className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-text-secondary">#{index + 1}</span>
                      <span className={`text-xs px-2 py-1 rounded ${mastery.bg} ${mastery.color} font-medium`}>
                        {mastery.label}
                      </span>
                    </div>
                    <div className="mb-1">
                      <span className="font-medium text-text">{question}</span>
                      <span className="mx-2 text-text-muted">→</span>
                      <span className="text-primary font-medium">{answer}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <span>📅 {t('srs.labels.interval')}: {getIntervalLabel(interval)}</span>
                      {lastReviewed && (
                        <span>🕐 {t('srs.labels.lastReviewed')}: {formatDate(lastReviewed)}</span>
                      )}
                      {card.srsData && (
                        <span>⚡ {t('srs.labels.ease')}: {card.srsData.easeFactor.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-4">
        <Button 
          onClick={onStartReview} 
          variant="primary"
          size="lg"
          className="flex-1"
        >
          {t('srs.actions.start')}
        </Button>
      </div>

      {/* Aide */}
      <div className="mt-6 p-4 bg-info/5 dark:bg-info/10 border border-info/20 dark:border-info/30 rounded-lg">
        <h3 className="font-semibold text-info mb-2">
          {t('srs.help.title')}
        </h3>
        <ul className="text-sm text-info opacity-90 space-y-1">
          <li>• {t('srs.help.point1')}</li>
          <li>• <strong>{t('quiz.srs.easy')}</strong> : {t('srs.help.point2')}</li>
          <li>• <strong>{t('quiz.srs.good')}</strong> : {t('srs.help.point3')}</li>
          <li>• <strong>{t('quiz.srs.hard')}</strong> : {t('srs.help.point4')}</li>
          <li>• <strong>{t('quiz.srs.again')}</strong> : {t('srs.help.point5')}</li>
        </ul>
      </div>
      </div>
    </div>
  );
};
