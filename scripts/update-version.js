/**
 * Ce script lit la version dans package.json et met à jour public/version.json
 * Il est exécuté automatiquement avant chaque build (via "prebuild" npm script).
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const version = pkg.version;

const versionJson = JSON.stringify({ version }, null, 2) + '\n';
writeFileSync(resolve(root, 'public/version.json'), versionJson, 'utf-8');

console.log(`✅ public/version.json mis à jour → v${version}`);
