import React, { useState } from 'react';
import { Calendar, Search, Settings, Play, Apple, RefreshCw, Zap, Camera, Trophy } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useWorkouts } from '../../hooks/useWorkouts';
import { useNutrition } from '../../hooks/useNutrition';
import { Link } from 'react-router-dom';

function HomeView() {
  const { 
    searchStatus,
    equipmentProfile,
    nutritionProfile,
    actions 
  } = useAppContext();
  
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
    <div className="pb-20 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-8 rounded-b-3xl shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Fitness IA 💪</h1>
        <p className="opacity-90 text-lg">Programmes personnalisés par recherche web</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <Calendar className="mb-3 text-purple-500" size={28} />
            <p className="text-sm text-gray-600">Séances</p>
            <p className="text-3xl font-bold">{workoutPrograms ? workoutPrograms.length : 0}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg">
            <Search className="mb-3 text-blue-500" size={28} />
            <p className="text-sm text-gray-600">Recherches IA</p>
            <p className="text-3xl font-bold">{nutritionPlans ? nutritionPlans.length : 0}</p>
          </div>        </div>

        {/* Nouvelles fonctionnalités avancées */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center mb-4">
            <Zap className="mr-3" size={28} />
            <h3 className="text-xl font-bold">Fonctionnalités IA Avancées</h3>
          </div>
          <p className="mb-4 opacity-90">
            Découvrez nos nouvelles fonctionnalités révolutionnaires !
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl flex items-center">
              <Camera className="mr-2" size={20} />
              <span className="text-sm font-medium">Scanner Frigo</span>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl flex items-center">
              <Calendar className="mr-2" size={20} />
              <span className="text-sm font-medium">Meal Planning</span>
            </div>
            <div className="bg-white bg-opacity-20 p-3 rounded-xl flex items-center">
              <Trophy className="mr-2" size={20} />
              <span className="text-sm font-medium">Gamification</span>
            </div>
          </div>
          
          <Link
            to="/advanced"
            className="block w-full bg-white text-indigo-600 py-3 px-6 rounded-xl font-bold text-center hover:bg-gray-100 transition-colors"
          >
            Découvrir les Fonctionnalités IA+
          </Link>
        </div>

        <div className="space-y-4">
          {(!equipmentProfile.location || !nutritionProfile.dietType) && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-yellow-200">
              <Settings className="mx-auto mb-3 text-yellow-500" size={32} />
              <h3 className="font-semibold text-center mb-4">Configuration requise</h3>
              <button
                onClick={() => actions.setQuestionnaire(true)}
                className="w-full bg-gradient-to-r from-yellow-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:from-yellow-600 hover:to-red-600 active:scale-95 transition-all duration-200"
              >
                Commencer la configuration
              </button>
            </div>
          )}

          <button
            onClick={handleGenerateWorkout}
            disabled={loadingWorkout || isLoadingWorkouts || !equipmentProfile.location}
            className={`w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center space-x-3 transition-all ${!equipmentProfile.location
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
              }`}
          >
            {loadingWorkout || isLoadingWorkouts ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                <span>Recherche...</span>
              </>
            ) : (
              <>
                <Play size={28} />
                <span>Générer Programme IA</span>
              </>
            )}
          </button>

          <button
            onClick={handleGenerateNutrition}
            disabled={loadingRecipes || isAddingPlan || !nutritionProfile.dietType}
            className={`w-full py-6 rounded-2xl font-bold text-xl flex items-center justify-center space-x-3 transition-all ${!nutritionProfile.dietType
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:shadow-lg'
              }`}
          >
            {loadingRecipes || isAddingPlan ? (
              <>
                <RefreshCw size={28} className="animate-spin" />
                <span>Recherche...</span>
              </>
            ) : (
              <>
                <Apple size={28} />
                <span>Trouver Recettes IA</span>
              </>
            )}
          </button>
        </div>

        {searchStatus && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
            <p className="text-blue-800 text-center font-medium">{searchStatus}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center justify-center">
            <Search className="text-blue-600 mr-2" size={20} />
            <span className="text-blue-800 font-semibold">
              Recherche web en temps réel
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeView; 