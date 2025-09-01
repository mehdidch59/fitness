/**
 * Service Scanner de Frigo - Analyse d'images et génération de recettes
 */

import { mistralService } from './mistralService';
// import { nutritionFirestoreService } from './nutritionFirestoreService'; // (réservé pour historique/analytics)
import { JSONParsingUtils } from '../utils/JSONParsingUtils';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

class FridgeScannerService {
  constructor() {
    this.detectionConfidence = 0.75;
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.ingredientDatabase = this.initIngredientDatabase();
  }

  /**
   * 📸 SCANNER PRINCIPAL - Photo → Ingrédients → Recettes
   */
  async scanFridgePhoto(imageFile, userId) {
    try {
      console.log('📸 Démarrage scan frigo...');

      // Conversion HEIC/HEIF si nécessaire avant validation
      let processedFile = await this.maybeConvertHeicToPng(imageFile);
      // Si conversion locale indisponible, tenter une conversion backend facultative
      if (processedFile === imageFile) {
        const name = String(imageFile.name || '').toLowerCase();
        const ext = name.split('.').pop() || '';
        const isHeic = ext === 'heic' || ext === 'heif' || /image\/(heic|heif)/i.test(String(imageFile.type));
        if (isHeic) {
          const blob = await this.backendConvertHeicToPng(imageFile);
          if (blob) {
            const newName = (name.replace(/\.(heic|heif)$/i, '') || 'photo') + '.png';
            try {
              processedFile = new File([blob], newName, { type: 'image/png' });
            } catch {
              blob.name = newName; // fallback pour environnements sans File
              processedFile = blob;
            }
          }
        }
      }

      // Validation du fichier
      this.validateImageFile(processedFile);

      // Upload vers Firebase Storage pour obtenir une URL partageable
      const uploadedUrl = await this.uploadImageToStorage(processedFile, userId);

      // Analyse IA (backend si dispo) — utilise l'URL si possible
      const detectedIngredients = await this.analyzeImageWithAI(processedFile, uploadedUrl);
      
      // Validation et enrichissement des ingrédients
      const validatedIngredients = this.validateAndEnrichIngredients(detectedIngredients);
      
      // Génération de recettes avec les ingrédients détectés
      const suggestedRecipes = await this.generateRecipesFromIngredients(
        validatedIngredients, 
        userId
      );
      
      // Analyse de fraîcheur et dates d'expiration
      const freshnessAnalysis = this.analyzeFreshness(validatedIngredients);
      
      return {
        scanId: this.generateScanId(),
        timestamp: new Date().toISOString(),
        detectedIngredients: validatedIngredients,
        suggestedRecipes: suggestedRecipes,
        freshnessAnalysis: freshnessAnalysis,
        uploadedUrl,
        shoppingSuggestions: this.generateShoppingSuggestions(validatedIngredients),
        wasteReduction: this.calculateWasteReduction(validatedIngredients),
        nextScanRecommendation: this.getNextScanRecommendation()
      };
      
    } catch (error) {
      console.error('❌ Erreur scan frigo:', error);
      return this.handleScanError(error);
    }
  }

  /**
   * Convertit HEIC/HEIF vers PNG si possible (heic2any), sinon retourne le fichier original
   */
  async maybeConvertHeicToPng(file) {
    try {
      if (!file) return file;
      const name = String(file.name || '').toLowerCase();
      const ext = name.split('.').pop() || '';
      const isHeic = ext === 'heic' || ext === 'heif' || /image\/(heic|heif)/i.test(String(file.type));
      if (!isHeic) return file;

      // Essayer import dynamique de heic2any si présent
      let heic2any;
      try {
        heic2any = (await import('heic2any')).default;
      } catch (e) {
        console.warn('⚠️ heic2any non disponible, tentative upload brut HEIC → fallbacks Vision/Backend');
        return file; // laisser la suite gérer via backend/vision et fallback si non supporté
      }

      const out = await heic2any({ blob: file, toType: 'image/png', quality: 0.9 });
      const blob = Array.isArray(out) ? out[0] : out;
      const newName = (name.replace(/\.(heic|heif)$/i, '') || 'photo') + '.png';
      try {
        return new File([blob], newName, { type: 'image/png' });
      } catch {
        // Environnements sans constructeur File
        blob.name = newName; // meilleure compat
        return blob;
      }
    } catch (e) {
      console.warn('⚠️ Conversion HEIC→PNG échouée, utilisation du fichier original:', e?.message || e);
      return file;
    }
  }

