/**
 * Composant wrapper pour gérer automatiquement les sessions utilisateur
 */

import useUserSessionCleanup from '../hooks/useUserSessionCleanup';

export function UserSessionProvider({ children }) {
    // Activer automatiquement le nettoyage des sessions
    useUserSessionCleanup();

    return <>{children}</>;
}

export default UserSessionProvider;