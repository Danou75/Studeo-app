# 📦 Installation de Studeo sur macOS

## 🎯 Méthode 1 : Avec le fichier .dmg (Recommandé)

### Étapes d'Installation

1. **Télécharger** le fichier `StudeoApp_1.0.4_x64.dmg`

2. **Ouvrir** le fichier `.dmg` (double-clic)

3. **Glisser** l'icône `StudeoApp` dans le dossier `Applications`

4. **Fermer** la fenêtre du `.dmg`

5. **Éjecter** le disque virtuel (clic droit sur le bureau)

### Premier Lancement

⚠️ **Si macOS bloque l'application** :

**Option A : Clic Droit (Le Plus Simple)**

1. Ouvrir le dossier `Applications`
2. **Clic droit** sur `StudeoApp`
3. Choisir **"Ouvrir"**
4. Cliquer **"Ouvrir"** dans la fenêtre de confirmation
5. L'app se lance ! ✅

**Option B : Terminal (Le Plus Rapide)**

1. Ouvrir le **Terminal** (Applications > Utilitaires > Terminal)
2. Copier-coller cette commande :
   ```bash
   xattr -cr /Applications/StudeoApp.app
   ```
3. Appuyer sur **Entrée**
4. Lancer l'app normalement (double-clic)

**Option C : Préférences Système**

1. Ouvrir **Réglages Système**
2. Aller dans **Confidentialité et sécurité**
3. Descendre jusqu'au message concernant StudeoApp
4. Cliquer **"Ouvrir quand même"**

---

## 🎯 Méthode 2 : Avec le fichier .app

### Étapes d'Installation

1. **Télécharger** le dossier `StudeoApp.app`

2. **Glisser** `StudeoApp.app` dans le dossier `Applications`

3. **Premier lancement** : Suivre les mêmes étapes que la Méthode 1 (clic droit ou Terminal)

---

## ❓ Problèmes Courants

### "L'application est endommagée"

**Cause** : macOS a mis l'app en quarantaine

**Solution** :

```bash
xattr -cr /Applications/StudeoApp.app
```

### "Impossible d'ouvrir l'application"

**Cause** : Gatekeeper bloque l'app

**Solution** : Clic droit > Ouvrir (voir ci-dessus)

### "L'application nécessite macOS XX.XX"

**Cause** : Version de macOS trop ancienne

**Solution** : Mettre à jour macOS ou demander une version compatible

---

## 🗑️ Désinstallation

1. Ouvrir le dossier `Applications`
2. Glisser `StudeoApp` dans la **Corbeille**
3. Vider la Corbeille

---

## 💡 Conseils

- ✅ L'app fonctionne **hors ligne** (pas besoin d'internet sauf pour l'IA)
- ✅ Toutes tes données sont stockées **localement** sur ton Mac
- ✅ Tu peux déplacer l'app où tu veux (mais `Applications` est recommandé)

---

## 🆘 Besoin d'Aide ?

Si tu rencontres un problème :

1. Essaie la commande Terminal : `xattr -cr /Applications/StudeoApp.app`
2. Redémarre ton Mac
3. Vérifie que tu as macOS 10.15 (Catalina) ou plus récent

---

**Version** : 1.0.4  
**Compatibilité** : macOS 10.15 (Catalina) et plus récent  
**Architecture** : Intel (x64) et Apple Silicon (via Rosetta 2)
