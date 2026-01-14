import { Flashcard } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeHtml } from '../utils/security';

// Security constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CARDS = 10000;
const ALLOWED_EXTENSIONS = ['.json', '.csv', '.md'];

const sanitizeString = (str: any): string => {
    if (typeof str !== 'string') return '';
    // Sanitize HTML and limit length
    const sanitized = sanitizeHtml(str);
    return sanitized.slice(0, 1000).trim();
};

const parseJson = (content: string): Flashcard[] => {
    let data;
    try {
        data = JSON.parse(content);
    } catch (e) {
        throw new Error("JSON invalide");
    }

    if (!Array.isArray(data)) {
        throw new Error("Le fichier JSON doit contenir un tableau d'objets.");
    }

    if (data.length > MAX_CARDS) {
        throw new Error(`Trop de cartes (max ${MAX_CARDS})`);
    }

    return data.map((item: any, index: number): Flashcard | null => {
        if (typeof item !== 'object' || item === null) {
            console.warn(`Item ${index} ignoré: pas un objet`);
            return null;
        }

        // AUTO-DETECT HEADER: If the first few items have values equal to their keys (e.g. {"fr": "fr"}), skip them
        // This often happens with JSON files converted from CSV with headers.
        const keys = Object.keys(item);
        if (keys.length > 0 && keys.every(k => typeof item[k] === 'string' && item[k].toLowerCase().trim() === k.toLowerCase().trim())) {
             console.info(`Item ${index} détecté comme en-tête et ignoré :`, item);
             return null;
        }

        const id = uuidv4();
        const type = typeof item.type === 'string' ? item.type.trim().toLowerCase() : undefined;
        
        // UNIFIED: Handle various classic card formats
        if (type === 'fill-in-the-blank' || type === 'term-translation') {
            if (typeof item.front === 'string' && typeof item.back === 'string') {
                return {
                    id,
                    type: 'classic',
                    terms: {
                        recto: sanitizeString(item.front),
                        verso: sanitizeString(item.back),
                    }
                };
            }
            return null;
        }

        // Case 1: Import for "multiple-choice" format
        if (type === 'multiple-choice') {
            if (
                typeof item.front === 'string' &&
                typeof item.back === 'string' &&
                Array.isArray(item.options) &&
                item.options.every((opt: unknown) => typeof opt === 'string')
            ) {
                const langKey = 'fr'; 
                return {
                    id,
                    type: 'mcq',
                    mcqData: {
                        question: { [langKey]: sanitizeString(item.front) },
                        answer: { [langKey]: sanitizeString(item.back) },
                        distractors: item.options.map((opt: string) => ({ [langKey]: sanitizeString(opt) })),
                    }
                };
            }
            return null;
        }

        // Case 2: Native MCQ Card format
        if (type === 'mcq') {
            const { mcqData } = item;
            if (
                mcqData &&
                typeof mcqData.question === 'object' && mcqData.question !== null &&
                typeof mcqData.answer === 'object' && mcqData.answer !== null
            ) {
                const sanitizedQuestion: Record<string, string> = {};
                Object.entries(mcqData.question).forEach(([k, v]) => {
                    sanitizedQuestion[sanitizeString(k)] = sanitizeString(v);
                });

                const sanitizedAnswer: Record<string, string> = {};
                Object.entries(mcqData.answer).forEach(([k, v]) => {
                    sanitizedAnswer[sanitizeString(k)] = sanitizeString(v);
                });

                // Validate we have at least one question/answer pair
                if (Object.keys(sanitizedQuestion).length === 0 || Object.keys(sanitizedAnswer).length === 0) return null;

                return { 
                    id, 
                    type: 'mcq', 
                    mcqData: {
                        question: sanitizedQuestion,
                        answer: sanitizedAnswer,
                        distractors: Array.isArray(mcqData.distractors) 
                            ? mcqData.distractors.map((d: any) => {
                                const sanitizedD: Record<string, string> = {};
                                Object.entries(d).forEach(([k, v]) => {
                                    sanitizedD[sanitizeString(k)] = sanitizeString(v);
                                });
                                return sanitizedD;
                            }).filter((d: any) => Object.keys(d).length > 0)
                            : []
                    } 
                };
            }
            return null;
        } 
        
        // Case 3: Classic Card (with explicit type)
        if (type === 'classic') {
            if (item.terms && typeof item.terms === 'object' && item.terms !== null) {
                const sanitizedTerms: Record<string, string> = {};
                Object.entries(item.terms).forEach(([k, v]) => {
                    const sk = sanitizeString(k);
                    const sv = sanitizeString(v);
                    if (sk && sv) sanitizedTerms[sk] = sv;
                });
                
                if (Object.keys(sanitizedTerms).length > 0) {
                    return { id, type: 'classic', terms: sanitizedTerms };
                }
            }
            return null;
        }

        // Case 4: Backward compatibility
        if (!type) {
            let terms: Record<string, string> | undefined = undefined;

            if (item.terms && typeof item.terms === 'object' && item.terms !== null) {
                terms = item.terms;
            } else if (Object.keys(item).length > 0 && !item.terms && !item.mcqData && !item.type) {
                // Check if it looks like a simple key-value pair object
                if (Object.values(item).every(v => typeof v === 'string')) {
                    terms = item;
                }
            }

            if (terms) {
                const sanitizedTerms: Record<string, string> = {};
                Object.entries(terms).forEach(([k, v]) => {
                    const sk = sanitizeString(k);
                    const sv = sanitizeString(v);
                    if (sk && sv) sanitizedTerms[sk] = sv;
                });
                if (Object.keys(sanitizedTerms).length > 0) {
                    return { id, type: 'classic', terms: sanitizedTerms };
                }
            }
        }
        
        return null;

    }).filter((card): card is Flashcard => card !== null);
};

