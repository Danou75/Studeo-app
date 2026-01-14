# 🎮 Implémentation des Modes de Jeu - Rapport

## ✅ Fonctionnalités Implémentées

### 1. **Mode Normal** (par défaut)

- Comportement classique du quiz
- Pas de contraintes de temps ou de vies
- L'utilisateur peut parcourir toutes les cartes

### 2. **Mode Contre-la-montre** ⏱️

- **Objectif** : Répondre au maximum de cartes en 60 secondes
- **Affichage** : Chronomètre dégressif en haut de l'écran (orange)
- **Fin de partie** : Automatique quand le temps atteint 0
- **Logique** :
  - Timer qui décrémente chaque seconde
  - Fin automatique du quiz à 0 seconde
  - Compteur de bonnes réponses pour le score final

### 3. **Mode Survie** ❤️

- **Objectif** : Répondre correctement sans perdre toutes ses vies
- **Affichage** : Nombre de vies restantes en haut (rouge)
- **Règles** :
  - Départ avec 3 vies
  - Perte d'une vie à chaque mauvaise réponse
  - Game over quand vies = 0
- **Fin de partie** : Automatique quand toutes les vies sont perdues

### 4. **Mode Sprint** 🏃

- **Objectif** : Enchaîner 10 bonnes réponses consécutives
- **Affichage** : Compteur de série en haut (vert)
- **Règles** :
  - Compteur qui s'incrémente à chaque bonne réponse
  - Remise à zéro à la première erreur
  - Victoire automatique à 10 bonnes réponses d'affilée
- **Fin de partie** : Automatique quand le streak atteint 10

## 🎨 Interface Utilisateur

### Sélecteur de Mode (SetupScreen)

```tsx
🎮 Mode de Jeu
┌─────────────┬─────────────────────┐
│ ▶️ Normal   │ ⏱️ Contre-la-montre │
├─────────────┼─────────────────────┤
│ ❤️ Survie   │ 🏃 Sprint (10x)     │
└─────────────┴─────────────────────┘
```

- Boutons colorés selon le mode :
  - **Normal** : Bleu
  - **Contre-la-montre** : Orange
  - **Survie** : Rouge
  - **Sprint** : Vert

### Indicateurs en Jeu (QuizScreen)

- Affichage dynamique en haut de l'écran
- Couleurs cohérentes avec le sélecteur
- Mise à jour en temps réel

## 🔧 Modifications Techniques

### Fichiers Modifiés

1. **`types.ts`**

   - Ajout du type `GameMode`
   - Ajout du champ `gameMode` dans `QuizConfig`

2. **`components/SetupScreen.tsx`**

   - Ajout de l'état `gameMode`
   - Nouveau sélecteur UI pour les modes de jeu
   - Passage du `gameMode` dans la config du quiz

3. **`components/QuizScreen.tsx`** (réécriture complète)
   - Nouveaux états : `timeLeft`, `lives`, `correctStreak`, `correctCount`
   - Timer pour le mode "timed"
   - Logique de vies pour le mode "survival"
   - Compteur de streak pour le mode "sprint"
   - Fonction `evaluateAnswer()` unifiée
   - Conditions de fin de partie adaptées à chaque mode
   - Fonction `renderGameIndicators()` pour l'affichage

## 🧪 Tests Suggérés

### Mode Contre-la-montre

1. Lancer un quiz en mode "Contre-la-montre"
2. Vérifier que le timer démarre à 60s
3. Vérifier qu'il décrémente chaque seconde
4. Attendre la fin du temps → le quiz doit se terminer automatiquement
5. Vérifier le score final

### Mode Survie

1. Lancer un quiz en mode "Survie"
2. Vérifier l'affichage "❤️ Vies: 3"
3. Faire une erreur → vérifier que les vies passent à 2
4. Faire 2 autres erreurs → le quiz doit se terminer
5. Vérifier le score final

### Mode Sprint

1. Lancer un quiz en mode "Sprint"
2. Vérifier l'affichage "🏃 Série: 0 / 10"
3. Répondre correctement → série passe à 1
4. Faire une erreur → série retombe à 0
5. Enchaîner 10 bonnes réponses → victoire automatique

## 📊 Données Enregistrées

Le `gameMode` est maintenant inclus dans la configuration du quiz et sera disponible pour :

- L'historique des parties
- Les statistiques
- Les achievements futurs

## 🚀 Prochaines Étapes

1. **Tester** les 4 modes de jeu dans l'application
2. **Ajuster** si nécessaire (durées, nombre de vies, etc.)
3. **Implémenter** la fonctionnalité #5 : Thèmes personnalisables
4. **Ajouter** des achievements liés aux modes de jeu
5. **Sauvegarder** le `gameMode` dans l'historique

## 🎯 Statut Global du Top 5

| #   | Fonctionnalité          | Statut      |
| --- | ----------------------- | ----------- |
| 7   | Révision SRS ciblée     | ✅ Terminée |
| 6   | Modes de jeu            | ✅ Terminée |
| 5   | Thèmes personnalisables | ⏳ À faire  |
| 4   | Achievements            | ⏳ À faire  |
| 3   | Analytics avancées      | ⏳ À faire  |

---

**Date** : 2025-12-03  
**Version** : 1.0.0  
**Auteur** : Assistant IA
