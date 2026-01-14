# Déploiement Vercel - Guide Rapide

## 🚀 Déployer sur Vercel

### Option 1 : Via l'interface Vercel (Recommandé)

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec votre compte
3. Cliquez sur "Add New Project"
4. Importez ce dossier (ou créez un repo GitHub)
5. Configurez :
   - **Build Command** : `npm run build:web`
   - **Output Directory** : `dist`
   - **Install Command** : `npm install`
6. Cliquez sur "Deploy"

### Option 2 : Via CLI

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

## 📝 Configuration

Lors du premier déploiement, répondez :

```
? Set up and deploy "~/Desktop/Multilingual-flashcards Quiz copie"? [Y/n] y
? Which scope do you want to deploy to? [Votre compte]
? Link to existing project? [N/y] n
? What's your project's name? multilingual-flashcards
? In which directory is your code located? ./
? Want to override the settings? [y/N] y
? Build Command: npm run build:web
? Output Directory: dist
? Development Command: npm run dev:web
```

## ✅ Après le Déploiement

Vercel vous donnera une URL comme :

```
https://multilingual-flashcards-xxx.vercel.app
```

Vous pourrez :

- ✅ Accéder à l'app depuis n'importe quel navigateur
- ✅ L'utiliser sur iPad/iPhone
- ✅ L'installer comme PWA (icône sur l'écran d'accueil)

## 🔄 Mises à Jour

Pour mettre à jour l'application déployée :

```bash
# Faire vos modifications
# Puis redéployer
vercel --prod
```

Ou si vous utilisez GitHub, chaque push déclenchera un déploiement automatique.

## 📱 Installer sur iPad

1. Ouvrez l'URL Vercel dans Safari sur iPad
2. Appuyez sur le bouton "Partager"
3. Sélectionnez "Sur l'écran d'accueil"
4. L'app apparaîtra comme une vraie application !

## ⚠️ Différences avec la Version Tauri

**Version Web (Vercel)** :

- ✅ Synthèse vocale locale (navigateur)
- ✅ Toutes les fonctionnalités de quiz
- ✅ Import/Export de fichiers
- ❌ Pas de voix Gemini (seulement voix système)

**Version Tauri (Mac)** :

- ✅ Synthèse vocale Gemini (meilleure qualité)
- ✅ Performance native
- ✅ Toutes les fonctionnalités
