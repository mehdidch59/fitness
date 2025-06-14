/**
 * Service IA Nutrition Avancé
 * Fonctionnalités : Scanner frigo, mood-based recipes, adaptation allergies, budget
 */

import { mistralService } from './mistralNutritionService';
import { nutritionFirestoreService } from './nutritionFirestoreService';

class AIAdvancedNutritionService {
  constructor() {
    this.moodRecipeMap = {
      'fatigué': { keywords: ['énergisant', 'fer', 'vitamine B', 'magnésium'], calories: '500+' },
      'stressé': { keywords: ['apaisant', 'oméga-3', 'magnésium', 'camomille'], calories: '300-400' },
      'motivé': { keywords: ['protéines', 'énergétique', 'post-workout'], calories: '600+' },
      'malade': { keywords: ['vitamine C', 'antioxydants', 'léger', 'digestible'], calories: '200-350' },
      'heureux': { keywords: ['coloré', 'frais', 'équilibré'], calories: '400-600' }
    };

    this.seasonalIngredients = {
      spring: ['asperges', 'radis', 'petits pois', 'épinards', 'fraises'],
      summer: ['tomates', 'courgettes', 'aubergines', 'pêches', 'melons'],
      autumn: ['potiron', 'châtaignes', 'pommes', 'champignons', 'figues'],
      winter: ['choux', 'poireaux', 'oranges', 'mandarines', 'endives']
    };
  }

  /**
   * SCANNER DE FRIGO - Analyse photo et génère recettes
   */
  async scanFridgeAndGenerateRecipes(imageFile, userProfile, options = {}) {
    try {
      console.log('📸 Analyse du frigo en cours...');
      
      // Simulation de l'analyse d'image (à remplacer par vraie API vision)
      const detectedIngredients = await this.analyzeImageForIngredients(imageFile);
      
      console.log('🥬 Ingrédients détectés:', detectedIngredients);
      
      // Générer recettes avec les ingrédients disponibles
      const recipes = await this.generateRecipesWithAvailableIngredients(
        detectedIngredients, 
        userProfile, 
        options
      );
      
      return {
        detectedIngredients,
        recipes,
        wasteReduction: this.calculateWasteReduction(detectedIngredients),
        suggestions: this.generateShoppingSuggestions(detectedIngredients, recipes)
      };
      
    } catch (error) {
      console.error('❌ Erreur scanner frigo:', error);
      throw error;
    }
  }

  /**
   * MOOD-BASED RECIPES - Recettes selon l'humeur
   */
  async generateMoodBasedRecipes(mood, userProfile, options = {}) {
    try {
      console.log(`😊 Génération recettes pour humeur: ${mood}`);
      
      const moodConfig = this.moodRecipeMap[mood.toLowerCase()] || this.moodRecipeMap['heureux'];
      
      const prompt = `Génère 3 recettes JSON adaptées à l'humeur "${mood}" avec ces critères:
      - Mots-clés: ${moodConfig.keywords.join(', ')}
      - Calories: ${moodConfig.calories}
      - Profil utilisateur: ${JSON.stringify(userProfile)}
      
      Chaque recette doit avoir des propriétés mood-specific:
      - moodBoost: score 1-10 pour améliorer l'humeur
      - energyLevel: 'low', 'medium', 'high'
      - comfortFood: boolean
      - preparationComplexity: pour s'adapter à l'état mental
      
      Format JSON strict array de 3 recettes avec propriétés mood.`;

      const recipes = await mistralService.generatePersonalizedRecipes({
        ...userProfile,
        mood: mood,
        specialPrompt: prompt
      });

      return recipes.map(recipe => ({
        ...recipe,
        generationType: 'mood-based',
        mood: mood,
        moodBoost: this.calculateMoodBoost(recipe, mood),
        tags: [...(recipe.tags || []), `mood-${mood}`, 'ia-mood']
      }));
      
    } catch (error) {
      console.error('❌ Erreur mood-based recipes:', error);
      throw error;
    }
  }

