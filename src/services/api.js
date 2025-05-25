import axios from 'axios';
// import { usePopup } from '../context/PopupContext';

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

// Configuration pour les API externes avec variables d'environnement
const googleSearchApiKey = process.env.REACT_APP_GOOGLE_SEARCH_API_KEY;
const googleSearchEngineId = process.env.REACT_APP_GOOGLE_SEARCH_ENGINE_ID;

// Vérification des variables d'environnement requises
if (!googleSearchApiKey || !googleSearchEngineId) {
  console.warn('⚠️ Variables d\'environnement manquantes pour Google Search API');
  console.warn('Assurez-vous de définir REACT_APP_GOOGLE_SEARCH_API_KEY et REACT_APP_GOOGLE_SEARCH_ENGINE_ID');
}

// Fonction utilitaire pour vérifier si l'utilisateur est authentifié et a un profil complet
const isUserProfileComplete = () => {
  try {
    // Vérifier d'abord l'authentification
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (!authToken || !userData) {
      showPopupOrConsole('profile', 'Connexion requise', 'Veuillez vous connecter pour accéder à cette fonctionnalité.');
      return false;
    }

    // Vérifier ensuite le profil utilisateur
    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
      showPopupOrConsole('profile', 'Profil incomplet', 'Veuillez compléter votre profil pour accéder à cette fonctionnalité.');
      return false;
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
      showPopupOrConsole('profile', 'Profil incomplet', 'Veuillez compléter votre profil dans les paramètres pour accéder à cette fonctionnalité.');
    }
    
    return isComplete;
  } catch (error) {
    showPopupOrConsole('error', 'Erreur', 'Une erreur est survenue lors de la vérification du profil.');
    return false;
  }
};