  /**
   * 🔍 Analyse d'image avec IA (simulation)
   */
  async analyzeImageWithAI(imageFile, imageUrl = null) {
    // D'abord, tenter un endpoint backend si disponible (évite d'exposer une clé côté client)
    try {
      // Priorité: Mistral Vision si une URL publique est disponible
      if (imageUrl) {
        try {
          const ing = await mistralService.extractIngredientsFromImage(imageUrl);
          if (Array.isArray(ing) && ing.length > 0) {
            return ing.map(x => ({
              name: x.name,
              confidence: Number(x.confidence || 0.9),
              quantity: x.quantity || '',
              location: x.location || 'unknown',
              freshness: typeof x.freshness === 'number' ? x.freshness : 75
            })).filter(item => item.confidence >= this.detectionConfidence);
          }
        } catch (e) {
          console.warn('⚠️ Vision Mistral indisponible, tentative backend:', e?.message || e);
        }
      }

      const apiBase = process.env.REACT_APP_API_URL;
      if (apiBase) {
        const payload = imageUrl
          ? { imageUrl }
          : { imageBase64: await this.fileToBase64(imageFile) };
        const res = await fetch(`${apiBase.replace(/\/$/, '')}/vision/ingredients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
            return data.ingredients.map(x => ({
              name: x.name,
              confidence: Number(x.confidence || 0.9),
              quantity: x.quantity || '',
              location: x.location || 'unknown',
              freshness: typeof x.freshness === 'number' ? x.freshness : 75
            })).filter(item => item.confidence >= this.detectionConfidence);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ Vision backend indisponible, fallback local:', e?.message || e);
    }

    // Sinon: Simulation locale (fallback)
    console.log('🤖 Analyse IA simulée de l\'image (fallback)...');
    await this.simulateProcessingTime(1200);
    const simulatedDetections = [
      { name: 'œufs', confidence: 0.95, quantity: '6', location: 'shelf_1', freshness: 85 },
      { name: 'lait', confidence: 0.92, quantity: '1L', location: 'door', freshness: 70 },
      { name: 'tomates', confidence: 0.88, quantity: '4', location: 'drawer', freshness: 90 },
      { name: 'épinards', confidence: 0.85, quantity: '200g', location: 'drawer', freshness: 60 },
      { name: 'fromage râpé', confidence: 0.90, quantity: '150g', location: 'shelf_2', freshness: 95 },
      { name: 'yaourt nature', confidence: 0.87, quantity: '4 pots', location: 'shelf_1', freshness: 80 },
      { name: 'carottes', confidence: 0.83, quantity: '6', location: 'drawer', freshness: 85 },
      { name: 'pommes', confidence: 0.91, quantity: '5', location: 'drawer', freshness: 90 }
    ];
    return simulatedDetections.filter(item => item.confidence >= this.detectionConfidence);
  }

  async uploadImageToStorage(file, userId) {
    try {
      const safeName = String(file.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `fridge_scans/${userId || 'anonymous'}/${Date.now()}_${safeName}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
      const url = await getDownloadURL(ref);
      return url;
    } catch (e) {
      console.warn('⚠️ Upload Storage échoué, analyse locale sans URL:', e?.message || e);
      return null;
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Conversion HEIC/HEIF côté backend (optionnelle)
   */
  async backendConvertHeicToPng(file) {
    try {
      const apiBase = process.env.REACT_APP_API_URL;
      if (!apiBase) return null;
      const url = `${apiBase.replace(/\/$/, '')}/vision/convert`;
      const form = new FormData();
      form.append('file', file, file.name || 'image.heic');
      form.append('to', 'image/png');
      const res = await fetch(url, { method: 'POST', body: form });
      if (!res.ok) return null;
      // Supporte réponse Blob directe PNG, sinon JSON { imageUrl | base64 }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if (data?.imageUrl) {
          const pngRes = await fetch(String(data.imageUrl));
          if (!pngRes.ok) return null;
          return await pngRes.blob();
        }
        if (data?.base64) {
          const b64 = String(data.base64).replace(/^data:[^,]+,/, '');
          const bin = atob(b64);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          return new Blob([arr], { type: 'image/png' });
        }
        return null;
      }
      return await res.blob();
    } catch (e) {
      console.warn('⚠️ backendConvertHeicToPng échec:', e?.message || e);
      return null;
    }
  }

  /**
   * ✅ Validation et enrichissement des ingrédients détectés
   */
  validateAndEnrichIngredients(detectedIngredients) {
    return detectedIngredients.map(ingredient => {
      const dbMatch = this.findInDatabase(ingredient.name);
      
      return {
        ...ingredient,
        id: this.generateIngredientId(),
        category: dbMatch?.category || 'unknown',
        nutritionPer100g: dbMatch?.nutrition || {},
        shelfLife: dbMatch?.shelfLife || 7,
        storageInstructions: dbMatch?.storage || 'Conserver au frais',
        estimatedExpiry: this.calculateExpiryDate(ingredient, dbMatch),
        usageIdeas: dbMatch?.usageIdeas || [],
        verified: true
      };
    });
  }

  /**
   * 🍳 Génération de recettes avec ingrédients disponibles
   */
  async generateRecipesFromIngredients(ingredients, userId) {
    try {
      const ingredientNames = ingredients.map(ing => ing.name).join(', ');
      
      const prompt = `Tu es un chef expert. Génère 4 recettes créatives et nutritives utilisant PRIORITAIREMENT ces ingrédients disponibles:

INGRÉDIENTS DISPONIBLES: ${ingredientNames}

CONTRAINTES:
- Utiliser au MAXIMUM les ingrédients disponibles (objectif: 80%+ des ingrédients de la recette)
- Minimiser les ingrédients supplémentaires à acheter
- Tenir compte de la fraîcheur (utiliser d'abord ce qui va expirer)
- Recettes variées: petit-déj, déjeuner, dîner, collation
- Temps de préparation réaliste (15-45 min)
- Instructions claires et détaillées

Format JSON:
[{
  "name": "Nom créatif de la recette",
  "description": "Description appétissante",
  "category": "breakfast/lunch/dinner/snack",
  "cookTime": number (minutes),
  "difficulty": "facile/moyen/difficile",
  "servings": number,
  "ingredients": [
    {
      "name": "ingrédient",
      "quantity": "quantité précise",
      "unit": "unité",
      "available": true/false,
      "substitute": "alternative si pas disponible"
    }
  ],
  "instructions": ["étape détaillée 1", "étape 2", ...],
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number
  },
  "fridgeUsage": number, // % ingrédients du frigo utilisés
  "additionalIngredients": ["ingrédients à acheter"],
  "tips": ["astuce 1", "astuce 2"],
  "variations": ["variante 1", "variante 2"]
}]`;

      // Demander explicitement un JSON strict côté Mistral
      const content = await mistralService.generateCustomContent(prompt, { response_format: 'json' });

      // Parser les recettes générées (préserver le champ nested "nutrition" attendu côté UI)
      const parsed = JSONParsingUtils.safeJSONParse(String(content || ''), []);

      let recipes = [];
      if (Array.isArray(parsed)) {
        recipes = parsed;
      } else if (parsed && Array.isArray(parsed.recipes)) {
        recipes = parsed.recipes;
      } else if (parsed && typeof parsed === 'object' && parsed.name) {
        recipes = [parsed];
      }

      // Assurer la présence de nutrition{} si les macros sont au niveau racine
      recipes = recipes.map(r => {
        const nutrition = r.nutrition || {
          calories: r.calories ?? undefined,
          protein: r.protein ?? undefined,
          carbs: r.carbs ?? undefined,
          fat: r.fat ?? r.fats ?? undefined
        };
        return {
          ...r,
          nutrition,
        };
      });

      // Enrichir les recettes avec des données calculées
      return this.enrichGeneratedRecipes(recipes, ingredients);
      
    } catch (error) {
      console.error('❌ Erreur génération recettes:', error);
      return this.getFallbackRecipes(ingredients);
    }
  }

  /**
   * 🍃 Analyse de fraîcheur
   */
  analyzeFreshness(ingredients) {
    const analysis = {
      overall: 'good',
      urgentItems: [],
      freshItems: [],
      recommendations: []
    };

    ingredients.forEach(ingredient => {
      if (ingredient.freshness <= 40) {
        analysis.urgentItems.push({
          ...ingredient,
          urgency: 'high',
          recommendation: `Utiliser ${ingredient.name} dans les 24h`
        });
      } else if (ingredient.freshness >= 85) {
        analysis.freshItems.push(ingredient);
      }
    });

    // Déterminer l'état général
    const avgFreshness = ingredients.reduce((sum, ing) => sum + ing.freshness, 0) / ingredients.length;
    
    if (avgFreshness >= 80) analysis.overall = 'excellent';
    else if (avgFreshness >= 60) analysis.overall = 'good';
    else if (avgFreshness >= 40) analysis.overall = 'moderate';
    else analysis.overall = 'poor';

    // Générer recommandations
    if (analysis.urgentItems.length > 0) {
      analysis.recommendations.push('Priorisez les ingrédients qui expirent bientôt');
    }
    
    if (analysis.freshItems.length >= 5) {
      analysis.recommendations.push('Excellent ! Votre frigo contient beaucoup d\'ingrédients frais');
    }

    return analysis;
  }

  /**
   * 🛒 Suggestions de shopping complémentaire
   */
  generateShoppingSuggestions(ingredients) {
    const suggestions = {
      complements: [],
      seasonalAdditions: [],
      nutritionGaps: [],
      budgetOptions: []
    };

    // Analyser les catégories manquantes
    const categories = ingredients.map(ing => ing.category);
    
    if (!categories.includes('protein')) {
      suggestions.complements.push({
        item: 'Protéines (poulet, poisson, légumineuses)',
        reason: 'Aucune source de protéine détectée',
        priority: 'high'
      });
    }

    if (!categories.includes('grain')) {
      suggestions.complements.push({
        item: 'Féculents (riz, pâtes, quinoa)',
        reason: 'Manque de glucides complexes',
        priority: 'medium'
      });
    }

    // Suggestions saisonnières
    const season = this.getCurrentSeason();
    const seasonalIngredients = this.getSeasonalIngredients(season);
    
    suggestions.seasonalAdditions = seasonalIngredients.slice(0, 3).map(item => ({
      item: item,
      reason: `Ingrédient de saison (${season})`,
      benefit: 'Fraîcheur et prix optimal'
    }));

    return suggestions;
  }

  /**
   * ♻️ Calcul de réduction du gaspillage
   */
  calculateWasteReduction(ingredients) {
    const totalValue = ingredients.reduce((sum, ing) => sum + this.estimateIngredientValue(ing), 0);
    const urgentItems = ingredients.filter(ing => ing.freshness <= 40);
    const savedValue = urgentItems.reduce((sum, ing) => sum + this.estimateIngredientValue(ing), 0);

    return {
      totalIngredients: ingredients.length,
      itemsAtRisk: urgentItems.length,
      estimatedValue: totalValue,
      potentialSavings: savedValue,
      environmentalImpact: {
        co2Saved: savedValue * 2.1, // kg CO2 équivalent
        wasteReduced: urgentItems.length * 0.3 // kg
      },
      recommendations: urgentItems.length > 0 
        ? [`Utilisez en priorité: ${urgentItems.map(i => i.name).join(', ')}`]
        : ['Excellente gestion ! Pas de gaspillage détecté.']
    };
  }

  // === MÉTHODES UTILITAIRES ===

  validateImageFile(file) {
    if (!file) throw new Error('Aucun fichier image fourni');
    if (file.size > this.maxFileSize) throw new Error('Fichier trop volumineux (max 10MB)');
    
    const extension = file.name.split('.').pop().toLowerCase();
    if (!this.supportedFormats.includes(extension)) {
      throw new Error(`Format non supporté. Utilisez: ${this.supportedFormats.join(', ')}`);
    }
  }

  async simulateProcessingTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateScanId() {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateIngredientId() {
    return `ing_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  findInDatabase(ingredientName) {
    const normalizedName = ingredientName.toLowerCase();
    return this.ingredientDatabase.find(item => 
      item.names.some(name => normalizedName.includes(name))
    );
  }

  calculateExpiryDate(ingredient, dbMatch) {
    const baseShelfLife = dbMatch?.shelfLife || 7;
    const freshnessAdjustment = (ingredient.freshness / 100) * baseShelfLife;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Math.floor(freshnessAdjustment));
    
    return expiryDate.toISOString().split('T')[0];
  }

  estimateIngredientValue(ingredient) {
    // Estimation basée sur prix moyens français
    const priceMap = {
      'œufs': 0.25 * 6,
      'lait': 1.20,
      'tomates': 0.30 * 4,
      'fromage': 0.80,
      'yaourt': 0.60 * 4,
      'carottes': 0.15 * 6,
      'pommes': 0.35 * 5
    };
    
    return priceMap[ingredient.name] || 2.00;
  }

  enrichGeneratedRecipes(recipes, availableIngredients) {
    if (!recipes || !Array.isArray(recipes)) return this.getFallbackRecipes(availableIngredients);
    
    return recipes.map(recipe => ({
      ...recipe,
      scanId: this.generateScanId(),
      generatedAt: new Date().toISOString(),
      availabilityScore: this.calculateAvailabilityScore(recipe, availableIngredients),
      estimatedCost: this.estimateRecipeCost(recipe),
      wasteReductionScore: this.calculateWasteReductionScore(recipe, availableIngredients)
    }));
  }

  calculateAvailabilityScore(recipe, availableIngredients) {
    if (!recipe.ingredients) return 0;
    
    const availableNames = availableIngredients.map(ing => ing.name.toLowerCase());
    const recipeIngredients = recipe.ingredients.length;
    const availableCount = recipe.ingredients.filter(ing => 
      availableNames.some(available => ing.name.toLowerCase().includes(available))
    ).length;
    
    return Math.round((availableCount / recipeIngredients) * 100);
  }

  estimateRecipeCost(recipe) {
    // Estimation simple basée sur le nombre d'ingrédients et leur type
    const baseCost = recipe.ingredients?.length * 1.5 || 5;
    return Math.round(baseCost * 100) / 100;
  }

  calculateWasteReductionScore(recipe, availableIngredients) {
    const urgentIngredients = availableIngredients.filter(ing => ing.freshness <= 50);
    const usedUrgent = recipe.ingredients?.filter(recipeIng =>
      urgentIngredients.some(urgent => 
        recipeIng.name.toLowerCase().includes(urgent.name.toLowerCase())
      )
    ).length || 0;
    
    return urgentIngredients.length > 0 ? Math.round((usedUrgent / urgentIngredients.length) * 100) : 0;
  }

  getFallbackRecipes(ingredients) {
    return [{
      name: 'Recette du frigo surprise',
      description: 'Une recette simple avec vos ingrédients disponibles',
      category: 'lunch',
      cookTime: 20,
      difficulty: 'facile',
      servings: 2,
      ingredients: ingredients.slice(0, 4).map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        available: true
      })),
      instructions: [
        'Préparer tous les ingrédients',
        'Mélanger selon votre inspiration',
        'Cuire selon les besoins',
        'Assaisonner et servir'
      ],
      nutrition: { calories: 350, protein: 15, carbs: 30, fat: 12 },
      fridgeUsage: 100,
      tips: ['Adaptez selon vos goûts', 'N\'hésitez pas à expérimenter']
    }];
  }

  getCurrentSeason() {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'printemps';
    if (month >= 5 && month <= 7) return 'été';
    if (month >= 8 && month <= 10) return 'automne';
    return 'hiver';
  }

  getSeasonalIngredients(season) {
    const seasonal = {
      printemps: ['asperges', 'radis', 'petits pois', 'fraises'],
      été: ['tomates', 'courgettes', 'pêches', 'basilic'],
      automne: ['potiron', 'champignons', 'pommes', 'châtaignes'],
      hiver: ['poireaux', 'choux', 'oranges', 'endives']
    };
    return seasonal[season] || [];
  }

  initIngredientDatabase() {
    return [
      {
        names: ['œuf', 'oeufs'],
        category: 'protein',
        shelfLife: 21,
        storage: 'Réfrigérateur',
        nutrition: { protein: 13, fat: 11, carbs: 1, calories: 155 },
        usageIdeas: ['omelette', 'œuf dur', 'pâtisserie']
      },
      {
        names: ['lait'],
        category: 'dairy',
        shelfLife: 7,
        storage: 'Réfrigérateur',
        nutrition: { protein: 3.4, fat: 3.6, carbs: 5, calories: 64 },
        usageIdeas: ['céréales', 'smoothie', 'sauce']
      },
      {
        names: ['tomate', 'tomates'],
        category: 'vegetable',
        shelfLife: 7,
        storage: 'Température ambiante puis frigo',
        nutrition: { protein: 0.9, fat: 0.2, carbs: 3.9, calories: 18 },
        usageIdeas: ['salade', 'sauce', 'gratin']
      }
      // ... plus d'ingrédients
    ];
  }

  handleScanError(error) {
    return {
      success: false,
      error: error.message,
      fallbackSuggestions: [
        'Vérifiez la qualité de la photo',
        'Assurez-vous que les ingrédients sont bien visibles',
        'Essayez une photo avec un meilleur éclairage'
      ],
      retryRecommendation: 'Vous pouvez réessayer avec une nouvelle photo'
    };
  }

  getNextScanRecommendation() {
    return {
      suggestedFrequency: 'Scannez votre frigo 2-3 fois par semaine',
      bestTimes: ['Après les courses', 'Avant de planifier vos repas', 'Quand vous manquez d\'inspiration'],
      tips: [
        'Organisez votre frigo pour de meilleurs résultats',
        'Gardez les étiquettes visibles',
        'Retirez les emballages opaques si possible'
      ]
    };
  }
}

export const fridgeScannerService = new FridgeScannerService();
export default fridgeScannerService;
