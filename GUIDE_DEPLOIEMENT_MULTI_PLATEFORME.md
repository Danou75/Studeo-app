# 🚀 Guide de Déploiement Multi-Plateforme - Studeo

## 📋 Vue d'Ensemble

Ton application **Studeo** peut être déployée sur **3 plateformes** :

| Plateforme       | Type                | Statut            | Avantages                              |
| ---------------- | ------------------- | ----------------- | -------------------------------------- |
| **macOS**        | Desktop (Tauri)     | ✅ Prêt           | Accès fichiers, performances natives   |
| **Windows**      | Desktop (Tauri)     | ⚙️ Build requis   | Accès fichiers, performances natives   |
| **Web (Vercel)** | Progressive Web App | ⚙️ Config requise | Accessible partout, pas d'installation |

---

## 1️⃣ Build Desktop pour macOS (Actuel)

### Commande de Build

```bash
npm run tauri build
```

### Résultat

L'application sera générée dans :

```
src-tauri/target/release/bundle/
├── macos/
│   └── StudeoApp.app          # Application macOS
├── dmg/
│   └── StudeoApp_1.0.4_x64.dmg # Installeur macOS
```

### Installation

- **Pour toi** : Double-cliquer sur `StudeoApp.app`
- **Pour distribution** : Partager le fichier `.dmg`

### ✅ Avantages Desktop macOS

- Accès complet au système de fichiers
- Import de fichiers PDF, images, audio, vidéo
- Performances natives
- Fonctionne hors ligne

---

## 2️⃣ Build Desktop pour Windows

### ⚠️ Prérequis

Pour créer un build Windows **depuis macOS**, tu as 2 options :

#### Option A : Cross-Compilation (Recommandé)

**Problème** : La cross-compilation Windows depuis macOS est complexe avec Tauri.

**Solution** : Utiliser **GitHub Actions** (gratuit et automatique)

#### Option B : Machine Windows

Utiliser une machine Windows ou une VM pour builder.

---

### 🎯 Solution Recommandée : GitHub Actions

Je vais créer un workflow GitHub Actions qui build automatiquement pour **macOS ET Windows** à chaque release.

#### Étapes :

1. **Créer un dépôt GitHub** (si pas déjà fait)

   ```bash
   cd "/Users/daniel/Desktop/Projet Studeo"
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create studeo --private --source=. --push
   ```

2. **Le workflow GitHub Actions** (je vais le créer pour toi)

   - Build automatique pour macOS et Windows
   - Génération des installeurs (.dmg, .msi, .exe)
   - Publication des releases

3. **Créer une release**

   ```bash
   git tag v1.0.4
   git push origin v1.0.4
   ```

4. **Résultat**
   GitHub Actions va automatiquement :
   - Builder pour macOS (Intel + Apple Silicon)
   - Builder pour Windows (x64)
   - Créer les installeurs
   - Les attacher à la release

---

### 📦 Fichiers Générés pour Windows

```
src-tauri/target/release/bundle/
├── msi/
│   └── StudeoApp_1.0.4_x64_en-US.msi  # Installeur Windows
├── nsis/
│   └── StudeoApp_1.0.4_x64-setup.exe  # Installeur alternatif
```

### ✅ Avantages Desktop Windows

- Même fonctionnalités que macOS
- Accès fichiers local
- Performances natives
- Fonctionne hors ligne

---

## 3️⃣ Déploiement Web sur Vercel

### 🌐 Version Web vs Desktop

| Fonctionnalité            | Desktop (Tauri) | Web (Vercel)            |
| ------------------------- | --------------- | ----------------------- |
| Génération IA             | ✅              | ✅                      |
| Quiz & SRS                | ✅              | ✅                      |
| Gamification              | ✅              | ✅                      |
| Import fichiers locaux    | ✅              | ⚠️ Limité (drag & drop) |
| Accès système de fichiers | ✅              | ❌                      |
| Fonctionne hors ligne     | ✅              | ⚠️ Partiel (PWA)        |
| Installation requise      | ✅              | ❌                      |
| Accessible partout        | ❌              | ✅                      |

### 📝 Configuration Vercel

#### Étape 1 : Préparer le Build Web

