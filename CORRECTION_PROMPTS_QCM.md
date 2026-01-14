# 🔧 Correction des Prompts - QCM avec Questions/Réponses Distinctes

## 🐛 Problème identifié

Les prompts système des professeurs de Culture & Sciences généraient des QCM où **la réponse répétait la question**, rendant le quiz inutile.

### Exemple du problème

**Question** : "Roi de France (1560-1574) dont le règne a été marqué par les guerres de Religion..."
**Réponse** : "Roi de France (1560-1574) dont le règne a été marqué par les guerres de Religion..." ❌

### Ce qu'on veut

**Question** : "Quel roi de France a régné de 1560 à 1574 ?"
**Réponse** : "Charles IX" ✅

## ✅ Corrections apportées

### Professeurs corrigés (7 sur 11)

1. **Prof. Curio** 🎓 (Culture générale)
2. **Prof. Chronos** ⌛ (Histoire) ← Celui signalé par l'utilisateur
3. **Prof. Atlas** 🌍 (Géographie)
4. **Prof. Plume** ✒️ (Littérature)
5. **Prof. Sofia** 🦉 (Philosophie)
6. **Prof. Muse** 🎨 (Histoire de l'Art)
7. **Prof. Eureka** 🔬 (Sciences)

### Professeurs non modifiés (4 langues)

Les professeurs de langues (Maestro Italiano, Mister English, Maestro Español, Mestre Português) n'ont pas été modifiés car ils utilisent déjà le bon format avec `terms` pour les traductions.

## 🎯 Améliorations apportées

### 1. Ajout d'une règle absolue

```typescript
5. **QUESTIONS CLAIRES** : La question doit être DIFFÉRENTE de la réponse
```

### 2. Format QCM explicite

Chaque prompt contient maintenant un exemple de structure QCM :

```json
{
  "type": "mcq",
  "mcqData": {
    "question": { "fr": "Question précise" },
    "answer": { "fr": "Réponse courte" },
    "distractors": [
      { "fr": "Mauvaise réponse 1" },
      { "fr": "Mauvaise réponse 2" },
      { "fr": "Mauvaise réponse 3" }
    ]
  }
}
```

### 3. Exemples concrets par domaine

#### Prof. Chronos (Histoire)

```json
{
  "question": { "fr": "Quel roi de France a régné de 1560 à 1574 ?" },
  "answer": { "fr": "Charles IX" },
  "distractors": [
    { "fr": "Henri II" },
    { "fr": "François II" },
    { "fr": "Henri III" }
  ]
}
```

#### Prof. Atlas (Géographie)

```json
{
  "question": { "fr": "Quelle est la capitale de l'Australie ?" },
  "answer": { "fr": "Canberra" },
  "distractors": [
    { "fr": "Sydney" },
    { "fr": "Melbourne" },
    { "fr": "Brisbane" }
  ]
}
```

#### Prof. Plume (Littérature)

```json
{
  "question": { "fr": "Qui a écrit 'Madame Bovary' ?" },
  "answer": { "fr": "Gustave Flaubert" },
  "distractors": [
    { "fr": "Émile Zola" },
    { "fr": "Guy de Maupassant" },
    { "fr": "Honoré de Balzac" }
  ]
}
```

#### Prof. Sofia (Philosophie)

```json
{
  "question": { "fr": "Qui a dit 'Je pense, donc je suis' ?" },
  "answer": { "fr": "René Descartes" },
  "distractors": [
    { "fr": "Blaise Pascal" },
    { "fr": "Emmanuel Kant" },
    { "fr": "Jean-Jacques Rousseau" }
  ]
}
```

#### Prof. Muse (Histoire de l'Art)

```json
{
  "question": { "fr": "Qui a peint 'La Nuit étoilée' ?" },
  "answer": { "fr": "Vincent van Gogh" },
  "distractors": [
    { "fr": "Claude Monet" },
    { "fr": "Paul Gauguin" },
    { "fr": "Henri Matisse" }
  ]
}
```

#### Prof. Eureka (Sciences)

```json
{
  "question": { "fr": "Quelle est la formule chimique de l'eau ?" },
  "answer": { "fr": "H₂O" },
  "distractors": [{ "fr": "CO₂" }, { "fr": "O₂" }, { "fr": "H₂O₂" }]
}
```

### 4. Instruction finale claire

Tous les prompts se terminent maintenant par :

```
Génère UNIQUEMENT des QCM avec questions et réponses DISTINCTES.
```

## 📊 Avant/Après

### ❌ Avant (Problème)

```
Question: "Roi de France (1560-1574) dont le règne a été marqué par les guerres de Religion et l'exécution tragique des Tonneaux à Nantes."

Options:
1. Monarque du Valois (1461-1483)...
2. Roi de France (1560-1574) dont le règne... ← RÉPÈTE LA QUESTION
3. Premier roi mérovingien...
4. Monarque de la Renaissance française...
```

### ✅ Après (Corrigé)

```
Question: "Quel roi de France a régné de 1560 à 1574 ?"

Options:
1. Henri II
2. Charles IX ← RÉPONSE COURTE ET CLAIRE
3. François II
4. Henri III
```

## 🧪 Tests recommandés

Pour vérifier que la correction fonctionne :

1. Ouvrir la **Salle des Profs**
2. Sélectionner **Prof. Chronos** (Histoire)
3. Demander : "fais moi 10 fiches sur les rois de France"
4. Vérifier que les questions sont du type :
   - "Quel roi..." / "En quelle année..." / "Qui a..."
5. Vérifier que les réponses sont courtes :
   - "Louis XIV" / "1789" / "Napoléon Bonaparte"

## 📝 Notes techniques

- **Fichier modifié** : `constants/tutorPrompts.ts`
- **Lignes modifiées** : ~150 lignes au total
- **Format** : Tous les prompts Culture & Sciences utilisent maintenant le format QCM
- **Compatibilité** : Les prompts de langues restent inchangés (format `terms` approprié)

## 🎯 Résultat attendu

Avec ces corrections, les quiz générés par les professeurs de Culture & Sciences devraient maintenant avoir :

✅ Des questions claires et concises
✅ Des réponses courtes (noms, dates, faits)
✅ Des distracteurs plausibles et pertinents
✅ Aucune répétition entre question et réponse

---

**Date de correction** : 9 décembre 2025
**Problème signalé par** : Utilisateur (Prof. Chronos - Histoire)
**Statut** : ✅ Corrigé pour les 7 professeurs Culture & Sciences
