#!/usr/bin/env node

/**
 * Script de refactoring automatique pour useAppCoordinator.ts
 * Remplace les duplications de configuration IA par getAIClientConfig()
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../hooks/useAppCoordinator.ts');

console.log('🔧 Refactoring de la configuration IA...\n');

// Lire le fichier
let content = fs.readFileSync(filePath, 'utf8');
const originalLength = content.length;

// Pattern à remplacer (configuration IA dupliquée)
// On cherche le pattern complet du switch case
const switchPattern = /\/\/ SETUP CONFIG[\s\S]*?switch \(config\.provider\) \{[\s\S]*?case 'local':[\s\S]*?break;[\s\S]*?\}/g;

// Compter les occurrences avant remplacement
const matches = content.match(switchPattern);
const count = matches ? matches.length : 0;

console.log(`📊 Occurrences trouvées: ${count}`);

if (count === 0) {
    console.log('⚠️  Aucune duplication trouvée avec le pattern actuel.');
    console.log('   Le refactoring a peut-être déjà été effectué ou le pattern a changé.');
    process.exit(0);
}

// Afficher un aperçu de ce qui sera remplacé
console.log(`\n📝 Aperçu du premier bloc à remplacer:`);
console.log(matches[0].substring(0, 200) + '...\n');

// Nouveau code
const newCode = `// Configuration IA
            let aiConfig;
            try {
                aiConfig = getAIClientConfig(config);
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Configuration IA invalide', 'error');
                return;
            }`;

// Remplacer
content = content.replace(switchPattern, newCode);

// Remplacer les usages de apiKey, modelName, apiUrl par aiConfig.*
// Pattern pour les appels de fonction
const replacements = [
    {
        pattern: /(\s+)apiKey,\s*\n\s+modelName,\s*\n\s+apiUrl/g,
        replacement: '$1aiConfig.apiKey,\n$1aiConfig.modelName,\n$1aiConfig.apiUrl'
    },
    {
        pattern: /config\.provider,\s*\n\s+apiKey,\s*\n\s+modelName,\s*\n\s+apiUrl/g,
        replacement: 'config.provider,\n                aiConfig.apiKey,\n                aiConfig.modelName,\n                aiConfig.apiUrl'
    }
];

replacements.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
});

// Sauvegarder
fs.writeFileSync(filePath, content, 'utf8');

const newLength = content.length;
const reduction = originalLength - newLength;

console.log(`\n✅ Refactoring terminé !`);
console.log(`   - ${count} blocs de configuration remplacés`);
console.log(`   - Réduction: ${reduction} caractères (~${Math.round(reduction / 40)} lignes)`);
console.log(`\n📝 Fichier modifié: ${filePath}`);
console.log(`\n🧪 Prochaines étapes:`);
console.log(`   1. Vérifier la compilation: npm run build`);
console.log(`   2. Tester l'application`);
console.log(`   3. Commit les changements`);

process.exit(0);
