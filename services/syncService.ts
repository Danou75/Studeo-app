import { supabase } from '../services/supabaseClient';
import { StudyProgram, Lesson } from '../types';

export const syncService = {
    /**
     * Synchronise le profil (Analytics, Gamification, Thème)
     */
    async syncProfile(userId: string, data: {
        theme_mode?: string;
        theme_style?: string;
        gamification_data?: any;
        analytics_data?: any;
        curriculum_suggestions?: any[];
        library_suggestions?: any[];
        quiz_history?: any[];
        persistent_errors?: any;
        last_sync_device?: string;
        known_devices?: string[];
    }) {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...data,
                updated_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Sync Profile Error:', error.message);
        }
        return { success: !error, error };
    },

    /**
     * Récupère le profil distant
     */
    async getProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            // Cache busting
            .setHeader('Cache-Control', 'no-cache')
            .setHeader('Pragma', 'no-cache')
            .single();
        
        if (error) {
            console.error('Get Profile Error:', error.message);
            return null;
        }
        return data;
    },

    /**
     * Synchronise toutes les flashcards
     */
    async syncFlashcards(userId: string, flashcardSets: Record<string, any[]>) {
        const entries = Object.entries(flashcardSets).map(([name, cards]) => ({
            user_id: userId,
            name,
            cards,
            updated_at: new Date().toISOString()
        }));

        await supabase.from('flashcard_sets').delete().eq('user_id', userId);
        
        const { error } = await supabase
            .from('flashcard_sets')
            .insert(entries);
        
        if (error) {
            console.error('Sync Flashcards Error:', error.message);
        }
        return !error;
    },

    /**
     * Récupère les flashcards distantes
     */
    async getFlashcards(userId: string) {
        const { data, error } = await supabase
            .from('flashcard_sets')
            .select('*')
            .eq('user_id', userId)
            .setHeader('Cache-Control', 'no-cache')
            .setHeader('Pragma', 'no-cache');
        
        if (error) {
            console.error('Get Flashcards Error:', error.message);
            return null;
        }

        return data;
    },

    /**
     * Synchronise les programmes d'étude
     */
    async syncStudyPrograms(userId: string, programs: StudyProgram[]) {
        const entries = programs.map(p => ({
            id: p.id,
            user_id: userId,
            tutor_id: p.tutorId,
            topic: p.topic,
            target_level: p.targetLevel,
            modules: p.modules,
            last_active_at: p.lastActiveAt
        }));

        const { error } = await supabase
            .from('study_programs')
            .upsert(entries);
        
        if (error) console.error('Sync Programs Error:', error.message);
        return !error;
    },

    /**
     * Récupère les programmes distants
     */
    async getStudyPrograms(userId: string) {
        const { data, error } = await supabase
            .from('study_programs')
            .select('*')
            .eq('user_id', userId)
            .setHeader('Cache-Control', 'no-cache')
            .setHeader('Pragma', 'no-cache');
        
        if (error) {
            console.error('Get Programs Error:', error.message);
            return null;
        }

        return data.map(p => ({
            id: p.id,
            tutorId: p.tutor_id,
            topic: p.topic,
            targetLevel: p.target_level,
            modules: p.modules,
            lastActiveAt: p.last_active_at,
            createdAt: p.created_at || p.last_active_at
        })) as StudyProgram[];
    },

    /**
     * Synchronise les cours sauvegardés
     */
    async syncSavedLessons(userId: string, lessons: Lesson[]) {
        const entries = lessons.map(l => ({
            id: l.id,
            user_id: userId,
            topic: l.topic,
            tutor_id: l.tutorId,
            content: l.content,
            flashcards: l.flashcards,
            exercises: l.exercises,
            source: l.source,
            created_at: l.createdAt || new Date().toISOString()
        }));

        const { error } = await supabase
            .from('saved_lessons')
            .upsert(entries);
        
        if (error) console.error('Sync Lessons Error:', error.message);
        return !error;
    },

    /**
     * Récupère les cours distants
     */
    async getSavedLessons(userId: string) {
        const { data, error } = await supabase
            .from('saved_lessons')
            .select('*')
            .eq('user_id', userId)
            .setHeader('Cache-Control', 'no-cache')
            .setHeader('Pragma', 'no-cache');
        
        if (error) {
            console.error('Get Lessons Error:', error.message);
            return null;
        }

        return data.map(l => ({
            id: l.id,
            topic: l.topic,
            tutorId: l.tutor_id,
            content: l.content,
            flashcards: l.flashcards,
            exercises: l.exercises,
            source: l.source,
            createdAt: l.created_at
        })) as Lesson[];
    },

    /**
     * Synchronise les sessions de chat
     */
    async syncChatSessions(userId: string, sessions: any[]) {
        if (!sessions || sessions.length === 0) return true;
        
        const entries = sessions.map(s => ({
            id: s.id,
            user_id: userId,
            tutor_name: s.tutorName,
            tutor_subject: s.tutorSubject,
            messages: s.messages,
            created_at: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
            updated_at: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt
        }));

        const { error } = await supabase
            .from('chat_sessions')
            .upsert(entries);
        
        if (error) console.error('Sync Chat Error:', error.message);
        return !error;
    },

    /**
     * Récupère les sessions de chat distantes
     */
    async getChatSessions(userId: string) {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .setHeader('Cache-Control', 'no-cache')
            .setHeader('Pragma', 'no-cache');
        
        if (error) {
            console.error('Get Chat Error:', error.message);
            return null;
        }

        return data.map(s => ({
            id: s.id,
            tutorName: s.tutor_name,
            tutorSubject: s.tutor_subject,
            messages: s.messages,
            createdAt: new Date(s.created_at),
            updatedAt: new Date(s.updated_at)
        }));
    }
};