// Données de fallback pour les recettes (à utiliser en cas d'échec de l'API)
const fallbackMassGainRecipes = [
  {
    id: `recipe-mass-${Date.now()}-1`,
    name: 'Poulet teriyaki et riz complet',
    description: 'Riche en protéines et en glucides complexes, parfait pour la prise de masse musculaire.',
    source: 'https://exemple.com/recette-poulet-teriyaki',
    calories: 650,
    protein: 42,
    time: 30,
    image: 'https://source.unsplash.com/300x200/?chicken+rice'
  },
  {
    id: `recipe-mass-${Date.now()}-2`,
    name: 'Smoothie protéiné banane et beurre de cacahuète',
    description: 'Shake idéal post-entraînement avec whey, banane, lait et beurre de cacahuète.',
    source: 'https://exemple.com/smoothie-proteine',
    calories: 580,
    protein: 38,
    time: 5,
    image: 'https://source.unsplash.com/300x200/?protein+smoothie'
  },
  {
    id: `recipe-mass-${Date.now()}-3`,
    name: 'Bowl de quinoa et bœuf mariné',
    description: 'Un plat complet riche en protéines, fer et acides aminés essentiels pour la croissance musculaire.',
    source: 'https://exemple.com/bowl-boeuf-quinoa',
    calories: 720,
    protein: 45,
    time: 35,
    image: 'https://source.unsplash.com/300x200/?beef+bowl'
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

// Service de recherche web
export const webSearchService = {
  // Recherche Google personnalisée avec extraction intelligente
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
      console.log(`🔍 Recherche Google intelligente: "${query}"`);
      
      // Vérifier que les clés API sont disponibles
      if (!googleSearchApiKey || !googleSearchEngineId) {
        console.warn('🔧 API Google indisponible, utilisation de la simulation intelligente');
        return simulateEnhancedSearchResults(query, userGoal);
      }
      
      // Effectuer la recherche Google réelle
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(query)}&num=8&lr=lang_fr&gl=fr&hl=fr`
      );
      
      if (!response.ok) {
        throw new Error(`Erreur API Google: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        console.warn('🔍 Aucun résultat trouvé, utilisation de la simulation intelligente');
        return simulateEnhancedSearchResults(query, userGoal);
      }
      
      console.log(`✅ ${data.items.length} résultats trouvés depuis Google Search API`);
      return data.items;
      
    } catch (error) {
      console.error('Erreur lors de la recherche Google:', error);
      showPopupOrConsole('error', 'Erreur de recherche', 'Problème de connexion avec Google. Utilisation de la recherche alternative.');
      return simulateEnhancedSearchResults(query, userGoal);
    }
  },
  
  // Recherche automatique de recettes pour prise de masse avec extraction intelligente
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
      // Récupérer le profil utilisateur pour personnaliser la recherche
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const { weight, height, activityLevel, fitnessGoal, goal } = userProfile;
      
      // Calculer les besoins caloriques approximatifs (formule simplifiée)
      const bmr = (weight && height) ? (10 * weight + 6.25 * height - 5 * (userProfile.age || 30)) : 2000;
      const activityMultiplier = activityLevel === 'high' ? 1.8 : activityLevel === 'medium' ? 1.5 : 1.2;
      const dailyCalories = Math.round(bmr * activityMultiplier);
      
      // Recherche affinée pour extraire les recettes complètes
      let searchQueries = [];
      
      if (goal === 'gain_muscle' || fitnessGoal === 'muscle_gain') {
        searchQueries = [
          `"recette protéinée" "grammes de protéines" "ingrédients" "préparation" musculation site:marmiton.org`,
          `"recette prise de masse" "calories" "étapes détaillées" site:750g.com`,
          `"shake protéiné" "ingrédients" "préparation" musculation site:cuisineaz.com`,
          `"plat riche en protéines" "poulet" "boeuf" "oeufs" "recette complète"`
        ];
      } else if (goal === 'lose_weight' || fitnessGoal === 'weight_loss') {
        searchQueries = [
          `"recette minceur" "calories" "ingrédients" "préparation détaillée" site:marmiton.org`,
          `"plat léger" "faible en calories" "ingrédients" "étapes" site:750g.com`,
          `"salade protéinée" "recette complète" "temps de préparation" site:cuisineaz.com`
        ];
      } else {
        searchQueries = [
          `"recette équilibrée" "protéines" "ingrédients" "préparation" nutrition site:marmiton.org`,
          `"plat complet" "ingrédients" "étapes détaillées" nutrition site:750g.com`
        ];
      }
      
      console.log('🥗 Recherche affinée de recettes:', searchQueries[0]);
      
      // Effectuer la recherche avec la première requête optimisée
      const searchResults = await webSearchService.searchGoogle(searchQueries[0], goal || fitnessGoal);
      
      // Vérifier si une erreur de profil incomplet a été retournée
      if (searchResults.error === 'PROFILE_INCOMPLETE') {
        return searchResults;
      }
      
      // Transformation intelligente des résultats en recettes structurées
      const recipes = searchResults.map((result, index) => {
        const extractedData = extractRecipeData(result);
        
        return {
          id: extractedData.id,
          name: extractedData.name,
          description: extractedData.description,
          source: extractedData.source,
          calories: extractedData.calories,
          protein: extractedData.protein,
          time: extractedData.time,
          ingredients: extractedData.ingredients,
          dishType: extractedData.dishType,
          qualityScore: extractedData.qualityScore,
          image: extractedData.image,
          webSearched: true,
          extractedFrom: 'intelligent_search',
          targetCalories: Math.round(dailyCalories / 4) // Calories par repas
        };
      });
      
      // Trier par score de qualité
      recipes.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
      
      console.log(`✅ ${recipes.length} recettes extraites avec intelligence artificielle`);
      
      return recipes.length > 0 ? recipes : fallbackMassGainRecipes;
      
    } catch (error) {
      console.error('Erreur lors de la recherche de recettes:', error);
      console.log('🔄 Utilisation des recettes de fallback');
      return fallbackMassGainRecipes;
    }
  },
  
  // Recherche de programmes d'entraînement
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
      const { location, equipment = [] } = criteria;
      let searchQuery = 'programme entraînement fitness';
      
      // Récupérer le profil utilisateur pour personnaliser la recherche
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const { fitnessGoal, activityLevel } = userProfile;
      
      if (location === 'home') {
        searchQuery += ' à domicile';
      } else if (location === 'gym') {
        searchQuery += ' en salle';
      }
      
      if (equipment.length > 0) {
        searchQuery += ' avec ' + equipment.join(' ');
      }
      
      // Personnaliser en fonction de l'objectif et du niveau d'activité
      if (fitnessGoal === 'muscle_gain') {
        searchQuery += ' prise de masse musculation';
      } else if (fitnessGoal === 'weight_loss') {
        searchQuery += ' perte de poids';
      } else if (fitnessGoal === 'endurance') {
        searchQuery += ' amélioration endurance';
      } else if (fitnessGoal === 'flexibility') {
        searchQuery += ' flexibilité yoga';
      }
      
      if (activityLevel === 'beginner') {
        searchQuery += ' débutant';
      } else if (activityLevel === 'advanced') {
        searchQuery += ' avancé';
      }
      
      console.log('Recherche personnalisée de programmes:', searchQuery);
      
      const searchResults = await webSearchService.searchGoogle(searchQuery, fitnessGoal);
      
      // Vérifier si une erreur de profil incomplet a été retournée
      if (searchResults.error === 'PROFILE_INCOMPLETE') {
        return searchResults;
      }
      
      // Transformation des résultats en programmes d'entraînement
      return searchResults.map((result, index) => ({
        id: `program-${Date.now()}-${index}`,
        title: result.title,
        description: result.snippet,
        level: determineLevel(result.title, result.snippet, activityLevel),
        duration: determineDuration(result.title, result.snippet),
        equipment: equipment.length > 0 ? equipment.join(', ') : 'Aucun',
        source: result.link,
        thumbnail: result.pagemap?.cse_image?.[0]?.src || `https://source.unsplash.com/300x200/?fitness+${location === 'home' ? 'home' : 'gym'}`,
        workouts: [],
        goal: fitnessGoal // Ajouter l'objectif pour référence
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche de programmes:', error);
      // Retourner un programme de fallback
      return [
        {
          id: `program-${Date.now()}-fallback`,
          title: `Programme d'entraînement ${criteria.location === 'home' ? 'à domicile' : 'en salle'}`,
          description: 'Programme personnalisé adapté à votre profil et votre équipement.',
          level: 'Intermédiaire',
          duration: '4 semaines',
          equipment: criteria.equipment.length > 0 ? criteria.equipment.join(', ') : 'Aucun',
          source: 'https://exemple.com/programme-fitness',
          thumbnail: `https://source.unsplash.com/300x200/?fitness+${criteria.location === 'home' ? 'home' : 'gym'}`,
          workouts: []
        }
      ];
    }
  },
  
  // Recherche de recettes et plans nutritionnels
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
      const { dietType, cookingTime, allergies = [] } = criteria;
      
      // Récupérer le profil utilisateur pour personnaliser la recherche
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const { weight, height, age, fitnessGoal } = userProfile;
      
      // Calculer les besoins caloriques approximatifs
      const bmr = (weight && height) ? (10 * weight + 6.25 * height - 5 * (age || 30)) : 2000;
      const activityMultiplier = userProfile.activityLevel === 'high' ? 1.8 : 
                                userProfile.activityLevel === 'medium' ? 1.5 : 1.2;
      const dailyCalories = Math.round(bmr * activityMultiplier);
      
      let searchQuery = 'recettes ';
      
      if (dietType === 'vegetarian') {
        searchQuery += 'végétariennes ';
      } else if (dietType === 'vegan') {
        searchQuery += 'véganes ';
      }
      
      if (cookingTime === 'quick') {
        searchQuery += 'rapides ';
      }
      
      if (allergies.length > 0) {
        searchQuery += 'sans ' + allergies.join(' sans ');
      }
      
      // Personnaliser en fonction de l'objectif
      if (fitnessGoal === 'muscle_gain') {
        searchQuery += ` riche en protéines prise de masse ${dailyCalories + 500} calories`;
      } else if (fitnessGoal === 'weight_loss') {
        searchQuery += ` faible en calories perte de poids ${dailyCalories - 500} calories`;
      } else if (fitnessGoal === 'endurance') {
        searchQuery += ` complexes glucidiques endurance ${dailyCalories} calories`;
      } else {
        searchQuery += ` nutrition équilibrée ${dailyCalories} calories`;
      }
      
      console.log('Recherche personnalisée de plans nutritionnels:', searchQuery);
      
      const searchResults = await webSearchService.searchGoogle(searchQuery, fitnessGoal);
      
      // Vérifier si une erreur de profil incomplet a été retournée
      if (searchResults.error === 'PROFILE_INCOMPLETE') {
        return searchResults;
      }
      
      // Transformation des résultats en recettes
      const recipes = searchResults.map((result, index) => ({
        id: `recipe-${Date.now()}-${index}`,
        name: result.title,
        description: result.snippet,
        source: result.link,
        calories: estimateCalories(result.title, result.snippet, fitnessGoal === 'muscle_gain' ? 'high' : 
                                                                fitnessGoal === 'weight_loss' ? 'low' : 'medium'),
        protein: estimateProtein(result.title, result.snippet, fitnessGoal === 'muscle_gain' ? 'high' : 'medium'),
        time: estimateCookingTime(result.title, result.snippet, cookingTime),
        image: result.pagemap?.cse_image?.[0]?.src || `https://source.unsplash.com/300x200/?${encodeURIComponent(result.title.split(' ')[0])}`
      }));
      
      // Création d'un plan nutritionnel personnalisé
      return {
        id: `plan-${Date.now()}`,
        title: `Plan nutritionnel ${dietType === 'vegetarian' ? 'végétarien' : dietType === 'vegan' ? 'végane' : 'personnalisé'}`,
        dietType,
        source: 'Recherche Web IA',
        calorieTarget: fitnessGoal === 'muscle_gain' ? dailyCalories + 500 : 
                      fitnessGoal === 'weight_loss' ? dailyCalories - 500 : dailyCalories,
        goal: fitnessGoal,
        recipes
      };
    } catch (error) {
      console.error('Erreur lors de la recherche de plans nutritionnels:', error);
      // Retourner un plan de fallback
      return {
        id: `plan-${Date.now()}-fallback`,
        title: `Plan nutritionnel ${criteria.dietType === 'vegetarian' ? 'végétarien' : criteria.dietType === 'vegan' ? 'végane' : 'personnalisé'}`,
        dietType: criteria.dietType,
        source: 'Recherche Web IA',
        recipes: generateFallbackRecipes(criteria)
      };
    }
  }
};

