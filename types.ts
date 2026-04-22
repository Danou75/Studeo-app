// types.ts

export type Screen = 
    "home" | "setup" | "quiz" | "completion" | "reviewAll" | "revision" | "dashboard" | "srs-preview" | 
    "conjugator" | "settings" | "lesson" | "ai-generator" | "tutors-room" | "curriculum" | "saved-lessons" | 
    "drawing-challenge" | "drawing-tutorial" | "music-challenge" | "language-lab" | "chess-challenge" | "result" | "history" | "config" | "statistics" | "achievements" | "srs-review" |
    "knowledge-map" | "library" | "video-lab" | "progress" | "chat" | "exercises" | "tutor-selection" | "coding-challenge";


// ============================================
// FLASHCARD TYPES
// ============================================

export type SRSData = {
  easeFactor: number;      // Facteur de facilité (1.3 - 2.5+)
  interval: number;        // Intervalle en jours
  repetitions: number;     // Nombre de répétitions réussies
  nextReview: string;      // Prochaine date de révision (ISO string)
  lastReviewed: string;    // Dernière révision (ISO string)
};

export type FlashcardClassic = {
  id: string;
  type: "classic";
  terms: Record<string, string>;
  srsData?: SRSData;       // Données de répétition espacée
  mnemonic?: string;
};

export type FlashcardMCQ = {
  id: string;
  type: "mcq";
  mcqData: {
    question: Record<string, string>;
    answer: Record<string, string>;
    distractors?: Array<Record<string, string>>;
  };
  srsData?: SRSData;
  mnemonic?: string;       // Moyen mnémotechnique (généré par IA ou manuel)
};

export type FlashcardCloze = {
  id: string;
  type: "cloze";
  clozeData: {
    text: Record<string, string>; // Texte avec trous [ ] ou ...
    answers: Record<string, string[]>; // Réponses pour les trous
  };
  srsData?: SRSData;
  mnemonic?: string;
};

export type Flashcard = FlashcardClassic | FlashcardMCQ | FlashcardCloze;

export interface Lesson {
  id: string;
  topic: string;
  tutorId?: string;
  content: string; // Contenu en Markdown ou texte riche
  createdAt?: string;
  flashcards?: Flashcard[];
  language?: string; // Langue du cours
  source?: 'curriculum' | 'generator';
  exercises?: ExerciseSet; // Exercices interactifs pour cette leçon
}

// ============================================
// EXERCISE TYPES (Exercices Interactifs)
// ============================================

export type ExerciseType = 'mcq' | 'fill-blank' | 'open-question' | 'true-false' | 'matching' | 'ordering';

export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  
  // Pour MCQ (Questions à Choix Multiples)
  options?: string[];
  correctAnswer?: string | string[];
  
  // Pour fill-blank (Textes à trous)
  template?: string; // Ex: "La capitale de la France est {blank}"
  blanks?: string[]; // Ex: ["Paris"]
  
  // Pour open-question (Questions ouvertes)
  acceptedAnswers?: string[]; // Variations de réponses acceptées
  
  // Pour matching (Associations)
  pairs?: { left: string; right: string }[];
  
  // Pour ordering (Réordonnancement)
  items?: string[];
  correctOrder?: number[]; // Indices de l'ordre correct
  
  // Métadonnées communes
  hint?: string; // Indice optionnel
  explanation?: string; // Explication après réponse
  difficulty?: 'easy' | 'medium' | 'hard';
  points?: number; // Points attribués pour cet exercice
}

export interface ExerciseSet {
  id: string;
  lessonId: string;
  title: string;
  description?: string;
  exercises: Exercise[];
  createdAt: string;
  totalPoints?: number; // Total des points possibles
}

export interface ExerciseResult {
  exerciseId: string;
  userAnswer: string | string[];
  isCorrect: boolean;
  pointsEarned: number;
  timeSpent: number; // en secondes
}

export interface ExerciseSessionResult {
  exerciseSetId: string;
  lessonId: string;
  results: ExerciseResult[];
  totalScore: number;
  maxScore: number;
  accuracy: number; // 0-100
  totalTime: number; // en secondes
  completedAt: string; // ISO date
}

// ============================================
// QUIZ TYPES
// ============================================

export type GameMode = "normal" | "timed" | "survival" | "sprint";

