/**
 * Service de Meal Planning avec Calendrier Intelligent
 */

import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { mistralService } from './mistralService';
import { fridgeScannerService } from './fridgeScannerService';

class MealPlanningService {
  constructor() {
    this.planTypes = ['weekly', 'biweekly', 'monthly'];
    this.mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    this.dietTypes = ['balanced', 'low_carb', 'high_protein', 'vegetarian', 'vegan', 'keto'];
  }

  /**
   * 📅 GÉNÉRATION DE PLAN DE REPAS INTELLIGENT
   */
  async generateMealPlan(userId, planConfig) {
    try {
      console.log('📅 Génération plan de repas:', planConfig);
      
      // Validation et enrichissement de la configuration
      const enrichedConfig = await this.enrichPlanConfig(userId, planConfig);
      
      // Génération du plan avec IA
      const mealPlan = await this.generatePlanWithAI(enrichedConfig);
      
      // Optimisation automatique
      const optimizedPlan = await this.optimizePlan(mealPlan, enrichedConfig);
      
      // Génération de la liste de courses
      const shoppingList = this.generateShoppingList(optimizedPlan);
      
      // Calcul des métriques nutritionnelles
      const nutritionAnalysis = this.calculatePlanNutrition(optimizedPlan);
      
      // Sauvegarde du plan
      const savedPlan = await this.saveMealPlan(userId, {
        ...optimizedPlan,
        config: enrichedConfig,
        shoppingList,
        nutritionAnalysis,
        generatedAt: new Date().toISOString()
      });
      
      return {
        success: true,
        planId: savedPlan.id,
        mealPlan: optimizedPlan,
        shoppingList,
        nutritionAnalysis,
        recommendations: this.generatePlanRecommendations(optimizedPlan, enrichedConfig),
        calendar: this.generateCalendarView(optimizedPlan)
      };
      
    } catch (error) {
      console.error('❌ Erreur génération meal plan:', error);
      return this.generateFallbackPlan(planConfig);
    }
  }

  /**
   * 🤖 Génération avec IA
   */
  async generatePlanWithAI(config) {
    const prompt = `Tu es un nutritionniste expert. Génère un plan de repas complet et équilibré.

CONFIGURATION:
- Durée: ${config.duration} (${config.startDate} à ${config.endDate})
- Objectif: ${config.goal}
- Régime: ${config.dietType}
- Calories cible: ${config.targetCalories}/jour
- Contraintes: ${config.constraints.join(', ')}
- Allergies: ${config.allergies.join(', ')}
- Préférences: ${config.preferences.join(', ')}
- Budget: ${config.budget}€
- Ingrédients disponibles: ${config.availableIngredients.join(', ')}

EXIGENCES:
- ${config.duration === 'weekly' ? '7 jours' : config.duration === 'biweekly' ? '14 jours' : '30 jours'} de planification
- 4 repas par jour: petit-déjeuner, déjeuner, dîner, collation
- Variété et équilibre nutritionnel
- Utilisation optimale des ingrédients disponibles
- Respect du budget
- Instructions de préparation
- Temps de cuisson réalistes

Format JSON:
{
  "planId": "string",
  "title": "Plan personnalisé",
  "duration": "${config.duration}",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayOfWeek": "lundi",
      "meals": {
        "breakfast": {
          "name": "Nom du repas",
          "description": "Description",
          "ingredients": [{"name": "ingrédient", "quantity": "quantité", "unit": "unité"}],
          "instructions": ["étape 1", "étape 2"],
          "prepTime": minutes,
          "cookTime": minutes,
          "nutrition": {"calories": number, "protein": number, "carbs": number, "fat": number},
          "difficulty": "facile/moyen/difficile",
          "tags": ["tag1", "tag2"],
          "cost": number
        },
        "lunch": { /* même structure */ },
        "dinner": { /* même structure */ },
        "snack": { /* même structure */ }
      },
      "dailyNutrition": {"calories": number, "protein": number, "carbs": number, "fat": number},
      "dailyCost": number,
      "prepTimeTotal": minutes
    }
  ],
  "weeklyNutrition": {"avgCalories": number, "avgProtein": number, "avgCarbs": number, "avgFat": number},
  "totalCost": number,
  "shoppingFrequency": "weekly",
  "mealPrepAdvice": ["conseil 1", "conseil 2"]
}`;

    const aiResponse = await mistralService.generateCustomContent(prompt);
    return aiResponse || this.generateBasicPlan(config);
  }

