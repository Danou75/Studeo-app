/**
 * Utilitaires pour la comparaison de texte et l'analyse phonétique
 */

/**
 * Normalise une chaîne de caractères pour la comparaison
 * - Minuscules
 * - Suppression des accents
 * - Suppression de la ponctuation
 * - Suppression des espaces superflus
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Supprime la ponctuation
    .replace(/\s{2,}/g, " ") // Remplace les espaces multiples par un seul
    .trim();
};

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 * (Nombre minimum de modifications pour transformer a en b)
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitution
          Math.min(
            matrix[i][j - 1] + 1, // Insertion
            matrix[i - 1][j] + 1 // Suppression
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

/**
 * Calcule le pourcentage de similarité entre deux chaînes (0-100)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.round(similarity * 100) / 100; // Arrondi à 2 décimales
};

/**
 * Détermine si une réponse est acceptable
 * @param userAnswer Réponse de l'utilisateur
 * @param correctAnswer Réponse attendue
 * @param threshold Seuil de tolérance (défaut 85%)
 */
export const isAnswerAcceptable = (
  userAnswer: string,
  correctAnswer: string,
  threshold: number = 85
): boolean => {
  const similarity = calculateSimilarity(userAnswer, correctAnswer);
  return similarity >= threshold;
};
