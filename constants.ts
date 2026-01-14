import { Flashcard, LanguageConfig, Tutor } from './types';
import { v4 as uuidv4 } from 'uuid';
import * as TutorPrompts from './constants/tutorPrompts';
import * as PracticalPrompts from './constants/practicalTutorPrompts';

export const DEFAULT_FLASHCARD_SET_NAME = 'Français - Anglais (Défaut)';
export const CUSTOM_CARDS_NAME = 'Fiches importées';

export const DEFAULT_FLASHCARDS: Flashcard[] = [
  { id: uuidv4(), type: 'classic', terms: { fr: 'Bonjour', en: 'Hello' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Au revoir', en: 'Goodbye' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Merci', en: 'Thank you' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'S\'il vous plaît', en: 'Please' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Oui', en: 'Yes' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Non', en: 'No' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Chat', en: 'Cat' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Chien', en: 'Dog' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Maison', en: 'House' } },
  { id: uuidv4(), type: 'classic', terms: { fr: 'Voiture', en: 'Car' } },
];

export const LANGUAGE_CONFIG: Record<string, LanguageConfig> = {
    fr: {
        name: 'Français',
        emoji: '🇫🇷',
        speechLang: 'fr-FR',
        voices: { female: 'fr-FR-Wavenet-A', male: 'fr-FR-Wavenet-B' },
    },
    en: {
        name: 'Anglais',
        emoji: '🇬🇧',
        speechLang: 'en-US',
        voices: { female: 'en-US-Wavenet-F', male: 'en-US-Wavenet-D' },
    },
    it: {
        name: 'Italien',
        emoji: '🇮🇹',
        speechLang: 'it-IT',
        voices: { female: 'it-IT-Wavenet-A', male: 'it-IT-Wavenet-B' },
    },
    es: {
        name: 'Espagnol',
        emoji: '🇪🇸',
        speechLang: 'es-ES',
        voices: { female: 'es-ES-Wavenet-A', male: 'es-ES-Wavenet-B' },
    },
    pt: {
        name: 'Portugais',
        emoji: '🇵🇹',
        speechLang: 'pt-PT',
        voices: { female: 'pt-PT-Wavenet-A', male: 'pt-PT-Wavenet-B' },
    },
    de: {
        name: 'Allemand',
        emoji: '🇩🇪',
        speechLang: 'de-DE',
        voices: { female: 'de-DE-Wavenet-A', male: 'de-DE-Wavenet-B' },
    },
    ru: {
        name: 'Russe',
        emoji: '🇷🇺',
        speechLang: 'ru-RU',
        voices: { female: 'ru-RU-Wavenet-A', male: 'ru-RU-Wavenet-B' },
    },
    tr: {
        name: 'Turc',
        emoji: '🇹🇷',
        speechLang: 'tr-TR',
        voices: { female: 'tr-TR-Wavenet-A', male: 'tr-TR-Wavenet-B' },
    },
};

// ============================================
// TUTORS (Salle des Profs)
// ============================================

export const TUTORS: Tutor[] = [
    // Langues
    {
        id: 'maestro-italiano',
        name: 'Maestro Italiano',
        emoji: '🇮🇹',
        category: 'languages',
        language: 'it',
        systemPrompt: TutorPrompts.MAESTRO_ITALIANO_PROMPT,
        description: 'Expert en italien : grammaire, vocabulaire, culture'
    },
    {
        id: 'mister-english',
        name: 'Mister English',
        emoji: '🇬🇧',
        category: 'languages',
        language: 'en',
        systemPrompt: TutorPrompts.MISTER_ENGLISH_PROMPT,
        description: 'Expert en anglais : ESL, phrasal verbs, idioms'
    },
    {
        id: 'maestro-espanol',
        name: 'Maestro Español',
        emoji: '🇪🇸',
        category: 'languages',
        language: 'es',
        systemPrompt: TutorPrompts.MAESTRO_ESPANOL_PROMPT,
        description: 'Expert en espagnol : ser/estar, subjonctif, culture hispanique'
    },
    {
        id: 'mestre-portugues',
        name: 'Mestre Português',
        emoji: '🇵🇹',
        category: 'languages',
        language: 'pt',
        systemPrompt: TutorPrompts.MESTRE_PORTUGUES_PROMPT,
        description: 'Expert en portugais : contractions, nasales, culture lusophone'
    },
    {
        id: 'herr-deutsch',
        name: 'Herr Deutsch',
        emoji: '🇩🇪',
        category: 'languages',
        language: 'de',
        systemPrompt: TutorPrompts.HERR_DEUTSCH_PROMPT,
        description: 'Expert en allemand : déclinaisons, genres, culture germanique'
    },
    {
        id: 'master-russe',
        name: 'Master Russe',
        emoji: '🇷🇺',
        category: 'languages',
        language: 'ru',
        systemPrompt: TutorPrompts.MASTER_RUSSE_PROMPT,
        description: 'Expert en russe : alphabet cyrillique, cas, culture slave'
    },
    {
        id: 'efendi-turco',
        name: 'Efendi Turco',
        emoji: '🇹🇷',
        category: 'languages',
        language: 'tr',
        systemPrompt: TutorPrompts.EFENDI_TURCO_PROMPT,
        description: 'Expert en turc : harmonie vocale, suffixes, culture anatolienne'
    },
    // Culture & Humanités
    {
        id: 'prof-curio',
        name: 'Prof. Curio',
        emoji: '🎓',
        category: 'culture',
        systemPrompt: TutorPrompts.PROF_CURIO_PROMPT,
        description: 'Culture générale : arts, sciences, société, sport'
    },
    {
        id: 'prof-chronos',
        name: 'Prof. Chronos',
        emoji: '⌛',
        category: 'culture',
        systemPrompt: TutorPrompts.PROF_CHRONOS_PROMPT,
        description: 'Histoire : chronologie, événements, personnages historiques'
    },
    {
        id: 'prof-atlas',
        name: 'Prof. Atlas',
        emoji: '🌍',
        category: 'culture',
        systemPrompt: TutorPrompts.PROF_ATLAS_PROMPT,
        description: 'Géographie : pays, capitales, géopolitique'
    },
    {
        id: 'prof-plume',
        name: 'Prof. Plume',
        emoji: '✒️',
        category: 'culture',
        systemPrompt: TutorPrompts.PROF_PLUME_PROMPT,
        description: 'Littérature : auteurs, mouvements, figures de style'
    },
    {
        id: 'prof-sofia',
        name: 'Prof. Sofia',
        emoji: '🦉',
        category: 'culture',
        systemPrompt: TutorPrompts.PROF_SOFIA_PROMPT,
        description: 'Philosophie : auteurs, concepts, courants de pensée'
    },
    {
        id: 'prof-muse',
        name: 'Prof. Muse',
        emoji: '🎨',
        category: 'culture',
        systemPrompt: TutorPrompts.PROF_MUSE_PROMPT,
        description: 'Histoire de l\'Art : mouvements, artistes, œuvres'
    },
    {
        id: 'maitre-lexis',
        name: 'Maître Lexis',
        emoji: '⚖️',
        category: 'culture',
        systemPrompt: TutorPrompts.MAITRE_LEXIS_PROMPT,
        description: 'Droit : civil, pénal, constitutionnel, administratif'
    },

    // Sciences
    {
        id: 'prof-eureka',
        name: 'Prof. Eureka',
        emoji: '🔬',
        category: 'sciences',
        systemPrompt: TutorPrompts.PROF_EUREKA_PROMPT,
        description: 'Sciences : généraliste, curiosité scientifique'
    },
    {
        id: 'prof-biotique',
        name: 'Prof. Biotique',
        emoji: '🌿',
        category: 'sciences',
        systemPrompt: TutorPrompts.PROF_BIOTIQUE_PROMPT,
        description: 'Biologie & SVT : vie, nature, écologie'
    },
    {
        id: 'prof-volt',
        name: 'Prof. Volt',
        emoji: '⚡',
        category: 'sciences',
        systemPrompt: TutorPrompts.PROF_VOLT_PROMPT,
        description: 'Physique : électricté, mécanique, forces'
    },
    {
        id: 'prof-molecula',
        name: 'Prof. Molecula',
        emoji: '🧪',
        category: 'sciences',
        systemPrompt: TutorPrompts.PROF_MOLECULA_PROMPT,
        description: 'Chimie : molécules, réactions, tableau périodique'
    },
    {
        id: 'prof-newton',
        name: 'Prof. Newton',
        emoji: '📐',
        category: 'sciences',
        systemPrompt: TutorPrompts.PROF_NEWTON_PROMPT,
        description: 'Mathématiques : algèbre, géométrie, analyse'
    },
    {
        id: 'prof-cosmos',
        name: 'Prof. Cosmos',
        emoji: '🌌',
        category: 'sciences',
        systemPrompt: TutorPrompts.PROF_COSMOS_PROMPT,
        description: 'Astrophysique : univers, étoiles, cosmologie'
    },
    // Arts
    {
        id: 'maitre-leonard',
        name: 'Maître Léonard',
        emoji: '🖌️',
        category: 'arts',
        systemPrompt: TutorPrompts.MAITRE_LEONARD_PROMPT,
        description: 'Dessin & Arts : perspective, anatomie, créativité (Pratique)'
    },
    {
        id: 'prof-melodia',
        name: 'Mélodia',
        emoji: '🎹',
        category: 'arts',
        systemPrompt: TutorPrompts.PROF_MELODIA_PROMPT,
        description: 'Musique & Théorie : solfège, harmonie, culture musicale'
    },
    {
        id: 'gm-kaspar',
        name: 'Grand Maître Kaspar',
        emoji: '♟️',
        category: 'arts',
        systemPrompt: TutorPrompts.GM_KASPAR_PROMPT,
        description: 'Échecs & Stratégie : ouvertures, tactiques, finales (Pratique)'
    },
    {
        id: 'prof-turing',
        name: 'Prof. Turing',
        emoji: '💻',
        category: 'arts',
        systemPrompt: TutorPrompts.PROF_TURING_PROMPT,
        description: 'Code & Info : Python, Web, Algorithmique (Pratique)'
    },
    // Compétences Pratiques
    {
        id: 'prof-brico',
        name: 'Prof. Brico',
        emoji: '🛠️',
        category: 'practical',
        systemPrompt: TutorPrompts.PROF_BRICO_PROMPT,
        description: 'Bricolage : outils, techniques, rénovation, réparations'
    },
    {
        id: 'chef-gaston',
        name: 'Chef Gaston',
        emoji: '👨‍🍳',
        category: 'practical',
        systemPrompt: PracticalPrompts.CHEF_GASTON_PROMPT,
        description: 'Cuisine : recettes, techniques culinaires, nutrition'
    },
    {
        id: 'coach-vita',
        name: 'Coach Vita',
        emoji: '💪',
        category: 'practical',
        systemPrompt: PracticalPrompts.COACH_VITA_PROMPT,
        description: 'Sport & Bien-être : exercices, nutrition sportive, récupération'
    },
    {
        id: 'sommelier-bacchus',
        name: 'Sommelier Bacchus',
        emoji: '🍷',
        category: 'practical',
        systemPrompt: PracticalPrompts.SOMMELIER_BACCHUS_PROMPT,
        description: 'Œnologie : vins, cépages, dégustation, accords mets-vins'
    },
];

