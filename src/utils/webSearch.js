/**
 * Service amélioré pour la recherche web
 */

// Fonction optimisée pour la recherche web simulée
export const performWebSearch = async (query) => {
  console.log(`🔍 Recherche web optimisée: "${query}"`);
  
  try {
    // Enregistrement du temps de début pour calculer le temps total de recherche
    const startTime = Date.now();
    
    // Simulation d'un temps de réponse variable selon la complexité de la requête
    // Les requêtes plus longues prennent un peu plus de temps
    const baseDelay = 1200; // délai de base en ms
    const variableDelay = Math.min(query.length * 10, 800); // délai supplémentaire basé sur la longueur
    
    await new Promise(resolve => setTimeout(resolve, baseDelay + variableDelay));
    
    // Calcul du temps de recherche total
    const searchTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return { 
      query, 
      timestamp: new Date().toISOString(), 
      resultsFound: true,
      estimatedResults: Math.floor(Math.random() * 50000) + 10000,
      searchTime,
      source: 'web_search_service'
    };
  } catch (error) {
    console.error('Erreur lors de la recherche web:', error);
    return {
      query,
      timestamp: new Date().toISOString(),
      resultsFound: false,
      error: error.message,
      source: 'web_search_service'
    };
  }
};

// Fonction pour construire une requête de recherche de recettes optimisée
export const buildRecipeSearchQuery = (userProfile, nutritionProfile) => {
  const dietMap = {
    'omnivore': '',
    'vegetarian': 'végétariennes',
    'vegan': 'vegan'
  };

  const goalMap = {
    'lose_weight': 'minceur faibles calories',
    'gain_muscle': 'riches protéines musculation',
    'maintain': 'équilibrées healthy'
  };

  const timeMap = {
    'quick': '15 minutes rapide',
    'medium': '30 minutes',
    'long': ''
  };

  return `recettes ${goalMap[userProfile.goal] || ''} ${dietMap[nutritionProfile.dietType] || ''} ${timeMap[nutritionProfile.cookingTime] || ''} site:marmiton.org OR site:750g.com`;
};

// Fonction pour construire une requête de recherche d'entraînement optimisée
export const buildWorkoutSearchQuery = (userProfile, equipmentProfile) => {
  const locationMap = {
    'home': 'musculation maison',
    'gym': 'musculation salle de sport',
    'both': 'programme hybride maison salle'
  };

  const goalMap = {
    'lose_weight': 'perte de poids cardio',
    'gain_muscle': 'prise de masse hypertrophie',
    'maintain': 'fitness entretien'
  };

  const levelMap = {
    'sedentary': 'débutant',
    'light': 'débutant',
    'moderate': 'intermédiaire',
    'active': 'avancé',
    'very_active': 'expert'
  };

  const equipment = Array.isArray(equipmentProfile.homeEquipment) 
    ? equipmentProfile.homeEquipment.join(' ') 
    : '';
    
  return `programme ${locationMap[equipmentProfile.location] || ''} ${goalMap[userProfile.goal] || ''} ${levelMap[userProfile.activityLevel] || ''} ${equipment} site:all-musculation.com OR site:musculation.com`;
}; 