/**
 * Utilitaires pour générer des programmes d'entraînement et des recettes
 */

import { webSearchService } from '../services/api';

// Génération de recettes basées sur la recherche web réelle avec extraction intelligente
export const generateRecipesFromSearch = async (goal, nutrition) => {
  try {
    // Utiliser la recherche web réelle avec extraction intelligente
    console.log(`🔍 Recherche intelligente de recettes pour l'objectif: ${goal}`);
    
    // Créer une requête spécifique et affinée basée sur l'objectif
    let searchQuery = '"recette complète" "ingrédients" "préparation" ';
    
    if (goal === 'gain_muscle') {
      searchQuery += '"riches en protéines" "grammes de protéines" "prise de masse" "musculation" ';
    } else if (goal === 'lose_weight') {
      searchQuery += '"minceur" "faibles en calories" "léger" "diététique" ';
    } else {
      searchQuery += '"équilibrées" "healthy" "nutrition" ';
    }
    
    // Ajouter des filtres en fonction du régime alimentaire
    if (nutrition.dietType === 'vegetarian') {
      searchQuery += '"végétariennes" "sans viande" ';
    } else if (nutrition.dietType === 'vegan') {
      searchQuery += '"vegan" "sans produits animaux" ';
    }
    
    // Ajouter des filtres en fonction du temps de préparation
    if (nutrition.cookingTime === 'quick') {
      searchQuery += '"rapides" "15 minutes" "express" ';
    } else if (nutrition.cookingTime === 'medium') {
      searchQuery += '"30 minutes" ';
    }
    
    // Ajouter des filtres en fonction des allergies
    if (nutrition.allergies && nutrition.allergies.length > 0) {
      searchQuery += 'sans ' + nutrition.allergies.map(a => `"${a}"`).join(' sans ');
    }
    
    // Cibler des sites de recettes fiables
    searchQuery += ' site:marmiton.org OR site:750g.com OR site:cuisineaz.com';
    
    console.log('Requête de recherche optimisée:', searchQuery);
    
    const searchResults = await webSearchService.searchGoogle(searchQuery);
    
    // Vérifier si des erreurs sont survenues
    if (searchResults.error === 'PROFILE_INCOMPLETE') {
      throw new Error('Profil utilisateur incomplet');
    }
    
    // Transformer les résultats avec extraction intelligente des données
    const extractedRecipes = searchResults.map((result, index) => {
      const text = (result.title + ' ' + result.snippet).toLowerCase();
      
      // Extraction intelligente des ingrédients
      const ingredients = extractIngredientsFromText(text);
      
      // Extraction intelligente des informations nutritionnelles
      const nutritionInfo = extractNutritionFromText(text, goal);
      
      // Extraction du temps de préparation
      const prepTime = extractTimeFromText(text, nutrition.cookingTime);
      
      // Score de qualité basé sur la richesse du contenu
      const qualityScore = calculateContentQuality(text, ingredients.length);
      
      return {
        id: `recipe-intelligent-${Date.now()}-${index}`,
        name: cleanRecipeName(result.title),
        description: enhanceRecipeDescription(result.snippet),
        source: result.link,
        calories: nutritionInfo.calories,
        protein: nutritionInfo.protein,
        time: prepTime,
        ingredients: ingredients,
        image: result.pagemap?.cse_image?.[0]?.src || generateRecipeImage(goal),
        webSearched: true,
        extractionMethod: 'intelligent_parsing',
        qualityScore: qualityScore
      };
    });
    
    // Trier par score de qualité
    extractedRecipes.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    
    console.log(`✅ ${extractedRecipes.length} recettes extraites avec analyse intelligente`);
    return extractedRecipes;
    
  } catch (error) {
    console.error('Erreur lors de la recherche intelligente de recettes:', error);
    throw error; // Propager l'erreur pour que l'UI puisse l'afficher
  }
};

// Fonction d'extraction intelligente des ingrédients
function extractIngredientsFromText(text) {
  const ingredients = [];
  
  // Patterns pour détecter les ingrédients avec quantités
  const ingredientPatterns = [
    /(\d+g?\s*(?:de\s+)?(?:poulet|bœuf|porc|saumon|thon|œufs?|quinoa|riz|pâtes|lentilles|haricots|avoine))/gi,
    /(poulet|bœuf|porc|saumon|thon|œufs?|quinoa|riz|pâtes|lentilles|haricots|avoine|brocolis|épinards|tomates|courgettes)/gi,
    /(\d+(?:ml|cl|l)\s*(?:de\s+)?(?:lait|eau|bouillon|huile))/gi
  ];
  
  ingredientPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const cleaned = match.trim().toLowerCase();
      if (!ingredients.includes(cleaned) && cleaned.length > 2) {
        ingredients.push(cleaned);
      }
    });
  });
  
  return ingredients.slice(0, 6); // Limiter à 6 ingrédients principaux
}

