import { ExerciseSet } from '../types';

/**
 * Convertit un ensemble d'exercices en format Markdown
 */
export function exercisesToMarkdown(exerciseSet: ExerciseSet): string {
  let markdown = `# ${exerciseSet.title}\n\n`;
  
  if (exerciseSet.description) {
    markdown += `${exerciseSet.description}\n\n`;
  }

  markdown += `**Total de points possibles:** ${exerciseSet.totalPoints || 0}\n\n`;
  markdown += `---\n\n`;

  exerciseSet.exercises.forEach((exercise, index) => {
    markdown += `## Exercice ${index + 1}\n\n`;
    
    // Type et difficulté
    markdown += `**Type:** ${getExerciseTypeLabel(exercise.type)}`;
    if (exercise.difficulty) {
      markdown += ` | **Difficulté:** ${getDifficultyLabel(exercise.difficulty)}`;
    }
    if (exercise.points) {
      markdown += ` | **Points:** ${exercise.points}`;
    }
    markdown += `\n\n`;

    // Question
    markdown += `**Question:** ${exercise.question}\n\n`;

    // Contenu spécifique selon le type
    switch (exercise.type) {
      case 'mcq':
        if (exercise.options) {
          markdown += `**Options:**\n`;
          exercise.options.forEach((option, i) => {
            const letter = String.fromCharCode(65 + i); // A, B, C, D...
            const isCorrect = option === exercise.correctAnswer;
            markdown += `${letter}. ${option}${isCorrect ? ' ✓' : ''}\n`;
          });
          markdown += `\n`;
        }
        break;

      case 'fill-blank':
        if (exercise.template) {
          markdown += `**Texte à compléter:**\n${exercise.template}\n\n`;
        }
        if (exercise.blanks) {
          markdown += `**Réponses:** ${exercise.blanks.join(', ')}\n\n`;
        }
        break;

      case 'open-question':
        if (exercise.acceptedAnswers) {
          markdown += `**Réponses acceptées:** ${exercise.acceptedAnswers.join(', ')}\n\n`;
        }
        break;

      case 'true-false':
        markdown += `**Réponse:** ${exercise.correctAnswer === 'true' ? 'Vrai' : 'Faux'}\n\n`;
        break;

      case 'matching':
        if (exercise.pairs) {
          markdown += `**Associations:**\n`;
          exercise.pairs.forEach((pair, i) => {
            markdown += `${i + 1}. ${pair.left} → ${pair.right}\n`;
          });
          markdown += `\n`;
        }
        break;

      case 'ordering':
        if (exercise.items && exercise.correctOrder) {
          markdown += `**Ordre correct:**\n`;
          exercise.correctOrder.forEach((orderIndex, i) => {
            markdown += `${i + 1}. ${exercise.items![orderIndex]}\n`;
          });
          markdown += `\n`;
        }
        break;
    }

    // Indice
    if (exercise.hint) {
      markdown += `💡 **Indice:** ${exercise.hint}\n\n`;
    }

    // Explication
    if (exercise.explanation) {
      markdown += `📚 **Explication:** ${exercise.explanation}\n\n`;
    }

    markdown += `---\n\n`;
  });

  markdown += `\n*Exercices générés par Studeo*\n`;
  
  return markdown;
}

