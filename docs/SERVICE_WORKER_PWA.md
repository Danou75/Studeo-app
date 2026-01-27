# Service Worker et PWA - Studeo

## 📱 Progressive Web App (PWA)

Studeo est maintenant une **Progressive Web App** complète, ce qui signifie qu'elle peut être installée sur n'importe quel appareil (ordinateur, tablette, smartphone) et fonctionner comme une application native.

## ✨ Fonctionnalités implémentées

### 1. **Installation de l'application**

- L'application peut être installée directement depuis le navigateur
- Sur Chrome/Edge : Cliquez sur l'icône d'installation dans la barre d'adresse
- Sur Safari (iOS) : Partagez > Ajouter à l'écran d'accueil
- Une fois installée, l'app apparaît comme une application native

### 2. **Fonctionnement hors ligne**

Le Service Worker met en cache les ressources essentielles pour permettre :

- L'accès à l'application même sans connexion internet
- Le chargement ultra-rapide des pages déjà visitées
- La synchronisation automatique des données quand la connexion revient

### 3. **Stratégies de cache**

#### Cache First (Assets statiques)

- JavaScript, CSS, images, polices
- Chargement instantané depuis le cache
- Mise à jour en arrière-plan

#### Network First (Données dynamiques)

- Appels API
- Données Supabase
- Toujours les données les plus récentes quand connecté
- Fallback sur le cache si hors ligne

#### Stale While Revalidate (Pages)

- Affichage immédiat depuis le cache
- Mise à jour en arrière-plan
- Meilleure expérience utilisateur

### 4. **Synchronisation en arrière-plan**

- Les résultats de quiz peuvent être sauvegardés localement
- Synchronisation automatique quand la connexion revient
- Aucune perte de données

### 5. **Notifications Push** (optionnel)

- Rappels pour les révisions SRS
- Notifications de nouveaux contenus
- Alertes personnalisées

## 🛠️ Fichiers créés

### `/public/sw.js`

Le Service Worker principal qui gère :

- La mise en cache des ressources
- Les stratégies de récupération des données
- La synchronisation en arrière-plan
- Les notifications push

### `/public/manifest.json`

Le manifeste PWA qui définit :

- Les métadonnées de l'application
- Les icônes pour tous les appareils
- Les raccourcis d'application
- Le mode d'affichage

### `/utils/serviceWorker.ts`

Utilitaires TypeScript pour :

- Enregistrer le service worker
- Gérer les mises à jour
- Afficher le prompt d'installation
- Gérer les notifications

### Icônes générées

- `icon-72.png` - Pour les petits écrans
- `icon-96.png` - Pour les badges
- `icon-128.png` - Pour les notifications
- `icon-144.png` - Pour Android
- `icon-152.png` - Pour iPad
- `icon-192.png` - Standard PWA
- `icon-384.png` - Haute résolution
- `icon-512.png` - Très haute résolution

## 🚀 Utilisation

### Pour les développeurs

#### Tester en local

```bash
npm run dev
```

Le service worker s'enregistre automatiquement au démarrage.

#### Vérifier l'installation

Ouvrez la console du navigateur et cherchez :

```
[App] Service Worker registered successfully
```

#### Désactiver le service worker (debug)

```typescript
import { unregisterServiceWorker, clearCache } from "./utils/serviceWorker";

// Désinscrire le SW
await unregisterServiceWorker();

// Vider le cache
await clearCache();
```

### Pour les utilisateurs

#### Installer l'application

1. Visitez Studeo dans votre navigateur
2. Cherchez l'icône d'installation (⊕) dans la barre d'adresse
3. Cliquez sur "Installer" ou "Ajouter à l'écran d'accueil"
4. L'application s'ouvre maintenant comme une app native !

#### Vérifier si l'app est installée

```typescript
import { isAppInstalled } from "./utils/serviceWorker";

if (isAppInstalled()) {
  console.log("App installée en mode standalone");
}
```

#### Activer les notifications

```typescript
import {
  requestNotificationPermission,
  sendTestNotification,
} from "./utils/serviceWorker";

// Demander la permission
const granted = await requestNotificationPermission();

if (granted) {
  // Envoyer une notification de test
  await sendTestNotification();
}
```

## 📊 Avantages de la PWA

### Performance

- ⚡ Chargement instantané (cache)
- 📉 Réduction de la consommation de données
- 🚀 Expérience ultra-fluide

### Accessibilité

- 📱 Fonctionne sur tous les appareils
- 🌐 Pas besoin de store d'applications
- 💾 Installation légère (pas de téléchargement lourd)

### Fiabilité

- 🔌 Fonctionne hors ligne
- 💪 Résilience aux problèmes réseau
- 🔄 Synchronisation automatique

### Engagement

- 🔔 Notifications push
- 🏠 Icône sur l'écran d'accueil
- 📲 Expérience native

## 🔧 Configuration avancée

### Modifier la version du cache

Dans `/public/sw.js`, changez :

```javascript
const CACHE_NAME = "studeo-v1.1.2"; // Incrémentez pour forcer la mise à jour
```

### Ajouter des ressources au cache

```javascript
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  // Ajoutez vos ressources ici
];
```

### Personnaliser les stratégies de cache

Modifiez les conditions dans l'événement `fetch` du service worker.

## 🐛 Dépannage

### Le service worker ne s'enregistre pas

- Vérifiez que vous êtes en HTTPS (ou localhost)
- Ouvrez la console et cherchez les erreurs
- Vérifiez que `/sw.js` est accessible

### Le cache ne se met pas à jour

- Incrémentez `CACHE_NAME` dans `sw.js`
- Fermez tous les onglets de l'app
- Rouvrez l'application

### L'app ne fonctionne pas hors ligne

- Vérifiez que le service worker est actif (DevTools > Application > Service Workers)
- Assurez-vous que les ressources sont bien en cache
- Testez en mode avion

## 📚 Ressources

- [MDN - Service Worker API](https://developer.mozilla.org/fr/docs/Web/API/Service_Worker_API)
- [Google - Progressive Web Apps](https://web.dev/progressive-web-apps/)
- [Workbox - Service Worker Libraries](https://developers.google.com/web/tools/workbox)

## 🎯 Prochaines étapes

- [ ] Implémenter IndexedDB pour le stockage local avancé
- [ ] Ajouter des notifications push personnalisées
- [ ] Créer des raccourcis d'application dynamiques
- [ ] Optimiser la stratégie de cache selon l'usage
- [ ] Ajouter un mode "économie de données"
