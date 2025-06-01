import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuration Firebase (à remplacer par vos propres identifiants)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Vérifier la configuration Firebase
// console.log('Firebase Config:', {
//   apiKey: firebaseConfig.apiKey ? '✓ Définie' : '✗ Manquante',
//   authDomain: firebaseConfig.authDomain ? '✓ Définie' : '✗ Manquante',
//   projectId: firebaseConfig.projectId ? '✓ Définie' : '✗ Manquante',
//   storageBucket: firebaseConfig.storageBucket ? '✓ Définie' : '✗ Manquante',
//   messagingSenderId: firebaseConfig.messagingSenderId ? '✓ Définie' : '✗ Manquante',
//   appId: firebaseConfig.appId ? '✓ Définie' : '✗ Manquante'
// });

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Services d'authentification avec intégration Firestore
export const authService = {
  // Connexion
  login: async (email, password) => {
    try {
      // console.log('Tentative de connexion pour:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // console.log('Connexion réussie:', userCredential.user.uid);
      
      // Récupérer le profil utilisateur depuis Firestore
      const userProfile = await userService.getUserProfile(userCredential.user.uid);
      if (userProfile) {
        // Stocker le profil dans localStorage pour les services API
        localStorage.setItem('userProfile', JSON.stringify(userProfile));
        // console.log('Profil utilisateur chargé depuis Firestore');
      }
      
      return userCredential.user;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  },
  
  // Inscription
  register: async (email, password, displayName) => {
    try {
      // console.log('Tentative d\'inscription pour:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // console.log('Utilisateur créé dans Firebase Auth:', userCredential.user.uid);
      
      await updateProfile(userCredential.user, { displayName });
      // console.log('Profil mis à jour avec displayName:', displayName);
      
      // Créer un document utilisateur basique dans Firestore
      const initialProfile = {
        email,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Profils par défaut
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
      
      await setDoc(doc(db, 'users', userCredential.user.uid), initialProfile);
      // console.log('Document utilisateur créé dans Firestore avec profils par défaut');
      
      // Stocker le profil initial dans localStorage
      localStorage.setItem('userProfile', JSON.stringify(initialProfile.userProfile));
      localStorage.setItem('equipmentProfile', JSON.stringify(initialProfile.equipmentProfile));
      localStorage.setItem('nutritionProfile', JSON.stringify(initialProfile.nutritionProfile));
      
      return userCredential.user;
    } catch (error) {
      console.error('Erreur d\'inscription complète:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Gestion spécifique des erreurs réseau
      if (error.message.includes('ERR_BLOCKED_BY_CLIENT')) {
        throw new Error('Connexion bloquée. Veuillez désactiver temporairement votre bloqueur de publicités et réessayer.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Problème de connexion réseau. Vérifiez votre connexion internet et réessayez.');
      }
      
      throw error;
    }
  },
  
  // Déconnexion
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  },
  
  // Réinitialisation du mot de passe
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Erreur de réinitialisation du mot de passe:', error);
      throw error;
    }
  },
  
  // Obtenir l'utilisateur courant
  getCurrentUser: () => {
    return auth.currentUser;
  }
};