// Fonction utilitaire pour nettoyer les entités HTML et caractères parasites
function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export function exercisesToRTF(exerciseSet: ExerciseSet): string {
  // En-tête RTF stricte et compacte pour éviter la corruption dans Pages/Bean
  // On définit Arial en f0 (défaut) et Times en f1.
  let rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1036{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}{\\f1\\fnil\\fcharset0 Times New Roman;}}{\\colortbl ;\\red0\\green0\\blue0;\\red0\\green128\\blue0;\\red255\\green0\\blue0;\\red128\\128\\128;}\\viewkind4\\uc1\\pard\\sa200\\sl276\\slmult1\\f0\\fs24\\lang1036 `;
  rtf += `\n`;
  
  // === PARTIE 1 : ÉNONCÉS (Vierge) ===
  
  // Titre
  rtf += `{\\f1\\fs32\\b ${escapeRTF(cleanText(exerciseSet.title))}}\\par\n`;
  rtf += `{\\f1\\fs24 Feuille d'exercices}\\par\n`;
  rtf += `\\par\n`;
  
  // Description
  if (exerciseSet.description) {
    rtf += `{\\f0\\fs24 ${escapeRTF(cleanText(exerciseSet.description))}}\\par\n`;
    rtf += `\\par\n`;
  }

  // Total points
  rtf += `{\\f0\\fs24\\b Total de points possibles: ${exerciseSet.totalPoints || 0}}\\par\n`;
  rtf += `\\par\n`;
  rtf += `{\\pard\\brdrb\\brdrs\\brdrw10\\brsp20\\par}\n`;
  rtf += `\\par\n`;

  // Boucle Énoncés
  exerciseSet.exercises.forEach((exercise, index) => {
    rtf += `{\\f1\\fs28\\b Exercice ${index + 1}}\\par\n`;
    rtf += `{\\f0\\fs22\\i Type: ${escapeRTF(cleanText(getExerciseTypeLabel(exercise.type)))} | Points: ${exercise.points || 0}}\\par\n`;
    rtf += `\\par\n`;

    // Question
    rtf += `{\\f0\\fs24\\b ${escapeRTF(cleanText(exercise.question))}}\\par\\par\n`;

    // Contenu spécifique (Version Élève)
    switch (exercise.type) {
      case 'mcq':
        if (exercise.options) {
          exercise.options.forEach((option, i) => {
            const letter = String.fromCharCode(65 + i);
            rtf += `\\tab ${letter}. ${escapeRTF(cleanText(option))}\\par\n`;
          });
        }
        break;

      case 'fill-blank':
        if (exercise.template) {
          const printableTemplate = cleanText(exercise.template)
            .replace(/\{blank[^}]*\}|_{2,}|\.{3,}|\[\s*\]/g, ' __________________ ');
          rtf += `{\\f0\\fs24 ${escapeRTF(printableTemplate)}}\\par\n`;
        }
        break;

      case 'open-question':
        rtf += `\\par\\par\\par\\par\\par\\par\n`; 
        rtf += `{\\f0\\fs20\\cf4 (Espace r\\'e9ponse)}\\par\n`;
        break;

      case 'true-false':
        rtf += `\\tab [  ] Vrai\\par\n`;
        rtf += `\\tab [  ] Faux\\par\n`;
        break;
        
      case 'matching':
        if (exercise.pairs) {
           rtf += `{\\b Reliez les \\'e9l\\'e9ments :}\\par\n`;
           exercise.pairs.forEach((pair, i) => {
             rtf += `\\tab ${i + 1}. ${escapeRTF(cleanText(pair.left))}  ......................  ${escapeRTF(cleanText(pair.right))}\\par\n`;
           });
        }
        break;
    }
    
    rtf += `\\par\\par\n`;
    rtf += `{\\pard\\brdrb\\brdrs\\brdrw10\\brsp20\\par}\n`;
    rtf += `\\par\n`;
  });

  // === SAUT DE PAGE ===
  rtf += `\\page\n`;

  // === PARTIE 2 : CORRIGÉS ===
  rtf += `{\\f1\\fs32\\b Corrig\\'e9s}\\par\n`;
  rtf += `\\par\n`;

  exerciseSet.exercises.forEach((exercise, index) => {
    rtf += `{\\f1\\fs24\\b Exercice ${index + 1}}\\par\n`;
    
    // Réponses
    switch (exercise.type) {
      case 'mcq':
        // @ts-ignore
        const ans = Array.isArray(exercise.correctAnswer) ? exercise.correctAnswer.join(', ') : (exercise.correctAnswer || '');
        rtf += `{\\b R\\'e9ponse : } ${escapeRTF(cleanText(ans))}\\par\n`;
        break;
      case 'fill-blank':
        rtf += `{\\b R\\'e9ponses : } ${escapeRTF(cleanText((exercise.blanks || []).join(', ')))}\\par\n`;
        break;
      case 'open-question':
        rtf += `{\\b R\\'e9ponses accept\\'e9es : } ${escapeRTF(cleanText((exercise.acceptedAnswers || []).join(' / ')))}\\par\n`;
        break;
      case 'true-false':
        rtf += `{\\b R\\'e9ponse : } ${exercise.correctAnswer === 'true' ? 'Vrai' : 'Faux'}\\par\n`;
        break;
    }

    if (exercise.explanation) {
       rtf += `{\\cf2\\b Explication : } ${escapeRTF(cleanText(exercise.explanation))}\\par\n`;
    }
    
    rtf += `\\par\n`;
  });

  rtf += `\\par\n`;
  rtf += `{\\i G\\'e9n\\'e9r\\'e9 par Studeo}\\par\n`;
  rtf += `}\n`;
  
  return rtf;
}

function escapeRTF(text: string): string {
  if (!text) return '';
  
  let escaped = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);

    // Caractères spéciaux RTF
    if (char === '\\') escaped += '\\\\';
    else if (char === '{') escaped += '\\{';
    else if (char === '}') escaped += '\\}';
    else if (char === '\n') escaped += '\\par\n';
    
    // ASCII standard (imprimable)
    else if (code >= 32 && code < 128) {
      escaped += char;
    }
    // Tabulation (code 9)
    else if (code === 9) {
      escaped += '\\tab ';
    }
    // Latin-1 (Accents) -> Encodage Hex \'xx
    else if (code < 256) {
      escaped += `\\'${code.toString(16).toLowerCase().padStart(2, '0')}`;
    }
    // Unicode -> Encodage \uXXXX?
    else {
      let signedCode = code;
      if (signedCode > 32767) signedCode -= 65536;
      escaped += `\\u${signedCode}?`;
    }
  }
  return escaped;
}

/**
 * Retourne le label français du type d'exercice
 */
function getExerciseTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'mcq': 'QCM (Choix Multiples)',
    'fill-blank': 'Texte à trous',
    'open-question': 'Question ouverte',
    'true-false': 'Vrai/Faux',
    'matching': 'Associations',
    'ordering': 'Réordonnancement'
  };
  return labels[type] || type;
}

/**
 * Retourne le label français de la difficulté
 */
function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    'easy': 'Facile',
    'medium': 'Moyen',
    'hard': 'Difficile'
  };
  return labels[difficulty] || difficulty;
}
