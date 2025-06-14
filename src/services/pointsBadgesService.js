/**
 * Système de Points et Badges Gamifié
 */

import { db, firestoreModule } from '../config/firebase';

class PointsBadgesService {
  constructor() {
    this.userPointsCollection = 'user_points';
    this.userBadgesCollection = 'user_badges';
    this.pointsHistoryCollection = 'points_history';
    this.isFirebaseAvailable = !!db && !!firestoreModule;
    
    // Configuration des badges disponibles
    this.badges = this.initializeBadges();
    
    // Configuration des points par action
    this.pointsConfig = {
      meal_completed: 10,
      recipe_favorited: 5,
      workout_completed: 15,
      daily_goal_achieved: 25,
      weekly_streak: 50,
      recipe_created: 20,
      profile_completed: 30,
      photo_uploaded: 10,
      weight_logged: 8,
      mood_tracked: 5,
      meal_planned: 12,
      shopping_list_completed: 15,
      nutrition_goal_met: 20,
      social_share: 8,
      challenge_completed: 100
    };
  }

  /**
   * Initialise tous les badges disponibles
   */
  initializeBadges() {
    return {
      // Badges Nutrition
      first_meal: {
        id: 'first_meal',
        name: 'Premier Repas',
        description: 'Complétez votre premier repas planifié',
        icon: '🍽️',
        category: 'nutrition',
        rarity: 'common',
        pointsReward: 50,
        criteria: { mealsCompleted: 1 }
      },
      
      meal_master: {
        id: 'meal_master',
        name: 'Maître des Repas',
        description: 'Complétez 100 repas planifiés',
        icon: '👨‍🍳',
        category: 'nutrition',
        rarity: 'epic',
        pointsReward: 500,
        criteria: { mealsCompleted: 100 }
      },

      recipe_collector: {
        id: 'recipe_collector',
        name: 'Collectionneur de Recettes',
        description: 'Ajoutez 50 recettes à vos favoris',
        icon: '📚',
        category: 'nutrition',
        rarity: 'rare',
        pointsReward: 200,
        criteria: { recipesFavorited: 50 }
      },

      // Badges Fitness
      first_workout: {
        id: 'first_workout',
        name: 'Premier Entraînement',
        description: 'Terminez votre premier workout',
        icon: '💪',
        category: 'fitness',
        rarity: 'common',
        pointsReward: 50,
        criteria: { workoutsCompleted: 1 }
      },

      fitness_warrior: {
        id: 'fitness_warrior',
        name: 'Guerrier du Fitness',
        description: 'Complétez 200 entraînements',
        icon: '⚔️',
        category: 'fitness',
        rarity: 'legendary',
        pointsReward: 1000,
        criteria: { workoutsCompleted: 200 }
      },

      // Badges Consistance
      week_streak: {
        id: 'week_streak',
        name: 'Série Hebdomadaire',
        description: 'Maintenez une série de 7 jours consécutifs',
        icon: '🔥',
        category: 'consistency',
        rarity: 'rare',
        pointsReward: 150,
        criteria: { streakDays: 7 }
      },

      month_streak: {
        id: 'month_streak',
        name: 'Champion du Mois',
        description: 'Série de 30 jours consécutifs',
        icon: '🏆',
        category: 'consistency',
        rarity: 'epic',
        pointsReward: 750,
        criteria: { streakDays: 30 }
      },

      // Badges Sociaux
      first_share: {
        id: 'first_share',
        name: 'Premier Partage',
        description: 'Partagez votre premier progrès',
        icon: '📤',
        category: 'social',
        rarity: 'common',
        pointsReward: 25,
        criteria: { sharesCount: 1 }
      },

      // Badges Spéciaux
      early_bird: {
        id: 'early_bird',
        name: 'Lève-tôt',
        description: 'Complétez 10 workouts avant 7h',
        icon: '🐦',
        category: 'special',
        rarity: 'rare',
        pointsReward: 200,
        criteria: { earlyWorkouts: 10 }
      },

      night_owl: {
        id: 'night_owl',
        name: 'Oiseau de Nuit',
        description: 'Complétez 10 workouts après 22h',
        icon: '🦉',
        category: 'special',
        rarity: 'rare',
        pointsReward: 200,
        criteria: { lateWorkouts: 10 }
      },

      perfectionist: {
        id: 'perfectionist',
        name: 'Perfectionniste',
        description: 'Atteignez tous vos objectifs pendant 7 jours',
        icon: '✨',
        category: 'special',
        rarity: 'epic',
        pointsReward: 400,
        criteria: { perfectDays: 7 }
      },

      // Badges de Progression
      weight_tracker: {
        id: 'weight_tracker',
        name: 'Suivi de Poids',
        description: 'Enregistrez votre poids 30 fois',
        icon: '⚖️',
        category: 'tracking',
        rarity: 'common',
        pointsReward: 100,
        criteria: { weightLogs: 30 }
      },

      photo_progress: {
        id: 'photo_progress',
        name: 'Progression Photo',
        description: 'Uploadez 20 photos de progression',
        icon: '📸',
        category: 'tracking',
        rarity: 'rare',
        pointsReward: 300,
        criteria: { progressPhotos: 20 }
      }
    };
  }