  /**
   * RECETTES PAR BUDGET
   */
  async generateBudgetRecipes(weeklyBudget, userProfile, options = {}) {
    try {
      console.log(`💰 Génération recettes pour budget: ${weeklyBudget}€`);
      
      const budgetTier = this.determineBudgetTier(weeklyBudget);
      const ingredientConstraints = this.getBudgetIngredients(budgetTier);
      
      const prompt = `Génère un plan de repas d'une semaine JSON pour ${weeklyBudget}€:
      
      CONTRAINTES BUDGET:
      - Budget total: ${weeklyBudget}€ pour 7 jours
      - Ingrédients économiques: ${ingredientConstraints.affordable.join(', ')}
      - Éviter: ${ingredientConstraints.expensive.join(', ')}
      - Portions: ${userProfile.portions || 1} personne(s)
      
      STRUCTURE REQUISE:
      {
        "totalBudget": ${weeklyBudget},
        "dailyMeals": [
          {
            "day": "lundi",
            "breakfast": {...recette...},
            "lunch": {...recette...},
            "dinner": {...recette...},
            "estimatedCost": 00.00
          }
        ],
        "shoppingList": [
          {"ingredient": "nom", "quantity": "quantité", "estimatedPrice": 0.00}
        ],
        "budgetBreakdown": {"breakfast": 0.00, "lunch": 0.00, "dinner": 0.00}
      }`;

      const budgetPlan = await mistralService.callMistralAPI(prompt);
      return JSON.parse(budgetPlan);
      
    } catch (error) {
      console.error('❌ Erreur budget recipes:', error);
      throw error;
    }
  }

  /**
   * ADAPTATION ALLERGIES AUTOMATIQUE
   */
  async adaptRecipeForAllergies(recipe, allergies, userProfile) {
    try {
      console.log(`🚫 Adaptation recette pour allergies: ${allergies.join(', ')}`);
      
      const adaptationRules = this.getAllergySubstitutions();
      let adaptedRecipe = { ...recipe };
      
      // Analyser chaque ingrédient
      adaptedRecipe.ingredients = await Promise.all(
        recipe.ingredients.map(async (ingredient) => {
          return await this.findAllergySubstitute(ingredient, allergies, adaptationRules);
        })
      );
      
      // Réajuster les valeurs nutritionnelles
      adaptedRecipe = await this.recalculateNutrition(adaptedRecipe);
      
      // Ajouter des notes d'adaptation
      adaptedRecipe.adaptationNotes = this.generateAdaptationNotes(recipe, adaptedRecipe, allergies);
      adaptedRecipe.tags = [...(recipe.tags || []), 'allergie-adaptée', ...allergies.map(a => `sans-${a}`)];
      
      return adaptedRecipe;
      
    } catch (error) {
      console.error('❌ Erreur adaptation allergies:', error);
      throw error;
    }
  }

  /**
   * RECETTES SAISONNIÈRES AUTOMATIQUES
   */
  async generateSeasonalRecipes(userProfile, options = {}) {
    try {
      const currentSeason = this.getCurrentSeason();
      const seasonalIngredients = this.seasonalIngredients[currentSeason];
      
      console.log(`🌿 Génération recettes de saison: ${currentSeason}`);
      
      const prompt = `Génère 4 recettes JSON de saison (${currentSeason}) avec ces ingrédients prioritaires:
      ${seasonalIngredients.join(', ')}
      
      Critères:
      - Utiliser au moins 2 ingrédients de saison par recette
      - Profil: ${JSON.stringify(userProfile)}
      - Impact environnemental réduit
      - Fraîcheur et goût optimaux
      
      Ajouter pour chaque recette:
      - seasonalScore: score 1-100 de saisonnalité
      - environmentalImpact: 'low', 'medium', 'high'
      - freshnessTips: conseils de fraîcheur
      - localSourcing: suggestions d'achat local`;

      const seasonalRecipes = await mistralService.generatePersonalizedRecipes({
        ...userProfile,
        season: currentSeason,
        seasonalIngredients: seasonalIngredients,
        specialPrompt: prompt
      });

      return seasonalRecipes.map(recipe => ({
        ...recipe,
        generationType: 'seasonal',
        season: currentSeason,
        seasonalIngredients: recipe.ingredients.filter(ing => 
          seasonalIngredients.some(seasonal => 
            ing.name.toLowerCase().includes(seasonal.toLowerCase())
          )
        ),
        tags: [...(recipe.tags || []), `saison-${currentSeason}`, 'local', 'eco-friendly']
      }));
      
    } catch (error) {
      console.error('❌ Erreur recettes saisonnières:', error);
      throw error;
    }
  }

  // === MÉTHODES UTILITAIRES ===

