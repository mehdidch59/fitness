/**
 * Utilitaires avancés pour le parsing JSON robuste - Service Mistral Nutrition
 */

export class JSONParsingUtils {
  /**
   * Supprime les caractères de contrôle (0x00-0x1F et 0x7F-0x9F)
   */
  static removeControlChars(str) {
    if (!str || typeof str !== 'string') return '';
    let out = '';
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Exclure 0x00-0x1F et 0x7F-0x9F
      if (code >= 0x20 && (code < 0x7f || code > 0x9f)) {
        out += str[i];
      }
    }
    return out;
  }
  /**
   * Nettoie le texte avant parsing JSON
   */
  static cleanJSONString(text) {
    if (!text || typeof text !== 'string') return '';
    
    return JSONParsingUtils.removeControlChars(text)
      // Supprimer les caractères de contrôle
      // Supprimer les échappements invalides
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '')
      // Corriger les guillemets mal échappés
      .replace(/([^\\])"/g, '$1\\"')
      .replace(/^"/, '\\"')
      // Supprimer les virgules en fin d'objet/array
      .replace(/,(\s*[}\]])/g, '$1')
      // Corriger les sauts de ligne dans les chaînes
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
  /**
   * Extrait le JSON du texte de réponse Mistral
   */
  static extractJSON(text) {
    if (!text) return null;

    // Nettoyer le texte d'abord
    text = text.trim();

    // Patterns de recherche pour différents formats (ordre important)
    const patterns = [
      // JSON complet entre ```json et ```
      /```json\s*([\s\S]*?)\s*```/i,
      // JSON complet entre ``` et ```
      /```\s*([\s\S]*?)\s*```/,
      // JSON array complet
      /(\[[\s\S]*?\])/,
      // JSON object complet
      /(\{[\s\S]*?\})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (extracted.length > 0) {
          return extracted;
        }
      }
    }

    // Si aucun pattern ne matche, retourner le texte nettoyé
    if (text.startsWith('{') || text.startsWith('[')) {
      return text;
    }

    return null;
  }
  /**
   * Parse JSON avec fallback et validation
   */
  static safeJSONParse(text, defaultValue = null) {
    if (!text || typeof text !== 'string') {
      console.warn('🔄 Texte invalide pour parsing JSON');
      return defaultValue;
    }

    try {
      const extracted = this.extractJSON(text);
      if (!extracted) {
        console.warn('🔄 Aucun JSON extrait du texte');
        return defaultValue;
      }

      const parsed = JSON.parse(extracted);
      return this.validateJSONStructure(parsed) ? parsed : defaultValue;
    } catch (error) {
      console.warn('🔄 Tentative de réparation JSON:', error.message);
      return this.repairAndParse(text, defaultValue);
    }
  }
  /**
   * Tente de réparer le JSON cassé
   */
  static repairAndParse(text, defaultValue = null) {
    try {
      let repaired = this.extractJSON(text);
      if (!repaired) return defaultValue;

      // Réparations communes étape par étape
      repaired = JSONParsingUtils.removeControlChars(repaired)
        // Corriger les guillemets droits/courbes
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Ajouter virgules manquantes entre objets
        .replace(/}\s*{/g, '}, {')
        .replace(/]\s*\[/g, '], [')
        // Corriger les propriétés sans guillemets (mais pas dans les valeurs)
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        // Supprimer virgules en trop avant } ou ]
        .replace(/,(\s*[}\]])/g, '$1')
        // Supprimer virgules multiples
        .replace(/,+/g, ',')
        // Corriger les retours à la ligne dans les strings
        .replace(/"\s*\n\s*"/g, '", "')
        // S'assurer que les strings sont bien fermées
        .replace(/:\s*([^",[\]{}]+)(?=\s*[,}])/g, ': "$1"')
        .trim();

      // Vérifier que ça commence et finit correctement
      if (!repaired.match(/^[[{]/) || !repaired.match(/[}\]]$/)) {
        console.warn('JSON ne commence/finit pas correctement');
        return defaultValue;
      }

      console.log('🔧 JSON réparé:', repaired.substring(0, 200) + '...');
      const parsed = JSON.parse(repaired);
      return this.validateJSONStructure(parsed) ? parsed : defaultValue;
    } catch (error) {
      console.error('❌ Impossible de réparer le JSON:', error.message);
      console.log('📝 Texte problématique:', text?.substring(0, 500) + '...');
      return defaultValue;
    }
  }

  /**
   * Valide la structure JSON pour les recettes
   */
  static validateJSONStructure(data) {
    if (!data) return false;

    // Si c'est un array de recettes
    if (Array.isArray(data)) {
      return data.every(item => this.validateRecipeStructure(item));
    }

    // Si c'est un objet contenant des recettes
    if (typeof data === 'object') {
      // Vérifier si c'est une recette unique
      if (this.validateRecipeStructure(data)) {
        return true;
      }

      // Vérifier si c'est un objet avec une propriété recipes
      if (data.recipes && Array.isArray(data.recipes)) {
        return data.recipes.every(item => this.validateRecipeStructure(item));
      }
    }

    return false;
  }

  /**
   * Valide la structure d'une recette individuelle
   */
  static validateRecipeStructure(recipe) {
    if (!recipe || typeof recipe !== 'object') return false;

    const requiredFields = ['name'];
    const optionalFields = [
      'description', 'ingredients', 'instructions', 'calories', 
      'protein', 'carbs', 'fats', 'time', 'difficulty', 'mealType'
    ];

    // Vérifier les champs obligatoires
    const hasRequired = requiredFields.every(field => 
      recipe.hasOwnProperty(field) && recipe[field]
    );

    // Vérifier qu'au moins quelques champs optionnels sont présents
    const hasOptional = optionalFields.some(field => 
      recipe.hasOwnProperty(field) && recipe[field]
    );

    return hasRequired && hasOptional;
  }

  /**
   * Normalise les recettes après parsing
   */
  static normalizeRecipes(data) {
    if (!data) return [];

    let recipes = [];

    // Extraire les recettes selon le format
    if (Array.isArray(data)) {
      recipes = data;
    } else if (data.recipes && Array.isArray(data.recipes)) {
      recipes = data.recipes;
    } else if (this.validateRecipeStructure(data)) {
      recipes = [data];
    }

    // Normaliser chaque recette
    return recipes.map(recipe => this.normalizeRecipe(recipe)).filter(Boolean);
  }

  /**
   * Normalise une recette individuelle
   */
  static normalizeRecipe(recipe) {
    if (!this.validateRecipeStructure(recipe)) return null;

    return {
      // Champs obligatoires
      name: String(recipe.name || '').trim(),
      
      // Champs textuels
      description: String(recipe.description || '').trim(),
      mealType: String(recipe.mealType || 'collation').toLowerCase(),
      difficulty: String(recipe.difficulty || 'Facile'),
      
      // Valeurs nutritionnelles (assurer que ce sont des nombres)
      calories: this.parseNumber(recipe.calories, 0),
      protein: this.parseNumber(recipe.protein, 0),
      carbs: this.parseNumber(recipe.carbs, 0),
      fats: this.parseNumber(recipe.fats, 0),
      
      // Autres valeurs numériques
      time: this.parseNumber(recipe.time, 15),
      servings: this.parseNumber(recipe.servings, 1),
      
      // Arrays
      ingredients: this.normalizeArray(recipe.ingredients),
      instructions: this.normalizeArray(recipe.instructions),
      tips: this.normalizeArray(recipe.tips),
      tags: this.normalizeArray(recipe.tags),
      
      // Métadonnées
      source: 'IA Nutritionnelle',
      aiGenerated: true,
      massGainScore: this.parseNumber(recipe.massGainScore, 0)
    };
  }

  /**
   * Parse un nombre de manière sécurisée
   */
  static parseNumber(value, defaultValue = 0) {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
      return !isNaN(parsed) ? parsed : defaultValue;
    }
    return defaultValue;
  }
  /**
   * Normalise un array de manière sécurisée
   */
  static normalizeArray(value) {
    if (Array.isArray(value)) {
      return value.map(item => {
        // Si c'est un objet ingrédient, le conserver tel quel
        if (typeof item === 'object' && item !== null) {
          return item;
        }
        // Sinon, s'assurer que c'est une chaîne valide
        const stringValue = String(item || '').trim();
        return stringValue && stringValue !== 'Ingrédient' ? stringValue : null;
      }).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      // Tenter de parser comme JSON array
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.map(item => {
            if (typeof item === 'object' && item !== null) {
              return item;
            }
            const stringValue = String(item || '').trim();
            return stringValue && stringValue !== 'Ingrédient' ? stringValue : null;
          }).filter(Boolean);
        }
      } catch (e) {
        // Si ce n'est pas du JSON, splitter par ligne ou virgule
        return value.split(/[,\n]/)
          .map(item => item.trim())
          .filter(item => item && item !== 'Ingrédient');
      }
    }
    return [];
  }
}

// Export par défaut
export default JSONParsingUtils;
