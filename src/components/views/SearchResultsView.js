import React, { useState, useEffect } from 'react';
import { usePopup } from '../../context/PopupContext';
import { useI18n } from '../../utils/i18n';
import { webSearchService } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

const SearchResultsView = () => {
  const { showSearchResultsPopup, showInfoPopup, showErrorPopup } = usePopup();
  const { t } = useI18n();
  const { state } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Effectuer une recherche
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showInfoPopup(t('search.emptyTitle', 'Recherche vide'), t('search.emptyMsg', 'Veuillez entrer un terme de recherche.'));
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
      showErrorPopup(t('search.errorTitle', 'Erreur de recherche'), t('search.errorMsg', 'Une erreur est survenue lors de la recherche.'));
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
      showErrorPopup(t('search.errorTitle', 'Erreur de recherche'), t('search.recipesErrorMsg', 'Une erreur est survenue lors de la recherche de recettes.'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="pb-20 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">{t('search.title', 'Recherche')}</h1>
      
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-4 mb-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
          <input
            type="text"
            placeholder={t('search.placeholder', 'Rechercher des exercices, recettes...')}
            className="flex-1 p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-xl"
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-indigo-500 dark:to-violet-600 text-white p-4 rounded-xl text-center font-semibold"
            onClick={findMassGainRecipes}
            disabled={isLoading}
          >
            {t('search.massGain', 'Recettes prise de masse')}
          </button>
          
          <button
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl text-center font-semibold"
            onClick={() => {
              showInfoPopup(t('common.soon', 'Fonctionnalité à venir'), t('common.soonDesc', 'Cette fonctionnalité sera disponible prochainement.'));
            }}
          >
            {t('search.customPrograms', 'Programmes personnalisés')}
          </button>
        </div>
      </div>
      
      <div className="text-center text-gray-600 dark:text-gray-300 text-sm max-w-3xl mx-auto">
        <p>{t('search.personalized', 'Toutes les recherches sont personnalisées selon votre objectif')}: {state.userProfile.fitnessGoal || t('common.undefined', 'Non défini')}</p>
        <p className="mt-2">{t('search.popupInfo', 'Les résultats s\'afficheront dans un popup pour une meilleure expérience mobile.')}</p>
      </div>
    </div>
  );
};

export default SearchResultsView; 
