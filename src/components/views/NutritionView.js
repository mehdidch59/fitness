import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Apple,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  ArrowLeft,
  Users,
  Target,
  Heart,
  Eye,
  Bookmark,
  LogIn,
  Utensils,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  useMassGainRecipes,
  useFavoriteMutations,
  useRecipeView,
  useIsRecipeFavorite,
  useFavoriteRecipes,
  useAuth
} from '../../hooks/useNutrition';
import { mistralService } from '../../services/mistralNutritionService';
import { nutritionFirestoreService } from '../../services/nutritionFirestoreService';
import { useI18n } from '../../utils/i18n';

// Composant Error Boundary stable
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center mb-3">
            <AlertCircle size={20} className="text-red-600 mr-2" />
            <h3 className="font-semibold text-red-800">{(window.__i18n_t && window.__i18n_t('nutrition.error.title','Une erreur s\'est produite')) || 'Une erreur s\'est produite'}</h3>
          </div>
          <p className="text-red-700 text-sm mb-4">
            {(window.__i18n_t && window.__i18n_t('nutrition.error.desc',"Impossible d'afficher cette section. Essayez de rafraîchir la page.")) || "Impossible d'afficher cette section. Essayez de rafraîchir la page."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-200"
          >
            {(window.__i18n_t && window.__i18n_t('common.refreshPage','Rafraîchir la page')) || 'Rafraîchir la page'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Composant AuthPrompt séparé
const AuthPrompt = ({ onClose }) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="text-center">
          <LogIn size={48} className="mx-auto mb-4 text-purple-600" />
          <h3 className="text-xl font-bold mb-2">{t('nutrition.authRequired', 'Connexion requise')}</h3>
          <p className="text-gray-600 mb-6">
            {t('nutrition.authMsg', 'Connectez-vous pour sauvegarder vos recettes favorites et accéder à vos préférences personnalisées.')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {t('common.later', 'Plus tard')}
            </button>
            <button
              onClick={() => {
                onClose();
                console.log('Redirection vers page de connexion');
              }}
              className="flex-1 px-4 py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-800"
            >
              {t('common.login', 'Se connecter')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant RecipeDetail séparé - Respect des règles des hooks
const RecipeDetail = ({
  recipe,
  onBack,
  user,
  incrementView,
  addToFavorites,
  removeFromFavorites,
  isAddingToFavorites,
  isRemovingFromFavorites,
  refetchFavorites,
  onShowAuthPrompt
}) => {
  const [detailError, setDetailError] = useState(null);
  const { t } = useI18n();

  // ✅ Hooks au niveau supérieur du composant
  const { data: isFavorite, refetch: refetchIsFavorite } = useIsRecipeFavorite(recipe?.id);

  // Fonction stable pour incrémenter les vues
  const safeIncrementView = useCallback(async (recipeId) => {
    try {
      if (recipeId && incrementView) {
        incrementView(recipeId);
      }
    } catch (error) {
      console.warn('Erreur incrémentation vue (non bloquante):', error);
    }
  }, [incrementView]);

  useEffect(() => {
    if (recipe?.id) {
      safeIncrementView(recipe.id);
    }
  }, [recipe?.id, safeIncrementView]);

  const handleToggleFavorite = useCallback(async () => {
    try {
      setDetailError(null);

      if (!user) {
        onShowAuthPrompt(true);
        return;
      }

      if (isFavorite) {
        await removeFromFavorites(recipe.id);
      } else {
        await addToFavorites(recipe.id);
      }

      refetchIsFavorite();
      refetchFavorites();
    } catch (error) {
      console.error('Erreur toggle favori:', error);
      setDetailError('Erreur lors de la gestion des favoris');
    }
  }, [user, isFavorite, recipe?.id, removeFromFavorites, addToFavorites, refetchIsFavorite, refetchFavorites, onShowAuthPrompt]);

  // Fonction stable pour générer une image
  const getRecipeImage = useCallback((recipe) => {
    try {
      const keywords = recipe.name?.toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(' ')
        .slice(0, 2)
        .join('+') || 'food';
      return `https://source.unsplash.com/400x300/?${keywords}+food+meal`;
    } catch (error) {
      return 'https://source.unsplash.com/400x300/?food+meal';
    }
  }, []);

  if (!recipe) {
    return (
      <div className="p-6 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <p className="text-red-600">{t('nutrition.notFound', 'Recette introuvable')}</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">
          {t('common.back', 'Retour')}
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="pb-20 p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-5xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center text-purple-700 hover:text-purple-800 font-medium"
          >
            <ArrowLeft size={20} className="mr-2" />
            {(window.__i18n_t && window.__i18n_t('nutrition.backToRecipes','Retour aux recettes')) || 'Retour aux recettes'}
          </button>

          <button
            onClick={handleToggleFavorite}
            disabled={isAddingToFavorites || isRemovingFromFavorites}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${!user
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : isFavorite
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
          >
            <Heart
              size={18}
              className={`mr-2 ${isFavorite ? 'fill-current' : ''}`}
            />
            {!user
              ? ((window.__i18n_t && window.__i18n_t('nutrition.loginForFav','Se connecter pour favoris')) || 'Se connecter pour favoris')
              : isAddingToFavorites || isRemovingFromFavorites
                ? ((window.__i18n_t && window.__i18n_t('common.loading','Chargement...')) || 'Chargement...')
                : isFavorite ? ((window.__i18n_t && window.__i18n_t('nutrition.removeFav','Retirer des favoris')) || 'Retirer des favoris') : ((window.__i18n_t && window.__i18n_t('nutrition.addFav','Ajouter aux favoris')) || 'Ajouter aux favoris')
            }
          </button>
        </div>

        {detailError && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
            <p className="text-red-600 text-sm">{detailError}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden max-w-4xl mx-auto">
          <div className="h-48 sm:h-56 md:h-64 bg-gradient-to-r from-indigo-800 to-purple-900 flex items-center justify-center relative">
            <img
              src={getRecipeImage(recipe)}
              alt={recipe.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-full bg-gradient-to-r from-purple-700 to-pink-700 dark:from-indigo-700 dark:to-violet-700 items-center justify-center">
              <Apple size={48} className="text-white" />
            </div>

            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700">
              {recipe.source || t('nutrition.aiSource', 'IA Nutritionnelle')}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{recipe.name}</h1>
            <p className="text-gray-600 mb-4">{recipe.description}</p>

            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
              {recipe.viewCount > 0 && (
                <div className="flex items-center">
                  <Eye size={14} className="mr-1" />
                  <span>{recipe.viewCount} {t('nutrition.views', 'vues')}</span>
                </div>
              )}
              {recipe.favoriteCount > 0 && (
                <div className="flex items-center">
                  <Heart size={14} className="mr-1" />
                  <span>{recipe.favoriteCount} {t('nutrition.favoritesLabel', 'favoris')}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 p-4 rounded-xl">
                <div className="text-yellow-700 font-semibold text-lg">{recipe.calories || t('common.undefined', 'N/A')}</div>
                <div className="text-yellow-800 text-sm">{t('nutrition.calories', 'Calories')}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="text-blue-700 font-semibold text-lg">{recipe.protein || t('common.undefined', 'N/A')}g</div>
                <div className="text-blue-800 text-sm">{t('nutrition.proteins', 'Protéines')}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <div className="text-green-700 font-semibold text-lg">{recipe.carbs || t('common.undefined', 'N/A')}g</div>
                <div className="text-green-800 text-sm">{t('nutrition.carbs', 'Glucides')}</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl">
                <div className="text-orange-700 font-semibold text-lg">{recipe.fats || t('common.undefined', 'N/A')}g</div>
                <div className="text-orange-800 text-sm">{t('nutrition.fats', 'Lipides')}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                <Clock size={18} className="text-gray-600 mr-2" />
                <span className="text-gray-700">{recipe.time || t('common.undefined', 'N/A')} {t('nutrition.minutes', 'min')}</span>
              </div>
              <div className="flex items-center">
                <Users size={18} className="text-gray-600 mr-2" />
                <span className="text-gray-700">{recipe.servings || 1} {t('nutrition.servings', 'portion')}{(recipe.servings || 1) > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <Target size={18} className="text-gray-600 mr-2" />
                <span className="text-gray-700">{recipe.difficulty || t('nutrition.easy', 'Facile')}</span>
              </div>
            </div>

            {recipe.massGainScore && (
              <div className="mb-6 p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-purple-800 font-medium">{t('nutrition.massGainScore', 'Score Prise de Masse')}</span>
                  <div className="flex items-center">
                    <div className="w-24 bg-purple-200 rounded-full h-2 mr-3">
                      <div
                        className="bg-purple-700 h-2 rounded-full"
                        style={{ width: `${Math.min(recipe.massGainScore, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-purple-800 font-bold">{recipe.massGainScore}/100</span>
                  </div>
                </div>
              </div>
            )}            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('nutrition.ingredients', 'Ingrédients')}</h3>
              <div className="bg-gray-50 p-4 rounded-xl">
                {recipe.ingredients && recipe.ingredients.length > 0 ? (
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ingredient, index) => {
                      // Gérer différents formats d'ingrédients
                      let ingredientText = '';
                      let quantityText = '';
                      
                      if (typeof ingredient === 'string') {
                        // Si l'ingrédient est une chaîne simple
                        ingredientText = ingredient;
                      } else if (typeof ingredient === 'object' && ingredient !== null) {
                        // Si l'ingrédient est un objet avec des propriétés
                        ingredientText = ingredient.name || ingredient.ingredient || 'Ingrédient';
                        quantityText = ingredient.quantity && ingredient.unit 
                          ? `${ingredient.quantity} ${ingredient.unit}`
                          : ingredient.quantity || '';
                      } else {
                        ingredientText = 'Ingrédient';
                      }
                      
                      return (
                        <li key={`ingredient-${index}-${ingredientText}`} className="flex justify-between items-center">
                          <span className="text-gray-700">{ingredientText}</span>
                          {quantityText && (
                            <span className="text-gray-600 font-medium">
                              {quantityText}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-gray-600 italic">{(window.__i18n_t && window.__i18n_t('nutrition.noIngredients','Ingrédients non spécifiés')) || 'Ingrédients non spécifiés'}</p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instructions</h3>
              <div className="bg-gray-50 p-4 rounded-xl">
                {recipe.instructions && recipe.instructions.length > 0 ? (
                  <ol className="space-y-3">
                    {recipe.instructions.map((instruction, index) => (
                      <li key={`instruction-${index}`} className="flex items-start">
                        <span className="bg-purple-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-gray-700">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-gray-600 italic">Instructions non spécifiées</p>
                )}
              </div>
            </div>

            {recipe.tips && recipe.tips.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Conseils Pratiques</h3>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <ul className="space-y-2">
                    {recipe.tips.map((tip, index) => (
                      <li key={`tip-${index}`} className="text-blue-900 flex items-start">
                        <span className="text-blue-700 mr-2 mt-1">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {recipe.tags && recipe.tags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag, index) => (
                    <span
                      key={`tag-${index}-${tag}`}
                      className="bg-purple-100 text-purple-900 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {recipe.nutritionTips && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Conseils Nutrition</h3>
                <div className="bg-green-50 p-4 rounded-xl border-l-4 border-green-500">
                  <p className="text-green-900">{recipe.nutritionTips}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
              <div className="flex items-center">
                <Search size={16} className="text-purple-700 mr-2" />
                <span className="text-purple-700 font-medium">
                  {recipe.source || 'IA Nutritionnelle'}
                </span>
              </div>
              {recipe.createdAt && (
                <span>
                  Créé le {new Date(recipe.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Composant principal NutritionView
function NutritionView() {
  const { actions } = useAppContext();
  const { user } = useAuth();
  const { t } = useI18n();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [viewMode, setViewMode] = useState('discover');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [error, setError] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const [lastUserId, setLastUserId] = useState(null);

  // Callbacks stables pour les hooks
  const onSuccess = useCallback(() => {
    actions.setSearchStatus(t('nutrition.searchFound', 'Recettes trouvées !'));
    setError(null);
  }, [actions, t]);

  const onError = useCallback((err) => {
    console.error('Erreur de recherche:', err);
    actions.setSearchStatus(t('nutrition.searchError', 'Erreur lors de la recherche'));
    setError(err?.message || t('nutrition.fetchError', 'Erreur de récupération des recettes'));
  }, [actions, t]);

  // Options stables pour les hooks
  const hookOptions = useMemo(() => ({
    onSuccess,
    onError
  }), [onSuccess, onError]);
  
  // Hooks principaux avec options stables
  const { 
    data: recipes,
    isLoading,
    isError,
    error: fetchError,
    generateNew,
    isGenerating,
    refetch: refetchRecipes
  } = useMassGainRecipes(hookOptions);

  // Hook pour les favoris
  const favoritesHookOptions = useMemo(() => ({
    onError: (err) => console.error('Erreur favoris:', err)
  }), []);

  const {
    data: favoriteRecipes,
    isLoading: isLoadingFavorites,
    refetch: refetchFavorites
  } = useFavoriteRecipes(favoritesHookOptions);

  // Mutations pour favoris
  const {
    addToFavorites,
    removeFromFavorites,
    isAddingToFavorites,
    isRemovingFromFavorites
  } = useFavoriteMutations();

  // Hook pour vues
  const { incrementView } = useRecipeView();

  // Détecter le changement d'utilisateur et forcer la mise à jour des queries
  useEffect(() => {
    const currentUserId = user?.uid;
    
    if (currentUserId !== lastUserId) {
      console.log('🔄 Changement d\'utilisateur détecté:', lastUserId, '->', currentUserId);
      setLastUserId(currentUserId);
      
      if (currentUserId) {
        // Nouvel utilisateur connecté - charger SEULEMENT les recettes existantes
        console.log('👤 Chargement des recettes EXISTANTES pour nouvel utilisateur:', currentUserId);
        setTimeout(() => {
          refetchRecipes(); // Charge seulement les recettes existantes, pas de génération
          refetchFavorites();
        }, 500);
      } else {
        // Utilisateur déconnecté - nettoyer les données
        console.log('🚪 Utilisateur déconnecté - nettoyage des données');
        setError(null);
        actions.setSearchStatus('');
      }
    }
  }, [user?.uid, lastUserId, refetchRecipes, refetchFavorites, actions]);

  // Fonction stable pour générer de nouvelles recettes
  const handleRefreshRecipes = useCallback(() => {
    try {
      if (!user?.uid) {
        setError(t('nutrition.loginToGenerateRecipes', 'Connectez-vous pour générer des recettes'));
        setShowAuthPrompt(true);
        return;
      }
      
      setError(null);
      actions.setSearchStatus(t('nutrition.generatingNewRecipes', 'Génération de nouvelles recettes...'));
      generateNew();
    } catch (error) {
      console.error('Erreur génération:', error);
      setError(t('nutrition.generationError', 'Erreur lors de la génération'));
    }
  }, [actions, generateNew, user?.uid, t]);

  // Effect pour afficher le statut utilisateur
  useEffect(() => {
    if (user?.uid) {
      console.log('✅ Utilisateur actuel dans NutritionView:', user.uid);
    } else {
      console.log('❌ Aucun utilisateur connecté dans NutritionView');
    }
  }, [user?.uid]);  const handleNutritionGeneration = useCallback(async () => {
    try {
      // Vérification préliminaire de l'authentification
      if (!user?.uid) {
        console.log('❌ Pas d\'utilisateur connecté - user?.uid:', user?.uid);
        setError(t('nutrition.loginToGeneratePlan', 'Connectez-vous pour générer un plan nutritionnel'));
        setShowAuthPrompt(true);
        return;
      }

      console.log('🚀 Démarrage génération nutrition pour utilisateur:', user.uid);
      
      setIsGeneratingNutrition(true);
      setGenerationStage(t('nutrition.stage.start', 'Démarrage de la génération du plan nutritionnel...'));
      setGenerationProgress(0);
      setError(null);

      // Update progress incrementally
      setGenerationProgress(20);
      setGenerationStage(t('nutrition.stage.analysis', 'Analyse des besoins nutritionnels...'));
        // Récupérer le profil utilisateur depuis le localStorage ou définir des valeurs par défaut
      let userProfile = {};
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('👤 Données utilisateur récupérées:', parsedUser?.uid);
          userProfile = {
            goal: 'prise de masse',
            level: parsedUser.fitnessLevel || 'intermédiaire',
            weight: parsedUser.weight || 75,
            height: parsedUser.height || 175,
            age: parsedUser.age || 25,
            gender: parsedUser.gender || 'homme'
          };
        }
      } catch (error) {
        console.log('⚠️ Erreur parsing données utilisateur, utilisation profil par défaut:', error);
        userProfile = {
          goal: 'prise de masse',
          level: 'intermédiaire',
          weight: 75,
          age: 25,
          gender: 'homme'
        };
      }

      setGenerationProgress(40);
      setGenerationStage(t('nutrition.stage.generatingRecipes', 'Génération de nouvelles recettes...'));

      // Générer de nouvelles recettes via Mistral uniquement
      try {
        console.log('🤖 Génération via Mistral avec profil:', userProfile);
        
        const newRecipes = await mistralService.generateMassGainRecipes(userProfile);
        
        if (!newRecipes || newRecipes.length === 0) {
          throw new Error('Aucune recette générée par Mistral');
        }
        
        console.log('✅ Nouvelles recettes générées via Mistral:', newRecipes.length);

        setGenerationProgress(70);
        setGenerationStage(t('nutrition.stage.saving', 'Sauvegarde des recettes...'));        // Sauvegarder les nouvelles recettes
        try {
          const currentUserId = user?.uid;
          if (!currentUserId) {
            throw new Error('Utilisateur non connecté - impossible de sauvegarder');
          }
          
          console.log('💾 Sauvegarde avec userId:', currentUserId);
          await nutritionFirestoreService.saveMultipleRecipes(newRecipes, currentUserId, { explicitSave: true });
          console.log('✅ Recettes sauvegardées en base');
        } catch (saveError) {
          console.warn('⚠️ Erreur sauvegarde, recettes en cache local:', saveError);
          // Ne pas faire échouer toute la génération pour un problème de sauvegarde
        }

        setGenerationProgress(90);
        setGenerationStage(t('nutrition.stage.finalizing', 'Finalisation du plan nutritionnel...'));

        // Appeler le refresh pour actualiser les données affichées
        try {
          console.log('🔄 Actualisation des recettes...');
          await generateNew();
          console.log('✅ Recettes actualisées');
        } catch (generateError) {
          console.warn('⚠️ Erreur génération hook:', generateError);
        }

        // Attendre un peu pour que les nouvelles recettes soient disponibles
        await new Promise(resolve => setTimeout(resolve, 1000));

        setGenerationProgress(100);
        setGenerationStage(t('nutrition.generatedSuccessfully', 'Plan nutritionnel généré avec succès !'));

        // Actualiser les données après génération
        actions.setSearchStatus(t('nutrition.generatedSuccessfully', 'Plan nutritionnel généré avec succès !'));

      } catch (mistralError) {
        console.error('❌ Erreur Mistral:', mistralError);
        throw new Error(`Erreur lors de la génération des recettes: ${mistralError.message}`);
      }

      // Reset after completion
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStage('');
        setIsGeneratingNutrition(false);
      }, 2000);

    } catch (error) {
      console.error('❌ Erreur lors de la génération du plan nutritionnel:', error);
      setGenerationStage(t('nutrition.stage.error', 'Erreur lors de la génération - Veuillez réessayer'));
      setError(error?.message || t('nutrition.generationPlanError', 'Erreur lors de la génération du plan nutritionnel'));
      
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStage('');
        setIsGeneratingNutrition(false);
      }, 3000);
    }
  }, [generateNew, user?.uid, actions, t]);

  // Fonction stable pour basculer entre les vues
  const toggleViewMode = useCallback((mode) => {
    try {
      if (mode === 'favorites' && !user) {
        setShowAuthPrompt(true);
        return;
      }

      setViewMode(mode);
      if (mode === 'favorites') {
        refetchFavorites();
      }
    } catch (error) {
      console.error('Erreur changement de mode:', error);
      setError(t('nutrition.viewChangeError', 'Erreur lors du changement de vue'));
    }
  }, [user, refetchFavorites, t]);

  // Données actuelles selon le mode - mémorisées
  const currentRecipes = useMemo(() =>
    viewMode === 'favorites' ? favoriteRecipes : recipes,
    [viewMode, favoriteRecipes, recipes]
  );

  const currentLoading = useMemo(() =>
    viewMode === 'favorites' ? isLoadingFavorites : isLoading,
    [viewMode, isLoadingFavorites, isLoading]
  );

  // Sélection pour suppression
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);

  // Callbacks stables pour la sélection
  const handleRecipeSelect = useCallback((recipe) => {
    setSelectedRecipe(recipe);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  const handleCloseAuthPrompt = useCallback(() => {
    setShowAuthPrompt(false);
  }, []);

  // Si une recette est sélectionnée, afficher ses détails
  if (selectedRecipe) {
    return (
      <>
        <RecipeDetail
          recipe={selectedRecipe}
          onBack={handleBackToList}
          user={user}
          incrementView={incrementView}
          addToFavorites={addToFavorites}
          removeFromFavorites={removeFromFavorites}
          isAddingToFavorites={isAddingToFavorites}
          isRemovingFromFavorites={isRemovingFromFavorites}
          refetchFavorites={refetchFavorites}
          onShowAuthPrompt={setShowAuthPrompt}
        />
        {showAuthPrompt && <AuthPrompt onClose={handleCloseAuthPrompt} />}
      </>
    );
  }

  // Vue principale avec la liste des recettes
  return (
    <ErrorBoundary>
      <div className="pb-20 p-4 sm:p-6 bg-gray-50 min-h-screen">
        {showAuthPrompt && <AuthPrompt onClose={handleCloseAuthPrompt} />}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold">{t('nutrition.title', 'Nutrition')}</h2>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => toggleViewMode('discover')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'discover'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Search size={16} className="inline mr-2" />
              {t('nutrition.discover', 'Découvrir')}
            </button>
            <button
              onClick={() => toggleViewMode('favorites')}
              className={`px-4 py-2 rounded-lg font-medium transition-all relative ${viewMode === 'favorites'
                ? 'bg-red-100 text-red-700'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Heart size={16} className="inline mr-2" />
              {t('nutrition.favorites', 'Favoris')} {favoriteRecipes?.length ? `(${favoriteRecipes.length})` : ''}
              {!user && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-600 rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
            <div className="flex items-center">
              <AlertCircle size={20} className="text-red-600 mr-3" />
              <div>
                <p className="text-red-600 font-medium">{t('nutrition.error.title', 'Une erreur s\'est produite')}</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'favorites' && !user && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6">
            <div className="flex items-center">
              <LogIn size={20} className="text-amber-700 mr-3" />
              <div>
                <p className="text-amber-900 font-medium">{t('nutrition.authRequired', 'Connexion requise')}</p>
                <p className="text-amber-800 text-sm">{t('nutrition.loginForFavAccess', 'Connectez-vous pour accéder à vos favoris')}</p>
                <button 
                  onClick={() => setShowAuthPrompt(true)}
                  className="mt-2 text-amber-800 underline text-sm font-medium"
                >
                  {t('nutrition.loginNow', 'Se connecter maintenant')}
                </button>
              </div>
            </div>
          </div>
        )}

        {!user && viewMode === 'discover' && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl mb-6">
            <div className="flex items-center">
              <LogIn size={20} className="text-blue-700 mr-3" />
              <div>
                <p className="text-blue-900 font-medium">{t('nutrition.limitedAccess', 'Accès limité')}</p>
                <p className="text-blue-800 text-sm">{t('nutrition.loginForPersonalized', 'Connectez-vous pour générer des recettes personnalisées')}</p>
                <button 
                  onClick={() => setShowAuthPrompt(true)}
                  className="mt-2 text-blue-800 underline text-sm font-medium"
                >
                  {t('nutrition.loginNow', 'Se connecter maintenant')}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentLoading && (
          <div className="flex justify-center items-center py-8">
            <RefreshCw size={32} className="text-purple-600 animate-spin" />
            <p className="ml-3 text-purple-800">
              {viewMode === 'favorites' ? t('nutrition.loadingFavorites', 'Chargement des favoris...') : t('nutrition.searchingRecipes', 'Recherche de recettes en cours...')}
            </p>
          </div>
        )}

        {isError && viewMode === 'discover' && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
            <p className="text-red-600">{t('search.errorTitle', 'Erreur de recherche')}: {fetchError?.message || t('nutrition.unableToFind', 'Impossible de trouver des recettes')}</p>
            <button
              onClick={handleRefreshRecipes}
              className="mt-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg text-sm"
            >
              {t('search.errorTryAgain', 'Réessayer')}
            </button>
          </div>
        )}

        {currentRecipes && currentRecipes.length > 0 ? (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 -mt-1 mb-2">
              <button
                onClick={() => {
                  if (selectionMode) setSelectedRecipeIds(new Set());
                  setSelectionMode(!selectionMode);
                }}
                className={`px-3 py-1 rounded-lg text-sm ${selectionMode ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {selectionMode ? 'Annuler sélection' : 'Sélectionner'}
              </button>
              {selectionMode && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      // Sélectionner toutes les recettes visibles
                      setSelectedRecipeIds(prev => {
                        const next = new Set(prev);
                        (currentRecipes || []).forEach(r => { if (r.id) next.add(r.id); });
                        return next;
                      });
                    }}
                    className="px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Tout sélectionner
                  </button>
                  <span className="text-sm text-gray-600 mr-2">{selectedRecipeIds.size} sélectionné(s)</span>
                  <button
                    onClick={() => {
                      const ids = Array.from(selectedRecipeIds);
                      if (!ids.length) return;
                      setPendingDeleteIds(ids);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={selectedRecipeIds.size === 0}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center ${selectedRecipeIds.size === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    <Trash2 size={14} className="mr-1" /> Supprimer
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentRecipes.map((recipe, index) => (
                <div
                  key={recipe.id || `recipe-${index}-${recipe.name?.substring(0, 10)}`}
                  className={`relative bg-white rounded-xl p-4 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-[1.02] ${selectionMode ? 'pl-10' : ''}`}
                  onClick={() => {
                    if (selectionMode) {
                      setSelectedRecipeIds(prev => {
                        const next = new Set(prev);
                        if (recipe.id && next.has(recipe.id)) next.delete(recipe.id); else if (recipe.id) next.add(recipe.id);
                        return next;
                      });
                      return;
                    }
                    handleRecipeSelect(recipe);
                  }}
                >
                  {selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecipeIds(prev => {
                          const next = new Set(prev);
                          if (recipe.id && next.has(recipe.id)) next.delete(recipe.id); else if (recipe.id) next.add(recipe.id);
                          return next;
                        });
                      }}
                      className="absolute top-4 left-4 p-1 rounded-md hover:bg-gray-100"
                      aria-label="Sélectionner la recette"
                    >
                      {recipe.id && selectedRecipeIds.has(recipe.id) ? <CheckSquare size={18} className="text-purple-600" /> : <Square size={18} className="text-gray-400" />}
                    </button>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg flex-1">{recipe.name || 'Recette sans nom'}</h3>
                    <div className="flex items-center gap-2 ml-4">
                      {recipe.favoriteCount > 0 && (
                        <div className="flex items-center text-red-600 text-xs">
                          <Heart size={12} className="mr-1" />
                          <span>{recipe.favoriteCount}</span>
                        </div>
                      )}
                      {recipe.viewCount > 0 && (
                        <div className="flex items-center text-gray-500 text-xs">
                          <Eye size={12} className="mr-1" />
                          <span>{recipe.viewCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mt-1 mb-2 line-clamp-3">{recipe.description || 'Aucune description'}</p>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mt-2">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      <span className="text-yellow-700 font-medium">{recipe.calories || 'N/A'} kcal</span>
                      <span className="text-blue-700 font-medium">{recipe.protein || 'N/A'}g protéines</span>
                      <div className="flex items-center">
                        <Clock size={14} className="text-gray-600 mr-1" />
                        <span className="text-gray-600">{recipe.time || 'N/A'} min</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Cliquez pour voir détails</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Toolbar sélection */}
            <div className="flex items-center justify-between -mt-1">
              <button
                onClick={() => {
                  if (selectionMode) setSelectedRecipeIds(new Set());
                  setSelectionMode(!selectionMode);
                }}
                className={`px-3 py-1 rounded-lg text-sm ${selectionMode ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {selectionMode ? 'Annuler sélection' : 'Sélectionner'}
              </button>
              {selectionMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Sélectionner toutes les recettes visibles
                      setSelectedRecipeIds(prev => {
                        const next = new Set(prev);
                        (currentRecipes || []).forEach(r => { if (r.id) next.add(r.id); });
                        return next;
                      });
                    }}
                    className="px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Tout sélectionner
                  </button>
                  <span className="text-sm text-gray-600 mr-2">{selectedRecipeIds.size} sélectionné(s)</span>
                  <button
                    onClick={() => {
                      const ids = Array.from(selectedRecipeIds);
                      if (!ids.length) return;
                      setPendingDeleteIds(ids);
                      setShowDeleteConfirm(true);
                    }}
                    disabled={selectedRecipeIds.size === 0}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center ${selectedRecipeIds.size === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    <Trash2 size={14} className="mr-1" /> Supprimer
                  </button>
                </div>
              )}
            </div>
            {currentRecipes.map((recipe, index) => (
              <div
                key={recipe.id || `recipe-${index}-${recipe.name?.substring(0, 10)}`}
                className={`relative bg-white rounded-xl p-4 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-[1.02] ${selectionMode ? 'pl-10' : ''}`}
                onClick={() => {
                  if (selectionMode) {
                    setSelectedRecipeIds(prev => {
                      const next = new Set(prev);
                      if (recipe.id && next.has(recipe.id)) next.delete(recipe.id); else if (recipe.id) next.add(recipe.id);
                      return next;
                    });
                    return;
                  }
                  handleRecipeSelect(recipe);
                }}
              >
                {selectionMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRecipeIds(prev => {
                        const next = new Set(prev);
                        if (recipe.id && next.has(recipe.id)) next.delete(recipe.id); else if (recipe.id) next.add(recipe.id);
                        return next;
                      });
                    }}
                    className="absolute top-4 left-4 p-1 rounded-md hover:bg-gray-100"
                    aria-label="Sélectionner la recette"
                  >
                    {recipe.id && selectedRecipeIds.has(recipe.id) ? <CheckSquare size={18} className="text-purple-600" /> : <Square size={18} className="text-gray-400" />}
                  </button>
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg flex-1">{recipe.name || 'Recette sans nom'}</h3>
                  <div className="flex items-center gap-2 ml-4">
                    {recipe.favoriteCount > 0 && (
                      <div className="flex items-center text-red-600 text-xs">
                        <Heart size={12} className="mr-1" />
                        <span>{recipe.favoriteCount}</span>
                      </div>
                    )}
                    {recipe.viewCount > 0 && (
                      <div className="flex items-center text-gray-500 text-xs">
                        <Eye size={12} className="mr-1" />
                        <span>{recipe.viewCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 mt-1 mb-2">{recipe.description || 'Aucune description'}</p>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-3 text-sm">
                    <span className="text-yellow-700 font-medium">{recipe.calories || 'N/A'} kcal</span>
                    <span className="text-blue-700 font-medium">{recipe.protein || 'N/A'}g protéines</span>
                    <div className="flex items-center">
                      <Clock size={14} className="text-gray-600 mr-1" />
                      <span className="text-gray-600">{recipe.time || 'N/A'} min</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center text-xs text-purple-700">
                    <Search size={12} className="mr-1" />
                    <span>{recipe.source || 'Recette IA'}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Cliquez pour voir détails
                  </span>
                </div>
              </div>
            ))}

            {viewMode === 'discover' && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleRefreshRecipes}
                  disabled={isGenerating}
                  className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg text-sm hover:bg-purple-200 disabled:opacity-50"
                >
                  🍽️ Nouvelles Recettes
                </button>
                <button
                  onClick={() => refetchRecipes()}
                  disabled={isLoading}
                  className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm hover:bg-blue-200 disabled:opacity-50 flex items-center"
                >
                  <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Recharger
                </button>
              </div>
            )}
          </div>
        ) : !currentLoading && !isError ? (
          <div className="text-center py-12 max-w-md mx-auto">
            {viewMode === 'favorites' ? (
              <div>
                <Bookmark className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-600 mb-4">
                  {!user ? 'Connectez-vous pour sauvegarder vos favoris' : 'Aucune recette en favoris'}
                </p>
                <button
                  onClick={() => toggleViewMode('discover')}
                  className="bg-gradient-to-r from-purple-700 to-blue-800 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-800 hover:to-blue-900 transition-all"
                >
                  Découvrir des recettes
                </button>
              </div>
            ) : (
              <div>
                <Apple className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-600 mb-4">
                  {!user ? 'Connectez-vous pour accéder à vos recettes personnalisées' : 'Aucune recette trouvée'}
                </p>
                
                {!user ? (
                  <button
                    onClick={() => setShowAuthPrompt(true)}
                    className="w-full mb-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-medium"
                  >
                    Se connecter pour commencer
                  </button>
                ) : (
                  <button 
                    onClick={() => refetchRecipes()} 
                    disabled={isLoading}
                    className="w-full mb-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium flex items-center justify-center disabled:opacity-50"
                  >
                    <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Recharger les recettes
                  </button>
                )}
                
                <button
                  onClick={handleNutritionGeneration}
                  disabled={isGeneratingNutrition || !user}
                  className={`w-full py-4 rounded-2xl font-semibold text-white transition-all relative overflow-hidden ${isGeneratingNutrition || !user
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-emerald-500 dark:via-emerald-600 dark:to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 dark:hover:from-emerald-600 dark:hover:via-emerald-700 dark:hover:to-teal-700 shadow-lg hover:shadow-xl'
                    }`}
                >
                  {/* Barre de progression animée */}
                  {isGeneratingNutrition && (
                    <div
                      className="absolute left-0 top-0 h-full bg-white bg-opacity-20 transition-all duration-500 ease-out"
                      style={{ width: `${generationProgress}%` }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-center">
                    {isGeneratingNutrition ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center mb-1">
                          <Utensils size={20} className="mr-2 animate-pulse" />
                          <span>Génération plan nutritionnel...</span>
                        </div>
                        <div className="flex items-center text-xs opacity-90 mb-1">
                          <span className="mr-2">{generationProgress}%</span>
                        </div>
                        <div className="text-xs opacity-75">
                          {generationStage}
                        </div>
                      </div>
                    ) : !user ? (
                      <>
                        <AlertCircle size={20} className="mr-2" />
                        Connectez-vous pour générer
                      </>
                    ) : (
                      <div className="flex items-center">
                        <Apple size={20} className="mr-2" />
                        <div className="flex flex-col">
                          <span>Génération Plan Nutritionnel</span>
                          <span className="text-xs opacity-90">
                            🥗 Menus • Recettes • Répartition macros • Planning hebdomadaire
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {showDeleteConfirm && (
        <DeleteConfirmModal
          count={pendingDeleteIds.length}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={async () => {
            try {
              if (!user?.uid || pendingDeleteIds.length === 0) return;
              await nutritionFirestoreService.deleteRecipes(pendingDeleteIds, user.uid);
              setSelectedRecipeIds(new Set());
              setSelectionMode(false);
              if (viewMode === 'favorites') await refetchFavorites();
              await refetchRecipes();
            } catch (e) {
              console.error('Suppression recettes échouée:', e);
              setError('Erreur lors de la suppression');
            } finally {
              setShowDeleteConfirm(false);
              setPendingDeleteIds([]);
            }
          }}
        />
      )}
    </ErrorBoundary>
  );
}

// Popup de confirmation suppression
function DeleteConfirmModal({ count, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h4 className="text-lg font-semibold mb-2">Confirmer la suppression</h4>
        <p className="text-sm text-gray-600 mb-4">Supprimer définitivement {count} élément(s) ?</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200">Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

export default NutritionView;
