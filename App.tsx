/**
 * App.tsx — Point d'entrée principal de Studeo.
 *
 * Contient uniquement les Providers et le RouterProvider.
 * Toute la logique de navigation est dans router.tsx et /routes/*.
 * Toute la logique de layout/hooks globaux est dans AppLayout.tsx.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from './router';
import { AuthProvider }         from './contexts/AuthContext';
import { AIConfigProvider }     from './contexts/AIConfigContext';
import { ToastProvider }        from './contexts/ToastContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { LanguageProvider }     from './contexts/LanguageContext';

/**
 * QueryClient configuré pour les appels IA :
 * - staleTime 10 min  : une leçon/fiche générée reste fraîche 10 minutes
 * - gcTime 30 min     : le cache est conservé en mémoire 30 minutes
 * - retry 2           : 2 tentatives max avant d'afficher l'erreur
 * - refetchOnWindowFocus false : empêche les regénérations inutiles au retour de focus
 */
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime:            10 * 60 * 1000, // 10 min
            gcTime:               30 * 60 * 1000, // 30 min
            retry:                2,
            refetchOnWindowFocus: false,
            refetchOnReconnect:   false,
        },
        mutations: {
            retry: 1,
        },
    },
});

const App: React.FC = () => (
    <QueryClientProvider client={queryClient}>
        <LanguageProvider>
            <AIConfigProvider>
                <ToastProvider>
                    <ConfirmationProvider>
                        <AuthProvider>
                            <AppRouter />
                        </AuthProvider>
                    </ConfirmationProvider>
                </ToastProvider>
            </AIConfigProvider>
        </LanguageProvider>
    </QueryClientProvider>
);

export default App;
