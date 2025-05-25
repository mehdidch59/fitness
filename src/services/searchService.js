import { searchService as baseSearchService } from '../api/searchApi';

/**
 * Service de recherche avancé avec extraction automatique d'informations
 */
export const advancedSearchService = {
  /**
   * Recherche de programmes de musculation avec extraction automatique
   */
  searchWorkoutPrograms: async (searchTerm, userGoal, fitnessLevel, equipment) => {
    try {
      // Construire une requête optimisée
      const enhancedQuery = buildWorkoutQuery(searchTerm, userGoal, fitnessLevel, equipment);
      
      // Effectuer la recherche
      const rawResults = await baseSearchService.searchPrograms(enhancedQuery);
      
      // Extraire et structurer les informations importantes
      const processedResults = rawResults.map(result => 
        extractWorkoutInformation(result)
      ).filter(result => result.quality >= 0.6); // Filtrer les résultats de bonne qualité
      
      return processedResults.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      console.error('Erreur lors de la recherche de programmes de musculation:', error);
      throw error;
    }
  },

  /**
   * Recherche de programmes nutritionnels avec extraction automatique
   */
  searchNutritionPrograms: async (searchTerm, dietType, cookingTime, allergies, goal) => {
    try {
      // Construire une requête optimisée pour la nutrition
      const enhancedQuery = buildNutritionQuery(searchTerm, dietType, cookingTime, allergies, goal);
      
      // Effectuer la recherche
      const rawResults = await baseSearchService.searchNutrition(enhancedQuery);
      
      // Extraire et structurer les recettes et plans nutritionnels
      const processedResults = rawResults.map(result => 
        extractNutritionInformation(result)
      ).filter(result => result.quality >= 0.6);
      
      return processedResults.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      console.error('Erreur lors de la recherche de programmes nutritionnels:', error);
      throw error;
    }
  }
};

/**
 * Construction de requête optimisée pour les programmes de musculation
 */
function buildWorkoutQuery(searchTerm, userGoal, fitnessLevel, equipment) {
  const keywords = [
    searchTerm,
    userGoal && `objectif ${userGoal}`,
    fitnessLevel && `niveau ${fitnessLevel}`,
    equipment && equipment.length > 0 ? `équipement ${equipment.join(' ')}` : 'sans équipement',
    'programme musculation',
    'exercices détaillés',
    'séries répétitions',
    'technique exécution'
  ].filter(Boolean);
  
  return keywords.join(' ');
}

/**
 * Construction de requête optimisée pour les programmes nutritionnels
 */
function buildNutritionQuery(searchTerm, dietType, cookingTime, allergies, goal) {
  const keywords = [
    searchTerm,
    dietType && `régime ${dietType}`,
    cookingTime && `préparation ${cookingTime} minutes`,
    goal && `objectif ${goal}`,
    allergies && allergies.length > 0 ? `sans ${allergies.join(' sans ')}` : '',
    'recette détaillée',
    'ingrédients quantités',
    'valeurs nutritionnelles',
    'étapes préparation'
  ].filter(Boolean);
  
  return keywords.join(' ');
}

/**
 * Extraction des informations importantes d'un programme de musculation
 */
function extractWorkoutInformation(rawResult) {
  const text = rawResult.content || rawResult.snippet || '';
  
  // Patterns pour identifier les éléments importants
  const patterns = {
    exercises: /(?:exercice|mouvement)s?\s*:?\s*([^\n]+)/gi,
    sets: /(\d+)\s*(?:série|set)s?/gi,
    reps: /(\d+)(?:-(\d+))?\s*(?:répétition|rep)s?/gi,
    rest: /(?:repos|pause)\s*:?\s*(\d+(?:\s*min)?)/gi,
    technique: /(?:technique|exécution|position)\s*:?\s*([^\n.]+)/gi,
    duration: /(?:durée|temps)\s*:?\s*(\d+\s*(?:min|minute)s?)/gi,
    intensity: /(?:intensité|difficulté)\s*:?\s*([^\n.]+)/gi
  };

  const extracted = {
    title: rawResult.title || extractTitle(text),
    exercises: extractMatches(text, patterns.exercises),
    sets: extractMatches(text, patterns.sets),
    reps: extractMatches(text, patterns.reps),
    restTime: extractMatches(text, patterns.rest),
    technique: extractMatches(text, patterns.technique),
    duration: extractMatches(text, patterns.duration),
    intensity: extractMatches(text, patterns.intensity),
    fullContent: text,
    source: rawResult.url || rawResult.source,
    quality: calculateWorkoutQuality(text),
    relevance: calculateRelevance(text, ['musculation', 'exercice', 'programme', 'entraînement'])
  };

  return extracted;
}

/**
 * Extraction des informations importantes d'un programme nutritionnel
 */