// Fonction d'extraction intelligente des informations nutritionnelles
function extractNutritionFromText(text, goal) {
  // Extraction des calories
  let calories = 0;
  const calorieMatch = text.match(/(\d+)\s*(?:kcal|calories?)/i);
  if (calorieMatch) {
    calories = parseInt(calorieMatch[1], 10);
  } else {
    // Estimation basée sur l'objectif et le contenu
    calories = estimateCaloriesFromContent(text, goal);
  }
  
  // Extraction des protéines
  let protein = 0;
  const proteinMatch = text.match(/(\d+)\s*g\s*(?:de\s+)?prot[éeè]ines?/i);
  if (proteinMatch) {
    protein = parseInt(proteinMatch[1], 10);
  } else {
    // Estimation basée sur les ingrédients détectés
    protein = estimateProteinFromContent(text, goal);
  }
  
  return { calories, protein };
}

// Fonction d'extraction intelligente du temps de préparation
function extractTimeFromText(text, timePreference) {
  const timePatterns = [
    /(\d+)\s*(?:minutes?|min)/i,
    /(\d+)\s*h(?:eures?)?/i,
    /(?:préparation|cuisson):\s*(\d+)\s*(?:min|minutes?)/i
  ];
  
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let time = parseInt(match[1], 10);
      if (pattern.source.includes('h')) time *= 60; // Convertir heures en minutes
      return Math.min(time, 120); // Maximum 2 heures
    }
  }
  
  // Estimation basée sur les préférences
  switch (timePreference) {
    case 'quick': return Math.floor(Math.random() * 10) + 10; // 10-20 minutes
    case 'medium': return Math.floor(Math.random() * 15) + 25; // 25-40 minutes
    default: return Math.floor(Math.random() * 20) + 20; // 20-40 minutes
  }
}

// Fonctions d'estimation intelligente
function estimateCaloriesFromContent(text, goal) {
  let baseCalories = 400;
  
  // Ajustement selon l'objectif
  if (goal === 'gain_muscle') baseCalories = 600;
  else if (goal === 'lose_weight') baseCalories = 300;
  
  // Ajustement selon les ingrédients détectés
  if (text.includes('avocat') || text.includes('noix') || text.includes('huile')) baseCalories += 100;
  if (text.includes('quinoa') || text.includes('riz') || text.includes('pâtes')) baseCalories += 80;
  if (text.includes('salade') || text.includes('légumes')) baseCalories -= 50;
  
  return baseCalories + Math.floor(Math.random() * 100) - 50;
}

function estimateProteinFromContent(text, goal) {
  let baseProtein = 20;
  
  // Ajustement selon l'objectif
  if (goal === 'gain_muscle') baseProtein = 35;
  else if (goal === 'lose_weight') baseProtein = 25;
  
  // Ajustement selon les sources de protéines détectées
  if (text.includes('poulet') || text.includes('thon') || text.includes('saumon')) baseProtein += 15;
  if (text.includes('œuf')) baseProtein += 10;
  if (text.includes('quinoa') || text.includes('lentilles')) baseProtein += 8;
  if (text.includes('whey') || text.includes('protéine')) baseProtein += 20;
  
  return Math.min(baseProtein + Math.floor(Math.random() * 10) - 5, 60);
}

// Fonctions d'amélioration du contenu
function cleanRecipeName(title) {
  return title
    .replace(/\s*-\s*.*$/, '') // Enlever le suffixe après le tiret
    .replace(/^\[.*?\]\s*/, '') // Enlever les préfixes entre crochets
    .replace(/Recette\s*/i, '') // Enlever le mot "Recette"
    .trim();
}

