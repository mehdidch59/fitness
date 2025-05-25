import React, { useState } from 'react';
import { Apple, Clock, Search, RefreshCw } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useMassGainRecipes } from '../../hooks/useNutrition';

function NutritionView() {
  const { actions } = useAppContext();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Utiliser le hook pour rechercher automatiquement des recettes de prise de masse
  const { 
    data: recipes, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useMassGainRecipes({
    key: ['nutrition', 'massGain', refreshKey],
    onSuccess: () => {
      actions.setSearchStatus('Recettes trouvées !');
    },
    onError: (err) => {
      console.error('Erreur de recherche:', err);
      actions.setSearchStatus('Erreur lors de la recherche');
    }
  });

  // Rechercher de nouvelles recettes
  const handleRefreshRecipes = () => {
    actions.setSearchStatus('Recherche de recettes...');
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  return (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-center">Nutrition IA</h2>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <RefreshCw size={32} className="text-purple-500 animate-spin" />
          <p className="ml-3 text-purple-700">Recherche de recettes en cours...</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
          <p className="text-red-600">Erreur: {error?.message || "Impossible de trouver des recettes"}</p>
          <button 
            onClick={handleRefreshRecipes}
            className="mt-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm"
          >
            Réessayer
          </button>
        </div>
      )}

      {recipes && recipes.length > 0 ? (
        <div className="space-y-4">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-xl p-4 shadow-lg">
              {recipe.image && (
                <div className="mb-3">
                  <img 
                    src={recipe.image} 
                    alt={recipe.name} 
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              )}
              <h3 className="font-bold text-lg">{recipe.name}</h3>
              <p className="text-sm text-gray-600 mt-1 mb-2">{recipe.description}</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-3 text-sm">
                  <span className="text-yellow-600">{recipe.calories} kcal</span>
                  <span className="text-blue-600">{recipe.protein}g protéines</span>
                  <div className="flex items-center">
                    <Clock size={14} className="text-gray-600 mr-1" />
                    <span className="text-gray-600">{recipe.time} min</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center mt-2 text-xs text-purple-600">
                <Search size={12} className="mr-1" />
                <span>Recherche Web IA</span>
              </div>
            </div>
          ))}

          <button
            onClick={handleRefreshRecipes}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white py-4 rounded-2xl font-semibold"
            disabled={isLoading}
          >
            {isLoading ? 'Recherche en cours...' : 'Nouvelles Recettes'}
          </button>
        </div>
      ) : !isLoading && !isError ? (
        <div className="text-center">
          <Apple className="mx-auto mb-4 text-gray-400" size={64} />
          <p className="text-gray-600 mb-4">Aucune recette trouvée</p>
          <button
            onClick={handleRefreshRecipes}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? 'Recherche en cours...' : 'Rechercher des recettes'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default NutritionView; 