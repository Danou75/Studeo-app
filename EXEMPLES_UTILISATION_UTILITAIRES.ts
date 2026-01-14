/**
 * Exemples d'Utilisation des Nouveaux Utilitaires
 * Ce fichier montre comment migrer du code existant vers les nouveaux helpers
 */

// ============================================
// 1. CONFIGURATION IA - aiConfigHelper.ts
// ============================================

import { getAIClientConfig, isAIConfigValid, getAIConfigError } from '../utils/aiConfigHelper';
import { useAIConfig } from '../contexts/AIConfigContext';

// AVANT (Code dupliqué dans 6 endroits)
function generateContentOLD() {
    const { config } = useAIConfig();
    
    let apiKey: string | undefined;
    let modelName: string = config.geminiModel;
    let apiUrl: string | undefined;

    switch (config.provider) {
        case 'gemini':
            apiKey = config.geminiApiKey;
            modelName = config.geminiModel;
            break;
        case 'openai':
            apiKey = config.openaiApiKey;
            if (!apiKey) { showToast("Clé API OpenAI manquante !", "error"); return; }
            modelName = config.openaiModel || 'gpt-4o';
            break;
        case 'anthropic':
            apiKey = config.anthropicApiKey;
            if (!apiKey) { showToast("Clé API Claude manquante !", "error"); return; }
            modelName = config.anthropicModel || 'claude-3-5-sonnet-20240620';
            break;
        case 'mistral':
            apiKey = config.mistralApiKey;
            if (!apiKey) { showToast("Clé API Mistral manquante !", "error"); return; }
            modelName = config.mistralModel || 'mistral-large-latest';
            break;
        case 'local':
            apiUrl = config.localApiUrl;
            modelName = config.localModelName;
            break;
    }
    
    // Utiliser apiKey, modelName, apiUrl...
}

// APRÈS (Centralisé et propre)
function generateContentNEW() {
    const { config } = useAIConfig();
    const { showToast } = useToast();
    
    try {
        const { apiKey, modelName, apiUrl } = getAIClientConfig(config);
        
        // Utiliser directement apiKey, modelName, apiUrl
        // La validation est déjà faite, pas besoin de vérifier
        
    } catch (error) {
        showToast(error.message, "error");
        return;
    }
}

// Validation avant d'afficher un bouton
function MyComponent() {
    const { config } = useAIConfig();
    
    // AVANT
    const canGenerateOLD = (config.provider === 'gemini' && config.geminiApiKey) ||
                           (config.provider === 'openai' && config.openaiApiKey) ||
                           (config.provider === 'local' && config.localApiUrl);
    
    // APRÈS
    const canGenerateNEW = isAIConfigValid(config);
    
    return (
        <button disabled={!canGenerateNEW}>
            Générer avec IA
        </button>
    );
}

// Afficher un message d'erreur convivial
function ConfigStatus() {
    const { config } = useAIConfig();
    const error = getAIConfigError(config);
    
    if (error) {
        return <div className="text-red-500">{error}</div>;
    }
    
    return <div className="text-green-500">Configuration valide ✓</div>;
}


// ============================================
// 2. FLASHCARDS - flashcardHelpers.ts
// ============================================

import { 
    isFlashcardClassic, 
    isFlashcardMCQ, 
    isFlashcardCloze,
    getQuestionText,
    getAnswerText,
    getAvailableLanguages,
    hasRequiredLanguages,
    getDistractors
} from '../utils/flashcardHelpers';
import { Flashcard } from '../types';

// AVANT (Casts dangereux partout)
function extractQuestionOLD(card: Flashcard, lang: string): string {
    const terms = (card as any).terms;
    const mcqData = (card as any).mcqData;
    const clozeData = (card as any).clozeData;

    if (terms) {
        return terms[lang] ?? '';
    }
    if (mcqData) {
        return mcqData.question[lang] ?? '';
    }
    if (clozeData) {
        return clozeData.text[lang] ?? '';
    }
    
    return (card as any)[lang] || '';
}

// APRÈS (Type-safe et propre)
function extractQuestionNEW(card: Flashcard, lang: string): string {
    return getQuestionText(card, lang);
}

// Exemple: Filtrer les cartes valides pour un quiz
function prepareQuizCardsOLD(cards: Flashcard[], questionLang: string, answerLang: string) {
    return cards.filter(card => {
        const terms = (card as any).terms;
        const mcqData = (card as any).mcqData;
        const clozeData = (card as any).clozeData;

        if (terms) return terms[questionLang] && terms[answerLang];
        if (mcqData) return mcqData.question[questionLang] && mcqData.answer[answerLang];
        if (clozeData) return clozeData.text[questionLang] && clozeData.answers[answerLang];
        
        return (card as any)[questionLang] && (card as any)[answerLang];
    });
}

function prepareQuizCardsNEW(cards: Flashcard[], questionLang: string, answerLang: string) {
    return cards.filter(card => hasRequiredLanguages(card, questionLang, answerLang));
}

