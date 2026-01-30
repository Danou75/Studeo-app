const CACHE_NAME = 'studeo-v1.2.1';
const RUNTIME_CACHE = 'studeo-runtime';

// Assets à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Active immédiatement
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Prend le contrôle immédiatement
  );
});

// Stratégies de cache
const cacheStrategies = {
  // Cache First: Pour les assets statiques (JS, CSS, images)
  cacheFirst: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Cache hit:', request.url);
      return cached;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    const response = await fetch(request);
    
    // Mettre en cache si c'est une réponse valide
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  },

  // Network First: Pour les données dynamiques (API, données utilisateur)
  networkFirst: async (request) => {
    const cache = await caches.open(RUNTIME_CACHE);
    
    try {
      console.log('[SW] Fetching from network:', request.url);
      const response = await fetch(request);
      
      // Mettre en cache la réponse
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      
      return response;
    } catch (error) {
      console.log('[SW] Network failed, trying cache:', request.url);
      const cached = await cache.match(request);
      
      if (cached) {
        return cached;
      }
      
      // Si pas de cache et pas de réseau, retourner une page offline
      if (request.destination === 'document') {
        return caches.match('/index.html');
      }
      
      throw error;
    }
  },

  // Stale While Revalidate: Affiche le cache puis met à jour en arrière-plan
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request).then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => cached);
    
    return cached || fetchPromise;
  }
};

// Gestion des requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // CRITIQUE : Ne JAMAIS intercepter ou mettre en cache les requêtes Supabase/Sync
  // Cela garantit que la synchro cloud est toujours fraîche et ne vient pas du cache du SW.
  if (url.hostname.includes('supabase')) {
    return;
  }

  // Ignorer les requêtes vers d'autres domaines
  if (url.origin !== location.origin) {
    return;
  }
  
  // Déterminer la stratégie selon le type de ressource
  let strategy;
  
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    // Assets statiques: Cache First
    strategy = cacheStrategies.cacheFirst;
  } else {
    // Autres ressources: Stale While Revalidate
    strategy = cacheStrategies.staleWhileRevalidate;
  }
  
  event.respondWith(strategy(request));
});

// Background Sync - Synchronisation en arrière-plan
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-quiz-results') {
    event.waitUntil(syncQuizResults());
  } else if (event.tag === 'sync-flashcards') {
    event.waitUntil(syncFlashcards());
  }
});

// Fonctions de synchronisation
async function syncQuizResults() {
  try {
    // Récupérer les résultats en attente depuis IndexedDB
    const pendingResults = await getPendingQuizResults();
    
    if (pendingResults.length === 0) {
      console.log('[SW] No pending quiz results to sync');
      return;
    }
    
    console.log('[SW] Syncing', pendingResults.length, 'quiz results');
    
    // Envoyer chaque résultat
    for (const result of pendingResults) {
      await fetch('/api/sync/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    }
    
    // Nettoyer les résultats synchronisés
    await clearPendingQuizResults();
    
    console.log('[SW] Quiz results synced successfully');
  } catch (error) {
    console.error('[SW] Failed to sync quiz results:', error);
    throw error; // Réessayer plus tard
  }
}

async function syncFlashcards() {
  try {
    const pendingCards = await getPendingFlashcards();
    
    if (pendingCards.length === 0) {
      console.log('[SW] No pending flashcards to sync');
      return;
    }
    
    console.log('[SW] Syncing', pendingCards.length, 'flashcards');
    
    for (const card of pendingCards) {
      await fetch('/api/sync/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card)
      });
    }
    
    await clearPendingFlashcards();
    
    console.log('[SW] Flashcards synced successfully');
  } catch (error) {
    console.error('[SW] Failed to sync flashcards:', error);
    throw error;
  }
}

// Helpers pour IndexedDB (simplifié - à implémenter complètement)
async function getPendingQuizResults() {
  // TODO: Implémenter avec IndexedDB
  return [];
}

async function clearPendingQuizResults() {
  // TODO: Implémenter avec IndexedDB
}

async function getPendingFlashcards() {
  // TODO: Implémenter avec IndexedDB
  return [];
}

async function clearPendingFlashcards() {
  // TODO: Implémenter avec IndexedDB
}

// Notifications Push (optionnel)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Studeo';
  const options = {
    body: data.body || 'Vous avez une nouvelle notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Si une fenêtre est déjà ouverte, la focus
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Sinon, ouvrir une nouvelle fenêtre
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Message du client vers le Service Worker
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
