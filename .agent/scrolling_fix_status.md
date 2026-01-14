# Statut du Fix Scrolling - 07/01/2026

## Objectif

Résoudre le problème des écrans "bloqués" qui ne permettent pas de défiler, en forçant un scrolling interne par écran au lieu d'un scrolling global sur la fenêtre (qui est désactivé pour garder les headers fixes).

## Ce qui a été fait

1.  **Désactivation du scroll global** : `html`, `body`, `#root` et le `main` dans `App.tsx` ont `overflow: hidden`.
2.  **Main Container (`App.tsx`)** : Le tag `<main>` utilise `flex-1 min-h-0` pour les écrans principaux, ce qui permet à ses enfants de prendre toute la hauteur disponible et de gérer leur propre overflow.
3.  **Refactoring des écrans** : La quasi-totalité des écrans (`Conjugueur`, `Labo Langues`, `Vidéo Lab`, `Progression`, `Paramètres`, `Défis Musique/Échecs/Dessin`, `Curriculum`, etc.) ont été passés sur un modèle :
    - Container racine : `h-full flex flex-col overflow-hidden`.
    - Header : `shrink-0`.
    - Contenu : `flex-1 overflow-y-auto min-h-0`.
4.  **Modales** : Les modales (`AIGenerator`, `Help`, `SetsManagement`, `EditCards`) ont également été mises à jour pour supporter le scrolling interne.

## Problème persistant

Malgré ces changements, l'utilisateur indique que "ce n'est toujours pas cela".

### Pistes à explorer demain :

- **Vérifier la propagation de la hauteur** : S'assurer qu'aucun div intermédiaire ne casse le `height: 100%` ou le `flex: 1`.
- **iOS/Safari/Tauri spécifiques** : Le comportement du `h-screen` ou du scrolling flexbox peut varier. Tester avec `h-[100dvh]` ou vérifier si des éléments `fixed` interfèrent.
- **Écrans restants** : Vérifier si `KnowledgeMapScreen` (SVG) ou d'autres vues spécifiques bloquent encore.
- **Composants UI** : Certains composants comme `ActivityHeatmap` ou `SkillsRadar` pourraient avoir des largeurs/hauteurs fixes qui forcent un overflow non géré.
- **Padding Main** : Le `p-6 overflow-y-auto` par défaut dans `App.tsx` (quand l'écran n'est pas dans la liste blanche) pourrait entrer en conflit avec le design souhaité.

## Fichiers modifiés récemment

- `App.tsx`
- `components/VideoLabScreen.tsx`
- `components/DrawingChallengeScreen.tsx`
- `components/ProgressScreen.tsx`
- `components/ConjugatorScreen.tsx`
- ... (presque tous les écrans du dossier components/)
