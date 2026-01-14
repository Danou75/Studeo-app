# 🔍 Diagnostic du Problème Gemini API

## Problème Identifié

La clé API Gemini ne fonctionne pas dans l'application alors qu'elle fonctionne dans d'autres applications.

## Causes Possibles

### 1. **Endpoint API Incorrect**

Le code utilise actuellement l'endpoint **`/v1beta/`** :

```
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

**Problème** : L'endpoint `/v1beta/` peut avoir des restrictions ou ne pas être disponible pour toutes les clés API.

**Solution** : Essayer l'endpoint stable `/v1/` :

```
https://generativelanguage.googleapis.com/v1/models/{model}:generateContent
```

### 2. **Modèles Disponibles**

Les modèles actuellement proposés :

- `gemini-2.0-flash-exp` (Experimental - peut ne pas être disponible)
- `gemini-1.5-flash`
- `gemini-1.5-pro`

**Problème** : Le modèle par défaut `gemini-2.0-flash-exp` est expérimental et peut ne pas être accessible avec toutes les clés API.

**Solution** : Utiliser `gemini-1.5-flash` ou `gemini-1.5-pro` comme modèle par défaut.

### 3. **Format de Requête**

Le code utilise `response_mime_type: "application/json"` dans la configuration.

**Problème** : Cette fonctionnalité peut ne pas être supportée par tous les modèles ou toutes les versions de l'API.

## Solutions Recommandées

### Solution 1 : Changer l'Endpoint (PRIORITAIRE)

Modifier `src-tauri/src/main.rs` ligne 211-215 :

```rust
// AVANT
let url = format!(
    "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
    model,
    final_api_key
);

// APRÈS
let url = format!(
    "https://generativelanguage.googleapis.com/v1/models/{}:generateContent?key={}",
    model,
    final_api_key
);
```

### Solution 2 : Changer le Modèle par Défaut

Modifier `src-tauri/src/main.rs` ligne 209 :

```rust
// AVANT
let model = model_name.unwrap_or_else(|| "gemini-2.0-flash-exp".to_string());

// APRÈS
let model = model_name.unwrap_or_else(|| "gemini-1.5-flash".to_string());
```

Et dans `components/AIGeneratorModal.tsx` ligne 34 :

```typescript
// AVANT
const [modelName, setModelName] = useState("gemini-2.0-flash-exp");

// APRÈS
const [modelName, setModelName] = useState("gemini-1.5-flash");
```

### Solution 3 : Rendre le `response_mime_type` Optionnel

Si les solutions 1 et 2 ne fonctionnent pas, essayer de retirer `response_mime_type`.

## Test de Diagnostic

Pour tester quelle est la vraie cause, vous pouvez :

1. **Tester avec curl** :

```bash
curl "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=VOTRE_CLE" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Dis bonjour"}]
    }]
  }'
```

2. **Vérifier les logs** : Ouvrir la console de développement et chercher les erreurs détaillées lors de la génération de cartes.

## Implémentation Automatique

Je vais implémenter les Solutions 1 et 2 maintenant.
