import { useMemo } from 'react';
import { Flashcard } from '../types';

export const useColumns = (allFlashcards: Flashcard[]) => {
    return useMemo(() => {
        const columnSet = new Set<string>();
        allFlashcards.forEach(card => {
            if (!card) return;
            // Support legacy cards without explicit 'type' or with slightly different structure
            const terms = (card as any).terms;
            const mcqData = (card as any).mcqData;
            const clozeData = (card as any).clozeData;

            if (terms) {
                Object.keys(terms).forEach(col => col && columnSet.add(col));
            } 
            if (mcqData) {
                if (mcqData.question) Object.keys(mcqData.question).forEach(col => col && columnSet.add(col));
                if (mcqData.answer) Object.keys(mcqData.answer).forEach(col => col && columnSet.add(col));
            } 
            if (clozeData) {
                if (clozeData.text) Object.keys(clozeData.text).forEach(col => col && columnSet.add(col));
            }

            // Fallback: If no columns found yet, try top-level keys (excluding internal properties)
            if (!terms && !mcqData && !clozeData) {
                Object.keys(card).forEach(key => {
                    if (!['id', 'type', 'srsData', 'mnemonic'].includes(key)) {
                        columnSet.add(key);
                    }
                });
            }
        });
        return Array.from(columnSet);
    }, [allFlashcards]);
};
