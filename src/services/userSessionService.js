/**
 * Service pour gérer la déconnexion et le nettoyage des caches
 */

import { nutritionFirestoreService } from './nutritionFirestoreService';

class UserSessionService {
  constructor() {
    this.currentUserId = null;
    this.previousUserId = localStorage.getItem('fitness_previousUserId');
  }

  /**
   * Détecter et gérer le changement d'utilisateur
   */
  handleUserChange(newUser) {
    const newUserId = newUser?.uid || null;
    
    // Si changement d'utilisateur détecté
    if (this.currentUserId !== newUserId) {
      console.log('🔄 Changement utilisateur détecté:', {
        ancien: this.currentUserId,
        nouveau: newUserId
      });
      
      // Nettoyer les données de l'ancien utilisateur
      if (this.currentUserId) {
        this.cleanupUserData(this.currentUserId);
      }
      
      // Mettre à jour les IDs
      this.previousUserId = this.currentUserId;
      this.currentUserId = newUserId;
      
      // Sauvegarder l'état
      if (newUserId) {
        localStorage.setItem('fitness_previousUserId', newUserId);
      } else {
        localStorage.removeItem('fitness_previousUserId');
      }
      
      // Nettoyer les caches nutrition
      nutritionFirestoreService.onUserChange(newUserId, this.previousUserId);
      
      return true; // Changement détecté
    }
    
    return false; // Pas de changement
  }
  /**
   * Nettoyer les données utilisateur lors de la déconnexion
   */
  cleanupUserData(userId) {
    console.log('🧹 Nettoyage données utilisateur:', userId);
    
    try {
      // Nettoyer SEULEMENT les données spécifiques à l'utilisateur
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('nutrition_favorites') ||
          key.includes('fitness_user_') ||
          key.includes('profile_') ||
          key.includes('workout_user_')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Nettoyer spécifiquement les caches nutrition utilisateur
      nutritionFirestoreService.clearUserSpecificCache(userId);
      
      console.log('✅ Données utilisateur nettoyées:', keysToRemove.length, 'clés supprimées');
      
      // NE PAS nettoyer les recettes publiques car elles ne sont pas liées à un utilisateur
      console.log('ℹ️ Les recettes publiques sont conservées (non liées à un utilisateur)');
      
    } catch (error) {
      console.error('❌ Erreur nettoyage données utilisateur:', error);
    }
  }
  /**
   * Déconnexion complète
   */
  logout() {
    console.log('👋 Déconnexion utilisateur');
    
    // Nettoyer les données de l'utilisateur actuel
    if (this.currentUserId) {
      this.cleanupUserData(this.currentUserId);
    }
    
    // Réinitialiser les IDs
    this.previousUserId = this.currentUserId;
    this.currentUserId = null;
    
    // Nettoyer le localStorage utilisateur seulement
    localStorage.removeItem('fitness_previousUserId');
    
    // Invalider SEULEMENT les queries spécifiques à l'utilisateur
    if (typeof window !== 'undefined' && window.queryClient) {
      // Invalider les favoris et données utilisateur
      window.queryClient.invalidateQueries({
        queryKey: ['nutrition', 'favorites'],
        refetchType: 'all'
      });
      window.queryClient.invalidateQueries({
        queryKey: ['nutrition', 'isFavorite'],
        refetchType: 'all'
      });
      // NE PAS invalider les recettes publiques
    }
    
    console.log('✅ Déconnexion terminée - recettes publiques conservées');
  }

  /**
   * Initialiser le service avec l'utilisateur actuel
   */
  initialize(currentUser) {
    const userId = currentUser?.uid || null;
    this.currentUserId = userId;
    
    if (userId) {
      localStorage.setItem('fitness_previousUserId', userId);
    }
  }
}

// Instance singleton
export const userSessionService = new UserSessionService();