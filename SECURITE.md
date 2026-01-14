# 🔒 Recommandations de Sécurité

## ⚠️ Risques Identifiés et Solutions

### 1. 🚨 CRITIQUE: Exposition de la Clé API Gemini

#### Problème Actuel

```typescript
// La clé API est accessible côté client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
```

**Risque:** N'importe qui peut:

- Inspecter le code JavaScript dans le navigateur
- Extraire votre clé API
- L'utiliser pour faire des requêtes à vos frais
- Épuiser votre quota

#### ⚠️ Solution Court Terme (Application Desktop Tauri)

Avec Tauri, vous pouvez protéger la clé en la stockant côté Rust:

**1. Créer un command Tauri (Backend Rust):**

```rust
// src-tauri/src/main.rs

#[tauri::command]
async fn generate_speech(text: String, voice_name: String) -> Result<Vec<u8>, String> {
    let api_key = std::env::var("GEMINI_API_KEY")
        .map_err(|_| "API key not configured".to_string())?;

    // Faire l'appel API ici côté Rust
    // La clé n'est jamais exposée au frontend

    // ... logique d'appel API ...

    Ok(audio_bytes)
}
```

**2. Appeler depuis le frontend:**

```typescript
// services/geminiService.ts
import { invoke } from "@tauri-apps/api/tauri";

export async function getAudioBuffer(
  text: string,
  config: QuizConfig
): Promise<AudioBuffer | null> {
  try {
    const voiceName =
      (config.voiceGender || "female") === "female" ? "Kore" : "Puck";

    // Appel sécurisé via Tauri
    const audioBytes = await invoke<number[]>("generate_speech", {
      text,
      voiceName,
    });

    const uint8Array = new Uint8Array(audioBytes);
    const audioBuffer = await decodeAudioData(
      uint8Array,
      audioContextForDecoding,
      24000,
      1
    );

    return audioBuffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    return null;
  }
}
```

**3. Configurer la clé dans l'environnement système:**

```bash
# macOS/Linux
export GEMINI_API_KEY="votre_clé_ici"

# Windows
set GEMINI_API_KEY=votre_clé_ici
```

#### ✅ Solution Long Terme (Si déploiement Web)

Créer un backend Node.js/Express:

```typescript
// backend/server.js
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/generate-speech", async (req, res) => {
  const { text, voiceName } = req.body;

  // Validation
  if (!text || text.length > 500) {
    return res.status(400).json({ error: "Invalid text" });
  }

  // Rate limiting (important!)
  // ...

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ audio: base64Audio });
  } catch (error) {
    res.status(500).json({ error: "Speech generation failed" });
  }
});

app.listen(3000);
```

---

### 2. 🔴 Validation des Imports de Fichiers

#### Problème Actuel

```typescript
// Aucune limite de taille ou validation
const reader = new FileReader();
reader.readAsText(file);
```

**Risques:**

- Import de fichiers malveillants
- Déni de service (fichiers énormes)
- Injection de code via JSON

#### ✅ Solution

