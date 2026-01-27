import React from 'react';
import { showInstallPrompt, isAppInstalled } from '../utils/serviceWorker';
import { useToast } from '../contexts/ToastContext';

interface InstallButtonProps {
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const InstallButton: React.FC<InstallButtonProps> = ({ 
    variant = 'secondary', 
    size = 'md',
    className = '' 
}) => {
    const { showToast } = useToast();
    const [canInstall, setCanInstall] = React.useState(false);
    const [installed, setInstalled] = React.useState(false);

    React.useEffect(() => {
        // Vérifier si déjà installé
        setInstalled(isAppInstalled());

        // Écouter l'événement beforeinstallprompt
        const handleBeforeInstallPrompt = () => {
            setCanInstall(true);
        };

        const handleAppInstalled = () => {
            setInstalled(true);
            setCanInstall(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleClick = async () => {
        const success = await showInstallPrompt();
        
        if (success) {
            showToast('Studeo a été installé avec succès ! 🎉', 'success');
        } else {
            showToast('Installation annulée ou non disponible', 'info');
        }
    };

    // Ne rien afficher si déjà installé
    if (installed) {
        return null;
    }

    // Ne rien afficher si l'installation n'est pas disponible
    if (!canInstall) {
        return null;
    }

    const sizeClasses = {
        sm: 'text-xs px-3 py-1.5',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-6 py-3'
    };

    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary/90',
        secondary: 'bg-background-secondary text-text-primary hover:bg-background-tertiary border border-border'
    };

    return (
        <button
            onClick={handleClick}
            className={`
                ${sizeClasses[size]}
                ${variantClasses[variant]}
                rounded-xl font-semibold transition-all duration-200
                flex items-center gap-2
                ${className}
            `}
        >
            <i className="fas fa-download"></i>
            <span>Installer Studeo</span>
        </button>
    );
};
