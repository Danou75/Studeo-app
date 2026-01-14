# 🎓 Salle des Profs - Documentation

## Vue d'ensemble

La fonctionnalité "Salle des Profs" permet aux utilisateurs d'accéder à 11 professeurs experts spécialisés, chacun avec son propre prompt système optimisé pour générer des flashcards de haute qualité pédagogique.

## Professeurs disponibles

### 🌍 Langues (4 professeurs)

1. **Maestro Italiano** 🇮🇹

   - Expert en italien : grammaire, vocabulaire, culture
   - Focus : conjugaisons, accords, expressions idiomatiques

2. **Mister English** 🇬🇧

   - Expert en anglais : ESL, phrasal verbs, idioms
   - Focus : temps verbaux, faux-amis, différences UK/US

3. **Maestro Español** 🇪🇸

   - Expert en espagnol : ser/estar, subjonctif, culture hispanique
   - Focus : grammaire espagnole, expressions, culture

4. **Mestre Português** 🇵🇹
   - Expert en portugais : contractions, nasales, culture lusophone
   - Focus : particularités du portugais, prononciation

### 🏛️ Culture & Humanités (6 professeurs)

5. **Prof. Curio** 🎓

   - Culture générale : arts, sciences, société, sport
   - Focus : véracité, diversité des domaines

6. **Prof. Chronos** ⌛

   - Histoire : chronologie, événements, personnages historiques
   - Focus : dates précises, contextualisation

7. **Prof. Atlas** 🌍

   - Géographie : pays, capitales, géopolitique
   - Focus : cartographie, données actualisées

8. **Prof. Plume** ✒️

   - Littérature : auteurs, mouvements, figures de style
   - Focus : analyse littéraire, contexte historique

9. **Prof. Sofia** 🦉

   - Philosophie : auteurs, concepts, courants de pensée
   - Focus : neutralité, précision conceptuelle

10. **Prof. Muse** 🎨
    - Histoire de l'Art : mouvements, artistes, œuvres
    - Focus : description visuelle, vocabulaire technique

### 🔬 Sciences (1 professeur)

11. **Prof. Eureka** 🔬
    - Sciences : biologie, physique-chimie, astronomie
    - Focus : rigueur scientifique, vulgarisation

## Utilisation

### Accès à la Salle des Profs

1. Depuis l'écran d'accueil, cliquez sur le bouton **"🎓 Salle des Profs"** (entre "Conjuguer" et "Stats")
2. Une fenêtre modale s'ouvre avec 3 catégories :
   - 🌍 Langues
   - 🏛️ Culture & Humanités
   - 🔬 Sciences

### Sélection d'un professeur

1. Choisissez une catégorie en cliquant sur l'onglet correspondant
2. Cliquez sur la carte du professeur souhaité
3. Le modal se ferme et le générateur IA s'ouvre automatiquement
4. Le prompt système du professeur sélectionné est activé
5. Créez vos flashcards spécialisées !

## Architecture technique

### Fichiers créés/modifiés

#### Nouveaux fichiers

- `SYSTEM_PROMPTS.md` - Documentation complète des prompts
- `constants/tutorPrompts.ts` - Prompts système de tous les tuteurs
- `components/TutorsRoomModal.tsx` - Modal de sélection des tuteurs

#### Fichiers modifiés

- `types.ts` - Ajout des types `Tutor` et `TutorCategory`
- `constants.ts` - Ajout de la liste `TUTORS` et configuration portugais
- `contexts/AIConfigContext.tsx` - Ajout du support `selectedTutor`
- `components/SetupScreen.tsx` - Ajout du bouton "Salle des Profs", suppression du bouton "Réparer"
- `App.tsx` - Intégration du modal et de la logique de sélection

### Types TypeScript

```typescript
export type TutorCategory = "languages" | "culture" | "sciences";

export type Tutor = {
  id: string;
  name: string;
  emoji: string;
  category: TutorCategory;
  language?: string; // Code langue pour les tuteurs de langues
  systemPrompt: string;
  description: string;
};
```

### Contexte AI

Le contexte `AIConfigContext` a été enrichi pour gérer le tuteur sélectionné :

```typescript
interface AIConfig {
  // ... autres propriétés
  selectedTutor?: Tutor | null;
}

interface AIConfigContextType {
  // ... autres méthodes
  setSelectedTutor: (tutor: Tutor | null) => void;
}
```

## Prompts système

Chaque tuteur possède un prompt système détaillé qui :

1. **Définit son rôle et son identité**
2. **Établit des règles absolues** pour éviter les erreurs
3. **Analyse la demande de l'utilisateur**
4. **Spécifie les types de fiches à générer**
5. **Donne des exemples de traitement**
6. **Définit le format de sortie JSON**
7. **Garantit la qualité pédagogique**

### Exemple de structure de prompt

```
Tu es "[Nom du Professeur]", un [description].

## RÔLE ET IDENTITÉ
[Compétences et domaines d'expertise]

## RÈGLES ABSOLUES
1. [Règle 1]
2. [Règle 2]
...

## ANALYSE DE LA DEMANDE
[Comment analyser la demande utilisateur]

## TYPES DE FICHES À GÉNÉRER
[Différents types avec exemples]

## FORMAT DE SORTIE (JSON)
[Structure JSON attendue]

## QUALITÉ PÉDAGOGIQUE
[Critères de qualité]

## ERREURS À ÉVITER
❌ [Erreurs courantes]
✅ [Bonnes pratiques]
```

## Avantages

### Pour l'utilisateur

- ✅ Accès rapide à des experts spécialisés
- ✅ Génération de fiches de haute qualité pédagogique
- ✅ Interface intuitive avec catégorisation claire
- ✅ Prompts optimisés pour chaque domaine

### Pour le développement

- ✅ Architecture modulaire et extensible
- ✅ Séparation des préoccupations (prompts dans fichiers dédiés)
- ✅ Types TypeScript pour la sécurité
- ✅ Intégration transparente avec le générateur IA existant

## Évolutions futures possibles

1. **Personnalisation des prompts** - Permettre aux utilisateurs de modifier les prompts
2. **Ajout de nouveaux professeurs** - Mathématiques, Informatique, Droit, etc.
3. **Historique des tuteurs utilisés** - Statistiques d'utilisation
4. **Favoris** - Marquer ses professeurs préférés
5. **Niveaux de difficulté** - Adapter automatiquement selon le niveau de l'utilisateur

## Notes techniques

- Le bouton "Réparer" a été supprimé comme demandé
- Le bouton "Salle des Profs" est positionné entre "Conjuguer" et "Stats"
- Le modal utilise un design moderne avec dégradés violet/indigo
- Les cartes de professeurs ont des effets hover pour l'interactivité
- La langue portugaise a été ajoutée à `LANGUAGE_CONFIG`

## Support

Pour toute question ou suggestion concernant la Salle des Profs, consultez la documentation complète dans `SYSTEM_PROMPTS.md`.
