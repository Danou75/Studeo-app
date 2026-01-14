/**
 * Utility to migrate localStorage keys from old patterns to new ones.
 */
import { migrateGuestTutorToArray } from './guestTutorMigration';

export const migrateLocalStorage = () => {
    const migrations: Record<string, string> = {
        'saved_lessons': 'savedLessons',
        'study_programs': 'studyPrograms',
        'flashcards_gamification': 'flashcardsGamification',
        'ai_config': 'aiConfig',
    };

    Object.entries(migrations).forEach(([oldKey, newKey]) => {
        const data = localStorage.getItem(oldKey);
        if (data !== null) {
            // Only migrate if new key doesn't exist yet to avoid overwriting newer data
            if (localStorage.getItem(newKey) === null) {
                localStorage.setItem(newKey, data);
                console.log(`Migrated ${oldKey} to ${newKey}`);
            }
            // Optional: Remove old key? Safer to keep for one version or remove now.
            // Let's remove it to keep it clean.
            localStorage.removeItem(oldKey);
        }
    });

    // Special case: gemini_api_key
    const oldGeminiKey = localStorage.getItem('gemini_api_key');
    if (oldGeminiKey) {
        const aiConfigStr = localStorage.getItem('aiConfig');
        if (aiConfigStr) {
            try {
                const aiConfig = JSON.parse(aiConfigStr);
                if (!aiConfig.geminiApiKey) {
                    aiConfig.geminiApiKey = oldGeminiKey;
                    localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
                    console.log('Migrated gemini_api_key into aiConfig');
                }
            } catch (e) {
                console.error('Error migrating gemini_api_key into aiConfig:', e);
            }
        }
        localStorage.removeItem('gemini_api_key');
    }

    // Migrate guestTutor (single) to guestTutors (array)
    migrateGuestTutorToArray();
};
