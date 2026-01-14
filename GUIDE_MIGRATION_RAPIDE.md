# Guide de Migration Rapide - Nouveaux Utilitaires

## 🎯 Objectif

Ce guide vous aide à migrer rapidement votre code existant vers les nouveaux utilitaires créés lors de l'audit du 13/01/2026.

---

## 📦 Nouveaux Utilitaires Disponibles

### 1. `utils/aiConfigHelper.ts`

Centralise la configuration des clients IA (Gemini, OpenAI, Claude, Mistral, Local)

### 2. `utils/flashcardHelpers.ts`

Manipulation type-safe des Flashcards (Type Guards + Helpers)

---

## 🔄 Patterns de Migration

### Pattern 1: Configuration IA

#### ❌ À Remplacer

```typescript
let apiKey: string | undefined;
let modelName: string = config.geminiModel;
let apiUrl: string | undefined;

switch (config.provider) {
  case "gemini":
    apiKey = config.geminiApiKey;
    modelName = config.geminiModel;
    break;
  case "openai":
    apiKey = config.openaiApiKey;
    if (!apiKey) {
      showToast("Clé manquante", "error");
      return;
    }
    modelName = config.openaiModel || "gpt-4o";
    break;
  // ... 15 lignes de plus
}
```

#### ✅ Nouveau Code

```typescript
import { getAIClientConfig } from "../utils/aiConfigHelper";

try {
  const { apiKey, modelName, apiUrl } = getAIClientConfig(config);
  // Utiliser directement
} catch (error) {
  showToast(error.message, "error");
  return;
}
```

**Gain**: -20 lignes, gestion d'erreur unifiée

---

### Pattern 2: Extraction de Question/Réponse

#### ❌ À Remplacer

```typescript
const terms = (card as any).terms;
const mcqData = (card as any).mcqData;
const clozeData = (card as any).clozeData;

let question = "";
if (terms) question = terms[lang];
else if (mcqData) question = mcqData.question[lang];
else if (clozeData) question = clozeData.text[lang];
```

#### ✅ Nouveau Code

```typescript
import { getQuestionText } from "../utils/flashcardHelpers";

const question = getQuestionText(card, lang);
```

**Gain**: -8 lignes, type-safe

---

### Pattern 3: Filtrage de Cartes Valides

#### ❌ À Remplacer

```typescript
const validCards = cards.filter((card) => {
  const terms = (card as any).terms;
  const mcqData = (card as any).mcqData;

  if (terms) return terms[questionLang] && terms[answerLang];
  if (mcqData)
    return mcqData.question[questionLang] && mcqData.answer[answerLang];

  return false;
});
```

#### ✅ Nouveau Code

```typescript
import { hasRequiredLanguages } from "../utils/flashcardHelpers";

const validCards = cards.filter((card) =>
  hasRequiredLanguages(card, questionLang, answerLang)
);
```

**Gain**: -8 lignes, plus lisible

---

### Pattern 4: Type Guards pour Traitement Spécifique

#### ❌ À Remplacer

```typescript
if (card.type === "mcq" && (card as any).mcqData) {
  const mcqData = (card as any).mcqData;
  // Traiter le QCM
  console.log(mcqData.question);
}
```

#### ✅ Nouveau Code

```typescript
import { isFlashcardMCQ } from "../utils/flashcardHelpers";

if (isFlashcardMCQ(card)) {
  // TypeScript SAIT que card.mcqData existe
  console.log(card.mcqData.question); // IntelliSense fonctionne !
}
```

**Gain**: Type safety, IntelliSense

---

## 🎯 Fichiers Prioritaires à Migrer

### Haute Priorité (Duplication Importante)

1. **`hooks/useAppCoordinator.ts`** (lignes 174-202, 292-316, 495-519, 583-607)

   - Remplacer 4 occurrences de config IA par `getAIClientConfig()`
   - Gain estimé: -80 lignes

2. **`components/QuizScreen.tsx`** (lignes 84-112, 595-608, 753-780)

   - Remplacer les casts par `getQuestionText()` et `getAnswerText()`
   - Gain estimé: -30 lignes

3. **`components/ReviewAllScreen.tsx`** (lignes 180-201)
   - Utiliser `getAvailableLanguages()`
   - Gain estimé: -15 lignes

### Priorité Moyenne

4. **`hooks/useSRS.ts`**
   - Utiliser `hasRequiredLanguages()` pour filtrer les cartes
5. **`components/SRSReviewScreen.tsx`**

   - Utiliser les Type Guards

