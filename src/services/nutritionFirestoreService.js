/**
 * Service Firestore pour la gestion des recettes de nutrition
 * Version corrigée - SANS génération automatique ni fallback templates
 */

import { db } from '../firebase';
import * as firestoreModule from 'firebase/firestore';

class NutritionFirestoreService {
  constructor() {
    this.collectionName = 'nutrition_recipes';
    this.userRecipesCollectionName = 'user_nutrition_recipes';
    this.favoritesCollectionName = 'favorite_recipes';
    this.isFirebaseAvailable = !!db && !!firestoreModule;
    
    // FLAGS POUR CONTRÔLER LES COMPORTEMENTS AUTOMATIQUES
    this.autoGenerationDisabled = true; // Désactiver génération auto
    this.fallbackTemplatesDisabled = true; // Désactiver templates fallback
    
    if (!this.isFirebaseAvailable) {
      console.log('🔄 Service Nutrition en mode fallback (sans Firestore)');
    } else {
      console.log('✅ Service Nutrition initialisé avec Firestore');
    }
  }

  /**
   * VÉRIFICATION DE DISPONIBILITÉ FIRESTORE
   */
  checkFirestoreAvailability() {
    if (!this.isFirebaseAvailable || !db || !firestoreModule) {
      console.warn('⚠️ Firestore non disponible, utilisation du cache local');
      return false;
    }
    return true;
  }

