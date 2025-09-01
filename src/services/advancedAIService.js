/**
 * Service IA Avancée pour fonctionnalités intelligentes
 */

import { mistralService } from './mistralService';
import { JSONParsingUtils } from '../utils/JSONParsingUtils';

class AdvancedAIService {
  constructor() {
    this.mistralService = mistralService;
    this.userPreferences = new Map();
    this.moodHistory = new Map();
    this.seasonalIngredients = this.initSeasonalData();
  }

  // === Contexte profil et alignement objectif ===
  buildProfileContext(userProfile = {}) {
    const goal = userProfile.goal || 'maintain';
    const gender = userProfile.gender || 'non spécifié';
    const age = userProfile.age || 'NA';
    const weight = userProfile.weight || 'NA';
    const height = userProfile.height || 'NA';
    const activity = userProfile.activityLevel || 'modéré';
    const diet = userProfile.dietType || 'omnivore';
    return `Objectif: ${goal}\nGenre: ${gender}\nÂge: ${age}\nPoids: ${weight}kg\nTaille: ${height}cm\nActivité: ${activity}\nRégime: ${diet}`;
  }

  getGoalGuidelines(goal = 'maintain', userProfile = {}) {
    const weight = Number(userProfile.weight || 70);
    const proteinPerKg = goal === 'gain_muscle' ? 1.6 : goal === 'lose_weight' ? 1.5 : 1.2;
    const proteinTarget = Math.round(proteinPerKg * weight);
    const perMealProtein = Math.max(20, Math.round(proteinTarget / 3));
    const calorieRanges = {
      gain_muscle: [500, 800],
      lose_weight: [300, 550],
      maintain: [400, 700],
    };
    const range = calorieRanges[goal] || calorieRanges.maintain;
    return { perMealProtein, calorieRange: range };
  }

  scoreRecipeForGoal(recipe, goal = 'maintain', userProfile = {}) {
    const { perMealProtein, calorieRange } = this.getGoalGuidelines(goal, userProfile);
    const protein = Number(recipe?.protein || 0);
    const calories = Number(recipe?.calories || 0);
    const proteinScore = Math.max(0, Math.min(60, ((protein - perMealProtein) / perMealProtein) * 60 + 30));
    const [minC, maxC] = calorieRange;
    let calScore = 0;
    if (calories >= minC && calories <= maxC) {
      calScore = 40;
    } else if (calories > 0) {
      const dist = calories < minC ? (minC - calories) : (calories - maxC);
      const scale = Math.max(minC, 1);
      calScore = Math.max(0, 40 - (dist / scale) * 40);
    }
    return Math.round(Math.max(0, Math.min(100, proteinScore + calScore)));
  }

  adaptRecipesToGoal(recipes = [], userProfile = {}) {
    const goal = userProfile.goal || 'maintain';
    const scored = (recipes || []).map(r => ({ ...r, goalFitScore: this.scoreRecipeForGoal(r, goal, userProfile) }));
    scored.sort((a, b) => (b.goalFitScore || 0) - (a.goalFitScore || 0));
    return scored;
  }

  /**
   * 📸 SCANNER DE FRIGO - Photo → Recettes
   */
  async scanFridgeAndGenerateRecipes(imageData, userProfile) {
    try {
      console.log('📸 Analyse du frigo en cours...');
      
      // Simulation d'analyse d'image (à remplacer par un vrai service de vision)
      const detectedIngredients = await this.mockImageAnalysis(imageData);
      
      const prompt = `Tu es un chef IA. Analyse ces ingrédients disponibles et crée 3 recettes créatives et nutritives.

INGRÉDIENTS DÉTECTÉS: ${detectedIngredients.join(', ')}

PROFIL UTILISATEUR:
${this.buildProfileContext(userProfile)}

Contraintes:
- Utiliser UNIQUEMENT les ingrédients détectés
- Éviter le gaspillage alimentaire
- Adapter au profil nutritionnel et à l'objectif
- Temps de préparation raisonnable

Format JSON:
[
  {
    "name": "Nom créatif",
    "description": "Description appétissante",
    "ingredients": [{"name": "ingredient", "quantity": "quantité", "fromFridge": true}],
    "instructions": ["étape 1", "étape 2"],
    "calories": number,
    "protein": number,
    "cookTime": number
  }
]`;

      const content = await this.mistralService.generateCustomContent(prompt, { response_format: 'json' });
      const parsed = JSONParsingUtils.safeJSONParse(content, []);
      const recipes = JSONParsingUtils.normalizeRecipes(parsed);
      
      return {
        detectedIngredients: (detectedIngredients || []).map(name => ({ name, quantity: '' })),
        recipes: this.adaptRecipesToGoal(recipes, userProfile),
        wasteReduction: this.calculateWasteReduction?.(detectedIngredients) || 0
      };
      
    } catch (error) {
      console.error('❌ Erreur scanner frigo:', error);
      return this.getFridgeScanFallback();
    }
  }