```typescript
// services/fileParser.ts

// Constantes de sécurité
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CARDS = 10000;
const ALLOWED_EXTENSIONS = [".json", ".csv", ".md"];

export const parseFile = (
  file: File
): Promise<{ flashcards: Flashcard[]; name: string }> => {
  return new Promise((resolve, reject) => {
    // 1. Vérifier l'extension
    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      reject(
        new Error(
          `Extension non autorisée. Utilisez: ${ALLOWED_EXTENSIONS.join(", ")}`
        )
      );
      return;
    }

    // 2. Vérifier la taille
    if (file.size > MAX_FILE_SIZE) {
      reject(
        new Error(
          `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
        )
      );
      return;
    }

    // 3. Vérifier le type MIME
    const allowedMimeTypes = [
      "application/json",
      "text/csv",
      "text/markdown",
      "text/plain",
    ];
    if (file.type && !allowedMimeTypes.includes(file.type)) {
      reject(new Error("Type de fichier non autorisé"));
      return;
    }

    const reader = new FileReader();
    const fileName = file.name.replace(/\.(json|csv|md)$/i, "").trim();

    // 4. Timeout pour éviter le blocage
    const timeout = setTimeout(() => {
      reader.abort();
      reject(new Error("Timeout lors de la lecture du fichier"));
    }, 30000); // 30 secondes max

    reader.onload = (event) => {
      clearTimeout(timeout);

      try {
        const content = event.target?.result as string;

        // 5. Vérifier la longueur du contenu
        if (content.length > MAX_FILE_SIZE) {
          reject(new Error("Contenu du fichier trop volumineux"));
          return;
        }

        let flashcards: Flashcard[] = [];

        if (file.name.endsWith(".json")) {
          flashcards = parseJson(content);
        } else if (file.name.endsWith(".csv")) {
          flashcards = parseCsv(content);
        } else if (file.name.endsWith(".md")) {
          flashcards = parseMarkdown(content);
        } else {
          reject(new Error("Type de fichier non supporté"));
          return;
        }

        // 6. Vérifier le nombre de cartes
        if (flashcards.length > MAX_CARDS) {
          reject(new Error(`Trop de cartes (max ${MAX_CARDS})`));
          return;
        }

        if (flashcards.length === 0) {
          reject(new Error("Aucune carte valide trouvée dans le fichier"));
          return;
        }

        resolve({ flashcards, name: fileName });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Erreur lors de la lecture du fichier"));
    };

    reader.readAsText(file);
  });
};
```

**Améliorer parseJson pour éviter l'injection:**

```typescript
const parseJson = (content: string): Flashcard[] => {
  // Limiter la profondeur du JSON
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    throw new Error("JSON invalide");
  }

  if (!Array.isArray(data)) {
    throw new Error("Le JSON doit contenir un tableau");
  }

  // Limiter le nombre d'éléments
  if (data.length > MAX_CARDS) {
    throw new Error(`Trop de cartes (max ${MAX_CARDS})`);
  }

  return data
    .map((item: any, index: number): Flashcard | null => {
      // Validation stricte de chaque item
      if (typeof item !== "object" || item === null) {
        console.warn(`Item ${index} ignoré: pas un objet`);
        return null;
      }

      // Sanitize les strings
      const sanitizeString = (str: any): string => {
        if (typeof str !== "string") return "";
        // Limiter la longueur
        return str.slice(0, 1000).trim();
      };

      const id = uuidv4();
      const type =
        typeof item.type === "string"
          ? item.type.trim().toLowerCase()
          : undefined;

      // ... reste de la logique avec sanitization ...

      if (type === "classic" || !type) {
        if (item.terms && typeof item.terms === "object") {
          const sanitizedTerms: Record<string, string> = {};
          for (const [key, value] of Object.entries(item.terms)) {
            const sanitizedKey = sanitizeString(key);
            const sanitizedValue = sanitizeString(value);
            if (sanitizedKey && sanitizedValue) {
              sanitizedTerms[sanitizedKey] = sanitizedValue;
            }
          }

          if (Object.keys(sanitizedTerms).length > 0) {
            return { id, type: "classic", terms: sanitizedTerms };
          }
        }
      }

      // ... MCQ avec sanitization similaire ...

      return null;
    })
    .filter((card): card is Flashcard => card !== null);
};
```

---

### 3. 🟡 Protection XSS (Cross-Site Scripting)

#### Problème Actuel

```typescript
alert(`${flashcards.length} fiches importées depuis "${file.name}"`);
```

**Risque:** Si `file.name` contient `<script>alert('XSS')</script>`

#### ✅ Solution

**Créer une fonction de sanitization:**

```typescript
// utils/security.ts

export const sanitizeHtml = (str: string): string => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

export const sanitizeFileName = (fileName: string): string => {
  // Supprimer les caractères dangereux
  return fileName.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "").slice(0, 255); // Limiter la longueur
};
```

**Utiliser dans App.tsx:**

```typescript
import { sanitizeFileName } from "./utils/security";

const handleFileImport = async (file: File) => {
  try {
    const { flashcards, name } = await parseFile(file);
    const safeName = sanitizeFileName(name);
    const safeFileName = sanitizeFileName(file.name);

    const newSetName = safeName || CUSTOM_CARDS_NAME;
    setFlashcardSets((prev) => ({ ...prev, [newSetName]: flashcards }));
    setCurrentSetName(newSetName);

    // Utiliser un système de notification au lieu d'alert
    showNotification(
      `${flashcards.length} fiches importées depuis "${safeFileName}"`,
      "success"
    );
  } catch (error) {
    console.error(error);
    showNotification(
      `Erreur lors de l'importation: ${
        error instanceof Error ? error.message : "Erreur inconnue"
      }`,
      "error"
    );
  }
};
```

---

### 4. 🟡 Sécurisation du LocalStorage

#### Problème Actuel

```typescript
// Pas de validation lors de la lecture
const item = window.localStorage.getItem(key);
return item ? JSON.parse(item) : initialValue;
```

**Risques:**

- Corruption de données
- Injection de code via localStorage modifié manuellement

#### ✅ Solution

```typescript
// hooks/useLocalStorage.ts

import { useState, useEffect } from "react";