export type QuizConfig = {
  questionLang: string;
  answerLang: string;
  mode: "classic" | "mcq" | "dictation" | "cloze" | "mixed";  // Mode de réponse
  gameMode: GameMode;  // Mode de jeu (nouveau)
  voiceEngine: "local" | "gemini";
  voiceGender?: VoiceGender;
  autoPlayAudio: boolean;
  quizName: string;
  isSRSMode?: boolean;  // Mode révision SRS avec évaluation de difficulté
  tutorId?: string;
  tutorCategory?: string; // Utiliser string pour éviter import circulaire ou utiliser TutorCategory si dispo
};

export type QuizHistoryEntry = {
  id: number;
  date: string; // ISO
  timestamp: number; // epoch ms
  questionLang: string;
  answerLang: string;
  correctCount: number;
  totalCount: number;
  quizName: string;
  // Nouvelles données pour analytics
  duration?: number;        // Durée en secondes
  averageResponseTime?: number; // Temps moyen par carte (ms)
  mode: "classic" | "mcq" | "dictation" | "cloze" | "mixed";
};

export type QuizResult = Omit<QuizHistoryEntry, 'id' | 'date' | 'timestamp' | 'questionLang' | 'answerLang' | 'quizName'>;


// ============================================
// VOICE TYPES
// ============================================

export type VoiceGender = "female" | "male";
export type Language = string;

export type LanguageConfig = {
  name: string;
  emoji: string;
  speechLang: string;
  voices: {
    female: string;
    male: string;
  };
};

// ============================================
// GAMIFICATION TYPES
// ============================================

export type AchievementType = 
  | "streak_7"
  | "streak_30"
  | "streak_100"
  | "cards_100"
  | "cards_500"
  | "cards_1000"
  | "perfect_10"
  | "perfect_50"
  | "perfect_100"
  | "language_master"
  | "speed_demon"
  | "first_quiz"
  | "night_owl"
  | "early_bird";

export type Achievement = {
  id: AchievementType;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string; // ISO date
  progress?: number;   // 0-100
  target?: number;     // Objectif à atteindre
};

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string; // ISO date
};

export type LanguageLevel = "beginner" | "intermediate" | "advanced" | "expert";

export type LanguageProgress = {
  language: string;
  masteredCards: number;
  totalCards: number;
  level: LanguageLevel;
  accuracy: number; // 0-100
};

export type GamificationData = {
  achievements: Achievement[];
  streak: StreakData;
  languageProgress: Record<string, LanguageProgress>;
  totalQuizzes: number;
  perfectQuizzes: number;
  totalStudyTime: number; // en secondes
};

// ============================================
// ANALYTICS TYPES
// ============================================

export type DailyActivity = {
  date: string; // ISO date (YYYY-MM-DD)
  cardsStudied: number;
  quizzesTaken: number;
  studyTime: number; // en secondes
  accuracy: number; // 0-100
};

export type CardDifficulty = {
  cardId: string;
  errorCount: number;
  totalAttempts: number;
  lastAttempt: string; // ISO date
};

export type AnalyticsData = {
  dailyActivities: DailyActivity[];
  cardDifficulties: CardDifficulty[];
  totalStudyTime: number;
  totalCardsStudied: number;
  averageAccuracy: number;
  languageStats: Record<string, {
    cardsStudied: number;
    accuracy: number;
    studyTime: number;
  }>;
};

// ============================================
// AI GENERATOR TYPES
// ============================================

export type AIGenerationLevel = "beginner" | "intermediate" | "advanced" | "university";

export type AIProvider = 'gemini' | 'local' | 'openai' | 'anthropic' | 'mistral' | 'openrouter';

export type AIGenerationConfig = {
  topic: string;              // Sujet des flashcards
  count: number;              // Nombre de cartes à générer
  sourceLang: string;         // Langue source
  targetLang: string;         // Langue cible
  difficulty: AIGenerationLevel;  // Niveau de difficulté
  isMixed?: boolean;          // Générer un mélange de types de questions
  context?: string;           // Contexte supplémentaire optionnel
  provider?: AIProvider;      // Fournisseur spécifique pour cette génération
  apiKey?: string;            // Clé API spécifique (optionnel)
  modelName?: string;         // Modèle spécifique (optionnel)
  apiUrl?: string;            // URL de l'API locale (ex: http://localhost:11434/v1/chat/completions)
  image?: string;             // Base64 image
  media?: {                   // Audio/Video
      data: string;           // Base64
      mimeType: string;
      name?: string;
  };
};

export type AIGenerationResult = {
  cards: Flashcard[];
  theme: string;
  generatedAt: string; // ISO date
};

// ============================================
// DICTATION TYPES
// ============================================

export type DictationResult = {
  transcript: string;
  confidence: number; // 0-1
  isCorrect: boolean;
  similarity: number; // 0-100
};