  async analyzeImageForIngredients(imageFile) {
    // Simulation d'analyse d'image - À remplacer par vraie API
    const commonFridgeItems = [
      'œufs', 'lait', 'beurre', 'fromage', 'yaourt',
      'tomates', 'oignons', 'ail', 'carottes', 'pommes de terre',
      'poulet', 'jambon', 'saumon', 'thon',
      'riz', 'pâtes', 'pain', 'salade', 'épinards'
    ];
    
    // Retourner 5-8 ingrédients aléatoires pour la simulation
    const detected = commonFridgeItems
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 4) + 5)
      .map(ingredient => ({
        name: ingredient,
        confidence: Math.floor(Math.random() * 30) + 70, // 70-99%
        expirationEstimate: Math.floor(Math.random() * 7) + 1, // 1-7 jours
        quantity: 'détectée'
      }));
    
    return detected;
  }

  async generateRecipesWithAvailableIngredients(ingredients, userProfile, options) {
    const ingredientNames = ingredients.map(ing => ing.name).join(', ');
    
    const prompt = `Génère 3 recettes JSON utilisant PRINCIPALEMENT ces ingrédients disponibles:
    ${ingredientNames}
    
    RÈGLES IMPORTANTES:
    - Utiliser AU MOINS 70% des ingrédients listés
    - Ajouter maximum 2-3 ingrédients de base (épices, huile, etc.)
    - Optimiser pour réduire le gaspillage alimentaire
    - Profil utilisateur: ${JSON.stringify(userProfile)}
    
    Ajouter pour chaque recette:
    - usedIngredients: array des ingrédients utilisés
    - wasteReduction: score 1-100
    - additionalIngredients: ingrédients à acheter
    - fridgeOptimization: boolean`;

    const recipes = await mistralService.generatePersonalizedRecipes({
      ...userProfile,
      availableIngredients: ingredientNames,
      specialPrompt: prompt
    });

    return recipes.map(recipe => ({
      ...recipe,
      generationType: 'fridge-scan',
      usedIngredients: this.matchUsedIngredients(recipe.ingredients, ingredients),
      wasteReduction: this.calculateWasteReduction(ingredients, recipe.ingredients),
      tags: [...(recipe.tags || []), 'anti-gaspi', 'frigo-scan']
    }));
  }

  calculateMoodBoost(recipe, mood) {
    // Algorithme simple de calcul du boost d'humeur
    let score = 50; // Base score
    
    const moodConfig = this.moodRecipeMap[mood.toLowerCase()];
    if (!moodConfig) return score;
    
    // Bonus pour les mots-clés correspondants
    moodConfig.keywords.forEach(keyword => {
      if (recipe.description?.toLowerCase().includes(keyword) ||
          recipe.ingredients?.some(ing => ing.name?.toLowerCase().includes(keyword))) {
        score += 10;
      }
    });
    
    // Bonus pour calories appropriées
    const calorieMatch = this.checkCalorieMatch(recipe.calories, moodConfig.calories);
    if (calorieMatch) score += 15;
    
    // Malus pour complexité si fatigué/stressé
    if (['fatigué', 'stressé'].includes(mood) && recipe.time > 30) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  determineBudgetTier(weeklyBudget) {
    if (weeklyBudget < 20) return 'tight';
    if (weeklyBudget < 40) return 'moderate';
    if (weeklyBudget < 70) return 'comfortable';
    return 'flexible';
  }

  getBudgetIngredients(tier) {
    const ingredients = {
      tight: {
        affordable: ['œufs', 'riz', 'pâtes', 'légumineuses', 'pommes de terre', 'oignons', 'carottes'],
        expensive: ['saumon', 'bœuf', 'avocat', 'noix', 'fromages fins']
      },
      moderate: {
        affordable: ['poulet', 'œufs', 'poisson blanc', 'légumes surgelés', 'quinoa'],
        expensive: ['fruits de mer', 'viande bio', 'superfoods exotiques']
      },
      comfortable: {
        affordable: ['viandes variées', 'poissons', 'légumes frais', 'fruits de saison'],
        expensive: ['truffes', 'homard', 'produits importés haut de gamme']
      },
      flexible: {
        affordable: ['tout type d\'ingrédients', 'produits bio', 'spécialités'],
        expensive: []
      }
    };
    
    return ingredients[tier];
  }

  getAllergySubstitutions() {
    return {
      'lactose': {
        'lait': 'lait d\'amande',
        'beurre': 'huile de coco',
        'fromage': 'fromage végétal',
        'yaourt': 'yaourt de soja'
      },
      'gluten': {
        'farine de blé': 'farine de riz',
        'pâtes': 'pâtes sans gluten',
        'pain': 'pain sans gluten',
        'avoine': 'avoine certifiée sans gluten'
      },
      'œufs': {
        'œuf': 'substitut d\'œuf végétal',
        'blanc d\'œuf': 'aquafaba',
        'jaune d\'œuf': 'compote de pommes'
      },
      'noix': {
        'amandes': 'graines de tournesol',
        'noix': 'graines de citrouille',
        'beurre de cacahuète': 'beurre de graines de tournesol'
      }
    };
  }

  async findAllergySubstitute(ingredient, allergies, adaptationRules) {
    for (const allergy of allergies) {
      const substitutions = adaptationRules[allergy.toLowerCase()];
      if (substitutions) {
        for (const [allergen, substitute] of Object.entries(substitutions)) {
          if (ingredient.name.toLowerCase().includes(allergen.toLowerCase())) {
            return {
              ...ingredient,
              name: substitute,
              originalName: ingredient.name,
              substituted: true,
              reason: `Substitution pour allergie: ${allergy}`
            };
          }
        }
      }
    }
    return ingredient;
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  calculateWasteReduction(ingredients, usedIngredients = []) {
    if (!ingredients.length) return 0;
    
    const expiringIngredients = ingredients.filter(ing => ing.expirationEstimate <= 3);
    const usedExpiringIngredients = usedIngredients.filter(used => 
      expiringIngredients.some(exp => exp.name.toLowerCase() === used.name.toLowerCase())
    );
    
    return Math.round((usedExpiringIngredients.length / Math.max(expiringIngredients.length, 1)) * 100);
  }

  matchUsedIngredients(recipeIngredients, availableIngredients) {
    return recipeIngredients.filter(recipeIng =>
      availableIngredients.some(available =>
        available.name.toLowerCase().includes(recipeIng.name.toLowerCase()) ||
        recipeIng.name.toLowerCase().includes(available.name.toLowerCase())
      )
    );
  }

  checkCalorieMatch(actualCalories, targetRange) {
    if (typeof targetRange === 'string') {
      if (targetRange.includes('+')) {
        const min = parseInt(targetRange.replace('+', ''));
        return actualCalories >= min;
      }
      if (targetRange.includes('-')) {
        const [min, max] = targetRange.split('-').map(x => parseInt(x));
        return actualCalories >= min && actualCalories <= max;
      }
    }
    return true;
  }

  generateShoppingSuggestions(detectedIngredients, recipes) {
    // Analyser les ingrédients manquants pour les recettes générées
    const allNeededIngredients = recipes.flatMap(recipe => recipe.ingredients || []);
    const availableNames = detectedIngredients.map(ing => ing.name.toLowerCase());
    
    const missingIngredients = allNeededIngredients.filter(needed =>
      !availableNames.some(available => 
        available.includes(needed.name.toLowerCase()) ||
        needed.name.toLowerCase().includes(available)
      )
    );
    
    return {
      missingIngredients: [...new Set(missingIngredients.map(ing => ing.name))],
      estimatedCost: missingIngredients.length * 3.5, // €3.50 par ingrédient moyen
      suggestion: `Ajouter ${missingIngredients.length} ingrédients pour compléter les recettes`
    };
  }

  async recalculateNutrition(adaptedRecipe) {
    // Recalcul approximatif des valeurs nutritionnelles après substitution
    // En pratique, utiliser une base de données nutritionnelle
    return {
      ...adaptedRecipe,
      nutritionNote: 'Valeurs nutritionnelles approximatives après adaptation'
    };
  }

  generateAdaptationNotes(originalRecipe, adaptedRecipe, allergies) {
    const changes = adaptedRecipe.ingredients.filter(ing => ing.substituted);
    return {
      substitutions: changes.length,
      allergiesAvoid: allergies,
      changes: changes.map(ing => `${ing.originalName} → ${ing.name}`),
      notice: 'Recette adaptée automatiquement pour vos allergies'
    };
  }
}

export const aiAdvancedNutritionService = new AIAdvancedNutritionService();
export default aiAdvancedNutritionService;