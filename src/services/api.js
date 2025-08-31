import axios from 'axios';
import { mistralSearchService } from './mistralIntegration';

// Créer une instance pour stocker la référence au hook usePopup
let popupManager = null;

// Fonction d'initialisation pour injecter les popups dans le service API
export const initApiWithPopups = (popupHook) => {
  popupManager = popupHook;
};

// Fonction utilitaire pour afficher des popups (avec fallback console si non disponible)
const showPopupOrConsole = (type, title, message) => {
  if (popupManager) {
    if (type === 'error') {
      popupManager.showErrorPopup(title, message);
    } else if (type === 'info') {
      popupManager.showInfoPopup(title, message);
    } else if (type === 'profile') {
      popupManager.showProfileIncompletePopup();
    }
  } else {
    // Fallback vers console si les popups ne sont pas disponibles
    if (type === 'error') {
      console.error(`${title}: ${message}`);
    } else {
      console.log(`${title}: ${message}`);
    }
  }
};

// Configuration de base d'Axios
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Configuration pour activer/désactiver Mistral
const USE_MISTRAL_AI = process.env.REACT_APP_USE_MISTRAL === 'true' || true; // Activé par défaut
const mistralApiKey = process.env.REACT_APP_MISTRAL_API_KEY;

// Vérification des variables d'environnement Mistral
if (USE_MISTRAL_AI) {
  if (mistralApiKey) {
    console.log('✅ Mistral AI activé pour la génération de contenu fitness');
  } else {
    console.warn('⚠️ Mistral AI activé mais clé API manquante. Définissez REACT_APP_MISTRAL_API_KEY');
    console.warn('Utilisation des fallbacks en cas d\'erreur');
  }
} else {
  console.log('🔍 Recherche web classique activée');
}

// Configuration Google Search (fallback si Mistral échoue)
const googleSearchApiKey = process.env.REACT_APP_GOOGLE_SEARCH_API_KEY;
const googleSearchEngineId = process.env.REACT_APP_GOOGLE_SEARCH_ENGINE_ID;

// Fonction utilitaire pour vérifier si l'utilisateur est authentifié et a un profil complet
const isUserProfileComplete = () => {
  try {
    // Vérifier d'abord l'authentification
    const userData = localStorage.getItem('user') || localStorage.getItem('userData') || localStorage.getItem('authUser');
    
    if (!userData) {
      showPopupOrConsole('profile', 'Connexion requise', 'Veuillez vous connecter pour accéder à cette fonctionnalité.');
      return false;
    }

    // Vérifier ensuite le profil utilisateur
    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
      // Pour l'instant, considérer qu'avoir des données utilisateur suffit
      console.log('⚠️ Profil utilisateur non trouvé mais utilisateur connecté - continuons');
      return true; // Permettre l'accès même sans profil complet
    }
    
    const profile = JSON.parse(userProfile);
    // Vérifier que tous les champs requis sont présents
    const isComplete = profile && 
           profile.height && 
           profile.weight && 
           profile.age && 
           profile.goal && 
           profile.activityLevel;
           
    if (!isComplete) {
      console.log('⚠️ Profil incomplet mais utilisateur connecté - continuons');
      return true; // Permettre l'accès même avec profil incomplet
    }
    
    return true;
  } catch (error) {
    console.log('⚠️ Erreur vérification profil:', error);
    // En cas d'erreur, vérifier au moins si l'utilisateur est connecté
    const userData = localStorage.getItem('user') || localStorage.getItem('userData') || localStorage.getItem('authUser');
    return !!userData;
  }
};

