import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { auth, authService } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { profileSyncService } from '../services/profileSync';
// import { useAppContext } from '../context/AppContext';

/**
 * Hook personnalisé pour gérer l'authentification Firebase
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const { actions } = useAppContext();
  const queryClient = useQueryClient();  // Observer les changements d'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('État d\'authentification changé:', currentUser?.uid || 'non connecté');
      setUser(currentUser);
      
      if (currentUser) {
        // Attendre un peu plus longtemps pour s'assurer que Firebase est complètement prêt
        setTimeout(async () => {
          try {
            console.log('Synchronisation du profil pour utilisateur connecté');
            const profileData = await profileSyncService.syncOnStartup();
            
            if (profileData) {
              // Invalider toutes les requêtes liées au profil utilisateur
              await queryClient.invalidateQueries(['userProfile']);
              await queryClient.invalidateQueries(['equipmentProfile']);
              await queryClient.invalidateQueries(['nutritionProfile']);
              
              // Forcer le refetch immédiat des données critiques
              queryClient.refetchQueries(['userProfile'], { active: true });
              
              console.log('Profil synchronisé et cache mis à jour');
              
              // Déclencher un événement personnalisé pour notifier les composants
              window.dispatchEvent(new CustomEvent('profileSynced', { 
                detail: profileData 
              }));
            }
          } catch (error) {
            console.error('Erreur lors de la synchronisation du profil:', error);
            setError('Erreur de synchronisation du profil');
          }
        }, 1000); // Augmenter le délai pour une meilleure fiabilité
      } else {
        // Nettoyer localStorage à la déconnexion
        console.log('Nettoyage des données locales à la déconnexion');
        profileSyncService.clearLocalStorage();
        queryClient.clear();
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [queryClient]);

  // Connexion utilisateur
  const login = async (email, password) => {
    setError(null);
    try {
      const user = await authService.login(email, password);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Inscription utilisateur
  const register = async (email, password, displayName) => {
    setError(null);
    try {
      const user = await authService.register(email, password, displayName);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };
  // Déconnexion utilisateur
  const logout = async () => {
    setError(null);
    try {
      await authService.logout();
      
      // Réinitialiser le cache de requêtes et le contexte global
      queryClient.clear();
      // Supprimer la ligne suivante car activeView n'existe plus
      // actions.setActiveView('home');
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Réinitialisation du mot de passe
  const resetPassword = async (email) => {
    setError(null);
    try {
      await authService.resetPassword(email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    isAuthenticated: !!user
  };
} 