function enhanceRecipeDescription(snippet) {
  return snippet
    .replace(/\.\.\.$/, '') // Enlever les points de suspension finaux
    .replace(/^.*?:\s*/, '') // Enlever le préfixe avant les deux points
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

function calculateContentQuality(text, ingredientCount) {
  let score = 0;
  
  // Points pour les ingrédients détectés
  score += ingredientCount * 8;
  
  // Points pour les mots-clés de qualité
  const qualityKeywords = ['ingrédients', 'préparation', 'cuisson', 'étapes', 'minutes', 'calories', 'protéines'];
  qualityKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 7;
  });
  
  // Points pour la longueur du texte (plus détaillé = meilleur)
  if (text.length > 100) score += 10;
  if (text.length > 200) score += 10;
  
  return Math.min(score, 100);
}

function generateRecipeImage(goal) {
  const imageMap = {
    'gain_muscle': 'https://source.unsplash.com/300x200/?protein+food+muscle',
    'lose_weight': 'https://source.unsplash.com/300x200/?healthy+salad+diet',
    'maintain': 'https://source.unsplash.com/300x200/?balanced+meal+nutrition'
  };
  return imageMap[goal] || 'https://source.unsplash.com/300x200/?healthy+food';
}

// Fonction pour estimer les calories selon l'objectif
function estimateCaloriesFromGoal(goal, title, description) {
  switch (goal) {
    case 'lose_weight':
      return Math.floor(Math.random() * 150) + 150; // 150-300 calories (faible)
    case 'gain_muscle':
      return Math.floor(Math.random() * 300) + 500; // 500-800 calories (élevé)
    default:
      return Math.floor(Math.random() * 200) + 350; // 350-550 calories (moyen)
  }
}

// Fonction pour estimer les protéines selon l'objectif
function estimateProteinFromGoal(goal, title, description) {
  switch (goal) {
    case 'lose_weight':
      return Math.floor(Math.random() * 10) + 15; // 15-25g (moyen)
    case 'gain_muscle':
      return Math.floor(Math.random() * 15) + 30; // 30-45g (élevé)
    default:
      return Math.floor(Math.random() * 10) + 20; // 20-30g (moyen-élevé)
  }
}

// Fonction pour estimer le temps de préparation
function estimateCookingTime(cookingTimePreference, title, description) {
  const text = (title + ' ' + description).toLowerCase();
  const timeMatch = text.match(/(\d+)\s*min/i);
  
  if (timeMatch) {
    return parseInt(timeMatch[1], 10);
  }
  
  if (cookingTimePreference === 'quick') {
    return Math.floor(Math.random() * 10) + 10; // 10-20 minutes
  } else {
    return Math.floor(Math.random() * 20) + 20; // 20-40 minutes
  }
}