  /**
   * 😊 RECETTES PAR MOOD - "Je me sens fatigué" → recettes énergisantes
   */
  async generateMoodBasedRecipes(mood, userProfile, context = {}) {
    try {
      const moodMap = {
        'tired': {
          focus: 'énergisantes, riches en fer et vitamines B',
          avoid: 'sucres rapides, aliments lourds',
          boost: 'épinards, quinoa, avoine, fruits rouges'
        },
        'stressed': {
          focus: 'apaisantes, riches en magnésium et oméga-3',
          avoid: 'caféine excessive, sucre',
          boost: 'saumon, amandes, chocolat noir, camomille'
        },
        'happy': {
          focus: 'colorées et festives',
          avoid: 'rien de particulier',
          boost: 'fruits colorés, herbes fraîches'
        },
        'sad': {
          focus: 'réconfortantes et nutritives',
          avoid: 'aliments transformés',
          boost: 'légumineuses, légumes racines, épices chaudes'
        }
      };

      const moodProfile = moodMap[mood] || moodMap['happy'];
      
      const prompt = `Tu es un chef-nutritionniste spécialisé en food mood. Crée 3 recettes pour quelqu'un qui se sent ${mood}.

OBJECTIF MOOD: ${moodProfile.focus}
INGRÉDIENTS BOOST: ${moodProfile.boost}
À ÉVITER: ${moodProfile.avoid}

PROFIL UTILISATEUR:
${this.buildProfileContext(userProfile)}

Chaque recette doit:
- Améliorer l'humeur naturellement
- Être alignée avec l'objectif (calories et protéines adaptées)
- Apporter les nutriments manquants pour ce mood

Format JSON identique aux autres recettes (avec champ optionnel "moodBenefits").`;

      const content = await this.mistralService.generateCustomContent(prompt, { response_format: 'json' });
      const parsed = JSONParsingUtils.safeJSONParse(content, []);
      const recipes = JSONParsingUtils.normalizeRecipes(parsed);
      
      // Sauvegarder dans l'historique mood
      this.saveMoodHistory(userProfile.userId, mood, context);
      
      return {
        mood,
        recipes: this.adaptRecipesToGoal(recipes, userProfile),
        moodInsights: this.getMoodInsights?.(userProfile.userId),
        recommendations: this.getMoodRecommendations?.(mood)
      };
      
    } catch (error) {
      console.error('❌ Erreur génération mood recipes:', error);
      return this.getMoodFallback(mood);
    }
  }

  /**
   * 💰 RECETTES PAR BUDGET - "J'ai 15€ pour la semaine"
   */
  async generateBudgetRecipes(budget, duration, userProfile) {
    try {
      const budgetPerDay = budget / duration;
      
      const prompt = `Tu es un expert en nutrition économique. Crée un plan repas complet.

BUDGET TOTAL: ${budget}€ pour ${duration} jours (${budgetPerDay.toFixed(2)}€/jour)

PROFIL UTILISATEUR:
${this.buildProfileContext(userProfile)}

Contraintes strictes:
- Respecter le budget absolu
- Maximiser la nutrition par euro dépensé
- Ingrédients de base polyvalents
- Minimiser le gaspillage
- Adapter calories/protéines à l'objectif

Crée 5 recettes économiques avec:
- Coût estimé par portion
- Rendement (nb portions)
- Valeur nutritionnelle (calories, protéines)
- Instructions de conservation

Format JSON avec champs: "estimatedCost", "servings", "costPerServing", "nutritionScore".`;

      const content = await this.mistralService.generateCustomContent(prompt, { response_format: 'json' });
      const parsed = JSONParsingUtils.safeJSONParse(content, []);
      const recipes = JSONParsingUtils.normalizeRecipes(parsed);
      
      return {
        budget,
        duration,
        budgetPerDay,
        recipes: this.adaptRecipesToGoal(recipes, userProfile)
      };
      
    } catch (error) {
      console.error('❌ Erreur budget recipes:', error);
      return this.getBudgetFallback(budget, duration);
    }
  }