  /**
   * ⚡ Optimisation automatique du plan
   */
  async optimizePlan(plan, config) {
    console.log('⚡ Optimisation du plan...');
    
    // Optimisation du coût
    plan = this.optimizeCost(plan, config.budget);
    
    // Optimisation nutritionnelle
    plan = this.optimizeNutrition(plan, config);
    
    // Optimisation de la variété
    plan = this.optimizeVariety(plan);
    
    // Optimisation des temps de préparation
    plan = this.optimizePrepTime(plan, config);
    
    return plan;
  }

  /**
   * 🛒 Génération de liste de courses intelligente
   */
  generateShoppingList(plan) {
    const ingredientMap = new Map();
    const shoppingList = {
      totalEstimatedCost: 0,
      categories: {},
      urgentItems: [],
      optionalItems: [],
      budgetAlternatives: {},
      shoppingTips: []
    };

    // Consolider tous les ingrédients
    plan.days?.forEach(day => {
      Object.values(day.meals).forEach(meal => {
        meal.ingredients?.forEach(ingredient => {
          const key = ingredient.name.toLowerCase();
          if (ingredientMap.has(key)) {
            ingredientMap.get(key).totalQuantity += this.parseQuantity(ingredient.quantity);
          } else {
            ingredientMap.set(key, {
              name: ingredient.name,
              totalQuantity: this.parseQuantity(ingredient.quantity),
              unit: ingredient.unit,
              category: this.categorizeIngredient(ingredient.name),
              estimatedPrice: this.estimateIngredientPrice(ingredient.name),
              alternatives: this.getIngredientAlternatives(ingredient.name)
            });
          }
        });
      });
    });

    // Organiser par catégories
    ingredientMap.forEach(ingredient => {
      const category = ingredient.category;
      if (!shoppingList.categories[category]) {
        shoppingList.categories[category] = [];
      }
      
      shoppingList.categories[category].push({
        name: ingredient.name,
        quantity: ingredient.totalQuantity,
        unit: ingredient.unit,
        estimatedPrice: ingredient.estimatedPrice,
        alternatives: ingredient.alternatives
      });
      
      shoppingList.totalEstimatedCost += ingredient.estimatedPrice;
    });

    // Identifier items urgents vs optionnels
    Object.values(shoppingList.categories).flat().forEach(item => {
      if (this.isEssentialIngredient(item.name)) {
        shoppingList.urgentItems.push(item);
      } else {
        shoppingList.optionalItems.push(item);
      }
    });

    // Générer conseils shopping
    shoppingList.shoppingTips = this.generateShoppingTips(shoppingList);
    
    return shoppingList;
  }

  /**
   * 📊 Calcul nutrition complète du plan
   */
  calculatePlanNutrition(plan) {
    const analysis = {
      daily: [],
      weekly: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      balance: {},
      recommendations: []
    };

    plan.days?.forEach(day => {
      const dayNutrition = {
        date: day.date,
        meals: {},
        total: { calories: 0, protein: 0, carbs: 0, fat: 0 }
      };

      Object.entries(day.meals).forEach(([mealType, meal]) => {
        dayNutrition.meals[mealType] = meal.nutrition;
        dayNutrition.total.calories += meal.nutrition.calories || 0;
        dayNutrition.total.protein += meal.nutrition.protein || 0;
        dayNutrition.total.carbs += meal.nutrition.carbs || 0;
        dayNutrition.total.fat += meal.nutrition.fat || 0;
      });

      analysis.daily.push(dayNutrition);
      
      // Ajouter au total hebdomadaire
      analysis.weekly.calories += dayNutrition.total.calories;
      analysis.weekly.protein += dayNutrition.total.protein;
      analysis.weekly.carbs += dayNutrition.total.carbs;
      analysis.weekly.fat += dayNutrition.total.fat;
    });

    // Calculer moyennes
    const days = plan.days?.length || 1;
    analysis.averageDaily = {
      calories: Math.round(analysis.weekly.calories / days),
      protein: Math.round(analysis.weekly.protein / days),
      carbs: Math.round(analysis.weekly.carbs / days),
      fat: Math.round(analysis.weekly.fat / days)
    };

    // Analyser l'équilibre
    analysis.balance = this.analyzeNutritionalBalance(analysis.averageDaily);
    
    // Générer recommandations
    analysis.recommendations = this.generateNutritionRecommendations(analysis);

    return analysis;
  }

