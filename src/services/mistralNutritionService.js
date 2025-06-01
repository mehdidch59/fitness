/**
 * Service Mistral amélioré pour la génération de recettes nutritionnelles
 * Version robuste avec parsing JSON avancé et gestion d'erreurs
 * SANS recettes fallback automatiques
 */

import { JSONParsingUtils } from '../utils/JSONParsingUtils';

class MistralNutritionService {
  constructor() {
    this.apiKey = process.env.REACT_APP_MISTRAL_API_KEY;
    this.baseURL = 'https://api.mistral.ai/v1/chat/completions';
    this.model = 'mistral-large-latest';
    this.maxRetries = 3;
    this.timeout = 30000; // 30 secondes
  }

  /**
   * Génère des recettes de prise de masse avec parsing robuste
   * SANS fallback automatique - retourne une erreur si échec
   */
  async generateMassGainRecipes(userProfile = {}) {
    try {
      console.log('🤖 Génération de recettes via Mistral API...');
      
      if (!this.isAvailable()) {
        throw new Error('Service Mistral non configuré - vérifiez votre clé API');
      }
      
      const content = await this.callMistralAPI(this.buildMassGainPrompt(userProfile));
      return this.parseRecipesResponse(content);
    } catch (error) {
      console.error('❌ Erreur génération Mistral:', error);
      // Propager l'erreur au lieu de retourner un fallback
      throw new Error(`Échec génération recettes Mistral: ${error.message}`);
    }
  }

  /**
   * Parse la réponse des recettes avec validation robuste
   * Lance une erreur si le parsing échoue
   */
  parseRecipesResponse(content) {
    if (!content) {
      throw new Error('Contenu vide reçu de Mistral');
    }

    console.log('📝 Contenu reçu de Mistral:', content.substring(0, 200) + '...');

    try {
      // Utiliser le parser JSON amélioré
      const parsed = JSONParsingUtils.safeJSONParse(content, null);
      
      if (!parsed) {
        throw new Error('Impossible de parser le JSON retourné par Mistral');
      }

      // Normaliser les recettes
      const recipes = JSONParsingUtils.normalizeRecipes(parsed);
      
      if (!recipes || recipes.length === 0) {
        throw new Error('Aucune recette valide trouvée dans la réponse Mistral');
      }

      console.log('✅ Recettes parsées avec succès:', recipes.length);
      return recipes;
    } catch (error) {
      console.error('❌ Erreur parsing recettes:', error);
      throw new Error(`Erreur parsing réponse Mistral: ${error.message}`);
    }
  }

  /**
   * Construit le prompt optimisé pour la prise de masse
   */
  buildMassGainPrompt(profile) {
    return `Tu es un nutritionniste expert spécialisé dans la prise de masse musculaire. 

PROFIL UTILISATEUR:
- Objectif: ${profile.goal || 'prise de masse'}
- Niveau: ${profile.level || 'intermédiaire'}
- Poids: ${profile.weight || 75}kg
- Genre: ${profile.gender || 'homme'}
- Âge: ${profile.age || 25} ans

MISSION: Génère exactement 5 recettes nutritionnelles pour la prise de masse.

CRITÈRES OBLIGATOIRES:
- Minimum 500 calories par recette
- Minimum 25g de protéines par recette
- Équilibre nutritionnel optimal
- Ingrédients facilement disponibles
- Préparation simple (max 30 min)

FORMAT DE RÉPONSE OBLIGATOIRE (JSON valide uniquement):
\`\`\`json
[
  {
    "name": "Nom de la recette",
    "description": "Description courte et appétissante",
    "mealType": "petit-dejeuner|dejeuner|diner|collation",
    "calories": 650,
    "protein": 35,
    "carbs": 70,
    "fats": 18,
    "time": 15,
    "difficulty": "Facile|Moyen|Difficile",
    "servings": 1,
    "ingredients": [
      "100g de ingredient 1",
      "50g de ingredient 2"
    ],
    "instructions": [
      "Étape 1 détaillée",
      "Étape 2 détaillée"
    ],
    "tips": [
      "Conseil pratique 1",
      "Conseil pratique 2"
    ],
    "nutritionTips": "Conseils nutritionnels spécifiques"
  }
]
\`\`\`

IMPORTANT: Réponds UNIQUEMENT avec le JSON valide, aucun texte supplémentaire.`;
  }