  /**
   * Ajoute des points à un utilisateur
   */
  async addPoints(userId, action, metadata = {}) {
    try {
      const points = this.pointsConfig[action] || 0;
      
      if (points === 0) {
        console.warn(`Action inconnue pour les points: ${action}`);
        return null;
      }

      // Récupérer les points actuels
      const currentPoints = await this.getUserPoints(userId);
      const newTotal = currentPoints.total + points;

      // Créer l'entrée historique
      const pointsEntry = {
        id: `points-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action,
        points,
        metadata,
        timestamp: new Date(),
        description: this.getActionDescription(action, points, metadata)
      };

      // Mettre à jour le total des points
      const updatedPoints = {
        userId,
        total: newTotal,
        level: this.calculateLevel(newTotal),
        updatedAt: new Date(),
        lastAction: action
      };

      // Sauvegarder
      await this.savePointsEntry(pointsEntry);
      await this.saveUserPoints(updatedPoints);

      // Vérifier les nouveaux badges
      const newBadges = await this.checkForNewBadges(userId);

      console.log(`✅ ${points} points ajoutés pour ${action}. Total: ${newTotal}`);

      return {
        pointsAdded: points,
        newTotal: newTotal,
        level: updatedPoints.level,
        newBadges,
        entry: pointsEntry
      };

    } catch (error) {
      console.error('❌ Erreur ajout points:', error);
      throw error;
    }
  }

  /**
   * Vérifie et attribue les nouveaux badges
   */
  async checkForNewBadges(userId) {
    try {
      const userStats = await this.getUserStats(userId);
      const currentBadges = await this.getUserBadges(userId);
      const currentBadgeIds = currentBadges.map(b => b.badgeId);
      const newBadges = [];

      // Vérifier chaque badge
      for (const [badgeId, badgeConfig] of Object.entries(this.badges)) {
        if (currentBadgeIds.includes(badgeId)) {
          continue; // Badge déjà obtenu
        }

        if (this.checkBadgeCriteria(badgeConfig.criteria, userStats)) {
          const badge = await this.awardBadge(userId, badgeId);
          if (badge) {
            newBadges.push(badge);
          }
        }
      }

      return newBadges;

    } catch (error) {
      console.error('❌ Erreur vérification badges:', error);
      return [];
    }
  }

  /**
   * Vérifie si les critères d'un badge sont remplis
   */
  checkBadgeCriteria(criteria, userStats) {
    for (const [key, requiredValue] of Object.entries(criteria)) {
      if (!userStats[key] || userStats[key] < requiredValue) {
        return false;
      }
    }
    return true;
  }

  /**
   * Attribue un badge à un utilisateur
   */
  async awardBadge(userId, badgeId) {
    try {
      const badgeConfig = this.badges[badgeId];
      
      if (!badgeConfig) {
        console.error(`Badge introuvable: ${badgeId}`);
        return null;
      }

      const userBadge = {
        id: `badge-${Date.now()}-${badgeId}`,
        userId,
        badgeId,
        name: badgeConfig.name,
        description: badgeConfig.description,
        icon: badgeConfig.icon,
        category: badgeConfig.category,
        rarity: badgeConfig.rarity,
        pointsRewarded: badgeConfig.pointsReward,
        awardedAt: new Date(),
        unlockedBy: 'criteria_met'
      };

      // Sauvegarder le badge
      await this.saveUserBadge(userBadge);

      // Ajouter les points bonus du badge
      if (badgeConfig.pointsReward > 0) {
        await this.addPoints(userId, 'badge_earned', { 
          badgeId, 
          badgeName: badgeConfig.name,
          bonusPoints: badgeConfig.pointsReward 
        });
      }

      console.log(`🏆 Badge "${badgeConfig.name}" attribué à l'utilisateur ${userId}`);

      return userBadge;

    } catch (error) {
      console.error('❌ Erreur attribution badge:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques utilisateur pour les badges
   */
  async getUserStats(userId) {
    try {
      // Récupérer depuis différentes sources
      const stats = {
        mealsCompleted: 0,
        recipesFavorited: 0,
        workoutsCompleted: 0,
        streakDays: 0,
        sharesCount: 0,
        weightLogs: 0,
        progressPhotos: 0,
        earlyWorkouts: 0,
        lateWorkouts: 0,
        perfectDays: 0
      };

      // TODO: Intégrer avec les autres services pour récupérer les vraies stats
      // Pour l'instant, utilisation du cache local
      const cachedStats = this.getStatsFromCache(userId);
      return { ...stats, ...cachedStats };

    } catch (error) {
      console.error('❌ Erreur récupération stats:', error);
      return {};
    }
  }

  /**
   * Met à jour une statistique utilisateur
   */
  async updateUserStat(userId, statName, increment = 1) {
    try {
      const stats = await this.getUserStats(userId);
      stats[statName] = (stats[statName] || 0) + increment;
      
      // Sauvegarder en cache
      this.saveStatsToCache(userId, stats);

      return stats;

    } catch (error) {
      console.error('❌ Erreur mise à jour stat:', error);
      throw error;
    }
  }

  /**
   * Calcule le niveau basé sur les points
   */
  calculateLevel(totalPoints) {
    if (totalPoints < 100) return 1;
    if (totalPoints < 300) return 2;
    if (totalPoints < 600) return 3;
    if (totalPoints < 1000) return 4;
    if (totalPoints < 1500) return 5;
    if (totalPoints < 2500) return 6;
    if (totalPoints < 4000) return 7;
    if (totalPoints < 6000) return 8;
    if (totalPoints < 10000) return 9;
    return 10; // Niveau maximum
  }

  /**
   * Récupère le classement des utilisateurs
   */
  async getLeaderboard(limit = 10) {
    try {
      const leaderboard = [];

      if (this.isFirebaseAvailable) {
        const { query, collection, orderBy, limit: firestoreLimit, getDocs } = firestoreModule;
        
        const q = query(
          collection(db, this.userPointsCollection),
          orderBy('total', 'desc'),
          firestoreLimit(limit)
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc, index) => {
          const data = doc.data();
          leaderboard.push({
            rank: index + 1,
            userId: data.userId,
            total: data.total,
            level: data.level,
            // Note: Ajouter ici la récupération du nom d'utilisateur
          });
        });
      }

      return leaderboard;

    } catch (error) {
      console.error('❌ Erreur récupération leaderboard:', error);
      return [];
    }
  }

  /**
   * Récupère les points d'un utilisateur
   */
  async getUserPoints(userId) {
    try {
      if (this.isFirebaseAvailable) {
        const { doc, getDoc } = firestoreModule;
        
        const docRef = doc(db, this.userPointsCollection, userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return docSnap.data();
        }
      }

      // Fallback: cache local
      return this.getPointsFromCache(userId) || { 
        userId, 
        total: 0, 
        level: 1, 
        updatedAt: new Date() 
      };

    } catch (error) {
      console.error('❌ Erreur récupération points:', error);
      return { userId, total: 0, level: 1, updatedAt: new Date() };
    }
  }

  /**
   * Récupère les badges d'un utilisateur
   */
  async getUserBadges(userId) {
    try {
      const badges = [];

      if (this.isFirebaseAvailable) {
        const { query, collection, where, orderBy, getDocs } = firestoreModule;
        
        const q = query(
          collection(db, this.userBadgesCollection),
          where('userId', '==', userId),
          orderBy('awardedAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          badges.push({ id: doc.id, ...doc.data() });
        });
      }

      // Compléter avec le cache local
      const localBadges = this.getBadgesFromCache(userId);
      return [...badges, ...localBadges.filter(lb => !badges.find(b => b.badgeId === lb.badgeId))];

    } catch (error) {
      console.error('❌ Erreur récupération badges:', error);
      return this.getBadgesFromCache(userId);
    }
  }

  /**
   * Récupère l'historique des points
   */
  async getPointsHistory(userId, limit = 20) {
    try {
      const history = [];

      if (this.isFirebaseAvailable) {
        const { query, collection, where, orderBy, limit: firestoreLimit, getDocs } = firestoreModule;
        
        const q = query(
          collection(db, this.pointsHistoryCollection),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          firestoreLimit(limit)
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          history.push({ id: doc.id, ...doc.data() });
        });
      }

      return history;

    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      return [];
    }
  }

  /**
   * Méthodes de sauvegarde
   */
  async savePointsEntry(entry) {
    try {
      if (this.isFirebaseAvailable) {
        const { doc, setDoc } = firestoreModule;
        
        const docRef = doc(db, this.pointsHistoryCollection, entry.id);
        await setDoc(docRef, entry);
      }

      // Cache local
      this.saveToCache(`pointsEntry_${entry.id}`, entry);

    } catch (error) {
      console.error('❌ Erreur sauvegarde entry points:', error);
      this.saveToCache(`pointsEntry_${entry.id}`, entry);
    }
  }

  async saveUserPoints(pointsData) {
    try {
      if (this.isFirebaseAvailable) {
        const { doc, setDoc } = firestoreModule;
        
        const docRef = doc(db, this.userPointsCollection, pointsData.userId);
        await setDoc(docRef, pointsData);
      }

      // Cache local
      this.saveToCache(`userPoints_${pointsData.userId}`, pointsData);

    } catch (error) {
      console.error('❌ Erreur sauvegarde points utilisateur:', error);
      this.saveToCache(`userPoints_${pointsData.userId}`, pointsData);
    }
  }

  async saveUserBadge(badge) {
    try {
      if (this.isFirebaseAvailable) {
        const { doc, setDoc } = firestoreModule;
        
        const docRef = doc(db, this.userBadgesCollection, badge.id);
        await setDoc(docRef, badge);
      }

      // Cache local
      const badges = this.getBadgesFromCache(badge.userId);
      badges.push(badge);
      this.saveToCache(`userBadges_${badge.userId}`, badges);

    } catch (error) {
      console.error('❌ Erreur sauvegarde badge:', error);
      const badges = this.getBadgesFromCache(badge.userId);
      badges.push(badge);
      this.saveToCache(`userBadges_${badge.userId}`, badges);
    }
  }

  /**
   * Méthodes utilitaires
   */
  getActionDescription(action, points, metadata) {
    const descriptions = {
      meal_completed: `Repas terminé (+${points} pts)`,
      recipe_favorited: `Recette ajoutée aux favoris (+${points} pts)`,
      workout_completed: `Entraînement terminé (+${points} pts)`,
      daily_goal_achieved: `Objectif quotidien atteint (+${points} pts)`,
      badge_earned: `Badge "${metadata.badgeName}" obtenu (+${metadata.bonusPoints || points} pts)`
    };

    return descriptions[action] || `Action ${action} (+${points} pts)`;
  }

  /**
   * Gestion du cache local
   */
  saveToCache(key, data) {
    try {
      localStorage.setItem(`points_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Erreur sauvegarde cache points');
    }
  }

  getFromCache(key) {
    try {
      const cached = localStorage.getItem(`points_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  getPointsFromCache(userId) {
    return this.getFromCache(`userPoints_${userId}`);
  }

  getBadgesFromCache(userId) {
    return this.getFromCache(`userBadges_${userId}`) || [];
  }

  getStatsFromCache(userId) {
    return this.getFromCache(`userStats_${userId}`) || {};
  }

  saveStatsToCache(userId, stats) {
    this.saveToCache(`userStats_${userId}`, stats);
  }
}

export const pointsBadgesService = new PointsBadgesService();
export default pointsBadgesService;