/**
 * Hook React Query pour la gestion des recettes avec Firestore
 * Version stable qui évite les boucles infinies de re-render
 * SANS génération automatique de recettes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { mistralService } from '../services/mistralNutritionService';
import { nutritionFirestoreService } from '../services/nutritionFirestoreService';

// Hook d'authentification utilisant Firebase Auth directement
export function useAuth() {
  const [authState, setAuthState] = useState({
    user: null,
    uid: null,
    timestamp: Date.now(),
    isValid: false
  });

  useEffect(() => {
    console.log('🔥 useNutrition: Initialisation Firebase Auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('✅ useNutrition: Utilisateur Firebase connecté:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        });
        
        // Récupérer les données du profil depuis localStorage si disponibles
        let profileData = {};
        try {
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsedData = JSON.parse(userData);
            profileData = {
              fitnessLevel: parsedData.fitnessLevel,
              weight: parsedData.weight,
              gender: parsedData.gender,
              age: parsedData.age
            };
          }
        } catch (error) {
          console.warn('⚠️ useNutrition: Erreur lecture profil localStorage:', error);
        }
        
        const userObject = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          ...profileData
        };
        
        setAuthState({
          user: userObject,
          uid: firebaseUser.uid,
          timestamp: Date.now(),
          isValid: true
        });
      } else {
        console.log('❌ useNutrition: Aucun utilisateur Firebase connecté');
        setAuthState({
          user: null,
          uid: null,
          timestamp: Date.now(),
          isValid: false
        });
      }
    });

    return () => {
      console.log('🧹 useNutrition: Nettoyage Firebase Auth listener');
      unsubscribe();
    };
  }, []);

  return authState;
}

/**
 * HOOK PRINCIPAL POUR LES RECETTES DE PRISE DE MASSE - Version Sans Génération Automatique
 */