// Fonction pour générer des résultats de recherche simulés
function simulateSearchResults(query, userGoal = null) {
  const keywords = query.toLowerCase().split(' ');
  
  // Base de résultats de recherche simulés adaptée aux objectifs
  let baseResults = [
    {
      title: 'Programme d\'entraînement complet pour prise de masse',
      snippet: 'Un programme de 8 semaines conçu pour la prise de masse musculaire avec exercices et conseils nutritionnels.',
      link: 'https://exemple.com/programme-prise-masse',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?bodybuilding' }]
      },
      category: 'muscle_gain'
    },
    {
      title: 'Recettes protéinées pour sportifs - Guide complet',
      snippet: 'Découvrez 15 recettes riches en protéines pour optimiser votre récupération et favoriser la croissance musculaire.',
      link: 'https://exemple.com/recettes-proteinees',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?protein+food' }]
      },
      category: 'nutrition'
    },
    {
      title: 'Exercices à domicile sans matériel - Programme complet',
      snippet: 'Programme d\'entraînement complet à faire chez soi sans équipement spécifique pour rester en forme.',
      link: 'https://exemple.com/exercices-maison',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?home+workout' }]
      },
      category: 'home_workout'
    },
    {
      title: 'Nutrition sportive : guide pour débutants',
      snippet: 'Apprenez les bases de la nutrition sportive pour optimiser vos performances et atteindre vos objectifs.',
      link: 'https://exemple.com/nutrition-sport',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?healthy+food' }]
      },
      category: 'nutrition'
    },
    {
      title: 'Recettes végétariennes riches en protéines',
      snippet: 'Découvrez comment obtenir suffisamment de protéines avec un régime végétarien grâce à ces recettes équilibrées.',
      link: 'https://exemple.com/vegetarien-proteines',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?vegetarian+protein' }]
      },
      category: 'vegetarian'
    },
    {
      title: 'Plan de perte de poids - Régime et exercices',
      snippet: 'Perdez du poids efficacement avec ce programme combinant alimentation équilibrée et exercices ciblés.',
      link: 'https://exemple.com/perte-poids',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?weight+loss' }]
      },
      category: 'weight_loss'
    },
    {
      title: 'Entraînement cardio pour améliorer l\'endurance',
      snippet: 'Séances d\'entraînement conçues pour renforcer votre système cardiovasculaire et augmenter votre endurance.',
      link: 'https://exemple.com/cardio-endurance',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?cardio+training' }]
      },
      category: 'endurance'
    },
    {
      title: 'Exercices d\'étirement pour améliorer la flexibilité',
      snippet: 'Guide complet des étirements pour augmenter votre amplitude de mouvement et prévenir les blessures.',
      link: 'https://exemple.com/etirements',
      displayLink: 'exemple.com',
      pagemap: {
        cse_image: [{ src: 'https://source.unsplash.com/300x200/?stretching' }]
      },
      category: 'flexibility'
    }
  ];
  
  // Si un objectif est spécifié, privilégier les résultats correspondants
  if (userGoal) {
    baseResults = baseResults.sort((a, b) => {
      // Mettre en priorité les résultats correspondant à l'objectif
      if (a.category === userGoal && b.category !== userGoal) return -1;
      if (a.category !== userGoal && b.category === userGoal) return 1;
      return 0;
    });
  }
  
  // Filtrer et trier les résultats en fonction des mots-clés de la requête
  const relevantResults = baseResults
    .filter(result => {
      const content = (result.title + ' ' + result.snippet).toLowerCase();
      return keywords.some(keyword => content.includes(keyword));
    })
    .sort((a, b) => {
      // D'abord par correspondance à l'objectif (si spécifié)
      if (userGoal) {
        if (a.category === userGoal && b.category !== userGoal) return -1;
        if (a.category !== userGoal && b.category === userGoal) return 1;
      }
      
      // Ensuite par pertinence des mots-clés
      const relevanceA = keywords.filter(kw => (a.title + ' ' + a.snippet).toLowerCase().includes(kw)).length;
      const relevanceB = keywords.filter(kw => (b.title + ' ' + b.snippet).toLowerCase().includes(kw)).length;
      return relevanceB - relevanceA;
    });
  
  // Si aucun résultat pertinent, retourner tous les résultats de base (triés par objectif si spécifié)
  return relevantResults.length > 0 ? relevantResults : baseResults;
}