  /**
   * 🌱 ADAPTATION ALLERGIES - Remplacement automatique
   */
  async adaptRecipeForAllergies(recipe, allergies, preferences = {}) {
    try {
      const prompt = `Tu es un chef spécialisé en adaptations alimentaires. Adapte cette recette.

RECETTE ORIGINALE: ${JSON.stringify(recipe, null, 2)}
ALLERGIES/INTOLÉRANCES: ${allergies.join(', ')}
PRÉFÉRENCES: ${JSON.stringify(preferences)}

Tâches:
1. Identifier tous les ingrédients problématiques
2. Proposer des substituts équivalents nutritionnellement
3. Ajuster les quantités et la préparation si nécessaire
4. Maintenir le goût et la texture autant que possible

Format JSON avec recette adaptée + champ "substitutions" détaillant chaque remplacement.`;

      const adaptedRecipe = await this.mistralService.generateCustomContent(prompt);
      
      return {
        originalRecipe: recipe,
        adaptedRecipe: adaptedRecipe || recipe,
        substitutions: this.extractSubstitutions(adaptedRecipe),
        nutritionComparison: this.compareNutrition(recipe, adaptedRecipe),
        allergySafety: this.validateAllergySafety(adaptedRecipe, allergies)
      };
      
    } catch (error) {
      console.error('❌ Erreur adaptation allergies:', error);
      return { originalRecipe: recipe, adaptedRecipe: recipe, error: error.message };
    }
  }

  /**
   * 🍂 RECETTES SAISONNIÈRES - Fruits/légumes de saison automatiques
   */
  async generateSeasonalRecipes(userProfile, season = null) {
    try {
      const currentSeason = season || this.getCurrentSeason();
      const seasonalIngredients = this.seasonalIngredients[currentSeason];
      
      const prompt = `Tu es un chef spécialisé en cuisine de saison. Crée 4 recettes ${currentSeason}.

INGRÉDIENTS DE SAISON: ${seasonalIngredients.fruits.join(', ')}, ${seasonalIngredients.vegetables.join(', ')}
PROFIL: ${userProfile.goal}, ${userProfile.dietType || 'omnivore'}

Contraintes:
- Utiliser principalement des ingrédients de saison
- Mettre en valeur les saveurs typiques de ${currentSeason}
- Optimiser les apports nutritionnels saisonniers
- Techniques de cuisson adaptées à la saison

Format JSON standard avec champs: "seasonalIngredients", "seasonalBenefits", "seasonScore".`;

      const recipes = await this.mistralService.generateCustomContent(prompt);
      
      return {
        season: currentSeason,
        seasonalIngredients,
        recipes: recipes || [],
        nutritionBenefits: this.getSeasonalNutritionBenefits(currentSeason),
        shoppingGuide: this.getSeasonalShoppingGuide(currentSeason),
        preservationTips: this.getPreservationTips(seasonalIngredients)
      };
      
    } catch (error) {
      console.error('❌ Erreur recettes saisonnières:', error);
      return this.getSeasonalFallback();
    }
  }

  /**
   * 🤖 COACH IA PERSONNEL - Analyse des habitudes
   */
  async generatePersonalizedAdvice(userProfile, nutritionHistory, activityData) {
    try {
      const analysisPrompt = `Tu es un coach nutritionnel IA. Analyse les données et donne des conseils personnalisés.

PROFIL: ${JSON.stringify(userProfile)}
HISTORIQUE NUTRITION (7 derniers jours): ${JSON.stringify(nutritionHistory.slice(-7))}
DONNÉES ACTIVITÉ: ${JSON.stringify(activityData)}

Analyse:
1. Tendances nutritionnelles (manques/excès)
2. Corrélations alimentation/performance
3. Progression vers les objectifs
4. Points d'amélioration prioritaires

Fournis:
- 3 conseils d'action immédiate
- Ajustements du plan nutritionnel
- Prédiction objectifs (timeline réaliste)
- Alertes santé si nécessaire

Format JSON avec sections: "analysis", "actionableAdvice", "nutritionAdjustments", "predictions", "alerts".`;

      const advice = await this.mistralService.generateCustomContent(analysisPrompt);
      
      return {
        userId: userProfile.userId,
        timestamp: new Date().toISOString(),
        advice: advice || {},
        confidenceScore: this.calculateAdviceConfidence(nutritionHistory),
        nextReviewDate: this.getNextReviewDate(userProfile),
        trackingRecommendations: this.getTrackingRecommendations(userProfile)
      };
      
    } catch (error) {
      console.error('❌ Erreur coach IA:', error);
      return this.getCoachFallback();
    }
  }

  // === MÉTHODES UTILITAIRES ===

  async mockImageAnalysis(imageData) {
    // Simulation - à remplacer par un vrai service de vision
    const commonIngredients = [
      'œufs', 'lait', 'fromage', 'yaourt', 'beurre',
      'poulet', 'jambon', 'saumon',
      'tomates', 'salade', 'carottes', 'courgettes', 'oignons',
      'pommes', 'bananes', 'citrons',
      'riz', 'pâtes', 'pain', 'pommes de terre'
    ];
    
    // Simuler la détection de 5-8 ingrédients
    const detected = [];
    for (let i = 0; i < Math.floor(Math.random() * 4) + 5; i++) {
      const ingredient = commonIngredients[Math.floor(Math.random() * commonIngredients.length)];
      if (!detected.includes(ingredient)) {
        detected.push(ingredient);
      }
    }
    
    return detected;
  }