  /**
   * 📱 Vue calendrier interactive
   */
  generateCalendarView(plan) {
    return {
      viewType: 'calendar',
      weeks: this.groupDaysByWeeks(plan.days),
      navigation: {
        currentWeek: 0,
        totalWeeks: Math.ceil(plan.days?.length / 7) || 1
      },
      dayViews: plan.days?.map(day => ({
        date: day.date,
        dayName: day.dayOfWeek,
        meals: this.formatMealsForCalendar(day.meals),
        nutritionSummary: day.dailyNutrition,
        prepTime: day.prepTimeTotal,
        difficulty: this.calculateDayDifficulty(day.meals),
        cost: day.dailyCost
      })),
      quickActions: {
        regenerateDay: true,
        swapMeals: true,
        addToFavorites: true,
        adjustPortions: true
      }
    };
  }

  // === MÉTHODES D'OPTIMISATION ===

  optimizeCost(plan, budget) {
    const dailyBudget = budget / (plan.days?.length || 7);
    
    plan.days?.forEach(day => {
      if (day.dailyCost > dailyBudget * 1.1) { // 10% de marge
        // Remplacer les ingrédients chers par des alternatives
        Object.values(day.meals).forEach(meal => {
          meal.ingredients = meal.ingredients?.map(ingredient => {
            const alternative = this.findCheaperAlternative(ingredient);
            return alternative || ingredient;
          });
        });
        
        // Recalculer le coût
        day.dailyCost = this.calculateDayCost(day.meals);
      }
    });
    
    return plan;
  }

  optimizeNutrition(plan, config) {
    const targetCalories = config.targetCalories;
    
    plan.days?.forEach(day => {
      const currentCalories = day.dailyNutrition?.calories || 0;
      const deviation = Math.abs(currentCalories - targetCalories) / targetCalories;
      
      if (deviation > 0.15) { // Plus de 15% d'écart
        // Ajuster les portions
        const adjustmentFactor = targetCalories / currentCalories;
        this.adjustMealPortions(day.meals, adjustmentFactor);
        
        // Recalculer la nutrition
        day.dailyNutrition = this.calculateDayNutrition(day.meals);
      }
    });
    
    return plan;
  }

  optimizeVariety(plan) {
    const ingredientFrequency = new Map();
    
    // Analyser la fréquence des ingrédients
    plan.days?.forEach(day => {
      Object.values(day.meals).forEach(meal => {
        meal.ingredients?.forEach(ingredient => {
          const name = ingredient.name.toLowerCase();
          ingredientFrequency.set(name, (ingredientFrequency.get(name) || 0) + 1);
        });
      });
    });
    
    // Identifier les ingrédients sur-utilisés
    const overusedIngredients = Array.from(ingredientFrequency.entries())
      .filter(([name, frequency]) => frequency > (plan.days?.length || 7) * 0.5)
      .map(([name]) => name);
    
    // Remplacer certaines occurrences par des variantes
    if (overusedIngredients.length > 0) {
      plan = this.replaceOverusedIngredients(plan, overusedIngredients);
    }
    
    return plan;
  }

  optimizePrepTime(plan, config) {
    const maxDailyPrepTime = config.maxPrepTime || 120; // 2h par défaut
    
    plan.days?.forEach(day => {
      if (day.prepTimeTotal > maxDailyPrepTime) {
        // Simplifier les repas les plus complexes
        const meals = Object.entries(day.meals)
          .sort(([,a], [,b]) => (b.prepTime + b.cookTime) - (a.prepTime + a.cookTime));
        
        // Remplacer le repas le plus long par une version simplifiée
        const [mealType, meal] = meals[0];
        day.meals[mealType] = this.simplifyCooking(meal);
        
        // Recalculer le temps total
        day.prepTimeTotal = this.calculateTotalPrepTime(day.meals);
      }
    });
    
    return plan;
  }

