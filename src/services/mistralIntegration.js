import { mistralService } from './mistralService';

/**
 * Service d'intégration Mistral qui remplace la recherche web
 * Compatible avec l'interface existante de webSearchService
 */

// Fonction utilitaire pour vérifier si l'utilisateur a un profil complet
const isUserProfileComplete = () => {
  try {
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (!authToken || !userData) {
      return false;
    }

    const userProfile = localStorage.getItem('userProfile');
    if (!userProfile) {
      return false;
    }
    
    const profile = JSON.parse(userProfile);
    const isComplete = profile && 
           profile.height && 
           profile.weight && 
           profile.age && 
           profile.goal && 
           profile.activityLevel;
           
    return isComplete;
  } catch (error) {
    console.error('Erreur vérification profil:', error);
    return false;
  }
};

/**
 * Service Mistral qui remplace webSearchService avec la même interface
 */
export const mistralSearchService = {
  /**
   * Remplacement de searchGoogle - génère du contenu au lieu de chercher
   */
  searchGoogle: async (query, userGoal = null) => {
    console.log(`🤖 Génération Mistral pour: "${query}" (objectif: ${userGoal})`);
    
    try {
      // Récupérer le profil utilisateur
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      
      // Déterminer le type de contenu à générer basé sur la query
      if (query.toLowerCase().includes('recette') || 
          query.toLowerCase().includes('nutrition') || 
          query.toLowerCase().includes('protéine')) {
        
        const nutritionPlan = await mistralService.generateNutritionPlans(userProfile, query);
        return this.formatNutritionAsSearchResults(nutritionPlan);
        
      } else if (query.toLowerCase().includes('programme') || 
                 query.toLowerCase().includes('musculation') || 
                 query.toLowerCase().includes('entraînement')) {
        
        const programs = await mistralService.generateWorkoutPrograms(userProfile, query);
        return this.formatWorkoutsAsSearchResults(programs);
        
      } else {
        // Génération générale basée sur l'objectif
        if (userGoal === 'gain_muscle' || userGoal === 'lose_weight') {
          const programs = await mistralService.generateWorkoutPrograms(userProfile, query);
          return this.formatWorkoutsAsSearchResults(programs);
        } else {
          const nutritionPlan = await mistralService.generateNutritionPlans(userProfile, query);
          return this.formatNutritionAsSearchResults(nutritionPlan);
        }
      }
    } catch (error) {
      console.error('Erreur génération Mistral:', error);
      return this.getFallbackSearchResults(query, userGoal);
    }
  },

  /**
   * Remplacement de searchMassGainRecipes
   */
  searchMassGainRecipes: async () => {
    if (!isUserProfileComplete()) {
      console.warn('Profil utilisateur incomplet');
      return {
        error: 'PROFILE_INCOMPLETE',
        message: 'Veuillez compléter votre profil pour accéder aux recettes personnalisées'
      };
    }
    
    try {
      console.log('🥗 Génération de recettes prise de masse avec Mistral');
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const recipes = await mistralService.generateMassGainRecipes(userProfile);
      
      // Adapter le format pour correspondre à l'API existante
      return recipes.map(recipe => ({
        ...recipe,
        webSearched: false,
        extractedFrom: 'mistral_ai',
        targetCalories: Math.round((recipe.calories || 600) / 4) // Calories par repas
      }));
      
    } catch (error) {
      console.error('Erreur génération recettes prise de masse:', error);
      return mistralService.getFallbackMassGainRecipes();
    }
  },

  /**
   * Remplacement de searchWorkoutPrograms
   */
  searchWorkoutPrograms: async (criteria) => {
    if (!isUserProfileComplete()) {
      console.warn('Profil utilisateur incomplet');
      return {
        error: 'PROFILE_INCOMPLETE',
        message: 'Veuillez compléter votre profil pour accéder aux programmes personnalisés'
      };
    }

    try {
      console.log('💪 Génération de programmes d\'entraînement avec Mistral');
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      
      // Construire une query basée sur les critères
      let query = '';
      if (criteria.location === 'home') query += 'à domicile ';
      if (criteria.location === 'gym') query += 'en salle ';
      if (criteria.equipment?.length > 0) query += `avec ${criteria.equipment.join(' ')} `;
      
      const programs = await mistralService.generateWorkoutPrograms(userProfile, query);
      
      // Adapter le format pour correspondre à l'API existante
      return programs.map(program => ({
        id: program.id,
        title: program.title,
        description: program.description,
        level: program.level,
        duration: program.duration,
        equipment: criteria.equipment?.length > 0 ? criteria.equipment.join(', ') : 'Aucun',
        source: 'Mistral AI',
        thumbnail: program.thumbnail || `https://source.unsplash.com/400x300/?fitness+${criteria.location || 'workout'}`,
        workouts: program.workouts || [],
        goal: userProfile.goal,
        aiGenerated: true
      }));
      
    } catch (error) {
      console.error('Erreur génération programmes:', error);
      return [{
        id: `fallback-program-${Date.now()}`,
        title: `Programme ${criteria.location === 'home' ? 'à domicile' : 'en salle'}`,
        description: 'Programme personnalisé généré automatiquement.',
        level: 'Intermédiaire',
        duration: '4 semaines',
        equipment: criteria.equipment?.length > 0 ? criteria.equipment.join(', ') : 'Aucun',
        source: 'Fallback',
        thumbnail: `https://source.unsplash.com/400x300/?fitness+${criteria.location || 'workout'}`,
        workouts: []
      }];
    }
  },

  /**
   * Remplacement de searchNutritionPlans
   */
  searchNutritionPlans: async (criteria) => {
    if (!isUserProfileComplete()) {
      console.warn('Profil utilisateur incomplet');
      return {
        error: 'PROFILE_INCOMPLETE',
        message: 'Veuillez compléter votre profil pour accéder aux plans nutritionnels personnalisés'
      };
    }
    
    try {
      console.log('🍽️ Génération de plans nutritionnels avec Mistral');
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      
      // Construire une query basée sur les critères
      let query = '';
      if (criteria.dietType) query += `régime ${criteria.dietType} `;
      if (criteria.cookingTime === 'quick') query += 'préparation rapide ';
      if (criteria.allergies?.length > 0) query += `sans ${criteria.allergies.join(' sans ')} `;
      
      const nutritionPlan = await mistralService.generateNutritionPlans(userProfile, query);
      
      // Adapter le format pour correspondre à l'API existante
      return {
        id: nutritionPlan.id,
        title: nutritionPlan.title,
        dietType: criteria.dietType,
        source: 'Mistral AI',
        calorieTarget: nutritionPlan.calorieTarget,
        goal: userProfile.goal,
        recipes: nutritionPlan.recipes?.map(recipe => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          source: 'Mistral AI',
          calories: recipe.calories,
          protein: recipe.protein,
          time: recipe.time,
          image: recipe.image,
          aiGenerated: true
        })) || []
      };
      
    } catch (error) {
      console.error('Erreur génération plans nutritionnels:', error);
      return {
        id: `fallback-nutrition-${Date.now()}`,
        title: `Plan nutritionnel ${criteria.dietType || 'personnalisé'}`,
        dietType: criteria.dietType,
        source: 'Fallback',
        recipes: mistralService.getFallbackNutritionPlans({}).recipes
      };
    }
  },

  /**
   * Formater les résultats nutrition comme des résultats de recherche
   */
  formatNutritionAsSearchResults(nutritionPlan) {
    if (!nutritionPlan.recipes) return [];
    
    return nutritionPlan.recipes.map(recipe => ({
      title: recipe.name,
      snippet: recipe.description,
      link: `#recipe-${recipe.id}`,
      displayLink: 'mistral.ai',
      pagemap: {
        cse_image: [{ src: recipe.image }]
      },
      calories: recipe.calories,
      protein: recipe.protein,
      time: recipe.time,
      aiGenerated: true,
      source: 'Mistral AI'
    }));
  },

  /**
   * Formater les programmes comme des résultats de recherche
   */
  formatWorkoutsAsSearchResults(programs) {
    return programs.map(program => ({
      title: program.title,
      snippet: program.description,
      link: `#program-${program.id}`,
      displayLink: 'mistral.ai',
      pagemap: {
        cse_image: [{ src: program.thumbnail }]
      },
      level: program.level,
      duration: program.duration,
      equipment: program.equipment,
      aiGenerated: true,
      source: 'Mistral AI'
    }));
  },

  /**
   * Résultats de fallback en cas d'erreur
   */
  getFallbackSearchResults(query, userGoal) {
    console.log('🔄 Utilisation des résultats de fallback');
    
    const baseResults = [
      {
        title: 'Programme personnalisé généré automatiquement',
        snippet: 'Programme adapté à votre profil et vos objectifs.',
        link: '#generated-program',
        displayLink: 'fitness-app.local',
        pagemap: {
          cse_image: [{ src: 'https://source.unsplash.com/400x300/?fitness' }]
        },
        aiGenerated: false,
        source: 'Fallback'
      }
    ];
    
    return baseResults;
  }
};

