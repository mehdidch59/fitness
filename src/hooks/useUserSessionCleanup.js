/**
 * Hook pour détecter les changements d'utilisateur et nettoyer les caches
 */

import { useEffect } from 'react';
import { userSessionService } from '../services/userSessionService';

export function useUserSessionCleanup() {
  useEffect(() => {
    // Fonction pour détecter les changements d'auth
    const checkUserChange = () => {
      try {
        const { auth } = require('../firebase');
        const currentUser = auth?.currentUser || null;
        
        // Détecter et gérer le changement
        const hasChanged = userSessionService.handleUserChange(currentUser);
        
        if (hasChanged) {
          console.log('🔄 Changement utilisateur traité');
        }
        
      } catch (error) {
        console.error('❌ Erreur vérification changement utilisateur:', error);
      }
    };

    // Vérifier immédiatement
    checkUserChange();

    // Écouter les changements d'authentification
    let unsubscribe = null;
    
    try {
      const { auth } = require('../firebase');
      const { onAuthStateChanged } = require('firebase/auth');
      
      if (auth && onAuthStateChanged) {
        unsubscribe = onAuthStateChanged(auth, (user) => {
          console.log('🔐 État auth changé:', user?.uid || 'déconnecté');
          userSessionService.handleUserChange(user);
        });
      }
    } catch (error) {
      console.error('❌ Erreur écoute auth:', error);
    }

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
}

export default useUserSessionCleanup;