  // === MÉTHODES UTILITAIRES ===

  async enrichPlanConfig(userId, config) {
    // Récupérer le profil utilisateur
    const userProfile = await this.getUserProfile(userId);
    
    // Récupérer les ingrédients disponibles (du dernier scan frigo)
    const availableIngredients = await this.getAvailableIngredients(userId);
    
    // Récupérer les préférences alimentaires
    const preferences = await this.getUserPreferences(userId);
    
    return {
      ...config,
      userProfile,
      availableIngredients: availableIngredients || [],
      preferences: preferences || [],
      targetCalories: config.targetCalories || this.calculateTargetCalories(userProfile),
      constraints: config.constraints || [],
      allergies: config.allergies || [],
      budget: config.budget || 50, // Budget par défaut
      maxPrepTime: config.maxPrepTime || 120
    };
  }

  async saveMealPlan(userId, planData) {
    try {
      const docRef = await addDoc(collection(db, 'mealPlans'), {
        userId,
        ...planData,
        createdAt: new Date(),
        active: true
      });
      
      return { id: docRef.id, ...planData };
    } catch (error) {
      console.error('❌ Erreur sauvegarde meal plan:', error);
      throw error;
    }
  }

  parseQuantity(quantityStr) {
    // Parser "2 cuillères", "150g", "1 tasse", etc.
    const number = parseFloat(quantityStr) || 1;
    return number;
  }

  categorizeIngredient(ingredientName) {
    const categories = {
      'fruits': ['pomme', 'banane', 'orange', 'fraise'],
      'légumes': ['carotte', 'tomate', 'épinard', 'brocoli'],
      'protéines': ['poulet', 'œuf', 'poisson', 'tofu'],
      'féculents': ['riz', 'pâtes', 'pain', 'pomme de terre'],
      'produits laitiers': ['lait', 'fromage', 'yaourt'],
      'épices': ['sel', 'poivre', 'basilic', 'thym']
    };
    
    const name = ingredientName.toLowerCase();
    for (const [category, items] of Object.entries(categories)) {
      if (items.some(item => name.includes(item))) {
        return category;
      }
    }
    return 'autres';
  }

  estimateIngredientPrice(ingredientName) {
    // Prix estimatifs en euros
    const priceMap = {
      'poulet': 8.0,
      'saumon': 15.0,
      'œuf': 3.0,
      'lait': 1.2,
      'fromage': 5.0,
      'riz': 2.0,
      'pâtes': 1.5,
      'tomate': 3.0,
      'carotte': 2.0,
      'pomme': 3.0
    };
    
    const name = ingredientName.toLowerCase();
    for (const [item, price] of Object.entries(priceMap)) {
      if (name.includes(item)) {
        return price;
      }
    }
    return 2.5; // Prix par défaut
  }

  generateBasicPlan(config) {
    // Plan de base en cas d'échec de l'IA
    return {
      planId: `basic_${Date.now()}`,
      title: 'Plan nutritionnel de base',
      duration: config.duration,
      days: this.generateBasicDays(config),
      generated: 'fallback'
    };
  }

  generateFallbackPlan(config) {
    return {
      success: false,
      error: 'Erreur de génération du plan',
      fallbackPlan: this.generateBasicPlan(config),
      suggestions: [
        'Vérifiez votre connexion internet',
        'Essayez avec des paramètres simplifiés',
        'Contactez le support si le problème persiste'
      ]
    };
  }

  async getUserProfile(userId) {
    // Récupérer depuis localStorage ou Firestore
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : {};
    } catch {
      return {};
    }
  }

  async getAvailableIngredients(userId) {
    // Récupérer depuis le dernier scan frigo
    return [];
  }

  async getUserPreferences(userId) {
    // Récupérer préférences alimentaires
    return [];
  }

  calculateTargetCalories(userProfile) {
    // Calcul basé sur le profil utilisateur
    const baseCalories = 2000;
    const goal = userProfile.goal;
    
    if (goal === 'lose_weight') return baseCalories - 300;
    if (goal === 'gain_weight') return baseCalories + 300;
    return baseCalories;
  }
}

export const mealPlanningService = new MealPlanningService();
export default mealPlanningService;