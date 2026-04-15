
const fs = require('fs');
const content = fs.readFileSync('/Users/daniel/Desktop/Projet Studeo /locales/fr.ts', 'utf8');

// Simple regex to find top-level keys in the 'fr' object
// assuming the structure is: export const fr = { key: { ... }, ... }
const matches = content.matchAll(/^\s{4}(['"]?)([\w]+)\1\s*:/gm);
const keys = {};
for (const match of matches) {
    const key = match[2];
    if (keys[key]) {
        console.log(`Duplicate top-level key: ${key} at lines ${keys[key].line} and unknown`);
    }
    keys[key] = { exists: true };
}
