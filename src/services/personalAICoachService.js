/**
 * Service Coach IA Personnel
 * Analyse les habitudes, donne des conseils personnalisés et fait des prédictions
 */

import { nutritionFirestoreService } from './nutritionFirestoreService';
import { mistralService } from './mistralNutritionService';

class PersonalAICoachService {
  constructor() {
    this.userHabits = new Map(); // Cache des habitudes utilisateur
    this.predictionModels = new Map(); // Modèles de prédiction par utilisateur
    
    // Règles nutritionnelles de base
    this.nutritionRules = {
      dailyVegetables: 5, // portions par jour
      dailyWater: 2000, // ml
      maxSugar: 50, // g par jour
      minProtein: 1.2, // g par kg de poids
      maxSodium: 2300 // mg par jour
    };
  }

  /**
   * CONSEILLER NUTRITIONNEL - Analyse des habitudes
   */
  async analyzeNutritionalHabits(userId, timeframe = 'week') {
    try {
      console.log(`🧠 Analyse habitudes nutritionnelles: ${userId} (${timeframe})`);
      
      // Récupérer l'historique des repas
      const mealHistory = await this.getMealHistory(userId, timeframe);
      const userProfile = await this.getUserProfile(userId);
      
      // Analyser les patterns
      const analysis = {
        summary: await this.generateNutritionalSummary(mealHistory, userProfile),
        patterns: this.identifyEatingPatterns(mealHistory),
        deficiencies: this.identifyNutritionalGaps(mealHistory, userProfile),
        strengths: this.identifyNutritionalStrengths(mealHistory),
        recommendations: await this.generatePersonalizedRecommendations(mealHistory, userProfile),
        score: this.calculateNutritionalScore(mealHistory, userProfile)
      };
      
      // Sauvegarder l'analyse
      await this.saveNutritionalAnalysis(userId, analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('❌ Erreur analyse habitudes:', error);
      throw error;
    }
  }

  /**
   * RAPPELS INTELLIGENTS - Notifications contextuelles
   */
  async generateIntelligentReminders(userId) {
    try {
      console.log(`🔔 Génération rappels intelligents: ${userId}`);
      
      const todayMeals = await this.getTodayMeals(userId);
      const userProfile = await this.getUserProfile(userId);
      const currentTime = new Date();
      
      const reminders = [];
      
      // Analyser les manques du jour
      const todayAnalysis = this.analyzeTodayIntake(todayMeals, userProfile);
      
      // Rappel légumes
      if (todayAnalysis.vegetables < 3 && currentTime.getHours() >= 16) {
        reminders.push({
          type: 'nutrition',
          priority: 'medium',
          message: `Tu n'as mangé que ${todayAnalysis.vegetables} portions de légumes aujourd'hui. Que dirais-tu d'une salade ce soir ? 🥗`,
          suggestions: await this.suggestVegetableRecipes(userProfile),
          icon: '🥬'
        });
      }
      
      // Rappel hydratation
      if (todayAnalysis.water < 1500 && currentTime.getHours() >= 14) {
        reminders.push({
          type: 'hydration',
          priority: 'high',
          message: `N'oublie pas de t'hydrater ! Tu n'as bu que ${todayAnalysis.water}ml aujourd'hui. 💧`,
          suggestions: ['Ajouter du citron à ton eau', 'Infusion de fruits', 'Eau pétillante'],
          icon: '💧'
        });
      }
      
      // Rappel protéines
      if (todayAnalysis.protein < userProfile.weight * 1.2) {
        reminders.push({
          type: 'protein',
          priority: 'medium',
          message: `Il te manque ${Math.round(userProfile.weight * 1.2 - todayAnalysis.protein)}g de protéines aujourd'hui. 💪`,
          suggestions: await this.suggestProteinSources(userProfile),
          icon: '🥩'
        });
      }
      
      // Rappel timing des repas
      const lastMealTime = this.getLastMealTime(todayMeals);
      const hoursSinceLastMeal = (currentTime - lastMealTime) / (1000 * 60 * 60);
      
      if (hoursSinceLastMeal > 4) {
        reminders.push({
          type: 'timing',
          priority: 'medium',
          message: `Cela fait ${Math.round(hoursSinceLastMeal)}h que tu n'as pas mangé. Il est temps de prendre une collation ! ⏰`,
          suggestions: await this.suggestHealthySnacks(userProfile),
          icon: '🍎'
        });
      }
      
      return reminders;
      
    } catch (error) {
      console.error('❌ Erreur rappels intelligents:', error);
      throw error;
    }
  }

  /**
   * PRÉDICTION DES ENVIES - Anticiper les fringales
   */
  async predictCravingsAndSuggestAlternatives(userId) {
    try {
      console.log(`🔮 Prédiction des envies: ${userId}`);
      
      const userHabits = await this.getUserHabits(userId);
      const currentContext = await this.getCurrentContext(userId);
      
      // Modèle de prédiction basé sur l'historique
      const predictions = this.analyzeCravingPatterns(userHabits, currentContext);
      
      const results = {
        likelyCravings: [],
        preventiveActions: [],
        healthyAlternatives: [],
        contextualFactors: currentContext
      };
      
      // Prédictions par contexte
      if (currentContext.timeOfDay === 'afternoon' && currentContext.stress > 6) {
        results.likelyCravings.push({
          type: 'sugar',
          likelihood: predictions.sugarCraving,
          reason: 'Stress élevé en fin d\'après-midi',
          typicalChoice: 'Snacks sucrés, chocolat'
        });
        
        results.healthyAlternatives.push({
          for: 'sugar',
          alternatives: await this.suggestHealthySweetAlternatives(userHabits.preferences),
          benefits: 'Énergie stable sans pic de glycémie'
        });
      }
      
      if (currentContext.timeOfDay === 'evening' && currentContext.boredom > 5) {
        results.likelyCravings.push({
          type: 'salty',
          likelihood: predictions.saltyCraving,
          reason: 'Ennui en soirée',
          typicalChoice: 'Chips, crackers'
        });
        
        results.healthyAlternatives.push({
          for: 'salty',
          alternatives: await this.suggestHealthySaltyAlternatives(userHabits.preferences),
          benefits: 'Satisfaction sans calories vides'
        });
      }
      
      // Actions préventives
      if (results.likelyCravings.length > 0) {
        results.preventiveActions = [
          'Boire un grand verre d\'eau',
          'Faire 5 minutes de respiration',
          'Prendre l\'air 10 minutes',
          'Mâcher un chewing-gum sans sucre'
        ];
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Erreur prédiction envies:', error);
      throw error;
    }
  }

  /**
   * COACHING PERSONNALISÉ - Conseils adaptatifs
   */
  async generatePersonalizedCoaching(userId, goal = 'general') {
    try {
      console.log(`👨‍🏫 Coaching personnalisé: ${userId} (${goal})`);
      
      const userProfile = await this.getUserProfile(userId);
      const recentAnalysis = await this.getRecentNutritionalAnalysis(userId);
      const progress = await this.calculateProgress(userId, goal);
      
      const coaching = {
        personalizedMessage: '',
        actionPlan: [],
        motivationalTips: [],
        warnings: [],
        celebrations: [],
        nextSteps: []
      };
      
      // Message personnalisé selon les progrès
      if (progress.trend === 'improving') {
        coaching.personalizedMessage = `Excellent travail ${userProfile.displayName} ! Tu es sur la bonne voie pour atteindre tes objectifs. 🎯`;
        coaching.celebrations.push(`Tu as amélioré ton score nutritionnel de ${progress.improvement}% cette semaine !`);
      } else if (progress.trend === 'stagnating') {
        coaching.personalizedMessage = `Je vois que tu stagnes un peu. Ne t'inquiète pas, c'est normal ! Voici comment relancer ta progression. 💪`;
      } else {
        coaching.personalizedMessage = `Je remarque quelques difficultés récentes. Reprenons ensemble les bases pour repartir du bon pied. 🌱`;
      }
      
      // Plan d'action selon l'objectif
      coaching.actionPlan = await this.generateActionPlan(userProfile, recentAnalysis, goal);
      
      // Tips motivationnels personnalisés
      coaching.motivationalTips = this.generateMotivationalTips(userProfile, progress);
      
      // Avertissements si nécessaire
      if (recentAnalysis.score < 60) {
        coaching.warnings.push('Score nutritionnel en baisse - concentrons-nous sur les bases');
      }
      
      // Prochaines étapes
      coaching.nextSteps = await this.defineNextSteps(userProfile, recentAnalysis, goal);
      
      return coaching;
      
    } catch (error) {
      console.error('❌ Erreur coaching personnalisé:', error);
      throw error;
    }
  }

  /**
   * Nouveau: Génère des conseils personnalisés à partir d'habitudes saisies par l'utilisateur
   */
  async generateCoachingFromHabits(userId, userProfile = {}, habits = {}, locale = 'fr') {
    try {
      const profile = await this.getUserProfile(userId);
      const mergedProfile = { ...profile, ...userProfile };
      const lang = (locale || 'fr').startsWith('en') ? 'en' : 'fr';

      const sysIntro = lang === 'en'
        ? 'You are an experienced fitness and nutrition coach. Produce concise, practical, safe advice.'
        : 'Tu es un coach expert en musculation et nutrition. Fournis des conseils concis, pratiques et sûrs.';

      const prompt = `${sysIntro}\n\n` +
        `${lang === 'en' ? 'USER PROFILE' : 'PROFIL UTILISATEUR'}: ${JSON.stringify(mergedProfile)}\n` +
        `${lang === 'en' ? 'HABITS (free text by user)' : 'HABITUDES (texte libre de l\'utilisateur)'}: ${JSON.stringify(habits)}\n\n` +
        `${lang === 'en' ? 'TASK' : 'TÂCHE'}: ` +
        (lang === 'en'
          ? 'Analyze the habits, then return STRICT JSON with the following fields. Keep advice realistic and tailored to the profile. Use the same language as above.'
          : 'Analyse les habitudes, puis renvoie UNIQUEMENT un JSON STRICT avec les champs ci-dessous. Donne des conseils réalistes, adaptés au profil. Réponds en français.') +
        `\n\n\`\`\`json\n{
  "personalizedMessage": "${lang === 'en' ? 'Short supportive intro' : 'Courte introduction motivante'}",
  "actionPlan": [
    { "action": "...", "why": "...", "when": "${lang === 'en' ? 'this week' : 'cette semaine'}" },
    { "action": "...", "why": "...", "when": "${lang === 'en' ? 'today' : 'aujourd\'hui'}" }
  ],
  "training": [
    { "tip": "..." },
    { "tip": "..." }
  ],
  "nutrition": [
    { "tip": "..." },
    { "tip": "..." }
  ]
}\n\`\`\`\n\n${lang === 'en' ? 'IMPORTANT: Return ONLY the JSON, no extra text.' : 'IMPORTANT: Retourne UNIQUEMENT le JSON, sans texte supplémentaire.'}`;

      let content;
      try {
        content = await mistralService.callMistralAPI(prompt);
      } catch (e) {
        console.warn('Coach IA: fallback local (API error):', e?.message || e);
      }

      if (content) {
        try {
          const parsed = JSON.parse(content);
          // Normalisation minimale
          parsed.personalizedMessage = parsed.personalizedMessage || '';
          parsed.actionPlan = Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [];
          return parsed;
        } catch (e) {
          console.warn('Coach IA: parse error, fallback local');
        }
      }

      // Fallback local simple si l'API échoue
      const fallbackMsg = lang === 'en'
        ? 'Let’s build steady habits. Here is a simple, tailored plan to start today.'
        : 'Construisons des habitudes régulières. Voici un plan simple et adapté pour démarrer dès aujourd\'hui.';
      return {
        personalizedMessage: fallbackMsg,
        actionPlan: [
          {
            action: lang === 'en' ? 'Add 1 portion of vegetables at lunch and dinner' : 'Ajoute 1 portion de légumes au déjeuner et au dîner',
            why: lang === 'en' ? 'Fiber and micronutrients improve energy and satiety' : 'Les fibres et micronutriments améliorent énergie et satiété',
            when: lang === 'en' ? 'this week' : 'cette semaine'
          },
          {
            action: lang === 'en' ? '3 workouts/week: 2 strength + 1 cardio (20–30 min)' : '3 séances/sem : 2 force + 1 cardio (20–30 min)',
            why: lang === 'en' ? 'Balanced approach for health and body composition' : 'Approche équilibrée pour la santé et la composition corporelle',
            when: lang === 'en' ? 'starting today' : 'dès aujourd\'hui'
          }
        ],
        training: [
          { tip: lang === 'en' ? 'Progressively increase loads (1–2 reps or +2.5kg each week)' : 'Augmente progressivement les charges (1–2 reps ou +2,5kg par semaine)' },
          { tip: lang === 'en' ? 'Sleep 7–8h; recovery is key' : 'Dors 7–8h ; la récupération est clé' }
        ],
        nutrition: [
          { tip: lang === 'en' ? 'Aim for 1.2–1.6g protein/kg/day' : 'Vise 1,2–1,6g de protéines/kg/jour' },
          { tip: lang === 'en' ? 'Drink ~2L water/day; more if training' : 'Bois ~2L d\'eau/jour ; plus si entraînement' }
        ]
      };
    } catch (error) {
      console.error('❌ Coach IA (habits) error:', error);
      throw error;
    }
  }

  // === MÉTHODES UTILITAIRES ===

  async getMealHistory(userId, timeframe) {
    // Récupérer l'historique depuis Firestore
    const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 1;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Simulation de données pour l'exemple
    return {
      meals: [],
      totalMeals: 0,
      averageCaloriesPerDay: 0,
      averageProteinPerDay: 0,
      averageVegetablesPerDay: 0
    };
  }

  async getUserProfile(userId) {
    // Récupérer le profil utilisateur
    return {
      weight: 70,
      height: 175,
      age: 30,
      goal: 'maintain',
      activityLevel: 'moderate',
      displayName: 'Utilisateur'
    };
  }

  identifyEatingPatterns(mealHistory) {
    return {
      mealTiming: 'regular', // regular, irregular, skipping
      portionSizes: 'appropriate', // small, appropriate, large
      snackingFrequency: 'moderate', // low, moderate, high
      weekendVsWeekday: 'similar', // similar, different
      emotionalEating: false
    };
  }

  identifyNutritionalGaps(mealHistory, userProfile) {
    // Analyser les carences nutritionnelles
    return [
      {
        nutrient: 'Fibres',
        currentIntake: 15,
        recommendedIntake: 25,
        severity: 'moderate',
        sources: ['Légumes verts', 'Fruits', 'Légumineuses']
      }
    ];
  }

  identifyNutritionalStrengths(mealHistory) {
    return [
      {
        aspect: 'Apport protéique',
        score: 85,
        description: 'Excellent apport en protéines variées'
      }
    ];
  }

  async generatePersonalizedRecommendations(mealHistory, userProfile) {
    const prompt = `Génère 5 recommandations nutritionnelles personnalisées JSON pour:
    
    PROFIL: ${JSON.stringify(userProfile)}
    HISTORIQUE: ${JSON.stringify(mealHistory)}
    
    Format JSON array:
    [
      {
        "title": "Titre de la recommandation",
        "description": "Description détaillée",
        "priority": "high|medium|low",
        "category": "nutrition|timing|hydration|supplements",
        "actionable": "Action concrète à prendre",
        "why": "Explication scientifique simple",
        "timeline": "Quand voir les résultats"
      }
    ]`;

    try {
      const recommendations = await mistralService.callMistralAPI(prompt);
      return JSON.parse(recommendations);
    } catch (error) {
      // Fallback avec recommandations génériques
      return [
        {
          title: "Augmenter les légumes",
          description: "Ajouter une portion de légumes à chaque repas",
          priority: "high",
          category: "nutrition",
          actionable: "Commencer par ajouter des épinards à tes œufs du matin",
          why: "Les légumes apportent des vitamines et fibres essentielles",
          timeline: "Résultats visibles en 1-2 semaines"
        }
      ];
    }
  }

  calculateNutritionalScore(mealHistory, userProfile) {
    // Algorithme de scoring nutritionnel
    let score = 100;
    
    // Pénalités pour carences
    if (mealHistory.averageVegetablesPerDay < 3) score -= 20;
    if (mealHistory.averageProteinPerDay < userProfile.weight * 1.2) score -= 15;
    if (mealHistory.averageCaloriesPerDay < 1200) score -= 25;
    
    return Math.max(0, score);
  }

  async getTodayMeals(userId) {
    // Récupérer les repas d'aujourd'hui
    return []; // Simulation
  }

  analyzeTodayIntake(todayMeals, userProfile) {
    // Analyser l'apport nutritionnel du jour
    return {
      vegetables: 2, // portions
      water: 1200, // ml
      protein: 45, // g
      calories: 1400,
      fiber: 15,
      sugar: 30
    };
  }

  async suggestVegetableRecipes(userProfile) {
    return [
      'Salade de quinoa aux légumes grillés',
      'Smoothie vert épinards-banane',
      'Curry de légumes au lait de coco'
    ];
  }

  async suggestProteinSources(userProfile) {
    return [
      'Œufs brouillés (20g)',
      'Yaourt grec (15g)',
      'Shake protéiné (25g)',
      'Thon en conserve (25g)'
    ];
  }

  async suggestHealthySnacks(userProfile) {
    return [
      'Pomme + amandes',
      'Yaourt + baies',
      'Houmous + crudités',
      'Smoothie protéiné'
    ];
  }

  getLastMealTime(todayMeals) {
    if (!todayMeals.length) return new Date(Date.now() - 5 * 60 * 60 * 1000); // 5h ago
    return new Date(); // Simulation
  }

  async getUserHabits(userId) {
    // Analyser les habitudes depuis l'historique
    return {
      preferences: ['sucré', 'salé'],
      cravingTriggers: ['stress', 'ennui'],
      weakTimes: ['16h-18h', '21h-23h'],
      emotionalEating: true
    };
  }

  async getCurrentContext(userId) {
    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else if (hour >= 21 || hour < 6) timeOfDay = 'night';
    
    return {
      timeOfDay,
      stress: Math.floor(Math.random() * 10) + 1, // Simulation
      energy: Math.floor(Math.random() * 10) + 1,
      mood: Math.floor(Math.random() * 10) + 1,
      boredom: Math.floor(Math.random() * 10) + 1,
      lastMeal: '2 hours ago'
    };
  }

  analyzeCravingPatterns(userHabits, currentContext) {
    // Analyser les patterns de fringales
    return {
      sugarCraving: currentContext.stress > 6 ? 0.8 : 0.3,
      saltyCraving: currentContext.boredom > 5 ? 0.7 : 0.2,
      fatCraving: currentContext.energy < 4 ? 0.6 : 0.1
    };
  }

  async suggestHealthySweetAlternatives(preferences) {
    return [
      'Dattes farcies aux amandes',
      'Smoothie banane-cacao',
      'Yaourt grec + miel + cannelle',
      'Carré de chocolat noir 85%'
    ];
  }

  async suggestHealthySaltyAlternatives(preferences) {
    return [
      'Graines de tournesol grillées',
      'Olives vertes',
      'Houmous + concombre',
      'Noix salées (portion contrôlée)'
    ];
  }

  async getRecentNutritionalAnalysis(userId) {
    // Récupérer la dernière analyse
    return {
      score: 75,
      strengths: ['Protéines', 'Hydratation'],
      weaknesses: ['Légumes', 'Fibres'],
      trend: 'stable'
    };
  }

  async calculateProgress(userId, goal) {
    // Calculer les progrès vers l'objectif
    return {
      trend: 'improving', // improving, stagnating, declining
      improvement: 15, // pourcentage
      weeklyScore: 78,
      previousWeekScore: 68
    };
  }

  async generateActionPlan(userProfile, analysis, goal) {
    return [
      {
        action: 'Ajouter 1 portion de légumes par repas',
        duration: '1 semaine',
        difficulty: 'facile',
        impact: 'Amélioration score de 10 points'
      },
      {
        action: 'Boire 500ml d\'eau supplémentaire',
        duration: '3 jours',
        difficulty: 'facile',
        impact: 'Meilleure hydratation et énergie'
      }
    ];
  }

  generateMotivationalTips(userProfile, progress) {
    const tips = [
      '🎯 Chaque petit changement compte dans ton parcours !',
      '💪 Tu as déjà fait le plus dur en commençant !',
      '🌟 Tes efforts d\'aujourd\'hui sont les résultats de demain',
      '🔥 La constance bat la perfection à chaque fois !'
    ];
    
    return tips.slice(0, 2); // Retourner 2 tips aléatoires
  }

  async defineNextSteps(userProfile, analysis, goal) {
    return [
      {
        step: 'Planifier 3 repas équilibrés pour demain',
        timeline: '24h',
        priority: 'high'
      },
      {
        step: 'Faire les courses pour la semaine',
        timeline: '2-3 jours',
        priority: 'medium'
      }
    ];
  }

  async saveNutritionalAnalysis(userId, analysis) {
    // Sauvegarder l'analyse en base
    try {
      await nutritionFirestoreService.saveAnalysis(userId, analysis);
    } catch (error) {
      console.warn('⚠️ Sauvegarde analyse échouée:', error);
    }
  }
}

export const personalAICoachService = new PersonalAICoachService();
export default personalAICoachService;
