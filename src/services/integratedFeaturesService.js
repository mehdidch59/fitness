/**
 * Service Intégrateur pour toutes les fonctionnalités avancées
 * Coordonne: Scanner Frigo, Meal Planning, Gamification, Tracking
 */

import { fridgeScannerService } from './fridgeScannerService';
import { mealPlanningService } from './mealPlanningService';
import { gamificationService } from './gamificationService';
import { trackingAnalyticsService } from './trackingAnalyticsService';
import { aiPersonalizationService } from './aiPersonalizationService';

class IntegratedFeaturesService {
  constructor() {
    this.services = {
      fridge: fridgeScannerService,
      planning: mealPlanningService,
      gamification: gamificationService,
      tracking: trackingAnalyticsService,
      ai: aiPersonalizationService
    };
  }

  /**
   * 🚀 WORKFLOW COMPLET: Scan → Plan → Track → Reward
   */
  async executeCompleteWorkflow(userId, workflowType, data) {
    try {
      console.log(`🚀 Exécution workflow ${workflowType} pour ${userId}`);
      
      switch (workflowType) {
        case 'fridge_to_meal_plan':
          return await this.fridgeToMealPlanWorkflow(userId, data);
          
        case 'meal_logging_with_rewards':
          return await this.mealLoggingWithRewardsWorkflow(userId, data);
          
        case 'weekly_planning_challenge':
          return await this.weeklyPlanningChallengeWorkflow(userId, data);
          
        case 'progress_tracking_insights':
          return await this.progressTrackingInsightsWorkflow(userId, data);
          
        default:
          throw new Error(`Workflow ${workflowType} non reconnu`);
      }
    } catch (error) {
      console.error('❌ Erreur workflow intégré:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📸➡️📅 WORKFLOW: Scan Frigo → Génération Plan de Repas
   */
  async fridgeToMealPlanWorkflow(userId, { imageFile, planDuration = 'weekly' }) {
    try {
      // 1. Scanner le frigo
      console.log('📸 Étape 1: Scan du frigo...');
      const fridgeScan = await this.services.fridge.scanFridgePhoto(imageFile, userId);
      
      if (!fridgeScan.detectedIngredients) {
        throw new Error('Aucun ingrédient détecté dans le frigo');
      }

      // 2. Récompenser le scan
      console.log('🏆 Étape 2: Attribution points scan...');
      const scanReward = await this.services.gamification.awardPoints(userId, 'fridgeScanned', {
        ingredientsCount: fridgeScan.detectedIngredients.length,
        freshness: fridgeScan.freshnessAnalysis.overall
      });

      // 3. Générer le plan de repas avec les ingrédients disponibles
      console.log('📅 Étape 3: Génération plan de repas...');
      const planConfig = {
        duration: planDuration,
        availableIngredients: fridgeScan.detectedIngredients.map(ing => ing.name),
        prioritizeAvailable: true,
        wasteReduction: true,
        startDate: new Date().toISOString().split('T')[0]
      };
      
      const mealPlan = await this.services.planning.generateMealPlan(userId, planConfig);

      // 4. Créer challenge associé
      console.log('🎯 Étape 4: Création challenge...');
      const challenge = await this.services.gamification.createWeeklyChallenge(userId);

      // 5. Suggestions d'optimisation IA
      console.log('🤖 Étape 5: Suggestions IA...');
      const aiSuggestions = await this.services.ai.generateRecipesFromIngredients(
        fridgeScan.detectedIngredients,
        userId
      );

      return {
        success: true,
        workflow: 'fridge_to_meal_plan',
        results: {
          fridgeScan,
          scanReward,
          mealPlan,
          challenge,
          aiSuggestions,
          nextSteps: [
            'Suivez votre plan de repas pour gagner des points',
            'Complétez le challenge hebdomadaire',
            'Scannez à nouveau votre frigo dans 3 jours'
          ]
        }
      };

    } catch (error) {
      console.error('❌ Erreur workflow frigo->plan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🍽️🏆 WORKFLOW: Enregistrement Repas + Récompenses + Tracking
   */
  async mealLoggingWithRewardsWorkflow(userId, { mealData, moodData = null }) {
    try {
      // 1. Enregistrer le repas (service existant)
      console.log('🍽️ Étape 1: Enregistrement du repas...');
      // Ici vous intégreriez avec votre service de nutrition existant
      
      // 2. Tracker l'humeur si fournie
      let moodTracking = null;
      if (moodData) {
        console.log('😊 Étape 2: Tracking humeur...');
        moodTracking = await this.services.tracking.recordMoodEntry(userId, {
          ...moodData,
          mealId: mealData.id,
          mealType: mealData.type
        });
      }

      // 3. Récompenser l'action
      console.log('🏆 Étape 3: Attribution des points...');
      const rewards = await this.services.gamification.awardPoints(userId, 'mealLogged', {
        mealType: mealData.type,
        nutrition: mealData.nutrition,
        mealTime: mealData.timestamp,
        mood: moodData?.moodScore
      });

      // 4. Vérifier achievements spéciaux
      const specialAchievements = await this.checkSpecialMealAchievements(userId, mealData, rewards);

      // 5. Générer insights nutritionnels
      console.log('📊 Étape 5: Génération insights...');
      const insights = await this.services.tracking.generateInsights(userId);

      // 6. Recommandations IA pour le prochain repas
      const nextMealSuggestions = await this.generateNextMealSuggestions(userId, mealData);

      return {
        success: true,
        workflow: 'meal_logging_with_rewards',
        results: {
          mealLogged: true,
          moodTracking,
          rewards,
          specialAchievements,
          insights: insights.insights,
          nextMealSuggestions,
          encouragement: this.generateWorkflowEncouragement(rewards)
        }
      };

    } catch (error) {
      console.error('❌ Erreur workflow meal logging:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📅🏁 WORKFLOW: Challenge Planification Hebdomadaire
   */
  async weeklyPlanningChallengeWorkflow(userId, { challengeType = 'auto' }) {
    try {
      // 1. Analyser les habitudes utilisateur
      console.log('📊 Étape 1: Analyse habitudes...');
      const userHabits = await this.services.tracking.generateInsights(userId);
      
      // 2. Créer challenge personnalisé
      console.log('🎯 Étape 2: Création challenge...');
      const challenge = await this.services.gamification.createWeeklyChallenge(userId);
      
      // 3. Générer plan de repas aligné avec le challenge
      console.log('📅 Étape 3: Plan aligné challenge...');
      const planConfig = this.alignPlanWithChallenge(challenge, userHabits);
      const mealPlan = await this.services.planning.generateMealPlan(userId, planConfig);
      
      // 4. Configurer suivi automatique
      console.log('⚙️ Étape 4: Configuration suivi...');
      const trackingConfig = this.setupChallengeTracking(userId, challenge);

      return {
        success: true,
        workflow: 'weekly_planning_challenge',
        results: {
          challenge,
          alignedMealPlan: mealPlan,
          trackingConfig,
          motivation: this.generateChallengeMotivation(challenge),
          weeklyGoals: this.generateWeeklyGoals(challenge, mealPlan)
        }
      };

    } catch (error) {
      console.error('❌ Erreur workflow planning challenge:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📈🧠 WORKFLOW: Tracking Progrès + Insights IA
   */
  async progressTrackingInsightsWorkflow(userId, { trackingData }) {
    try {
      // 1. Enregistrer les nouvelles mesures
      console.log('📏 Étape 1: Enregistrement mesures...');
      let trackingResults = {};
      
      if (trackingData.mood) {
        trackingResults.mood = await this.services.tracking.recordMoodEntry(userId, trackingData.mood);
      }
      
      if (trackingData.measurements) {
        trackingResults.measurements = await this.services.tracking.recordMeasurements(userId, trackingData.measurements);
      }
      
      if (trackingData.energy) {
        trackingResults.energy = await this.services.tracking.recordEnergyLevel(userId, trackingData.energy);
      }

      // 2. Générer insights avancés
      console.log('🧠 Étape 2: Génération insights...');
      const insights = await this.services.tracking.generateInsights(userId);
      
      // 3. Récompenser le tracking
      console.log('🏆 Étape 3: Récompenses tracking...');
      const rewards = await this.services.gamification.awardPoints(userId, 'measurementLogged', {
        trackingTypes: Object.keys(trackingData),
        consistency: trackingResults.consistency
      });

      // 4. Recommandations IA basées sur les données
      console.log('🤖 Étape 4: Recommandations IA...');
      const aiRecommendations = await this.generateAIRecommendations(userId, insights, trackingData);

      // 5. Générer rapport mensuel si c'est le moment
      let monthlyReport = null;
      if (this.isMonthlyReportDue(userId)) {
        monthlyReport = await this.services.tracking.generateMonthlyReport(userId);
      }

      return {
        success: true,
        workflow: 'progress_tracking_insights',
        results: {
          trackingResults,
          insights,
          rewards,
          aiRecommendations,
          monthlyReport,
          progressSummary: this.generateProgressSummary(trackingResults, insights)
        }
      };

    } catch (error) {
      console.error('❌ Erreur workflow progress tracking:', error);
      return { success: false, error: error.message };
    }
  }

  // === MÉTHODES SUPPORT ===

  async checkSpecialMealAchievements(userId, mealData, rewards) {
    const achievements = [];
    
    // Vérifier repas équilibré
    if (this.isBalancedMeal(mealData.nutrition)) {
      const balancedMealReward = await this.services.gamification.awardPoints(userId, 'mealLogged', {
        special: 'balanced_meal',
        nutrition: mealData.nutrition
      });
      achievements.push({
        type: 'balanced_meal',
        message: 'Repas parfaitement équilibré !',
        reward: balancedMealReward
      });
    }

    // Vérifier repas économique
    if (mealData.cost && mealData.cost <= 5) {
      achievements.push({
        type: 'budget_meal',
        message: 'Repas économique et nutritif !',
        points: 25
      });
    }

    return achievements;
  }

  async generateNextMealSuggestions(userId, lastMeal) {
    try {
      // Analyser ce qui manque nutritionnellement
      const nutritionGaps = this.analyzeNutritionGaps(lastMeal);
      
      // Générer suggestions avec IA
      return await this.services.ai.generateMoodBasedRecipes(
        'énergique', // Mood par défaut
        userId
      );
    } catch (error) {
      return [];
    }
  }

  alignPlanWithChallenge(challenge, userHabits) {
    const baseConfig = {
      duration: 'weekly',
      startDate: new Date().toISOString().split('T')[0]
    };

    // Adapter selon le type de challenge
    switch (challenge.id) {
      case 'veggie_champion':
        return {
          ...baseConfig,
          emphasizeVegetables: true,
          minVeggiePortion: 2
        };
        
      case 'meal_prep_master':
        return {
          ...baseConfig,
          mealPrepFriendly: true,
          batchCooking: true
        };
        
      default:
        return baseConfig;
    }
  }

  generateWorkflowEncouragement(rewards) {
    const messages = [
      `🎉 Excellent ! +${rewards.pointsEarned} points ! Vous progressez vers vos objectifs !`,
      `💪 Bravo ! +${rewards.pointsEarned} points. Votre constance paye !`,
      `🌟 Fantastique ! +${rewards.pointsEarned} points. Continuez sur cette lancée !`
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  generateChallengeMotivation(challenge) {
    return {
      title: `Challenge: ${challenge.title}`,
      motivation: `Vous pouvez le faire ! ${challenge.description}`,
      tips: [
        'Divisez l\'objectif en petites étapes',
        'Célébrez chaque petite victoire',
        'Restez régulier dans vos efforts'
      ],
      reward: `Récompense: ${challenge.reward.points} points + badge ${challenge.reward.badge}`
    };
  }

  async generateAIRecommendations(userId, insights, trackingData) {
    try {
      // Analyser les données pour générer recommandations personnalisées
      const recommendations = [];
      
      if (insights.insights.some(i => i.category === 'mood' && i.type === 'warning')) {
        recommendations.push({
          type: 'nutrition',
          priority: 'high',
          title: 'Améliorer votre humeur',
          action: 'Augmentez les aliments riches en oméga-3 et magnésium',
          recipes: await this.services.ai.generateMoodBasedRecipes('stressé', userId)
        });
      }

      return recommendations;
    } catch (error) {
      return [];
    }
  }

  // === UTILITAIRES ===

  isBalancedMeal(nutrition) {
    if (!nutrition) return false;
    
    const { protein, carbs, fat } = nutrition;
    const total = protein + carbs + fat;
    
    // Ratios équilibrés: 25-30% protéines, 40-50% glucides, 25-30% lipides
    const proteinRatio = protein / total;
    const carbRatio = carbs / total;
    const fatRatio = fat / total;
    
    return (
      proteinRatio >= 0.25 && proteinRatio <= 0.30 &&
      carbRatio >= 0.40 && carbRatio <= 0.50 &&
      fatRatio >= 0.25 && fatRatio <= 0.30
    );
  }

  analyzeNutritionGaps(meal) {
    // Analyser ce qui manque dans le dernier repas
    const gaps = [];
    
    if (!meal.nutrition) return gaps;
    
    if (meal.nutrition.protein < 20) gaps.push('protein');
    if (meal.nutrition.fiber < 5) gaps.push('fiber');
    if (!meal.vegetables || meal.vegetables < 2) gaps.push('vegetables');
    
    return gaps;
  }

  isMonthlyReportDue(userId) {
    // Vérifier si c'est le moment de générer un rapport mensuel
    const today = new Date();
    return today.getDate() === 1; // Premier du mois
  }

  generateProgressSummary(trackingResults, insights) {
    return {
      trackedToday: Object.keys(trackingResults).length,
      insightsGenerated: insights.insights?.length || 0,
      recommendations: insights.insights?.filter(i => i.type === 'warning').length || 0,
      overallTrend: this.calculateOverallTrend(insights)
    };
  }

  calculateOverallTrend(insights) {
    const positiveInsights = insights.insights?.filter(i => i.type === 'positive').length || 0;
    const warningInsights = insights.insights?.filter(i => i.type === 'warning').length || 0;
    
    if (positiveInsights > warningInsights) return 'improving';
    if (warningInsights > positiveInsights) return 'declining';
    return 'stable';
  }

  setupChallengeTracking(userId, challenge) {
    return {
      challengeId: challenge.id,
      trackingFrequency: 'daily',
      autoReminders: true,
      progressNotifications: true,
      milestoneAlerts: [25, 50, 75, 100] // % completion
    };
  }

  generateWeeklyGoals(challenge, mealPlan) {
    return {
      nutrition: 'Suivre le plan nutritionnel généré',
      challenge: challenge.description,
      tracking: 'Enregistrer au moins 1 métrique par jour',
      social: 'Partager votre progression 2 fois cette semaine'
    };
  }
}

export const integratedFeaturesService = new IntegratedFeaturesService();
export default integratedFeaturesService;