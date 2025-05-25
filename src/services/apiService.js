import { searchService } from './searchService';

// Amélioration du service de recherche de programmes fitness
export const fitnessService = {
  // Recherche intelligente de programmes fitness
  searchWorkoutPrograms: async (userProfile, additionalQuery = '') => {
    try {
      // Générer une requête optimisée basée sur le profil utilisateur
      const optimizedQuery = searchService.generateOptimizedQuery(userProfile, 'fitness');
      const fullQuery = additionalQuery ? `${optimizedQuery} ${additionalQuery}` : optimizedQuery;
      
      console.log('Requête optimisée fitness:', fullQuery);
      
      // Effectuer la recherche avec l'API existante
      const rawResults = await searchWorkoutPrograms(fullQuery);
      
      // Filtrer et classer les résultats par pertinence
      const intelligentResults = searchService.filterAndRankResults(rawResults, 'fitness');
      
      // Formater pour l'affichage
      const formattedResults = searchService.formatResultsForDisplay(intelligentResults, 'fitness');
      
      console.log(`Résultats fitness filtrés: ${formattedResults.length}/${rawResults.length}`);
      
      return {
        results: formattedResults,
        totalFound: rawResults.length,
        relevantCount: formattedResults.length,
        query: fullQuery
      };
      
    } catch (error) {
      console.error('Erreur recherche intelligente fitness:', error);
      throw error;
    }
  },

  // Recherche de programmes par objectif spécifique
  searchByGoal: async (userProfile, specificGoal) => {
    const goalQueries = {
      'lose_weight': 'perte de poids cardio brûler calories',
      'gain_muscle': 'prise de masse musculation force',
      'tone_up': 'tonification renforcement musculaire',
      'endurance': 'endurance cardio résistance',
      'flexibility': 'étirement souplesse yoga'
    };
    
    const goalQuery = goalQueries[specificGoal] || specificGoal;
    return await this.searchWorkoutPrograms(userProfile, goalQuery);
  }
};

// Amélioration du service de recherche de nutrition
export const nutritionService = {
  // Recherche intelligente de recettes
  searchRecipes: async (userProfile, additionalQuery = '') => {
    try {
      // Générer une requête optimisée basée sur le profil nutritionnel
      const optimizedQuery = searchService.generateOptimizedQuery(userProfile, 'nutrition');
      const fullQuery = additionalQuery ? `${optimizedQuery} ${additionalQuery}` : optimizedQuery;
      
      console.log('Requête optimisée nutrition:', fullQuery);
      
      // Effectuer la recherche avec l'API existante
      const rawResults = await searchMealPlans(fullQuery);
      
      // Filtrer et classer les résultats par pertinence
      const intelligentResults = searchService.filterAndRankResults(rawResults, 'nutrition');
      
      // Formater pour l'affichage
      const formattedResults = searchService.formatResultsForDisplay(intelligentResults, 'nutrition');
      
      console.log(`Résultats nutrition filtrés: ${formattedResults.length}/${rawResults.length}`);
      
      return {
        results: formattedResults,
        totalFound: rawResults.length,
        relevantCount: formattedResults.length,
        query: fullQuery
      };
      
    } catch (error) {
      console.error('Erreur recherche intelligente nutrition:', error);
      throw error;
    }
  },

  // Recherche par type de repas
  searchByMealType: async (userProfile, mealType) => {
    const mealQueries = {
      'breakfast': 'petit-déjeuner healthy équilibré',
      'lunch': 'déjeuner rapide sain',
      'dinner': 'dîner léger équilibré',
      'snack': 'collation healthy protéinée'
    };
    
    const mealQuery = mealQueries[mealType] || mealType;
    return await this.searchRecipes(userProfile, mealQuery);
  },

  // Recherche par restrictions alimentaires
  searchByRestrictions: async (userProfile, restrictions) => {
    const restrictionQuery = restrictions.map(r => `sans ${r}`).join(' ');
    return await this.searchRecipes(userProfile, restrictionQuery);
  }
};

// Service de validation des profils pour améliorer la recherche
export const profileValidationService = {
  // Valider que le profil est suffisant pour une recherche efficace
  validateProfileForSearch: (userProfile, searchType = 'fitness') => {
    const issues = [];
    const suggestions = [];

    if (searchType === 'fitness') {
      if (!userProfile.goal) {
        issues.push('Objectif fitness non défini');
        suggestions.push('Définissez votre objectif principal (perte de poids, prise de masse, etc.)');
      }
      
      if (!userProfile.activityLevel) {
        issues.push('Niveau d\'activité non défini');
        suggestions.push('Indiquez votre niveau d\'activité actuel');
      }
      
      if (!userProfile.equipmentProfile?.location) {
        issues.push('Lieu d\'entraînement non défini');
        suggestions.push('Précisez si vous vous entraînez à la maison ou en salle');
      }
      
    } else if (searchType === 'nutrition') {
      if (!userProfile.nutritionProfile?.dietType) {
        issues.push('Type de régime non défini');
        suggestions.push('Indiquez votre approche nutritionnelle (équilibré, végétarien, etc.)');
      }
      
      if (!userProfile.nutritionProfile?.cookingTime) {
        issues.push('Temps de cuisine non défini');
        suggestions.push('Précisez le temps que vous pouvez consacrer à la cuisine');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
      completionRate: Math.round((1 - issues.length / 4) * 100)
    };
  },

  // Générer des suggestions d'amélioration du profil
  generateProfileSuggestions: (userProfile) => {
    const suggestions = [];
    
    // Suggestions générales
    if (!userProfile.goal) {
      suggestions.push({
        type: 'critical',
        title: 'Définissez votre objectif principal',
        description: 'Cela nous aidera à vous proposer des programmes adaptés',
        action: 'Aller au profil'
      });
    }
    
    // Suggestions équipement
    if (userProfile.equipmentProfile?.location === 'home' && 
        (!userProfile.equipmentProfile.homeEquipment || userProfile.equipmentProfile.homeEquipment.length === 0)) {
      suggestions.push({
        type: 'info',
        title: 'Précisez votre équipement à domicile',
        description: 'Même sans équipement, nous pouvons vous proposer des exercices au poids du corps',
        action: 'Configurer équipement'
      });
    }
    
    // Suggestions nutrition
    if (!userProfile.nutritionProfile?.allergies || userProfile.nutritionProfile.allergies.length === 0) {
      suggestions.push({
        type: 'info',
        title: 'Mentionnez vos allergies alimentaires',
        description: 'Pour éviter les recettes contenant des ingrédients problématiques',
        action: 'Configurer nutrition'
      });
    }
    
    return suggestions;
  }
};