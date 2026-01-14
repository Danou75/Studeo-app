# 🎯 Système de Sélection Automatique des Prompts

## ✅ Problème résolu

Les prompts simplifiés pour IA locale étaient utilisés **pour tous les providers**, y compris Gemini qui peut gérer des prompts beaucoup plus détaillés et performants.

## 🛠️ Solution implémentée

Un système de **sélection automatique** qui choisit le bon prompt selon le provider :

- **Gemini** → Prompts détaillés (performants)
- **IA Locale** → Prompts simplifiés (compatibles)

## 📁 Architecture

### 1. Deux fichiers de prompts

#### `constants/tutorPrompts.ts` - Prompts DÉTAILLÉS pour Gemini

```typescript
export const PROF_CHRONOS_PROMPT = `Tu es Prof. Chronos, historien expert.

Génère des QCM d'histoire au format JSON strict.

RÈGLES ABSOLUES :
1. La question doit être COURTE et CLAIRE
2. La réponse doit être COURTE
3. Les 3 distracteurs doivent être de la même époque

Format JSON strict : [...]

IMPORTANT : La question NE DOIT PAS contenir la réponse.
Exemple INCORRECT : "Roi de France (1226-1270)..."
Exemple CORRECT : "Quel roi de France a régné de 1226 à 1270 ?"`;
```

#### `constants/tutorPromptsLocal.ts` - Prompts SIMPLIFIÉS pour IA locale

```typescript
export const PROF_CHRONOS_PROMPT = `Génère des QCM d'histoire.

Format JSON strict : [...]

RÈGLES :
- Question courte (Qui/Quel/Quand/Où)
- Réponse courte (nom/date/événement)
- 3 distracteurs de la même époque

Réponds UNIQUEMENT avec le JSON.`;
```

### 2. Sélecteur automatique

#### `constants/promptSelector.ts`

```typescript
export type AIProvider = "gemini" | "local";

export function getTutorPrompt(tutorId: string, provider: AIProvider): string {
  const prompts = provider === "gemini" ? GeminiPrompts : LocalPrompts;

  switch (tutorId) {
    case "prof-chronos":
      return prompts.PROF_CHRONOS_PROMPT;
    // ... autres tuteurs
  }
}

export function needsPostProcessing(
  provider: AIProvider,
  hasQCM: boolean
): boolean {
  return provider === "local" && hasQCM;
}
```

### 3. Intégration dans le service

#### `services/aiCardGenerator.ts`

```typescript
export const generateFlashcardsWithAI = async (
  config: AIGenerationConfig,
  tutorId?: string
): Promise<Flashcard[]> => {
  const { provider } = config;
  const aiProvider: AIProvider = provider === "local" ? "local" : "gemini";

  if (tutorId) {
    // Sélection automatique du bon prompt
    const systemPrompt = getTutorPrompt(tutorId, aiProvider);
    console.log(
      `📝 Using ${aiProvider === "gemini" ? "detailed" : "simplified"} prompt`
    );
    // ...
  }

  // Post-traitement uniquement pour IA locale avec QCM
  const shouldPostProcess = needsPostProcessing(
    aiProvider,
    mcqItems.length > 0
  );
  if (shouldPostProcess) {
    console.log(`🔧 Post-traitement pour IA locale...`);
    // ...
  }
};
```

### 4. Appel depuis le modal

#### `components/AIGeneratorModal.tsx`

```typescript
const tutorId = config.selectedTutor?.id;
const generatedCards = await generateFlashcardsWithAI(aiConfig, tutorId);
```

## 🔄 Flux de traitement

### Avec Gemini

```
1. User sélectionne Prof. Chronos
2. config.provider = 'gemini'
3. getTutorPrompt('prof-chronos', 'gemini')
   → Retourne prompt DÉTAILLÉ
4. Génération avec Gemini
5. needsPostProcessing('gemini', true) → false
6. PAS de post-traitement
7. Retour fiches propres ✅
```

### Avec IA Locale