export function useMassGoalAwareRecipes(options = {}) {
  const { user, timestamp } = useAuth();
  const queryClient = useQueryClient();

  // Destructurer les options avec des valeurs par défaut
  const { onSuccess, onError } = options;

  // Stabiliser les callbacks d'options
  const stableOnSuccess = useCallback((data) => {
    if (onSuccess) {
      onSuccess(data);
    }
  }, [onSuccess]);

  const stableOnError = useCallback((error) => {
    console.log('❌ Erreur dans useMassGainRecipes:', error);
    if (onError) {
      onError(error);
    }
  }, [onError]);
  
  // Stabiliser les options pour éviter les re-fetches automatiques
  const stableOptions = useMemo(() => ({
    enabled: !!user?.uid, // Activer seulement si utilisateur connecté
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1, // Réduire les tentatives
    refetchOnWindowFocus: false,
    refetchOnMount: false, // NE PAS relancer au montage
    refetchOnReconnect: false, // NE PAS relancer à la reconnexion
    onSuccess: stableOnSuccess,
    onError: stableOnError
  }), [user?.uid, stableOnSuccess, stableOnError]);

  // Clé de query stable qui change quand l'utilisateur change
  const goalFromProfile = (() => {
    try {
      const up = localStorage.getItem('userProfile');
      if (up) return JSON.parse(up)?.goal || 'maintain';
    } catch {}
    return 'maintain';
  })();
  const queryKey = useMemo(() => [
    'nutrition',
    'goalRecipes',
    goalFromProfile,
    user?.uid || 'anonymous',
    timestamp
  ], [goalFromProfile, user?.uid, timestamp]);

  // Query fonction qui NE génère PAS automatiquement - seulement récupération
  const queryFn = useCallback(async () => {
    console.log('🔄 Récupération recettes existantes (SANS génération automatique)...');

    try {
      // VÉRIFICATION UTILISATEUR OBLIGATOIRE
      if (!user?.uid) {
        console.warn('⚠️ useNutrition: Utilisateur non connecté - retour tableau vide');
        return [];
      }

      console.log('👤 useNutrition: Récupération recettes pour utilisateur:', user.uid);
      
      // SEULEMENT récupérer depuis Firestore - PAS de génération automatique
      const firestoreRecipes = await nutritionFirestoreService.getMassGainRecipes(user.uid, 15);

      if (firestoreRecipes && firestoreRecipes.length > 0) {
        console.log('✅ useNutrition: Recettes trouvées dans Firestore:', firestoreRecipes.length);
        return firestoreRecipes;
      }

      // PAS de génération automatique - juste retourner un tableau vide
      console.log('ℹ️ useNutrition: Aucune recette existante - l\'utilisateur doit générer manuellement');
      return [];

    } catch (error) {
      console.error('❌ useNutrition: Erreur récupération recettes:', error);
      
      // Essayer le cache local en fallback
      try {
        const cachedRecipes = nutritionFirestoreService.getUserCache('recipes', user.uid) || [];
        console.log('🔄 useNutrition: Utilisation cache local:', cachedRecipes.length);
        return cachedRecipes;
      } catch (cacheError) {
        console.error('❌ useNutrition: Erreur cache local:', cacheError);
      }
      
      // Toujours retourner un tableau vide - PAS de génération automatique
      console.log('❌ useNutrition: Retour tableau vide - génération manuelle requise');
      return [];
    }
  }, [user?.uid]);

  // Récupération des recettes
  const query = useQuery({
    queryKey,
    queryFn,
    ...stableOptions
  });

  // Mutation pour générer de nouvelles recettes MANUELLEMENT
  const generateNewRecipes = useMutation({
    mutationKey: ['generateGoalRecipes', user?.uid],
    mutationFn: useCallback(async (customProfile = {}) => {
      console.log('🆕 useNutrition: Génération MANUELLE nouvelles recettes...');

      if (!user?.uid) {
        throw new Error('Utilisateur non connecté');
      }

      // Utiliser les données utilisateur du localStorage pour le profil
      let userProfileData = {};
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedData = JSON.parse(userData);
          userProfileData = {
            fitnessLevel: parsedData.fitnessLevel,
            weight: parsedData.weight,
            gender: parsedData.gender,
            age: parsedData.age
          };
        }
      } catch (error) {
        console.log('⚠️ Utilisation profil par défaut');
      }

      // Charger le vrai userProfile si dispo
      let appUserProfile = {};
      try {
        const up = localStorage.getItem('userProfile');
        if (up) appUserProfile = JSON.parse(up) || {};
      } catch {}

      const userProfile = {
        goal: appUserProfile.goal || 'maintain',
        level: userProfileData.fitnessLevel || 'intermédiaire',
        weight: appUserProfile.weight || userProfileData.weight || 75,
        gender: appUserProfile.gender || userProfileData.gender || 'male',
        age: appUserProfile.age || userProfileData.age || 25,
        height: appUserProfile.height || 175,
        activityLevel: appUserProfile.activityLevel || 'modéré',
        dietType: appUserProfile.dietType || 'omnivore',
        userId: user.uid,
        ...customProfile
      };

      console.log('📋 useNutrition: Profil pour génération:', userProfile);

      const newRecipes = await mistralService.generateGoalAlignedRecipes(userProfile);

      if (newRecipes && newRecipes.length > 0) {
        try {
          const savedRecipes = await nutritionFirestoreService.saveMultipleRecipes(newRecipes, user.uid);
          console.log('✅ useNutrition: Nouvelles recettes générées et sauvegardées:', savedRecipes.length);
          return savedRecipes;
        } catch (saveError) {
          console.warn('⚠️ useNutrition: Sauvegarde échouée:', saveError);
          return newRecipes;
        }
      }

      throw new Error('Échec génération nouvelles recettes - aucune recette générée');
    }, [user?.uid]),
    onSuccess: useCallback((newRecipes) => {
      // Mettre à jour le cache
      queryClient.setQueryData(queryKey, newRecipes);

      // Invalider et refetch
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'goalRecipes'] });

      console.log('✅ useNutrition: Nouvelles recettes générées et mises en cache');
      stableOnSuccess(newRecipes);
    }, [queryClient, queryKey, stableOnSuccess]),
    onError: useCallback((error) => {
      console.error('❌ useNutrition: Erreur génération manuelle:', error);
      stableOnError(error);
    }, [stableOnError])
  });
  
  // Retourner les valeurs de manière stable
  return useMemo(() => ({
    data: query.data || [],
    isLoading: query.isLoading || generateNewRecipes.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    generateNew: generateNewRecipes.mutate,
    isGenerating: generateNewRecipes.isLoading,
  }), [
    query.data,
    query.isLoading,
    query.isError,
    query.error,
    query.refetch,
    generateNewRecipes.mutate,
    generateNewRecipes.isLoading
  ]);
}

/**
 * HOOK POUR LES FAVORIS - Version Stable
 */
export function useFavoriteRecipes(options = {}) {
  const { user, timestamp } = useAuth();

  const queryKey = useMemo(() => [
    'nutrition',
    'favorites',
    user?.uid || 'anonymous',
    timestamp
  ], [user?.uid, timestamp]);

  const stableOptions = useMemo(() => ({
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    onSuccess: options.onSuccess,
    onError: options.onError
  }), [user?.uid, options.onSuccess, options.onError]);

  const queryFn = useCallback(async () => {
    if (!user?.uid) {
      console.log('👤 useNutrition: Pas d\'utilisateur connecté, favoris indisponibles');
      return [];
    }
    return nutritionFirestoreService.getUserFavorites(user.uid);
  }, [user?.uid]);

  return useQuery({
    queryKey,
    queryFn,
    ...stableOptions
  });
}

