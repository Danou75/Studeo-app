import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Vérifier si l'app est déjà installée
        const checkInstalled = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                                (window.navigator as any).standalone === true;
            setIsInstalled(isStandalone);
        };

        checkInstalled();

        // Écouter l'événement beforeinstallprompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);
            
            // Attendre 3 secondes avant d'afficher le prompt (pour ne pas être intrusif)
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        // Écouter l'installation réussie
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }

        // Afficher le prompt d'installation natif
        await deferredPrompt.prompt();

        // Attendre le choix de l'utilisateur
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('[PWA] Installation acceptée');
        } else {
            console.log('[PWA] Installation refusée');
        }

        // Réinitialiser
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Réafficher dans 24h si l'utilisateur refuse
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    };

    // Ne rien afficher si déjà installé ou si pas de prompt disponible
    if (isInstalled || !showPrompt || !deferredPrompt) {
        return null;
    }

    // Vérifier si l'utilisateur a déjà refusé récemment (dans les dernières 24h)
    const dismissedTime = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedTime) {
        const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60);
        if (hoursSinceDismissed < 24) {
            return null;
        }
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-border p-6 backdrop-blur-lg">
                {/* Header avec icône */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                        <span className="text-3xl">🎓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-text-primary mb-1">
                            Installer Studeo
                        </h3>
                        <p className="text-sm text-text-muted">
                            Accédez à Studeo comme une application native, même hors ligne !
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-text-muted hover:text-text-primary transition-colors shrink-0"
                        aria-label="Fermer"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Avantages */}
                <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                        <i className="fas fa-bolt text-yellow-500 w-4"></i>
                        <span>Lancement instantané</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                        <i className="fas fa-wifi-slash text-blue-500 w-4"></i>
                        <span>Fonctionne hors ligne</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                        <i className="fas fa-mobile-alt text-green-500 w-4"></i>
                        <span>Expérience native</span>
                    </div>
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                    <Button
                        variant="primary"
                        className="flex-1 rounded-xl font-bold"
                        onClick={handleInstallClick}
                    >
                        <i className="fas fa-download mr-2"></i>
                        Installer
                    </Button>
                    <Button
                        variant="secondary"
                        className="rounded-xl"
                        onClick={handleDismiss}
                    >
                        Plus tard
                    </Button>
                </div>
            </div>
        </div>
    );
};
