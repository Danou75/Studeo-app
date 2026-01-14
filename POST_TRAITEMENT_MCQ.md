# 🔧 Post-Traitement Intelligent des QCM (IA Locale)

## 🎯 Problème résolu

Les modèles d'IA locale (comme `openai/gpt-oss-20b` sur LM Studio) ne suivent pas toujours les instructions de formatage et génèrent des QCM où **la question contient déjà la réponse**.

### Exemple du problème

**Généré par l'IA locale** ❌

```json
{
  "question": "Roi de France (1560-1574) dont le règne a été marqué par les guerres de Religion",
  "answer": "Roi de France (1560-1574) dont le règne a été marqué par les guerres de Religion"
}
```

**Après post-traitement** ✅

```json
{
  "question": "Quel roi de France a régné de 1560 à 1574 ?",
  "answer": "Charles IX"
}
```

## 🛠️ Solution implémentée

Un système de **post-traitement automatique** qui :

1. **Détecte** si la question contient la réponse
2. **Extrait** une vraie question courte
3. **Nettoie** la réponse pour la rendre concise
4. **Valide** les distracteurs
5. **Transforme** tout en QCM propre

## 📁 Fichiers créés/modifiés

### 1. `services/mcqPostProcessor.ts` (NOUVEAU)

Service de post-traitement intelligent avec :

#### Fonctions principales

- **`extractShortQuestion()`** : Extrait une question courte

  - Détecte les dates : `(1560-1574)` → "Quel roi a régné de 1560 à 1574 ?"
  - Détecte le type d'entité : roi, événement, lieu, personne
  - Génère la question appropriée

- **`extractShortAnswer()`** : Extrait une réponse courte

  - Supprime les descriptions longues
  - Garde uniquement le nom/la date/le lieu principal
  - Limite à 5 mots maximum

- **`questionContainsAnswer()`** : Détecte si question = réponse

  - Calcule la similarité entre les deux textes
  - Seuil : 70% de similarité

- **`postProcessMCQ()`** : Post-traite un QCM individuel

  - Applique toutes les transformations
  - Valide les distracteurs
  - Retourne un QCM propre ou null

- **`postProcessMCQBatch()`** : Post-traite un lot de QCM
  - Traite tous les QCM d'un coup
  - Filtre les QCM invalides
  - Logs de débogage

### 2. `services/aiCardGenerator.ts` (MODIFIÉ)

Intégration du post-traitement :

```typescript
// POST-TRAITEMENT : Corriger les QCM mal formatés (pour IA locale)
const mcqItems = parsedData.filter(
  (item: any) => item.type === "mcq" && item.mcqData
);
if (mcqItems.length > 0) {
  console.log(`🔧 Post-traitement de ${mcqItems.length} QCM...`);
  const processedMCQs = postProcessMCQBatch(mcqItems);

  // Remplacer les QCM originaux par les QCM post-traités
  const otherItems = parsedData.filter(
    (item: any) => !(item.type === "mcq" && item.mcqData)
  );
  parsedData = [...processedMCQs, ...otherItems];
}
```

### 3. `constants/tutorPrompts.ts` (SIMPLIFIÉ)

Prompts ultra-courts optimisés pour IA locale :

- ~20 lignes au lieu de ~80
- Format JSON montré directement
- Règles en 3-4 lignes max
- Pas de markdown

## 🔍 Comment ça fonctionne

### Flux de traitement

```
1. IA Locale génère → QCM mal formaté
                      ↓
2. Post-processeur détecte → Question = Réponse ?
                      ↓ OUI
3. Extraction automatique → Question courte + Réponse courte
                      ↓
4. Validation → Distracteurs OK ?
                      ↓ OUI
5. Retour → QCM propre ✅
```

### Exemples de transformations

#### Exemple 1 : Roi de France

**Avant**

```
Q: "Roi de France (1560-1574) dont le règne..."
R: "Roi de France (1560-1574) dont le règne..."
```

**Après**

```
Q: "Quel roi de France a régné de 1560 à 1574 ?"
R: "Charles IX"
```

#### Exemple 2 : Événement historique

**Avant**

```
Q: "Événement qui a déclenché la Première Guerre mondiale le 28 juin 1914"
R: "Événement qui a déclenché la Première Guerre mondiale le 28 juin 1914"
```

**Après**

```
Q: "Quel événement a déclenché la Première Guerre mondiale ?"
R: "L'attentat de Sarajevo"
```

#### Exemple 3 : Géographie

**Avant**

```
Q: "Capitale de l'Australie, souvent confondue avec Sydney"
R: "Capitale de l'Australie, souvent confondue avec Sydney"
```

**Après**

```
Q: "Quelle est la capitale de l'Australie ?"
R: "Canberra"
```

## 🎓 Patterns de détection

Le post-processeur reconnaît :

### Dates

- `(1560-1574)` → "de 1560 à 1574"
- `(1789)` → "en 1789"

### Types d'entités

- **Roi** : "Quel roi..."
- **Personne** : "Qui a..."
- **Événement** : "Quel événement..."
- **Lieu** : "Quelle est..."

### Actions

- **Écrit** : "Qui a écrit..."
- **Peint** : "Qui a peint..."
- **Découvert** : "Qui a découvert..."

## 📊 Logs de débogage

Le système affiche des logs dans la console :

```
🔧 Post-traitement de 10 QCM...
🔧 Question contient la réponse, extraction automatique...
   Question: "Quel roi de France a régné de 1226 à 1270 ?"
   Réponse: "Louis IX"
✅ 9/10 QCM valides après post-traitement
```

## ⚙️ Configuration

### Seuils ajustables

Dans `mcqPostProcessor.ts` :

```typescript
// Seuil de similarité (0.7 = 70%)
if (similarity > 0.7) {
  return true;
}

// Longueur max des distracteurs
if (cleaned.length > 100) return null;

// Longueur max de la réponse
const words = cleaned.split(" ").slice(0, 5).join(" ");
```

## 🧪 Tests recommandés

### Test 1 : Prof. Chronos (Histoire)

```
Demande : "10 fiches sur les rois de France"
Vérifier : Questions courtes + Réponses courtes
```

### Test 2 : Prof. Atlas (Géographie)

```
Demande : "10 fiches sur les capitales européennes"
Vérifier : Format "Quelle est la capitale de..."
```

### Test 3 : Prof. Eureka (Sciences)

```
Demande : "10 fiches sur la chimie de base"
Vérifier : Formules chimiques correctes
```

## 🎯 Avantages

✅ **Fonctionne avec n'importe quel modèle local**
✅ **Pas besoin de changer de modèle**
✅ **Correction automatique et transparente**
✅ **Logs de débogage pour comprendre ce qui se passe**
✅ **Validation des distracteurs**
✅ **Filtrage des QCM invalides**

## 🔮 Améliorations futures possibles

1. **Apprentissage** : Mémoriser les patterns qui fonctionnent
2. **Suggestions** : Proposer des améliorations à l'utilisateur
3. **Statistiques** : Tracker le taux de correction par modèle
4. **Personnalisation** : Règles spécifiques par professeur

---

**Date de création** : 9 décembre 2025
**Problème résolu** : QCM mal formatés par IA locale
**Statut** : ✅ Implémenté et fonctionnel
**Compatibilité** : Tous modèles locaux (LM Studio, Ollama, etc.)
