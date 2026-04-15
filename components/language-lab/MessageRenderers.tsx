import React from 'react';
import { ExerciseCard, VocabExercise } from '../VocabularyLabTab';

// ---------------------------------------------------------------------------
// MdRenderer : rendu Markdown fiable sans dépendance à react-markdown
// ---------------------------------------------------------------------------
export const mdToHtml = (text: string): string => {
    // 1. Uniformiser les sauts de ligne
    let cleanText = text.replace(/\r\n/g, '\n').trim();
    
    // 2. Supprimer agressivement le surplus si l'IA a fait l'erreur d'encadrer sa réponse
    // Exemple : "Voici la leçon :\n```markdown\n(leçon)\n```"
    // On extrait le contenu du plus grand bloc s'il fait plus de 60% du texte global
    const globalCodeBlockRegex = /(?:^|\n)```[a-zA-Z]*\n([\s\S]+?)\n```(?:$|\n)/;
    const match = cleanText.match(globalCodeBlockRegex);
    if (match && match[1].length > cleanText.length * 0.6) {
        cleanText = cleanText.replace(globalCodeBlockRegex, '\n$1\n').trim();
    }

    // 3. Cas extrême : si ça commence quand même par un truc genre ```markdown (sans bloc complet trouvé par le regex)
    cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();

    let html = cleanText
        // Échapper le HTML (sécurité basique)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Blocs de code (avant inline) - ajout de whitespace-pre-wrap pour éviter de tronquer
        .replace(/```[\w]*\n?([\s\S]*?)```/gm, '<pre class="bg-gray-100 dark:bg-gray-900 rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono whitespace-pre-wrap word-break break-words"><code>$1</code></pre>')
        // Code inline
        .replace(/`([^`\n]+)`/g, '<code class="bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary rounded px-1 py-0.5 text-xs font-mono">$1</code>')
        // Titres (ordre important : du plus profond au moins profond)
        .replace(/^##### (.+)$/gm, '<h5 class="text-xs font-bold mt-3 mb-1" style="color:var(--color-text)">$1</h5>')
        .replace(/^#### (.+)$/gm, '<h4 class="text-sm font-bold mt-4 mb-1.5" style="color:var(--color-text)">$1</h4>')
        .replace(/^### (.+)$/gm, '<h3 class="text-base font-extrabold mt-4 mb-2" style="color:var(--color-text)">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-lg font-black mt-5 mb-2 text-primary dark:text-primary">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-xl font-black mt-4 mb-3 pb-2 border-b text-primary dark:text-primary border-primary/30 dark:border-primary">$1</h1>')
        // HR
        .replace(/^---$/gm, '<hr class="border-gray-200 dark:border-gray-700 my-4"/>')
        // Blockquote
        .replace(/^&gt; (.+)$/gm, '<div class="border-l-4 border-primary pl-4 py-1 my-1 rounded-r-lg italic text-sm bg-primary/10" style="color:var(--color-text-secondary)">$1</div>')
        // Gras + italique combinés
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        // Gras
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold" style="color:var(--color-text)">$1</strong>')
        // Italique (permissif)
        .replace(/\*([^*]+)\*/g, '<em class="italic" style="color:var(--color-text-secondary)">$1</em>')
        // Tableaux GFM (simplifié)
        .replace(/^\|(.+)\|$/gm, (row) => {
            const cells = row.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
            return '<tr>' + cells.map(c => `<td class="border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs">${c.trim()}</td>`).join('') + '</tr>';
        })
        .replace(/(<tr>.*<\/tr>\n?)+/gs, (t) => `<div class="overflow-x-auto my-2"><table class="min-w-full border-collapse text-xs">${t}</table></div>`)
        // Listes non-ordonnées
        .replace(/^[-*] (.+)$/gm, '<li class="text-sm leading-relaxed ml-4 list-disc" style="color:var(--color-text)">$1</li>')
        // Listes ordonnées
        .replace(/^\d+\. (.+)$/gm, '<li class="text-sm leading-relaxed ml-4 list-decimal" style="color:var(--color-text)">$1</li>')
        // Grouper les <li> consécutifs
        .replace(/(<li[^>]*>.*<\/li>\n?)+/gs, (list) => `<ul class="pl-2 mb-3 space-y-0.5">${list}</ul>`)
        // Paragraphes : double saut de ligne → <p>
        .replace(/\n\n(?!<[hpulodtb])/g, '</p><p class="text-sm leading-relaxed mb-3" style="color:var(--color-text)">')
        // Sauts de ligne simples restants
        .replace(/\n(?!<)/g, '<br/>');
    return `<p class="text-sm leading-relaxed mb-3" style="color:var(--color-text)">${html}</p>`;
};

export const MdRenderer: React.FC<{content: string}> = React.memo(({ content }) => (
    <div
        className="remedial-md-content"
        dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
    />
));

export const InteractiveMessageRenderer: React.FC<{content: string}> = React.memo(({ content }) => {
    let markdownContent = content;
    let exercises: VocabExercise[] = [];
    
    try {
        const jsonBlockRegex = /```json\n([\s\S]*?)\n```/;
        const match = content.match(jsonBlockRegex);
        if (match) {
            const parsed = JSON.parse(match[1]);
            if (parsed && Array.isArray(parsed.exercises)) {
                exercises = parsed.exercises;
            }
            markdownContent = content.replace(jsonBlockRegex, '').trim();
        }
    } catch (e) {
        console.warn('Failed to parse embedded JSON in message', e);
    }
    
    return (
        <div className="flex flex-col gap-4 w-full">
            {markdownContent && <MdRenderer content={markdownContent} />}
            {exercises.length > 0 && (
                <div className="flex flex-col gap-3 mt-4 w-full">
                    {exercises.map((ex, i) => (
                        <div key={i} className="mb-2">
                            <ExerciseCard exercise={ex} index={i} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
