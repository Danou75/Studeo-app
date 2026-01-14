# 🔧 Plan de Correction - Priorité 1 (CRITIQUE)

## ✅ Checklist des Corrections à Appliquer

### 1️⃣ Corriger les Types Manquants

#### Fichier: `types.ts`

**Ajouter à la fin du fichier:**

```typescript
// Types pour la configuration vocale
export type VoiceGender = "female" | "male";
export type Language = string;

export type LanguageConfig = {
  name: string;
  emoji: string;
  speechLang: string;
  voices: {
    female: string;
    male: string;
  };
};
```

**Modifier QuizConfig:**

```typescript
export type QuizConfig = {
  questionLang: string;
  answerLang: string;
  mode: "classic" | "mcq";
  voiceEngine: "local" | "gemini";
  voiceGender?: VoiceGender; // AJOUTER cette ligne
  autoPlayAudio: boolean;
  quizName: string;
};
```

---

### 2️⃣ Corriger App.tsx - Fonction handleSaveEditedCards

#### Fichier: `App.tsx` (lignes 99-129)

**Remplacer la fonction complète par:**

```typescript
const handleSaveEditedCards = (jsonString: string): boolean => {
  try {
    const parsedData = JSON.parse(jsonString);
    if (!Array.isArray(parsedData))
      throw new Error("Le JSON doit être un tableau.");

    const newCards: Flashcard[] = parsedData.map((item: any) => {
      const id = uuidv4();

      if (item.type === "mcq") {
        if (!item.mcqData?.question || !item.mcqData?.answer) {
          throw new Error("Structure QCM invalide");
        }
        return {
          id,
          type: "mcq" as const,
          mcqData: item.mcqData,
        } as FlashcardMCQ;
      } else if (item.type === "classic" || !item.type) {
        if (!item.terms) {
          throw new Error("Structure classique invalide");
        }
        return {
          id,
          type: "classic" as const,
          terms: item.terms,
        } as FlashcardClassic;
      } else {
        throw new Error(
          "Chaque fiche doit avoir une propriété 'type' ('classic' ou 'mcq')."
        );
      }
    });

    setFlashcardSets((prev) => ({ ...prev, [currentSetName]: newCards }));
    setIsEditModalOpen(false);
    return true;
  } catch (e) {
    console.error("Erreur de parsing JSON:", e);
    alert(
      `Erreur de validation : ${e instanceof Error ? e.message : String(e)}`
    );
    return false;
  }
};
```

**Ajouter l'import:**

```typescript
import {
  Flashcard,
  FlashcardMCQ,
  FlashcardClassic,
  QuizConfig,
  QuizHistoryEntry,
} from "./types";
```

---

### 3️⃣ Corriger CompletionScreen.tsx

#### Fichier: `components/CompletionScreen.tsx` (ligne 24)

**Supprimer la ligne inutilisée:**

```typescript
// AVANT:
export const CompletionScreen: React.FC<Props> = ({
  lastResult,
  incorrectCards,
  persistentErrors,
  history,
  setHistory,  // ❌ SUPPRIMER cette ligne
  onStartRevision,
  // ...
}) => {

// APRÈS:
export const CompletionScreen: React.FC<Props> = ({
  lastResult,
  incorrectCards,
  persistentErrors,
  history,
  // setHistory supprimé
  onStartRevision,
  // ...
}) => {
```

**Aussi supprimer de l'interface Props (ligne 10):**

```typescript
type Props = {
  lastResult: QuizHistoryEntry;
  incorrectCards: Flashcard[];
  persistentErrors: Flashcard[];
  history: QuizHistoryEntry[];
  // setHistory: (updater: ...) => void;  ❌ SUPPRIMER
  onStartRevision: () => void;
  // ...
};
```

**Et dans App.tsx (ligne 171):**

```typescript
return (
  <CompletionScreen
    lastResult={lastResult}
    incorrectCards={incorrectCards}
    persistentErrors={getPersistentErrorCards()}
    history={history}
    // setHistory={setHistory}  ❌ SUPPRIMER
    onStartRevision={() => setScreen("revision")}
    // ...
  />
);
```

---

### 4️⃣ Corriger QuizScreen.tsx - Harmoniser les noms de propriétés

#### Fichier: `components/QuizScreen.tsx`

**Rechercher et remplacer toutes les occurrences:**

**Ligne 146:**

```typescript
// AVANT:
onQuizEnd(
  {
    correct: quizCards.length - incorrectAnswers.length,
    incorrect: incorrectAnswers.length,
    total: quizCards.length,
    time,
  },
  incorrectAnswers
);

// APRÈS:
onQuizEnd(
  {
    correctCount: quizCards.length - incorrectAnswers.length,
    totalCount: quizCards.length,
  },
  incorrectAnswers
);
```

**Ligne 172:**

```typescript
// AVANT:
onQuizEnd({ correct: 0, incorrect: 0, total: 0, time: "0:00" }, []);

// APRÈS:
onQuizEnd({ correctCount: 0, totalCount: 0 }, []);
```

**Ligne 183:**

```typescript
// AVANT:
correct: correctCount,
incorrect: incorrectCount,
total: quizCards.length,
time: elapsedTime,

// APRÈS:
correctCount: correctCount,
totalCount: quizCards.length,
```

**Remplacer `mcqData.options` par `mcqData.distractors` (ligne 232):**

