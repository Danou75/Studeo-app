/**
 * RouteErrorBoundary.tsx — Error boundary for route-level crashes.
 *
 * Catches NotFoundError (and other reconciliation errors) that can occur
 * when browser translation extensions mutate the DOM during React's unmount phase.
 * Instead of a full white-screen crash, the user sees a recovery UI.
 */
import React from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';

// ─── Hook-based error renderer (for react-router errorElement) ────────────────
export const RouteErrorElement: React.FC = () => {
    const error = useRouteError() as any;
    const navigate = useNavigate();

    const isReconciliationError =
        error?.message?.includes('removeChild') ||
        error?.message?.includes('NotFoundError') ||
        error?.message?.includes('is not a child');

    return (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 bg-background text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center text-3xl mb-2">
                🔄
            </div>
            <h2 className="text-xl font-black text-text">
                {isReconciliationError ? 'Rechargement nécessaire' : 'Erreur de navigation'}
            </h2>
            <p className="text-sm text-text-secondary max-w-sm">
                {isReconciliationError
                    ? "Une extension de navigateur (comme un traducteur) a perturbé l'interface. Cliquez ci-dessous pour reprendre."
                    : error?.message || 'Une erreur inattendue est survenue.'}
            </p>
            <div className="flex gap-3 mt-2">
                <button
                    onClick={() => navigate('/', { replace: true })}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                >
                    <i className="fas fa-home mr-2" /> Accueil
                </button>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2.5 bg-background-secondary border border-border text-text rounded-xl font-bold text-sm hover:opacity-80 transition-opacity"
                >
                    <i className="fas fa-arrow-left mr-2" /> Retour
                </button>
            </div>
            {!isReconciliationError && (
                <details className="mt-4 text-left text-xs text-text-muted max-w-sm w-full">
                    <summary className="cursor-pointer font-bold mb-1">Détails techniques</summary>
                    <code className="block bg-background-secondary p-3 rounded-xl overflow-auto whitespace-pre-wrap">
                        {error?.stack || String(error)}
                    </code>
                </details>
            )}
        </div>
    );
};

// ─── Class-based Error Boundary for non-router usage ─────────────────────────
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onReset?: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, info);
    }

    reset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            const isReconciliation =
                this.state.error?.message?.includes('removeChild') ||
                this.state.error?.message?.includes('NotFoundError');

            return (
                <div className="flex flex-col items-center justify-center p-6 bg-background text-center gap-3 h-full">
                    <div className="text-3xl">🔄</div>
                    <h3 className="font-black text-text">
                        {isReconciliation ? 'Rechargement nécessaire' : 'Erreur'}
                    </h3>
                    <p className="text-xs text-text-secondary max-w-xs">
                        {isReconciliation
                            ? "Une extension de navigateur a perturbé l'interface."
                            : this.state.error?.message}
                    </p>
                    <button
                        onClick={this.reset}
                        className="px-5 py-2 bg-primary text-white rounded-xl font-bold text-sm mt-1"
                    >
                        Réessayer
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