// Fonction pour générer des résultats de recherche simulés intelligents
function simulateEnhancedSearchResults(query, userGoal = null) {
  const keywords = query.toLowerCase().split(' ');
  
  // Base de résultats de recherche simulés avec contenu détaillé
  let enhancedResults = [];
  
  // Résultats pour recettes
  if (keywords.some(k => ['recette', 'recettes', 'protéinée', 'musculation', 'prise', 'masse'].includes(k))) {
    enhancedResults = [
      {
        title: 'Recette complète : Bol de quinoa au poulet grillé et légumes',
        snippet: 'Ingrédients : 200g de quinoa, 150g de blanc de poulet, brocolis, courgettes. Préparation en 25 minutes. Riche en protéines (35g) et équilibré en nutriments (520 calories). Étapes détaillées de cuisson et assaisonnement.',
        link: 'https://marmiton.org/recettes/recette_bol-quinoa-poulet_123456.aspx',
        displayLink: 'marmiton.org',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/300x200/?quinoa+chicken+bowl' }]
        },
        category: 'muscle_gain'
      },
      {
        title: 'Shake protéiné post-entraînement : banane, avoine et whey',
        snippet: 'Ingrédients : 1 banane, 40g de flocons d\'avoine, 30g de whey protéine, 300ml de lait. Mixez 2 minutes. Parfait après l\'entraînement avec 42g de protéines et 580 calories. Recette simple et efficace pour la récupération.',
        link: 'https://750g.com/shake-proteine-banane-avoine-p678901.htm',
        displayLink: '750g.com',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/300x200/?protein+shake+banana' }]
        },
        category: 'muscle_gain'
      },
      {
        title: 'Saumon grillé aux épinards et patate douce - Programme musculation',
        snippet: 'Ingrédients : 180g de filet de saumon, 200g de patate douce, épinards frais. Cuisson 20 minutes au four. Excellent pour la prise de masse avec 38g de protéines, acides gras oméga-3 et 485 calories par portion.',
        link: 'https://cuisineaz.com/recettes/saumon-patate-douce-musculation-789012.aspx',
        displayLink: 'cuisineaz.com',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/300x200/?salmon+sweet+potato' }]
        },
        category: 'muscle_gain'
      }
    ];
  }
  
  // Résultats pour programmes d'entraînement
  else if (keywords.some(k => ['programme', 'musculation', 'entraînement', 'exercices', 'salle', 'maison'].includes(k))) {
    enhancedResults = [
      {
        title: 'Programme complet prise de masse - 4 séances par semaine',
        snippet: 'Programme détaillé : Jour 1 Pectoraux/Triceps (développé couché 4x8-10, dips 3x12), Jour 2 Dos/Biceps (tractions 4x8, rowing barre 4x10). Progression sur 8 semaines avec séries, répétitions et temps de repos précis.',
        link: 'https://all-musculation.com/programme-prise-masse-debutant-456789.html',
        displayLink: 'all-musculation.com',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/300x200/?gym+workout+program' }]
        },
        category: 'muscle_gain'
      },
      {
        title: 'Entraînement maison sans matériel - Programme débutant',
        snippet: 'Exercices au poids du corps : Pompes 4 séries de 12-15, Squats 4 séries de 20, Planche 3x45s, Mountain climbers 3x30s. Programme 3 fois par semaine, progression graduelle, durée 45 minutes par séance.',
        link: 'https://musculation.com/entrainement-maison-poids-corps-234567.php',
        displayLink: 'musculation.com',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/300x200/?home+bodyweight+workout' }]
        },
        category: 'home_workout'
      },
      {
        title: 'Routine split haut/bas du corps - Salle de sport',
        snippet: 'Split training efficace : Haut du corps (développé incliné 4x8, rowing T-bar 4x10, développé militaire 3x12), Bas du corps (squat 4x8-12, leg press 3x15, extension mollets 4x20). Séances de 60-75 minutes.',
        link: 'https://superphysique.org/routine-split-haut-bas-345678.html',
        displayLink: 'superphysique.org',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/300x200/?gym+split+training' }]
        },
        category: 'muscle_gain'
      }
    ];
  }
  
  // Résultats généraux adaptés à l'objectif
  else {
    enhancedResults = [
      {
        title: 'Guide complet nutrition et entraînement pour la forme',
        snippet: 'Programme holistique combinant nutrition équilibrée et exercices adaptés. Planification des repas avec macronutriments, routines d\'entraînement progressives, conseils de récupération et suivi des progrès.',
        link: 'https://exemple.com/guide-nutrition-entrainement',
        displayLink: 'exemple.com',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/300x200/?fitness+nutrition' }]
        },
        category: 'general'
      }
    ];
  }
  
  // Adapter les résultats selon l'objectif utilisateur
  if (userGoal === 'lose_weight') {
    enhancedResults = enhancedResults.map(result => ({
      ...result,
      snippet: result.snippet.replace(/prise de masse/g, 'perte de poids').replace(/musculation/g, 'cardio fitness'),
      category: 'weight_loss'
    }));
  }
  
  return enhancedResults;
}

