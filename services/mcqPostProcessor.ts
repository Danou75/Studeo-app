/**
 * Post-traitement intelligent des QCM générés par IA locale
 * Transforme les fiches mal formatées en QCM propres
 */

interface RawMCQ {
  type: string;
  mcqData?: {
    question: { fr: string };
    answer: { fr: string };
    distractors: Array<{ fr: string }>;
  };
}

interface ProcessedMCQ {
  type: 'mcq';
  mcqData: {
    question: { fr: string };
    answer: { fr: string };
    distractors: Array<{ fr: string }>;
  };
}

/**
 * Extrait une question courte à partir d'une description longue
 * Ex: "Roi de France (1560-1574)..." -> "Quel roi de France a régné de 1560 à 1574 ?"
 */
function extractShortQuestion(longText: string): string {
  // Patterns pour détecter des dates
  const dateRangeMatch = longText.match(/\((\d{4})-(\d{4})\)/);
  const singleDateMatch = longText.match(/\((\d{4})\)/);
  
  // Patterns pour détecter le type d'entité
  const isKing = /roi|monarque|souverain/i.test(longText);
  const isPerson = /qui a|découvert|inventé|écrit|peint|composé/i.test(longText);
  const isEvent = /événement|bataille|révolution|guerre/i.test(longText);
  const isPlace = /capitale|ville|pays|région/i.test(longText);
  
  // Générer une question appropriée
  if (dateRangeMatch) {
    const [_, startYear, endYear] = dateRangeMatch;
    if (isKing) {
      return `Quel roi de France a régné de ${startYear} à ${endYear} ?`;
    }
    return `Qui a vécu de ${startYear} à ${endYear} ?`;
  }
  
  if (singleDateMatch) {
    const [_, year] = singleDateMatch;
    if (isEvent) {
      return `Quel événement a eu lieu en ${year} ?`;
    }
    return `Qui était actif en ${year} ?`;
  }
  
  if (isPerson) {
    // Extraire l'action
    if (/écrit|auteur/i.test(longText)) {
      return "Qui a écrit cette œuvre ?";
    }
    if (/peint|peintre/i.test(longText)) {
      return "Qui a peint cette œuvre ?";
    }
    if (/découvert/i.test(longText)) {
      return "Qui a fait cette découverte ?";
    }
  }
  
  if (isPlace) {
    return "Quelle est cette ville/ce lieu ?";
  }
  
  // Fallback : question générique
  return "Quelle est la réponse ?";
}

/**
 * Extrait une réponse courte à partir d'un texte long
 * Ex: "Louis IX (Saint Louis), qui a régné..." -> "Louis IX"
 */
function extractShortAnswer(longText: string): string {
  // Supprimer les parenthèses et leur contenu (sauf si c'est le seul contenu)
  let cleaned = longText;
  
  // Extraire le nom principal avant la première virgule ou parenthèse
  const beforeComma = cleaned.split(',')[0].trim();
  const beforeParen = beforeComma.split('(')[0].trim();
  
  // Si on a quelque chose de court, c'est probablement la réponse
  if (beforeParen.length > 0 && beforeParen.length < 50) {
    return beforeParen;
  }
  
  // Sinon, prendre les premiers mots (max 5)
  const words = cleaned.split(' ').slice(0, 5).join(' ');
  return words;
}

/**
 * Détecte si la question contient déjà la réponse
 */
function questionContainsAnswer(question: string, answer: string): boolean {
  const qLower = question.toLowerCase();
  const aLower = answer.toLowerCase();
  
  // Si la question et la réponse sont très similaires (>70% de similarité)
  const similarity = calculateSimilarity(qLower, aLower);
  if (similarity > 0.7) {
    return true;
  }
  
  // Si la question contient la réponse mot pour mot
  if (qLower.includes(aLower) || aLower.includes(qLower)) {
    return true;
  }
  
  return false;
}

/**
 * Calcule la similarité entre deux chaînes (0 = différent, 1 = identique)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Nettoie et valide un distracteur
 */
function cleanDistractor(distractor: string, answer: string): string | null {
  const cleaned = distractor.trim();
  
  // Ignorer les distracteurs vides
  if (!cleaned) return null;
  
  // Ignorer les distracteurs identiques à la réponse
  if (cleaned.toLowerCase() === answer.toLowerCase()) return null;
  
  // Ignorer les distracteurs trop longs (probablement mal formatés)
  if (cleaned.length > 100) return null;
  
  return cleaned;
}

/**
 * Post-traite un QCM mal formaté
 */
export function postProcessMCQ(rawMCQ: RawMCQ): ProcessedMCQ | null {
  if (!rawMCQ.mcqData) {
    console.warn('⚠️ MCQ sans mcqData, ignoré');
    return null;
  }
  
  const { question, answer, distractors } = rawMCQ.mcqData;
  
  let finalQuestion = question.fr;
  let finalAnswer = answer.fr;
  
  // Détecter si la question contient la réponse
  if (questionContainsAnswer(finalQuestion, finalAnswer)) {
    console.log('🔧 Question contient la réponse, extraction automatique...');
    
    // Extraire une vraie question courte
    finalQuestion = extractShortQuestion(finalQuestion);
    
    // Extraire une réponse courte
    finalAnswer = extractShortAnswer(finalAnswer);
    
    console.log(`   Question: "${finalQuestion}"`);
    console.log(`   Réponse: "${finalAnswer}"`);
  }
  
  // Nettoyer les distracteurs
  const cleanedDistractors = distractors
    .map(d => cleanDistractor(d.fr, finalAnswer))
    .filter((d): d is string => d !== null);
  
  // Vérifier qu'on a au moins 2 distracteurs
  if (cleanedDistractors.length < 2) {
    console.warn('⚠️ Pas assez de distracteurs valides, QCM ignoré');
    return null;
  }
  
  // S'assurer qu'on a exactement 3 distracteurs
  while (cleanedDistractors.length < 3) {
    cleanedDistractors.push('Autre réponse');
  }
  
  return {
    type: 'mcq',
    mcqData: {
      question: { fr: finalQuestion },
      answer: { fr: finalAnswer },
      distractors: cleanedDistractors.slice(0, 3).map(d => ({ fr: d }))
    }
  };
}

/**
 * Post-traite un tableau de QCM
 */
export function postProcessMCQBatch(rawMCQs: RawMCQ[]): ProcessedMCQ[] {
  console.log(`🔧 Post-traitement de ${rawMCQs.length} QCM...`);
  
  const processed = rawMCQs
    .map(postProcessMCQ)
    .filter((mcq): mcq is ProcessedMCQ => mcq !== null);
  
  console.log(`✅ ${processed.length}/${rawMCQs.length} QCM valides après post-traitement`);
  
  return processed;
}