// Données de fallback pour les recettes (à utiliser en cas d'échec complet)
const fallbackMassGainRecipes = [
  {
    id: `recipe-mass-${Date.now()}-1`,
    name: 'Poulet teriyaki et riz complet',
    description: 'Riche en protéines et en glucides complexes, parfait pour la prise de masse musculaire.',
    source: 'Fallback interne',
    calories: 650,
    protein: 42,
    time: 30,
    image: 'https://source.unsplash.com/400x300/?chicken+rice',
    aiGenerated: false
  },
  {
    id: `recipe-mass-${Date.now()}-2`,
    name: 'Smoothie protéiné banane et beurre de cacahuète',
    description: 'Shake idéal post-entraînement avec whey, banane, lait et beurre de cacahuète.',
    source: 'Fallback interne',
    calories: 580,
    protein: 38,
    time: 5,
    image: 'https://source.unsplash.com/400x300/?protein+smoothie',
    aiGenerated: false
  },
  {
    id: `recipe-mass-${Date.now()}-3`,
    name: 'Bowl de quinoa et bœuf mariné',
    description: 'Un plat complet riche en protéines, fer et acides aminés essentiels pour la croissance musculaire.',
    source: 'Fallback interne',
    calories: 720,
    protein: 45,
    time: 35,
    image: 'https://source.unsplash.com/400x300/?beef+bowl',
    aiGenerated: false
  }
];

