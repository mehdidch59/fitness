/**import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, increment } from 'firebase/firestore';* Service de Gamification - Système de Points et Badges
 */

import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, increment, limit } from 'firebase/firestore';

class GamificationService {
  constructor() {
    this.pointsConfig = {
      mealLogged: 10,
      recipeCompleted: 25,
      weeklyGoalReached: 100,
      fridgeScanned: 15,
      moodTracked: 5,
      measurementLogged: 20,
      mealPlanFollowed: 30,
      socialShare: 50,
      streakMaintained: 50, // par jour de streak
      challengeCompleted: 200
    };
    
    this.badgeDefinitions = this.initializeBadgeDefinitions();
    this.challenges = this.initializeChallenges();
  }

  /**
   * 🏆 SYSTÈME DE POINTS
   */
  async awardPoints(userId, action, metadata = {}) {
    try {
      const points = this.pointsConfig[action] || 0;
      if (points === 0) return { success: false, error: 'Action non reconnue' };

      // Calculer bonus éventuels
      const bonusPoints = await this.calculateBonusPoints(userId, action, metadata);
      const totalPoints = points + bonusPoints;

      // Mettre à jour le score utilisateur
      const newScore = await this.updateUserScore(userId, totalPoints);
      
      // Vérifier nouveaux badges
      const newBadges = await this.checkForNewBadges(userId, action, newScore, metadata);
      
      // Vérifier nouveau niveau
      const levelUp = await this.checkLevelUp(userId, newScore);
      
      // Enregistrer l'activité
      await this.logActivity(userId, {
        action,
        pointsEarned: totalPoints,
        bonusPoints,
        metadata,
        timestamp: new Date()
      });

      // Vérifier streaks
      const streakUpdate = await this.updateUserStreak(userId, action);

      return {
        success: true,
        pointsEarned: totalPoints,
        bonusPoints,
        newScore,
        newBadges,
        levelUp,
        streakUpdate,
        encouragement: this.generateEncouragement(action, totalPoints)
      };

    } catch (error) {
      console.error('❌ Erreur attribution points:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🎯 BADGES ET ACHIEVEMENTS
   */
  async checkForNewBadges(userId, action, currentScore, metadata) {
    try {
      const userBadges = await this.getUserBadges(userId);
      const earnedBadgeIds = userBadges.map(b => b.badgeId);
      const newBadges = [];

      // Vérifier chaque badge
      for (const badge of this.badgeDefinitions) {
        if (earnedBadgeIds.includes(badge.id)) continue;

        const qualified = await this.checkBadgeQualification(userId, badge, currentScore, metadata);
        if (qualified) {
          await this.awardBadge(userId, badge);
          newBadges.push(badge);
        }
      }

      return newBadges;
    } catch (error) {
      console.error('❌ Erreur vérification badges:', error);
      return [];
    }
  }

  async checkBadgeQualification(userId, badge, currentScore, metadata) {
    const userData = await this.getUserData(userId);
    
    switch (badge.type) {
      case 'points':
        return currentScore >= badge.requirement;
        
      case 'streak':
        return userData.currentStreak >= badge.requirement;
        
      case 'meals':
        return userData.totalMealsLogged >= badge.requirement;
        
      case 'recipes':
        return userData.totalRecipesCompleted >= badge.requirement;
        
      case 'social':
        return userData.socialShares >= badge.requirement;
        
      case 'special':
        return this.checkSpecialBadgeRequirement(userId, badge, metadata);
        
      default:
        return false;
    }
  }

  async checkSpecialBadgeRequirement(userId, badge, metadata) {
    switch (badge.id) {
      case 'early_bird':
        // Badge pour repas avant 8h
        return metadata.mealTime && new Date(metadata.mealTime).getHours() < 8;
        
      case 'night_owl':
        // Badge pour repas après 22h
        return metadata.mealTime && new Date(metadata.mealTime).getHours() > 22;
        
      case 'macro_master':
        // Badge pour équilibre parfait des macros
        return this.checkMacroBalance(metadata.nutrition);
        
      case 'zero_waste':
        // Badge pour utilisation complète des ingrédients du frigo
        return metadata.fridgeUsage >= 95;
        
      case 'budget_hero':
        // Badge pour repas sous budget
        return metadata.cost <= metadata.targetBudget * 0.8;
        
      default:
        return false;
    }
  }

  /**
   * ⚡ SYSTÈME DE NIVEAUX
   */
  async checkLevelUp(userId, currentScore) {
    const currentLevel = this.calculateLevel(currentScore);
    const userData = await this.getUserData(userId);
    const previousLevel = userData.level || 1;

    if (currentLevel > previousLevel) {
      await this.updateUserLevel(userId, currentLevel);
      const levelRewards = this.getLevelRewards(currentLevel);
      
      return {
        leveledUp: true,
        newLevel: currentLevel,
        previousLevel,
        rewards: levelRewards,
        message: `Félicitations ! Vous avez atteint le niveau ${currentLevel} !`
      };
    }

    return { leveledUp: false, currentLevel };
  }

  calculateLevel(score) {
    // Formule progression: niveau = √(score/100)
    return Math.floor(Math.sqrt(score / 100)) + 1;
  }

  getLevelRewards(level) {
    const rewards = {
      2: { type: 'feature', value: 'meal_planning_basic' },
      3: { type: 'points', value: 100 },
      5: { type: 'feature', value: 'fridge_scanner' },
      10: { type: 'badge', value: 'nutrition_expert' },
      15: { type: 'feature', value: 'ai_coach' },
      20: { type: 'points', value: 500 },
      25: { type: 'feature', value: 'premium_recipes' }
    };

    return rewards[level] || { type: 'points', value: level * 10 };
  }

  /**
   * 🔥 SYSTÈME DE STREAKS
   */
  async updateUserStreak(userId, action) {
    try {
      const userData = await this.getUserData(userId);
      const today = new Date().toDateString();
      const lastActivity = userData.lastActivityDate;
      
      let currentStreak = userData.currentStreak || 0;
      let longestStreak = userData.longestStreak || 0;
      let streakBroken = false;

      if (lastActivity === today) {
        // Activité déjà enregistrée aujourd'hui
        return { streakMaintained: true, currentStreak, longestStreak };
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastActivity === yesterday.toDateString()) {
        // Continuité du streak
        currentStreak++;
      } else if (lastActivity && lastActivity !== today) {
        // Streak cassé
        streakBroken = true;
        currentStreak = 1;
      } else {
        // Premier jour
        currentStreak = 1;
      }

      // Mettre à jour le record
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Sauvegarder
      await this.updateUserData(userId, {
        currentStreak,
        longestStreak,
        lastActivityDate: today
      });

      // Points bonus pour streak
      let bonusPoints = 0;
      if (currentStreak >= 7) {
        bonusPoints = this.pointsConfig.streakMaintained;
        await this.awardPoints(userId, 'streakMaintained', { streak: currentStreak });
      }

      return {
        streakMaintained: !streakBroken,
        currentStreak,
        longestStreak,
        bonusPoints,
        milestoneReached: this.checkStreakMilestone(currentStreak)
      };

    } catch (error) {
      console.error('❌ Erreur mise à jour streak:', error);
      return { error: error.message };
    }
  }

  checkStreakMilestone(streak) {
    const milestones = [3, 7, 14, 30, 50, 100];
    return milestones.includes(streak) ? streak : null;
  }

  /**
   * 🎮 DÉFIS ET CHALLENGES
   */
  async createWeeklyChallenge(userId) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const currentWeek = this.getCurrentWeek();
      
      // Vérifier si challenge existe déjà
      const existingChallenge = await this.getActiveChallenge(userId, currentWeek);
      if (existingChallenge) return existingChallenge;

      // Générer challenge personnalisé
      const challenge = this.generatePersonalizedChallenge(userProfile);
      
      // Sauvegarder
      const challengeDoc = await addDoc(collection(db, 'userChallenges'), {
        userId,
        week: currentWeek,
        challenge,
        progress: 0,
        completed: false,
        startDate: new Date(),
        createdAt: new Date()
      });

      return { id: challengeDoc.id, ...challenge };
    } catch (error) {
      console.error('❌ Erreur création challenge:', error);
      throw error;
    }
  }

  generatePersonalizedChallenge(userProfile) {
    const challenges = [
      {
        id: 'meal_prep_master',
        title: 'Maître du Meal Prep',
        description: 'Préparez 5 repas à l\'avance cette semaine',
        target: 5,
        reward: { points: 200, badge: 'meal_prep_master' },
        difficulty: 'medium'
      },
      {
        id: 'veggie_champion',
        title: 'Champion des Légumes',
        description: 'Consommez 7 portions de légumes par jour pendant 3 jours',
        target: 3,
        reward: { points: 150, badge: 'veggie_lover' },
        difficulty: 'hard'
      },
      {
        id: 'hydration_hero',
        title: 'Héros de l\'Hydratation',
        description: 'Buvez 2L d\'eau pendant 7 jours consécutifs',
        target: 7,
        reward: { points: 100, badge: 'hydration_master' },
        difficulty: 'easy'
      },
      {
        id: 'recipe_explorer',
        title: 'Explorateur de Recettes',
        description: 'Essayez 3 nouvelles recettes cette semaine',
        target: 3,
        reward: { points: 175, badge: 'recipe_explorer' },
        difficulty: 'medium'
      }
    ];

    // Sélectionner challenge basé sur le profil
    const goalBasedChallenges = challenges.filter(c => 
      this.isChallengeRelevant(c, userProfile)
    );

    return goalBasedChallenges[Math.floor(Math.random() * goalBasedChallenges.length)] || challenges[0];
  }

  isChallengeRelevant(challenge, userProfile) {
    // Logique pour déterminer si un challenge est pertinent pour l'utilisateur
    if (userProfile.goal === 'lose_weight' && challenge.id === 'veggie_champion') return true;
    if (userProfile.goal === 'gain_muscle' && challenge.id === 'meal_prep_master') return true;
    return true; // Par défaut, tous les challenges sont pertinents
  }

  /**
   * 📊 LEADERBOARD ET SOCIAL
   */
  async getLeaderboard(period = 'weekly', limit = 10) {
    try {
      const startDate = this.getLeaderboardStartDate(period);
      
      const q = query(
        collection(db, 'userActivities'),
        where('timestamp', '>=', startDate),
        orderBy('timestamp', 'desc')
      );

      const activities = await getDocs(q);
      const userScores = new Map();

      activities.forEach(doc => {
        const activity = doc.data();
        const currentScore = userScores.get(activity.userId) || 0;
        userScores.set(activity.userId, currentScore + activity.pointsEarned);
      });

      // Convertir en array et trier
      const leaderboard = Array.from(userScores.entries())
        .map(([userId, score]) => ({ userId, score }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Enrichir avec données utilisateur
      return await this.enrichLeaderboardData(leaderboard);
    } catch (error) {
      console.error('❌ Erreur leaderboard:', error);
      return [];
    }
  }

  /**
   * 🎯 INITIALISATION DES BADGES
   */
  initializeBadgeDefinitions() {
    return [
      // Badges de progression
      {
        id: 'first_meal',
        name: 'Premier Pas',
        description: 'Enregistrez votre premier repas',
        icon: '🍽️',
        type: 'meals',
        requirement: 1,
        rarity: 'common',
        points: 50
      },
      {
        id: 'meal_streak_7',
        name: 'Habitué',
        description: '7 jours consécutifs d\'enregistrement',
        icon: '🔥',
        type: 'streak',
        requirement: 7,
        rarity: 'uncommon',
        points: 100
      },
      {
        id: 'recipe_master',
        name: 'Maître Cuisinier',
        description: 'Complétez 50 recettes',
        icon: '👨‍🍳',
        type: 'recipes',
        requirement: 50,
        rarity: 'rare',
        points: 200
      },
      {
        id: 'points_1000',
        name: 'Millionaire des Points',
        description: 'Atteignez 1000 points',
        icon: '💎',
        type: 'points',
        requirement: 1000,
        rarity: 'epic',
        points: 300
      },
      
      // Badges spéciaux
      {
        id: 'early_bird',
        name: 'Lève-tôt',
        description: 'Prenez un petit-déjeuner avant 8h',
        icon: '🌅',
        type: 'special',
        requirement: 'breakfast_before_8',
        rarity: 'uncommon',
        points: 75
      },
      {
        id: 'night_owl',
        name: 'Noctambule',
        description: 'Enregistrez un repas après 22h',
        icon: '🦉',
        type: 'special',
        requirement: 'meal_after_22',
        rarity: 'uncommon',
        points: 75
      },
      {
        id: 'macro_master',
        name: 'Équilibre Parfait',
        description: 'Atteignez l\'équilibre parfait des macronutriments',
        icon: '⚖️',
        type: 'special',
        requirement: 'perfect_macros',
        rarity: 'rare',
        points: 150
      },
      {
        id: 'zero_waste',
        name: 'Zéro Gaspillage',
        description: 'Utilisez 95% des ingrédients de votre frigo',
        icon: '♻️',
        type: 'special',
        requirement: 'fridge_usage_95',
        rarity: 'rare',
        points: 200
      },
      {
        id: 'budget_hero',
        name: 'Héros du Budget',
        description: 'Cuisinez sous le budget prévu',
        icon: '💰',
        type: 'special',
        requirement: 'under_budget',
        rarity: 'uncommon',
        points: 100
      },
      
      // Badges sociaux
      {
        id: 'social_butterfly',
        name: 'Papillon Social',
        description: 'Partagez 10 recettes sur les réseaux',
        icon: '🦋',
        type: 'social',
        requirement: 10,
        rarity: 'rare',
        points: 250
      }
    ];
  }

  initializeChallenges() {
    return [
      {
        id: 'hydration_week',
        title: 'Semaine Hydratation',
        description: 'Buvez 2L d\'eau par jour pendant 7 jours',
        duration: 7,
        difficulty: 'easy',
        reward: { points: 200, badge: 'hydration_master' }
      },
      {
        id: 'protein_power',
        title: 'Force Protéinée',
        description: 'Atteignez votre objectif protéine 5 jours sur 7',
        duration: 7,
        difficulty: 'medium',
        reward: { points: 300, badge: 'protein_champion' }
      }
    ];
  }

  // === MÉTHODES UTILITAIRES ===

  async calculateBonusPoints(userId, action, metadata) {
    let bonus = 0;
    
    // Bonus streak
    const userData = await this.getUserData(userId);
    if (userData.currentStreak >= 7) {
      bonus += 10; // 10 points bonus pour streak 7+
    }
    
    // Bonus weekends
    const isWeekend = [0, 6].includes(new Date().getDay());
    if (isWeekend && action === 'mealLogged') {
      bonus += 5;
    }
    
    // Bonus performance
    if (metadata.nutrition && this.isHighQualityMeal(metadata.nutrition)) {
      bonus += 15;
    }
    
    return bonus;
  }

  isHighQualityMeal(nutrition) {
    // Définir ce qu'est un repas de qualité
    return nutrition.protein >= 20 && nutrition.vegetables >= 2;
  }

  checkMacroBalance(nutrition) {
    if (!nutrition) return false;
    
    const total = nutrition.protein + nutrition.carbs + nutrition.fat;
    const proteinRatio = nutrition.protein / total;
    const carbRatio = nutrition.carbs / total;
    const fatRatio = nutrition.fat / total;
    
    // Équilibre idéal: 30% protéines, 40% glucides, 30% lipides (±5%)
    return (
      Math.abs(proteinRatio - 0.3) <= 0.05 &&
      Math.abs(carbRatio - 0.4) <= 0.05 &&
      Math.abs(fatRatio - 0.3) <= 0.05
    );
  }

  generateEncouragement(action, points) {
    const encouragements = {
      mealLogged: [
        `Excellent ! +${points} points pour votre engagement ! 🍽️`,
        `Bravo ! Vous progressez vers vos objectifs ! +${points} points 🎯`,
        `Super travail ! +${points} points bien mérités ! 👏`
      ],
      recipeCompleted: [
        `Fantastique ! Nouvelle recette maîtrisée ! +${points} points 👨‍🍳`,
        `Bravo chef ! +${points} points pour votre créativité ! 🍳`,
        `Excellent ! Votre répertoire culinaire s'enrichit ! +${points} points 📚`
      ]
    };
    
    const messages = encouragements[action] || [`Bien joué ! +${points} points ! 🌟`];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  getCurrentWeek() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
  }

  getLeaderboardStartDate(period) {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart;
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        return new Date(0);
    }
  }

  // === MÉTHODES D'ACCÈS DONNÉES ===

  async getUserData(userId) {
    // Récupérer données utilisateur depuis Firestore ou cache
    try {      const q = query(
        collection(db, 'userGameData'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      
      // Créer données par défaut
      return await this.createDefaultUserData(userId);
    } catch (error) {
      console.error('❌ Erreur récupération user data:', error);
      return {};
    }
  }
  async createDefaultUserData(userId) {
    const defaultData = {
      userId,
      totalScore: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      totalMealsLogged: 0,
      totalRecipesCompleted: 0,
      socialShares: 0,
      lastActivityDate: null,
      createdAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'userGameData'), defaultData);
    return { id: docRef.id, ...defaultData };
  }

  async updateUserLevel(userId, level) {
    const userData = await this.getUserData(userId);
    await updateDoc(doc(db, 'userGameData', userData.id), {
      level: level
    });
  }

  async updateUserData(userId, updates) {
    const userData = await this.getUserData(userId);
    await updateDoc(doc(db, 'userGameData', userData.id), updates);
  }

  async getUserProfile(userId) {
    // Récupérer le profil utilisateur depuis localStorage ou Firestore
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : { goal: 'balanced_nutrition' };
    } catch {
      return { goal: 'balanced_nutrition' };
    }
  }

  async getActiveChallenge(userId, week) {
    try {
      const q = query(
        collection(db, 'userChallenges'),
        where('userId', '==', userId),
        where('week', '==', week),
        where('completed', '==', false),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur récupération challenge actif:', error);
      return null;
    }
  }

  async enrichLeaderboardData(leaderboard) {
    // Enrichir les données du leaderboard avec les noms d'utilisateurs
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      username: `Utilisateur ${entry.userId.slice(-4)}` // Affichage anonymisé
    }));
  }

  async updateUserScore(userId, pointsToAdd) {
    const userData = await this.getUserData(userId);
    const newScore = (userData.totalScore || 0) + pointsToAdd;
    
    await updateDoc(doc(db, 'userGameData', userData.id), {
      totalScore: newScore
    });
    
    return newScore;
  }

  async logActivity(userId, activity) {
    await addDoc(collection(db, 'userActivities'), {
      userId,
      ...activity
    });
  }

  async awardBadge(userId, badge) {
    await addDoc(collection(db, 'userBadges'), {
      userId,
      badgeId: badge.id,
      badge,
      earnedAt: new Date()
    });
  }

  async getUserBadges(userId) {
    const q = query(
      collection(db, 'userBadges'),
      where('userId', '==', userId),
      orderBy('earnedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

export const gamificationService = new GamificationService();
export default gamificationService;