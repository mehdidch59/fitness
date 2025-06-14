/**
 * Service de Tracking et Analytics Simplifié (version démo)
 */

class SimpleTrackingAnalyticsService {
  constructor() {
    this.mockData = this.initializeMockData();
  }

  initializeMockData() {
    return {
      moodEntries: [],
      measurements: [],
      energyLevels: [],
      insights: []
    };
  }

  async recordMoodEntry(userId, moodData) {
    console.log('😊 Enregistrement mood (démo):', moodData);
    
    const entry = {
      id: `mood_${Date.now()}`,
      userId,
      ...moodData,
      timestamp: new Date()
    };
    
    this.mockData.moodEntries.push(entry);
    
    return {
      success: true,
      entry,
      consistency: this.calculateMoodConsistency()
    };
  }

  async recordMeasurements(userId, measurementData) {
    console.log('📏 Enregistrement mesures (démo):', measurementData);
    
    const entry = {
      id: `measurement_${Date.now()}`,
      userId,
      ...measurementData,
      timestamp: new Date()
    };
    
    this.mockData.measurements.push(entry);
    
    return {
      success: true,
      entry,
      trend: this.calculateTrend()
    };
  }

  async recordEnergyLevel(userId, energyData) {
    console.log('⚡ Enregistrement énergie (démo):', energyData);
    
    const entry = {
      id: `energy_${Date.now()}`,
      userId,
      ...energyData,
      timestamp: new Date()
    };
    
    this.mockData.energyLevels.push(entry);
    
    return {
      success: true,
      entry
    };
  }

  async generateInsights(userId) {
    console.log('🧠 Génération insights (démo) pour:', userId);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const insights = [
      {
        id: 'mood_trend',
        category: 'mood',
        type: 'positive',
        title: 'Amélioration de l\'humeur',
        description: 'Votre humeur s\'améliore depuis 3 jours',
        confidence: 85,
        recommendation: 'Continuez vos bonnes habitudes alimentaires'
      },
      {
        id: 'energy_correlation',
        category: 'energy',
        type: 'info',
        title: 'Énergie et protéines',
        description: 'Votre niveau d\'énergie augmente quand vous consommez plus de protéines',
        confidence: 78,
        recommendation: 'Maintenez 1.5g de protéines par kg de poids corporel'
      },
      {
        id: 'sleep_nutrition',
        category: 'sleep',
        type: 'warning',
        title: 'Qualité de sommeil',
        description: 'Les repas tardifs peuvent affecter votre sommeil',
        confidence: 72,
        recommendation: 'Évitez les repas lourds 3h avant le coucher'
      }
    ];

    return {
      insights,
      generatedAt: new Date().toISOString(),
      userId
    };
  }

  async generateMonthlyReport(userId) {
    console.log('📊 Génération rapport mensuel (démo)');
    
    return {
      reportId: `report_${Date.now()}`,
      userId,
      period: 'monthly',
      summary: {
        totalMealsLogged: 85,
        avgMoodScore: 7.2,
        avgEnergyLevel: 6.8,
        weightChange: -1.2,
        bodyFatChange: -0.8
      },
      achievements: [
        'Suivi régulier pendant 28 jours',
        'Amélioration de l\'humeur de 15%',
        'Perte de poids progressive'
      ],
      recommendations: [
        'Augmenter la consommation de légumes',
        'Maintenir la régularité des repas',
        'Continuer le suivi quotidien'
      ],
      generatedAt: new Date()
    };
  }

  calculateMoodConsistency() {
    return Math.floor(Math.random() * 30) + 70; // 70-100%
  }

  calculateTrend() {
    const trends = ['improving', 'stable', 'declining'];
    return trends[Math.floor(Math.random() * trends.length)];
  }
}

export const trackingAnalyticsService = new SimpleTrackingAnalyticsService();
export default trackingAnalyticsService;