import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAppContext } from '../context/AppContext';

/**
 * Hook personnalisé pour rechercher des programmes selon des critères
 */
export function useSearchWorkouts(criteria, options = {}) {
  return useQuery({
    queryKey: ['workouts', 'search', criteria],
    queryFn: () => apiService.workouts.search(criteria),
    staleTime: 5 * 60 * 1000,
    enabled: options.enabled ?? false,
    ...options
  });
}

/**
 * Hook personnalisé pour récupérer un programme par son ID
 */
export function useWorkoutById(id, options = {}) {
  return useQuery({
    queryKey: ['workouts', id],
    queryFn: () => apiService.workouts.getById(id).then(res => res.data),
    enabled: !!id && (options.enabled ?? true),
    staleTime: 10 * 60 * 1000,
    ...options
  });
}

/**
 * Hook personnalisé pour gérer les programmes d'entraînement
 * Utilise React Query pour la gestion du cache et des états de requête
 */
export function useWorkouts() {
  const queryClient = useQueryClient();
  const { equipmentProfile, actions } = useAppContext();

  // Récupérer tous les programmes
  const {
    data: workoutPrograms,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => apiService.workouts.getAll().then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!equipmentProfile.location // Ne déclenche pas la requête si le profil n'est pas configuré
  });

  // Ajouter un nouveau programme
  const addWorkoutMutation = useMutation({
    mutationFn: (workout) => apiService.workouts.create(workout).then(res => res.data),
    onSuccess: (newWorkout) => {
      // Mettre à jour le cache React Query
      queryClient.setQueryData(['workouts'], (old) => [...(old || []), newWorkout]);
      
      // Mettre à jour le state global via le contexte
      actions.addWorkoutProgram(newWorkout);
    }
  });

  // Mettre à jour un programme existant
  const updateWorkoutMutation = useMutation({
    mutationFn: ({ id, workout }) => apiService.workouts.update(id, workout).then(res => res.data),
    onSuccess: (updatedWorkout) => {
      // Mettre à jour le cache React Query
      queryClient.setQueryData(['workouts'], (old) => 
        old?.map(w => w.id === updatedWorkout.id ? updatedWorkout : w)
      );
      queryClient.setQueryData(['workouts', updatedWorkout.id], updatedWorkout);
    }
  });

  // Supprimer un programme
  const deleteWorkoutMutation = useMutation({
    mutationFn: (id) => apiService.workouts.delete(id).then(() => id),
    onSuccess: (deletedId) => {
      // Mettre à jour le cache React Query
      queryClient.setQueryData(['workouts'], (old) => 
        old?.filter(w => w.id !== deletedId)
      );
      queryClient.removeQueries(['workouts', deletedId]);
    }
  });
  // Fonction pratique pour rechercher des programmes adaptés
  const findSuitableWorkouts = async () => {
    actions.setSearchStatus('Recherche intelligente de programmes adaptés...');
    
    try {
      const criteria = {
        equipment: equipmentProfile.homeEquipment,
        location: equipmentProfile.location
      };
      
      // Utiliser la nouvelle méthode de recherche intelligente
      const programs = await apiService.workouts.search(criteria);
      
      // Vérifier si c'est une erreur de profil incomplet
      if (programs.error === 'PROFILE_INCOMPLETE') {
        actions.setSearchStatus('Veuillez compléter votre profil pour accéder aux programmes personnalisés');
        return;
      }
      
      // Mettre à jour le cache React Query
      queryClient.setQueryData(['workouts'], programs);
      
      // Mettre à jour le state global via le contexte
      actions.setSearchStatus(`${programs.length} programmes trouvés avec extraction intelligente !`);
      
      return programs;
    } catch (error) {
      console.error('Erreur lors de la recherche de programmes:', error);
      actions.setSearchStatus('Erreur lors de la recherche');
      throw error;
    }
  };

  return {
    workoutPrograms: workoutPrograms || [],
    isLoading,
    isError,
    error,
    refetch,
    addWorkout: addWorkoutMutation.mutate,
    updateWorkout: updateWorkoutMutation.mutate,
    deleteWorkout: deleteWorkoutMutation.mutate,
    findSuitableWorkouts,
    isAddingWorkout: addWorkoutMutation.isPending,
    isUpdatingWorkout: updateWorkoutMutation.isPending,
    isDeletingWorkout: deleteWorkoutMutation.isPending
  };
} 