// Intercepteur pour ajouter le token d'authentification si disponible
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Gestion des erreurs d'authentification (401)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Tentative de rafraîchissement du token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/auth/refresh`,
            { refreshToken }
          );
          
          const { token } = response.data;
          localStorage.setItem('authToken', token);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // En cas d'échec du rafraîchissement, déconnexion
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Service de recherche web/Mistral
export const webSearchService = {
  // Recherche Google/Mistral avec extraction intelligente
  searchGoogle: async (query, userGoal = null) => {
    // Vérifier que le profil est complet
    if (!isUserProfileComplete()) {
      showPopupOrConsole('error', 'Profil incomplet', 'Veuillez compléter votre profil pour utiliser la recherche personnalisée');
      return {
        error: 'PROFILE_INCOMPLETE',
        message: 'Veuillez compléter votre profil pour accéder à la recherche personnalisée'
      };
    }
    
    try {
      // 🤖 UTILISER MISTRAL AI au lieu de Google Search
      if (USE_MISTRAL_AI && mistralApiKey) {
        console.log(`🤖 Génération avec Mistral AI: "${query}"`);
        return await mistralSearchService.searchGoogle(query, userGoal);
      } else {
        // Fallback vers Google Search si Mistral non disponible
        console.log(`🔍 Recherche Google (fallback): "${query}"`);
        return await this.fallbackGoogleSearch(query, userGoal);
      }
      
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      showPopupOrConsole('error', 'Erreur de recherche', 'Problème de génération de contenu. Utilisation du contenu de base.');
      return this.simulateEnhancedSearchResults(query, userGoal);
    }
  },
  
  // Recherche automatique de recettes pour prise de masse avec Mistral
  searchMassGainRecipes: async () => {
    // Vérifier que le profil est complet
    if (!isUserProfileComplete()) {
      console.warn('Profil utilisateur incomplet, recherche non autorisée');
      return {
        error: 'PROFILE_INCOMPLETE',
        message: 'Veuillez compléter votre profil pour accéder aux recettes personnalisées'
      };
    }
    
    try {
      // 🤖 UTILISER MISTRAL AI pour générer les recettes
      if (USE_MISTRAL_AI && mistralApiKey) {
        console.log('🥗 Génération de recettes prise de masse avec Mistral AI');
        const recipes = await mistralSearchService.searchMassGainRecipes();
        
        // Vérifier si erreur de profil
        if (recipes.error === 'PROFILE_INCOMPLETE') {
          return recipes;
        }
        
        console.log(`✅ ${recipes.length} recettes générées par Mistral AI`);
        return recipes;
      } else {
        // Fallback vers les recettes prédéfinies
        console.log('🔄 Utilisation des recettes de fallback');
        return fallbackMassGainRecipes;
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération de recettes:', error);
      console.log('🔄 Utilisation des recettes de fallback');
      return fallbackMassGainRecipes;
    }
  },
  
  // Recherche de programmes d'entraînement avec Mistral
  searchWorkoutPrograms: async (criteria) => {
    // Vérifier que le profil est complet
    if (!isUserProfileComplete()) {
      console.warn('Profil utilisateur incomplet, recherche non autorisée');
      return {
        error: 'PROFILE_INCOMPLETE',
        message: 'Veuillez compléter votre profil pour accéder aux programmes personnalisés'
      };
    }

    try {
      // 🤖 UTILISER MISTRAL AI pour générer les programmes
      if (USE_MISTRAL_AI && mistralApiKey) {
        console.log('💪 Génération de programmes avec Mistral AI');
        const programs = await mistralSearchService.searchWorkoutPrograms(criteria);
        
        // Vérifier si erreur de profil
        if (programs.error === 'PROFILE_INCOMPLETE') {
          return programs;
        }
        
        console.log(`✅ ${programs.length} programmes générés par Mistral AI`);
        return programs;
      } else {
        // Fallback vers un programme basique
        return this.getFallbackWorkoutPrograms(criteria);
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération de programmes:', error);
      return this.getFallbackWorkoutPrograms(criteria);
    }
  },
  
  // Recherche de recettes et plans nutritionnels avec Mistral
  searchNutritionPlans: async (criteria) => {
    // Vérifier que le profil est complet
    if (!isUserProfileComplete()) {
      console.warn('Profil utilisateur incomplet, recherche non autorisée');
      return {
        error: 'PROFILE_INCOMPLETE',
        message: 'Veuillez compléter votre profil pour accéder aux plans nutritionnels personnalisés'
      };
    }
    
    try {
      // 🤖 UTILISER MISTRAL AI pour générer les plans nutrition
      if (USE_MISTRAL_AI && mistralApiKey) {
        console.log('🍽️ Génération de plans nutritionnels avec Mistral AI');
        const nutritionPlan = await mistralSearchService.searchNutritionPlans(criteria);
        
        // Vérifier si erreur de profil
        if (nutritionPlan.error === 'PROFILE_INCOMPLETE') {
          return nutritionPlan;
        }
        
        console.log(`✅ Plan nutritionnel avec ${nutritionPlan.recipes?.length || 0} recettes généré par Mistral AI`);
        return nutritionPlan;
      } else {
        // Fallback vers un plan basique
        return this.getFallbackNutritionPlans(criteria);
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération de plans nutritionnels:', error);
      return this.getFallbackNutritionPlans(criteria);
    }
  },

  // Méthodes de fallback (ancien système)
  fallbackGoogleSearch: async (query, userGoal) => {
    if (!googleSearchApiKey || !googleSearchEngineId) {
      console.warn('🔧 API Google indisponible, utilisation de la simulation');
      return this.simulateEnhancedSearchResults(query, userGoal);
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(query)}&num=8&lr=lang_fr&gl=fr&hl=fr`
      );
      
      if (!response.ok) {
        throw new Error(`Erreur API Google: ${response.status}`);
      }
      
      const data = await response.json();
      return data.items || this.simulateEnhancedSearchResults(query, userGoal);
    } catch (error) {
      console.error('Erreur Google Search:', error);
      return this.simulateEnhancedSearchResults(query, userGoal);
    }
  },

  getFallbackWorkoutPrograms: (criteria) => {
    return [
      {
        id: `fallback-program-${Date.now()}`,
        title: `Programme ${criteria.location === 'home' ? 'à domicile' : 'en salle'}`,
        description: 'Programme personnalisé adapté à votre profil et votre équipement.',
        level: 'Intermédiaire',
        duration: '4 semaines',
        equipment: criteria.equipment?.length > 0 ? criteria.equipment.join(', ') : 'Aucun',
        source: 'Fallback interne',
        thumbnail: `https://source.unsplash.com/400x300/?fitness+${criteria.location || 'workout'}`,
        workouts: [],
        aiGenerated: false
      }
    ];
  },

  getFallbackNutritionPlans: (criteria) => {
    return {
      id: `fallback-nutrition-${Date.now()}`,
      title: `Plan nutritionnel ${criteria.dietType || 'personnalisé'}`,
      dietType: criteria.dietType,
      source: 'Fallback interne',
      calorieTarget: 2000,
      recipes: [
        {
          id: `fallback-recipe-${Date.now()}`,
          name: 'Recette équilibrée de base',
          description: 'Une recette saine et équilibrée adaptée à vos besoins.',
          calories: 400,
          protein: 25,
          time: 20,
          image: 'https://source.unsplash.com/400x300/?healthy+food',
          source: 'Fallback interne',
          aiGenerated: false
        }
      ],
      aiGenerated: false
    };
  },

  // Simulation améliorée pour les cas d'urgence
  simulateEnhancedSearchResults: (query, userGoal) => {
    console.log('🔄 Utilisation de la simulation de recherche');
    
    const baseResults = [
      {
        title: 'Programme fitness personnalisé',
        snippet: 'Programme adapté à votre profil et vos objectifs spécifiques.',
        link: '#generated-content',
        displayLink: 'fitness-app.local',
        pagemap: { cse_image: [{ src: 'https://source.unsplash.com/400x300/?fitness' }] },
        aiGenerated: false,
        source: 'Simulation'
      },
      {
        title: 'Plan nutritionnel équilibré',
        snippet: 'Recettes et conseils nutrition adaptés à vos besoins.',
        link: '#nutrition-content',
        displayLink: 'fitness-app.local', 
        pagemap: { cse_image: [{ src: 'https://source.unsplash.com/400x300/?healthy+food' }] },
        aiGenerated: false,
        source: 'Simulation'
      }
    ];
    
    return baseResults;
  }
};

// Services API pour les fonctionnalités de l'application
export const apiService = {
  // Authentification
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    resetPassword: (email) => api.post('/auth/reset-password', { email }),
  },
  
  // Programmes d'entraînement
  workouts: {
    getAll: () => {
      // En développement, simuler les données
      if (process.env.NODE_ENV === 'development') {
        return Promise.resolve({ data: [] });
      }
      return api.get('/workouts');
    },
    getById: (id) => {
      // En développement, simuler les données
      if (process.env.NODE_ENV === 'development') {
        return Promise.resolve({ data: null });
      }
      return api.get(`/workouts/${id}`);
    },
    create: (workout) => api.post('/workouts', workout),
    update: (id, workout) => api.put(`/workouts/${id}`, workout),
    delete: (id) => api.delete(`/workouts/${id}`),
    // 🤖 MODIFIÉ: Utilise Mistral au lieu de la recherche web
    search: (params) => webSearchService.searchWorkoutPrograms(params)
  },
  
  // Nutrition
  nutrition: {
    getPlans: () => {
      // En développement, simuler les données
      if (process.env.NODE_ENV === 'development') {
        return Promise.resolve({ data: [] });
      }
      return api.get('/nutrition/plans');
    },
    getPlanById: (id) => {
      // En développement, simuler les données
      if (process.env.NODE_ENV === 'development') {
        return Promise.resolve({ data: null });
      }
      return api.get(`/nutrition/plans/${id}`);
    },
    createPlan: (plan) => api.post('/nutrition/plans', plan),
    updatePlan: (id, plan) => api.put(`/nutrition/plans/${id}`, plan),
    deletePlan: (id) => api.delete(`/nutrition/plans/${id}`),
    // 🤖 MODIFIÉ: Utilise Mistral au lieu de la recherche web
    searchRecipes: (params) => webSearchService.searchNutritionPlans(params),
    getMassGainRecipes: () => webSearchService.searchMassGainRecipes()
  },
  
  // Profil utilisateur
  user: {
    getProfile: () => api.get('/user/profile'),
    updateProfile: (profile) => api.put('/user/profile', profile),
    updateSettings: (settings) => api.put('/user/settings', settings),
    uploadAvatar: (formData) => api.post('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },
  
  // Statistiques et suivi
  tracking: {
    getStats: () => api.get('/tracking/stats'),
    logWorkout: (data) => api.post('/tracking/workouts', data),
    logMeal: (data) => api.post('/tracking/meals', data),
    getActivityHistory: (params) => api.get('/tracking/history', { params }),
  }
};

export default api;
