import { userService } from '../firebase';
import { auth } from '../firebase';

/**
 * Service de synchronisation des profils entre localStorage et Firestore
 */
export const profileSyncService = {  // Charger le profil depuis Firestore
  loadProfileFromFirestore: async () => {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      console.log('Chargement du profil depuis Firestore pour:', user.uid);
      
      // Vérifier la connexion Firestore d'abord
      const isConnected = await userService.checkFirestoreConnection();
      if (!isConnected) {
        console.warn('Problème de connexion Firestore, utilisation du cache local');
        return null;
      }
      
      const profile = await userService.getUserProfileWithRetry(user.uid);
      
      if (profile) {
        console.log('Profil trouvé dans Firestore:', profile);
        // Synchroniser avec localStorage
        localStorage.setItem('userProfile', JSON.stringify(profile));
        return profile;
      }
      
      console.log('Aucun profil trouvé dans Firestore');
      return null;
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      return null;
    }
  },
  
  // Sauvegarder le profil dans Firestore
  saveProfileToFirestore: async (profileData) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');
      
      const updatedProfile = {
        ...profileData,
        firebaseUid: user.uid,
        updatedAt: new Date().toISOString()
      };
      
      console.log('Sauvegarde du profil dans Firestore:', updatedProfile);
      await userService.updateUserProfile(user.uid, updatedProfile);
      
      // Synchroniser avec localStorage
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      return updatedProfile;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      throw error;
    }
  },
    // Synchroniser au démarrage de l'application
  syncOnStartup: async () => {
    try {
      const user = auth.currentUser;      if (!user) {
        console.log('Aucun utilisateur connecté, nettoyage du localStorage');
        profileSyncService.clearLocalStorage();
        return null;
      }
        console.log('Synchronisation du profil au démarrage pour:', user.uid);
      
      // Essayer de charger depuis Firestore
      const firestoreData = await userService.getUserProfile(user.uid);
      
      if (firestoreData) {
        console.log('Profil synchronisé depuis Firestore:', firestoreData);
        
        // Synchroniser tous les profils avec localStorage
        profileSyncService.syncAllProfilesToLocalStorage(firestoreData);
        
        return firestoreData;
      } else {
        // Vérifier s'il y a des données en localStorage à migrer
        const localData = profileSyncService.getLocalStorageData();
        if (localData.hasData) {
          console.log('Migration des profils localStorage vers Firestore');
          await profileSyncService.migrateLocalDataToFirestore(localData);
          return localData;
        }
      }
        console.log('Aucun profil trouvé, création d\'un profil vide');
      const emptyProfile = profileSyncService.createEmptyProfile(user);
      await userService.saveCompleteProfileWithValidation(user.uid, emptyProfile);
      profileSyncService.syncAllProfilesToLocalStorage(emptyProfile);
      
      return emptyProfile;
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      return null;
    }
  },

  // Synchroniser tous les profils avec localStorage
  syncAllProfilesToLocalStorage: (data) => {
    try {
      if (data.userProfile) {
        localStorage.setItem('userProfile', JSON.stringify(data.userProfile));
      }
      if (data.equipmentProfile) {
        localStorage.setItem('equipmentProfile', JSON.stringify(data.equipmentProfile));
      }
      if (data.nutritionProfile) {
        localStorage.setItem('nutritionProfile', JSON.stringify(data.nutritionProfile));
      }
      console.log('Tous les profils synchronisés avec localStorage');
    } catch (error) {
      console.error('Erreur lors de la synchronisation localStorage:', error);
    }
  },

  // Récupérer toutes les données localStorage
  getLocalStorageData: () => {
    try {
      const userProfile = localStorage.getItem('userProfile');
      const equipmentProfile = localStorage.getItem('equipmentProfile');
      const nutritionProfile = localStorage.getItem('nutritionProfile');
      
      return {
        hasData: !!(userProfile || equipmentProfile || nutritionProfile),
        userProfile: userProfile ? JSON.parse(userProfile) : {},
        equipmentProfile: equipmentProfile ? JSON.parse(equipmentProfile) : {},
        nutritionProfile: nutritionProfile ? JSON.parse(nutritionProfile) : {}
      };
    } catch (error) {
      console.error('Erreur lors de la lecture localStorage:', error);
      return { hasData: false, userProfile: {}, equipmentProfile: {}, nutritionProfile: {} };
    }
  },

  // Migrer les données locales vers Firestore
  migrateLocalDataToFirestore: async (localData) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      const completeProfile = {
        userProfile: localData.userProfile || {},
        equipmentProfile: localData.equipmentProfile || {},
        nutritionProfile: localData.nutritionProfile || {}
      };

      await userService.saveCompleteProfile(user.uid, completeProfile);
      console.log('Migration terminée vers Firestore');
      return completeProfile;
    } catch (error) {
      console.error('Erreur lors de la migration:', error);
      throw error;
    }
  },

  // Créer un profil vide
  createEmptyProfile: (user) => {
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
      }
    };
  },

  // Nettoyer localStorage
  clearLocalStorage: () => {
    localStorage.removeItem('userProfile');
    localStorage.removeItem('equipmentProfile');
    localStorage.removeItem('nutritionProfile');
  }
};

// Fonction de debug temporaire pour diagnostiquer les problèmes de profil
export const debugProfile = async () => {
  console.log('=== DEBUG PROFIL ===');
  
  // Vérifier l'utilisateur connecté
  const user = auth.currentUser;
  console.log('Utilisateur connecté:', user?.uid || 'Aucun');
  
  if (user) {
    // Vérifier Firestore
    try {
      const profile = await userService.getUserProfile(user.uid);
      console.log('Profil Firestore:', profile);
    } catch (error) {
      console.error('Erreur Firestore:', error);
    }
  }
  
  // Vérifier localStorage
  const localProfile = localStorage.getItem('userProfile');
  console.log('Profil localStorage:', localProfile ? JSON.parse(localProfile) : 'Aucun');
  
  console.log('=== FIN DEBUG ===');
};

// Pour utiliser dans la console : debugProfile()