/**
 * Service d'IA et Personnalisation Simplifié (version démo)
 */

import { debounce } from 'lodash';  // New: For debouncing

class SimpleAIPersonalizationService {
  constructor() {
    this.preferences = new Map();
  }

  async generateMoodBasedRecipes(mood, userId) {
    console.log(`🎭 Génération recettes pour mood "${mood}" (démo)`);
    
    const moodRecipes = {
      'stressé': [
        {
          name: 'Infusion Camomille-Miel',
          moodBenefit: 'Calme et détend le système nerveux',
          ingredients: ['camomille', 'miel', 'citron'],
          instructions: ['Infuser la camomille', 'Ajouter miel et citron'],
          prepTime: 5,
          nutritionHighlights: ['antioxydants', 'propriétés apaisantes']
        },
        {
          name: 'Salade d\'Épinards aux Noix',
          moodBenefit: 'Riche en magnésium anti-stress',
          ingredients: ['épinards frais', 'noix', 'avocat', 'vinaigrette légère'],
          instructions: ['Mélanger épinards et avocat', 'Parsemer de noix', 'Assaisonner'],
          prepTime: 10,
          nutritionHighlights: ['magnésium', 'oméga-3', 'folates']
        }
      ],
      'fatigué': [
        {
          name: 'Smoothie Énergisant',
          moodBenefit: 'Boost naturel d\'énergie',
          ingredients: ['banane', 'épinards', 'spiruline', 'lait d\'amande'],
          instructions: ['Mixer tous les ingrédients', 'Servir immédiatement'],
          prepTime: 5,
          nutritionHighlights: ['fer', 'vitamine B', 'potassium']
        }
      ],
      'triste': [
        {
          name: 'Chocolat Chaud aux Épices',
          moodBenefit: 'Libère des endorphines naturelles',
          ingredients: ['cacao pur', 'lait', 'cannelle', 'miel'],
          instructions: ['Chauffer le lait', 'Ajouter cacao et épices', 'Sucrer avec miel'],
          prepTime: 8,
          nutritionHighlights: ['tryptophane', 'magnésium', 'antioxydants']
        }
      ],
      'énergique': [
        {
          name: 'Salade de Fruits Colorée',
          moodBenefit: 'Maintient l\'énergie positive',
          ingredients: ['fruits de saison', 'menthe fraîche', 'lime'],
          instructions: ['Découper les fruits', 'Ajouter menthe et lime'],
          prepTime: 10,
          nutritionHighlights: ['vitamine C', 'fibres', 'hydratation']
        }
      ]
    };

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return moodRecipes[mood] || moodRecipes['énergique'];
  }

  async generateRecipesFromIngredients(ingredients, userId) {
    console.log('🥘 Génération recettes depuis ingrédients (démo):', ingredients.map(i => i.name));
    
    const availableIngredients = ingredients.map(ing => ing.name.toLowerCase());
    
    // New: Debounced API call for performance
    const debouncedCall = debounce(async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
    }, 300);
    
    await debouncedCall();
    
    return [
      {
        name: 'Création du Chef',
        description: 'Une recette personnalisée avec vos ingrédients',
        availableIngredients: availableIngredients.slice(0, 4),
        additionalIngredients: ['huile d\'olive', 'sel', 'poivre'],
        instructions: [
          'Préparer tous les ingrédients disponibles',
          'Combiner selon votre inspiration culinaire',
          'Assaisonner et cuire selon les besoins',
          'Ajuster les saveurs au goût'
        ],
        cookTime: 25,
        difficulty: 'facile',
        fridgeUsage: 85,
        nutrition: {
          calories: 300,
          protein: 15,
          carbs: 35,
          fat: 12
        },
        // New: Add accessibility labels for IA-generated content
        ariaLabel: `Recette 1: Création du Chef - Une recette personnalisée avec vos ingrédients`,
        role: 'article'
      },
      {
        name: 'Sauté Express',
        description: 'Un plat rapide et savoureux',
        availableIngredients: availableIngredients.slice(1, 5),
        additionalIngredients: ['sauce soja', 'gingembre'],
        instructions: [
          'Chauffer l\'huile dans un wok',
          'Faire sauter les ingrédients par ordre de cuisson',
          'Assaisonner avec la sauce',
          'Servir immédiatement'
        ],
        cookTime: 15,
        difficulty: 'facile',
        fridgeUsage: 90,
        nutrition: {
          calories: 280,
          protein: 18,
          carbs: 25,
          fat: 14
        },
        // New: Add accessibility labels for IA-generated content
        ariaLabel: `Recette 2: Sauté Express - Un plat rapide et savoureux`,
        role: 'article'
      }
    ];
  }

  async analyzeUserPreferences(userId) {
    console.log('👤 Analyse préférences utilisateur (démo)');
    
    return {
      dietaryStyle: 'méditerranéen',
      favoriteIngredients: ['tomates', 'huile d\'olive', 'basilic', 'mozzarella'],
      cuisineTypes: ['italienne', 'française', 'asiatique'],
      cookingSkillLevel: 'intermédiaire',
      timeConstraints: 'repas rapides préférés',
      allergies: [],
      dislikes: ['brocolis', 'champignons'],
      mealTimingPreference: 'régulier',
      budgetRange: 'moyen'
    };
  }

  async personalizeNutritionPlan(userId, currentPlan) {
    console.log('🎯 Personnalisation plan nutritionnel (démo)');
    
    const preferences = await this.analyzeUserPreferences(userId);
    
    return {
      ...currentPlan,
      personalized: true,
      adaptations: [
        'Recettes adaptées au style méditerranéen',
        'Temps de préparation optimisé (< 30min)',
        'Ingrédients favoris intégrés',
        'Alternatives aux ingrédients non appréciés'
      ],
      personalizedRecipes: await this.generatePersonalizedRecipes(preferences),
      confidenceScore: 87
    };
  }

  async generatePersonalizedRecipes(preferences) {
    return [
      {
        name: 'Pasta Méditerranéenne Express',
        adaptedFor: preferences.dietaryStyle,
        cookTime: 20,
        usesFavorites: ['tomates', 'basilic', 'huile d\'olive'],
        avoids: preferences.dislikes
      }
    ];
  }

  async generateAdaptiveRecommendations(userId, context) {
    console.log('🤖 Génération recommandations adaptatives (démo)');
    
    const recommendations = [
      {
        type: 'nutrition',
        priority: 'high',
        title: 'Optimisation protéines',
        description: 'Augmentez vos protéines de 10g au petit-déjeuner',
        reason: 'Amélioration de la satiété matinale détectée',
        action: 'Ajouter un œuf ou 30g de fromage blanc'
      },
      {
        type: 'timing',
        priority: 'medium',
        title: 'Espacement des repas',
        description: 'Attendez 4h entre le déjeuner et le dîner',
        reason: 'Optimisation de la digestion',
        action: 'Planifier une collation si nécessaire'
      },
      {
        type: 'hydration',
        priority: 'low',
        title: 'Rappel hydratation',
        description: 'Buvez un verre d\'eau avant chaque repas',
        reason: 'Amélioration de la satiété',
        action: 'Programmer des rappels'
      }
    ];

    return {
      recommendations,
      adaptationScore: 92,
      generatedAt: new Date().toISOString()
    };
  }
}

export const aiPersonalizationService = new SimpleAIPersonalizationService();
export default aiPersonalizationService;
