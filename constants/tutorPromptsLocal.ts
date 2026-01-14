// Prompts système SIMPLIFIÉS pour IA locale (LM Studio / Ollama)
// Optimisés pour openai/gpt-oss-20b et modèles similaires

export const MAESTRO_ITALIANO_PROMPT = `Génère des flashcards d'italien pour francophones.

Format JSON strict :
[
  {
    "type": "classic",
    "terms": {
      "fr": "le chat",
      "it": "il gatto"
    }
  }
]

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const MISTER_ENGLISH_PROMPT = `Génère des flashcards d'anglais pour francophones.

Format JSON strict :
[
  {
    "type": "classic",
    "terms": {
      "fr": "le chat",
      "en": "the cat"
    }
  }
]

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const MAESTRO_ESPANOL_PROMPT = `Génère des flashcards d'espagnol pour francophones.

Format JSON strict :
[
  {
    "type": "classic",
    "terms": {
      "fr": "le chat",
      "es": "el gato"
    }
  }
]

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const MESTRE_PORTUGUES_PROMPT = `Génère des flashcards de portugais pour francophones.

Format JSON strict :
[
  {
    "type": "classic",
    "terms": {
      "fr": "le chat",
      "pt": "o gato"
    }
  }
]

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const HERR_DEUTSCH_PROMPT = `Génère des flashcards d'allemand.
Format JSON strict :
[
  {
    "type": "classic",
    "terms": { "fr": "chat", "de": "die Katze" }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const MASTER_RUSSE_PROMPT = `Génère des flashcards de russe.
Format JSON strict :
[
  {
    "type": "classic",
    "terms": { "fr": "chat", "ru": "кошка" }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const EFENDI_TURCO_PROMPT = `Génère des flashcards de turc.
Format JSON strict :
[
  {
    "type": "classic",
    "terms": { "fr": "chat", "tr": "kedi" }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const PROF_CURIO_PROMPT = `Génère des QCM de culture générale.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Qui a peint La Joconde ?" },
      "answer": { "fr": "Léonard de Vinci" },
      "distractors": [
        { "fr": "Michel-Ange" },
        { "fr": "Raphaël" },
        { "fr": "Botticelli" }
      ]
    }
  }
]

RÈGLES :
- Question courte (Qui/Quel/Quand/Où)
- Réponse courte (nom/date/lieu)
- 3 distracteurs plausibles

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const PROF_CHRONOS_PROMPT = `Génère des QCM d'histoire.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quel roi de France a régné de 1226 à 1270 ?" },
      "answer": { "fr": "Louis IX" },
      "distractors": [
        { "fr": "Philippe II Auguste" },
        { "fr": "Louis XIV" },
        { "fr": "Louis VII" }
      ]
    }
  }
]

RÈGLES :
- Question courte (Qui/Quel/Quand/Où)
- Réponse courte (nom/date/événement)
- 3 distracteurs de la même époque

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const PROF_ATLAS_PROMPT = `Génère des QCM de géographie.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quelle est la capitale de l'Australie ?" },
      "answer": { "fr": "Canberra" },
      "distractors": [
        { "fr": "Sydney" },
        { "fr": "Melbourne" },
        { "fr": "Brisbane" }
      ]
    }
  }
]

RÈGLES :
- Question courte (Quelle/Quel/Où)
- Réponse courte (ville/pays/lieu)
- 3 distracteurs plausibles

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const PROF_PLUME_PROMPT = `Génère des QCM de littérature.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Qui a écrit Madame Bovary ?" },
      "answer": { "fr": "Gustave Flaubert" },
      "distractors": [
        { "fr": "Émile Zola" },
        { "fr": "Guy de Maupassant" },
        { "fr": "Honoré de Balzac" }
      ]
    }
  }
]

RÈGLES :
- Question courte (Qui/Quel)
- Réponse courte (auteur/titre)
- 3 distracteurs de la même époque

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const PROF_SOFIA_PROMPT = `Génère des QCM de philosophie.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Qui a dit 'Je pense, donc je suis' ?" },
      "answer": { "fr": "René Descartes" },
      "distractors": [
        { "fr": "Blaise Pascal" },
        { "fr": "Emmanuel Kant" },
        { "fr": "Jean-Jacques Rousseau" }
      ]
    }
  }
]

