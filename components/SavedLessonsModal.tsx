import React from 'react';
import { Lesson } from '../types';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useTranslation } from '../contexts/LanguageContext';

interface SavedLessonsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lessons: Lesson[];
    onSelectLesson: (lesson: Lesson, source?: 'curriculum' | 'generator') => void;
    onDeleteLesson: (id: string) => void;
}

export const SavedLessonsModal: React.FC<SavedLessonsModalProps> = ({ isOpen, onClose, lessons, onSelectLesson, onDeleteLesson }) => {
    const { showConfirmation } = useConfirmation();
    const { t } = useTranslation();

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        showConfirmation({
             title: t('lessons.deleteConfirmTitle'),
             message: t('lessons.deleteConfirmMessage'),
             confirmText: t('common.delete'),
             variant: "danger",
             onConfirm: () => {
                onDeleteLesson(id);
             }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-scale-in border border-border">
                <div className="p-6 border-b border-border flex justify-between items-center bg-background-secondary">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onClose} 
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-background-tertiary text-text-muted hover:text-primary transition-all"
                            title={t('common.back')}
                        >
                            <i className="fas fa-arrow-left text-lg"></i>
                        </button>
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-text">
                            <span className="text-3xl">📚</span> {t('lessons.title')}
                        </h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {lessons.filter(l => l.source !== 'curriculum').length === 0 ? (
                        <div className="text-center py-10 text-text-muted">
                            <i className="fas fa-history text-4xl mb-4 opacity-50"></i>
                            <p>{t('lessons.emptyText')}</p>
                        </div>
                    ) : (
                        lessons.filter(l => l.source !== 'curriculum').map((lesson) => (
                            <div 
                                key={lesson.id} 
                                onClick={() => onSelectLesson(lesson)}
                                className="bg-background-secondary hover:bg-background-tertiary border border-border p-4 rounded-xl cursor-pointer transition-all hover:border-primary group flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="font-bold text-lg text-text mb-1">{lesson.topic}</h3>
                                    <div className="text-xs text-text-muted">
                                        📅 {new Date(lesson.createdAt || Date.now()).toLocaleDateString()} • {t('lessons.exercisesCount', { count: lesson.flashcards?.length || 0 })}
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDelete(lesson.id!, e)}
                                    className="p-2 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title={t('lessons.deleteTooltip')}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-border bg-background-secondary text-center text-xs text-text-muted">
                    {t('lessons.footer', { count: 20 })}
                </div>
            </div>
        </div>
    );
};
