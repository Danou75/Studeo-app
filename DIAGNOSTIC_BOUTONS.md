# 🔧 Guide de Diagnostic - Boutons Non Réactifs

## Étape 1 : Ouvrir la Console Développeur

### Sur Mac (Tauri)

1. Avec l'application ouverte, appuyez sur : **`Cmd + Option + I`**
2. Ou faites un clic droit n'importe où → **"Inspecter"**
3. Cliquez sur l'onglet **"Console"**

## Étape 2 : Identifier les Erreurs

Recherchez des messages en **rouge** dans la console. Les erreurs courantes :

### ❌ Erreur TypeScript/JavaScript

```
Uncaught TypeError: Cannot read property 'X' of undefined
Uncaught ReferenceError: X is not defined
```

### ❌ Erreur React

```
Error: Minified React error #...
Warning: Failed prop type: ...
```

### ❌ Erreur d'événement

```
Uncaught Error: Listener not found
Event handler threw an exception
```

## Étape 3 : Solutions Rapides

### Solution 1 : Rechargement complet

1. Dans l'application Tauri : **`Cmd + R`** (rafraîchir)
2. Ou fermez et relancez : `npm run tauri dev`

### Solution 2 : Vider le cache

1. Console développeur → Onglet **"Application"** (ou "Stockage")
2. Cliquez sur **"Local Storage"** → `http://localhost:1420`
3. Clic droit → **"Clear"**
4. Rafraîchissez : **`Cmd + R`**

### Solution 3 : Vérifier les imports manquants

Si vous voyez une erreur comme `X is not defined`, c'est probablement un import manquant.

## Étape 4 : Tests de Boutons Spécifiques

Testez chaque type de bouton et notez lesquels fonctionnent :

- [ ] **Boutons de mode de quiz** (Classique, QCM, Dictée)
- [ ] **Boutons de mode de jeu** (Normal, Contre-la-montre, Survie, Sprint)
- [ ] **Boutons de voix** (F, M)
- [ ] **Boutons de gestion** (Réviser, Modifier, Importer, Exporter)
- [ ] **Boutons de thème** (Clair, Sombre, Auto + liste déroulante)
- [ ] **Gros boutons** (Démarrer le Quiz, Réviser)
- [ ] **Input nombre de cartes** (peut-on changer le nombre ?)
- [ ] **Toggles** (Mélanger, Auto-play)

## Étape 5 : Vérification des Warnings Rust

Les warnings Rust dans votre terminal ne sont PAS la cause :

```
warning: unused import: `engine::general_purpose`
warning: unused import: `Engine`
```

Ces warnings sont inoffensifs et peuvent être ignorés.

## Étape 6 : Informations à fournir

Pour un diagnostic précis, j'ai besoin de :

1. **Message d'erreur exact** de la console (copier-coller)
2. **Quels boutons** ne fonctionnent pas exactement
3. **Quels boutons** fonctionnent encore (s'il y en a)
4. **Capture d'écran** de la console (si possible)

## Solutions Avancées

### Si rien ne fonctionne : Retour à une version stable

```bash
# 1. Sauvegarder vos données
# Exportez vos flashcards depuis l'interface (si le bouton fonctionne)

# 2. Réinitialiser le localStorage
# Console développeur → Application → Local Storage → Clear

# 3. Redémarrer proprement
npm run tauri dev
```

### Si le problème persiste : Vérifier les fichiers modifiés

Les derniers fichiers modifiés qui pourraient causer des problèmes :

- `components/SetupScreen.tsx` (boutons d'action avec dégradés)
- `components/QuizScreen.tsx` (navigation clavier)
- `components/ThemeSelector.tsx` (sélecteur de thème)
- `constants/themes.ts` (fonction getThemeGradient)

---

**Prochaine étape** : Envoyez-moi le contenu de la console et je pourrai identifier le problème exact ! 🔍