```
1. User sélectionne Prof. Chronos
2. config.provider = 'local'
3. getTutorPrompt('prof-chronos', 'local')
   → Retourne prompt SIMPLIFIÉ
4. Génération avec LM Studio
5. needsPostProcessing('local', true) → true
6. Post-traitement automatique
7. Retour fiches corrigées ✅
```

## 📊 Comparaison des prompts

### Gemini (Détaillé)

- ~40 lignes
- Instructions détaillées
- Exemples multiples
- Règles explicites
- Cas d'erreur montrés

### IA Locale (Simplifié)

- ~20 lignes
- Instructions minimales
- 1 exemple simple
- Règles en 3-4 lignes
- Pas de markdown

## 🎯 Avantages

### Pour Gemini

✅ Prompts détaillés = Meilleure qualité
✅ Pas de post-traitement = Plus rapide
✅ Instructions claires = Moins d'erreurs

### Pour IA Locale

✅ Prompts simplifiés = Meilleure compatibilité
✅ Post-traitement automatique = Correction des erreurs
✅ Fonctionne avec modèles faibles

## 🔍 Logs de débogage

### Avec Gemini

```
🤖 Generating AI Cards with gemini: { topic: "rois de France", tutorId: "prof-chronos" }
📝 Using detailed prompt for prof-chronos
✅ 10 flashcards générées
```

### Avec IA Locale

```
🤖 Generating AI Cards with local: { topic: "rois de France", tutorId: "prof-chronos" }
📝 Using simplified prompt for prof-chronos
🔧 Post-traitement de 10 QCM pour IA locale...
🔧 Question contient la réponse, extraction automatique...
   Question: "Quel roi de France a régné de 1560 à 1574 ?"
   Réponse: "Charles IX"
✅ 9/10 QCM valides après post-traitement
```

## ⚙️ Configuration

### Détection automatique du provider

Le provider est détecté depuis `config.provider` :

- `'gemini'` → Utilise Gemini
- `'local'` → Utilise IA locale (LM Studio/Ollama)

### Pas de configuration manuelle

Le système sélectionne automatiquement :

- Le bon fichier de prompts
- L'application ou non du post-traitement
- Les logs appropriés

## 🧪 Tests recommandés

### Test 1 : Gemini + Prof. Chronos

1. Configurer provider = 'gemini'
2. Sélectionner Prof. Chronos
3. Demander "10 fiches sur les rois de France"
4. Vérifier dans la console : "Using detailed prompt"
5. Vérifier : Pas de post-traitement

### Test 2 : IA Locale + Prof. Chronos

1. Configurer provider = 'local'
2. Sélectionner Prof. Chronos
3. Demander "10 fiches sur les rois de France"
4. Vérifier dans la console : "Using simplified prompt"
5. Vérifier : Post-traitement appliqué

### Test 3 : Changement de provider

1. Générer avec Gemini
2. Changer pour IA locale
3. Générer à nouveau
4. Vérifier : Prompts différents utilisés

## 📝 Fichiers modifiés

1. ✅ `constants/tutorPrompts.ts` - Prompts détaillés Gemini
2. ✅ `constants/tutorPromptsLocal.ts` - Prompts simplifiés Local
3. ✅ `constants/promptSelector.ts` - Sélecteur automatique
4. ✅ `services/aiCardGenerator.ts` - Intégration sélection
5. ✅ `components/AIGeneratorModal.tsx` - Passage tutorId

## 🔮 Améliorations futures

1. **Cache des prompts** : Éviter de recharger à chaque fois
2. **Prompts personnalisables** : Permettre à l'utilisateur d'éditer
3. **Statistiques** : Tracker quel provider génère les meilleures fiches
4. **A/B Testing** : Comparer les deux versions de prompts

---

**Date de création** : 9 décembre 2025
**Problème résolu** : Prompts simplifiés utilisés pour tous les providers
**Statut** : ✅ Implémenté et fonctionnel
**Impact** : Gemini utilise maintenant des prompts optimisés, IA locale garde les prompts simplifiés
