import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAppContext } from '../context/AppContext';

/**
 * Hook personnalisé pour rechercher des recettes selon des critères
 */
export function useSearchRecipes(criteria, options = {}) {
  return useQuery({
    queryKey: ['nutrition', 'recipes', 'search', criteria],
    queryFn: () => apiService.nutrition.searchRecipes(criteria),
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? false,
    ...options
  });
}

/**
 * Hook personnalisé pour rechercher des recettes spécifiques pour prise de masse
 */
export function useMassGainRecipes(options = {}) {
  return useQuery({
    queryKey: ['nutrition', 'recipes', 'massGain'],
    queryFn: () => apiService.nutrition.getMassGainRecipes(),
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? true,
    ...options
  });
}

/**
 * Hook personnalisé pour récupérer un plan nutritionnel par son ID
 */
export function useNutritionPlanById(id, options = {}) {
  return useQuery({
    queryKey: ['nutrition', 'plans', id],
    queryFn: () => apiService.nutrition.getPlanById(id).then(res => res.data),
    enabled: !!id && (options.enabled ?? true),
    staleTime: 10 * 60 * 1000,
    ...options
  });
}

/**
 * Hook personnalisé pour gérer les plans de nutrition
 * Utilise React Query pour la gestion du cache et des états de requête
 */
export function useNutrition() {
  const queryClient = useQueryClient();
  const { nutritionProfile, actions } = useAppContext();

  // Récupérer tous les plans de nutrition
  const {
    data: nutritionPlans,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['nutrition', 'plans'],
    queryFn: () => apiService.nutrition.getPlans().then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!nutritionProfile.dietType // Ne déclenche pas la requête si le profil n'est pas configuré
  });

  // Ajouter un nouveau plan nutritionnel
  const addNutritionPlanMutation = useMutation({
    mutationFn: (plan) => apiService.nutrition.createPlan(plan).then(res => res.data),
    onSuccess: (newPlan) => {
      // Mettre à jour le cache React Query
      queryClient.setQueryData(['nutrition', 'plans'], (old) => [...(old || []), newPlan]);
      
      // Mettre à jour le state global via le contexte
      actions.addNutritionPlan(newPlan);
    }
  });

  // Mettre à jour un plan existant
  const updateNutritionPlanMutation = useMutation({
    mutationFn: ({ id, plan }) => apiService.nutrition.updatePlan(id, plan).then(res => res.data),
    onSuccess: (updatedPlan) => {
      // Mettre à jour le cache React Query
      queryClient.setQueryData(['nutrition', 'plans'], (old) => 
        old?.map(p => p.id === updatedPlan.id ? updatedPlan : p)
      );
      queryClient.setQueryData(['nutrition', 'plans', updatedPlan.id], updatedPlan);
    }
  });

  // Supprimer un plan
  const deleteNutritionPlanMutation = useMutation({
    mutationFn: (id) => apiService.nutrition.deletePlan(id).then(() => id),
    onSuccess: (deletedId) => {
      // Mettre à jour le cache React Query
      queryClient.setQueryData(['nutrition', 'plans'], (old) => 
        old?.filter(p => p.id !== deletedId)
      );
      queryClient.removeQueries(['nutrition', 'plans', deletedId]);
    }
  });
  // Fonction pratique pour générer un plan nutritionnel personnalisé
  const generateNutritionPlan = async () => {
    actions.setSearchStatus('Recherche intelligente de recettes adaptées...');
    
    try {
      const criteria = {
        dietType: nutritionProfile.dietType,
        cookingTime: nutritionProfile.cookingTime,
        allergies: nutritionProfile.allergies || []
      };
      
      const newPlan = await apiService.nutrition.searchRecipes(criteria);
      
      // Vérifier si c'est une erreur de profil incomplet
      if (newPlan.error === 'PROFILE_INCOMPLETE') {
        actions.setSearchStatus('Veuillez compléter votre profil pour accéder aux recettes personnalisées');
        return;
      }
      
      // Ajouter le plan via la mutation
      addNutritionPlanMutation.mutate(newPlan);
      
      actions.setSearchStatus(`Plan nutritionnel généré avec ${newPlan.length} recettes extraites intelligemment !`);
      return newPlan;
    } catch (error) {
      console.error('Erreur lors de la génération du plan nutritionnel:', error);
      actions.setSearchStatus('Erreur lors de la recherche');
      throw error;
    }
  };

  return {
    nutritionPlans: nutritionPlans || [],
    isLoading,
    isError,
    error,
    refetch,
    addNutritionPlan: addNutritionPlanMutation.mutate,
    updateNutritionPlan: updateNutritionPlanMutation.mutate,
    deleteNutritionPlan: deleteNutritionPlanMutation.mutate,
    generateNutritionPlan,
    isAddingPlan: addNutritionPlanMutation.isPending,
    isUpdatingPlan: updateNutritionPlanMutation.isPending,
    isDeletingPlan: deleteNutritionPlanMutation.isPending
  };
} 