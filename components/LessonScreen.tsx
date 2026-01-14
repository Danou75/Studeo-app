import React from 'react';
import { Lesson } from '../types';
import { Button } from './ui/Button';
import { TUTORS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { AILoader } from './AILoader';

import { open } from '@tauri-apps/api/shell';
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
}

export const LessonScreen: React.FC<LessonScreenProps> = ({ lesson, onBack, onHome, onSave, onNewLesson, onStartQuiz, onGenerateExercises, onGenerateQuiz }) => {
  const { showToast } = useToast();
  const tutor = TUTORS.find(t => t.id === lesson.tutorId);

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

  const openLink = async (url: string) => {
      let finalUrl = url;
      
      // Feature: Transform Google Search links to Perplexity for better learning context
      if (url.includes('google.com/search') || url.includes('google.fr/search')) {
          try {
              // Basic extraction of query parameter
              const match = url.match(/[?&]q=([^&]+)/);
              if (match && match[1]) {
                  finalUrl = `https://www.perplexity.ai/search?q=${match[1]}`;
              }
          } catch (e) {
              console.warn("Could not transform Google link to Perplexity", e);
          }
      }

      try {
          // Tauri
          if (typeof window !== 'undefined' && '__TAURI__' in window) {
                await open(finalUrl);
          } else {
                // Web Fallback
                window.open(finalUrl, '_blank');
          }
      } catch (e) {
          console.error("Failed to open link:", e);
          window.open(finalUrl, '_blank');
      }
  };

  const [isExporting, setIsExporting] = React.useState(false);

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

  // Fonction simple pour parser le Markdown basique
  // Note: Dans une application plus complexe, utiliser react-markdown
  // Fonction pour parser le Markdown améiorée
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const lower = line.toLowerCase();
        
        // Arrêt si section suggestions
        if (suggestions.length > 0 && (line.startsWith('#') || line.startsWith('**')) && (lower.includes('pour aller plus loin') || lower.includes('connexes') || lower.includes('approfondir') || lower.includes('ressources'))) {
            break;
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

  // Fonction pour gérer le gras et l'italique
  const formatRichText = (text: string) => {
    // Split sur le gras (**...**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return parts.map((part, i) => {
      // Si c'est du gras
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={i} className="font-bold text-primary dark:text-primary-light">{part.slice(2, -2)}</strong>;
      }
      
      // Sinon, on cherche l'italique (*...*) dans le reste
      // Regex améliorée pour éviter de matcher des listes ou calculs
      const italicParts = part.split(/(\*[^*\s][^*]*?\*)/g);
      
      // On utilise un fragment ou un tableau pour retourner les sous-parties
      return (
        <React.Fragment key={i}>
            {italicParts.map((subPart, j) => {
                if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length > 2) {
                    return <em key={j} className="italic text-text-em/90">{subPart.slice(1, -1)}</em>;
                }
                return subPart;
            })}
        </React.Fragment>
      );
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
      <div className="flex items-center justify-between p-4 border-b border-border bg-background-secondary shadow-sm z-10 no-print">
        <div className="flex items-center gap-3">
            <div className="flex gap-2">
                <Button variant="secondary" onClick={onBack} size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800">
                    <i className="fas fa-arrow-left mr-2"></i> Retour
                </Button>
                {onHome && (
                    <Button variant="secondary" onClick={onHome} size="sm" className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800">
                        <i className="fas fa-home mr-2"></i> Accueil
                    </Button>
                )}
            </div>
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-text truncate max-w-md">{lesson.topic}</h1>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <span>{tutor?.emoji} {tutor?.name}</span>
                    <span>•</span>
                    <span>{new Date(lesson.createdAt || new Date()).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
        
        <div className="flex gap-2 items-center">

            <div className="flex gap-1 bg-black/5 p-1 rounded-lg border border-black/10">
                <button 
                    onClick={() => handleExport('md')}
                    disabled={isExporting}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-black/5 rounded flex items-center gap-1.5 transition-colors text-text/70 hover:text-text disabled:opacity-50"
                >
                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fab fa-markdown"></i>} MD
                </button>
                <div className="w-px h-4 bg-text/20 self-center"></div>
                <button 
                    onClick={() => handleExport('rtf')}
                    disabled={isExporting}
                    className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-black/5 rounded flex items-center gap-1.5 transition-colors text-text/70 hover:text-text disabled:opacity-50"
                >
                    {isExporting ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-file-word"></i>} RTF
                </button>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 max-w-4xl mx-auto w-full print:overflow-visible min-h-0 pb-32">
        <div className="bg-background-tertiary p-6 md:p-8 rounded-xl shadow-sm border border-border/50 print-content">
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
                                onClick={onGenerateExercises} 
                                size="lg" 
                                variant="secondary"
                                disabled={!onGenerateExercises}
                                title={!onGenerateExercises ? "Fonctionnalité non disponible dans ce contexte" : ""}
                                className="shadow-xl shadow-green-500/20 hover:scale-105 transition-transform px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="fas fa-magic mr-2"></i> 
                                {onGenerateExercises ? (
                                    <div className="flex items-center gap-2">
                                        <AILoader size="sm" />
                                        <span>Génération des exercices...</span>
                                    </div>
                                ) : "Génération Indisponible"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

        {/* SECTION: Pour aller plus loin (Suggestions Interactives) */}
        {/* SECTION EXERCICES */}
        {/* SECTION QUIZ (Flashcards) */}
        {onStartQuiz && (
            <div className="mt-8 mb-8 no-print p-8 bg-gradient-to-br from-primary/5 to-purple-500/10 border border-primary/20 rounded-2xl text-center shadow-lg relative overflow-hidden group hover:border-primary/40 transition-colors">
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
                    {suggestions.map((item, idx) => (
                        <button
                            key={idx}
                            onClick={() => item.url ? openLink(item.url) : (onNewLesson && onNewLesson(item.text))}
                            className="bg-background-secondary hover:bg-background-tertiary border border-border p-4 rounded-lg text-left transition-all hover:border-primary group flex flex-col h-full"
                        >
                            <div className="text-sm text-text-muted mb-1 flex items-center gap-1">
                                {item.url ? <><i className="fas fa-external-link-alt text-xs"></i> Ressource Externe</> : <><i className="fas fa-magic text-xs"></i> Leçon suggérée</>}
                            </div>
                            <div className="font-semibold text-text group-hover:text-primary leading-tight flex-1">
                                {item.text}
                            </div>
                            <div className="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pt-2 border-t border-border/50">
                                {item.url ? "Ouvrir le lien" : "Générer ce cours"} <i className="fas fa-arrow-right"></i>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        )}
        
        {/* Footer info */}
        <div className="mt-8 text-center text-text-muted text-sm pb-8">
            Généré par {tutor?.name} via IA • Multilingual Flashcards
        </div>
      </div>
    </div>
  );
};