  /**
   * Appel API Mistral avec retry et timeout
   */
  async callMistralAPI(prompt, retryCount = 0) {
    try {
      console.log(`🌐 Appel Mistral API (tentative ${retryCount + 1})...`);

      // Vérifier que l'API key est disponible
      if (!this.apiKey) {
        throw new Error('Clé API Mistral non configurée - ajoutez REACT_APP_MISTRAL_API_KEY à votre .env');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: 'json_object' } // Forcer le JSON
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorText = 'Erreur inconnue';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = `Status ${response.status}: ${response.statusText}`;
        }
        
        if (response.status === 401) {
          throw new Error('Clé API Mistral invalide - vérifiez votre configuration');
        } else if (response.status === 403) {
          throw new Error('Accès refusé à l\'API Mistral - vérifiez vos permissions');
        } else if (response.status === 429) {
          throw new Error('Limite de taux API Mistral atteinte - réessayez plus tard');
        } else {
          throw new Error(`Erreur API Mistral: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Réponse API Mistral invalide - structure inattendue');
      }

      const content = data.choices[0].message.content;
      if (!content) {
        throw new Error('Contenu vide dans la réponse Mistral');
      }

      return content;

    } catch (error) {
      console.error(`❌ Erreur appel Mistral (tentative ${retryCount + 1}):`, error);

      // Retry logic pour les erreurs réseau/temporaires uniquement
      if (retryCount < this.maxRetries && 
          !error.name === 'AbortError' && 
          !error.message.includes('401') && // Pas de retry pour erreur auth
          !error.message.includes('403') && // Pas de retry pour erreur permission
          !error.message.includes('Clé API')) {  // Pas de retry pour erreur config
        
        console.log(`🔄 Retry dans 2 secondes...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Délai croissant
        return this.callMistralAPI(prompt, retryCount + 1);
      }

      // Propager l'erreur après épuisement des tentatives
      throw error;
    }
  }

  /**
   * Vérification de la disponibilité du service
   */
  isAvailable() {
    return !!this.apiKey && !!this.baseURL;
  }

  /**
   * Test de connectivité simple
   */
  async testConnection() {
    try {
      if (!this.isAvailable()) {
        throw new Error('Service Mistral non configuré');
      }

      const testPrompt = 'Réponds simplement "test ok" en JSON: {"status": "test ok"}';
      const response = await this.callMistralAPI(testPrompt);
      
      console.log('✅ Test connexion Mistral réussi');
      return true;
    } catch (error) {
      console.error('❌ Test connexion Mistral échoué:', error);
      return false;
    }
  }

  /**
   * Génération de recettes avec profil utilisateur détaillé
   */
  async generatePersonalizedRecipes(userProfile) {
    try {
      console.log('🎯 Génération recettes personnalisées...', userProfile);
      
      // Construire un prompt plus détaillé avec le profil utilisateur
      const enhancedProfile = {
        goal: userProfile.goal || 'prise de masse',
        level: userProfile.level || 'intermédiaire',
        weight: userProfile.weight || 75,
        gender: userProfile.gender || 'homme',
        age: userProfile.age || 25,
        activityLevel: userProfile.activityLevel || 'modéré',
        preferences: userProfile.preferences || [],
        allergies: userProfile.allergies || [],
        targetCalories: userProfile.targetCalories || 2500
      };

      return this.generateMassGainRecipes(enhancedProfile);
    } catch (error) {
      console.error('❌ Erreur génération personnalisée:', error);
      throw error;
    }
  }

  /**
   * Génération de plan nutritionnel complet
   */
  async generateNutritionPlan(userProfile) {
    try {
      console.log('📋 Génération plan nutritionnel complet...');
      
      const planPrompt = `Tu es un nutritionniste expert. Crée un plan nutritionnel complet pour la prise de masse.

PROFIL UTILISATEUR:
- Poids: ${userProfile.weight || 75}kg
- Âge: ${userProfile.age || 25} ans
- Genre: ${userProfile.gender || 'homme'}
- Niveau: ${userProfile.level || 'intermédiaire'}

Génère un plan avec:
- 3 repas principaux + 2 collations
- Répartition calorique optimale
- Planning hebdomadaire

Réponds en JSON avec cette structure:
{
  "dailyCalories": 2800,
  "macros": {"protein": 140, "carbs": 350, "fats": 93},
  "meals": [
    {
      "type": "petit-dejeuner",
      "calories": 600,
      "recipes": ["nom recette 1", "nom recette 2"]
    }
  ],
  "schedule": {
    "lundi": ["petit-dejeuner", "collation", "dejeuner", "collation", "diner"],
    "mardi": ["petit-dejeuner", "collation", "dejeuner", "collation", "diner"]
  }
}`;

      const content = await this.callMistralAPI(planPrompt);
      return this.parseNutritionPlan(content);
    } catch (error) {
      console.error('❌ Erreur génération plan nutrition:', error);
      throw error;
    }
  }

  /**
   * Parse un plan nutritionnel
   */
  parseNutritionPlan(content) {
    try {
      const parsed = JSONParsingUtils.safeJSONParse(content, null);
      
      if (!parsed || !parsed.dailyCalories) {
        throw new Error('Plan nutritionnel invalide');
      }

      return parsed;
    } catch (error) {
      console.error('❌ Erreur parsing plan nutrition:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques d'utilisation
   */
  getUsageStats() {
    const stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0
    };

    try {
      const cached = localStorage.getItem('mistral_usage_stats');
      if (cached) {
        return { ...stats, ...JSON.parse(cached) };
      }
    } catch (error) {
      console.warn('Erreur lecture stats usage');
    }

    return stats;
  }

  /**
   * Mettre à jour les statistiques d'utilisation
   */
  updateUsageStats(isSuccess, responseTime) {
    try {
      const stats = this.getUsageStats();
      stats.totalCalls++;
      
      if (isSuccess) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
      }
      
      stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2;
      
      localStorage.setItem('mistral_usage_stats', JSON.stringify(stats));
    } catch (error) {
      console.warn('Erreur sauvegarde stats usage');
    }
  }
}

// Export de l'instance
export const mistralService = new MistralNutritionService();
export default mistralService;