import { useState, useEffect } from 'react';
import { userService } from '../firebase';
import { auth } from '../firebase';

/**
 * Service réactif de gestion des profils avec synchronisation en temps réel
 */
class ReactiveProfileService {
  constructor() {
    this.listeners = new Set();
    this.currentProfile = null;
    this.isLoading = false;
    
    // Observer les changements d'authentification
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.loadProfile();
      } else {
        this.clearProfile();
      }
    });
  }

  // Ajouter un listener pour les changements de profil
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notifier tous les listeners
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentProfile));
  }

  // Charger le profil avec gestion d'état
  async loadProfile() {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      const user = auth.currentUser;
      
      if (!user) {
        this.clearProfile();
        return;
      }

      console.log('Chargement du profil pour:', user.uid);
      
      // Essayer de charger depuis Firestore
      const firestoreProfile = await userService.getUserProfile(user.uid);
      
      if (firestoreProfile) {
        this.currentProfile = firestoreProfile;
        this.syncToLocalStorage();
        console.log('Profil chargé depuis Firestore:', firestoreProfile);
      } else {
        // Créer un profil par défaut
        const defaultProfile = this.createDefaultProfile(user);
        await userService.saveCompleteProfile(user.uid, defaultProfile);
        this.currentProfile = defaultProfile;
        this.syncToLocalStorage();
        console.log('Profil par défaut créé:', defaultProfile);
      }
      
      this.notifyListeners();
      
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      // En cas d'erreur, essayer de charger depuis localStorage
      this.loadFromLocalStorage();
    } finally {
      this.isLoading = false;
    }
  }

  // Sauvegarder le profil
  async saveProfile(profileUpdates) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      const updatedProfile = {
        ...this.currentProfile,
        ...profileUpdates,
        updatedAt: new Date().toISOString()
      };

      await userService.saveCompleteProfile(user.uid, updatedProfile);
      this.currentProfile = updatedProfile;
      this.syncToLocalStorage();
      this.notifyListeners();
      
      console.log('Profil sauvegardé:', updatedProfile);
      return updatedProfile;
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }

  // Mettre à jour une partie spécifique du profil
  async updateProfileSection(section, data) {
    const updates = {
      [section]: {
        ...this.currentProfile?.[section],
        ...data
      }
    };
    return await this.saveProfile(updates);
  }

  // Synchroniser avec localStorage
  syncToLocalStorage() {
    if (!this.currentProfile) return;
    
    try {
      if (this.currentProfile.userProfile) {
        localStorage.setItem('userProfile', JSON.stringify(this.currentProfile.userProfile));
      }
      if (this.currentProfile.equipmentProfile) {
        localStorage.setItem('equipmentProfile', JSON.stringify(this.currentProfile.equipmentProfile));
      }
      if (this.currentProfile.nutritionProfile) {
        localStorage.setItem('nutritionProfile', JSON.stringify(this.currentProfile.nutritionProfile));
      }
    } catch (error) {
      console.error('Erreur synchronisation localStorage:', error);
    }
  }

  // Charger depuis localStorage
  loadFromLocalStorage() {
    try {
      const userProfile = localStorage.getItem('userProfile');
      const equipmentProfile = localStorage.getItem('equipmentProfile');
      const nutritionProfile = localStorage.getItem('nutritionProfile');

      if (userProfile || equipmentProfile || nutritionProfile) {
        this.currentProfile = {
          userProfile: userProfile ? JSON.parse(userProfile) : {},
          equipmentProfile: equipmentProfile ? JSON.parse(equipmentProfile) : {},
          nutritionProfile: nutritionProfile ? JSON.parse(nutritionProfile) : {}
        };
        this.notifyListeners();
        console.log('Profil chargé depuis localStorage');
      }
    } catch (error) {
      console.error('Erreur lecture localStorage:', error);
    }
  }

  // Créer un profil par défaut
  createDefaultProfile(user) {
    return {
      email: user.email,
      displayName: user.displayName,
      userProfile: {
        goal: null,
        activityLevel: null,
        fitnessGoal: null
      },
      equipmentProfile: {
        location: null,
        homeEquipment: []
      },
      nutritionProfile: {
        dietType: null,
        cookingTime: null,
        allergies: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Nettoyer le profil
  clearProfile() {
    this.currentProfile = null;
    localStorage.removeItem('userProfile');
    localStorage.removeItem('equipmentProfile');
    localStorage.removeItem('nutritionProfile');
    this.notifyListeners();
  }

  // Getters pour accès facile aux données
  get userProfile() {
    return this.currentProfile?.userProfile || {};
  }

  get equipmentProfile() {
    return this.currentProfile?.equipmentProfile || {};
  }

  get nutritionProfile() {
    return this.currentProfile?.nutritionProfile || {};
  }

  get isProfileComplete() {
    const profile = this.currentProfile;
    if (!profile) return false;
    
    return !!(
      profile.userProfile?.goal &&
      profile.userProfile?.activityLevel &&
      profile.equipmentProfile?.location &&
      profile.nutritionProfile?.dietType
    );
  }

  // Forcer un rechargement
  async forceReload() {
    this.currentProfile = null;
    await this.loadProfile();
  }
}

export const reactiveProfileService = new ReactiveProfileService();

// Hook React pour utiliser le service réactif
export const useReactiveProfile = () => {
  const [profile, setProfile] = useState(reactiveProfileService.currentProfile);
  const [isLoading, setIsLoading] = useState(reactiveProfileService.isLoading);

  useEffect(() => {
    // S'abonner aux changements
    const unsubscribe = reactiveProfileService.addListener((newProfile) => {
      setProfile(newProfile);
      setIsLoading(false);
    });

    // Charger le profil si pas encore fait
    if (!profile && auth.currentUser) {
      setIsLoading(true);
      reactiveProfileService.loadProfile();
    }

    return unsubscribe;
  }, []);

  return {
    profile,
    isLoading,
    userProfile: reactiveProfileService.userProfile,
    equipmentProfile: reactiveProfileService.equipmentProfile,
    nutritionProfile: reactiveProfileService.nutritionProfile,
    isProfileComplete: reactiveProfileService.isProfileComplete,
    updateProfile: reactiveProfileService.saveProfile.bind(reactiveProfileService),
    updateSection: reactiveProfileService.updateProfileSection.bind(reactiveProfileService),
    forceReload: reactiveProfileService.forceReload.bind(reactiveProfileService)
  };
};