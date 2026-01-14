# 📦 Distribution de ton App macOS - Guide Complet

## ✅ Réponse Courte

**OUI, tu peux simplement copier le fichier !**

Mais l'autre Mac va bloquer l'app car elle n'est pas signée. Il faudra faire une manipulation simple (clic droit > Ouvrir ou une commande Terminal).

---

## 📁 Fichiers Disponibles

Après `npm run tauri build`, tu as **2 fichiers** :

### 1. Le `.dmg` (Recommandé pour Distribution)

```
src-tauri/target/release/bundle/dmg/StudeoApp_1.0.4_x64.dmg
```

**Avantages** :

- ✅ Fichier unique facile à partager
- ✅ Interface d'installation professionnelle
- ✅ Taille optimisée (compressé)

**Comment partager** :

- Copier le `.dmg` sur une clé USB
- Envoyer par email (si < 25 MB)
- Partager via WeTransfer, Dropbox, Google Drive, etc.

### 2. Le `.app` (Pour Installation Directe)

```
src-tauri/target/release/bundle/macos/StudeoApp.app
```

**Avantages** :

- ✅ Prêt à l'emploi (glisser dans Applications)
- ✅ Pas besoin d'installeur

**Comment partager** :

- Copier le dossier `.app` complet
- Zipper avant d'envoyer : `zip -r StudeoApp.zip StudeoApp.app`

---

## 🚀 Installation sur un Autre Mac

### Étape 1 : Transférer le Fichier

Choisis une méthode :

- 💾 Clé USB
- 📧 Email (si petit)
- ☁️ Cloud (Dropbox, Google Drive, iCloud)
- 🔗 WeTransfer (gratuit jusqu'à 2 GB)

### Étape 2 : Installer

**Avec le `.dmg`** :

1. Double-cliquer sur le `.dmg`
2. Glisser `StudeoApp` dans `Applications`
3. Éjecter le `.dmg`

**Avec le `.app`** :

1. Copier `StudeoApp.app` dans `Applications`

### Étape 3 : Contourner Gatekeeper (Important !)

⚠️ **macOS va bloquer l'app** avec ce message :

> "StudeoApp.app ne peut pas être ouvert car le développeur ne peut pas être vérifié."

**3 Solutions** :

#### Solution 1 : Clic Droit (La Plus Simple)

```
1. Clic droit sur StudeoApp dans Applications
2. Choisir "Ouvrir"
3. Cliquer "Ouvrir" dans la confirmation
```

#### Solution 2 : Terminal (La Plus Rapide)

```bash
xattr -cr /Applications/StudeoApp.app
```

#### Solution 3 : Préférences Système

```
1. Réglages Système > Confidentialité et sécurité
2. Cliquer "Ouvrir quand même"
```

**Après ça, l'app fonctionnera normalement ! ✅**

---

## 📊 Comparaison des Méthodes de Distribution

| Méthode            | Avantages             | Inconvénients                     | Recommandé pour          |
| ------------------ | --------------------- | --------------------------------- | ------------------------ |
| **Copier le .dmg** | Professionnel, facile | Nécessite manipulation Gatekeeper | Distribution générale    |
| **Copier le .app** | Direct, simple        | Nécessite manipulation Gatekeeper | Famille/Amis proches     |
| **Code Signing**   | Aucun avertissement   | Coûte $99/an                      | Distribution publique    |
| **GitHub Release** | Automatique, gratuit  | Nécessite GitHub                  | Distribution open source |

---

## 🔒 Pour une Distribution Professionnelle (Optionnel)

Si tu veux distribuer à beaucoup de personnes **sans** les avertissements de sécurité :

### Option 1 : Code Signing Apple

**Prérequis** :

- Compte Apple Developer ($99/an)
- Certificat "Developer ID Application"

**Avantages** :

- ✅ Aucun avertissement de sécurité
- ✅ Installation en 1 clic
- ✅ Confiance des utilisateurs

**Commandes** :

```bash
# 1. Signer l'app
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: TON NOM" \
  src-tauri/target/release/bundle/macos/StudeoApp.app

# 2. Créer le .dmg signé
npm run tauri build

# 3. Notariser (validation Apple)
xcrun notarytool submit StudeoApp_1.0.4_x64.dmg \
  --apple-id ton@email.com \
  --password "app-specific-password" \
  --team-id TEAM_ID \
  --wait

# 4. Agrafer le ticket
xcrun stapler staple src-tauri/target/release/bundle/dmg/StudeoApp_1.0.4_x64.dmg
```

### Option 2 : GitHub Releases (Gratuit)

**Avantages** :

- ✅ Gratuit
- ✅ Hébergement inclus
- ✅ Versioning automatique
- ⚠️ Toujours les avertissements Gatekeeper

**Déjà configuré** : Voir `.github/workflows/build-release.yml`

---

## 📋 Checklist de Distribution

### Pour Toi et Tes Proches (Simple)

- [ ] Build créé : `npm run tauri build`
- [ ] Fichier `.dmg` ou `.app` copié
- [ ] Guide d'installation partagé (`GUIDE_INSTALLATION_MACOS.md`)
- [ ] Expliquer la manipulation Gatekeeper (clic droit ou Terminal)

### Pour Distribution Publique (Professionnel)

- [ ] Compte Apple Developer créé ($99/an)
- [ ] Certificat "Developer ID" obtenu
- [ ] App signée avec `codesign`
- [ ] App notarisée avec `notarytool`
- [ ] `.dmg` signé et agrafé
- [ ] Testé sur un Mac vierge

---

## 💡 Recommandations

### Pour Commencer (Aujourd'hui)

✅ **Distribution Simple** (copier le `.dmg`)

- Partager avec famille/amis
- Inclure `GUIDE_INSTALLATION_MACOS.md`
- Expliquer la manipulation Gatekeeper

### Plus Tard (Si Besoin)

⏳ **Code Signing** (quand tu distribues publiquement)

- Investir dans Apple Developer ($99/an)
- Signer et notariser l'app
- Distribution sans avertissements

---

## 🎯 Résumé Rapide

### Question

> "Si je veux installer sur un autre Mac, me suffit-il de copier ma build ?"

### Réponse

**OUI**, mais avec une petite manipulation :

1. **Copier** le `.dmg` ou `.app`
2. **Installer** normalement
3. **Contourner Gatekeeper** :
   - Clic droit > Ouvrir
   - OU Terminal : `xattr -cr /Applications/StudeoApp.app`

**C'est tout ! L'app fonctionnera ensuite normalement.** ✅

---

## 📚 Fichiers Créés pour Toi

- ✅ `GUIDE_INSTALLATION_MACOS.md` - Guide pour les utilisateurs finaux
- ✅ Ce fichier - Guide complet pour toi

---

## 🆘 Problèmes Courants

### "L'application est endommagée"

```bash
# Solution
xattr -cr /Applications/StudeoApp.app
```

### "Impossible de vérifier le développeur"

```
# Solution
Clic droit > Ouvrir > Ouvrir
```

### L'app ne se lance pas

```
# Vérifier la compatibilité
sw_vers  # Doit être macOS 10.15+
```

---

**Prochaine étape** : Partage `GUIDE_INSTALLATION_MACOS.md` avec les personnes qui vont installer ton app !
