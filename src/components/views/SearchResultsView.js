import React, { useState, useEffect } from 'react';
import { usePopup } from '../../context/PopupContext';
import { webSearchService } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

const SearchResultsView = () => {
  const { showSearchResultsPopup, showInfoPopup, showErrorPopup } = usePopup();
  const { state } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Effectuer une recherche
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showInfoPopup('Recherche vide', 'Veuillez entrer un terme de recherche.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const results = await webSearchService.searchGoogle(searchTerm, state.userProfile.fitnessGoal);
      
      if (results.error === 'PROFILE_INCOMPLETE') {
        // Le message est déjà affiché par le service API
        setIsLoading(false);
        return;
      }
      
      // Afficher les résultats dans un popup
      showSearchResultsPopup(results, (selectedItem) => {
        // Action lorsqu'un élément est sélectionné
        showInfoPopup('Élément sélectionné', 
          `Vous avez sélectionné: ${selectedItem.title || selectedItem.name}`);
      });
    } catch (error) {
      showErrorPopup('Erreur de recherche', 'Une erreur est survenue lors de la recherche.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Recherche automatique de recettes pour la prise de masse
  const findMassGainRecipes = async () => {
    setIsLoading(true);
    
    try {
      const recipes = await webSearchService.searchMassGainRecipes();
      
      if (recipes.error === 'PROFILE_INCOMPLETE') {
        // Le message est déjà affiché par le service API
        setIsLoading(false);
        return;
      }
      
      // Afficher les résultats dans un popup
      showSearchResultsPopup(recipes, (selectedRecipe) => {
        // Action lorsqu'une recette est sélectionnée
        showInfoPopup('Recette sélectionnée', 
          `Vous avez sélectionné: ${selectedRecipe.name}\nCalories: ${selectedRecipe.calories} - Protéines: ${selectedRecipe.protein}g`);
      });
    } catch (error) {
      showErrorPopup('Erreur de recherche', 'Une erreur est survenue lors de la recherche de recettes.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Recherche</h1>
      
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            placeholder="Rechercher des exercices, recettes..."
            className="flex-1 p-3 border border-gray-300 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 rounded-xl"
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? '...' : '🔍'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl text-center font-semibold"
            onClick={findMassGainRecipes}
            disabled={isLoading}
          >
            Recettes prise de masse
          </button>
          
          <button
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center font-semibold"
            onClick={() => {
              showInfoPopup('Fonctionnalité à venir', 'Cette fonctionnalité sera disponible prochainement.');
            }}
          >
            Programmes personnalisés
          </button>
        </div>
      </div>
      
      <div className="text-center text-gray-600 text-sm">
        <p>Toutes les recherches sont personnalisées selon votre objectif: {state.userProfile.fitnessGoal || 'Non défini'}</p>
        <p className="mt-2">Les résultats s'afficheront dans un popup pour une meilleure expérience mobile.</p>
      </div>
    </div>
  );
};

export default SearchResultsView; 