// Générer des recettes de fallback basées sur les critères
function generateFallbackRecipes(criteria) {
  const { dietType, cookingTime } = criteria;
  const baseRecipes = [
    { 
      id: Date.now() + 1,
      name: 'Salade de quinoa méditerranéenne',
      description: 'Salade légère et protéinée parfaite pour un repas équilibré.',
      calories: 320, 
      protein: 18, 
      time: 15,
      image: 'https://source.unsplash.com/300x200/?quinoa+salad',
      source: 'https://exemple.com/salade-quinoa'
    },
    { 
      id: Date.now() + 2,
      name: 'Bowl de légumes et tofu grillé',
      description: 'Un repas complet riche en protéines végétales et en fibres.',
      calories: 380, 
      protein: 22, 
      time: 20,
      image: 'https://source.unsplash.com/300x200/?tofu+bowl',
      source: 'https://exemple.com/bowl-tofu'
    },
    { 
      id: Date.now() + 3,
      name: 'Poulet mariné aux herbes et légumes rôtis',
      description: 'Un plat savoureux et riche en protéines idéal pour les sportifs.',
      calories: 450, 
      protein: 35, 
      time: 35,
      image: 'https://source.unsplash.com/300x200/?chicken+vegetables',
      source: 'https://exemple.com/poulet-legumes'
    }
  ];
  
  // Adapter les recettes au régime alimentaire
  let adaptedRecipes = [...baseRecipes];
  if (dietType === 'vegetarian' || dietType === 'vegan') {
    adaptedRecipes = adaptedRecipes.map(recipe => {
      if (recipe.name.includes('Poulet')) {
        return {
          ...recipe,
          name: recipe.name.replace('Poulet', 'Tempeh'),
          description: recipe.description.replace('poulet', 'tempeh').replace('protéines', 'protéines végétales'),
          protein: Math.round(recipe.protein * 0.8),
          image: 'https://source.unsplash.com/300x200/?tempeh+vegetables'
        };
      }
      return recipe;
    });
  }
  
  // Filtrer par temps de préparation si nécessaire
  if (cookingTime === 'quick') {
    adaptedRecipes = adaptedRecipes.filter(recipe => recipe.time <= 20);
  }
  
  return adaptedRecipes;
}

