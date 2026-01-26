# 🔧 Plan de Refactoring - Configuration IA

**Date:** 26 janvier 2026  
**Objectif:** Éliminer la duplication de code dans `useAppCoordinator.ts`  
**Impact:** Réduction de ~200 lignes de code

---

## 📊 État Actuel

### Duplications Identifiées

Le fichier `hooks/useAppCoordinator.ts` contient **4 occurrences** du même switch case pour la configuration IA:

1. **Ligne 213-242** - `handleGenerateModuleContent`
2. **Ligne 342-371** - `handleGenerateBonusExercises`
3. **Ligne 549-578** - `handleInteractiveExercises`
4. **Ligne 637-666** - `handleSuggestedProgram`

### Code Dupliqué (38 lignes × 4 = 152 lignes)

```typescript
// SETUP CONFIG
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
      showToast("Clé API OpenAI manquante !", "error");
      return;
    }
    modelName = config.openaiModel || "gpt-4o";
    break;
  case "anthropic":
    apiKey = config.anthropicApiKey;
    if (!apiKey) {
      showToast("Clé API Claude manquante !", "error");
      return;
    }
    modelName = config.anthropicModel || "claude-3-5-sonnet-20240620";
    break;
  case "mistral":
    apiKey = config.mistralApiKey;
    if (!apiKey) {
      showToast("Clé API Mistral manquante !", "error");
      return;
    }
    modelName = config.mistralModel || "mistral-large-latest";
    break;
  case "local":
    apiUrl = config.localApiUrl;
    modelName = config.localModelName;
    break;
}
```

---

## ✅ Solution: Utiliser `getAIClientConfig`

### Helper Existant

Le fichier `utils/aiConfigHelper.ts` contient déjà la fonction `getAIClientConfig` qui:

- ✅ Gère tous les providers (Gemini, OpenAI, Claude, Mistral, Local)
- ✅ Valide les clés API
- ✅ Lance des erreurs explicites
- ✅ Retourne une configuration typée

### Code Refactorisé (7 lignes)

```typescript
// Configuration IA
let aiConfig;
try {
  aiConfig = getAIClientConfig(config);
} catch (error) {
  showToast(
    error instanceof Error ? error.message : "Configuration IA invalide",
    "error",
  );
  return;
}

// Utilisation
const content = await generateModuleContent(
  tutor,
  program,
  module,
  config.provider,
  aiConfig.apiKey, // au lieu de apiKey
  aiConfig.modelName, // au lieu de modelName
  aiConfig.apiUrl, // au lieu de apiUrl
);
```

---

## 🎯 Changements à Effectuer

### 1. Import (Ligne 19) ✅ FAIT

```typescript
import { getAIClientConfig } from "../utils/aiConfigHelper";
```

### 2. handleGenerateModuleContent (Lignes 213-242)

**Avant:**

```typescript
// SETUP CONFIG
let apiKey: string | undefined;
let modelName: string = config.geminiModel;
let apiUrl: string | undefined;

switch (
  config.provider
  // ... 30 lignes ...
) {
}

const content = await generateModuleContent(
  tutor,
  program,
  module,
  config.provider,
  apiKey,
  modelName,
  apiUrl,
);
```

**Après:**

```typescript
// Configuration IA
let aiConfig;
try {
  aiConfig = getAIClientConfig(config);
} catch (error) {
  showToast(
    error instanceof Error ? error.message : "Configuration IA invalide",
    "error",
  );
  return;
}

const content = await generateModuleContent(
  tutor,
  program,
  module,
  config.provider,
  aiConfig.apiKey,
  aiConfig.modelName,
  aiConfig.apiUrl,
);
```

### 3. handleGenerateBonusExercises (Lignes 342-371)

**Avant:**

```typescript
try {
    // SETUP CONFIG
    let apiKey: string | undefined;
    // ... switch case ...

    const newCards = await generateBonusExercises(
        activeTutor, studyContent.currentLesson.topic,
        studyContent.currentLesson.content,
        config.provider, apiKey, modelName, apiUrl
    );
}
```

**Après:**