// Schéma de validation (optionnel mais recommandé)
type ValidationSchema<T> = (value: unknown) => value is T;

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validator?: ValidationSchema<T>
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);

      if (!item) {
        return initialValue;
      }

      const parsed = JSON.parse(item);

      // Validation optionnelle
      if (validator && !validator(parsed)) {
        console.warn(
          `Invalid data in localStorage for key "${key}", using initial value`
        );
        return initialValue;
      }

      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      // Vérifier la taille avant de sauvegarder
      const serialized = JSON.stringify(storedValue);

      // Limite de 5MB pour éviter de saturer le localStorage
      if (serialized.length > 5 * 1024 * 1024) {
        console.error(`Data too large for localStorage key "${key}"`);
        return;
      }

      window.localStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.error("localStorage quota exceeded");
        // Optionnel: nettoyer les anciennes données
        cleanupOldData();
      } else {
        console.error(`Error writing to localStorage key "${key}":`, error);
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

function cleanupOldData() {
  // Stratégie de nettoyage
  const keysToCheck = ["quizHistory", "persistentErrors"];

  for (const key of keysToCheck) {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const data = JSON.parse(item);
        if (Array.isArray(data)) {
          // Garder seulement les 50 derniers éléments
          localStorage.setItem(key, JSON.stringify(data.slice(0, 50)));
        }
      }
    } catch (e) {
      console.error(`Error cleaning up ${key}:`, e);
    }
  }
}
```

**Exemple d'utilisation avec validation:**

```typescript
// App.tsx

// Validator pour QuizHistoryEntry[]
const isQuizHistoryArray = (value: unknown): value is QuizHistoryEntry[] => {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof item.id === "number" &&
      typeof item.correctCount === "number" &&
      typeof item.totalCount === "number"
  );
};

const [history, setHistory] = useLocalStorage<QuizHistoryEntry[]>(
  "quizHistory",
  [],
  isQuizHistoryArray
);
```

---

### 5. 🟡 Limitation du Cache Audio

#### Problème Actuel

```typescript
// Cache sans limite
const audioCache = new Map<string, AudioBuffer>();
```

**Risque:** Fuite mémoire si beaucoup de cartes

#### ✅ Solution

```typescript
// services/geminiService.ts

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Déplacer à la fin (plus récent)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Supprimer si existe déjà
    this.cache.delete(key);

    // Supprimer le plus ancien si plein
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Utiliser le cache LRU
const audioCache = new LRUCache<string, AudioBuffer>(100); // Max 100 entrées

export async function getAudioBuffer(
  text: string,
  config: QuizConfig
): Promise<AudioBuffer | null> {
  const cacheKey = `${text}-${config.questionLang}-${
    config.voiceGender || "default"
  }`;

  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  // ... génération audio ...

  if (audioBuffer) {
    audioCache.set(cacheKey, audioBuffer);
    return audioBuffer;
  }

  return null;
}

// Fonction pour nettoyer le cache si nécessaire
export function clearAudioCache(): void {
  audioCache.clear();
}
```

---

### 6. 🟢 Content Security Policy (CSP)

#### Recommandation pour index.html

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Content Security Policy -->
  <meta
    http-equiv="Content-Security-Policy"
    content="
        default-src 'self';
        script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://aistudiocdn.com;
        style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com;
        font-src 'self' https://cdnjs.cloudflare.com;
        img-src 'self' data: https:;
        connect-src 'self' https://generativelanguage.googleapis.com;
        media-src 'self' blob:;
    "
  />

  <title>Multilingual Flashcard Quiz</title>
  <!-- ... -->
</head>
```

---

## 📋 Checklist de Sécurité

- [ ] ✅ Clé API protégée (backend ou Tauri command)
- [ ] ✅ Validation des fichiers importés (taille, type, contenu)
- [ ] ✅ Sanitization des inputs utilisateur
- [ ] ✅ Validation des données localStorage
- [ ] ✅ Limitation du cache audio (LRU)
- [ ] ✅ CSP configuré
- [ ] ✅ HTTPS en production
- [ ] ✅ Rate limiting sur les appels API
- [ ] ✅ Logging des erreurs (sans exposer de données sensibles)
- [ ] ✅ Gestion des erreurs robuste

---

## 🎯 Priorités

1. **URGENT:** Protéger la clé API (Tauri command ou backend)
2. **IMPORTANT:** Validation des imports de fichiers
3. **RECOMMANDÉ:** Sanitization XSS et localStorage sécurisé
4. **BONUS:** Cache LRU et CSP

---

**Note:** Ces recommandations sont essentielles pour une application en production. Pour un usage personnel local, certaines peuvent être optionnelles, mais la protection de la clé API reste CRITIQUE.