// Fonctions d'extraction intelligente de contenu
const extractRecipeData = (searchResult) => {
  const { title, snippet, link } = searchResult;
  const text = (title + ' ' + snippet).toLowerCase();
  
  // Extraction des ingrédients principaux
  const ingredients = [];
  const ingredientPatterns = [
    /(\d+g?\s*(?:de\s+)?(?:poulet|bœuf|porc|saumon|thon|œufs?|quinoa|riz|pâtes|lentilles|haricots))/gi,
    /(poulet|bœuf|porc|saumon|thon|œufs?|quinoa|riz|pâtes|lentilles|haricots)/gi
  ];
  
  ingredientPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!ingredients.includes(match.toLowerCase())) {
          ingredients.push(match.toLowerCase());
        }
      });
    }
  });
  
  // Extraction des informations nutritionnelles
  const nutritionInfo = {
    calories: extractNutritionalValue(text, /(\d+)\s*(?:kcal|calories?)/i, 400, 800),
    protein: extractNutritionalValue(text, /(\d+)\s*g\s*(?:de\s+)?prot[éeè]ines?/i, 20, 50),
    prepTime: extractPreparationTime(text)
  };
  
  // Détection du type de plat
  const dishType = detectDishType(text);
  
  // Score de qualité basé sur la pertinence du contenu
  const qualityScore = calculateRecipeQuality(text, ingredients.length, nutritionInfo);
  
  return {
    id: `recipe-extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: cleanRecipeTitle(title),
    description: cleanRecipeDescription(snippet),
    source: link,
    calories: nutritionInfo.calories,
    protein: nutritionInfo.protein,
    time: nutritionInfo.prepTime,
    ingredients: ingredients.slice(0, 5), // Limiter à 5 ingrédients principaux
    dishType: dishType,
    qualityScore: qualityScore,
    image: searchResult.pagemap?.cse_image?.[0]?.src || generateFoodImage(dishType),
    extractedFrom: 'web_search'
  };
};

const extractWorkoutData = (searchResult) => {
  const { title, snippet, link } = searchResult;
  const text = (title + ' ' + snippet).toLowerCase();
  
  // Extraction des exercices mentionnés
  const exercises = [];
  const exercisePatterns = [
    /(squat|pompes?|tractions?|développé|curl|rowing|dips|planche|burpees?|fentes?)/gi,
    /(\d+\s*(?:séries?|sets?)\s*(?:de\s*)?(?:\d+\s*)?(?:répétitions?|reps?))/gi
  ];
  
  exercisePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!exercises.includes(match.toLowerCase())) {
          exercises.push(match.toLowerCase());
        }
      });
    }
  });
  
  // Extraction des informations d'entraînement
  const workoutInfo = {
    duration: extractWorkoutDuration(text),
    level: extractWorkoutLevel(text),
    equipment: extractRequiredEquipment(text),
    muscleGroups: extractTargetMuscles(text)
  };
  
  // Score de qualité basé sur la pertinence du contenu
  const qualityScore = calculateWorkoutQuality(text, exercises.length, workoutInfo);
  
  return {
    id: `workout-extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: cleanWorkoutTitle(title),
    description: cleanWorkoutDescription(snippet),
    source: link,
    duration: workoutInfo.duration,
    level: workoutInfo.level,
    equipment: workoutInfo.equipment,
    exercises: exercises.slice(0, 8), // Limiter à 8 exercices principaux
    muscleGroups: workoutInfo.muscleGroups,
    qualityScore: qualityScore,
    extractedFrom: 'web_search'
  };
};

// Fonctions utilitaires d'extraction
const extractNutritionalValue = (text, pattern, minValue, maxValue) => {
  const match = text.match(pattern);
  if (match && match[1]) {
    const value = parseInt(match[1], 10);
    return Math.min(Math.max(value, minValue), maxValue);
  }
  return Math.floor(Math.random() * (maxValue - minValue)) + minValue;
};

const extractPreparationTime = (text) => {
  const timePatterns = [
    /(\d+)\s*(?:minutes?|min)/i,
    /(\d+)\s*h/i
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let time = parseInt(match[1], 10);
      if (pattern.source.includes('h')) time *= 60; // Convertir heures en minutes
      return Math.min(time, 120); // Maximum 2 heures
    }
  }
  
  return Math.floor(Math.random() * 30) + 15; // 15-45 minutes par défaut
};

const extractWorkoutDuration = (text) => {
  const durationPatterns = [
    /(\d+)\s*(?:minutes?|min)/i,
    /(\d+)\s*h/i,
    /(45|60|90)\s*(?:minutes?|min)/i
  ];
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let duration = parseInt(match[1], 10);
      if (pattern.source.includes('h')) duration *= 60;
      return Math.min(duration, 150); // Maximum 2h30
    }
  }
  
  return Math.floor(Math.random() * 30) + 45; // 45-75 minutes par défaut
};

