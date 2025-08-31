import { useState } from 'react';
import { 
  Brain, Camera, Heart, TrendingUp, 
  Sparkles, Clock, Target, Zap, Star,
  Play, BarChart3
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { personalAICoachService } from '../../services/personalAICoachService';
import { aiPersonalizationService } from '../../services/aiPersonalizationService';
import { advancedAIService } from '../../services/advancedAIService';

function IAView() {
  const { userProfile, actions } = useAppContext();
  const [user] = useAuthState(auth);
  const [activeFeature, setActiveFeature] = useState('coach');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState({});
  const [mood, setMood] = useState('énergique');
  const [budget, setBudget] = useState(50);
  const [duration, setDuration] = useState(7);
  const isLoggedIn = Boolean(user?.uid);

  // Fonctionnalités IA disponibles
  const features = [
    {
      id: 'coach',
      title: 'Coach IA Personnel',
      description: 'Conseils personnalisés basés sur vos habitudes',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      id: 'mood',
      title: 'Recettes par Humeur',
      description: 'Des recettes adaptées à votre état d\'esprit',
      icon: Heart,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      id: 'fridge',
      title: 'Scanner Frigo',
      description: 'Générez des recettes avec vos ingrédients',
      icon: Camera,
      color: 'from-green-500 to-teal-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      id: 'budget',
      title: 'Recettes Économiques',
      description: 'Planifiez vos repas selon votre budget',
      icon: Target,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      id: 'insights',
      title: 'Analyses & Insights',
      description: 'Comprenez vos habitudes alimentaires',
      icon: BarChart3,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    }
  ];

  // Générer des conseils du coach IA
  const generateCoachAdvice = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const advice = await personalAICoachService.generatePersonalizedCoaching(
        user.uid, 
        userProfile.goal || 'general'
      );
      setResults(prev => ({ ...prev, coach: advice }));
      actions.setSearchStatus('Conseils du coach IA générés !');
    } catch (error) {
      console.error('Erreur coach IA:', error);
      actions.setSearchStatus('Erreur lors de la génération des conseils');
    } finally {
      setIsLoading(false);
    }
  };

  // Générer des recettes par humeur
  const generateMoodRecipes = async () => {
    setIsLoading(true);
    try {
      const recipes = await aiPersonalizationService.generateMoodBasedRecipes(
        mood, 
        userProfile
      );
      setResults(prev => ({ ...prev, mood: recipes }));
      actions.setSearchStatus(`Recettes ${mood} générées !`);
    } catch (error) {
      console.error('Erreur recettes mood:', error);
      actions.setSearchStatus('Erreur lors de la génération des recettes');
    } finally {
      setIsLoading(false);
    }
  };

  // Générer des recettes économiques
  const generateBudgetRecipes = async () => {
    setIsLoading(true);
    try {
      const recipes = await advancedAIService.generateBudgetRecipes(
        budget, 
        duration, 
        userProfile
      );
      setResults(prev => ({ ...prev, budget: recipes }));
      actions.setSearchStatus(`Plan ${duration} jours à ${budget}€ généré !`);
    } catch (error) {
      console.error('Erreur recettes budget:', error);
      actions.setSearchStatus('Erreur lors de la génération du plan');
    } finally {
      setIsLoading(false);
    }
  };

  // Simuler le scan de frigo (en attendant l'implémentation complète)
  const simulateFridgeScan = async () => {
    setIsLoading(true);
    try {
      // Simulation de données de frigo
      const mockIngredients = [
        { name: 'œufs', quantity: '6', freshness: 'fresh' },
        { name: 'lait', quantity: '1L', freshness: 'fresh' },
        { name: 'tomates', quantity: '4', freshness: 'good' },
        { name: 'fromage', quantity: '200g', freshness: 'fresh' },
        { name: 'pain', quantity: '1', freshness: 'good' }
      ];
      
      const recipes = await aiPersonalizationService.generateRecipesFromIngredients(
        mockIngredients, 
        user?.uid
      );
      
      setResults(prev => ({ 
        ...prev, 
        fridge: { 
          detectedIngredients: mockIngredients, 
          recipes: recipes,
          wasteReduction: 75 
        }
      }));
      
      actions.setSearchStatus('Scan du frigo simulé avec succès !');
    } catch (error) {
      console.error('Erreur scan frigo:', error);
      actions.setSearchStatus('Erreur lors du scan du frigo');
    } finally {
      setIsLoading(false);
    }
  };

  // Générer des analyses
  const generateInsights = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const insights = await personalAICoachService.analyzeNutritionalHabits(
        user.uid, 
        'week'
      );
      setResults(prev => ({ ...prev, insights }));
      actions.setSearchStatus('Analyses générées avec succès !');
    } catch (error) {
      console.error('Erreur analyses:', error);
      actions.setSearchStatus('Erreur lors de la génération des analyses');
    } finally {
      setIsLoading(false);
    }
  };

  // Actions pour chaque fonctionnalité
  const handleFeatureAction = async (featureId) => {
    if (!isLoggedIn) {
      actions.setSearchStatus("Connectez-vous pour utiliser l'IA+");
      return;
    }
    switch (featureId) {
      case 'coach':
        await generateCoachAdvice();
        break;
      case 'mood':
        await generateMoodRecipes();
        break;
      case 'fridge':
        await simulateFridgeScan();
        break;
      case 'budget':
        await generateBudgetRecipes();
        break;
      case 'insights':
        await generateInsights();
        break;
      default:
        break;
    }
  };

  return (
    <div className="pb-20 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 text-white p-6 sm:p-8 rounded-b-3xl shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-5xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Brain className="mr-3" size={32} />
              IA+ Avancée
            </h1>
            <p className="opacity-90 text-lg mt-2">
              Intelligence artificielle au service de votre bien-être
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-sm opacity-90">
              <Sparkles size={16} className="mr-2" />
              Fonctionnalités IA actives
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {!isLoggedIn && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p>
                Connexion requise: connectez-vous pour utiliser les fonctionnalités IA+.
              </p>
              <Link
                to="/auth"
                className="ml-4 px-4 py-2 rounded-xl bg-yellow-600 text-white font-semibold hover:bg-yellow-700"
              >
                Se connecter
              </Link>
            </div>
          </div>
        )}
        {/* Navigation des fonctionnalités */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Zap className="mr-2 text-purple-600" />
            Fonctionnalités Disponibles
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isActive = activeFeature === feature.id;
              
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isActive 
                      ? `border-purple-500 bg-gradient-to-r ${feature.color} text-white shadow-lg` 
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <Icon size={24} className={isActive ? 'text-white' : feature.textColor} />
                    <h3 className={`font-semibold ml-3 ${isActive ? 'text-white' : 'text-gray-800'}`}>
                      {feature.title}
                    </h3>
                  </div>
                  <p className={`text-sm ${isActive ? 'text-white/90' : 'text-gray-600'}`}>
                    {feature.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone de contenu actif */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {features.map((feature) => {
            if (activeFeature !== feature.id) return null;
            
            const Icon = feature.icon;
            const featureResults = results[feature.id];
            
            return (
              <div key={feature.id}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${feature.color} mr-4`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{feature.title}</h2>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleFeatureAction(feature.id)}
                    disabled={isLoading || !isLoggedIn}
                    className={`px-6 py-3 rounded-xl font-semibold flex items-center ${
                      isLoading || !isLoggedIn
                        ? 'bg-gray-400 cursor-not-allowed'
                        : `bg-gradient-to-r ${feature.color} text-white hover:shadow-lg`
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Génération...
                      </>
                    ) : (
                      <>
                        <Play size={16} className="mr-2" />
                        {isLoggedIn ? 'Générer' : 'Connexion requise'}
                      </>
                    )}
                  </button>
                </div>

                {/* Paramètres spécifiques selon la fonctionnalité */}
                {activeFeature === 'mood' && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sélectionnez votre humeur actuelle :
                    </label>
                    <select
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="énergique">Énergique 😊</option>
                      <option value="fatigué">Fatigué 😴</option>
                      <option value="stressé">Stressé 😰</option>
                      <option value="triste">Triste 😢</option>
                      <option value="happy">Heureux 😀</option>
                    </select>
                  </div>
                )}

                {activeFeature === 'budget' && (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Budget total (€) :
                      </label>
                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="10"
                        max="200"
                      />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Durée (jours) :
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        min="1"
                        max="14"
                      />
                    </div>
                  </div>
                )}

                {/* Affichage des résultats */}
                {featureResults && (
                  <div className="mt-6">
                    <div className="flex items-center mb-4">
                      <Star className="text-yellow-500 mr-2" />
                      <h3 className="text-lg font-semibold">Résultats générés</h3>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                      {activeFeature === 'coach' && featureResults.personalizedMessage && (
                        <div className="space-y-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-green-700 mb-2">Message personnalisé</h4>
                            <p className="text-gray-700">{featureResults.personalizedMessage}</p>
                          </div>
                          
                          {featureResults.actionPlan && (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-blue-700 mb-2">Plan d'action</h4>
                              <div className="space-y-2">
                                {featureResults.actionPlan.map((action, idx) => (
                                  <div key={idx} className="flex items-center p-2 bg-gray-50 rounded">
                                    <Target size={16} className="text-blue-500 mr-2" />
                                    <span className="text-sm">{action.action}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeFeature === 'mood' && Array.isArray(featureResults) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {featureResults.map((recipe, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-purple-700 mb-2">{recipe.name}</h4>
                              <p className="text-sm text-gray-600 mb-2">{recipe.description}</p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock size={14} className="mr-1" />
                                {recipe.prepTime} min • {recipe.nutritionHighlights?.join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeFeature === 'fridge' && featureResults.recipes && (
                        <div className="space-y-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-green-700 mb-2">Ingrédients détectés</h4>
                            <div className="flex flex-wrap gap-2">
                              {featureResults.detectedIngredients?.map((ing, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                  {ing.name} ({ing.quantity})
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-blue-700 mb-2">Recettes suggérées</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {featureResults.recipes?.map((recipe, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                  <h5 className="font-medium">{recipe.name}</h5>
                                  <p className="text-sm text-gray-600">{recipe.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeFeature === 'budget' && featureResults.recipes && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="bg-white p-3 rounded-lg text-center">
                              <div className="text-2xl font-bold text-green-600">{featureResults.budgetPerDay}€</div>
                              <div className="text-xs text-gray-600">par jour</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg text-center">
                              <div className="text-2xl font-bold text-blue-600">{featureResults.recipes?.length || 0}</div>
                              <div className="text-xs text-gray-600">recettes</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg text-center">
                              <div className="text-2xl font-bold text-purple-600">{featureResults.savings?.potential || 0}%</div>
                              <div className="text-xs text-gray-600">économies</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg text-center">
                              <div className="text-2xl font-bold text-orange-600">{featureResults.duration}</div>
                              <div className="text-xs text-gray-600">jours</div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-green-700 mb-2">Recettes économiques</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {featureResults.recipes?.map((recipe, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                  <h5 className="font-medium">{recipe.name}</h5>
                                  <p className="text-sm text-gray-600">Coût: {recipe.estimatedCost}€ • Pour {recipe.servings} pers.</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeFeature === 'insights' && featureResults.summary && (
                        <div className="space-y-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-blue-700 mb-2">Résumé de vos habitudes</h4>
                            <p className="text-gray-700">{featureResults.summary}</p>
                          </div>
                          
                          {featureResults.score !== undefined && (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-green-700 mb-2">Score nutritionnel</h4>
                              <div className="flex items-center">
                                <div className="text-3xl font-bold text-green-600 mr-4">{featureResults.score}/100</div>
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full" 
                                      style={{ width: `${featureResults.score}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {featureResults.recommendations && (
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-purple-700 mb-2">Recommandations</h4>
                              <div className="space-y-2">
                                {featureResults.recommendations.map((rec, idx) => (
                                  <div key={idx} className="flex items-start p-2 bg-gray-50 rounded">
                                    <TrendingUp size={16} className="text-purple-500 mr-2 mt-0.5" />
                                    <div>
                                      <div className="font-medium text-sm">{rec.title}</div>
                                      <div className="text-xs text-gray-600">{rec.description}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Message d'aide si pas de résultats */}
                {!featureResults && !isLoading && (
                  <div className="text-center py-12">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center`}>
                      <Icon size={32} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Prêt à utiliser {feature.title} ?
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Cliquez sur "Générer" pour découvrir les recommandations IA personnalisées.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section d'information */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center mb-4">
            <Sparkles className="text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-purple-800">À propos de l'IA+</h3>
          </div>
          <p className="text-purple-700 mb-4">
            Nos fonctionnalités IA utilisent l'intelligence artificielle pour vous offrir des recommandations 
            personnalisées basées sur vos données, vos préférences et vos objectifs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <Brain size={16} className="text-purple-600 mr-2" />
              <span>Apprentissage continu</span>
            </div>
            <div className="flex items-center">
              <Target size={16} className="text-purple-600 mr-2" />
              <span>Recommandations ciblées</span>
            </div>
            <div className="flex items-center">
              <TrendingUp size={16} className="text-purple-600 mr-2" />
              <span>Amélioration constante</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IAView;
