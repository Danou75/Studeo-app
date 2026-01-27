// Service Worker Registration
// Ce fichier enregistre le service worker pour activer les fonctionnalités PWA

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[App] Service Worker registered successfully:', registration.scope);

        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouveau contenu disponible
                console.log('[App] New content available, please refresh');
                
                // Optionnel : Afficher une notification à l'utilisateur
                if (confirm('Une nouvelle version de Studeo est disponible. Voulez-vous recharger ?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });

        // Écouter les changements de contrôleur
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[App] Service Worker controller changed');
        });

      } catch (error) {
        console.error('[App] Service Worker registration failed:', error);
      }
    });
  } else {
    console.log('[App] Service Workers not supported in this browser');
  }
}

// Fonction pour désinscrire le service worker (utile pour le debug)
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[App] Service Worker unregistered');
    }
  }
}

// Fonction pour vider le cache
export async function clearCache() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    
    console.log('[App] All caches cleared');
  }
}

// Fonction pour demander la permission des notifications
export async function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('[App] Notification permission granted');
      return true;
    } else {
      console.log('[App] Notification permission denied');
      return false;
    }
  }
  
  return false;
}

// Fonction pour envoyer une notification de test
export async function sendTestNotification() {
  const registration = await navigator.serviceWorker.ready;
  
  await registration.showNotification('Studeo', {
    body: 'Les notifications sont activées ! 🎉',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200]
  } as any);
}

// Fonction pour vérifier si l'app est installée
export function isAppInstalled() {
  // Vérifier si l'app est en mode standalone (installée)
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Fonction pour afficher le prompt d'installation
let deferredPrompt: any = null;

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Empêcher le prompt automatique
    e.preventDefault();
    
    // Stocker l'événement pour l'utiliser plus tard
    deferredPrompt = e;
    
    console.log('[App] Install prompt ready');
  });
}

export async function showInstallPrompt() {
  if (!deferredPrompt) {
    console.log('[App] Install prompt not available');
    return false;
  }

  // Afficher le prompt
  deferredPrompt.prompt();

  // Attendre le choix de l'utilisateur
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log('[App] Install prompt outcome:', outcome);
  
  // Réinitialiser le prompt
  deferredPrompt = null;
  
  return outcome === 'accepted';
}
