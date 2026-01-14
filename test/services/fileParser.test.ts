import { describe, it, expect, beforeEach } from 'vitest';
import { parseFile } from '../../services/fileParser';

describe('fileParser', () => {
    describe('Security Validations', () => {
        it('should reject files with invalid extensions', async () => {
            const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
            
            await expect(parseFile(file)).rejects.toThrow('Extension non autorisée');
        });

        it('should reject files exceeding size limit', async () => {
            const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
            const file = new File([largeContent], 'test.json', { type: 'application/json' });
            
            await expect(parseFile(file)).rejects.toThrow('Fichier trop volumineux');
        });

        it('should accept valid JSON files', async () => {
            const validJson = JSON.stringify([
                {
                    type: 'classic',
                    terms: { fr: 'Bonjour', en: 'Hello' }
                }
            ]);
            const file = new File([validJson], 'test.json', { type: 'application/json' });
            
            const result = await parseFile(file);
            expect(result.flashcards).toHaveLength(1);
            expect(result.flashcards[0].type).toBe('classic');
        });

        it('should accept valid CSV files', async () => {
            const csvContent = 'fr,en\nBonjour,Hello\nAu revoir,Goodbye';
            const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
            
            const result = await parseFile(file);
            expect(result.flashcards).toHaveLength(2);
        });

        it('should accept valid Markdown files', async () => {
            const mdContent = '| fr | en |\n|-----|-----|\n| Bonjour | Hello |';
            const file = new File([mdContent], 'test.md', { type: 'text/markdown' });
            
            const result = await parseFile(file);
            expect(result.flashcards.length).toBeGreaterThan(0);
        });
    });

    describe('JSON Parsing', () => {
        it('should parse classic flashcards', async () => {
            const jsonContent = JSON.stringify([
                {
                    type: 'classic',
                    terms: { fr: 'Chat', en: 'Cat' }
                }
            ]);
            const file = new File([jsonContent], 'test.json', { type: 'application/json' });
            
            const result = await parseFile(file);
            expect(result.flashcards[0].type).toBe('classic');
            if (result.flashcards[0].type === 'classic') {
                expect(result.flashcards[0].terms?.fr).toBe('Chat');
            }
        });

        it('should parse MCQ flashcards', async () => {
            const jsonContent = JSON.stringify([
                {
                    type: 'mcq',
                    mcqData: {
                        question: { fr: 'Quelle est la capitale?' },
                        answer: { fr: 'Paris' },
                        distractors: []
                    }
                }
            ]);
            const file = new File([jsonContent], 'test.json', { type: 'application/json' });
            
            const result = await parseFile(file);
            expect(result.flashcards[0].type).toBe('mcq');
        });

        it('should reject invalid JSON structure', async () => {
            const invalidJson = '{"not": "an array"}';
            const file = new File([invalidJson], 'test.json', { type: 'application/json' });
            
            await expect(parseFile(file)).rejects.toThrow();
        });

        it('should sanitize string inputs', async () => {
            const jsonWithScript = JSON.stringify([
                {
                    type: 'classic',
                    terms: { fr: '<script>alert("xss")</script>Bonjour', en: 'Hello' }
                }
            ]);
            const file = new File([jsonWithScript], 'test.json', { type: 'application/json' });
            
            const result = await parseFile(file);
            if (result.flashcards[0].type === 'classic') {
                // Script tags should be removed or escaped
                expect(result.flashcards[0].terms?.fr.toLowerCase()).not.toMatch(/<script[\s>]/);
            }
        });
    });

    describe('CSV Parsing', () => {
        it('should parse simple CSV', async () => {
            const csvContent = 'fr,en\nUn,One\nDeux,Two';
            const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
            
            const result = await parseFile(file);
            expect(result.flashcards).toHaveLength(2);
        });

        it('should handle CSV with headers', async () => {
            const csvContent = 'French,English\nBonjour,Hello';
            const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
            
            const result = await parseFile(file);
            expect(result.flashcards.length).toBeGreaterThan(0);
        });

        it('should reject CSV exceeding card limit', async () => {
            const rows = Array(11000).fill('fr,en').join('\n');
            const file = new File([rows], 'test.csv', { type: 'text/csv' });
            
            await expect(parseFile(file)).rejects.toThrow('Trop de lignes dans le CSV');
        });
    });

    describe('Markdown Parsing', () => {
        it('should parse markdown flashcards', async () => {
            const mdContent = '| fr | en |\n|-----|-----|\n| Bonjour | Hello |';
            const file = new File([mdContent], 'test.md', { type: 'text/markdown' });
            
            const result = await parseFile(file);
            expect(result.flashcards.length).toBeGreaterThan(0);
        });

        it('should handle empty markdown', async () => {
            const mdContent = '# Empty';
            const file = new File([mdContent], 'test.md', { type: 'text/markdown' });
            
            await expect(parseFile(file)).rejects.toThrow();
        });
    });
});