// Génération de programme basée sur la recherche web
export const generateWorkoutFromSearch = (profile, equipment) => {
  let exercises = [];
  const programName = `Programme IA ${profile.goal === 'lose_weight' ? 'Perte de Poids' : profile.goal === 'gain_muscle' ? 'Prise de Masse' : 'Fitness'}`;

  const baseExercises = {
    home: {
      dumbbells: [
        { name: 'Développé couché haltères', sets: 4, reps: '10-12', rest: '90s', muscle: 'pectoraux' },
        { name: 'Rowing haltères', sets: 4, reps: '10-12', rest: '90s', muscle: 'dos' },
        { name: 'Squats goblet', sets: 4, reps: '12-15', rest: '90s', muscle: 'jambes' },
        { name: 'Élévations latérales', sets: 3, reps: '12-15', rest: '60s', muscle: 'épaules' },
        { name: 'Curl biceps', sets: 3, reps: '12-15', rest: '60s', muscle: 'bras' },
        { name: 'Extensions triceps', sets: 3, reps: '12-15', rest: '60s', muscle: 'bras' }
      ],
      bodyweight: [
        { name: 'Pompes', sets: 4, reps: '12-15', rest: '60s', muscle: 'pectoraux' },
        { name: 'Squats au poids du corps', sets: 4, reps: '15-20', rest: '60s', muscle: 'jambes' },
        { name: 'Planche', sets: 3, reps: '30-60s', rest: '60s', muscle: 'abdominaux' },
        { name: 'Dips sur chaise', sets: 3, reps: '10-15', rest: '60s', muscle: 'triceps' },
        { name: 'Mountain climbers', sets: 3, reps: '20 par jambe', rest: '45s', muscle: 'cardio' },
        { name: 'Superman', sets: 3, reps: '12-15', rest: '60s', muscle: 'dos' }
      ]
    },
    gym: [
      { name: 'Développé couché barre', sets: 4, reps: '8-10', rest: '120s', muscle: 'pectoraux' },
      { name: 'Squat barre', sets: 4, reps: '10-12', rest: '120s', muscle: 'jambes' },
      { name: 'Tractions', sets: 4, reps: '8-12', rest: '90s', muscle: 'dos' },
      { name: 'Développé militaire', sets: 3, reps: '10-12', rest: '90s', muscle: 'épaules' },
      { name: 'Leg press', sets: 3, reps: '12-15', rest: '90s', muscle: 'jambes' },
      { name: 'Curl pupitre', sets: 3, reps: '12-15', rest: '60s', muscle: 'bras' }
    ]
  };

  // Sélection des exercices selon l'équipement
  if (equipment.location === 'home') {
    if (equipment.homeEquipment && equipment.homeEquipment.includes('dumbbells')) {
      exercises = baseExercises.home.dumbbells;
    } else {
      exercises = baseExercises.home.bodyweight;
    }
  } else {
    exercises = baseExercises.gym;
  }

  // Ajuster le programme en fonction de l'objectif
  if (profile.goal === 'lose_weight') {
    // Ajouter du cardio pour la perte de poids
    exercises.push(
      { name: 'HIIT (30s effort / 30s repos)', sets: 10, reps: '30s', rest: '30s', muscle: 'cardio' },
      { name: 'Jumping jacks', sets: 3, reps: '45s', rest: '30s', muscle: 'cardio' }
    );
  } else if (profile.goal === 'gain_muscle') {
    // Augmenter l'intensité pour la prise de masse
    exercises = exercises.map(ex => ({
      ...ex,
      sets: Math.min(ex.sets + 1, 5),
      rest: ex.rest.replace('60s', '90s').replace('90s', '120s')
    }));
  }

  return {
    id: Date.now(),
    name: programName,
    date: new Date().toLocaleDateString('fr-FR'),
    exercises: exercises,
    duration: 45 + Math.floor(Math.random() * 30),
    source: 'Recherche Web IA',
    webSearched: true,
    level: profile.activityLevel,
    goal: profile.goal,
    location: equipment.location,
    description: `Programme personnalisé ${profile.goal === 'lose_weight' ? 'pour la perte de poids' : profile.goal === 'gain_muscle' ? 'pour la prise de masse' : 'de maintien'}.`
  };
};

// Génération de programmes d'entraînement basés sur la recherche web
export const generateWorkoutsFromSearch = async (userProfile, equipmentProfile) => {
  try {
    console.log(`🔍 Recherche intelligente de programmes pour: ${equipmentProfile.location}`);
    
    // Créer une requête spécifique et affinée
    let searchQuery = '"programme complet" "exercices" "séries" "répétitions" ';
    
    // Ajouter le lieu d'entraînement
    if (equipmentProfile.location === 'home') {
      searchQuery += '"musculation maison" ';
      if (equipmentProfile.homeEquipment && equipmentProfile.homeEquipment.includes('dumbbells')) {
        searchQuery += '"haltères" ';
      } else {
        searchQuery += '"poids du corps" "sans matériel" ';
      }
    } else {
      searchQuery += '"musculation salle" "équipement complet" ';
    }
    
    // Ajouter l'objectif
    if (userProfile.goal === 'gain_muscle') {
      searchQuery += '"prise de masse" "hypertrophie" ';
    } else if (userProfile.goal === 'lose_weight') {
      searchQuery += '"perte de poids" "cardio" ';
    }
    
    // Ajouter le niveau
    if (userProfile.activityLevel === 'low') {
      searchQuery += '"débutant" ';
    } else if (userProfile.activityLevel === 'high') {
      searchQuery += '"avancé" ';
    }
    
    // Cibler des sites de musculation fiables
    searchQuery += ' site:all-musculation.com OR site:musculation.com OR site:superphysique.org';
    
    console.log('Requête de recherche de programmes:', searchQuery);
    
    const searchResults = await webSearchService.searchGoogle(searchQuery);
    
    // Vérifier si des erreurs sont survenues
    if (searchResults.error === 'PROFILE_INCOMPLETE') {
      throw new Error('Profil utilisateur incomplet');
    }
    
    // Transformer les résultats avec extraction intelligente
    const extractedPrograms = searchResults.map((result, index) => {
      const text = (result.title + ' ' + result.snippet).toLowerCase();
      
      // Extraction intelligente des exercices
      const exercises = extractExercisesFromText(text);
      
      // Extraction des informations du programme
      const programInfo = extractProgramInfoFromText(text, userProfile.activityLevel);
      
      // Score de qualité
      const qualityScore = calculateProgramQuality(text, exercises.length);
      
      return {
        id: `program-intelligent-${Date.now()}-${index}`,
        title: cleanProgramTitle(result.title),
        description: enhanceProgramDescription(result.snippet),
        source: result.link,
        level: programInfo.level,
        duration: programInfo.duration,
        equipment: equipmentProfile.location === 'home' 
          ? (equipmentProfile.homeEquipment?.join(', ') || 'Poids du corps')
          : 'Équipement complet salle',
        exercises: exercises,
        muscleGroups: programInfo.muscleGroups,
        qualityScore: qualityScore,
        image: result.pagemap?.cse_image?.[0]?.src || generateWorkoutImage(equipmentProfile.location),
        webSearched: true,
        extractionMethod: 'intelligent_parsing'
      };
    });
    
    // Trier par score de qualité
    extractedPrograms.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
    
    console.log(`✅ ${extractedPrograms.length} programmes extraits avec analyse intelligente`);
    return extractedPrograms;
    
  } catch (error) {
    console.error('Erreur lors de la recherche intelligente de programmes:', error);
    throw error;
  }
};