Ton `package.json` a déjà la commande :

```json
"build:web": "tsc -b && vite build --mode web"
```

#### Étape 2 : Configurer Vercel

Créer/Mettre à jour `vercel.json` :

```json
{
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "framework": "vite",
  "public": true,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "credentialless"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    }
  ]
}
```

#### Étape 3 : Déployer sur Vercel

**Option A : Via CLI**

```bash
npm i -g vercel
vercel login
vercel --prod
```

**Option B : Via GitHub**

1. Push ton code sur GitHub
2. Connecte ton repo à Vercel (vercel.com)
3. Vercel déploie automatiquement à chaque push

#### Étape 4 : Variables d'Environnement

Sur Vercel Dashboard, ajouter :

- `VITE_MODE=web` (pour désactiver les fonctionnalités Tauri)

### 🔧 Adaptations pour le Web

Certaines fonctionnalités Tauri ne fonctionnent pas sur le web. Il faut les détecter :

```typescript
// Vérifier si on est dans Tauri
const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;

// Désactiver les fonctionnalités Tauri sur le web
if (!isTauri) {
  // Masquer les boutons d'import de fichiers locaux
  // Utiliser des alternatives web (drag & drop, input file)
}
```

### ✅ Avantages Version Web

- Accessible depuis n'importe quel navigateur
- Pas d'installation requise
- Mises à jour automatiques
- Partage facile (juste un lien)
- Fonctionne sur mobile (responsive)

### ⚠️ Limitations Version Web

- Pas d'accès direct au système de fichiers
- Import de fichiers limité (drag & drop uniquement)
- Dépend de la connexion internet (sauf PWA en cache)

---

## 🎯 Stratégie Recommandée

### Pour Toi (Utilisation Personnelle)

✅ **Desktop macOS** (Tauri)

- Toutes les fonctionnalités
- Performances optimales
- Accès fichiers complet

### Pour Partager avec d'Autres

✅ **Version Web (Vercel)** + **Desktop Windows** (GitHub Actions)

**Pourquoi ?**

- **Web** : Accessible immédiatement, pas d'installation
- **Desktop Windows** : Pour les utilisateurs Windows qui veulent les fonctionnalités complètes

---

## 📦 Résumé des Commandes

### Build Desktop macOS

```bash
npm run tauri build
```

### Build Web pour Vercel

```bash
npm run build:web
vercel --prod
```

### Build Multi-Plateforme (GitHub Actions)

```bash
git tag v1.0.4
git push origin v1.0.4
# GitHub Actions build automatiquement macOS + Windows
```

---

## 🚀 Prochaines Étapes

### Immédiat

1. ✅ Build macOS terminé (en cours)
2. ⏳ Créer le workflow GitHub Actions pour Windows
3. ⏳ Configurer Vercel pour le déploiement web

### Court Terme

1. ⏳ Tester la version web
2. ⏳ Adapter les fonctionnalités Tauri pour le web
3. ⏳ Créer une page de téléchargement

---

## 💡 Recommandations

### Pour une Distribution Professionnelle

1. **Code Signing** (macOS)

   - Signer l'app avec un certificat Apple Developer
   - Permet la distribution hors App Store

2. **Code Signing** (Windows)

   - Signer avec un certificat Windows
   - Évite les warnings "Éditeur inconnu"

3. **Auto-Update**
   - Implémenter Tauri Updater
   - Mises à jour automatiques pour les utilisateurs

### Pour Démarrer Simplement

1. ✅ Build macOS local (pour toi)
2. ✅ Déploiement Vercel (pour partager rapidement)
3. ✅ GitHub Actions (pour Windows, quand nécessaire)

---

## 🆘 Besoin d'Aide ?

### Problèmes Courants

**Build Tauri échoue**
→ Vérifier que Rust est installé : `rustc --version`

**Vercel ne trouve pas le build**
→ Vérifier que `dist/` existe après `npm run build:web`

**Fonctionnalités Tauri ne marchent pas sur le web**
→ Normal ! Ajouter des détections `if (isTauri)`

---

**Prochaine étape** : Veux-tu que je crée :

1. Le workflow GitHub Actions pour Windows ?
2. La configuration Vercel optimisée ?
3. Les deux ?
