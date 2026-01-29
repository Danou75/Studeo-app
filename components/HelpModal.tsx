import React, { useState } from 'react';
import { Button } from './ui/Button';
import { useTranslation } from '../contexts/LanguageContext';
import { USER_GUIDE_CONTENT } from '../constants/userGuideContent';
import { USER_GUIDE_CONTENT_EN } from '../constants/userGuideContentEn';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpSection = 
  | 'welcome'
  | 'aiConfig'
  | 'cardCreation'
  | 'library'
  | 'conjugator'
  | 'tutors'
  | 'srs'
  | 'lab'
  | 'backup'
  | 'userGuide';

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useTranslation();
  const [selectedSection, setSelectedSection] = useState<HelpSection | null>(null);
  const [showUserGuide, setShowUserGuide] = useState(false);
  
  if (!isOpen) return null;

  const sections = [
    {
      id: 'welcome' as HelpSection,
      title: t('helpCenter.welcome.title'),
      icon: "fa-rocket",
      content: t('helpCenter.welcome.content'),
    },
    {
      id: 'aiConfig' as HelpSection,
      title: t('helpCenter.aiConfig.title'),
      icon: "fa-cog",
      content: t('helpCenter.aiConfig.content'),
    },
    {
      id: 'cardCreation' as HelpSection,
      title: t('helpCenter.cardCreation.title'),
      icon: "fa-brain",
      content: t('helpCenter.cardCreation.content'),
    },
    {
      id: 'library' as HelpSection,
      title: t('helpCenter.library.title'),
      icon: "fa-book-reader",
      content: t('helpCenter.library.content'),
    },
    {
      id: 'conjugator' as HelpSection,
      title: t('helpCenter.conjugator.title'),
      icon: "fa-microphone-alt",
      content: t('helpCenter.conjugator.content'),
    },
    {
      id: 'tutors' as HelpSection,
      title: t('helpCenter.tutors.title'),
      icon: "fa-chalkboard-teacher",
      content: t('helpCenter.tutors.content'),
    },
    {
      id: 'srs' as HelpSection,
      title: t('helpCenter.srs.title'),
      icon: "fa-calendar-check",
      content: t('helpCenter.srs.content'),
    },
    {
      id: 'lab' as HelpSection,
      title: t('helpCenter.lab.title'),
      icon: "fa-gamepad",
      content: t('helpCenter.lab.content'),
    },
    {
      id: 'backup' as HelpSection,
      title: t('helpCenter.backup.title'),
      icon: "fa-database",
      content: t('helpCenter.backup.content'),
    }
  ];

  const renderOverview = () => (
    <>
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border flex justify-between items-center bg-background-tertiary">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <i className="fas fa-question-circle text-lg md:text-xl"></i>
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-text">{t('helpCenter.title')}</h2>
            <p className="text-[10px] md:text-xs text-text-muted">{t('helpCenter.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-background-secondary to-background min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <div 
              key={section.id} 
              onClick={() => setSelectedSection(section.id)}
              className="p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-2">
                <i className={`fas ${section.icon} text-primary group-hover:scale-110 transition-transform`}></i>
                <h3 className="font-bold text-sm text-text">{section.title}</h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <h4 className="flex items-center gap-2 font-bold text-primary text-sm mb-2">
            <i className="fas fa-lightbulb"></i> {t('helpCenter.tipTitle')}
          </h4>
          <p className="text-xs text-text-muted italic">
            {t('helpCenter.tipContent')}
          </p>
        </div>

        {/* User Guide Button */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-success/10 border border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="flex items-center gap-2 font-bold text-primary text-sm mb-1">
                <i className="fas fa-book"></i> {t('helpCenter.userGuide.title')}
              </h4>
              <p className="text-xs text-text-muted">
                {t('helpCenter.userGuide.subtitle')}
              </p>
            </div>
            <Button 
              onClick={() => setShowUserGuide(true)}
              variant="primary"
              size="sm"
              className="ml-4 shrink-0"
            >
              <i className="fas fa-external-link-alt mr-2"></i>
              {t('helpCenter.userGuide.open')}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-background-tertiary flex justify-center">
        <Button onClick={onClose} variant="primary" className="rounded-xl px-12 shadow-lg">
          {t('helpCenter.footerButton')}
        </Button>
      </div>
    </>
  );

  const renderDetailedView = () => {
    const section = sections.find(s => s.id === selectedSection);
    if (!section) return null;

    // Fetch steps dynamically
    const steps = t(`helpCenter.${section.id}.steps`) as string[];

    return (
      <>
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border bg-background-tertiary">
          <button 
            onClick={() => setSelectedSection(null)}
            className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors mb-2 md:mb-4"
          >
            <i className="fas fa-arrow-left"></i>
            <span className="text-xs md:text-sm font-medium">{t('helpCenter.backToOverview')}</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
              <i className={`fas ${section.icon} text-xl md:text-2xl`}></i>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-bold text-text truncate">{section.title}</h2>
              <p className="text-xs md:text-sm text-text-muted mt-0.5 line-clamp-1 md:line-clamp-none">{section.content}</p>
            </div>
          </div>
        </div>

        {/* Detailed Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-background-secondary to-background min-h-0">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
              <i className="fas fa-list-ol text-primary"></i>
              {t('helpCenter.detailedGuide')}
            </h3>
            
            {Array.isArray(steps) && steps.map((step, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-background border border-border/50 hover:border-primary/20 transition-all"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-text leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>') }}></p>
                </div>
              </div>
            ))}

            {/* Additional Tips */}
            <div className="mt-6 p-4 rounded-xl bg-success/5 border border-success/20">
              <h4 className="flex items-center gap-2 font-bold text-success text-sm mb-2">
                <i className="fas fa-check-circle"></i> {t('helpCenter.adviceTitle')}
              </h4>
              <p className="text-xs text-text-muted">
                {t('helpCenter.experimentTip')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background-tertiary flex justify-between">
          <Button 
            onClick={() => setSelectedSection(null)} 
            variant="secondary" 
            className="rounded-xl px-8"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            {t('helpCenter.back')}
          </Button>
          <Button 
            onClick={onClose} 
            variant="primary" 
            className="rounded-xl px-8"
          >
            {t('helpCenter.close')}
          </Button>
        </div>
      </>
    );
  };


  const renderUserGuide = () => {
    // Select content based on current language
    const content = language === 'en' ? USER_GUIDE_CONTENT_EN : USER_GUIDE_CONTENT;
    
    // A more robust line-by-line parser for better markdown support
    const lines = content.split('\n');
    let html = '';
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;

    const closeList = () => {
      if (inList) {
        html += listType === 'ul' ? '</ul>' : '</ol>';
        inList = false;
        listType = null;
      }
    };

    const generateId = (text: string) => {
      return text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[&]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/gi, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        
        // Horizontal Rule
        if (line === '---') {
            closeList();
            html += '<hr class="my-10 border-border" />';
            continue;
        }

        // Headers
        const headerMatch = line.match(/^(#{1,4})\s+(.*)/);
        if (headerMatch) {
            closeList();
            const level = headerMatch[1].length;
            const fullTitle = headerMatch[2].replace(/\*\*/g, '');
            const id = generateId(fullTitle);
            
            if (level === 1) html += `<h1 id="${id}" class="text-3xl font-bold text-primary mb-6 mt-10 pb-4 border-b border-border">${fullTitle}</h1>`;
            else if (level === 2) html += `<h2 id="${id}" class="text-2xl font-bold text-text mb-4 mt-8 border-l-4 border-primary pl-4 bg-primary/5 py-2">${fullTitle}</h2>`;
            else if (level === 3) html += `<h3 id="${id}" class="text-xl font-bold text-text mb-3 mt-6">${fullTitle}</h3>`;
            else if (level === 4) html += `<h4 id="${id}" class="text-lg font-bold text-primary mb-2 mt-4">${fullTitle}</h4>`;
            continue;
        }

        // List items
        const ulMatch = line.match(/^[-*+]\s+(.*)/);
        const olMatch = line.match(/^(\d+)\.\s+(.*)/);

        if (ulMatch || olMatch) {
            const currentType = ulMatch ? 'ul' : 'ol';
            const content = (ulMatch ? ulMatch[1] : olMatch![2])
                .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono text-xs">$1</code>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline font-medium">$1</a>');

            if (!inList || listType !== currentType) {
                closeList();
                inList = true;
                listType = currentType;
                html += currentType === 'ul' ? '<ul class="mb-6 space-y-2">' : '<ol class="mb-6 space-y-2">';
            }
            html += `<li class="ml-6 ${currentType === 'ul' ? 'list-disc' : 'list-decimal'} text-text-secondary">${content}</li>`;
            continue;
        }

        // Empty line
        if (line === '') {
            closeList();
            continue;
        }

        // Paragraph
        closeList();
        const paraContent = line
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono text-xs">$1</code>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline font-medium">$1</a>');
        
        html += `<p class="mb-4 text-text-secondary leading-relaxed">${paraContent}</p>`;
    }
    closeList();

    return (
      <div className="flex flex-col h-[85vh] md:h-[80vh] w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border bg-background-tertiary shrink-0">
          <button 
            onClick={() => setShowUserGuide(false)}
            className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors mb-2 md:mb-4"
          >
            <i className="fas fa-arrow-left"></i>
            <span className="text-xs md:text-sm font-medium">{t('helpCenter.userGuide.backToAide')}</span>
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                <i className="fas fa-book text-xl md:text-2xl"></i>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg md:text-2xl font-bold text-text truncate">{t('helpCenter.userGuide.fullGuide')}</h2>
                <p className="text-xs md:text-sm text-text-muted mt-0.5 line-clamp-1 md:line-clamp-none">{t('helpCenter.userGuide.studeoDoc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-b from-background-secondary to-background selection:bg-primary/20">
          <div className="max-w-3xl mx-auto bg-background p-6 md:p-10 rounded-2xl shadow-sm border border-border/40">
            <div 
              className="user-guide-content"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const link = target.closest('a');
                if (link && link.getAttribute('href')?.startsWith('#')) {
                  e.preventDefault();
                  const id = link.getAttribute('href')!.substring(1);
                  const element = document.getElementById(id);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    console.warn(`Element with id ${id} not found`);
                  }
                }
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
          
          <div className="h-12"></div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background-tertiary flex justify-between shrink-0">
          <Button 
            onClick={() => setShowUserGuide(false)} 
            variant="secondary" 
            className="rounded-xl px-8"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            {t('helpCenter.userGuide.back')}
          </Button>
          <Button 
            onClick={onClose} 
            variant="primary" 
            className="rounded-xl px-8"
          >
            {t('helpCenter.userGuide.close')}
          </Button>
        </div>
      </div>
    );
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-background-secondary w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-zoom-in">
        {showUserGuide ? renderUserGuide() : selectedSection ? renderDetailedView() : renderOverview()}
      </div>
    </div>
  );
};