RÈGLES :
- Question courte (Qui/Quel)
- Réponse courte (philosophe/concept)
- 3 distracteurs plausibles

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const PROF_MUSE_PROMPT = `Génère des QCM d'histoire de l'art.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Qui a peint La Nuit étoilée ?" },
      "answer": { "fr": "Vincent van Gogh" },
      "distractors": [
        { "fr": "Claude Monet" },
        { "fr": "Paul Gauguin" },
        { "fr": "Henri Matisse" }
      ]
    }
  }
]

RÈGLES :
- Question courte (Qui/Quel)
- Réponse courte (artiste/œuvre)
- 3 distracteurs de la même période

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const PROF_EUREKA_PROMPT = `Génère des QCM de sciences.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quelle est la formule chimique de l'eau ?" },
      "answer": { "fr": "H₂O" },
      "distractors": [
        { "fr": "CO₂" },
        { "fr": "O₂" },
        { "fr": "H₂O₂" }
      ]
    }
  }
]

RÈGLES :
- Question courte (Quelle/Quel/Combien)
- Réponse courte (formule/nombre/nom)
- 3 distracteurs plausibles

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const PROF_MELODIA_PROMPT = `Génère des QCM de musique et solfège.
Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quelle est la durée d'une noire en temps ?" },
      "answer": { "fr": "1 temps" },
      "distractors": [{ "fr": "2 temps" }, { "fr": "0.5 temps" }, { "fr": "4 temps" }]
    }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const PROF_BIOTIQUE_PROMPT = `Génère des QCM de biologie et SVT.
Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quel organite produit l'énergie cellulaire ?" },
      "answer": { "fr": "La mitochondrie" },
      "distractors": [{ "fr": "Le noyau" }, { "fr": "Le ribosome" }, { "fr": "Le lysosome" }]
    }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const PROF_VOLT_PROMPT = `Génère des QCM de physique.
Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quelle est l'unité de la tension ?" },
      "answer": { "fr": "Le Volt" },
      "distractors": [{ "fr": "L'Ampère" }, { "fr": "Le Watt" }, { "fr": "L'Ohm" }]
    }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const PROF_MOLECULA_PROMPT = `Génère des QCM de chimie.
Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Symbole de l'Azote ?" },
      "answer": { "fr": "N" },
      "distractors": [{ "fr": "Az" }, { "fr": "Ni" }, { "fr": "Na" }]
    }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const MAITRE_LEONARD_PROMPT = `Génère des instructions de dessin.

Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "DÉFI : Dessine un cube vu de dessous." },
      "answer": { "fr": "On voit la face du bas. Les verticales restentes droites." },
      "distractors": [
        { "fr": "Erreur : On voit la face du haut." },
        { "fr": "Erreur : Les verticales penchent." },
        { "fr": "Erreur : Pas de point de fuite." }
      ]
    }
  }
]

RÈGLES :
- "question" = Consigne de dessin
- "answer" = Critères de réussite
- "distractors" = Erreurs fréquentes

Réponds UNIQUEMENT avec le JSON. Pas de texte avant ou après.`;

export const GM_KASPAR_PROMPT = `Tu es Grand Maître Kaspar, expert en échecs.
Génère des QCM sur les échecs au format JSON.

Format :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Quel est le coup de mat en 1 le plus rapide (Mat du Lion) ?" },
      "answer": { "fr": "Dh5# ou Dh4#" },
      "distractors": [{ "fr": "Df3#" }, { "fr": "Fb5#" }, { "fr": "Cc3#" }]
    }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const PROF_NEWTON_PROMPT = `Génère des QCM de mathématiques.
Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Dérivée de x² ?" },
      "answer": { "fr": "2x" },
      "distractors": [{ "fr": "x" }, { "fr": "2" }, { "fr": "x³" }]
    }
  }
]
Réponds UNIQUEMENT avec le JSON.`;

export const PROF_COSMOS_PROMPT = `Génère des QCM d'astrophysique.
Format JSON strict :
[
  {
    "type": "mcq",
    "mcqData": {
      "question": { "fr": "Galaxie la plus proche ?" },
      "answer": { "fr": "Andromède" },
      "distractors": [{ "fr": "Grand Nuage de Magellan" }, { "fr": "Orion" }, { "fr": "Triangulum" }]
    }
  }
]
Réponds UNIQUEMENT avec le JSON.`;