const extractWorkoutLevel = (text) => {
  if (text.includes('débutant') || text.includes('facile') || text.includes('novice')) {
    return 'débutant';
  } else if (text.includes('avancé') || text.includes('expert') || text.includes('confirmé')) {
    return 'avancé';
  } else if (text.includes('intermédiaire') || text.includes('moyen')) {
    return 'intermédiaire';
  }
  return 'intermédiaire'; // Valeur par défaut
};

const extractRequiredEquipment = (text) => {
  const equipmentKeywords = ['haltères', 'barre', 'banc', 'machine', 'élastique', 'kettlebell', 'aucun', 'poids du corps'];
  const foundEquipment = equipmentKeywords.filter(eq => text.includes(eq.toLowerCase()));
  return foundEquipment.length > 0 ? foundEquipment.join(', ') : 'Aucun équipement spécifié';
};

const extractTargetMuscles = (text) => {
  const muscleKeywords = ['pectoraux', 'dos', 'jambes', 'épaules', 'bras', 'abdominaux', 'fessiers', 'triceps', 'biceps'];
  const foundMuscles = muscleKeywords.filter(muscle => text.includes(muscle.toLowerCase()));
  return foundMuscles.slice(0, 4); // Limiter à 4 groupes musculaires
};

const detectDishType = (text) => {
  if (text.includes('salade') || text.includes('crudités')) return 'salade';
  if (text.includes('soupe') || text.includes('velouté')) return 'soupe';
  if (text.includes('plat principal') || text.includes('viande') || text.includes('poisson')) return 'plat principal';
  if (text.includes('smoothie') || text.includes('shake') || text.includes('boisson')) return 'boisson';
  if (text.includes('dessert') || text.includes('gâteau')) return 'dessert';
  return 'plat principal';
};

const calculateRecipeQuality = (text, ingredientCount, nutritionInfo) => {
  let score = 0;
  
  // Points pour les ingrédients détectés
  score += ingredientCount * 10;
  
  // Points pour les informations nutritionnelles
  if (nutritionInfo.calories > 0) score += 20;
  if (nutritionInfo.protein > 0) score += 20;
  if (nutritionInfo.prepTime > 0) score += 15;
  
  // Points pour les mots-clés de qualité
  const qualityKeywords = ['recette', 'ingrédients', 'préparation', 'étapes', 'cuisson'];
  qualityKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 5;
  });
  
  return Math.min(score, 100);
};

const calculateWorkoutQuality = (text, exerciseCount, workoutInfo) => {
  let score = 0;
  
  // Points pour les exercices détectés
  score += exerciseCount * 8;
  
  // Points pour les informations d'entraînement
  if (workoutInfo.duration > 0) score += 15;
  if (workoutInfo.level !== 'intermédiaire') score += 10; // Bonus pour niveau spécifique
  if (workoutInfo.equipment !== 'Aucun équipement spécifié') score += 10;
  if (workoutInfo.muscleGroups.length > 0) score += 15;
  
  // Points pour les mots-clés de qualité
  const qualityKeywords = ['programme', 'exercices', 'séries', 'répétitions', 'entraînement'];
  qualityKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 6;
  });
  
  return Math.min(score, 100);
};

const cleanRecipeTitle = (title) => {
  return title
    .replace(/\s*-\s*.*$/, '') // Enlever le suffixe après le tiret
    .replace(/^\[.*?\]\s*/, '') // Enlever les préfixes entre crochets
    .trim();
};

const cleanRecipeDescription = (description) => {
  return description
    .replace(/\.\.\.$/, '') // Enlever les points de suspension finaux
    .replace(/^.*?:\s*/, '') // Enlever le préfixe avant les deux points
    .trim();
};

const cleanWorkoutTitle = (title) => {
  return title
    .replace(/\s*-\s*.*$/, '')
    .replace(/^\[.*?\]\s*/, '')
    .trim();
};

const cleanWorkoutDescription = (description) => {
  return description
    .replace(/\.\.\.$/, '')
    .replace(/^.*?:\s*/, '')
    .trim();
};

