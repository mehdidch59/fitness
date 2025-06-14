/**
 * Composant de test pour les nouvelles fonctionnalités avancées
 * Scanner Frigo + Meal Planning + Gamification
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './AdvancedFeaturesDemo.css';

// Import conditionnel des services pour éviter les erreurs
let fridgeScannerService, mealPlanningService, gamificationService, integratedFeaturesService;

try {
  fridgeScannerService = require('../services/fridgeScannerService').default;
  mealPlanningService = require('../services/mealPlanningService').default;
  gamificationService = require('../services/gamificationService').default;
  integratedFeaturesService = require('../services/integratedFeaturesService').default;
} catch (error) {
  console.warn('Certains services avancés ne sont pas disponibles:', error.message);
}

const AdvancedFeaturesDemo = () => {
  const { user } = useAuth();
  const userId = user?.uid || 'demo_user';
  
  const [activeDemo, setActiveDemo] = useState('scanner');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState([]);
  const [servicesAvailable, setServicesAvailable] = useState(false);

  useEffect(() => {
    // Vérifier si les services sont disponibles
    const available = !!(fridgeScannerService && mealPlanningService && gamificationService && integratedFeaturesService);
    setServicesAvailable(available);
    
    if (available) {
      loadUserGamificationData();
    }
  }, [userId]);

  const loadUserGamificationData = async () => {
    if (!gamificationService) return;
    
    try {
      const userData = await gamificationService.getUserData(userId);
      const badges = await gamificationService.getUserBadges(userId);
      setUserPoints(userData.totalScore || 0);
      setUserBadges(badges);
    } catch (error) {
      console.error('Erreur chargement données gamification:', error);
    }
  };
  // ===================
  // DEMO SCANNER FRIGO
  // ===================
  const handleFridgeScan = async (event) => {
    const file = event.target.files[0];
    if (!file || !integratedFeaturesService) return;

    setLoading(true);
    try {
      console.log('🔍 Démarrage démo scanner frigo...');
      
      // Simuler un scan réussi si les services ne sont pas disponibles
      if (!servicesAvailable) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setResults({
          type: 'fridge_scan',
          data: {
            fridgeScan: {
              detectedIngredients: [
                { name: 'tomates', quantity: '4', freshness: 85 },
                { name: 'œufs', quantity: '6', freshness: 90 },
                { name: 'fromage', quantity: '150g', freshness: 80 }
              ],
              suggestedRecipes: [
                { name: 'Omelette aux tomates', fridgeUsage: 95 }
              ]
            },
            scanReward: { pointsEarned: 15, newBadges: [] }
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Utiliser le workflow intégré
      const workflowResult = await integratedFeaturesService.executeCompleteWorkflow(
        userId, 
        'fridge_to_meal_plan', 
        { imageFile: file, planDuration: 'weekly' }
      );

      setResults({
        type: 'fridge_scan',
        data: workflowResult.results,
        timestamp: new Date().toISOString()
      });

      // Mettre à jour les points
      await loadUserGamificationData();

    } catch (error) {
      console.error('Erreur démo scanner:', error);
      setResults({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  // ===================
  // DEMO MEAL PLANNING
  // ===================
  const handleGenerateMealPlan = async () => {
    setLoading(true);
    try {
      console.log('📅 Démarrage démo meal planning...');
      
      if (!servicesAvailable) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setResults({
          type: 'meal_plan',
          data: {
            mealPlan: {
              planId: 'demo_plan',
              title: 'Plan Équilibré (Démo)',
              days: [
                { date: '2024-01-01', meals: { breakfast: { name: 'Avoine aux fruits' } } }
              ]
            },
            reward: { pointsEarned: 30 }
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      const planConfig = {
        duration: 'weekly',
        goal: 'balanced_nutrition',
        dietType: 'balanced',
        targetCalories: 2000,
        budget: 50,
        constraints: ['quick_meals'],
        allergies: [],
        preferences: ['mediterranean'],
        startDate: new Date().toISOString().split('T')[0]
      };

      const mealPlan = await mealPlanningService.generateMealPlan(userId, planConfig);
      
      // Récompenser la planification
      const reward = await gamificationService.awardPoints(userId, 'mealPlanFollowed');

      setResults({
        type: 'meal_plan',
        data: { mealPlan, reward },
        timestamp: new Date().toISOString()
      });

      await loadUserGamificationData();

    } catch (error) {
      console.error('Erreur démo meal planning:', error);
      setResults({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // ===================
  // DEMO GAMIFICATION
  // ===================
  const handleTestGamification = async () => {
    setLoading(true);
    try {
      console.log('🎮 Démarrage démo gamification...');
      
      // Simuler plusieurs actions pour gagner des points
      const actions = [
        { action: 'mealLogged', metadata: { mealType: 'breakfast', nutrition: { protein: 25, carbs: 30, fat: 15 } } },
        { action: 'recipeCompleted', metadata: { difficulty: 'medium', time: 30 } },
        { action: 'fridgeScanned', metadata: { ingredientsCount: 8 } }
      ];

      const results = [];
      for (const { action, metadata } of actions) {
        const result = await gamificationService.awardPoints(userId, action, metadata);
        results.push({ action, result });
        
        // Pause entre les actions
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Créer un challenge
      const challenge = await gamificationService.createWeeklyChallenge(userId);

      setResults({
        type: 'gamification',
        data: { actions: results, challenge },
        timestamp: new Date().toISOString()
      });

      await loadUserGamificationData();

    } catch (error) {
      console.error('Erreur démo gamification:', error);
      setResults({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // ===================
  // DEMO WORKFLOW INTÉGRÉ
  // ===================
  const handleIntegratedWorkflow = async () => {
    setLoading(true);
    try {
      console.log('🚀 Démarrage workflow intégré...');
      
      // Simuler données de repas avec mood
      const mealData = {
        id: `meal_${Date.now()}`,
        type: 'lunch',
        name: 'Salade méditerranéenne',
        nutrition: { calories: 350, protein: 20, carbs: 25, fat: 18, vegetables: 3 },
        cost: 4.50,
        timestamp: new Date().toISOString()
      };

      const moodData = {
        moodScore: 8,
        energy: 7,
        satisfaction: 9,
        notes: 'Repas très satisfaisant et énergisant'
      };

      const workflowResult = await integratedFeaturesService.executeCompleteWorkflow(
        userId,
        'meal_logging_with_rewards',
        { mealData, moodData }
      );

      setResults({
        type: 'integrated_workflow',
        data: workflowResult.results,
        timestamp: new Date().toISOString()
      });

      await loadUserGamificationData();

    } catch (error) {
      console.error('Erreur workflow intégré:', error);
      setResults({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  // ===================
  // RENDERING
  // ===================
  return (
    <div className="advanced-features-demo">
      <div className="demo-header">
        <h2>🚀 Démo Fonctionnalités Avancées</h2>
        <div className="user-stats">
          <div className="points-display">
            <span className="points-icon">🏆</span>
            <span className="points-value">{userPoints}</span>
            <span className="points-label">points</span>
          </div>
          <div className="badges-display">
            <span className="badges-icon">🎖️</span>
            <span className="badges-count">{userBadges.length}</span>
            <span className="badges-label">badges</span>
          </div>
        </div>
      </div>

      {/* Information sur le statut des services */}
      {!servicesAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-bold text-yellow-800">Mode Démonstration</h3>
              <p className="text-yellow-700">
                Les services avancés sont en cours de chargement. Vous pouvez tester l'interface avec des données simulées.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation des démos */}
      <div className="demo-navigation">
        <button 
          className={`demo-nav-btn ${activeDemo === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveDemo('scanner')}
        >
          📸 Scanner Frigo
        </button>
        <button 
          className={`demo-nav-btn ${activeDemo === 'planning' ? 'active' : ''}`}
          onClick={() => setActiveDemo('planning')}
        >
          📅 Meal Planning
        </button>
        <button 
          className={`demo-nav-btn ${activeDemo === 'gamification' ? 'active' : ''}`}
          onClick={() => setActiveDemo('gamification')}
        >
          🎮 Gamification
        </button>
        <button 
          className={`demo-nav-btn ${activeDemo === 'integrated' ? 'active' : ''}`}
          onClick={() => setActiveDemo('integrated')}
        >
          🚀 Workflow Intégré
        </button>
      </div>

      {/* Contenu des démos */}
      <div className="demo-content">
        {activeDemo === 'scanner' && (
          <div className="demo-section">
            <h3>📸 Scanner de Frigo Intelligent</h3>
            <p>Uploadez une photo de votre frigo pour détecter les ingrédients et générer automatiquement un plan de repas optimisé.</p>
            
            <div className="demo-controls">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFridgeScan}
                disabled={loading}
                className="file-input"
              />
              {loading && <div className="loading">🔍 Analyse en cours...</div>}
            </div>

            <div className="demo-features">
              <div className="feature-item">✅ Détection IA des ingrédients</div>
              <div className="feature-item">✅ Analyse de fraîcheur</div>
              <div className="feature-item">✅ Génération automatique de recettes</div>
              <div className="feature-item">✅ Calcul anti-gaspillage</div>
              <div className="feature-item">✅ Points et badges automatiques</div>
            </div>
          </div>
        )}

        {activeDemo === 'planning' && (
          <div className="demo-section">
            <h3>📅 Meal Planning Intelligent</h3>
            <p>Génération automatique de plans de repas personnalisés avec liste de courses et optimisation nutritionnelle.</p>
            
            <div className="demo-controls">
              <button 
                onClick={handleGenerateMealPlan}
                disabled={loading}
                className="demo-action-btn"
              >
                {loading ? '📅 Génération...' : '📅 Générer Plan de Repas'}
              </button>
            </div>

            <div className="demo-features">
              <div className="feature-item">✅ IA nutritionniste personnalisée</div>
              <div className="feature-item">✅ Optimisation automatique du coût</div>
              <div className="feature-item">✅ Calendrier interactif</div>
              <div className="feature-item">✅ Liste de courses intelligente</div>
              <div className="feature-item">✅ Adaptation aux préférences</div>
            </div>
          </div>
        )}

        {activeDemo === 'gamification' && (
          <div className="demo-section">
            <h3>🎮 Système de Gamification</h3>
            <p>Points, badges, niveaux et challenges pour motiver vos habitudes alimentaires saines.</p>
            
            <div className="demo-controls">
              <button 
                onClick={handleTestGamification}
                disabled={loading}
                className="demo-action-btn"
              >
                {loading ? '🎮 Test en cours...' : '🎮 Tester Gamification'}
              </button>
            </div>

            <div className="demo-features">
              <div className="feature-item">✅ Système de points dynamique</div>
              <div className="feature-item">✅ Badges et achievements</div>
              <div className="feature-item">✅ Challenges hebdomadaires</div>
              <div className="feature-item">✅ Streaks et bonus</div>
              <div className="feature-item">✅ Leaderboard social</div>
            </div>
          </div>
        )}

        {activeDemo === 'integrated' && (
          <div className="demo-section">
            <h3>🚀 Workflow Intégré</h3>
            <p>Démonstration du workflow complet : enregistrement repas + tracking humeur + récompenses + insights.</p>
            
            <div className="demo-controls">
              <button 
                onClick={handleIntegratedWorkflow}
                disabled={loading}
                className="demo-action-btn"
              >
                {loading ? '🚀 Workflow...' : '🚀 Lancer Workflow Complet'}
              </button>
            </div>

            <div className="demo-features">
              <div className="feature-item">✅ Enregistrement automatique</div>
              <div className="feature-item">✅ Tracking humeur et énergie</div>
              <div className="feature-item">✅ Attribution points intelligente</div>
              <div className="feature-item">✅ Insights nutritionnels IA</div>
              <div className="feature-item">✅ Recommandations personnalisées</div>
            </div>
          </div>
        )}
      </div>

      {/* Affichage des résultats */}
      {results && (
        <div className="demo-results">
          <h3>📊 Résultats de la Démo</h3>
          <div className="results-container">
            {results.type === 'error' ? (
              <div className="error-result">
                ❌ Erreur: {results.message}
              </div>
            ) : (
              <div className="success-result">
                <div className="result-header">
                  ✅ Démo {results.type} réussie
                  <span className="timestamp">{new Date(results.timestamp).toLocaleTimeString()}</span>
                </div>
                <pre className="result-data">
                  {JSON.stringify(results.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Badges utilisateur */}
      {userBadges.length > 0 && (
        <div className="user-badges">
          <h3>🎖️ Vos Badges</h3>
          <div className="badges-grid">
            {userBadges.map((badge, index) => (
              <div key={index} className="badge-item">
                <span className="badge-icon">{badge.badge.icon}</span>
                <span className="badge-name">{badge.badge.name}</span>
                <span className="badge-description">{badge.badge.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFeaturesDemo;