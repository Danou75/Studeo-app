import { useState } from 'react';

/**
 * useCollapsibleHeader
 * Gère l'état de visibilité d'un header amovible.
 * Le header est visible par défaut ; le bouton flottant permet de le masquer/révéler.
 */
export function useCollapsibleHeader(defaultVisible = true) {
    const [showHeader, setShowHeader] = useState(defaultVisible);
    const toggleHeader = () => setShowHeader(v => !v);
    const hideHeader = () => setShowHeader(false);
    const revealHeader = () => setShowHeader(true);

    return { showHeader, toggleHeader, hideHeader, revealHeader, setShowHeader };
}