function extractNutritionInformation(rawResult) {
  const text = rawResult.content || rawResult.snippet || '';
  
  // Patterns pour identifier les éléments nutritionnels importants
  const patterns = {
    ingredients: /(?:ingrédient|composant)s?\s*:?\s*([^\n]+)/gi,
    quantities: /(\d+(?:[.,]\d+)?)\s*(?:g|ml|cl|l|cuillère|tasse|portion)s?/gi,
    steps: /(?:étape|step)\s*\d+\s*:?\s*([^\n]+)/gi,
    cookingTime: /(?:cuisson|préparation)\s*:?\s*(\d+\s*(?:min|minute|h|heure)s?)/gi,
    calories: /(\d+)\s*(?:kcal|calorie)s?/gi,
    proteins: /(?:protéine|protein)s?\s*:?\s*(\d+(?:[.,]\d+)?)\s*g/gi,
    carbs: /(?:glucide|carb)s?\s*:?\s*(\d+(?:[.,]\d+)?)\s*g/gi,
    fats: /(?:lipide|graisse|fat)s?\s*:?\s*(\d+(?:[.,]\d+)?)\s*g/gi,
    servings: /(?:portion|part)s?\s*:?\s*(\d+)/gi
  };

  const extracted = {
    title: rawResult.title || extractTitle(text),
    ingredients: extractMatches(text, patterns.ingredients),
    quantities: extractMatches(text, patterns.quantities),
    steps: extractMatches(text, patterns.steps),
    cookingTime: extractMatches(text, patterns.cookingTime),
    nutritionalValues: {
      calories: extractMatches(text, patterns.calories),
      proteins: extractMatches(text, patterns.proteins),
      carbs: extractMatches(text, patterns.carbs),
      fats: extractMatches(text, patterns.fats)
    },
    servings: extractMatches(text, patterns.servings),
    fullContent: text,
    source: rawResult.url || rawResult.source,
    quality: calculateNutritionQuality(text),
    relevance: calculateRelevance(text, ['recette', 'nutrition', 'ingrédient', 'cuisson'])
  };

  return extracted;
}

/**
 * Utilitaires d'extraction
 */
function extractMatches(text, pattern) {
  const matches = [];
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    matches.push(match[1] || match[0]);
  }
  
  return matches.length > 0 ? matches : null;
}

function extractTitle(text) {
  // Essayer d'extraire un titre depuis les premières lignes
  const lines = text.split('\n');
  const firstLine = lines[0]?.trim();
  
  if (firstLine && firstLine.length < 100) {
    return firstLine;
  }
  
  // Sinon, prendre les premiers mots
  return text.substring(0, 80).trim() + '...';
}

function calculateWorkoutQuality(text) {
  const qualityIndicators = [
    /\d+\s*(?:série|set)s?/i,        // Mentions de séries
    /\d+\s*(?:répétition|rep)s?/i,   // Mentions de répétitions
    /(?:technique|exécution)/i,       // Descriptions techniques
    /(?:repos|pause)/i,               // Temps de repos
    /(?:exercice|mouvement)/i,        // Noms d'exercices
    /(?:muscle|musculation)/i         // Contexte musculation
  ];
  
  const score = qualityIndicators.reduce((score, pattern) => {
    return score + (pattern.test(text) ? 1 : 0);
  }, 0);
  
  return score / qualityIndicators.length;
}

function calculateNutritionQuality(text) {
  const qualityIndicators = [
    /(?:ingrédient|composant)s?/i,    // Listes d'ingrédients
    /\d+\s*(?:g|ml|cl|l)/i,          // Quantités précises
    /(?:étape|step)\s*\d+/i,          // Étapes numérotées
    /(?:cuisson|préparation)/i,        // Temps de préparation
    /\d+\s*(?:kcal|calorie)s?/i,     // Valeurs caloriques
    /(?:recette|cuisine)/i            // Contexte culinaire
  ];
  
  const score = qualityIndicators.reduce((score, pattern) => {
    return score + (pattern.test(text) ? 1 : 0);
  }, 0);
  
  return score / qualityIndicators.length;
}

function calculateRelevance(text, keywords) {
  const textLower = text.toLowerCase();
  const keywordMatches = keywords.reduce((count, keyword) => {
    const regex = new RegExp(keyword.toLowerCase(), 'gi');
    const matches = textLower.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
  
  // Normaliser le score de pertinence
  return Math.min(keywordMatches / (text.length / 100), 1);
}

/**
 * Service de recherche contextuelle qui adapte automatiquement les requêtes
 */
export const contextualSearchService = {
  /**
   * Recherche automatique basée sur le profil utilisateur
   */
  autoSearch: async (searchType, userProfile) => {
    try {
      if (searchType === 'workout') {
        return await advancedSearchService.searchWorkoutPrograms(
          '', // Recherche basée uniquement sur le profil
          userProfile.goal,
          userProfile.fitnessLevel,
          userProfile.equipment || []
        );
      } else if (searchType === 'nutrition') {
        return await advancedSearchService.searchNutritionPrograms(
          '', // Recherche basée uniquement sur le profil
          userProfile.dietType,
          userProfile.cookingTime,
          userProfile.allergies || [],
          userProfile.goal
        );
      }
    } catch (error) {
      console.error('Erreur lors de la recherche automatique:', error);
      throw error;
    }
  },

  /**
   * Suggestions personnalisées
   */
  getPersonalizedSuggestions: async (userProfile) => {
    const suggestions = [];
    
    // Suggestions basées sur l'objectif
    if (userProfile.goal === 'perte_poids') {
      suggestions.push(
        'Programme HIIT débutant',
        'Recettes hypocaloriques',
        'Plan nutrition perte de poids'
      );
    } else if (userProfile.goal === 'prise_masse') {
      suggestions.push(
        'Programme musculation masse',
        'Recettes riches en protéines',
        'Plan nutrition prise de masse'
      );
    }
    
    // Suggestions basées sur l'équipement disponible
    if (userProfile.equipment?.includes('haltères')) {
      suggestions.push('Exercices avec haltères à domicile');
    }
    
    return suggestions;
  }
};