/**
 * HOOK POUR GÉRER LES FAVORIS - Version Stable
 */
export function useFavoriteMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fonction stable pour invalider les queries
  const invalidateFavorites = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['nutrition', 'favorites'],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({
      queryKey: ['nutrition', 'public'],
      refetchType: 'none'
    });
  }, [queryClient]);

  const addToFavorites = useMutation({
    mutationKey: ['addFavorite'],
    mutationFn: useCallback(async (recipeId) => {
      if (!user?.uid) {
        throw new Error('Authentification requise pour les favoris');
      }
      return nutritionFirestoreService.addToFavorites(recipeId, user.uid);
    }, [user?.uid]),
    onSuccess: invalidateFavorites,
    onError: useCallback((error) => {
      console.warn('⚠️ useNutrition: Erreur ajout favoris:', error.message);
    }, [])
  });

  const removeFromFavorites = useMutation({
    mutationKey: ['removeFavorite'],
    mutationFn: useCallback(async (recipeId) => {
      if (!user?.uid) {
        throw new Error('Authentification requise pour les favoris');
      }
      return nutritionFirestoreService.removeFromFavorites(recipeId, user.uid);
    }, [user?.uid]),
    onSuccess: invalidateFavorites,
    onError: useCallback((error) => {
      console.warn('⚠️ useNutrition: Erreur suppression favoris:', error.message);
    }, [])
  });

  return useMemo(() => ({
    addToFavorites: addToFavorites.mutate,
    removeFromFavorites: removeFromFavorites.mutate,
    isAddingToFavorites: addToFavorites.isLoading,
    isRemovingFromFavorites: removeFromFavorites.isLoading,
    isAuthRequired: !user?.uid
  }), [
    addToFavorites.mutate,
    addToFavorites.isLoading,
    removeFromFavorites.mutate,
    removeFromFavorites.isLoading,
    user?.uid
  ]);
}

/**
 * HOOK POUR INCRÉMENTER LES VUES
 */
export function useRecipeView() {
  const incrementView = useMutation({
    mutationKey: ['incrementView'],
    mutationFn: useCallback(async (recipeId) => {
      if (!recipeId) {
        return Promise.resolve();
      }

      try {
        return await nutritionFirestoreService.incrementViewCount(recipeId);
      } catch (error) {
        console.warn('⚠️ useNutrition: Erreur incrémentation vue (non critique):', error);
        return Promise.resolve();
      }
    }, []),
    onSuccess: useCallback((_, recipeId) => {
      if (recipeId) {
        console.log('👁️ useNutrition: Vue incrémentée pour:', recipeId);
      }
    }, []),
    onError: useCallback(() => {
      // Erreur silencieuse pour les vues
    }, []),
    retry: false
  });

  return useMemo(() => ({
    incrementView: incrementView.mutate
  }), [incrementView.mutate]);
}

/**
 * HOOK POUR VÉRIFIER SI UNE RECETTE EST EN FAVORIS
 */
export function useIsRecipeFavorite(recipeId) {
  const { user } = useAuth();

  const queryKey = useMemo(() => [
    'nutrition',
    'isFavorite',
    recipeId,
    user?.uid || 'anonymous'
  ], [recipeId, user?.uid]);

  const queryFn = useCallback(async () => {
    if (!user?.uid || !recipeId) {
      return false;
    }
    return nutritionFirestoreService.isRecipeFavorite(recipeId, user.uid);
  }, [recipeId, user?.uid]);

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!recipeId && !!user?.uid,
    staleTime: 2 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false
  });
}

/**
 * HOOK COMPOSITE POUR L'INTERFACE LEGACY
 */
export function useNutrition() {
  const massGainQuery = useMassGoalAwareRecipes();
  const favoriteMutations = useFavoriteMutations();
  const recipeView = useRecipeView();

  return useMemo(() => ({
    // Données principales
    data: massGainQuery.data,
    isLoading: massGainQuery.isLoading,
    isError: massGainQuery.isError,
    error: massGainQuery.error,
    refetch: massGainQuery.refetch,

    // Actions nouvelles
    generateNew: massGainQuery.generateNew,
    addToFavorites: favoriteMutations.addToFavorites,
    removeFromFavorites: favoriteMutations.removeFromFavorites,
    incrementView: recipeView.incrementView,

    // États de chargement
    isGenerating: massGainQuery.isGenerating,
    isAddingToFavorites: favoriteMutations.isAddingToFavorites,
    isRemovingFromFavorites: favoriteMutations.isRemovingFromFavorites,
    isAuthRequired: favoriteMutations.isAuthRequired
  }), [massGainQuery, favoriteMutations, recipeView]);
}