```typescript
// AVANT:
if (mcqData?.options?.[answerLang] && mcqData.options[answerLang].length > 0) {
    finalOptions = [...mcqData.options[answerLang]];

// APRÈS:
if (mcqData?.distractors && mcqData.distractors.length > 0) {
    finalOptions = mcqData.distractors
        .map(d => d[answerLang])
        .filter(Boolean);
```

---

### 5️⃣ Corriger fileParser.ts - Structure MCQ

#### Fichier: `services/fileParser.ts` (ligne 56)

**Remplacer:**

```typescript
// AVANT:
return {
  id,
  type: "mcq",
  mcqData: {
    question: { [langKey]: item.front },
    answer: { [langKey]: item.back },
    options: { [langKey]: item.options }, // ❌
  },
};

// APRÈS:
return {
  id,
  type: "mcq",
  mcqData: {
    question: { [langKey]: item.front },
    answer: { [langKey]: item.back },
    distractors: item.options.map((opt: string) => ({ [langKey]: opt })), // ✅
  },
};
```

---

### 6️⃣ Corriger geminiService.ts - Variable d'environnement

#### Fichier: `services/geminiService.ts`

**Ligne 47 - Corriger le cache key:**

```typescript
// AVANT:
const cacheKey = `${text}-${config.questionLang}-${config.voiceGender}`;

// APRÈS:
const cacheKey = `${text}-${config.questionLang}-${
  config.voiceGender || "default"
}`;
```

**Ligne 53-59 - Corriger la variable d'environnement:**

```typescript
// AVANT:
if (!process.env.API_KEY) {
  console.error("API_KEY environment variable not set.");
  alert("Erreur: La clé API Gemini n'est pas configurée...");
  return null;
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// APRÈS:
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY environment variable not set.");
  alert(
    "Erreur: La clé API Gemini n'est pas configurée. Veuillez définir VITE_GEMINI_API_KEY dans .env.local"
  );
  return null;
}
const ai = new GoogleGenAI({ apiKey });
```

**Ligne 63 - Rendre voiceGender optionnel:**

```typescript
// AVANT:
const voiceName = config.voiceGender === "female" ? "Kore" : "Puck";

// APRÈS:
const voiceName =
  (config.voiceGender || "female") === "female" ? "Kore" : "Puck";
```

---

### 7️⃣ Corriger SetupScreen.tsx

#### Fichier: `components/SetupScreen.tsx`

**Ajouter l'état pour voiceGender (après les autres useState):**

```typescript
const [voiceGender, setVoiceGender] = useState<VoiceGender>("female");
```

**Ligne 98 - Ajouter voiceGender dans la config:**

```typescript
// AVANT:
onStartQuiz(cardsForQuiz.slice(0, quizSize), {
  questionLang,
  answerLang,
  voiceGender,
});

// APRÈS:
onStartQuiz(cardsForQuiz.slice(0, quizSize), {
  questionLang,
  answerLang,
  mode: "classic", // ou le mode sélectionné
  voiceGender,
});
```

**Ajouter un sélecteur de voix dans le JSX (optionnel mais recommandé):**

```tsx
<div className="mb-4">
  <label className="block mb-2 font-semibold">Voix:</label>
  <select
    value={voiceGender}
    onChange={(e) => setVoiceGender(e.target.value as VoiceGender)}
    className="w-full p-2 border rounded"
  >
    <option value="female">Féminine</option>
    <option value="male">Masculine</option>
  </select>
</div>
```

---

### 8️⃣ Mettre à jour .env.local

#### Fichier: `.env.local`

**Créer/Modifier:**

```bash
VITE_GEMINI_API_KEY=votre_clé_api_ici
```

---

### 9️⃣ Mettre à jour README.md

#### Fichier: `README.md`

**Ligne 18 - Corriger:**

```markdown
<!-- AVANT -->

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

<!-- APRÈS -->

2. Set the `VITE_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
```

---

### 🔟 Créer .env.local.example

#### Nouveau fichier: `.env.local.example`

```bash
# Gemini API Key pour la synthèse vocale
# Obtenir une clé sur: https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your_api_key_here
```

---

## ✅ Vérification Finale

Après avoir appliqué toutes ces corrections:

```bash
# 1. Nettoyer
rm -rf node_modules package-lock.json
npm install

# 2. Vérifier la compilation TypeScript
npm run build

# 3. Lancer en dev
npm run dev
```

**Résultat attendu:** ✅ 0 erreurs TypeScript

---

## 📝 Notes Importantes

1. **Backup:** Faire un backup avant d'appliquer les corrections
2. **Git:** Commiter après chaque correction majeure
3. **Tests:** Tester manuellement chaque fonctionnalité après correction
4. **API Key:** Ne JAMAIS commiter le fichier `.env.local`

---

## 🎯 Ordre d'Application Recommandé

1. ✅ Corriger `types.ts` (base pour tout le reste)
2. ✅ Corriger `geminiService.ts` (variables d'environnement)
3. ✅ Corriger `fileParser.ts` (structure MCQ)
4. ✅ Corriger `App.tsx` (types)
5. ✅ Corriger `QuizScreen.tsx` (propriétés)
6. ✅ Corriger `SetupScreen.tsx` (voiceGender)
7. ✅ Corriger `CompletionScreen.tsx` (variable inutilisée)
8. ✅ Mettre à jour `.env.local` et `README.md`
9. ✅ Tester la compilation

---

**Temps estimé:** 1-2 heures pour un développeur expérimenté

**Difficulté:** Moyenne (principalement du refactoring de types)

**Impact:** 🚨 CRITIQUE - L'application ne peut pas fonctionner sans ces corrections
