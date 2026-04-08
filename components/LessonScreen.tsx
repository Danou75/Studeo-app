import React from 'react';
import { Lesson } from '../types';
import { Button } from './ui/Button';
import { TUTORS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { AILoader } from './AILoader';

import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { markdownToRTF } from '../utils/rtfExport';
import { exercisesToRTF } from '../utils/exerciseExport';

interface LessonScreenProps {
  lesson: Lesson;
  onBack: () => void;
  onHome?: () => void;
  onSave?: (lesson: Lesson) => void; 
  onNewLesson?: (topic: string) => void;
  onStartQuiz?: (cards: any[]) => void;
  onGenerateExercises?: () => void;
  onGenerateQuiz?: () => void;
  onNavigateToSettings?: () => void;
}

export const LessonScreen: React.FC<LessonScreenProps> = ({ lesson, onBack, onHome, onSave, onNewLesson, onStartQuiz, onGenerateExercises, onGenerateQuiz, onNavigateToSettings }) => {
  const { showToast } = useToast();
  const tutor = TUTORS.find(t => t.id === lesson.tutorId);

  // Panneau de lien externe (solution fiable iOS PWA)
  const [pendingUrl, setPendingUrl] = React.useState<string | null>(null);

  // Extraction des suggestions "Pour aller plus loin" avec détection robuste
  const suggestions = React.useMemo(() => {
    const lines = lesson.content.split('\n');
    
    // On cherche l'index du titre de fin (doit être un titre MD avec #)
    const suggestionsIndex = lines.findIndex(l => {
        const line = l.trim();
        if (!line.startsWith('#')) return false; // On ne cherche que dans les titres
        
        const lower = line.toLowerCase().replace(/#/g, '').trim();
        return lower.includes('pour aller plus loin') || 
               lower.includes('sujets connexes') || 
               lower.includes('approfondir') || 
               lower.includes('ressources');
    });
    
    if (suggestionsIndex === -1) return [];
    
    const extracted: { text: string; url?: string }[] = [];
    
    for (let i = suggestionsIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Ignorer les lignes de séparation style "---" ou "***"
        if (/^[-*_]{3,}$/.test(line)) continue;

        if (/^[-*]/.test(line) || /^\d+\./.test(line)) {
            // Tentative d'extraction de lien Markdown [Texte](URL)
            const linkMatch = line.match(/\[(.*?)\]\((.*?)\)/);
            
            if (linkMatch) {
                extracted.push({
                    text: linkMatch[1],
                    url: linkMatch[2]
                });
            } else {
                // Texte simple
                let text = line.replace(/^[-*]|\d+\./, '').trim();
                text = text.replace(/\*\*/g, '');
                
                // Ne garder que si le texte est substantiel (pas juste -- ou *)
                if (text && text.replace(/[^a-zA-Z0-9]/g, '').length > 1) {
                    extracted.push({ text });
                }
            }
        }
        // Si on croise un autre titre de haut niveau, on arrête
        if (line.startsWith('#') && !line.startsWith('###')) break;
    }
    return extracted.slice(0, 5);
  }, [lesson.content]);

  const openLink = (url: string) => {
    let finalUrl = url;

    // Détection stricte : VIEUX iPad PWA uniquement (iPad Air 2 s'arrête à iOS 15)
    // À partir d'iOS 16, les PWA gèrent mieux "target=_blank" et Perplexity.
    // L'astuce : Safari 16 a introduit Array.prototype.toReversed. S'il n'existe pas, c'est iOS <= 15.
    const isOldIPadPwa = () => {
        const isPwa = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        const isIPad = /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isOldIOS = typeof (Array.prototype as any).toReversed === 'undefined';
        return isPwa && isIPad && isOldIOS;
    };

    // Transforme les liens Google/Perplexity en DuckDuckGo UNIQUEMENT sur vieux iPad PWA
    if (isOldIPadPwa() && (url.includes('google.com/search') || url.includes('google.fr/search') || url.includes('perplexity.ai/search'))) {
        try {
            const match = url.match(/[?&]q=([^&]+)/);
            if (match && match[1]) {
                finalUrl = `https://duckduckgo.com/?q=${match[1]}`;
            }
        } catch (e) { /* ignore */ }
    }

    // Ajout du protocole si manquant
    if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
    }

    // App Tauri (desktop) : ouvrir directement via le shell natif
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        import('@tauri-apps/api/shell').then(({ open }) => open(finalUrl)).catch(console.error);
        return;
    }

    // Ouverture directe (iPhone, Mac Vercel, Android, iPad récents iOS 16+)
    if (!isOldIPadPwa()) {
        const a = document.createElement('a');
        a.href = finalUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    // Sur VIEUX iPad PWA (où l'ouverture directe fait un écran blanc bloqué) :
    // On affiche le panneau de lien ("Ouvrir" / "Copier").
    setPendingUrl(finalUrl);
  };

  // Ferme le panneau de lien (avec un léger délai pour laisser le temps au clic natif de se propager)
  const closeLinkPanel = () => {
    setTimeout(() => setPendingUrl(null), 100);
  };

  // Copie l'URL dans le presse-papier (fallback si l'utilisateur préfère coller dans Safari)
  const copyLinkToClipboard = () => {
    if (!pendingUrl) return;
    navigator.clipboard.writeText(pendingUrl)
      .then(() => { showToast('URL copiée ! Collez-la dans Safari.', 'success'); })
      .catch(() => { showToast(pendingUrl!, 'info', 8000); });
    setPendingUrl(null);
  };

  const [isExporting, setIsExporting] = React.useState(false);
  const [isGeneratingExercises, setIsGeneratingExercises] = React.useState(false);

  // Sauvegarde native avec Tauri (MD ou RTF)
  const handleExport = async (format: 'md' | 'rtf') => {
      if (isExporting) return;
      setIsExporting(true);
      
      try {
          // @ts-ignore
          if (window.__TAURI_IPC__) {
            const baseName = lesson.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filePath = await save({
                defaultPath: `${baseName}.${format}`,
                filters: [
                    { 
                        name: format === 'md' ? 'Markdown' : 'Rich Text Format', 
                        extensions: [format] 
                    }
                ]
            });
            
            if (filePath) {
                const finalContent = format === 'md' ? lesson.content : markdownToRTF(lesson.content, lesson.topic);
                await writeTextFile(filePath, finalContent);
                showToast(`Fichier .${format} enregistré avec succès !`, 'success');
            }
          } else {
             // Fallback Web
             if (format === 'md') {
                onSave && onSave(lesson);
             } else {
                const content = markdownToRTF(lesson.content, lesson.topic);
                const blob = new Blob([content], { type: 'application/rtf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lecon_${lesson.topic.replace(/\s+/g, '_')}.rtf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('Fichier .rtf généré !', 'success');
             }
          }
      } catch (e) {
          console.error("Erreur d'exportation:", e);
          showToast("Erreur lors de l'export.", 'error');
      } finally {
          setIsExporting(false);
      }
  };

  const cleanupMarkdownForShare = (text: string) => {
    return text
        .replace(/^#+ (.*)$/gm, (_, p1) => p1.toUpperCase())
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^- (.*)$/gm, '• $1')
        .trim();
  };

  const handleShare = async () => {
    const shareData = {
        title: lesson.topic,
        text: `${lesson.topic.toUpperCase()}\n\n${cleanupMarkdownForShare(lesson.content)}\n\nPartagé via Studeo`,
    };
    
    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.error('Erreur de partage:', err);
                showToast("Erreur lors du partage", "error");
            }
        }
    } else {
        showToast("Le partage n'est pas supporté sur cet appareil", "info");
    }
  };

  // Fonction simple pour parser le Markdown basique
  // Note: Dans une application plus complexe, utiliser react-markdown
  // Fonction pour parser le Markdown améiorée
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lower = line.toLowerCase();
        
        // Arrêt si section suggestions (détection plus robuste pour éviter le doublon)
        const isSuggestionTitle = lower.includes('pour aller plus loin') || 
                                 lower.includes('sujets connexes') || 
                                 lower.includes('approfondir') || 
                                 lower.includes('ressources');

        if (suggestions.length > 0 && (line.startsWith('#') || line.startsWith('**') || line.startsWith('📚')) && isSuggestionTitle) {
            break;
        }

        // Style spécial pour les suggestions si elles sont dans le corps du texte (cas où suggestionsIndex non utilisé ou format spécifique)
        if ((line.trim().startsWith('📚') || lower.includes('pour aller plus loin')) && !line.startsWith('#')) {
             const suggestionGroup: string[] = [line];
             let j = index + 1;
             while (j < lines.length) {
                 const nextLine = lines[j].trim();
                 if (!nextLine) { j++; continue; } // Ignorer les lignes vides internes
                 if (nextLine.startsWith('#')) break; // Prochain titre = fin du bloc
                 
                 // On accepte les listes et le texte simple
                 if (nextLine.startsWith('-') || nextLine.startsWith('*') || nextLine.startsWith('•') || nextLine.length > 0) {
                     suggestionGroup.push(lines[j]);
                     j++;
                 } else {
                     break;
                 }
             }
             index = j - 1;

             elements.push(
                 <div key={index} className="my-6 p-6 bg-green-500/5 dark:bg-green-500/10 border border-green-500/20 rounded-2xl shadow-sm animate-in fade-in zoom-in-95">
                     <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                         <i className="fas fa-lightbulb"></i> {formatRichText(suggestionGroup[0])}
                     </h3>
                     <ul className="space-y-2">
                         {suggestionGroup.slice(1).map((sLine, sIdx) => {
                             const content = sLine.trim().replace(/^[-*•]\s+/, '');
                             if (!content) return null;
                             return (
                                <li key={sIdx} className="flex items-start gap-2 text-text/80 transition-all hover:translate-x-1">
                                    <span className="text-green-500 mt-1">●</span>
                                    <span className="flex-1">{formatRichText(content)}</span>
                                </li>
                             );
                         })}
                     </ul>
                 </div>
             );
             continue;
        }

        // Nettoyage titres (dates)
        let cleanLine = line;
        if (tutor && tutor.category !== 'languages' && line.trim().startsWith('#')) {
             const trimmed = line.trim();
             const lastParenClose = trimmed.lastIndexOf(')');
             const lastParenOpen = trimmed.lastIndexOf('(');
             if (lastParenClose > lastParenOpen && lastParenOpen !== -1 && lastParenClose > trimmed.length - 5) {
                const contentInside = trimmed.slice(lastParenOpen + 1, lastParenClose);
                if (!/\d/.test(contentInside)) cleanLine = trimmed.slice(0, lastParenOpen).trim();
             }
        }

        // H1
        if (cleanLine.startsWith('# ')) {
            elements.push(<h1 key={index} className="text-3xl font-bold text-primary mt-6 mb-4">{formatRichText(cleanLine.replace('# ', ''))}</h1>);
            continue;
        }
        // H2
        if (cleanLine.startsWith('## ')) {
            elements.push(<h2 key={index} className="text-2xl font-semibold text-secondary mt-5 mb-3">{formatRichText(cleanLine.replace('## ', ''))}</h2>);
            continue;
        }
        // H3
        if (cleanLine.startsWith('### ')) {
            elements.push(<h3 key={index} className="text-xl font-medium text-text mt-4 mb-2">{formatRichText(cleanLine.replace('### ', ''))}</h3>);
            continue;
        }
        // H4 (Ajout)
        if (cleanLine.startsWith('#### ')) {
            elements.push(<h4 key={index} className="text-lg font-medium text-text-em mt-3 mb-2 underline decoration-primary/30 underline-offset-4">{formatRichText(cleanLine.replace('#### ', ''))}</h4>);
            continue;
        }

        // Séparateur Horizontal (Ajout)
        if (cleanLine.trim() === '---' || cleanLine.trim() === '***' || cleanLine.trim() === '___') {
            elements.push(<hr key={index} className="my-6 border-t border-border" />);
            continue;
        }

        // Listes
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
            // Nettoyage robuste : enlève le marqueur et les espaces
            const content = line.trim().replace(/^[-*•]\s+/, '');
            elements.push(
            <li key={index} className="ml-6 list-disc mb-1 text-text pl-2 marker:text-primary">
                {formatRichText(content)}
            </li>
            );
            continue;
        }

        // Listes numérotées
        if (/^\d+\. /.test(line.trim())) {
            const match = line.trim().match(/^(\d+\.)\s+(.*)/);
            if (match) {
                elements.push(
                    <div key={index} className="ml-6 mb-1 text-text flex items-baseline">
                        <span className="font-bold mr-2 text-primary">{match[1]}</span>
                        <span>{formatRichText(match[2])}</span>
                    </div>
                );
                continue;
            }
        }
      
        // Tableaux (inchangé, sauf appel formatRichText)
        if (line.trim().startsWith('|')) {
           const tableLines: string[] = [];
           let j = index;
           while (j < lines.length && lines[j].trim().startsWith('|')) {
               tableLines.push(lines[j].trim());
               j++;
           }
           index = j - 1;
           
           if (tableLines.length >= 2) {
               const headers = tableLines[0].split('|').filter(cell => cell.trim() !== '').map(h => h.trim());
               // Skip separator line 1
               const rows = tableLines.slice(2).map(rowLine => 
                   rowLine.split('|').filter(cell => cell.trim() !== '').map(c => c.trim())
               );

               elements.push(
                   <div key={index} className="overflow-x-auto my-6 rounded-xl border border-border shadow-sm bg-background/50">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-primary/5 text-text font-semibold border-b border-border">
                               <tr>
                                   {headers.map((h, i) => (
                                       <th key={i} className="px-4 py-3 border-r border-border last:border-r-0 whitespace-nowrap text-primary">
                                           {formatRichText(h)}
                                       </th>
                                   ))}
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-border/50">
                               {rows.map((row, rI) => (
                                   <tr key={rI} className="hover:bg-primary/5 transition-colors">
                                       {row.map((cell, cI) => (
                                           <td key={cI} className="px-4 py-2 border-r border-border/50 last:border-r-0 align-top">
                                               {formatRichText(cell)}
                                           </td>
                                       ))}
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               );
               continue;
           }
        }

        // Paragraphes vides
        if (line.trim() === '') {
            elements.push(<div key={index} className="h-4"></div>);
            continue;
        }

        // Texte normal
        elements.push(<p key={index} className="mb-2 text-text leading-relaxed text-lg">{formatRichText(line)}</p>);
    }
    
    return elements;
  };

  const handleExportExercises = async () => {
    // @ts-ignore
    if (!lesson.exercises) return;
    
    try {
        // @ts-ignore
        const rtfContent = exercisesToRTF(lesson.exercises);
        // Nettoyage du nom de fichier
        const safeTopic = lesson.topic.replace(/[^a-z0-9àâçéèêëîïôûùüÿñæœ\s-]/gi, '_').trim();
        const filename = `Exercices - ${safeTopic}.rtf`;
        
        if (window.__TAURI__) {
            const savePath = await save({
                defaultPath: filename,
                filters: [{ name: 'RTF Document', extensions: ['rtf'] }]
            });
            if (savePath) {
                await writeTextFile(savePath, rtfContent);
                showToast('Fiche d\'exercices exportée !', 'success');
            }
        } else {
            const blob = new Blob([rtfContent], { type: 'application/rtf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            showToast('Téléchargement lancé', 'success');
        }
    } catch (e) {
        console.error(e);
        showToast("Erreur lors de l'export des exercices", 'error');
    }
  };

  // Fonction pour gérer le gras, l'italique et les liens Markdown [texte](url)
  const formatRichText = (text: string) => {
    // 1. Gérer les liens Markdown: [Texte](URL)
    // On split pour isoler les [texte](url)
    const linkParts = text.split(/(\[.*?\]\(.*?\))/g);
    
    return linkParts.map((part, i) => {
        // Est-ce un lien ?
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
            const linkText = linkMatch[1];
            const url = linkMatch[2];
            return (
                <a 
                    key={`link-${i}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                        // On gère tous les liens via openLink pour :
                        // 1) Détecter le mode PWA iOS standalone
                        // 2) Transformer les recherches Google en DuckDuckGo
                        // 3) Gérer Tauri (desktop)
                        e.preventDefault();
                        openLink(url);
                    }}
                    className="text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 decoration-primary/40 underline-offset-4 decoration-2"
                    title={url}
                >
                    {linkText}
                    <i className="fas fa-external-link-alt text-[10px] opacity-70"></i>
                </a>
            );
        }

        // 2. Gérer le gras (**...**)
        const boldParts = part.split(/(\*\*.*?\*\*)/g);
        
        return boldParts.map((bPart, j) => {
            if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
                return <strong key={`bold-${i}-${j}`} className="font-bold text-primary dark:text-primary-light">{bPart.slice(2, -2)}</strong>;
            }
            
            // 3. Gérer l'italique (*...*) 
            const italicParts = bPart.split(/(\*[^*\s][^*]*?\*)/g);
            return (
                <React.Fragment key={`text-${i}-${j}`}>
                    {italicParts.map((subPart, k) => {
                        if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
                            return <em key={`italic-${i}-${j}-${k}`} className="italic text-text-em/90">{subPart.slice(1, -1)}</em>;
                        }
                        return subPart;
                    })}
                </React.Fragment>
            );
        });
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background animate-fade-in overflow-hidden print:overflow-visible print:h-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            border: none !important;
            box-shadow: none !important;
            background: white;
            color: black;
            z-index: 9999;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="group/header flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 pt-safe border-b border-border bg-background-secondary shadow-sm z-10 no-print gap-4 min-h-[64px] transition-all relative">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
            <div className="flex gap-2.5 md:gap-3 shrink-0">
                <Button variant="secondary" onClick={onBack} size="sm" className="h-8 md:h-9 text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800 px-2.5 md:px-4 text-xs md:text-sm shadow-sm transition-all active:scale-95">
                    <i className="fas fa-arrow-left mr-1.5 md:mr-2"></i> <span className="xs:inline">Retour</span>
                </Button>
                {onHome && (
                    <Button variant="secondary" onClick={onHome} size="sm" className="h-8 md:h-9 text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800 px-2.5 md:px-4 text-xs md:text-sm shadow-sm transition-all active:scale-95">
                        <i className="fas fa-home mr-1.5 md:mr-2"></i> <span className="xs:inline">Accueil</span>
                    </Button>
                )}
            </div>
            <div className="flex flex-col min-w-0 flex-1 ml-1 md:ml-2">
                <h1 className="text-sm md:text-xl font-black text-text leading-tight whitespace-normal break-words">{lesson.topic}</h1>
                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-text-muted mt-0.5 font-medium">
                    <span className="truncate max-w-[100px] md:max-w-none">{tutor?.emoji} {tutor?.name}</span>
                    <span className="shrink-0">•</span>
                    <span className="shrink-0">{new Date(lesson.createdAt || new Date()).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
        
        <div className="flex gap-2 items-center justify-end shrink-0 no-print">
            <div className="flex items-center gap-1 bg-background-tertiary dark:bg-white/5 p-1 rounded-xl border border-border/50 shadow-sm transition-all duration-300 md:hidden md:group-hover/header:flex animate-in fade-in slide-in-from-right-2">
                <button 
                    onClick={() => handleExport('md')}
                    disabled={isExporting}
                    title="Exporter en Markdown"
                    className="h-8 md:h-9 px-2 md:px-4 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all text-text/60 hover:text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fab fa-markdown text-sm md:text-lg"></i>} 
                    <span className="hidden lg:inline">Markdown</span>
                    <span className="hidden sm:inline lg:hidden">MD</span>
                </button>
                <div className="w-px h-4 bg-border/50 self-center"></div>
                <button 
                    onClick={() => handleExport('rtf')}
                    disabled={isExporting}
                    title="Exporter en Word (RTF)"
                    className="h-8 md:h-9 px-2 md:px-4 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 transition-all text-text/60 hover:text-primary hover:bg-primary/10 disabled:opacity-50"
                >
                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-file-word text-sm md:text-lg"></i>} 
                    <span className="hidden lg:inline">Word (RTF)</span>
                    <span className="hidden sm:inline lg:hidden">RTF</span>
                </button>
                <div className="w-px h-4 bg-border/50 self-center"></div>
                <button 
                    onClick={handleShare}
                    className="h-8 md:h-9 px-3 rounded-lg flex items-center justify-center text-text/60 hover:text-primary transition-all hover:bg-primary/10 active:scale-90"
                    title="Partager cette leçon"
                >
                    <i className="fas fa-share-alt"></i>
                </button>
            </div>
            {onNavigateToSettings && (
                <button 
                    onClick={onNavigateToSettings}
                    className="h-8 w-8 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-all duration-300 hover:bg-black/5 rounded-xl text-text/40 hover:text-primary active:scale-90"
                    title="Paramètres de l'IA"
                >
                    <i className="fas fa-cog"></i>
                </button>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 max-w-4xl mx-auto w-full print:overflow-visible min-h-0 pb-32">
        <div className="bg-background-tertiary p-6 pr-12 md:p-8 md:pr-8 rounded-xl shadow-sm border border-border/50 print-content relative group">
            <button
                onClick={() => {
                    navigator.clipboard.writeText(lesson.content);
                    showToast('Leçon copiée dans le presse-papier !', 'success');
                }}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-40 hover:!opacity-100 p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all text-text-muted hover:text-primary z-10 no-print"
                title="Copier toute la leçon"
            >
                <i className="far fa-copy text-lg"></i>
            </button>
            {renderMarkdown(lesson.content)}
        </div>
        
        {/* SECTION EXERCICES INTERACTIFS */}
            <div className="mt-12 mb-8 no-print p-8 bg-gradient-to-br from-green-500/5 to-teal-500/10 border border-green-500/20 rounded-2xl text-center shadow-lg relative overflow-hidden group hover:border-green-500/40 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i className="fas fa-brain text-9xl"></i>
                </div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-3 text-text">🧠 Exercices Interactifs</h3>
                    <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                        {lesson.exercises 
                            ? `Testez votre compréhension avec ${lesson.exercises.exercises.length} exercices variés (QCM, textes à trous, questions ouvertes...)`
                            : "Générez des exercices interactifs personnalisés pour approfondir votre maîtrise de cette leçon"
                        }
                    </p>
                    <div className="flex gap-4 justify-center items-center flex-wrap">
                        {lesson.exercises ? (
                            <>
                                <Button 
                                    onClick={onGenerateExercises} 
                                    size="lg" 
                                    className="shadow-xl shadow-green-500/20 hover:scale-105 transition-transform px-8 py-4 text-lg bg-green-600 hover:bg-green-700"
                                >
                                    <i className="fas fa-play mr-2"></i> Commencer les Exercices
                                </Button>

                                <Button
                                    variant="secondary"
                                    onClick={handleExportExercises}
                                    title="Imprimer la fiche d'exercices (avec corrigés séparés)"
                                    className="border-green-200 text-green-700 hover:bg-green-50 shadow-sm px-6 py-3"
                                >
                                    <i className="fas fa-print mr-2"></i> Imprimer
                                </Button>
                            </>
                        ) : (
                            <Button 
                                onClick={async () => {
                                    if (onGenerateExercises) {
                                        setIsGeneratingExercises(true);
                                        try {
                                            await onGenerateExercises();
                                        } finally {
                                            setIsGeneratingExercises(false);
                                        }
                                    }
                                }} 
                                size="lg" 
                                variant="secondary"
                                disabled={!onGenerateExercises || isGeneratingExercises}
                                title={!onGenerateExercises ? "Fonctionnalité non disponible dans ce contexte" : ""}
                                className="shadow-xl shadow-green-500/20 hover:scale-105 transition-transform px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGeneratingExercises ? (
                                    <div className="flex items-center gap-2">
                                        <AILoader size="sm" />
                                        <span>Génération des exercices...</span>
                                    </div>
                                ) : (
                                    <>
                                        <i className="fas fa-magic mr-2"></i> 
                                        Générer des exercices
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

        {/* SECTION: Pour aller plus loin (Suggestions Interactives) */}
        {/* SECTION EXERCICES */}
        {/* SECTION QUIZ (Flashcards) */}
        {onStartQuiz && (
            <div className="mt-8 mb-8 no-print p-8 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl text-center shadow-lg relative overflow-hidden group hover:border-primary/40 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <i className="fas fa-dumbbell text-9xl"></i>
                </div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-3 text-text">🎓 Quiz de Révision</h3>
                    
                    {lesson.flashcards && lesson.flashcards.length > 0 ? (
                        <>
                            <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                                Ce cours inclut <strong>{lesson.flashcards.length} fiches de révision</strong> pour valider vos acquis.
                            </p>
                            <Button onClick={() => onStartQuiz(lesson.flashcards!)} size="lg" className="shadow-xl shadow-primary/20 hover:scale-105 transition-transform px-8 py-4 text-lg">
                                <i className="fas fa-play mr-2"></i> Lancer le Quiz
                            </Button>
                        </>
                    ) : (
                        <>
                            <p className="text-text-secondary mb-6 max-w-lg mx-auto">
                                Convertissez ce cours en cartes de révision (Flashcards) pour mémoriser les points clés.
                            </p>
                            <div className="flex justify-center">
                                <Button 
                                    onClick={onGenerateQuiz} 
                                    size="lg" 
                                    variant="secondary"
                                    disabled={!onGenerateQuiz}
                                    className="shadow-lg border-primary text-primary hover:bg-primary hover:text-white transition-all px-8 py-4 text-lg"
                                >
                                    <i className="fas fa-layer-group mr-2"></i> Générer un Quiz Flashcards
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* SECTION: Pour aller plus loin (Suggestions Interactives) */}
        {suggestions.length > 0 && (
            <div className="mt-8 mb-4 no-print animate-fade-in-up">
                <h3 className="text-lg font-bold text-text mb-4 flex items-center gap-2">
                    <i className="fas fa-lightbulb text-yellow-500"></i>
                    Pour aller plus loin...
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suggestions.map((item, idx) => {
                        const isExternal = !!item.url;
                        const Tag = isExternal ? 'a' : 'button';
                        
                        return (
                            <Tag
                                key={idx}
                                href={item.url || undefined}
                                target={isExternal ? "_blank" : undefined}
                                rel={isExternal ? "noopener noreferrer" : undefined}
                                onClick={(e: any) => {
                                    if (!isExternal && onNewLesson) {
                                        onNewLesson(item.text);
                                    } else if (isExternal) {
                                        // Toujours passer par openLink pour gérer :
                                        // - le mode PWA iOS standalone (window.location.href)
                                        // - la transformation de recherche Google
                                        // - Tauri (desktop)
                                        e.preventDefault();
                                        openLink(item.url!);
                                    }
                                }}
                                className="bg-background-secondary hover:bg-background-tertiary border border-border p-4 rounded-lg text-left transition-all hover:border-primary group flex flex-col h-full cursor-pointer no-underline"
                            >
                                <div className="text-sm text-text-muted mb-1 flex items-center gap-1">
                                    {isExternal ? <><i className="fas fa-external-link-alt text-xs"></i> Ressource Externe</> : <><i className="fas fa-magic text-xs"></i> Leçon suggérée</>}
                                </div>
                                <div className="font-semibold text-text group-hover:text-primary leading-tight flex-1">
                                    {item.text}
                                </div>
                                <div className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pt-2 border-t border-border/50">
                                    {isExternal ? "Ouvrir le lien" : "Générer ce cours"} <i className="fas fa-arrow-right"></i>
                                </div>
                            </Tag>
                        );
                    })}
                </div>
            </div>
        )}
        
        {/* Footer info */}
        <div className="mt-8 text-center text-text-muted text-sm pb-8">
            Généré par {tutor?.name} via IA • Studeo <span className="opacity-40 text-xs">v3.2.0</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          PANNEAU LIEN EXTERNE — Solution iOS PWA universelle
          Apparaît quand l'utilisateur clique sur un lien externe.
          Utilise window.location.href qui est la méthode 100% 
          fiable sur Safari, iOS PWA standalone, et tous les navigateurs.
          ═══════════════════════════════════════════════════════ */}
      {pendingUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center p-4 animate-fade-in"
          onClick={closeLinkPanel}
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔗</span>
                <span className="font-bold text-text">Lien externe</span>
              </div>
              <button
                onClick={closeLinkPanel}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-background-secondary text-text-muted hover:text-text transition-colors"
              >
                <i className="fas fa-times text-sm" />
              </button>
            </div>

            {/* URL display */}
            <div className="px-5 py-4">
              <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-2">Destination</p>
              <div className="bg-background-secondary rounded-xl px-4 py-3 flex items-center gap-3 border border-border">
                <i className="fas fa-globe text-primary opacity-60 flex-shrink-0" />
                <span className="text-sm text-text-secondary break-all line-clamp-2 flex-1">{pendingUrl}</span>
              </div>
              <p className="text-xs text-text-muted mt-3 text-center">
                Ce lien s'ouvrira dans Safari. Revenez à Studeo avec le bouton <strong>Retour</strong> ou via l'écran d'accueil.
              </p>
            </div>

            {/* Buttons */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={copyLinkToClipboard}
                className="flex-1 py-3 px-4 rounded-xl border border-border bg-background-secondary text-text font-semibold text-sm flex items-center justify-center gap-2 hover:bg-background-tertiary transition-colors active:scale-95"
              >
                <i className="fas fa-copy" />
                Copier l'URL
              </button>
              <a
                href={pendingUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeLinkPanel}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all active:scale-95 no-underline"
              >
                <i className="fas fa-external-link-alt" />
                Ouvrir
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
