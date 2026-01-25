import { supabase } from '../services/supabaseClient';
import { StudyProgram } from '../types';

export const syncService = {
    /**
     * Synchronise le profil (Analytics, Gamification, Thème)
     */
    async syncProfile(userId: string, data: {
        theme_mode?: string;
        theme_style?: string;
        gamification_data?: any;
        analytics_data?: any;
    }) {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...data,
                updated_at: new Date().toISOString()
            });
        
        if (error) console.error('Sync Profile Error:', error);
        return !error;
    },

    /**
     * Récupère le profil distant
     */
    async getProfile(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Get Profile Error:', error);
            return null;
        }
        return data;
    },

    /**
     * Synchronise toutes les flashcards (on remplace par simplicité pour la v1)
     */
    async syncFlashcards(userId: string, flashcardSets: Record<string, any[]>) {
        // En v1, on simplifie : on stocke tout l'objet record dans une seule entrée ou on itère.
        // On va itérer pour avoir un meilleur suivi.
        const entries = Object.entries(flashcardSets).map(([name, cards]) => ({
            user_id: userId,
            name,
            cards,
            updated_at: new Date().toISOString()
        }));

        // Delete existing sets for this user to avoid duplication (simpliste but effective for a first sync)
        await supabase.from('flashcard_sets').delete().eq('user_id', userId);
        
        const { error } = await supabase
            .from('flashcard_sets')
            .insert(entries);
        
        if (error) console.error('Sync Flashcards Error:', error);
        return !error;
    },

    /**
     * Récupère les flashcards distantes
     */
    async getFlashcards(userId: string) {
        const { data, error } = await supabase
            .from('flashcard_sets')
            .select('*')
            .eq('user_id', userId);
        
        if (error) {
            console.error('Get Flashcards Error:', error);
            return null;
        }

        const sets: Record<string, any[]> = {};
        data.forEach(item => {
            sets[item.name] = item.cards;
        });
        return sets;
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
        
        if (error) console.error('Sync Programs Error:', error);
        return !error;
    },

    /**
     * Récupère les programmes distants
     */
    async getStudyPrograms(userId: string) {
        const { data, error } = await supabase
            .from('study_programs')
            .select('*')
            .eq('user_id', userId);
        
        if (error) {
            console.error('Get Programs Error:', error);
            return null;
        }

        return data.map(p => ({
            id: p.id,
            tutorId: p.tutor_id,
            topic: p.topic,
            targetLevel: p.target_level,
            modules: p.modules,
            lastActiveAt: p.last_active_at,
            createdAt: p.created_at || p.last_active_at // Fallback
        })) as StudyProgram[];
    }
};
