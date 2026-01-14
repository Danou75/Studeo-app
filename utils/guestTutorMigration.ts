// Migration script to convert guestTutor (single) to guestTutors (array)
export const migrateGuestTutorToArray = () => {
    try {
        const oldGuestTutor = localStorage.getItem('guestTutor');
        const newGuestTutors = localStorage.getItem('guestTutors');
        
        // If we already have the new format, skip migration
        if (newGuestTutors) {
            return;
        }
        
        // If we have old format, migrate it
        if (oldGuestTutor && oldGuestTutor !== 'null') {
            const tutor = JSON.parse(oldGuestTutor);
            if (tutor) {
                // Convert single tutor to array
                localStorage.setItem('guestTutors', JSON.stringify([tutor]));
                console.log('✅ Migrated guestTutor to guestTutors array');
            }
        } else {
            // Initialize empty array
            localStorage.setItem('guestTutors', JSON.stringify([]));
        }
        
        // Remove old key
        localStorage.removeItem('guestTutor');
    } catch (error) {
        console.error('Error migrating guestTutor:', error);
    }
};