export type SpeechRecognitionStatus = "idle" | "listening" | "processing" | "error";

// ============================================
// CONJUGATION TYPES
// ============================================

export type VerbTense = 
  | "present" 
  | "imperfect" 
  | "future" 
  | "conditional" 
  | "subjunctive_present" 
  | "imperative"
  | "past_perfect" // Passé composé / Passato prossimo / Present perfect
  | "simple_past"; // Passé simple / Passato remoto / Preterite

export type ConjugationTable = {
  tense: VerbTense;
  tenseName: string; // Nom localisé (ex: "Présent de l'indicatif")
  forms: Record<string, string>; // pronom -> forme (ex: "je" -> "suis")
};

export type ConjugationResult = {
  verb: string;
  language: string;
  tables: ConjugationTable[];
  definition?: string;
  translation?: string;
  example?: string;
};

// ============================================
// TUTORS TYPES (Salle des Profs)
// ============================================

export type TutorCategory = 'languages' | 'culture' | 'sciences' | 'arts' | 'practical' | 'guest';

export type Tutor = {
  id: string;
  name: string;
  emoji: string;
  category: TutorCategory;
  language?: string; // Code langue pour les tuteurs de langues
  systemPrompt: string;
  description: string;
  isLanguageTutor?: boolean;
  subject?: string;
};

// ============================================
// CURRICULUM TYPES (Programmes d'étude)
// ============================================

export type ModuleStatus = 'locked' | 'unlocked' | 'completed';

export type StudyModule = {
  id: string;
  title: string;
  description: string;
  status: ModuleStatus;
  order: number;
  
  // Contenu généré (optionnel jusqu'à la génération)
  lessonContent?: string;      // Markdown de la leçon
  flashcards?: Flashcard[];    // Cartes associées
  quizConfig?: QuizConfig;     // Config pour lancer le quiz de validation
};

export type StudyProgram = {
  id: string;
  tutorId: string;             // Prof associé (ex: "einstein")
  topic: string;               // Sujet (ex: "Physique Quantique")
  targetLevel: string;         // Niveau visé (ex: "Débutant", "A1")
  modules: StudyModule[];
  createdAt: string;           // Date de création
  lastActiveAt: string;        // Pour reprendre facilement
};

// ============================================
// UPDATE TYPES
// ============================================

export type UpdateStatus = 'up-to-date' | 'available' | 'error' | null;

// ============================================
// CONVERSATION SESSION TYPES (Causerie Lab)
// ============================================

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationSummaryData {
  overall_feedback: string;
  strong_points: string[];
  errors: { original: string; corrected: string; explanation: string }[];
  vocabulary: { word: string; translation: string }[];
  grammar_rules: string[];
  revision_plan: string[];
}

export interface ConversationSession {
  id: string;
  tutorId: string;
  tutorName: string;
  language: string;
  theme: string;
  createdAt: string;
  lastActiveAt: string;
  messages: ConversationMessage[];
  summary?: ConversationSummaryData;
  remedialMessages?: ConversationMessage[];
}

export interface SavedVocabWord {
  word: string;
  translation: string;
  example?: string;
  phonetic?: string;
}

export interface SavedVocabExpression {
  expression: string;
  translation: string;
  example?: string;
}

export interface SavedVocabExercise {
  type: 'quiz' | 'fill-in' | 'translation' | 'matching';
  question?: string;
  options?: string[];
  answer: string;
  sentence?: string;
  pairs?: { left: string; right: string }[];
  targetLanguage?: string;
}

export interface SavedVocabList {
  id: string;
  theme: string;
  targetLanguage: string;
  difficulty: 'débutant' | 'intermédiaire' | 'avancé';
  words: SavedVocabWord[];
  expressions: SavedVocabExpression[];
  exercises: SavedVocabExercise[];
  relatedThemes?: {
    versions: string[];
    connectedThemes: string[];
  };
  savedAt: string;
  wordCount: number;
  tutorId?: string;
  chatHistory?: { role: 'system' | 'user' | 'assistant'; content: string }[];
}

export interface SavedShadowingPhrase {
  text: string;
  translation: string;
  phonetic?: string;
  priority: boolean;
}

export interface SavedShadowingSession {
  id: string;
  theme: string;
  targetLanguage: string;
  level: 'débutant' | 'intermédiaire' | 'avancé';
  phrases: SavedShadowingPhrase[];
  phraseCount: number;
  savedAt: string;
  tutorId?: string;
  /** 'theme' | 'file' | 'transcript' | 'json' — trace the origin of the session content */
  sourceMode?: string;
}
