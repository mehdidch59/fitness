/**
 * Service de tracking et analytics avancés
 */

import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  updateDoc, 
  doc 
} from 'firebase/firestore';

class TrackingService {
  constructor() {
    this.collections = {
      moodEntries: 'moodEntries',
      energyLevels: 'energyLevels',
      measurements: 'measurements',
      progressPhotos: 'progressPhotos',
      biomarkers: 'biomarkers',
      insights: 'insights'
    };
  }

  /**
   * MOOD TRACKING
   */
  async logMoodEntry(userId, moodData) {
    try {
      const entry = {
        userId,
        mood: moodData.mood, // 1-10 scale
        energy: moodData.energy, // 1-10 scale
        hunger: moodData.hunger, // 1-10 scale
        satisfaction: moodData.satisfaction, // 1-10 scale
        notes: moodData.notes || '',
        mealContext: moodData.mealContext || null, // ID du repas associé
        timestamp: new Date(),
        tags: moodData.tags || []
      };

      const docRef = await addDoc(collection(db, this.collections.moodEntries), entry);
      console.log('✅ Mood entry logged:', docRef.id);
      return { id: docRef.id, ...entry };
    } catch (error) {
      console.error('❌ Error logging mood:', error);
      throw error;
    }
  }

  async getMoodHistory(userId, days = 30) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const q = query(
        collection(db, this.collections.moodEntries),
        where('userId', '==', userId),
        where('timestamp', '>=', since),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      }));

      return this.analyzeMoodTrends(entries);
    } catch (error) {
      console.error('❌ Error getting mood history:', error);
      return { entries: [], trends: null };
    }
  }

  analyzeMoodTrends(entries) {
    if (entries.length === 0) return { entries, trends: null };

    const trends = {
      averageMood: entries.reduce((sum, e) => sum + e.mood, 0) / entries.length,
      averageEnergy: entries.reduce((sum, e) => sum + e.energy, 0) / entries.length,
      moodTrend: this.calculateTrend(entries.map(e => e.mood)),
      energyTrend: this.calculateTrend(entries.map(e => e.energy)),
      bestDays: entries.filter(e => e.mood >= 8 && e.energy >= 8),
      worstDays: entries.filter(e => e.mood <= 4 || e.energy <= 4),
      correlations: this.findMoodCorrelations(entries)
    };

    return { entries, trends };
  }

  /**
   * MEASUREMENTS & PROGRESS TRACKING
   */
  async logMeasurement(userId, measurementData) {
    try {
      const measurement = {
        userId,
        type: measurementData.type, // 'weight', 'body_fat', 'muscle_mass', etc.
        value: measurementData.value,
        unit: measurementData.unit,
        timestamp: new Date(),
        notes: measurementData.notes || '',
        verified: measurementData.verified || false
      };

      const docRef = await addDoc(collection(db, this.collections.measurements), measurement);
      return { id: docRef.id, ...measurement };
    } catch (error) {
      console.error('❌ Error logging measurement:', error);
      throw error;
    }
  }

  async getProgressData(userId, type = 'weight', days = 90) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const q = query(
        collection(db, this.collections.measurements),
        where('userId', '==', userId),
        where('type', '==', type),
        where('timestamp', '>=', since),
        orderBy('timestamp', 'asc')
      );

      const snapshot = await getDocs(q);
      const measurements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      }));

      return this.analyzeProgress(measurements, type);
    } catch (error) {
      console.error('❌ Error getting progress data:', error);
      return { measurements: [], analysis: null };
    }
  }

  analyzeProgress(measurements, type) {
    if (measurements.length < 2) return { measurements, analysis: null };

    const values = measurements.map(m => m.value);
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const changePercent = (change / first) * 100;

    const analysis = {
      totalChange: change,
      changePercent: changePercent.toFixed(1),
      trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      average: values.reduce((sum, v) => sum + v, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      consistency: this.calculateConsistency(values),
      predictions: this.predictNextWeek(measurements)
    };

    return { measurements, analysis };
  }

  /**
   * BIOMARKERS TRACKING
   */
  async logBiomarker(userId, biomarkerData) {
    try {
      const biomarker = {
        userId,
        type: biomarkerData.type, // 'blood_pressure', 'glucose', 'heart_rate', etc.
        systolic: biomarkerData.systolic || null,
        diastolic: biomarkerData.diastolic || null,
        value: biomarkerData.value || null,
        unit: biomarkerData.unit || '',
        timestamp: new Date(),
        context: biomarkerData.context || '', // 'fasting', 'post_meal', etc.
        notes: biomarkerData.notes || ''
      };

      const docRef = await addDoc(collection(db, this.collections.biomarkers), biomarker);
      return { id: docRef.id, ...biomarker };
    } catch (error) {
      console.error('❌ Error logging biomarker:', error);
      throw error;
    }
  }

  /**
   * INSIGHTS & CORRELATIONS
   */
  async generateInsights(userId) {
    try {
      console.log('🧠 Generating insights for user:', userId);

      const [moodData, progressData, nutritionData] = await Promise.all([
        this.getMoodHistory(userId, 30),
        this.getProgressData(userId, 'weight', 30),
        this.getNutritionHistory(userId, 30)
      ]);

      const insights = {
        userId,
        generatedAt: new Date(),
        moodInsights: this.generateMoodInsights(moodData),
        progressInsights: this.generateProgressInsights(progressData),
        nutritionInsights: this.generateNutritionInsights(nutritionData),
        correlations: this.findCrossDataCorrelations(moodData, progressData, nutritionData),
        recommendations: this.generateRecommendations(moodData, progressData, nutritionData)
      };

      // Sauvegarder les insights
      const docRef = await addDoc(collection(db, this.collections.insights), insights);
      return { id: docRef.id, ...insights };
    } catch (error) {
      console.error('❌ Error generating insights:', error);
      throw error;
    }
  }

  generateMoodInsights(moodData) {
    if (!moodData.trends) return null;

    const insights = [];
    const { trends } = moodData;

    if (trends.averageMood < 5) {
      insights.push({
        type: 'concern',
        message: 'Votre humeur moyenne est en dessous de la normale. Considérez consulter un professionnel.',
        priority: 'high'
      });
    }

    if (trends.energyTrend === 'decreasing') {
      insights.push({
        type: 'energy',
        message: 'Votre niveau d\'énergie diminue. Vérifiez votre alimentation et votre sommeil.',
        priority: 'medium'
      });
    }

    if (trends.correlations.food_mood > 0.7) {
      insights.push({
        type: 'nutrition',
        message: 'Forte corrélation entre votre alimentation et votre humeur détectée.',
        priority: 'medium'
      });
    }

    return insights;
  }

  generateProgressInsights(progressData) {
    if (!progressData.analysis) return null;

    const insights = [];
    const { analysis } = progressData;

    if (Math.abs(analysis.changePercent) > 5) {
      insights.push({
        type: 'progress',
        message: `Changement significatif de ${analysis.changePercent}% détecté.`,
        priority: 'high'
      });
    }

    if (analysis.consistency < 0.5) {
      insights.push({
        type: 'consistency',
        message: 'Vos mesures sont irrégulières. Essayez de mesurer à heures fixes.',
        priority: 'low'
      });
    }

    return insights;
  }

  /**
   * UTILITY METHODS
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  calculateConsistency(values) {
    if (values.length < 3) return 1;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Retourner un score de consistance (plus proche de 1 = plus consistant)
    return Math.max(0, 1 - (standardDeviation / mean));
  }

  findMoodCorrelations(entries) {
    // Calculer les corrélations entre différents facteurs
    return {
      food_mood: this.calculateCorrelation(
        entries.map(e => e.mealContext ? 1 : 0),
        entries.map(e => e.mood)
      ),
      energy_mood: this.calculateCorrelation(
        entries.map(e => e.energy),
        entries.map(e => e.mood)
      )
    };
  }

  calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  async getNutritionHistory(userId, days) {
    // TODO: Intégrer avec les données nutritionnelles existantes
    return { entries: [], trends: null };
  }

  findCrossDataCorrelations(moodData, progressData, nutritionData) {
    // TODO: Analyser les corrélations entre mood, progrès et nutrition
    return {
      mood_weight: 0,
      nutrition_mood: 0,
      exercise_energy: 0
    };
  }

  generateRecommendations(moodData, progressData, nutritionData) {
    const recommendations = [];

    // Recommandations basées sur l'humeur
    if (moodData.trends && moodData.trends.averageMood < 6) {
      recommendations.push({
        category: 'wellbeing',
        title: 'Améliorer votre humeur',
        description: 'Essayez d\'ajouter plus d\'oméga-3 et de magnésium à votre alimentation.',
        priority: 'high',
        actionable: true
      });
    }

    // Recommandations basées sur les progrès
    if (progressData.analysis && progressData.analysis.trend === 'stable') {
      recommendations.push({
        category: 'progress',
        title: 'Varier votre routine',
        description: 'Votre poids stagne. Il peut être temps de modifier votre programme.',
        priority: 'medium',
        actionable: true
      });
    }

    return recommendations;
  }

  predictNextWeek(measurements) {
    if (measurements.length < 3) return null;

    // Simple linear regression pour prédiction
    const values = measurements.map((m, i) => ({ x: i, y: m.value }));
    const n = values.length;
    
    const sumX = values.reduce((sum, v) => sum + v.x, 0);
    const sumY = values.reduce((sum, v) => sum + v.y, 0);
    const sumXY = values.reduce((sum, v) => sum + v.x * v.y, 0);
    const sumX2 = values.reduce((sum, v) => sum + v.x * v.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Prédire la valeur dans 7 jours
    const nextWeekValue = slope * (n + 7) + intercept;
    
    return {
      predictedValue: Math.round(nextWeekValue * 100) / 100,
      confidence: this.calculatePredictionConfidence(values, slope, intercept),
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
    };
  }

  calculatePredictionConfidence(values, slope, intercept) {
    // Calculer R² pour la confiance
    const yMean = values.reduce((sum, v) => sum + v.y, 0) / values.length;
    const totalSumSquares = values.reduce((sum, v) => sum + Math.pow(v.y - yMean, 2), 0);
    const residualSumSquares = values.reduce((sum, v) => {
      const predicted = slope * v.x + intercept;
      return sum + Math.pow(v.y - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (residualSumSquares / totalSumSquares);
    return Math.max(0, Math.min(1, rSquared)); // Entre 0 et 1
  }
}

export const trackingService = new TrackingService();
export default trackingService;