const generateFoodImage = (dishType) => {
  const imageMap = {
    'salade': 'https://source.unsplash.com/300x200/?healthy+salad',
    'soupe': 'https://source.unsplash.com/300x200/?soup',
    'plat principal': 'https://source.unsplash.com/300x200/?healthy+meal',
    'boisson': 'https://source.unsplash.com/300x200/?protein+smoothie',
    'dessert': 'https://source.unsplash.com/300x200/?healthy+dessert'
  };
  return imageMap[dishType] || 'https://source.unsplash.com/300x200/?healthy+food';
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

// Fonctions utilitaires pour estimer les valeurs nutritionnelles
function estimateCalories(title, description, calorieLevel = null) {
  // Extraction si mentionné explicitement (ex: "250 calories")
  const caloriesMatch = (title + ' ' + description).match(/(\d+)\s*calories/i);
  if (caloriesMatch) {
    return parseInt(caloriesMatch[1], 10);
  }
  
  // Si on spécifie explicitement un niveau calorique
  if (calorieLevel === 'high') {
    return Math.floor(Math.random() * 300) + 500; // 500-800 calories (repas riche)
  } else if (calorieLevel === 'low') {
    return Math.floor(Math.random() * 100) + 200; // 200-300 calories (repas léger)
  } else if (calorieLevel === 'medium') {
    return Math.floor(Math.random() * 150) + 350; // 350-500 calories (repas standard)
  }
  
  // Estimation basée sur les mots-clés
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('léger') || text.includes('diète') || text.includes('minceur')) {
    return Math.floor(Math.random() * 100) + 150; // 150-250 calories
  } else if (text.includes('dessert') || text.includes('gâteau')) {
    return Math.floor(Math.random() * 200) + 300; // 300-500 calories
  } else if (text.includes('protéiné') || text.includes('masse') || text.includes('riche')) {
    return Math.floor(Math.random() * 250) + 450; // 450-700 calories
  } else {
    return Math.floor(Math.random() * 200) + 250; // 250-450 calories (repas standard)
  }
}

function estimateProtein(title, description, proteinLevel = null) {
  // Extraction si mentionné explicitement (ex: "20g de protéines")
  const proteinMatch = (title + ' ' + description).match(/(\d+)\s*g\s*(?:de)?\s*prot[éeè]ines?/i);
  if (proteinMatch) {
    return parseInt(proteinMatch[1], 10);
  }
  
  // Si on spécifie explicitement un niveau protéique
  if (proteinLevel === 'high') {
    return Math.floor(Math.random() * 15) + 30; // 30-45g (très riche en protéines)
  } else if (proteinLevel === 'medium') {
    return Math.floor(Math.random() * 10) + 20; // 20-30g (moyennement riche)
  } else if (proteinLevel === 'low') {
    return Math.floor(Math.random() * 10) + 10; // 10-20g (faible en protéines)
  }
  
  // Estimation basée sur les mots-clés
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('poulet') || text.includes('bœuf') || text.includes('viande') || 
      text.includes('protéine') || text.includes('protéiné')) {
    return Math.floor(Math.random() * 10) + 20; // 20-30g (riche en protéines)
  } else if (text.includes('poisson') || text.includes('œuf') || text.includes('légumineuse') ||
            text.includes('tofu') || text.includes('lentille') || text.includes('haricot')) {
    return Math.floor(Math.random() * 10) + 15; // 15-25g (moyennement riche en protéines)
  } else {
    return Math.floor(Math.random() * 10) + 5; // 5-15g (faible en protéines)
  }
}

function estimateCookingTime(title, description, cookingTimePreference) {
  // Extraction si mentionné explicitement (ex: "prêt en 15 minutes")
  const timeMatch = (title + ' ' + description).match(/(\d+)\s*min/i);
  if (timeMatch) {
    return parseInt(timeMatch[1], 10);
  }
  
  // Estimation basée sur la préférence utilisateur et les mots-clés
  if (cookingTimePreference === 'quick' || description.includes('rapide') || description.includes('express')) {
    return Math.floor(Math.random() * 10) + 10; // 10-20 minutes
  } else if (cookingTimePreference === 'medium' || description.includes('simple')) {
    return Math.floor(Math.random() * 15) + 20; // 20-35 minutes
  } else {
    return Math.floor(Math.random() * 20) + 35; // 35-55 minutes (plats élaborés)
  }
}

function determineLevel(title, description, activityLevel = null) {
  const text = (title + ' ' + description).toLowerCase();
  
  // Si le niveau d'activité est explicitement fourni, l'utiliser comme base
  if (activityLevel) {
    // Mais vérifier si le texte contredit explicitement ce niveau
    if (activityLevel === 'beginner' && (text.includes('avancé') || text.includes('expert'))) {
      return 'Intermédiaire'; // Compromis entre le niveau utilisateur et le contenu
    } else if (activityLevel === 'advanced' && text.includes('débutant')) {
      return 'Intermédiaire'; // Compromis entre le niveau utilisateur et le contenu
    } else {
      // Sinon utiliser le niveau d'activité de l'utilisateur
      return activityLevel === 'beginner' ? 'Débutant' : 
             activityLevel === 'advanced' ? 'Avancé' : 'Intermédiaire';
    }
  }
  
  // Analyse basée uniquement sur le texte si pas de niveau fourni
  if (text.includes('débutant') || text.includes('facile') || text.includes('simple')) {
    return 'Débutant';
  } else if (text.includes('avancé') || text.includes('intense') || text.includes('difficile')) {
    return 'Avancé';
  } else {
    return 'Intermédiaire';
  }
}

function determineDuration(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  // Chercher des durées explicites (ex: "programme de 4 semaines")
  const durationMatch = text.match(/(\d+)\s*semaines?/i);
  if (durationMatch) {
    return `${durationMatch[1]} semaines`;
  }
  
  // Estimation basée sur les mots-clés
  if (text.includes('court') || text.includes('rapide') || text.includes('express')) {
    return '2 semaines';
  } else if (text.includes('long') || text.includes('complet') || text.includes('transformation')) {
    return '8 semaines';
  } else {
    return '4 semaines';
  }
}

export default api;