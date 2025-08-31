import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { PopupProvider } from './PopupContext';
import { persistenceService } from '../services/persistenceService';
import { profileSyncService } from '../services/profileSync';

// Types d'actions
const ACTION_TYPES = {
  UPDATE_USER_PROFILE: 'UPDATE_USER_PROFILE',
  UPDATE_EQUIPMENT_PROFILE: 'UPDATE_EQUIPMENT_PROFILE',
  UPDATE_NUTRITION_PROFILE: 'UPDATE_NUTRITION_PROFILE',
  ADD_WORKOUT_PROGRAM: 'ADD_WORKOUT_PROGRAM',
  ADD_NUTRITION_PLAN: 'ADD_NUTRITION_PLAN',
  UPDATE_STATS: 'UPDATE_STATS',
  SET_QUESTIONNAIRE: 'SET_QUESTIONNAIRE',
  SET_QUESTIONNAIRE_STEP: 'SET_QUESTIONNAIRE_STEP',
  SET_SEARCH_STATUS: 'SET_SEARCH_STATUS',
  FIND_WORKOUTS_REQUEST: 'FIND_WORKOUTS_REQUEST',
  FIND_WORKOUTS_SUCCESS: 'FIND_WORKOUTS_SUCCESS',
  HYDRATE_STATE: 'HYDRATE_STATE'
};

// État initial de l'application
const initialState = {
  // Profils
  userProfile: {
    name: '',
    age: '',
    weight: '',
    height: '',
    gender: '',
    goal: '',
    activityLevel: ''
  },
  equipmentProfile: {
    location: '',
    homeEquipment: [],
    gymFrequency: ''
  },
  nutritionProfile: {
    dietType: '',
    cookingTime: '',
    allergies: [],
    favorites: []
  },
  
  // Données
  workoutPrograms: [],
  nutritionPlans: [],
  
  // Statistiques
  stats: {
    workoutsCompleted: 0,
    totalMinutes: 0,
    streakDays: 0
  },
  
  // UI
  isQuestionnaire: false,
  questionnaireStep: 0,
  searchStatus: '',
  isLoading: false
};

// Réducteur pour gérer les états
function appReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.UPDATE_USER_PROFILE:
      return { 
        ...state, 
        userProfile: { ...state.userProfile, ...action.payload }
      };
      
    case ACTION_TYPES.UPDATE_EQUIPMENT_PROFILE:
      return { 
        ...state, 
        equipmentProfile: { ...state.equipmentProfile, ...action.payload }
      };
      
    case ACTION_TYPES.UPDATE_NUTRITION_PROFILE:
      return { 
        ...state, 
        nutritionProfile: { ...state.nutritionProfile, ...action.payload }
      };
      
    case ACTION_TYPES.ADD_WORKOUT_PROGRAM:
      return { 
        ...state, 
        workoutPrograms: [...state.workoutPrograms, action.payload]
      };
      
    case ACTION_TYPES.ADD_NUTRITION_PLAN:
      return { 
        ...state, 
        nutritionPlans: [...state.nutritionPlans, action.payload]
      };
      
    case ACTION_TYPES.UPDATE_STATS:
      return { 
        ...state, 
        stats: { ...state.stats, ...action.payload }
      };
      
    case ACTION_TYPES.SET_QUESTIONNAIRE:
      return { ...state, isQuestionnaire: action.payload };
      
    case ACTION_TYPES.SET_QUESTIONNAIRE_STEP:
      return { ...state, questionnaireStep: action.payload };
      
    case ACTION_TYPES.SET_SEARCH_STATUS:
      return { ...state, searchStatus: action.payload };

    case ACTION_TYPES.FIND_WORKOUTS_REQUEST:
      return { ...state, isLoading: true, searchStatus: 'Recherche de programmes adaptés...' };
      
    case ACTION_TYPES.FIND_WORKOUTS_SUCCESS:
      return { 
        ...state, 
        workoutPrograms: action.payload,
        isLoading: false,
        searchStatus: 'Programmes trouvés !'
      };
      
    case ACTION_TYPES.HYDRATE_STATE:
      return { ...state, ...action.payload };
      
    default:
      return state;
  }
}

// Création du contexte
const AppContext = createContext(null);

// Hook personnalisé pour utiliser le contexte
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext doit être utilisé à l'intérieur d'un AppProvider");
  }
  return context;
}

