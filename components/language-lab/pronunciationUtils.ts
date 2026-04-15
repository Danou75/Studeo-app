export interface PronunciationChallenge {
    text: string;
    phonetic?: string;
    focus?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    translation?: string;
    // For Dialogue Mode
    speaker?: 'A' | 'B';
    role?: 'user' | 'ai';
}

export interface PronunciationContent {
    type: 'challenges' | 'dialogue';
    content: PronunciationChallenge[];
}

// Helper: Levenshtein Distance for visual feedback
export const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];
    let i, j;
    for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

export const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    if (longer.length === 0) return 1.0;
    return (longer.length - levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())) / longer.length;
};