  initSeasonalData() {
    return {
      'spring': {
        fruits: ['fraises', 'rhubarbe', 'abricots', 'cerises'],
        vegetables: ['asperges', 'petits pois', 'radis', 'épinards', 'artichauts'],
        herbs: ['ciboulette', 'persil', 'estragon']
      },
      'summer': {
        fruits: ['tomates', 'pêches', 'melons', 'pastèques', 'prunes'],
        vegetables: ['courgettes', 'aubergines', 'poivrons', 'concombres', 'haricots verts'],
        herbs: ['basilic', 'menthe', 'origan']
      },
      'autumn': {
        fruits: ['pommes', 'poires', 'raisins', 'figues', 'châtaignes'],
        vegetables: ['potirons', 'champignons', 'choux', 'poireaux', 'betteraves'],
        herbs: ['thym', 'romarin', 'sauge']
      },
      'winter': {
        fruits: ['oranges', 'mandarines', 'pomelos', 'kiwis'],
        vegetables: ['choux de Bruxelles', 'endives', 'panais', 'topinambours', 'mâche'],
        herbs: ['laurier', 'persil plat']
      }
    };
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  saveMoodHistory(userId, mood, context) {
    if (!this.moodHistory.has(userId)) {
      this.moodHistory.set(userId, []);
    }
    
    this.moodHistory.get(userId).push({
      timestamp: new Date().toISOString(),
      mood,
      context,
      // Limiter à 30 dernières entrées
    });
    
    // Garder seulement les 30 dernières entrées
    const history = this.moodHistory.get(userId);
    if (history.length > 30) {
      this.moodHistory.set(userId, history.slice(-30));
    }
  }

  // === FALLBACKS ===

  getFridgeScanFallback() {
    return {
      detectedIngredients: [
        { name: 'œufs', quantity: '3' },
        { name: 'lait', quantity: '200ml' },
        { name: 'tomates', quantity: '2' },
        { name: 'fromage', quantity: '50g' }
      ],
      recipes: [
        {
          name: 'Omelette aux tomates et fromage',
          description: 'Omelette simple et nutritive avec les ingrédients de base',
          ingredients: [
            { name: 'œufs', quantity: '3', fromFridge: true },
            { name: 'tomates', quantity: '2', fromFridge: true },
            { name: 'fromage', quantity: '50g', fromFridge: true }
          ],
          instructions: ['Battre les œufs', 'Cuire l\'omelette', 'Ajouter tomates et fromage'],
          calories: 320,
          protein: 22,
          cookTime: 10
        }
      ],
      wasteReduction: 85,
      suggestions: ['Ajouter des légumes verts', 'Herbes fraîches pour plus de saveur']
    };
  }

  getMoodFallback(mood) {
    return {
      mood,
      recipes: [
        {
          name: `Recette réconfortante pour mood ${mood}`,
          description: 'Recette adaptée à votre humeur du moment',
          calories: 400,
          protein: 25,
          moodBenefits: 'Apporte réconfort et équilibre nutritionnel'
        }
      ],
      moodInsights: 'Données insuffisantes pour analyse approfondie',
      recommendations: ['Boire plus d\'eau', 'Faire une pause', 'Manger lentement']
    };
  }

  getBudgetFallback(budget, duration) {
    return {
      budget,
      duration,
      budgetPerDay: budget / duration,
      recipes: [
        {
          name: 'Riz aux légumes économique',
          estimatedCost: 2.5,
          servings: 4,
          costPerServing: 0.63,
          nutritionScore: 75
        }
      ],
      tips: ['Acheter en gros', 'Utiliser les légumineuses', 'Éviter le gaspillage']
    };
  }

  getSeasonalFallback() {
    const currentSeason = this.getCurrentSeason();
    return {
      season: currentSeason,
      seasonalIngredients: this.seasonalIngredients[currentSeason],
      recipes: [
        {
          name: `Plat de saison ${currentSeason}`,
          description: `Recette typique de ${currentSeason}`,
          seasonScore: 85
        }
      ]
    };
  }

  getCoachFallback() {
    return {
      advice: {
        analysis: 'Analyse en cours - plus de données nécessaires',
        actionableAdvice: [
          'Maintenir une alimentation équilibrée',
          'Boire suffisamment d\'eau',
          'Écouter sa faim'
        ]
      },
      confidenceScore: 30
    };
  }
}

export const advancedAIService = new AdvancedAIService();
export default advancedAIService;
