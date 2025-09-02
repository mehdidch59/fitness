import { useState } from 'react';
import { MotionSection, MotionButton } from '../ui/animations';
import { Calendar, Search, Settings, Play, Apple, RefreshCw, Zap, Camera, Trophy } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useNutrition } from '../../hooks/useNutrition';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../utils/i18n';
import { useAuth } from '../../hooks/useAuth';

function HomeView() {
  const { 
    searchStatus,
    equipmentProfile,
    nutritionProfile,
    actions 
  } = useAppContext();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  
  // Utiliser les hooks personnalisés
  const { workoutPrograms, isLoading: isLoadingWorkouts, findSuitableWorkouts } = useWorkouts();
  const { nutritionPlans, generateNutritionPlan, isAddingPlan } = useNutrition();
  
  // Variables pour contrôler les états de chargement
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Gérer la génération de programme d'entraînement
  const handleGenerateWorkout = async () => {
    if (!equipmentProfile.location) {
      // Montrer une alerte ou un message
      return;
    }
    
    setLoadingWorkout(true);
    actions.setSearchStatus('Recherche de programmes...');
    
    try {
      await findSuitableWorkouts();
    } catch (error) {
      console.error('Erreur lors de la recherche de programmes:', error);
    } finally {
      setLoadingWorkout(false);
    }
  };
  
  // Gérer la génération de plan nutritionnel
  const handleGenerateNutrition = async () => {
    if (!nutritionProfile.dietType) {
      // Montrer une alerte ou un message
      return;
    }
    
    setLoadingRecipes(true);
    actions.setSearchStatus('Recherche de recettes...');
    
    try {
      await generateNutritionPlan();
    } catch (error) {
      console.error('Erreur lors de la recherche de recettes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  return (
    <MotionSection className="pb-20 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 dark:from-indigo-700 dark:to-violet-700 text-white p-6 sm:p-8 rounded-b-3xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2">ZenFit 💪</h1>
        <p className="opacity-90 text-lg">{t('home.subtitle', 'Programmes personnalisés avec l\'IA')}</p>
      </div>

      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <Calendar className="mb-3 text-purple-500" size={28} />
            <p className="text-sm text-gray-600">{t('home.sessions', 'Séances')}</p>
            <p className="text-3xl font-bold">{workoutPrograms ? workoutPrograms.length : 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <Search className="mb-3 text-blue-500" size={28} />
            <p className="text-sm text-gray-600">{t('home.searches', 'Recherches IA')}</p>
            <p className="text-3xl font-bold">{nutritionPlans ? nutritionPlans.length : 0}</p>
          </div>        </div>

        {/* Nouvelles fonctionnalités avancées */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-700 dark:to-purple-800 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center mb-4">
            <Zap className="mr-3" size={28} />
            <h3 className="text-xl font-bold">{t('home.advanced.title', 'Fonctionnalités IA Avancées')}</h3>
          </div>
          <p className="mb-4 opacity-90">
            {t('home.advanced.desc', 'Découvrez nos nouvelles fonctionnalités révolutionnaires !')}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl flex items-center">
              <Camera className="mr-2" size={20} />
              <span className="text-sm font-medium">{t('home.advanced.fridge', 'Scanner Frigo')}</span>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl flex items-center">
              <Calendar className="mr-2" size={20} />
              <span className="text-sm font-medium">{t('home.advanced.mealPlanning', 'Meal Planning')}</span>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl flex items-center">
              <Trophy className="mr-2" size={20} />
              <span className="text-sm font-medium">{t('home.advanced.gamification', 'Gamification')}</span>
            </div>
          </div>
          
          <Link
            to="/advanced"
            className="block w-full bg-white dark:bg-gray-800 text-indigo-600 dark:text-white py-3 px-6 rounded-xl font-bold text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {t('home.advanced.cta', 'Découvrir les Fonctionnalités IA+')}
          </Link>
        </div>

        <div className="space-y-4">
        {(!equipmentProfile.location || !nutritionProfile.dietType) && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-700">
            <Settings className="mx-auto mb-3 text-yellow-500" size={32} />
            <h3 className="font-semibold text-center mb-4">{t('home.required', 'Configuration requise')}</h3>
            <MotionButton
              onClick={() => {
                if (!isAuthenticated) {
                  navigate('/auth');
                  return;
                }
                navigate('/settings');
              }}
              className="w-full bg-gradient-to-r from-yellow-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-md hover:from-yellow-600 hover:to-red-600 active:scale-95 transition-all duration-200"
            >
              {t('home.openSettings', 'Ouvrir les paramètres')}
            </MotionButton>
          </div>
        )}

          <MotionButton
            onClick={handleGenerateWorkout}
            disabled={loadingWorkout || isLoadingWorkouts || !equipmentProfile.location}
            className={`w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center space-x-3 transition-all ${!equipmentProfile.location
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 dark:from-indigo-500 dark:to-violet-600 text-white hover:shadow-lg'
              }`}
          >
            {loadingWorkout || isLoadingWorkouts ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                <span>{t('common.searching', 'Recherche...')}</span>
              </>
            ) : (
              <>
                <Play size={28} />
                <span>{t('home.generateWorkout', 'Générer Programme IA')}</span>
              </>
            )}
          </MotionButton>

          <MotionButton
            onClick={handleGenerateNutrition}
            disabled={loadingRecipes || isAddingPlan || !nutritionProfile.dietType}
            className={`w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center space-x-3 transition-all ${!nutritionProfile.dietType
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-blue-500 dark:from-emerald-500 dark:to-teal-600 text-white hover:shadow-lg'
              }`}
          >
            {loadingRecipes || isAddingPlan ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                <span>{t('common.searching', 'Recherche...')}</span>
              </>
            ) : (
              <>
                <Apple size={28} />
                <span>{t('home.findRecipes', 'Trouver Recettes IA')}</span>
              </>
            )}
          </MotionButton>
        </div>

        {searchStatus && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-4 rounded-xl">
            <p className="text-blue-800 dark:text-blue-200 text-center font-medium">{searchStatus}</p>
          </div>
        )}
      </div>
    </MotionSection>
  );
}

export default HomeView;
