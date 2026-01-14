import { executeAIRequest } from './conversationService';
import { Exercise, ExerciseSet, ExerciseType, AIProvider } from '../types';

interface GenerateExercisesParams {
  lessonContent: string;
  lessonTopic: string;
  lessonId: string;
  count?: number;
  types?: ExerciseType[];
  difficulty?: 'easy' | 'medium' | 'hard';
  provider?: AIProvider;
  apiKey?: string;
  modelName?: string;
  apiUrl?: string;
}

/**
 * Génère un ensemble d'exercices interactifs basés sur le contenu d'une leçon
 */
export async function generateExercisesFromLesson(
  params: GenerateExercisesParams
): Promise<ExerciseSet> {
  const {
    lessonContent,
    lessonTopic,
    lessonId,
    count = 8,
    types = ['mcq', 'fill-blank', 'open-question', 'true-false'],
    difficulty = 'medium',
    provider = 'gemini',
    apiKey,
    modelName,
    apiUrl
  } = params;

  const prompt = `Tu es un expert pédagogique expérimenté, spécialisé dans la création de matériel didactique de niveau scolaire et universitaire. À partir de la leçon suivante, crée ${count} exercices interactifs de haute qualité.

**LEÇON:**
Sujet: ${lessonTopic}
${lessonContent}

**TYPES D'EXERCICES À CRÉER:**
${types.map(t => `- ${getExerciseTypeDescription(t)}`).join('\n')}

**NIVEAU DE DIFFICULTÉ:** ${difficulty}

**INSTRUCTIONS CLÉS (STYLE MANUEL SCOLAIRE):**
1. **Évite absolument les exercices simplistes** (phrases isolées trop courtes). Vise un contenu dense et riche.
2. **Textes à trous (fill-blank)** :
   - Crée des **paragraphes complets** ou des **dialogues** avec plusieurs trous (2 à 5 trous par exercice).
   - Utilise des **séries de questions** regroupées (a., b., c.) pour travailler les déclinaisons, conjugaisons ou transformations.
   - Utilise des sauts de ligne (\\n) pour structurer le texte.
3. **Questions Ouvertes / Transformations** :
   - Propose des exercices de transformation (ex: "Mettez ces phrases au pluriel", "Changez le temps").
   - Intègre des exercices de traduction (thème/version) pour les langues.
4. **QCM (mcq)** : Pose des questions d'analyse grammaticale ou conceptuelle précise.

**FORMAT DE RÉPONSE (JSON strict):**
{
  "exercises": [
    {
      "type": "mcq",
      "question": "Quelle est la fonction grammaticale du mot souligné dans la phrase 'Il parle *fort*' ?",
      "options": ["Adjectif", "Adverbe", "Nom", "Verbe"],
      "correctAnswer": "Adverbe",
      "explanation": "Ici, 'fort' modifie le verbe 'parler', c'est donc un adverbe invariable.",
      "difficulty": "medium",
      "points": 10
    },
    {
      "type": "fill-blank",
      "question": "Conjuguez les verbes entre parenthèses au temps approprié :",
      "template": "Il faut que tu (aller) {blank} à l'école.\\nJe pense qu'il (être) {blank} malade.\\nBien qu'il (pleuvoir) {blank}, nous sortirons.",
      "blanks": ["ailles", "est", "pleuve"],
      "explanation": "Il faut que + Subjonctif. Penser (affirmatif) + Indicatif. Bien que + Subjonctif.",
      "difficulty": "hard",
      "points": 15
    },
    {
      "type": "open-question",
      "question": "Traduisez ces phrases :",
      "acceptedAnswers": ["Je suis fatigué", "Il fait beau"],
      "explanation": "Explication...",
      "difficulty": "medium",
      "points": 15
    },
    {
      "type": "true-false",
      "question": "Analyse de phrase :\\n'Dans la phrase *Je la vois*, *la* est un COD.'",
      "correctAnswer": "true",
      "explanation": "Correct, 'la' remplace un nom féminin objet direct du verbe voir.",
      "difficulty": "easy",
      "points": 5
    }
  ]
}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

  try {
    const messages = [
      {
        role: 'system' as const,
        content: 'Tu es un assistant pédagogique expert en création d\'exercices interactifs. Tu réponds toujours en JSON valide.'
      },
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    const response = await executeAIRequest(messages, provider, apiKey, modelName, apiUrl);

    // Parse la réponse JSON
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const parsed = JSON.parse(cleanedResponse);

    // Ajoute des IDs uniques à chaque exercice
    const exercisesWithIds: Exercise[] = parsed.exercises.map((ex: any, index: number) => ({
      ...ex,
      id: `${lessonId}-ex-${Date.now()}-${index}`,
      points: ex.points || getDefaultPoints(ex.type, ex.difficulty || difficulty)
    }));

    // Calcule le total des points
    const totalPoints = exercisesWithIds.reduce((sum, ex) => sum + (ex.points || 0), 0);

    const exerciseSet: ExerciseSet = {
      id: `exset-${lessonId}-${Date.now()}`,
      lessonId,
      title: `Exercices - ${lessonTopic}`,
      description: `${count} exercices pour maîtriser les concepts de cette leçon`,
      exercises: exercisesWithIds,
      createdAt: new Date().toISOString(),
      totalPoints
    };

    return exerciseSet;
  } catch (error) {
    console.error('Erreur lors de la génération des exercices:', error);
    throw new Error('Impossible de générer les exercices. Veuillez réessayer.');
  }
}

/**
 * Retourne une description du type d'exercice
 */
function getExerciseTypeDescription(type: ExerciseType): string {
  const descriptions: Record<ExerciseType, string> = {
    'mcq': 'Questions à Choix Multiples (QCM) - 4 options, 1 bonne réponse',
    'fill-blank': 'Textes à trous - Compléter des phrases avec les mots manquants',
    'open-question': 'Questions ouvertes - Réponses courtes vérifiées par IA',
    'true-false': 'Vrai/Faux - Affirmations à valider',
    'matching': 'Associations - Relier des concepts entre eux',
    'ordering': 'Réordonnancement - Remettre des éléments dans le bon ordre'
  };
  return descriptions[type];
}

/**
 * Retourne le nombre de points par défaut selon le type et la difficulté
 */
function getDefaultPoints(type: ExerciseType, difficulty: 'easy' | 'medium' | 'hard'): number {
  const basePoints: Record<ExerciseType, number> = {
    'mcq': 10,
    'fill-blank': 8,
    'open-question': 15,
    'true-false': 5,
    'matching': 12,
    'ordering': 10
  };

  const multipliers = {
    'easy': 0.8,
    'medium': 1.0,
    'hard': 1.5
  };

  return Math.round(basePoints[type] * multipliers[difficulty]);
}

/**
 * Vérifie si une réponse utilisateur est correcte
 */
export function checkExerciseAnswer(exercise: Exercise, userAnswer: string | string[]): boolean {
  switch (exercise.type) {
    case 'mcq':
    case 'true-false':
      return normalizeAnswer(userAnswer as string) === normalizeAnswer(exercise.correctAnswer as string);
    
    case 'fill-blank':
      if (!exercise.blanks) return false;
      const userBlanks = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      return exercise.blanks.every((blank, index) => 
        normalizeAnswer(userBlanks[index]) === normalizeAnswer(blank)
      );
    
    case 'open-question':
      if (!exercise.acceptedAnswers) return false;
      const normalized = normalizeAnswer(userAnswer as string);
      return exercise.acceptedAnswers.some(accepted => 
        normalizeAnswer(accepted) === normalized ||
        normalized.includes(normalizeAnswer(accepted)) ||
        normalizeAnswer(accepted).includes(normalized)
      );
    
    case 'matching':
      // Pour matching, userAnswer devrait être un tableau de paires
      // Format: ["left1:right1", "left2:right2", ...]
      if (!exercise.pairs || !Array.isArray(userAnswer)) return false;
      return userAnswer.length === exercise.pairs.length &&
        userAnswer.every((pair, index) => {
          const [left, right] = (pair as string).split(':');
          return normalizeAnswer(left) === normalizeAnswer(exercise.pairs![index].left) &&
                 normalizeAnswer(right) === normalizeAnswer(exercise.pairs![index].right);
        });
    
    case 'ordering':
      if (!exercise.correctOrder || !Array.isArray(userAnswer)) return false;
      return JSON.stringify(userAnswer) === JSON.stringify(exercise.correctOrder);
    
    default:
      return false;
  }
}

/**
 * Normalise une réponse pour la comparaison (minuscules, sans accents, sans espaces superflus)
 */
function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retire les accents
    .replace(/[^\w\s]/g, '') // Retire la ponctuation
    .trim();
}