// Exemple: Extraire les langues disponibles
function detectLanguagesOLD(cards: Flashcard[]): string[] {
    const languages = new Set<string>();
    
    cards.forEach(card => {
        const terms = (card as any).terms;
        const mcqData = (card as any).mcqData;
        const clozeData = (card as any).clozeData;
        
        if (terms) Object.keys(terms).forEach(lang => languages.add(lang));
        if (mcqData) {
            Object.keys(mcqData.question).forEach(lang => languages.add(lang));
            Object.keys(mcqData.answer).forEach(lang => languages.add(lang));
        }
        if (clozeData) {
            Object.keys(clozeData.text).forEach(lang => languages.add(lang));
        }
    });
    
    return Array.from(languages);
}

function detectLanguagesNEW(cards: Flashcard[]): string[] {
    const languages = new Set<string>();
    cards.forEach(card => {
        getAvailableLanguages(card).forEach(lang => languages.add(lang));
    });
    return Array.from(languages);
}

// Exemple: Type Guards pour un traitement spécifique
function processCardOLD(card: Flashcard) {
    if (card.type === 'mcq' && (card as any).mcqData) {
        const mcqData = (card as any).mcqData;
        // Traiter le QCM
        console.log('Question:', mcqData.question);
        console.log('Réponse:', mcqData.answer);
        console.log('Distracteurs:', mcqData.distractors);
    }
}

function processCardNEW(card: Flashcard) {
    if (isFlashcardMCQ(card)) {
        // TypeScript SAIT que card.mcqData existe
        console.log('Question:', card.mcqData.question);
        console.log('Réponse:', card.mcqData.answer);
        console.log('Distracteurs:', card.mcqData.distractors);
        // IntelliSense fonctionne parfaitement ici !
    }
}

// Exemple: Extraire les distracteurs pour un QCM
function setupMCQOptionsOLD(card: Flashcard, lang: string): string[] {
    if (card.type === 'mcq' && (card as any).mcqData?.distractors) {
        const distractors = (card as any).mcqData.distractors
            .map((d: any) => d[lang] || Object.values(d)[0])
            .filter((val: any) => typeof val === 'string' && val.length > 0);
        
        const answer = (card as any).mcqData.answer[lang];
        return [answer, ...distractors].sort(() => Math.random() - 0.5);
    }
    return [];
}

function setupMCQOptionsNEW(card: Flashcard, lang: string): string[] {
    const answer = getAnswerText(card, lang);
    const distractors = getDistractors(card, lang);
    
    return [answer, ...distractors].sort(() => Math.random() - 0.5);
}

// ============================================
// 3. EXEMPLE COMPLET: Refactoring d'un Hook
// ============================================

// AVANT: Hook avec beaucoup de casts et duplication
function useQuizPreparationOLD() {
    const { config } = useAIConfig();
    
    const prepareQuiz = async (cards: Flashcard[], topic: string) => {
        // Configuration IA (dupliquée)
        let apiKey = '';
        let modelName = '';
        switch (config.provider) {
            case 'gemini':
                apiKey = config.geminiApiKey;
                modelName = config.geminiModel;
                break;
            // ... 20 lignes de plus
        }
        
        // Filtrage des cartes (casts dangereux)
        const validCards = cards.filter(card => {
            const terms = (card as any).terms;
            return terms && terms['fr'] && terms['en'];
        });
        
        // Extraction de données (casts dangereux)
        const questions = validCards.map(card => {
            const terms = (card as any).terms;
            return terms['fr'];
        });
        
        return { validCards, questions };
    };
    
    return { prepareQuiz };
}

// APRÈS: Hook propre et type-safe
function useQuizPreparationNEW() {
    const { config } = useAIConfig();
    
    const prepareQuiz = async (cards: Flashcard[], topic: string) => {
        // Configuration IA (centralisée)
        const { apiKey, modelName, apiUrl } = getAIClientConfig(config);
        
        // Filtrage des cartes (type-safe)
        const validCards = cards.filter(card => 
            hasRequiredLanguages(card, 'fr', 'en')
        );
        
        // Extraction de données (type-safe)
        const questions = validCards.map(card => 
            getQuestionText(card, 'fr')
        );
        
        return { validCards, questions };
    };
    
    return { prepareQuiz };
}

// ============================================
// 4. MIGRATION PROGRESSIVE
// ============================================

/**
 * Vous n'avez pas besoin de tout refactorer d'un coup !
 * Stratégie recommandée:
 * 
 * 1. Commencez par les nouveaux composants/hooks
 * 2. Refactorez les fichiers que vous modifiez déjà
 * 3. Priorisez les endroits avec le plus de duplication
 * 4. Les deux approches peuvent coexister temporairement
 */

// Exemple de coexistence
function hybridFunction(card: Flashcard, lang: string) {
    // Nouveau code (préféré)
    const question = getQuestionText(card, lang);
    
    // Ancien code (à migrer progressivement)
    const oldAnswer = (card as any).terms?.[lang] || '';
    
    // Les deux fonctionnent ensemble sans problème
    return { question, oldAnswer };
}

export {};
