import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { PopupProvider } from './PopupContext';
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
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Persister les données dans le localStorage
  useEffect(() => {
    // Charger les données au démarrage
    try {
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
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }, []);
  
  // Sauvegarder les changements
  useEffect(() => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(state.userProfile));
      localStorage.setItem('equipmentProfile', JSON.stringify(state.equipmentProfile));
      localStorage.setItem('nutritionProfile', JSON.stringify(state.nutritionProfile));
      localStorage.setItem('stats', JSON.stringify(state.stats));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données:', error);
    }
  }, [state.userProfile, state.equipmentProfile, state.nutritionProfile, state.stats]);
    
  // Actions pour mettre à jour les états
  const actions = {
    // Questionnaire
    setQuestionnaireStep: (step) => {
      dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE_STEP, payload: step });
    },
    
    setQuestionnaire: (isOpen) => {
      dispatch({ type: ACTION_TYPES.SET_QUESTIONNAIRE, payload: isOpen });
    },
    
    setSearchStatus: (status) => {
      dispatch({ type: ACTION_TYPES.SET_SEARCH_STATUS, payload: status });
    },
    
    // ✅ SOLUTION OPTIMALE : Flag silent pour éviter la sauvegarde automatique
    updateUserProfile: async (updates, options = {}) => {
      const { silent = false } = options;
      
      // Toujours mettre à jour le contexte local
      dispatch({ type: ACTION_TYPES.UPDATE_USER_PROFILE, payload: updates });
      
      // Log pour debugging
      if (silent) {
        console.log('📖 Mise à jour silencieuse du profil (pas de sauvegarde Firestore):', updates);
      } else {
        console.log('💾 Mise à jour du profil avec sauvegarde Firestore:', updates);
      }
      
      // Synchroniser avec Firestore SEULEMENT si pas en mode silencieux
      if (!silent) {
        try {
          await profileSyncService.saveProfileToFirestore({ ...state.userProfile, ...updates });
          console.log('✅ Profil synchronisé avec Firestore');
        } catch (error) {
          console.warn('⚠️ Impossible de synchroniser avec Firestore:', error.message);
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
    },
    
    updateEquipmentProfile: (updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_EQUIPMENT_PROFILE, payload: updates });
    },
    
    updateNutritionProfile: (updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_NUTRITION_PROFILE, payload: updates });
    },
    
    // Programmes
    addWorkoutProgram: (program) => {
      dispatch({ type: ACTION_TYPES.ADD_WORKOUT_PROGRAM, payload: program });
    },
    
    addNutritionPlan: (plan) => {
      dispatch({ type: ACTION_TYPES.ADD_NUTRITION_PLAN, payload: plan });
    },
    
    // Statistiques
    updateStats: (updates) => {
      dispatch({ type: ACTION_TYPES.UPDATE_STATS, payload: updates });
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