const parseCsv = (content: string): Flashcard[] => {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) {
        throw new Error("CSV must have a header row and at least one data row.");
    }
    // Limit lines
    if (lines.length > MAX_CARDS + 1) {
         throw new Error(`Trop de lignes dans le CSV (max ${MAX_CARDS})`);
    }

    const header = lines[0].split(',').map(h => sanitizeString(h.trim()));
    const flashcards: Flashcard[] = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => sanitizeString(v.trim()));
        if (values.length !== header.length) continue;
        const terms: Record<string, string> = {};
        header.forEach((lang, index) => {
            if (lang) terms[lang] = values[index];
        });
        if (Object.keys(terms).length > 0) {
            flashcards.push({ id: uuidv4(), type: 'classic', terms });
        }
    }
    return flashcards;
};

const parseMarkdown = (content: string): Flashcard[] => {
    const lines = content.trim().split(/\r?\n/);
    // Limit lines
    if (lines.length > MAX_CARDS + 2) {
         throw new Error(`Trop de lignes dans le Markdown (max ${MAX_CARDS})`);
    }

    const headerMatch = lines[0].match(/\|(.+)\|/);
    if (!headerMatch) throw new Error("Markdown must be a table with a header.");
    
    const header = headerMatch[1].split('|').map(h => sanitizeString(h.trim()));
    const flashcards: Flashcard[] = [];

    for (let i = 2; i < lines.length; i++) { 
        const rowMatch = lines[i].match(/\|(.+)\|/);
        if (!rowMatch) continue;
        const values = rowMatch[1].split('|').map(v => sanitizeString(v.trim()));
        if (values.length !== header.length) continue;

        const terms: Record<string, string> = {};
        header.forEach((lang, index) => {
            if (lang) terms[lang] = values[index];
        });
        if (Object.keys(terms).length > 0) {
            flashcards.push({ id: uuidv4(), type: 'classic', terms });
        }
    }
    return flashcards;
};

export const parseFile = (file: File): Promise<{ flashcards: Flashcard[]; name: string }> => {
    return new Promise((resolve, reject) => {
        // 1. Verify extension
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            reject(new Error(`Extension non autorisée. Utilisez: ${ALLOWED_EXTENSIONS.join(', ')}`));
            return;
        }

        // 2. Verify size
        if (file.size > MAX_FILE_SIZE) {
            reject(new Error(`Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`));
            return;
        }

        // 3. Verify MIME type (basic check)
        const allowedMimeTypes = [
            'application/json',
            'text/csv',
            'text/markdown',
            'text/plain' // Markdown/CSV often show up as text/plain
        ];
        if (file.type && !allowedMimeTypes.includes(file.type) && file.type !== '') {
             // Note: file.type can be empty for some files on some OSs, so we allow empty if extension is correct
             console.warn(`MIME type mismatch: ${file.type}`);
        }

        const reader = new FileReader();
        const fileName = file.name.replace(/\.(json|csv|md)$/i, '').trim();

        // 4. Timeout
        const timeout = setTimeout(() => {
            reader.abort();
            reject(new Error("Timeout lors de la lecture du fichier"));
        }, 30000);

        reader.onload = (event) => {
            clearTimeout(timeout);
            try {
                const content = event.target?.result as string;

                // 5. Verify content length
                if (content.length > MAX_FILE_SIZE) {
                    reject(new Error("Contenu du fichier trop volumineux"));
                    return;
                }

                let flashcards: Flashcard[] = [];

                if (file.name.endsWith('.json')) {
                    flashcards = parseJson(content);
                } else if (file.name.endsWith('.csv')) {
                    flashcards = parseCsv(content);
                } else if (file.name.endsWith('.md')) {
                    flashcards = parseMarkdown(content);
                } else {
                    reject(new Error("Type de fichier non supporté"));
                    return;
                }

                // 6. Verify card count
                if (flashcards.length > MAX_CARDS) {
                    reject(new Error(`Trop de cartes (max ${MAX_CARDS})`));
                    return;
                }

                if (flashcards.length === 0) {
                    reject(new Error("Aucune carte valide trouvée dans le fichier"));
                    return;
                }

                resolve({ flashcards, name: fileName });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("Erreur lors de la lecture du fichier"));
        };

        reader.readAsText(file);
    });
};