// Services Firestore pour les profils utilisateur
export const userService = {
  // Récupérer le profil utilisateur complet
  getUserProfile: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // console.log('Profil utilisateur récupéré:', data);
        
        // Séparer les différents profils pour l'état global
        return {
          userProfile: data.userProfile || {},
          equipmentProfile: data.equipmentProfile || {},
          nutritionProfile: data.nutritionProfile || {},
          email: data.email,
          displayName: data.displayName,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      throw error;
    }
  },
  
  // Nouvelle méthode pour charger le profil complet avec retry logic
  getUserProfileWithRetry: async (uid, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // console.log(`Tentative ${attempt}/${maxRetries} de chargement du profil pour:`, uid);
        
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          // console.log('Profil chargé avec succès:', data);
          return data;
        } else {
          // console.log('Aucun document trouvé pour cet utilisateur');
          return null;
        }
      } catch (error) {
        lastError = error;
        console.error(`Erreur tentative ${attempt}:`, error);
        
        if (attempt < maxRetries) {
          // Attendre avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  },

  // Mettre à jour le profil utilisateur
  updateUserProfile: async (userId, profileData) => {
    try {
      const updateData = {
        ...profileData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'users', userId), updateData);
      // console.log('Profil utilisateur mis à jour dans Firestore:', updateData);
      
      // Mettre à jour localStorage
      if (profileData.userProfile) {
        localStorage.setItem('userProfile', JSON.stringify(profileData.userProfile));
      }
      if (profileData.equipmentProfile) {
        localStorage.setItem('equipmentProfile', JSON.stringify(profileData.equipmentProfile));
      }
      if (profileData.nutritionProfile) {
        localStorage.setItem('nutritionProfile', JSON.stringify(profileData.nutritionProfile));
      }
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  },
  
  // Créer ou mettre à jour le profil complet
  saveCompleteProfile: async (userId, profileData) => {
    try {
      const completeData = {
        ...profileData,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', userId), completeData, { merge: true });
      // console.log('Profil complet sauvegardé dans Firestore:', completeData);
      
      // Synchroniser avec localStorage
      if (profileData.userProfile) {
        localStorage.setItem('userProfile', JSON.stringify(profileData.userProfile));
      }
      if (profileData.equipmentProfile) {
        localStorage.setItem('equipmentProfile', JSON.stringify(profileData.equipmentProfile));
      }
      if (profileData.nutritionProfile) {
        localStorage.setItem('nutritionProfile', JSON.stringify(profileData.nutritionProfile));
      }
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil complet:', error);
      throw error;
    }
  },

  // Méthode pour sauvegarder le profil complet avec validation
  saveCompleteProfileWithValidation: async (uid, profileData) => {
    try {
      // console.log('Sauvegarde du profil complet pour:', uid, profileData);
      
      // Validation des données
      const validatedData = {
        ...profileData,
        firebaseUid: uid,
        updatedAt: serverTimestamp(),
        lastSync: serverTimestamp()
      };
      
      // Créer ou mettre à jour le document
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, validatedData, { merge: true });
      
      // console.log('Profil sauvegardé avec succès');
      return validatedData;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du profil:', error);
      throw error;
    }
  },

  // Vérifier si le profil est complet
  isProfileComplete: async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;
      
      const data = userDoc.data();
      const userProfile = data.userProfile || {};
      const equipmentProfile = data.equipmentProfile || {};
      const nutritionProfile = data.nutritionProfile || {};
      
      // Vérifier si les champs essentiels sont remplis
      return !!(
        userProfile.goal &&
        userProfile.activityLevel &&
        equipmentProfile.location &&
        nutritionProfile.dietType
      );
    } catch (error) {
      console.error('Erreur lors de la vérification du profil:', error);
      return false;
    }
  },

  // Vérifier la connectivité et l'état de Firestore
  checkFirestoreConnection: async () => {
    try {
      // Tentative de lecture d'un document test
      const testRef = doc(db, 'test', 'connection');
      await getDoc(testRef);
      // console.log('Connexion Firestore OK');
      return true;
    } catch (error) {
      console.error('Problème de connexion Firestore:', error);
      return false;
    }
  }
};

// Services Firestore pour les programmes d'entraînement
export const workoutService = {
  // Récupérer tous les programmes d'un utilisateur
  getUserWorkouts: async (userId) => {
    try {
      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(workoutsQuery);
      const workouts = [];
      
      querySnapshot.forEach((doc) => {
        workouts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return workouts;
    } catch (error) {
      console.error('Erreur lors de la récupération des programmes:', error);
      throw error;
    }
  },
  
  // Ajouter un programme
  addWorkout: async (userId, workoutData) => {
    try {
      const docRef = await addDoc(collection(db, 'workouts'), {
        ...workoutData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...workoutData
      };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du programme:', error);
      throw error;
    }
  },
  
  // Mettre à jour un programme
  updateWorkout: async (workoutId, workoutData) => {
    try {
      await updateDoc(doc(db, 'workouts', workoutId), {
        ...workoutData,
        updatedAt: serverTimestamp()
      });
      
      return {
        id: workoutId,
        ...workoutData
      };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du programme:', error);
      throw error;
    }
  }
};

// Services Firestore pour les plans nutritionnels
export const nutritionService = {
  // Récupérer tous les plans d'un utilisateur
  getUserNutritionPlans: async (userId) => {
    try {
      const plansQuery = query(
        collection(db, 'nutritionPlans'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(plansQuery);
      const plans = [];
      
      querySnapshot.forEach((doc) => {
        plans.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return plans;
    } catch (error) {
      console.error('Erreur lors de la récupération des plans:', error);
      throw error;
    }
  },
  
  // Ajouter un plan
  addNutritionPlan: async (userId, planData) => {
    try {
      const docRef = await addDoc(collection(db, 'nutritionPlans'), {
        ...planData,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...planData
      };
    } catch (error) {
      console.error('Erreur lors de l\'ajout du plan:', error);
      throw error;
    }
  }
};

export { auth, db, storage };
export default app;