# ✅ Amélioration des Prompts des Professeurs de Langues

## 🎯 Objectif

Suite à la vérification demandée, j'ai amélioré les prompts des 4 professeurs de langues pour qu'ils génèrent des flashcards de meilleure qualité avec des exemples concrets et un format JSON détaillé.

## 📝 Professeurs améliorés

1. **Maestro Italiano** 🇮🇹 - Italien
2. **Mister English** 🇬🇧 - Anglais
3. **Maestro Español** 🇪🇸 - Espagnol
4. **Mestre Português** 🇵🇹 - Portugais

## 🔍 Problème identifié

Les prompts originaux étaient **trop vagues** :

```typescript
Génère des flashcards au format JSON avec les champs: front, back, type ("classic"), terms (objet avec clés de langues).
```

❌ **Problèmes** :

- Pas d'exemples concrets
- Format JSON non détaillé
- Pas de distinction entre vocabulaire, grammaire et conjugaison
- L'IA devait deviner le format attendu

## ✅ Améliorations apportées

### 1. Format JSON explicite par type de fiche

Chaque prompt contient maintenant **3 formats distincts** :

#### **VOCABULAIRE**

```json
{
  "type": "classic",
  "terms": {
    "fr": "le chat",
    "it": "il gatto"
  }
}
```

#### **GRAMMAIRE** (avec explications)

```json
{
  "type": "classic",
  "terms": {
    "fr": "Articles définis masculins (singulier/pluriel)",
    "it": "il / i - Ex: il libro (le livre), i libri (les livres)"
  }
}
```

#### **CONJUGAISONS**

```json
{
  "type": "classic",
  "terms": {
    "fr": "Essere (être) - Présent - io",
    "it": "io sono - Ex: Io sono italiano"
  }
}
```

### 2. Exemples concrets par langue

#### Maestro Italiano 🇮🇹

- Vocabulaire : "la maison" → "la casa"
- Grammaire : Démonstratifs (questo/quella)
- Expressions : "Come stai?" (informel) / "Come sta?" (formel)

#### Mister English 🇬🇧

- Vocabulaire : "le chat" → "the cat"
- Grammaire : this/that, Present Perfect
- Verbes irréguliers : "go - went - gone"
- Phrasal verbs : "give up"
- Expressions : "It's raining cats and dogs"

#### Maestro Español 🇪🇸

- Vocabulaire : "la playa" (la plage)
- Grammaire : SER vs ESTAR (distinction claire)
- Conjugaisons : "tengo" (j'ai)
- Expressions : "Es pan comido" (c'est du gâteau)

#### Mestre Português 🇵🇹

- Vocabulaire : "o pão" (le pain), "a água" (l'eau)
- Grammaire : Contractions (do/da, no/na)
- Conjugaisons : "eu falo" (je parle)
- Expressions : "Tudo bem?" (tout va bien ?)

### 3. Spécificités par langue

#### Anglais - Ajouts spécifiques

- **Verbes irréguliers** : Format infinitif - prétérit - participe passé
- **Phrasal verbs** : Avec exemples d'utilisation
- **UK vs US** : Différences mentionnées dans les règles

#### Espagnol - Focus sur

- **SER vs ESTAR** : Distinction claire avec exemples
- **Subjonctif** : Mentionné dans le rôle
- **Accents** : Importance des tildes

#### Portugais - Focus sur

- **Contractions** : do/da, no/na, pelo/pela
- **Nasales** : ão, õe (prononciation)
- **Infinitif personnel** : Particularité du portugais

## 📊 Avant / Après

### ❌ Avant (Vague)

```
Génère des flashcards au format JSON avec les champs:
front, back, type ("classic"), terms (objet avec clés de langues).
```

### ✅ Après (Détaillé)

```
## FORMAT DE SORTIE (JSON)
Génère des flashcards au format suivant :

### Pour le VOCABULAIRE :
{
  "type": "classic",
  "terms": {
    "fr": "le chat",
    "it": "il gatto"
  }
}

### Pour la GRAMMAIRE (explications) :
{
  "type": "classic",
  "terms": {
    "fr": "Articles définis masculins (singulier/pluriel)",
    "it": "il / i - Ex: il libro (le livre), i libri (les livres)"
  }
}

[... + exemples concrets ...]

Génère UNIQUEMENT des fiches avec le format JSON ci-dessus.
```

## 🎓 Qualité pédagogique améliorée

### Vocabulaire

✅ Traductions simples et directes
✅ Mots courants et utiles

### Grammaire

✅ Explications en français
✅ Exemples en langue cible
✅ Contexte d'utilisation

### Conjugaisons

✅ Format clair : Verbe - Temps - Personne
✅ Forme conjuguée
✅ Exemple de phrase

### Expressions

✅ Expression française
✅ Équivalent idiomatique
✅ Niveau de langue (formel/informel)

## 🧪 Tests recommandés

Pour chaque professeur de langue, tester :

1. **Vocabulaire simple**

   - Demande : "fais moi 10 fiches de vocabulaire de base"
   - Vérifier : Format `terms` avec fr/[langue]

2. **Grammaire**

   - Italien : "les articles démonstratifs"
   - Anglais : "les temps du passé"
   - Espagnol : "ser et estar"
   - Portugais : "les contractions"
   - Vérifier : Explications claires avec exemples

3. **Conjugaisons**
   - Demande : "conjugaison du verbe [être/to be/ser/ser]"
   - Vérifier : Format Verbe - Temps - Personne

## 📝 Résumé des changements

### Fichier modifié

- `constants/tutorPrompts.ts`

### Lignes ajoutées

- ~160 lignes de format et exemples détaillés
- 4 prompts de langues améliorés

### Structure ajoutée à chaque prompt

1. ✅ Section "FORMAT DE SORTIE (JSON)"
2. ✅ 3 formats distincts (Vocabulaire, Grammaire, Conjugaison)
3. ✅ Section "EXEMPLES DE BONNES FICHES"
4. ✅ Exemples concrets par type
5. ✅ Instruction finale claire

## 🎯 Bénéfices attendus

### Pour l'IA

✅ Instructions claires et non ambiguës
✅ Exemples concrets à suivre
✅ Format JSON précis

### Pour l'utilisateur

✅ Flashcards de meilleure qualité
✅ Format cohérent et prévisible
✅ Contenu pédagogique structuré
✅ Exemples d'utilisation systématiques

## 📚 Compatibilité

- ✅ **Format `terms`** : Conservé pour les langues (différent des QCM Culture)
- ✅ **Type "classic"** : Approprié pour les traductions
- ✅ **Rétrocompatibilité** : Les anciennes fiches restent valides

---

**Date d'amélioration** : 9 décembre 2025
**Demandé par** : Utilisateur (vérification des professeurs de langues)
**Statut** : ✅ Amélioré - 4 professeurs de langues avec format détaillé