```typescript
try {
  // Configuration IA
  const aiConfig = getAIClientConfig(config);

  const newCards = await generateBonusExercises(
    activeTutor,
    studyContent.currentLesson.topic,
    studyContent.currentLesson.content,
    config.provider,
    aiConfig.apiKey,
    aiConfig.modelName,
    aiConfig.apiUrl,
  );
} catch (error) {
  if (error instanceof Error && error.message.includes("API")) {
    showToast(error.message, "error");
    return;
  }
  showToast("Erreur lors de la génération des exercices bonus.", "error");
  console.error(error);
}
```

### 4. handleInteractiveExercises (Lignes 549-578)

Même transformation que ci-dessus.

### 5. handleSuggestedProgram (Lignes 637-666)

Même transformation que ci-dessus.

---

## 📈 Bénéfices Attendus

| Métrique              | Avant       | Après   | Gain                   |
| --------------------- | ----------- | ------- | ---------------------- |
| **Lignes de code**    | ~780        | ~630    | **-150 lignes (-19%)** |
| **Duplications**      | 4           | 0       | **-100%**              |
| **Maintenabilité**    | Faible      | Élevée  | ✅                     |
| **Gestion d'erreurs** | Incohérente | Unifiée | ✅                     |
| **Tests**             | Difficile   | Facile  | ✅                     |

---

## 🚨 Points d'Attention

### Gestion d'Erreurs Améliorée

L'ancien code:

- ❌ Retournait silencieusement sans message pour certains providers
- ❌ Messages d'erreur incohérents
- ❌ Pas de validation pour l'API locale

Le nouveau code:

- ✅ Messages d'erreur explicites pour tous les providers
- ✅ Validation uniforme
- ✅ Gestion centralisée dans `getAIClientConfig`

### Compatibilité

- ✅ Aucun changement dans les signatures de fonctions
- ✅ Comportement identique pour l'utilisateur
- ✅ Tests existants restent valides

---

## 🔄 Prochaines Étapes

### Phase 1: Refactoring Manuel (Recommandé)

1. ✅ Import ajouté
2. ⏳ Remplacer occurrence 1 (handleGenerateModuleContent)
3. ⏳ Remplacer occurrence 2 (handleGenerateBonusExercises)
4. ⏳ Remplacer occurrence 3 (handleInteractiveExercises)
5. ⏳ Remplacer occurrence 4 (handleSuggestedProgram)
6. ⏳ Tester la compilation
7. ⏳ Tester l'application
8. ⏳ Commit

### Phase 2: Validation

```bash
# Vérifier la compilation
npm run build

# Vérifier qu'il n'y a plus de switch cases
grep -n "switch (config.provider)" hooks/useAppCoordinator.ts
# Devrait retourner: aucun résultat

# Vérifier l'utilisation du helper
grep -n "getAIClientConfig" hooks/useAppCoordinator.ts
# Devrait retourner: 5 lignes (1 import + 4 usages)
```

### Phase 3: Tests

- [ ] Tester génération de module (Curriculum)
- [ ] Tester exercices bonus (après quiz)
- [ ] Tester exercices interactifs (leçon)
- [ ] Tester programme suggéré (Tutors Room)
- [ ] Tester avec chaque provider (Gemini, OpenAI, Claude, Mistral, Local)

---

## 💡 Améliorations Futures

### Refactoring Supplémentaire

D'autres fichiers contiennent probablement des duplications similaires:

```bash
# Rechercher dans tous les services
grep -r "switch (.*provider)" services/
```

### Centralisation Complète

Créer un hook `useAIClient` qui:

- Gère la configuration
- Gère les erreurs
- Fournit des méthodes typées pour chaque service

```typescript
const useAIClient = () => {
  const { config } = useAIConfig();
  const { showToast } = useToast();

  const getConfig = () => {
    try {
      return getAIClientConfig(config);
    } catch (error) {
      showToast(error.message, "error");
      throw error;
    }
  };

  return { getConfig, config };
};
```

---

## 📝 Conclusion

Ce refactoring est une **amélioration significative** de la qualité du code:

- ✅ **Maintenabilité**: Un seul endroit pour modifier la logique de configuration
- ✅ **Fiabilité**: Gestion d'erreurs cohérente
- ✅ **Lisibilité**: Code plus concis et clair
- ✅ **Testabilité**: Plus facile à tester

**Recommandation**: Procéder au refactoring manuel avec tests après chaque modification.

---

_Document créé le 26 janvier 2026_  
_Statut: En attente d'implémentation_
