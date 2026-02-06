import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Lesson, StudyProgram, Screen } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useLocalStorage } from './useLocalStorage';

export const useStudyContent = () => {
    const { showToast } = useToast();
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [savedLessons, setSavedLessons] = useLocalStorage<Lesson[]>('savedLessons', []);
    const [studyPrograms, setStudyPrograms] = useLocalStorage<StudyProgram[]>('studyPrograms', []);
    const [curriculumSuggestions, setCurriculumSuggestions] = useLocalStorage<any[]>('curriculum_suggestions_catalog', []);
    const [librarySuggestions, setLibrarySuggestions] = useLocalStorage<any[]>('library_custom_catalog', []);


    const handleLessonGenerated = (lesson: Lesson, setScreen: (s: Screen) => void) => {
        if (!lesson.id) lesson.id = uuidv4();
        
        // Tag par défaut
        if (!lesson.source) lesson.source = 'generator';
        
        // Sauvegarde automatique de l'historique
        setSavedLessons(prev => {
            const exists = prev.find((l: Lesson) => l.topic === lesson.topic && l.content === lesson.content);
            if (!exists) {
                const updated = [lesson, ...prev];
                return updated.slice(0, 20); // Garder les 20 derniers
            }
            return prev;
        });

        setCurrentLesson(lesson);
        setScreen("lesson");
    };

    const handleCurriculumGenerated = (program: StudyProgram, setScreen: (s: Screen) => void) => {
        setStudyPrograms(prev => {
            const exists = prev.find((p: StudyProgram) => p.id === program.id);
            if (exists) {
                return prev.map((p: StudyProgram) => p.id === program.id ? program : p);
            }
            return [...prev, program];
        });
        
        const exists = studyPrograms.find((p: StudyProgram) => p.id === program.id);
        if (!exists) {
            showToast(`🎓 Programme "${program.topic}" créé avec succès !`, 'success', 5000);
            setScreen("home");
        }
    };

    const handleSaveLesson = async (lesson: Lesson) => {
        // @ts-ignore
        const isTauri = typeof window !== 'undefined' && window.__TAURI__;

        if (isTauri) {
             try {
                const { save } = await import('@tauri-apps/api/dialog');
                const { writeTextFile } = await import('@tauri-apps/api/fs');
                
                const filePath = await save({
                    defaultPath: `${lesson.topic.replace(/[^a-z0-9]/gi, "_")}.md`,
                    filters: [{ name: 'Markdown', extensions: ['md'] }]
                });

                if (filePath) {
                    await writeTextFile(filePath, lesson.content);
                    showToast('Leçon enregistrée avec succès !', 'success');
                }
             } catch (e) {
                 console.error('Save error', e);
                 showToast('Erreur sauvegarde', 'error');
             }
        } else {
            const text = lesson.content;
            const blob = new Blob([text], { type: "text/markdown" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${lesson.topic.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Fichier téléchargé !', 'success');
        }
    };

    const handleDeleteProgram = (programId: string) => {
        setStudyPrograms(prev => prev.filter((p: StudyProgram) => p.id !== programId));
    };

    const handleRenameProgram = (programId: string, newTitle: string) => {
        setStudyPrograms(prev => prev.map((p: StudyProgram) => 
            p.id === programId ? { ...p, topic: newTitle } : p
        ));
    };

    const handleDeleteLesson = (lessonId: string) => {
        setSavedLessons(prev => prev.filter((l: Lesson) => l.id !== lessonId));
    };

    const handleRenameLesson = (lessonId: string, newTopic: string) => {
        setSavedLessons(prev => prev.map((l: Lesson) => 
            l.id === lessonId ? { ...l, topic: newTopic } : l
        ));
    };

    const markCurrentModuleComplete = (lesson: Lesson | null): { moduleCompleted: boolean, programCompleted: boolean } => {
        if (!lesson) return { moduleCompleted: false, programCompleted: false };
        
        // Recherche synchrone pour déterminer l'état de fin immédiat
        const currentProgram = studyPrograms.find(p => p.modules.some(m => m.id === lesson.id));
        if (!currentProgram) return { moduleCompleted: false, programCompleted: false };
        
        const modIndex = currentProgram.modules.findIndex(m => m.id === lesson.id);
        const isLastModule = modIndex === currentProgram.modules.length - 1;
        const programFinished = isLastModule;

        let updated = false;
        let nextModuleTitle = "";

        setStudyPrograms(prev => {
            return prev.map(prog => {
                if (prog.id !== currentProgram.id) return prog;

                const newProg = { ...prog, modules: [...prog.modules] };
                const mIndex = newProg.modules.findIndex(m => m.id === lesson.id);

                if (mIndex !== -1) {
                    if (newProg.modules[mIndex].status !== 'completed') {
                         newProg.modules[mIndex] = { ...newProg.modules[mIndex], status: 'completed' };
                         updated = true;
                         
                         if (mIndex + 1 < newProg.modules.length) {
                             newProg.modules[mIndex + 1] = { ...newProg.modules[mIndex + 1], status: 'unlocked' };
                             nextModuleTitle = newProg.modules[mIndex + 1].title;
                         }
                    }
                    newProg.lastActiveAt = new Date().toISOString();
                }
                return newProg;
            });
        });

        if (updated) {
            if (nextModuleTitle) {
                setTimeout(() => showToast(`🎉 Bravo ! Module validé. Le module "${nextModuleTitle}" est débloqué !`, 'success', 5000), 500);
            } else if (programFinished) {
                setTimeout(() => showToast(`🎉 Félicitations ! Vous avez terminé ce programme ! 🎓`, 'success', 7000), 500);
            }
        }
        
        // On renvoie programCompleted: true si c'est le dernier module, même si déjà validé, 
        // pour permettre de revoir l'animation de fin en refaisant le quiz.
        return { moduleCompleted: updated, programCompleted: programFinished };
    };

    const updateSavedLesson = (updatedLesson: Lesson) => {
        setSavedLessons(prev => {
            const index = prev.findIndex(l => l.id === updatedLesson.id);
            if (index !== -1) {
                const newSaved = [...prev];
                newSaved[index] = updatedLesson;
                return newSaved;
            }
            return [updatedLesson, ...prev]; // Au cas où elle n'y est pas
        });
    };

    return {
        currentLesson,
        setCurrentLesson,
        savedLessons,
        setSavedLessons,
        studyPrograms,
        setStudyPrograms,
        curriculumSuggestions,
        setCurriculumSuggestions,
        librarySuggestions,
        setLibrarySuggestions,
        handleLessonGenerated,
        handleCurriculumGenerated,
        handleSaveLesson,
        handleDeleteProgram,
        handleRenameProgram,
        handleDeleteLesson,
        handleRenameLesson,
        markCurrentModuleComplete,
        updateSavedLesson
    };
};
