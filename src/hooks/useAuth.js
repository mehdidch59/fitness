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
      console.log('🔄 Changement d\'état d\'authentification:', currentUser?.uid || 'déconnecté');
      
      // Si changement d'utilisateur (pas juste première connexion)
      const previousUser = user;
      const isUserChange = previousUser && currentUser && previousUser.uid !== currentUser.uid;
      const isLogout = previousUser && !currentUser;
      
      if (isUserChange || isLogout) {
        console.log('👤 Changement d\'utilisateur détecté, nettoyage complet...');
        // Nettoyer complètement les données de l'utilisateur précédent
        profileSyncService.clearLocalStorage();
        queryClient.clear();
        
        // Nettoyer TOUTES les données utilisateur, y compris hasSeenWelcome
        const keysToRemove = [
          'personalizedSuggestions',
          'user',
          'userData',
          'nutrition_recipes',
          'nutrition_favorites',
          'nutrition_mass_gain_recipes',
          'hasSeenWelcome',
          'userProfile',
          'equipmentProfile',
          'nutritionProfile',
          'authToken',
          'refreshToken'
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Forcer un rechargement pour s'assurer que tout est nettoyé
        if (isUserChange) {
          setTimeout(() => {
            window.location.reload();
          }, 100);
          return; // Sortir pour éviter le traitement ci-dessous
        }
      }
      
      setUser(currentUser);
      
      if (currentUser && !isUserChange) {
        // Attendre un peu plus longtemps pour s'assurer que Firebase est complètement prêt
        setTimeout(async () => {
          try {
            console.log('🔄 Synchronisation du profil pour utilisateur connecté:', currentUser.uid);
            const profileData = await profileSyncService.syncOnStartup();
            
            if (profileData) {
              // Invalider toutes les requêtes liées au profil utilisateur
              await queryClient.invalidateQueries(['userProfile']);
              await queryClient.invalidateQueries(['equipmentProfile']);
              await queryClient.invalidateQueries(['nutritionProfile']);
              await queryClient.invalidateQueries(['nutrition']);
              
              // Forcer le refetch immédiat des données critiques
              queryClient.refetchQueries(['userProfile'], { active: true });
              
              console.log('✅ Profil synchronisé et cache mis à jour');
              
              // Déclencher un événement personnalisé pour notifier les composants
              window.dispatchEvent(new CustomEvent('profileSynced', { 
                detail: profileData 
              }));
            }
          } catch (error) {
            console.error('❌ Erreur lors de la synchronisation du profil:', error);
            setError('Erreur de synchronisation du profil');
          }
        }, 1000);
      } else if (!currentUser) {
        // Nettoyer localStorage à la déconnexion
        console.log('🧹 Nettoyage des données locales à la déconnexion');
        profileSyncService.clearLocalStorage();
        queryClient.clear();
        
        // Nettoyer toutes les données utilisateur
        const keysToRemove = [
          'personalizedSuggestions',
          'user',
          'userData',
          'nutrition_recipes',
          'nutrition_favorites',
          'nutrition_mass_gain_recipes',
          'hasSeenWelcome',
          'userProfile',
          'equipmentProfile',
          'nutritionProfile',
          'authToken',
          'refreshToken'
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [queryClient, user]);

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
  const register = async (email, password, displayName, firstName, lastName) => {
    setError(null);
    try {
      const user = await authService.register(email, password, displayName, { firstName, lastName });
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
