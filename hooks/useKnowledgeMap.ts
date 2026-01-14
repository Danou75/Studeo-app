import { useMemo } from 'react';
import { Flashcard } from '../types';

export interface KnowledgeNode {
    id: string;
    label: string;
    size: number; // Based on number of cards
    mastery: number; // 0-1, Based on SRS data
    x: number;
    y: number;
    color: string;
}

export interface KnowledgeEdge {
    source: string;
    target: string;
    value: number;
}

export const useKnowledgeMap = (flashcardSets: Record<string, Flashcard[]>) => {
    const mapData = useMemo(() => {
        const nodes: KnowledgeNode[] = [];
        const edges: KnowledgeEdge[] = [];
        
        const setNames = Object.keys(flashcardSets);
        const center = { x: 500, y: 500 };
        const radius = 300;

        setNames.forEach((name, index) => {
            const cards = flashcardSets[name];
            if (cards.length === 0) return;

            // Calculate Mastery
            const mastery = cards.reduce((acc, card) => {
                const srs = card.srsData;
                if (!srs) return acc;
                // Mastery is a mix of repetitions and interval
                const cardMastery = Math.min(1, (srs.repetitions * 0.2) + (srs.interval / 30));
                return acc + cardMastery;
            }, 0) / cards.length;

            // Simple Circle Layout
            const angle = (index / setNames.length) * 2 * Math.PI;
            const x = center.x + radius * Math.cos(angle);
            const y = center.y + radius * Math.sin(angle);

            nodes.push({
                id: name,
                label: name,
                size: 20 + Math.sqrt(cards.length) * 5,
                mastery,
                x,
                y,
                color: mastery > 0.8 ? 'var(--color-success)' : mastery > 0.4 ? 'var(--color-info)' : 'var(--color-warning)'
            });
        });

        // Simple edges based on shared languages (heuristic)
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const setA = flashcardSets[nodes[i].id];
                const setB = flashcardSets[nodes[j].id];
                
                // If they share some languages or tutor patterns (simplified)
                const langsA = new Set(setA.flatMap(c => c.type === 'classic' ? Object.keys(c.terms) : []));
                const langsB = new Set(setB.flatMap(c => c.type === 'classic' ? Object.keys(c.terms) : []));
                
                const intersection = Array.from(langsA).filter(x => langsB.has(x));
                if (intersection.length > 0) {
                    edges.push({
                        source: nodes[i].id,
                        target: nodes[j].id,
                        value: intersection.length
                    });
                }
            }
        }

        return { nodes, edges };
    }, [flashcardSets]);

    return mapData;
};