  /**
   * CACHE LOCAL POUR FALLBACK
   */
  getLocalCache(key) {
    try {
      const cached = localStorage.getItem(`nutrition_${key}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  setLocalCache(key, data) {
    try {
      localStorage.setItem(`nutrition_${key}`, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Impossible de sauvegarder en cache local');
    }
  }

  /**
   * CACHE SPÉCIFIQUE UTILISATEUR
   */
  getUserCache(key, userId) {
    if (!userId) return null; // Pas de cache si pas d'utilisateur
    
    try {
      const cached = localStorage.getItem(`nutrition_${key}_${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  setUserCache(key, data, userId) {
    if (!userId) return; // Pas de cache si pas d'utilisateur
    
    try {
      localStorage.setItem(`nutrition_${key}_${userId}`, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Impossible de sauvegarder en cache utilisateur');
    }
  }

  /**
   * NETTOYAGE DU CACHE LOCAL LORS DU CHANGEMENT D'UTILISATEUR
   */
  clearUserSpecificCache(userId) {
    try {
      console.log('🧹 Nettoyage cache utilisateur:', userId);
      ['favorites', 'user_recipes', 'user_profile', 'recipes'].forEach(key => {
        localStorage.removeItem(`nutrition_${key}_${userId}`);
      });
      // Nettoyer aussi le cache général
      ['recipes', 'favorites', 'mass_gain_recipes', 'public_recipes'].forEach(key => {
        localStorage.removeItem(`nutrition_${key}`);
      });
      console.log('✅ Cache utilisateur nettoyé');
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage cache utilisateur');
    }
  }

  /**
   * SAUVEGARDE D'UNE RECETTE GÉNÉRÉE PAR L'IA - SEULEMENT SUR DEMANDE EXPLICITE
   */
  async saveRecipe(recipe, userId = null, options = {}) {
    try {
      console.log('💾 Sauvegarde recette...', recipe.name, 'pour utilisateur:', userId);

      // VÉRIFICATION OBLIGATOIRE : userId requis
      if (!userId) {
        throw new Error('userId requis pour sauvegarder une recette');
      }

      // VÉRIFICATION : Pas de sauvegarde automatique
      if (!options.explicitSave && this.autoGenerationDisabled) {
        console.warn('⚠️ Sauvegarde automatique désactivée - utilisez explicitSave: true');
        return null;
      }

      const recipeData = {
        // Informations de base
        name: recipe.name,
        description: recipe.description || '',
        mealType: recipe.mealType || 'collation',
        
        // Valeurs nutritionnelles
        calories: recipe.calories || 0,
        protein: recipe.protein || 0,
        carbs: recipe.carbs || 0,
        fats: recipe.fats || 0,
        
        // Informations pratiques
        time: recipe.time || 15,
        difficulty: recipe.difficulty || 'Facile',
        servings: recipe.servings || 1,
        
        // Contenu détaillé
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        tips: recipe.tips || [],
        tags: recipe.tags || [],
        
        // Scores et évaluations
        massGainScore: recipe.massGainScore || this.calculateMassGainScore(recipe),
        nutritionTips: recipe.nutritionTips || '',
        
        // Métadonnées
        source: recipe.source || 'IA Nutritionnelle',
        aiGenerated: recipe.aiGenerated || true,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // Statistiques d'utilisation
        viewCount: 0,
        favoriteCount: 0,
        
        // Statut
        isPublic: false, // Par défaut privé
        isActive: true
      };

      if (this.checkFirestoreAvailability()) {
        const { addDoc, collection, serverTimestamp } = firestoreModule;
        
        const firestoreData = {
          ...recipeData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, this.collectionName), firestoreData);
        
        const savedRecipe = {
          id: docRef.id,
          ...recipeData
        };
        
        console.log('✅ Recette sauvegardée Firestore avec ID:', docRef.id);
        this.updateLocalUserRecipeCache(savedRecipe, userId);
        
        return savedRecipe;
      } else {
        // Fallback: sauvegarde locale SEULEMENT si explicitement demandé
        if (!options.explicitSave) {
          console.warn('⚠️ Firestore indisponible et sauvegarde automatique désactivée');
          return null;
        }

        const localId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const savedRecipe = {
          id: localId,
          ...recipeData
        };
        
        this.updateLocalUserRecipeCache(savedRecipe, userId);
        console.log('✅ Recette sauvegardée localement avec ID:', localId);
        
        return savedRecipe;
      }

    } catch (error) {
      console.error('❌ Erreur sauvegarde recette:', error);
      throw error;
    }
  }

  /**
   * MISE À JOUR DU CACHE LOCAL SPÉCIFIQUE UTILISATEUR
   */
  updateLocalUserRecipeCache(recipe, userId) {
    try {
      if (!userId) return;
      
      const cached = this.getUserCache('recipes', userId) || [];
      const updated = [recipe, ...cached.filter(r => r.id !== recipe.id)];
      this.setUserCache('recipes', updated.slice(0, 50), userId);
    } catch (error) {
      console.warn('⚠️ Erreur mise à jour cache local utilisateur');
    }
  }
  /**
   * SAUVEGARDE MULTIPLE DE RECETTES - SEULEMENT SUR DEMANDE EXPLICITE
   */
  async saveMultipleRecipes(recipes, userId = null, options = {}) {
    try {
      console.log('💾 Sauvegarde multiple recettes...', recipes?.length, 'pour userId:', userId);
      
      if (!recipes || recipes.length === 0) {
        throw new Error('Aucune recette à sauvegarder');
      }

      if (!userId) {
        console.error('❌ userId manquant:', { userId, hasRecipes: !!recipes, recipesLength: recipes?.length });
        throw new Error('userId requis pour sauvegarder des recettes - utilisateur non connecté');
      }

      // VÉRIFICATION : Pas de sauvegarde automatique
      if (!options.explicitSave && this.autoGenerationDisabled) {
        console.warn('⚠️ Sauvegarde multiple automatique désactivée');
        return [];
      }
      
      console.log('✅ Validation OK - Démarrage sauvegarde pour:', userId);
      const savedRecipes = [];
      
      for (const recipe of recipes) {
        try {
          const dataToSave = {
            ...recipe,
            userId: userId, // S'assurer que userId est bien défini
          };
          console.log('💾 Sauvegarde recette:', dataToSave.name, 'pour userId:', userId);
          const savedRecipe = await this.saveRecipe(dataToSave, userId, { explicitSave: true });
          if (savedRecipe) {
            savedRecipes.push(savedRecipe);
            console.log('✅ Recette sauvegardée:', savedRecipe.name);
          }
        } catch (error) {
          console.error('❌ Erreur sauvegarde recette individuelle:', error);
          // Continue avec les autres recettes au lieu de tout arrêter
        }
      }
      
      console.log('✅ Toutes recettes sauvegardées:', savedRecipes.length, '/', recipes.length);
      return savedRecipes;
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde multiple:', error);
      throw error;
    }
  }

  /**
   * RÉCUPÉRATION DES RECETTES POUR PRISE DE MASSE - SANS GÉNÉRATION AUTOMATIQUE
   */
  async getMassGainRecipes(userId, limitCount = 15, options = {}) {
    try {
      console.log('💪 Récupération recettes prise de masse pour utilisateur:', userId);

      // VÉRIFICATION STRICTE : userId obligatoire
      if (!userId) {
        console.warn('⚠️ Aucun userId fourni - retour tableau vide');
        return [];
      }

      if (this.checkFirestoreAvailability()) {
        const { query, collection, where, orderBy, limit, getDocs } = firestoreModule;

        // Requête ciblant SEULEMENT les recettes de l'utilisateur spécifique
        const q = query(
          collection(db, this.collectionName),
          where('userId', '==', userId),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        console.log('📊 Nombre de documents Firestore récupérés:', querySnapshot.size);

        if (querySnapshot.empty) {
          console.log('ℹ️ Aucune recette trouvée pour cet utilisateur dans Firestore:', userId);
          return []; // Retourner tableau vide - PAS de fallback
        }

        const allRecipes = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          allRecipes.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          });
        });
        
        // Filtrer côté client pour la prise de masse
        const massGainRecipes = allRecipes
          .filter(recipe => 
            (recipe.calories >= 400 || recipe.protein >= 20) ||
            recipe.mealType === 'mass-gain' ||
            recipe.tags?.includes('prise-de-masse')
          )
          .slice(0, limitCount);
        
        // Calculer le score de prise de masse si manquant
        const recipesWithScore = massGainRecipes.map(recipe => ({
          ...recipe,
          massGainScore: recipe.massGainScore || this.calculateMassGainScore(recipe)
        }));
        
        // Trier par score de prise de masse
        recipesWithScore.sort((a, b) => (b.massGainScore || 0) - (a.massGainScore || 0));
        
        console.log('✅ Recettes prise de masse Firestore:', recipesWithScore.length);
        
        // Mettre à jour le cache local seulement si on a des résultats
        if (recipesWithScore.length > 0) {
          this.setUserCache('recipes', recipesWithScore, userId);
        }
        
        return recipesWithScore;
      } else {
        // Fallback: récupération depuis cache local SEULEMENT
        console.log('🔄 Récupération depuis cache local...');
        
        const cachedRecipes = this.getUserCache('recipes', userId) || [];
        
        const massGainRecipes = cachedRecipes
          .filter(recipe => 
            (recipe.calories >= 400 || recipe.protein >= 20) ||
            recipe.mealType === 'mass-gain'
          )
          .slice(0, limitCount);
        
        console.log('✅ Recettes prise de masse cache local:', massGainRecipes.length);
        return massGainRecipes;
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération recettes masse:', error);
      
      // CHANGEMENT MAJEUR : PAS de fallback automatique, retourner tableau vide
      console.log('🚫 Retour tableau vide - pas de génération automatique');
      return [];
    }
  }

  /**
   * NOUVELLE MÉTHODE : Vérifier si l'utilisateur a des recettes
   */
  async hasUserRecipes(userId) {
    try {
      if (!userId) return false;

      if (this.checkFirestoreAvailability()) {
        const { query, collection, where, limit, getDocs } = firestoreModule;
        
        const q = query(
          collection(db, this.collectionName),
          where('userId', '==', userId),
          where('isActive', '==', true),
          limit(1)
        );
        
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
      } else {
        const cachedRecipes = this.getUserCache('recipes', userId) || [];
        return cachedRecipes.length > 0;
      }
    } catch (error) {
      console.error('❌ Erreur vérification recettes utilisateur:', error);
      return false;
    }
  }

  /**
   * NOUVELLE MÉTHODE : Obtenir le statut du service pour l'utilisateur
   */
  async getUserServiceStatus(userId) {
    try {
      if (!userId) {
        return {
          hasRecipes: false,
          recipesCount: 0,
          needsGeneration: true,
          isReady: false
        };
      }

      const hasRecipes = await this.hasUserRecipes(userId);
      const cachedRecipes = this.getUserCache('recipes', userId) || [];
      
      return {
        hasRecipes,
        recipesCount: cachedRecipes.length,
        needsGeneration: !hasRecipes,
        isReady: true,
        userId
      };
    } catch (error) {
      console.error('❌ Erreur status service utilisateur:', error);
      return {
        hasRecipes: false,
        recipesCount: 0,
        needsGeneration: true,
        isReady: false,
        error: error.message
      };
    }
  }

  /**
   * CALCUL DU SCORE DE PRISE DE MASSE
   */
  calculateMassGainScore(recipe) {
    if (!recipe) return 0;
    
    const calories = recipe.calories || 0;
    const protein = recipe.protein || 0;
    const carbs = recipe.carbs || 0;
    const fats = recipe.fats || 0;
    
    const calorieScore = Math.min((calories / 800) * 40, 40);
    const proteinScore = Math.min((protein / 50) * 35, 35);
    const carbScore = Math.min((carbs / 80) * 15, 15);
    const fatScore = Math.min((fats / 30) * 10, 10);
    
    return Math.round(calorieScore + proteinScore + carbScore + fatScore);
  }

  /**
   * GESTION DES FAVORIS
   */
  async addToFavorites(recipeId, userId) {
    try {
      console.log('⭐ Ajout aux favoris...', recipeId);
      
      if (!userId || !recipeId) {
        throw new Error('userId et recipeId requis pour les favoris');
      }
      
      if (this.checkFirestoreAvailability()) {
        const { addDoc, collection, updateDoc, doc, getDoc, serverTimestamp } = firestoreModule;
        
        const favoriteData = {
          recipeId,
          userId,
          createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, this.favoritesCollectionName), favoriteData);
        
        // Incrémenter le compteur de favoris
        try {
          const recipeRef = doc(db, this.collectionName, recipeId);
          const recipeDoc = await getDoc(recipeRef);
          
          if (recipeDoc.exists()) {
            const currentCount = recipeDoc.data().favoriteCount || 0;
            await updateDoc(recipeRef, {
              favoriteCount: currentCount + 1
            });
          }
        } catch (updateError) {
          console.warn('⚠️ Erreur mise à jour compteur favoris:', updateError);
        }
        
        console.log('✅ Ajouté aux favoris Firestore');
      } else {
        // Fallback: cache local
        const favorites = this.getUserCache('favorites', userId) || [];
        if (!favorites.find(f => f.recipeId === recipeId)) {
          favorites.push({ recipeId, userId, createdAt: new Date() });
          this.setUserCache('favorites', favorites, userId);
          console.log('✅ Ajouté aux favoris localement');
        }
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur ajout favoris:', error);
      throw error;
    }
  }

  /**
   * RETIRER DES FAVORIS
   */
  async removeFromFavorites(recipeId, userId) {
    try {
      console.log('💔 Retrait des favoris...', recipeId);
      
      if (!userId || !recipeId) {
        throw new Error('userId et recipeId requis pour les favoris');
      }
      
      if (this.checkFirestoreAvailability()) {
        const { query, collection, where, getDocs, deleteDoc, doc, updateDoc, getDoc } = firestoreModule;
        
        const q = query(
          collection(db, this.favoritesCollectionName),
          where('recipeId', '==', recipeId),
          where('userId', '==', userId)
        );
        
        const querySnapshot = await getDocs(q);
        
        for (const document of querySnapshot.docs) {
          await deleteDoc(doc(db, this.favoritesCollectionName, document.id));
        }
        
        // Décrémenter le compteur
        try {
          const recipeRef = doc(db, this.collectionName, recipeId);
          const recipeDoc = await getDoc(recipeRef);
          
          if (recipeDoc.exists()) {
            const currentCount = recipeDoc.data().favoriteCount || 0;
            await updateDoc(recipeRef, {
              favoriteCount: Math.max(0, currentCount - 1)
            });
          }
        } catch (updateError) {
          console.warn('⚠️ Erreur mise à jour compteur favoris:', updateError);
        }
        
        console.log('✅ Retiré des favoris Firestore');
      } else {
        // Fallback: cache local
        const favorites = this.getUserCache('favorites', userId) || [];
        const updated = favorites.filter(f => f.recipeId !== recipeId);
        this.setUserCache('favorites', updated, userId);
        console.log('✅ Retiré des favoris localement');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur retrait favoris:', error);
      throw error;
    }
  }

  /**
   * RÉCUPÉRATION DES FAVORIS D'UN UTILISATEUR
   */
  async getUserFavorites(userId) {
    try {
      console.log('⭐ Récupération favoris utilisateur...', userId);
      
      if (!userId) {
        console.log('⚠️ Aucun userId fourni pour les favoris');
        return [];
      }
      
      if (this.checkFirestoreAvailability()) {
        const { query, collection, where, orderBy, getDocs, doc, getDoc } = firestoreModule;
        
        const q = query(
          collection(db, this.favoritesCollectionName),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const favoriteIds = [];
        
        querySnapshot.forEach((docSnap) => {
          favoriteIds.push(docSnap.data().recipeId);
        });
        
        // Récupérer les détails des recettes favorites
        const favoriteRecipes = [];
        
        for (const recipeId of favoriteIds) {
          try {
            const recipeDoc = await getDoc(doc(db, this.collectionName, recipeId));
            if (recipeDoc.exists()) {
              const data = recipeDoc.data();
              favoriteRecipes.push({
                id: recipeDoc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                isFavorite: true
              });
            }
          } catch (error) {
            console.error('❌ Erreur récupération recette favorite:', error);
          }
        }
        
        console.log('✅ Favoris Firestore récupérés:', favoriteRecipes.length);
        return favoriteRecipes;
      } else {
        // Fallback: cache local
        const favorites = this.getUserCache('favorites', userId) || [];
        const recipes = this.getUserCache('recipes', userId) || [];
        
        const favoriteRecipes = favorites
          .map(fav => recipes.find(r => r.id === fav.recipeId))
          .filter(Boolean)
          .map(recipe => ({ ...recipe, isFavorite: true }));
        
        console.log('✅ Favoris cache local récupérés:', favoriteRecipes.length);
        return favoriteRecipes;
      }
      
    } catch (error) {
      console.error('❌ Erreur récupération favoris:', error);
      return [];
    }
  }

  /**
   * VÉRIFIER SI UNE RECETTE EST EN FAVORIS
   */
  async isRecipeFavorite(recipeId, userId) {
    try {
      if (!userId || !recipeId) {
        return false;
      }
      
      if (this.checkFirestoreAvailability()) {
        const { query, collection, where, getDocs } = firestoreModule;
        
        const q = query(
          collection(db, this.favoritesCollectionName),
          where('recipeId', '==', recipeId),
          where('userId', '==', userId)
        );
        
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
      } else {
        // Fallback: cache local
        const favorites = this.getUserCache('favorites', userId) || [];
        return favorites.some(f => f.recipeId === recipeId);
      }
      
    } catch (error) {
      console.error('❌ Erreur vérification favori:', error);
      return false;
    }
  }

  /**
   * INCRÉMENTER LE COMPTEUR DE VUES
   */
  async incrementViewCount(recipeId) {
    try {
      if (!recipeId) return;
      
      if (this.checkFirestoreAvailability()) {
        const { doc, getDoc, updateDoc } = firestoreModule;
        
        const recipeRef = doc(db, this.collectionName, recipeId);
        const recipeDoc = await getDoc(recipeRef);
        
        if (recipeDoc.exists()) {
          const currentCount = recipeDoc.data().viewCount || 0;
          await updateDoc(recipeRef, {
            viewCount: currentCount + 1
          });
        }
      }
      // Pas de fallback local pour les compteurs de vues
      
    } catch (error) {
      console.error('❌ Erreur incrémentation vues (non critique):', error);
    }
  }

  /**
   * RECHERCHE DE RECETTES - Seulement dans les recettes utilisateur
   */
  async searchRecipes(searchTerm, userId, filters = {}) {
    try {
      console.log('🔍 Recherche recettes pour utilisateur:', searchTerm, userId);
      
      if (!userId) {
        console.warn('⚠️ Recherche nécessite un userId');
        return [];
      }
      
      // Utiliser les recettes de l'utilisateur pour la recherche
      const userRecipes = await this.getMassGainRecipes(userId, 100);
      
      // Filtrage côté client
      const searchLower = searchTerm.toLowerCase();
      const filtered = userRecipes.filter(recipe => {
        const nameMatch = recipe.name?.toLowerCase().includes(searchLower);
        const descriptionMatch = recipe.description?.toLowerCase().includes(searchLower);
        const ingredientMatch = recipe.ingredients?.some(ing => 
          typeof ing === 'string' ? ing.toLowerCase().includes(searchLower) :
          ing.name?.toLowerCase().includes(searchLower)
        );
        
        let filtersMatch = true;
        if (filters.mealType && recipe.mealType !== filters.mealType) filtersMatch = false;
        if (filters.minCalories && recipe.calories < filters.minCalories) filtersMatch = false;
        if (filters.minProtein && recipe.protein < filters.minProtein) filtersMatch = false;
        
        return (nameMatch || descriptionMatch || ingredientMatch) && filtersMatch;
      });
      
      console.log('✅ Recettes trouvées:', filtered.length);
      return filtered;
      
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      return [];
    }
  }

  /**
   * RÉCUPÉRATION PAR TYPE DE REPAS - Seulement utilisateur
   */
  async getRecipesByMealType(mealType, userId, limitCount = 10) {
    try {
      console.log('🍽️ Récupération recettes par type:', mealType, 'pour utilisateur:', userId);
      
      if (!userId) {
        return [];
      }
      
      const userRecipes = await this.getMassGainRecipes(userId, 50);
      const filtered = userRecipes
        .filter(recipe => recipe.mealType === mealType)
        .slice(0, limitCount);
      
      return filtered;
      
    } catch (error) {
      console.error('❌ Erreur récupération par type:', error);
      return [];
    }
  }

  /**
   * NETTOYAGE DU CACHE LOCAL
   */
  clearLocalCache() {
    try {
      const keys = ['recipes', 'favorites', 'mass_gain_recipes', 'public_recipes'];
      keys.forEach(key => {
        localStorage.removeItem(`nutrition_${key}`);
      });
      
      // Nettoyer aussi tous les caches utilisateur
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('nutrition_')) {
          localStorage.removeItem(key);
        }
      }
      
      console.log('🧹 Cache local complètement nettoyé');
    } catch (error) {
      console.warn('⚠️ Erreur nettoyage cache');
    }
  }

  /**
   * MÉTHODE À APPELER LORS DU CHANGEMENT D'UTILISATEUR
   */
  onUserChange(newUserId, oldUserId) {
    console.log('👤 Changement utilisateur détecté:', { oldUserId, newUserId });
    
    // Nettoyer le cache de l'ancien utilisateur
    if (oldUserId) {
      this.clearUserSpecificCache(oldUserId);
    }
    
    // Invalider les queries React Query si disponible
    if (typeof window !== 'undefined' && window.queryClient) {
      window.queryClient.invalidateQueries({
        queryKey: ['nutrition'],
        refetchType: 'all'
      });
    }
    
    console.log('✅ Changement utilisateur traité');
  }

  /**
   * OBTENIR LES STATISTIQUES DU SERVICE
   */
  async getServiceStats(userId) {
    const stats = {
      totalRecipes: 0,
      userRecipes: 0,
      favorites: 0,
      cacheSize: 0,
      hasUserData: false
    };

    try {
      if (userId) {
        const recipes = this.getUserCache('recipes', userId) || [];
        const favorites = this.getUserCache('favorites', userId) || [];
        
        stats.userRecipes = recipes.length;
        stats.favorites = favorites.length;
        stats.hasUserData = recipes.length > 0 || favorites.length > 0;
        stats.cacheSize = JSON.stringify({ recipes, favorites }).length;
      }
      
      return stats;
    } catch (error) {
      console.warn('Erreur calcul stats service');
      return stats;
    }
  }

  /**
   * MÉTHODE POUR DÉBUGGER LE SERVICE
   */
  debugService(userId) {
    console.group('🔍 Debug Nutrition Service');
    console.log('Firebase disponible:', this.isFirebaseAvailable);
    console.log('Auto-génération désactivée:', this.autoGenerationDisabled);
    console.log('Templates fallback désactivés:', this.fallbackTemplatesDisabled);
    
    if (userId) {
      const userRecipes = this.getUserCache('recipes', userId);
      const userFavorites = this.getUserCache('favorites', userId);
      console.log('Recettes utilisateur cache:', userRecipes?.length || 0);
      console.log('Favoris utilisateur cache:', userFavorites?.length || 0);
    }
    
    console.groupEnd();
  }
}

// Export de l'instance du service
export const nutritionFirestoreService = new NutritionFirestoreService();