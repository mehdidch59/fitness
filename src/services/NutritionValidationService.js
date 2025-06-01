/**
 * Service de validation et transformation des données nutritionnelles
 * Assure la cohérence et la qualité des recettes générées
 */

export class NutritionvalidationService {
  /**
   * Valide une recette complète
   */
  static validateRecipe(recipe) {
    const errors = [];
    const warnings = [];

    // Validation des champs obligatoires
    if (!recipe.name || recipe.name.trim().length < 3) {
      errors.push('Le nom de la recette doit contenir au moins 3 caractères');
    }

    // Validation des valeurs nutritionnelles
    const nutritionValidation = this.validateNutritionValues(recipe);
    errors.push(...nutritionValidation.errors);
    warnings.push(...nutritionValidation.warnings);

    // Validation des ingrédients
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      errors.push('La recette doit contenir au moins un ingrédient');
    }

    // Validation des instructions
    if (!recipe.instructions || recipe.instructions.length === 0) {
      errors.push('La recette doit contenir au moins une instruction');
    }

    // Validation spécifique prise de masse
    const massGainValidation = this.validateMassGainCriteria(recipe);
    warnings.push(...massGainValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateQualityScore(recipe)
    };
  }

  /**
   * Valide les valeurs nutritionnelles
   */
  static validateNutritionValues(recipe) {
    const errors = [];
    const warnings = [];

    // Vérification des types et valeurs
    const nutritionFields = ['calories', 'protein', 'carbs', 'fats'];
    
    for (const field of nutritionFields) {
      const value = recipe[field];
      
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        errors.push(`${field} doit être un nombre positif`);
      }
    }

    // Cohérence nutritionnelle
    if (recipe.calories && recipe.protein && recipe.carbs && recipe.fats) {
      const calculatedCalories = (recipe.protein * 4) + (recipe.carbs * 4) + (recipe.fats * 9);
      const difference = Math.abs(recipe.calories - calculatedCalories);
      const tolerance = recipe.calories * 0.15; // 15% de tolérance

      if (difference > tolerance) {
        warnings.push(`Incohérence nutritionnelle détectée (écart de ${Math.round(difference)} kcal)`);
      }
    }

    // Ratios nutritionnels recommandés pour prise de masse
    if (recipe.calories && recipe.protein) {
      const proteinCalorieRatio = (recipe.protein * 4) / recipe.calories;
      if (proteinCalorieRatio < 0.15) {
        warnings.push('Taux de protéines potentiellement insuffisant pour la prise de masse');
      }
    }

    return { errors, warnings };
  }

  /**
   * Valide les critères spécifiques à la prise de masse
   */
  static validateMassGainCriteria(recipe) {
    const warnings = [];

    // Calories minimales
    if (recipe.calories < 400) {
      warnings.push('Calories insuffisantes pour la prise de masse (minimum recommandé: 400)');
    }

    // Protéines minimales
    if (recipe.protein < 20) {
      warnings.push('Protéines insuffisantes pour la prise de masse (minimum recommandé: 20g)');
    }

    // Équilibre macronutriments
    const totalMacros = recipe.protein + recipe.carbs + recipe.fats;
    if (totalMacros > 0) {
      const proteinRatio = recipe.protein / totalMacros;
      const carbRatio = recipe.carbs / totalMacros;
      
      if (proteinRatio < 0.2) {
        warnings.push('Ratio de protéines faible pour la prise de masse');
      }
      
      if (carbRatio < 0.4) {
        warnings.push('Ratio de glucides faible pour la prise de masse');
      }
    }

    return { warnings };
  }

  /**
   * Calcule un score de qualité pour la recette
   */
  static calculateQualityScore(recipe) {
    let score = 0;

    // Points pour la complétude
    if (recipe.name && recipe.name.length > 5) score += 10;
    if (recipe.description && recipe.description.length > 20) score += 10;
    if (recipe.ingredients && recipe.ingredients.length >= 3) score += 15;
    if (recipe.instructions && recipe.instructions.length >= 2) score += 15;

    // Points pour les valeurs nutritionnelles
    if (recipe.calories >= 500) score += 20;
    if (recipe.protein >= 25) score += 15;
    if (recipe.carbs >= 40) score += 10;
    if (recipe.fats >= 10) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Enrichit une recette avec des données calculées
   */
  static enrichRecipe(recipe) {
    const enriched = { ...recipe };

    // Calculer le score de prise de masse
    enriched.massGainScore = this.calculateMassGainScore(recipe);

    // Ajouter des tags basés sur les caractéristiques
    enriched.tags = this.generateTags(recipe);

    // Estimer la densité calorique
    enriched.caloriesPerGram = this.estimateCalorieDensity(recipe);

    // Ajouter des conseils nutritionnels
    enriched.nutritionAdvice = this.generateNutritionAdvice(recipe);

    // Calculer les ratios macronutriments
    enriched.macroRatios = this.calculateMacroRatios(recipe);

    return enriched;
  }

  /**
   * Calcule le score de prise de masse
   */
  static calculateMassGainScore(recipe) {
    const calorieScore = Math.min((recipe.calories / 800) * 40, 40);
    const proteinScore = Math.min((recipe.protein / 50) * 35, 35);
    const carbScore = Math.min((recipe.carbs / 80) * 15, 15);
    const fatScore = Math.min((recipe.fats / 30) * 10, 10);
    
    return Math.round(calorieScore + proteinScore + carbScore + fatScore);
  }

  /**
   * Génère des tags automatiques
   */
  static generateTags(recipe) {
    const tags = ['prise-de-masse'];

    // Tags basés sur les valeurs nutritionnelles
    if (recipe.calories >= 700) tags.push('haute-calorie');
    if (recipe.protein >= 35) tags.push('riche-proteines');
    if (recipe.carbs >= 70) tags.push('riche-glucides');
    if (recipe.fats >= 25) tags.push('riche-lipides');

    // Tags basés sur le temps de préparation
    if (recipe.time <= 10) tags.push('rapide');
    else if (recipe.time <= 20) tags.push('facile');

    // Tags basés sur le type de repas
    if (recipe.mealType) tags.push(recipe.mealType);

    // Tags basés sur la difficulté
    if (recipe.difficulty === 'Facile') tags.push('debutant');

    return [...new Set(tags)]; // Supprimer les doublons
  }

  /**
   * Estime la densité calorique
   */
  static estimateCalorieDensity(recipe) {
    // Estimation basée sur les ingrédients typiques
    const estimatedWeight = recipe.ingredients ? recipe.ingredients.length * 50 : 200;
    return recipe.calories ? Math.round(recipe.calories / estimatedWeight * 100) / 100 : 0;
  }

  /**
   * Génère des conseils nutritionnels
   */
  static generateNutritionAdvice(recipe) {
    const advice = [];

    // Conseils basés sur les macronutriments
    const proteinRatio = recipe.protein * 4 / recipe.calories;
    if (proteinRatio > 0.25) {
      advice.push('Excellente source de protéines pour la récupération musculaire');
    }

    const carbRatio = recipe.carbs * 4 / recipe.calories;
    if (carbRatio > 0.5) {
      advice.push('Idéal avant ou après l\'entraînement pour l\'énergie');
    }

    // Conseils basés sur les calories
    if (recipe.calories >= 600) {
      advice.push('Parfait comme repas principal pour la prise de masse');
    } else if (recipe.calories >= 300) {
      advice.push('Excellent comme collation énergétique');
    }

    return advice.slice(0, 2); // Limiter à 2 conseils
  }

  /**
   * Calcule les ratios de macronutriments
   */
  static calculateMacroRatios(recipe) {
    const totalCalories = recipe.calories || 0;
    
    if (totalCalories === 0) {
      return { protein: 0, carbs: 0, fats: 0 };
    }

    return {
      protein: Math.round((recipe.protein * 4 / totalCalories) * 100),
      carbs: Math.round((recipe.carbs * 4 / totalCalories) * 100),
      fats: Math.round((recipe.fats * 9 / totalCalories) * 100)
    };
  }

  /**
   * Nettoie et formate les données d'entrée
   */
  static sanitizeRecipeData(rawData) {
    const sanitized = {};

    // Nettoyer les chaînes de caractères
    const stringFields = ['name', 'description', 'mealType', 'difficulty', 'nutritionTips'];
    for (const field of stringFields) {
      if (rawData[field]) {
        sanitized[field] = String(rawData[field])
          .trim()
          .replace(/[<>]/g, '') // Supprimer les caractères HTML dangereux
          .substring(0, field === 'description' ? 500 : 200); // Limiter la longueur
      }
    }

    // Nettoyer les valeurs numériques
    const numberFields = ['calories', 'protein', 'carbs', 'fats', 'time', 'servings'];
    for (const field of numberFields) {
      if (rawData[field] !== undefined) {
        const value = parseFloat(String(rawData[field]).replace(/[^\d.-]/g, ''));
        sanitized[field] = !isNaN(value) && value >= 0 ? value : 0;
      }
    }

    // Nettoyer les arrays
    const arrayFields = ['ingredients', 'instructions', 'tips', 'tags'];
    for (const field of arrayFields) {
      if (Array.isArray(rawData[field])) {
        sanitized[field] = rawData[field]
          .map(item => String(item).trim())
          .filter(item => item.length > 0)
          .slice(0, field === 'ingredients' ? 20 : 10); // Limiter le nombre d'éléments
      }
    }

    return sanitized;
  }
}

export default NutritionvalidationService;