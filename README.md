# 🎴 Multilingual Flashcards Quiz

Application de quiz multilingue avec synthèse vocale, développée avec React, TypeScript et Tauri.

## 🚀 Démarrage Rapide

### 1. Configuration de la Clé API Gemini

Avant de lancer l'application, configurez votre clé API Gemini :

```bash
export GEMINI_API_KEY="votre_clé_api_ici"
```

> **💡 Astuce** : Pour rendre cette configuration permanente, ajoutez cette ligne à votre `~/.zshrc` ou `~/.bash_profile`

### 2. Lancer l'Application

```bash
npm run tauri dev
```

### 3. Compiler pour Production

```bash
npm run build
npm run tauri build
```

---

## 📚 Utilisation

### Modes de Quiz

L'application propose deux modes :

- **Mode Classique** : Saisie libre de la réponse
- **Mode QCM** : Choix multiple avec 4 options

### Synthèse Vocale

Deux options disponibles :

- **Voix locale** : Utilise la synthèse vocale de votre système (gratuit)
- **Voix Gemini** : Utilise l'API Gemini pour une meilleure qualité (nécessite une clé API)

### Raccourcis Clavier

Pendant le quiz :

- `Alt + S` : Écouter la question
- `Alt + K` : Afficher la réponse (mode classique)
- `Entrée` ou `→` : Passer à la question suivante
- `1`, `2`, `3`, `4` : Sélectionner une option (mode QCM)

---

## 📁 Import de Fichiers

L'application accepte trois formats de fichiers :

### Format JSON

```json
[
  {
    "type": "classic",
    "terms": {
      "fr": "Bonjour",
      "en": "Hello",
      "es": "Hola"
    }
  },
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quelle est la capitale de la France ?" },
      "answer": { "fr": "Paris" },
      "distractors": [
        { "fr": "Lyon" },
        { "fr": "Marseille" },
        { "fr": "Toulouse" }
      ]
    }
  }
]
```

### Format CSV

```csv
fr,en,es
Bonjour,Hello,Hola
Au revoir,Goodbye,Adiós
Merci,Thank you,Gracias
```

### Format Markdown (Table)

```markdown
| fr        | en        | es      |
| --------- | --------- | ------- |
| Bonjour   | Hello     | Hola    |
| Au revoir | Goodbye   | Adiós   |
| Merci     | Thank you | Gracias |
```

### Limites de Sécurité

- **Taille maximale** : 5 MB par fichier
- **Nombre de cartes** : 10 000 maximum
- **Extensions autorisées** : `.json`, `.csv`, `.md`

---

## 🛠️ Développement

### Structure du Projet

```
├── components/          # Composants React
├── hooks/              # Hooks personnalisés
├── services/           # Services (API Gemini, parsers)
├── utils/              # Utilitaires (sécurité, etc.)
├── test/               # Tests unitaires
├── src-tauri/          # Backend Rust (Tauri)
└── constants.ts        # Constantes et données par défaut
```

### Commandes Utiles

```bash
# Développement
npm run tauri dev

# Tests
npm test              # Mode watch
npm test -- --run     # Exécution unique
npm run test:ui       # Interface graphique

# Build
npm run build         # Build frontend
npm run tauri build   # Build application complète

# Vérification TypeScript
npx tsc -b
```

---

## 🔒 Sécurité

L'application implémente plusieurs mesures de sécurité :

- ✅ **Clé API protégée** : Stockée côté backend (Rust), jamais exposée au frontend
- ✅ **Validation des fichiers** : Vérification des extensions, tailles et contenus
- ✅ **Protection XSS** : Sanitisation de toutes les entrées utilisateur
- ✅ **LocalStorage sécurisé** : Validation et limites de taille

Pour plus de détails, consultez `SECURITE.md`.

---

## 📊 Tests

L'application dispose de 36 tests couvrant :

- Sécurité (sanitisation HTML, validation fichiers)
- Hooks personnalisés (localStorage, flashcards, quiz)
- Parsers de fichiers (JSON, CSV, Markdown)

Pour plus d'informations, consultez `RAPPORT_TESTS.md`.

---

## 🎯 Fonctionnalités

- ✅ Quiz multilingue avec support de multiples langues
- ✅ Deux modes de quiz (Classique et QCM)
- ✅ Synthèse vocale (locale et Gemini)
- ✅ Import de fichiers (JSON, CSV, Markdown)
- ✅ Édition des cartes en JSON
- ✅ Historique des quiz
- ✅ Système de révision des erreurs persistantes
- ✅ Mode sombre
- ✅ Raccourcis clavier
- ✅ Sauvegarde automatique de la progression

---

## 🐛 Dépannage

### L'application ne démarre pas

Vérifiez que vous avez bien :

1. Installé les dépendances : `npm install`
2. Configuré la clé API Gemini (si vous utilisez la synthèse vocale Gemini)

### La synthèse vocale Gemini ne fonctionne pas

1. Vérifiez que la clé API est bien définie :

   ```bash
   echo $GEMINI_API_KEY
   ```

2. Relancez l'application après avoir défini la clé :
   ```bash
   export GEMINI_API_KEY="votre_clé"
   npm run tauri dev
   ```

### Erreur lors de l'import de fichier

- Vérifiez que le fichier respecte le format attendu (voir exemples ci-dessus)
- Vérifiez que la taille du fichier est inférieure à 5 MB
- Vérifiez que l'extension est `.json`, `.csv` ou `.md`

---

## 📝 Licence

Application développée pour un usage personnel.

---

## 🙏 Remerciements

- **React** - Framework UI
- **Tauri** - Framework desktop
- **Gemini API** - Synthèse vocale
- **Vitest** - Framework de tests
