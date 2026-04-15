
import { useNavigate } from 'react-router-dom';
import { SettingsScreen } from '../components/SettingsScreen';
import { useAuth } from '../contexts/AuthContext';
import { useAppCoordinator } from '../hooks/useAppCoordinator';

export default function SettingsRoute() {
    const navigate    = useNavigate();
    const { user }    = useAuth();
    const coordinator = useAppCoordinator();

    return (
        <SettingsScreen
            onBack={() => navigate(-1)}
            onSyncPush={() => (window as any).__studeo_pushCloud?.()}
            onSyncPull={() => {
                if (window.confirm("Attention : Cette action va remplacer toutes vos données locales par la version du Cloud. Souhaitez-vous continuer ?")) {
                    (window as any).__studeo_pullCloud?.(true);
                }
            }}
            onReloadApp={() => (window as any).__studeo_reloadApp?.()}
            onShowAuth={() => (window as any).__studeo_openAuth?.()}
            user={user}
            latestVersion={coordinator.latestVersion}
            updateStatus={coordinator.updateStatus}
            isCheckingUpdate={coordinator.isCheckingUpdate}
            updateNotes={coordinator.updateNotes}
            onCheckUpdate={coordinator.checkForUpdates}
            onInstallUpdate={coordinator.installAndRelaunch}
        />
    );
}
