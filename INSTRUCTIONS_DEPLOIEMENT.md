# 🚀 Instructions de Déploiement - Studeo

## ✅ Fichiers de Configuration Créés

- ✅ `vercel.json` - Configuration Vercel optimisée
- ✅ `.github/workflows/build-release.yml` - Build automatique macOS + Windows
- ✅ `GUIDE_DEPLOIEMENT_MULTI_PLATEFORME.md` - Guide complet

---

## 📦 Option 1 : Build Local macOS (Pour Toi)

### Commande

```bash
npm run tauri build
```

### Résultat

L'application sera dans :

```
src-tauri/target/release/bundle/macos/StudeoApp.app
src-tauri/target/release/bundle/dmg/StudeoApp_1.0.4_x64.dmg
```

### Installation

Double-cliquer sur `StudeoApp.app` ou installer le `.dmg`

---

## 🌐 Option 2 : Déploiement Web sur Vercel

### Prérequis

```bash
npm install -g vercel
```

### Étapes

#### 1. Login Vercel

```bash
vercel login
```

#### 2. Premier Déploiement

```bash
vercel
```

Répondre aux questions :

- **Set up and deploy?** → Yes
- **Which scope?** → Ton compte
- **Link to existing project?** → No
- **Project name?** → studeo (ou autre)
- **Directory?** → ./
- **Override settings?** → No

#### 3. Déploiement en Production

```bash
vercel --prod
```

### Résultat

Tu recevras une URL comme : `https://studeo-xxx.vercel.app`

### Configuration Automatique

Si tu connectes ton repo GitHub à Vercel :

- Chaque push sur `main` → Déploiement automatique
- Chaque PR → Preview deployment

---

## 🪟 Option 3 : Build Windows via GitHub Actions

### Prérequis

1. Créer un repo GitHub (si pas déjà fait)
2. Pusher ton code

### Étapes

#### 1. Initialiser Git (si pas fait)

```bash
cd "/Users/daniel/Desktop/Projet Studeo"
git init
git add .
git commit -m "Initial commit - Studeo v1.0.4"
```

#### 2. Créer le Repo GitHub

```bash
# Avec GitHub CLI (recommandé)
gh repo create studeo --private --source=. --push

# OU manuellement sur github.com puis:
git remote add origin https://github.com/TON_USERNAME/studeo.git
git branch -M main
git push -u origin main
```

#### 3. Créer une Release

```bash
git tag v1.0.4
git push origin v1.0.4
```

#### 4. Résultat

GitHub Actions va automatiquement :

1. Builder pour macOS (Intel + Apple Silicon)
2. Builder pour Windows (x64)
3. Créer une release avec les installeurs

### Télécharger les Builds

Aller sur : `https://github.com/TON_USERNAME/studeo/releases/tag/v1.0.4`

Tu trouveras :

- `StudeoApp_1.0.4_x64.dmg` (macOS)
- `StudeoApp_1.0.4_x64_en-US.msi` (Windows)
- `StudeoApp_1.0.4_x64-setup.exe` (Windows alternatif)

---

## 🎯 Stratégie Recommandée

### Pour Commencer (Aujourd'hui)

1. **Build macOS Local** ✅

   ```bash
   npm run tauri build
   ```

   → Pour ton utilisation personnelle

2. **Déploiement Vercel** ✅
   ```bash
   vercel --prod
   ```
   → Pour partager rapidement avec d'autres

### Plus Tard (Si Besoin)

3. **GitHub Actions pour Windows** ⏳
   - Quand tu veux distribuer sur Windows
   - Quand tu veux automatiser les releases

---

## 📋 Checklist de Déploiement

### Avant de Déployer

- [ ] Build réussi localement (`npm run build`)
- [ ] Tests manuels effectués
- [ ] Variables d'environnement configurées (si nécessaire)
- [ ] README.md à jour

### Déploiement Web (Vercel)

- [ ] `vercel.json` configuré ✅
- [ ] `npm run build:web` fonctionne
- [ ] Login Vercel effectué
- [ ] Premier déploiement test
- [ ] Déploiement production
- [ ] URL partagée et testée

### Déploiement Desktop (GitHub Actions)

- [ ] Repo GitHub créé
- [ ] `.github/workflows/build-release.yml` présent ✅
- [ ] Code pushé sur GitHub
- [ ] Tag créé et pushé
- [ ] GitHub Actions exécuté avec succès
- [ ] Releases téléchargées et testées

---

## 🔧 Dépannage

### Build Tauri Échoue

**Erreur** : `cargo not found`

```bash
# Installer Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Erreur** : `xcode-select: error`

```bash
# Installer Xcode Command Line Tools
xcode-select --install
```

### Vercel Échoue

**Erreur** : `Build failed`

```bash
# Vérifier que le build fonctionne localement
npm run build:web

# Vérifier que dist/ existe
ls -la dist/
```

**Erreur** : `Command not found: vercel`

```bash
# Réinstaller Vercel CLI
npm install -g vercel
```

### GitHub Actions Échoue

**Erreur** : `Permission denied`
→ Vérifier que le repo a les permissions GitHub Actions activées
→ Settings → Actions → General → Allow all actions

**Erreur** : `Build failed on Windows`
→ Vérifier les logs dans l'onglet Actions
→ Souvent lié à des dépendances manquantes

---

## 💡 Conseils

### Pour une Distribution Professionnelle

1. **Code Signing macOS**

   - Obtenir un Apple Developer Certificate ($99/an)
   - Signer l'app : `codesign --deep --force --verify --verbose --sign "Developer ID" StudeoApp.app`

2. **Code Signing Windows**

   - Obtenir un certificat Windows (DigiCert, Sectigo, etc.)
   - Évite les warnings "Éditeur inconnu"

3. **Auto-Update**
   - Implémenter Tauri Updater
   - Les utilisateurs reçoivent les mises à jour automatiquement

### Pour Démarrer Simplement

1. ✅ Build macOS local (gratuit, immédiat)
2. ✅ Vercel (gratuit, facile)
3. ⏳ GitHub Actions (gratuit, automatique)

---

## 📊 Comparaison des Options

| Critère            | Build Local      | Vercel           | GitHub Actions  |
| ------------------ | ---------------- | ---------------- | --------------- |
| **Coût**           | Gratuit          | Gratuit          | Gratuit         |
| **Temps**          | ~2 min           | ~1 min           | ~5-10 min       |
| **Plateformes**    | macOS uniquement | Web              | macOS + Windows |
| **Automatisation** | Manuelle         | Auto (si GitHub) | Automatique     |
| **Distribution**   | Fichier local    | URL publique     | Releases GitHub |

---

## 🎉 Résumé

Tu as maintenant **3 options** pour déployer Studeo :

1. **macOS Desktop** → `npm run tauri build`
2. **Web (Vercel)** → `vercel --prod`
3. **Windows Desktop** → GitHub Actions (automatique)

**Prochaine étape recommandée** :

1. Tester le build macOS local
2. Déployer sur Vercel pour avoir une version web
3. Configurer GitHub Actions quand tu veux distribuer sur Windows

---

**Besoin d'aide ?** Consulte `GUIDE_DEPLOIEMENT_MULTI_PLATEFORME.md` pour plus de détails.