6. **Services de génération IA**
   - `services/curriculumService.ts`
   - `services/exerciseGenerationService.ts`
   - `services/aiCardGenerator.ts`

---

## 📝 Checklist de Migration

### Pour Chaque Fichier

- [ ] Identifier les patterns à remplacer (voir ci-dessus)
- [ ] Importer les utilitaires nécessaires
- [ ] Remplacer le code ancien
- [ ] Vérifier que TypeScript compile sans erreur
- [ ] Tester la fonctionnalité
- [ ] Supprimer les imports inutilisés

### Exemple Complet

```typescript
// 1. Ajouter les imports
import { getAIClientConfig } from "../utils/aiConfigHelper";
import {
  getQuestionText,
  hasRequiredLanguages,
} from "../utils/flashcardHelpers";

// 2. Remplacer le code
function myFunction() {
  // Ancien: 20 lignes de switch
  // Nouveau: 3 lignes
  const { apiKey, modelName, apiUrl } = getAIClientConfig(config);

  // Ancien: 8 lignes de casts
  // Nouveau: 1 ligne
  const question = getQuestionText(card, lang);

  // Ancien: 10 lignes de filtrage
  // Nouveau: 1 ligne
  const valid = cards.filter((c) => hasRequiredLanguages(c, "fr", "en"));
}

// 3. Supprimer les imports inutilisés (si applicable)
```

---

## ⚡ Migration Express (5 Minutes)

Si vous voulez voir les bénéfices rapidement, commencez par ces 3 changements :

### 1. Dans `useAppCoordinator.ts` (ligne ~174)

```typescript
// Remplacer le switch de 30 lignes par:
const { apiKey, modelName, apiUrl } = getAIClientConfig(config);
```

### 2. Dans `QuizScreen.tsx` (ligne ~84)

```typescript
// Remplacer les casts par:
const question = getQuestionText(currentCard, quizConfig.questionLang);
const answer = getAnswerText(currentCard, quizConfig.answerLang);
```

### 3. Dans `ReviewAllScreen.tsx` (ligne ~180)

```typescript
// Remplacer la boucle complexe par:
const allColumns = Array.from(
  new Set(flashcards.flatMap((card) => getAvailableLanguages(card)))
);
```

**Résultat**: -50 lignes de code, meilleure lisibilité, type safety

---

## 🧪 Tests Recommandés

Après chaque migration, vérifier :

1. **Build TypeScript**

   ```bash
   npm run build
   ```

2. **Tests Unitaires** (si disponibles)

   ```bash
   npm test
   ```

3. **Test Manuel**
   - Générer des cartes avec IA
   - Lancer un quiz
   - Vérifier les langues disponibles

---

## 💡 Conseils

### ✅ Bonnes Pratiques

- Migrer un fichier à la fois
- Commiter après chaque migration réussie
- Tester immédiatement après le changement
- Garder les deux approches temporairement si nécessaire

### ❌ À Éviter

- Tout refactorer d'un coup
- Modifier sans tester
- Mélanger refactoring et nouvelles fonctionnalités
- Ignorer les erreurs TypeScript

---

## 🆘 En Cas de Problème

### Erreur TypeScript

```
Property 'mcqData' does not exist on type 'Flashcard'
```

**Solution**: Utiliser le Type Guard approprié

```typescript
if (isFlashcardMCQ(card)) {
  // Maintenant TypeScript sait que mcqData existe
  card.mcqData.question;
}
```

### Import Non Trouvé

```
Cannot find module '../utils/aiConfigHelper'
```

**Solution**: Vérifier le chemin relatif depuis votre fichier

### Erreur de Runtime

```
Cannot read property 'question' of undefined
```

**Solution**: Vérifier que la carte a bien les données attendues

```typescript
const question = getQuestionText(card, lang); // Retourne '' si absent
if (question) {
  // Traiter la question
}
```

---

## 📚 Ressources

- **Audit Complet**: `AUDIT_TECHNIQUE_2026_01_13.md`
- **Changelog**: `CHANGELOG_AUDIT_2026_01_13.md`
- **Exemples Détaillés**: `EXEMPLES_UTILISATION_UTILITAIRES.ts`
- **Code Source**:
  - `utils/aiConfigHelper.ts`
  - `utils/flashcardHelpers.ts`

---

**Dernière mise à jour**: 13 janvier 2026  
**Statut**: ✅ Prêt à l'emploi  
**Support**: Voir les exemples dans `EXEMPLES_UTILISATION_UTILITAIRES.ts`
