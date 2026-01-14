# 📊 Projet Studeo : Audit Fonctionnel (Décembre 2025)

## 🎯 Vision du Projet

Studeo est une plateforme d'apprentissage augmentée par l'intelligence artificielle, permettant de transformer n'importe quel sujet en matériel d'étude (flashcards, leçons, exercices vocaux).

---

## 🛠️ Fonctionnalités Coeur (Core)

### 1. 🤖 Intelligence Artificielle Multi-Modèles

- **Fournisseurs supportés** : Google Gemini (Flash/Pro/Exp), OpenAI (GPT-4), Anthropic (Claude), Mistral AI, et modèles locaux (Ollama/LM Studio).
- **Générateur Universel** : Création de flashcards à partir d'un simple sujet, d'un texte copié ou d'un fichier importé.
- **Salle des Profs** : Système de "Tuteurs Spécialisés" (Einstein, Polyglotte, Historien) avec des prompts système dédiés pour des réponses expertes.

### 2. 📝 Système d'Étude & Quiz

- **5 Modes de Jeu** : Classique (Recto/Verso), QCM (Choix multiples), Dictée (Reconnaissance vocale), Trous (Cloze test), et Mixte.
- **Algorithme SRS (Spaced Repetition)** : Suivi de la mémorisation basé sur la difficulté ressentie pour optimiser les révisions.
- **Gamification** : Scores, niveaux de progression, et suivi d'activité (Heatmap).

### 3. 🇮🇹 Conjugueur & Répétiteur (Nouveau 🚀)

- **Conjugaison IA** : Conjugaison instantanée dans toutes les langues avec définition, exemple et traduction.
- **Répétiteur Vocal** : Entraînement à la prononciation des temps verbaux avec feedback immédiat (Correct/Incorrect) utilisant la technologie WebSpeech.

### 4. 🔬 Labo de Langues & Défis

- **Défis Créatifs** :
  - 🎹 **Musique** : Apprentissage des notes et accords sur un clavier virtuel.
  - ♟️ **Échecs** : Résolution de problèmes tactiques.
  - 🎨 **Dessin** : Exercices de reproduction visuelle.
- **Programmes d'Étude** : Génération de curriculums complets (Leçons + Flashcards) sur un thème donné.

---

## 📋 État de Santé du Code

| Module          | État       | Fiabilité                                                             |
| :-------------- | :--------- | :-------------------------------------------------------------------- |
| **Moteur IA**   | ✅ Stable  | Supporte maintenant le repli (fallback) sur des modèles simplifiés.   |
| **Audio (TTS)** | ✅ Stable  | Supporte les voix système macOS/Windows/Linux.                        |
| **Vocal (STT)** | ✅ Corrigé | Sécurité renforcée contre les crashs macOS (Info.plist OK).           |
| **Stockage**    | ✅ Robuste | LocalStorage avec système d'Export/Import JSON de sauvegarde.         |
| **Interface**   | ✅ Polie   | Système de notifications Toast unifié remplaçant les alertes natives. |

---

## 🚀 Roadmap Recommandée

1. **Multi-fichiers** : Permettre l'import de PDF volumineux (actuellement limité par la taille du prompt).
2. **Dashboard dynamique** : Ajouter des graphiques de progression à long terme.
3. **Notifications** : Rappels de révision SRS via le système OS.
