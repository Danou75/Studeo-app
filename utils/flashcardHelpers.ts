/**
 * Type Guards pour une manipulation sûre des types de Flashcards
 * Remplace les casts dangereux (card as any) par des vérifications de type robustes
 */

import { Flashcard, FlashcardClassic, FlashcardMCQ, FlashcardCloze } from '../types';

/**
 * Vérifie si une carte est de type Classic
 */
export function isFlashcardClassic(card: Flashcard): card is FlashcardClassic {
    return card.type === 'classic' && 'terms' in card;
}

/**
 * Vérifie si une carte est de type MCQ
 */
export function isFlashcardMCQ(card: Flashcard): card is FlashcardMCQ {
    return card.type === 'mcq' && 'mcqData' in card;
}

/**
 * Vérifie si une carte est de type Cloze
 */
export function isFlashcardCloze(card: Flashcard): card is FlashcardCloze {
    return card.type === 'cloze' && 'clozeData' in card;
}

/**
 * Extrait le texte de la question d'une carte dans une langue donnée
 * @param card La carte flashcard
 * @param lang Code de la langue (ex: 'fr', 'en')
 * @returns Le texte de la question ou une chaîne vide
 */
export function getQuestionText(card: Flashcard, lang: string): string {
    if (isFlashcardClassic(card)) {
        return card.terms[lang] || '';
    }
    
    if (isFlashcardMCQ(card)) {
        return card.mcqData.question[lang] || '';
    }
    
    if (isFlashcardCloze(card)) {
        return card.clozeData.text[lang] || '';
    }
    
    return '';
}

/**
 * Extrait le texte de la réponse d'une carte dans une langue donnée
 * @param card La carte flashcard
 * @param lang Code de la langue (ex: 'fr', 'en')
 * @returns Le texte de la réponse ou une chaîne vide
 */
export function getAnswerText(card: Flashcard, lang: string): string {
    if (isFlashcardClassic(card)) {
        return card.terms[lang] || '';
    }
    
    if (isFlashcardMCQ(card)) {
        return card.mcqData.answer[lang] || '';
    }
    
    if (isFlashcardCloze(card)) {
        const answers = card.clozeData.answers[lang];
        return Array.isArray(answers) ? answers.join(', ') : '';
    }
    
    return '';
}

/**
 * Extrait toutes les langues disponibles dans une carte
 * @param card La carte flashcard
 * @returns Tableau des codes de langue disponibles
 */
export function getAvailableLanguages(card: Flashcard): string[] {
    const languages = new Set<string>();
    
    if (isFlashcardClassic(card)) {
        Object.keys(card.terms).forEach(lang => languages.add(lang));
    } else if (isFlashcardMCQ(card)) {
        Object.keys(card.mcqData.question).forEach(lang => languages.add(lang));
        Object.keys(card.mcqData.answer).forEach(lang => languages.add(lang));
    } else if (isFlashcardCloze(card)) {
        Object.keys(card.clozeData.text).forEach(lang => languages.add(lang));
        Object.keys(card.clozeData.answers).forEach(lang => languages.add(lang));
    }
    
    return Array.from(languages);
}

/**
 * Vérifie si une carte possède les langues requises
 * @param card La carte flashcard
 * @param questionLang Langue de la question
 * @param answerLang Langue de la réponse
 * @returns true si les deux langues sont disponibles
 */
export function hasRequiredLanguages(
    card: Flashcard,
    questionLang: string,
    answerLang: string
): boolean {
    const question = getQuestionText(card, questionLang);
    const answer = getAnswerText(card, answerLang);
    return question.length > 0 && answer.length > 0;
}

/**
 * Extrait les distracteurs d'une carte MCQ dans une langue donnée
 * @param card La carte flashcard
 * @param lang Code de la langue
 * @returns Tableau des distracteurs ou tableau vide
 */
export function getDistractors(card: Flashcard, lang: string): string[] {
    if (!isFlashcardMCQ(card) || !card.mcqData.distractors) {
        return [];
    }
    
    return card.mcqData.distractors
        .map(d => d[lang] || Object.values(d)[0])
        .filter((val): val is string => typeof val === 'string' && val.length > 0);
}

/**
 * Normalise un texte pour comparaison (minuscules, sans ponctuation ni espaces superflus)
 */
export function normalizeText(str: string): string {
    return str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
        .replace(/[.,/#!$%\^&*;:{}=\-_`~()]/g, "") // Supprime la ponctuation
        .replace(/\s+/g, " "); // Normalise les espaces
}

/**
 * Déduplique un tableau de cartes en se basant sur leur contenu (Question + Réponse)
 * @param cards Tableau de cartes à dédupliquer
 * @param questionLang Langue de la question
 * @param answerLang Langue de la réponse
 * @returns Tableau de cartes uniques
 */
export function deduplicateCards(
    cards: Flashcard[],
    questionLang: string,
    answerLang: string
): Flashcard[] {
    const seen = new Set<string>();
    const uniqueCards: Flashcard[] = [];

    cards.forEach(card => {
        const q = normalizeText(getQuestionText(card, questionLang));
        const a = normalizeText(getAnswerText(card, answerLang));
        
        // Clé basée sur l'ID (au cas où l'ID est dupliqué) ou le contenu
        const contentKey = `${q}|${a}`;
        const idKey = card.id;

        if (!seen.has(idKey) && !seen.has(contentKey)) {
            uniqueCards.push(card);
            seen.add(idKey);
            seen.add(contentKey);
        }
    });

    return uniqueCards;
}