// Composant Provider
function AppProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  // Persister les données dans le localStorage
  useEffect(() => {
    // Charger les données au démarrage avec le service central
    try {
      const rehydratedData = persistenceService.rehydrateApp();
      
      if (Object.keys(rehydratedData.userProfile).length > 0 ||
          Object.keys(rehydratedData.equipmentProfile).length > 0 ||
          Object.keys(rehydratedData.nutritionProfile).length > 0) {
        
        console.log('🔄 Réhydratation des données depuis le service central');
          dispatch({
          type: ACTION_TYPES.HYDRATE_STATE,
          payload: {
            userProfile: rehydratedData.userProfile,
            equipmentProfile: rehydratedData.equipmentProfile,
            nutritionProfile: rehydratedData.nutritionProfile,
            isQuestionnaire: rehydratedData.questionnaireState.isActive || false,
            questionnaireStep: rehydratedData.questionnaireState.currentStep || 0
          }
        });
      }
      
      // Ne pas relancer automatiquement le questionnaire au refresh
    } catch (error) {
      console.error('Erreur lors de la réhydratation des données:', error);
      
      // Fallback vers l'ancien système
      const loadUserProfile = localStorage.getItem('userProfile');
      const loadEquipmentProfile = localStorage.getItem('equipmentProfile');
      const loadNutritionProfile = localStorage.getItem('nutritionProfile');
      const loadStats = localStorage.getItem('stats');
      
      const hydrationData = {};
      
      if (loadUserProfile) hydrationData.userProfile = JSON.parse(loadUserProfile);
      if (loadEquipmentProfile) hydrationData.equipmentProfile = JSON.parse(loadEquipmentProfile);
      if (loadNutritionProfile) hydrationData.nutritionProfile = JSON.parse(loadNutritionProfile);
      if (loadStats) hydrationData.stats = JSON.parse(loadStats);
      
      if (Object.keys(hydrationData).length > 0) {
        dispatch({
          type: ACTION_TYPES.HYDRATE_STATE,
          payload: hydrationData
        });
      }
    }
  }, []);
  // Sauvegarder les changements automatiquement
  useEffect(() => {
    try {
      // Utiliser le service central pour la sauvegarde automatique
      persistenceService.autoSave(state);
      
      // Sauvegarder spécifiquement l'état du questionnaire
      persistenceService.saveQuestionnaireState({
        isActive: state.isQuestionnaire,
        currentStep: state.questionnaireStep,
        timestamp: Date.now()
      });
      
      // Fallback vers l'ancien système pour compatibilité
      localStorage.setItem('userProfile', JSON.stringify(state.userProfile));
      localStorage.setItem('equipmentProfile', JSON.stringify(state.equipmentProfile));
      localStorage.setItem('nutritionProfile', JSON.stringify(state.nutritionProfile));
      localStorage.setItem('stats', JSON.stringify(state.stats));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
    }
  }, [state]);
      // Charger les profils depuis Firestore au démarrage
  useEffect(() => {
    const loadUserProfiles = async () => {
      if (!user?.uid) return;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          
          // Charger le profil utilisateur si disponible
          if (userData.userProfile) {
            dispatch({ type: ACTION_TYPES.UPDATE_USER_PROFILE, payload: userData.userProfile });
          }
          
          // Charger le profil d'équipement si disponible
          if (userData.equipmentProfile) {
            dispatch({ type: ACTION_TYPES.UPDATE_EQUIPMENT_PROFILE, payload: userData.equipmentProfile });
          }
            // Charger le profil de nutrition si disponible
          if (userData.nutritionProfile) {
            dispatch({ type: ACTION_TYPES.UPDATE_NUTRITION_PROFILE, payload: userData.nutritionProfile });
          }
          
          // Charger les statistiques si disponibles
          if (userData.stats) {
            dispatch({ type: ACTION_TYPES.UPDATE_STATS, payload: userData.stats });
          }
          
          // Charger l'état du questionnaire
          if (userData.questionnaireState) {
            dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE, payload: userData.questionnaireState.isActive || false });
            dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE_STEP, payload: userData.questionnaireState.currentStep || 0 });
          } else if (userData.equipmentProfile || userData.nutritionProfile) {
            // Si les profils existent mais pas d'état de questionnaire, le marquer comme terminé
            dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE, payload: false });
            dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE_STEP, payload: 0 });
          }
            console.log('✅ Profils et questionnaire chargés depuis Firestore');
        } else {
          console.log('📋 Aucune donnée Firestore trouvée, utilisation des données par défaut');
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des profils:', error);
      }
    };
    
    if (user?.uid) {
      loadUserProfiles();
    }
    }, [user?.uid]);
  // Actions pour mettre à jour les états
  const actions = {
    // Questionnaire
    setQuestionnaireStep: async (step) => {
      dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE_STEP, payload: step });
      
      // Sauvegarder l'étape du questionnaire dans localStorage
      persistenceService.saveQuestionnaireState({
        isActive: state.isQuestionnaire,
        currentStep: step,
        timestamp: Date.now()
      });
      
      // Sauvegarder dans Firestore si utilisateur connecté
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            questionnaireState: {
              isActive: state.isQuestionnaire,
              currentStep: step,
              timestamp: Date.now()
            }
          }, { merge: true });
          console.log('✅ Étape du questionnaire sauvegardée dans Firestore');
        } catch (error) {
          console.error('❌ Erreur sauvegarde Firestore:', error);
        }
      }
    },
    
    setQuestionnaire: async (isActive) => {
      dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE, payload: isActive });
      
      // Sauvegarder dans localStorage
      persistenceService.saveQuestionnaireState({
        isActive,
        currentStep: state.questionnaireStep,
        timestamp: Date.now()
      });
      
      // Sauvegarder dans Firestore si utilisateur connecté
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            questionnaireState: {
              isActive,
              currentStep: state.questionnaireStep,
              timestamp: Date.now()
            }
          }, { merge: true });
          console.log('✅ État du questionnaire sauvegardé dans Firestore');
        } catch (error) {
          console.error('❌ Erreur sauvegarde Firestore:', error);
        }
      }
    },
    
    // Marquer le questionnaire comme complété et le fermer
    completeQuestionnaire: async () => {
      // Fermer dans le state
      dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE, payload: false });
      dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE_STEP, payload: 0 });

      // Sauvegarder l'état complété côté client
      persistenceService.saveQuestionnaireState({
        isActive: false,
        currentStep: 0,
        completed: true,
        timestamp: Date.now()
      });

      // Sauvegarder dans Firestore si utilisateur connecté
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            questionnaireState: {
              isActive: false,
              currentStep: 0,
              completed: true,
              timestamp: Date.now()
            }
          }, { merge: true });
          console.log('✅ Questionnaire marqué comme complété');
        } catch (error) {
          console.error('❌ Erreur sauvegarde état questionnaire:', error);
        }
      }
    },
    setSearchStatus: (status) => {
      dispatch({ type: ACTION_TYPES.SET_SEARCH_STATUS, payload: status });
    },
    
    // Relancer le questionnaire si la configuration est incomplète
    checkAndRestartQuestionnaire: () => {
      if (persistenceService.shouldRestartQuestionnaire()) {
        console.log('🔄 Redémarrage du questionnaire nécessaire');
        dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE, payload: true });
        dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE_STEP, payload: 0 });
        persistenceService.saveQuestionnaireState({
          isActive: true,
          currentStep: 0,
          timestamp: Date.now()
        });
        return true;
      }
      return false;
    },
      // ✅ SOLUTION OPTIMALE : Flag silent pour éviter la sauvegarde automatique
    updateUserProfile: async (updates, options = {}) => {
      const { silent = false } = options;
      
      // Toujours mettre à jour le contexte local
      dispatch({ type: ACTION_TYPES.UPDATE_USER_PROFILE, payload: updates });
    
      // Sauvegarder dans Firestore si utilisateur connecté et pas en mode silencieux
      if (!silent && user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            userProfile: { ...state.userProfile, ...updates }
          }, { merge: true });
          console.log('✅ Profil utilisateur sauvegardé dans Firestore');
        } catch (error) {
          console.error('❌ Erreur sauvegarde profil utilisateur Firestore:', error);
        }
      }
      
      // Synchroniser avec le service de profil SEULEMENT si pas en mode silencieux
      if (!silent) {
        try {
          await profileSyncService.saveProfileToFirestore({ ...state.userProfile, ...updates });
          console.log('✅ Profil synchronisé avec le service de profil');
        } catch (error) {
          console.warn('⚠️ Impossible de synchroniser avec le service de profil:', error.message);
        }
      }
    },
    
    // Méthode pour nettoyer complètement les données utilisateur
    clearAllData: () => {
      // Nettoyer le state
      dispatch({ type: ACTION_TYPES.UPDATE_USER_PROFILE, payload: initialState.userProfile });
      dispatch({ type: ACTION_TYPES.UPDATE_EQUIPMENT_PROFILE, payload: initialState.equipmentProfile });
      dispatch({ type: ACTION_TYPES.UPDATE_NUTRITION_PROFILE, payload: initialState.nutritionProfile });
      dispatch({ type: ACTION_TYPES.UPDATE_STATS, payload: initialState.stats });
      
      // Nettoyer complètement le localStorage
      const keysToRemove = [
        'userProfile',
        'equipmentProfile',
        'nutritionProfile',
        'stats',
        'personalizedSuggestions',
        'user',
        'userData',
        'nutrition_recipes',
        'nutrition_favorites',
        'nutrition_mass_gain_recipes',
        'hasSeenWelcome',
        'authToken',
        'refreshToken'
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Erreur suppression ${key}:`, error);
        }
      });
      
      console.log('🧹 Nettoyage complet des données utilisateur effectué');
    },    updateEquipmentProfile: async (updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_EQUIPMENT_PROFILE, payload: updates });
      
      // Sauvegarder immédiatement les changements d'équipement dans localStorage
      persistenceService.saveEquipmentProfile({ ...state.equipmentProfile, ...updates });
      
      // Sauvegarder dans Firestore si utilisateur connecté
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            equipmentProfile: { ...state.equipmentProfile, ...updates }
          }, { merge: true });
          console.log('✅ Profil d\'équipement sauvegardé dans Firestore');
        } catch (error) {
          console.error('❌ Erreur sauvegarde équipement Firestore:', error);
        }
      }
    },
    
    updateNutritionProfile: async (updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_NUTRITION_PROFILE, payload: updates });
      
      // Sauvegarder immédiatement les changements de nutrition dans localStorage
      persistenceService.saveNutritionProfile({ ...state.nutritionProfile, ...updates });
      
      // Sauvegarder dans Firestore si utilisateur connecté
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            nutritionProfile: { ...state.nutritionProfile, ...updates }
          }, { merge: true });
          console.log('✅ Profil nutritionnel sauvegardé dans Firestore');
        } catch (error) {
          console.error('❌ Erreur sauvegarde nutrition Firestore:', error);
        }
      }
    },
    
    // Programmes
    addWorkoutProgram: (program) => {
      dispatch({ type: ACTION_TYPES.ADD_WORKOUT_PROGRAM, payload: program });
    },
    
    addNutritionPlan: (plan) => {
      dispatch({ type: ACTION_TYPES.ADD_NUTRITION_PLAN, payload: plan });
    },
      // Statistiques
    updateStats: async (updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_STATS, payload: updates });
      
      // Sauvegarder dans Firestore si utilisateur connecté
      if (user?.uid) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, {
            stats: { ...state.stats, ...updates }
          }, { merge: true });
          console.log('✅ Statistiques sauvegardées dans Firestore');
        } catch (error) {
          console.error('❌ Erreur sauvegarde statistiques Firestore:', error);
        }
      }
    },
    
    // Recherche de programmes adaptés aux équipements disponibles
    findSuitableWorkouts: () => {
      dispatch({ type: ACTION_TYPES.FIND_WORKOUTS_REQUEST });
      
      // Simulation d'une recherche de programmes
      // setTimeout(() => {
      //   // Logique pour utiliser equipmentProfile.homeEquipment
      //   const withEquipment = state.equipmentProfile.homeEquipment && 
      //                         state.equipmentProfile.homeEquipment.length > 0;
        
      //   const newPrograms = [
      //     {
      //       id: 'program1',
      //       title: withEquipment ? 'Programme avec équipement' : 'Programme sans équipement',
      //       level: 'Débutant',
      //       duration: '4 semaines',
      //       equipment: withEquipment ? state.equipmentProfile.homeEquipment.join(', ') : 'Aucun',
      //       description: withEquipment 
      //         ? 'Programme personnalisé utilisant votre équipement disponible à domicile.' 
      //         : 'Programme d\'exercices au poids du corps, parfait pour s\'entraîner sans matériel.',
      //       workouts: []
      //     },
      //     {
      //       id: 'program2',
      //       title: 'Programme intermédiaire',
      //       level: 'Intermédiaire',
      //       duration: '6 semaines',
      //       equipment: withEquipment ? state.equipmentProfile.homeEquipment.join(', ') : 'Aucun',
      //       description: 'Programme d\'intensité moyenne pour progresser.',
      //       workouts: []
      //     },
      //     {
      //       id: 'program3',
      //       title: 'Programme avancé',
      //       level: 'Avancé',
      //       duration: '8 semaines',
      //       equipment: withEquipment ? state.equipmentProfile.homeEquipment.join(', ') : 'Aucun',
      //       description: 'Programme intensif pour sportifs expérimentés.',
      //       workouts: []
      //     }
      //   ];
        
      //   dispatch({ 
      //     type: ACTION_TYPES.FIND_WORKOUTS_SUCCESS, 
      //     payload: newPrograms 
      //   });
      // }, 2000);
    }
  };
  
  // Valeur du contexte combinant état et actions
  const value = {
    ...state,
    actions
  };
  
  return (
    <AppContext.Provider value={value}>
      <PopupProvider>
        {children}
      </PopupProvider>
    </AppContext.Provider>
  );
}

export default AppProvider;