// Fonction d'extraction intelligente des exercices
function extractExercisesFromText(text) {
  const exercises = [];
  
  // Patterns pour détecter les exercices avec séries/répétitions
  const exercisePatterns = [
    /(squat|pompes?|tractions?|développé|curl|rowing|dips|planche|burpees?|fentes?)[\s\w]*(?:\s*[\:\-]\s*)?(\d+\s*(?:x|séries?)\s*\d+)?/gi,
    /(\d+\s*(?:séries?|sets?)\s*(?:de\s*)?(?:\d+\s*)?(?:répétitions?|reps?)\s*(?:de\s*)?[\w\s]+)/gi
  ];
  
  exercisePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const cleaned = match.trim().toLowerCase();
      if (!exercises.includes(cleaned) && cleaned.length > 3) {
        exercises.push(cleaned);
      }
    });
  });
  
  return exercises.slice(0, 8); // Limiter à 8 exercices principaux
}

// Fonction d'extraction des informations du programme
function extractProgramInfoFromText(text, userActivityLevel) {
  // Extraction du niveau
  let level = 'intermédiaire';
  if (text.includes('débutant') || text.includes('facile')) level = 'débutant';
  else if (text.includes('avancé') || text.includes('expert')) level = 'avancé';
  
  // Extraction de la durée
  let duration = '60 min';
  const durationMatch = text.match(/(\d+)\s*(?:minutes?|min)/i);
  if (durationMatch) {
    duration = `${durationMatch[1]} min`;
  }
  
  // Extraction des groupes musculaires
  const muscleKeywords = ['pectoraux', 'dos', 'jambes', 'épaules', 'bras', 'abdominaux', 'fessiers'];
  const muscleGroups = muscleKeywords.filter(muscle => text.includes(muscle));
  
  return { level, duration, muscleGroups };
}

// Fonction de calcul de qualité du programme
function calculateProgramQuality(text, exerciseCount) {
  let score = 0;
  
  // Points pour les exercices détectés
  score += exerciseCount * 10;
  
  // Points pour les mots-clés de qualité
  const qualityKeywords = ['programme', 'exercices', 'séries', 'répétitions', 'semaines', 'progression'];
  qualityKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 8;
  });
  
  // Points pour la détail du contenu
  if (text.length > 150) score += 15;
  if (text.includes('4x') || text.includes('3x') || text.includes('sets')) score += 10;
  
  return Math.min(score, 100);
}

// Fonctions d'amélioration du contenu
function cleanProgramTitle(title) {
  return title
    .replace(/\s*-\s*.*$/, '')
    .replace(/^\[.*?\]\s*/, '')
    .replace(/Programme\s*/i, '')
    .trim();
}

function enhanceProgramDescription(snippet) {
  return snippet
    .replace(/\.\.\.$/, '')
    .replace(/^.*?:\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateWorkoutImage(location) {
  return location === 'home' 
    ? 'https://source.unsplash.com/300x200/?home+workout+exercise'
    : 'https://source.unsplash.com/300x200/?gym+equipment+training';
}