/**
 * Service amélioré qui combine recherche Mistral avec fonctionnalités avancées
 */
export const enhancedMistralService = {
  /**
   * Génération de contenu par objectif spécifique
   */
  generateByGoal: async (goal, userProfile) => {
    const goalPrompts = {
      'lose_weight': 'programmes cardio et nutrition hypocalorique',
      'gain_muscle': 'programmes musculation et nutrition hyperprotéinée',
      'tone_up': 'programmes tonification et nutrition équilibrée',
      'endurance': 'programmes cardio endurance et nutrition énergétique',
      'flexibility': 'programmes étirement yoga et nutrition anti-inflammatoire'
    };
    
    const prompt = goalPrompts[goal] || 'programmes fitness équilibrés';
    
    try {
      const [programs, nutrition] = await Promise.all([
        mistralService.generateWorkoutPrograms(userProfile, prompt),
        mistralService.generateNutritionPlans(userProfile, prompt)
      ]);
      
      return {
        programs,
        nutrition,
        goal,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erreur génération par objectif:', error);
      throw error;
    }
  },

  /**
   * Génération de contenu adaptatif basé sur les progrès
   */
  generateProgressiveContent: async (userProfile, currentWeek = 1) => {
    const progressPrompt = `semaine ${currentWeek}, progression adaptée au niveau`;
    
    try {
      const programs = await mistralService.generateWorkoutPrograms(userProfile, progressPrompt);
      return programs.map(program => ({
        ...program,
        week: currentWeek,
        progressive: true
      }));
    } catch (error) {
      console.error('Erreur génération progressive:', error);
      throw error;
    }
  },

  /**
   * Génération de plans repas pour la semaine
   */
  generateWeeklyMealPlan: async (userProfile, preferences = {}) => {
    const mealPrompt = `plan repas semaine complète ${preferences.focus || ''}`;
    
    try {
      const nutritionPlan = await mistralService.generateNutritionPlans(userProfile, mealPrompt);
      
      // Organiser les recettes par jour et par repas
      const weeklyPlan = this.organizeRecipesByWeek(nutritionPlan.recipes || []);
      
      return {
        ...nutritionPlan,
        weeklyPlan,
        organized: true
      };
    } catch (error) {
      console.error('Erreur génération plan hebdomadaire:', error);
      throw error;
    }
  },

  /**
   * Organiser les recettes par semaine
   */
  organizeRecipesByWeek(recipes) {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const meals = ['petit-dejeuner', 'dejeuner', 'collation', 'diner'];
    
    const weekPlan = {};
    
    days.forEach((day, dayIndex) => {
      weekPlan[day] = {};
      meals.forEach((meal, mealIndex) => {
        const recipeIndex = (dayIndex * meals.length + mealIndex) % recipes.length;
        weekPlan[day][meal] = recipes[recipeIndex] || null;
      });
    });
    
    return weekPlan;
  }
};

export default mistralSearchService;