import React from 'react';
import { Button } from './ui/Button';

interface PWAHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PWAHelpModal: React.FC<PWAHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-primary to-purple-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <i className="fas fa-mobile-alt text-3xl"></i>
                            <div>
                                <h2 className="text-2xl font-bold">Installer Studeo</h2>
                                <p className="text-sm opacity-90">Guide d'installation PWA</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Avantages */}
                    <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-4 border border-primary/20">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <i className="fas fa-star text-yellow-500"></i>
                            Pourquoi installer Studeo ?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-start gap-2">
                                <i className="fas fa-bolt text-yellow-500 mt-1"></i>
                                <div>
                                    <strong>Lancement instantané</strong>
                                    <p className="text-text-muted">Ouvrez l'app en un clic depuis votre écran d'accueil</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <i className="fas fa-wifi-slash text-blue-500 mt-1"></i>
                                <div>
                                    <strong>Fonctionne hors ligne</strong>
                                    <p className="text-text-muted">Accédez à vos contenus même sans connexion</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <i className="fas fa-window-maximize text-green-500 mt-1"></i>
                                <div>
                                    <strong>Fenêtre dédiée</strong>
                                    <p className="text-text-muted">Interface native sans barre d'adresse</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <i className="fas fa-bell text-purple-500 mt-1"></i>
                                <div>
                                    <strong>Notifications</strong>
                                    <p className="text-text-muted">Recevez des rappels pour vos révisions</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Instructions selon la plateforme */}
                    {isIOS && isSafari && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <i className="fab fa-apple"></i>
                                Installation sur iPhone/iPad (Safari)
                            </h3>
                            <ol className="space-y-3 text-sm">
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                                    <div>
                                        Appuyez sur le bouton <strong>Partager</strong> <i className="fas fa-share text-primary"></i> en bas de l'écran
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                                    <div>
                                        Faites défiler et sélectionnez <strong>"Sur l'écran d'accueil"</strong>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                                    <div>
                                        Appuyez sur <strong>"Ajouter"</strong> en haut à droite
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                        <i className="fas fa-check text-xs"></i>
                                    </span>
                                    <div>
                                        L'icône de Studeo apparaît sur votre écran d'accueil ! 🎉
                                    </div>
                                </li>
                            </ol>
                        </div>
                    )}

                    {isAndroid && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <i className="fab fa-android text-green-500"></i>
                                Installation sur Android
                            </h3>
                            <ol className="space-y-3 text-sm">
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                                    <div>
                                        Appuyez sur le menu <strong>⋮</strong> (3 points) en haut à droite
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                                    <div>
                                        Sélectionnez <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">3</span>
                                    <div>
                                        Confirmez l'installation
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                        <i className="fas fa-check text-xs"></i>
                                    </span>
                                    <div>
                                        Studeo est maintenant dans vos applications ! 🎉
                                    </div>
                                </li>
                            </ol>
                        </div>
                    )}

                    {!isIOS && !isAndroid && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <i className="fas fa-desktop"></i>
                                Installation sur ordinateur
                            </h3>
                            <ol className="space-y-3 text-sm">
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">1</span>
                                    <div>
                                        Cherchez l'icône <strong>⊕</strong> ou <strong>💻</strong> dans la barre d'adresse
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0 text-xs font-bold">2</span>
                                    <div>
                                        Cliquez sur <strong>"Installer Studeo"</strong>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                        <i className="fas fa-check text-xs"></i>
                                    </span>
                                    <div>
                                        L'application s'ouvre dans sa propre fenêtre ! 🎉
                                    </div>
                                </li>
                            </ol>
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                                <strong className="text-blue-700 dark:text-blue-300">💡 Astuce :</strong> Vous pouvez aussi aller dans le menu du navigateur → "Installer Studeo"
                            </div>
                        </div>
                    )}

                    {/* Problèmes courants */}
                    <div className="border-t border-border pt-4">
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <i className="fas fa-question-circle text-orange-500"></i>
                            Problèmes courants
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <strong>❓ Le bouton d'installation n'apparaît pas</strong>
                                <p className="text-text-muted ml-5">L'application est peut-être déjà installée, ou votre navigateur ne supporte pas encore les PWA.</p>
                            </div>
                            <div>
                                <strong>❓ L'app ne fonctionne pas hors ligne</strong>
                                <p className="text-text-muted ml-5">Visitez d'abord toutes les pages que vous souhaitez utiliser hors ligne pour qu'elles soient mises en cache.</p>
                            </div>
                            <div>
                                <strong>❓ Comment désinstaller ?</strong>
                                <p className="text-text-muted ml-5">Supprimez l'icône comme n'importe quelle autre application sur votre appareil.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-background-secondary/50 rounded-b-2xl">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="primary"
                            className="flex-1"
                            onClick={onClose}
                        >
                            <i className="fas fa-check mr-2"></i>
                            J'ai compris
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => window.open('https://github.com/Danou75/Studeo-app/blob/main/docs/SERVICE_WORKER_PWA.md', '_blank', 'noopener,noreferrer')}
                        >
                            <i className="fas fa-book mr-2"></i>
                            Documentation complète
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
