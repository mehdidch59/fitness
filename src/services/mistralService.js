/**
 * Service simple pour Mistral AI (version démo)
 */

import { JSONParsingUtils } from '../utils/JSONParsingUtils';

class SimpleMistralService {
  constructor() {
    this.parsingStats = {
      directSuccessRate: 0,
      cleanedSuccessRate: 0,
      templateFallbackRate: 0,
      totalGenerations: 0
    };
  }

  async getMistralSDKClient() {
    const apiKey = process.env.REACT_APP_MISTRAL_API_KEY;
    if (!apiKey) return null;
    try {
      const mod = await import('@mistralai/mistralai');
      const ClientClass = mod?.default || mod?.MistralClient || mod?.Mistral;
      if (!ClientClass) return null;
      try {
        // Try both constructor shapes
        try { return new ClientClass({ apiKey }); } catch {}
        return new ClientClass(apiKey);
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  getParsingStats() {
    return { ...this.parsingStats };
  }

  updateParsingStats(method) {
    this.parsingStats.totalGenerations++;

    switch (method) {
      case 'direct':
        this.parsingStats.directSuccessRate++;
        break;
      case 'cleaned':
        this.parsingStats.cleanedSuccessRate++;
        break;
      case 'template':
        this.parsingStats.templateFallbackRate++;
        break;
      default:
        // no-op
        break;
    }
  }
  async generateWorkoutPrograms(userProfile, query = '') {
    // Simulation d'une génération de programmes d'entraînement
    console.log('🏋️ Génération programmes workout (mode démo):', userProfile.goal);

    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 600));

    // Mettre à jour les stats de parsing
    this.updateParsingStats('direct');

    return this.generateMockWorkoutPrograms(userProfile);
  }

  generateMockWorkoutPrograms(userProfile) {
    const now = Date.now();
    const loc = userProfile?.equipmentLocation || 'home';
    return [
      {
        id: `program_fullbody_${now}`,
        title: 'Programme FullBody (démo)',
        description: 'Plan démo — exercices laissés à la génération IA réelle',
        type: 'fullbody',
        level: 'intermédiaire',
        duration: '4-8 semaines',
        frequency: '3x/semaine',
        sessionDuration: '60 min',
        equipment: loc === 'home' ? 'Domicile' : 'Salle',
        workouts: [],
        schedule: ['Lundi', 'Mercredi', 'Vendredi'],
        tips: ['Échauffez-vous 10 min', 'Hydratez-vous'],
        aiGenerated: true
      }
    ];
  }

  async generateCustomContent(prompt, options = {}) {
    const model = process.env.REACT_APP_MISTRAL_MODEL || 'mistral-small';
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.2;
    const max_tokens = typeof options.max_tokens === 'number' ? options.max_tokens : 2048;
    const response_format = (() => {
      const rf = options?.response_format;
      if (!rf) return undefined;
      if (typeof rf === 'string') {
        return (rf.toLowerCase() === 'json' || rf.toLowerCase() === 'json_object')
          ? { type: 'json_object' }
          : undefined;
      } else if (typeof rf === 'object' && rf.type) {
        return rf;
      }
      return undefined;
    })();

    // 1) Essai SDK si dispo
    try {
      const client = await this.getMistralSDKClient();
      if (client) {
        // Essayer plusieurs signatures possibles selon versions du SDK
        try {
          if (client.chat?.complete) {
            const r = await client.chat.complete({ model, messages: [{ role: 'user', content: String(prompt) }], temperature, max_tokens, response_format });
            const content = r?.choices?.[0]?.message?.content || r?.output_text || r?.content || '';
            if (content) return content;
          } else if (client.chat) {
            const r = await client.chat({ model, messages: [{ role: 'user', content: String(prompt) }], temperature, max_tokens, response_format });
            const content = r?.choices?.[0]?.message?.content || r?.output_text || r?.content || '';
            if (content) return content;
          }
        } catch (e) {
          console.warn('⚠️ SDK Mistral indisponible/erreur, fallback fetch:', e?.message || e);
        }
      }
    } catch {}

    // 2) Fallback fetch
    try {
      const apiKey = process.env.REACT_APP_MISTRAL_API_KEY;
      if (!apiKey) throw new Error('Clé API Mistral absente (REACT_APP_MISTRAL_API_KEY non définie)');
      const baseURL = 'https://api.mistral.ai/v1/chat/completions';

      const body = { model, messages: [{ role: 'user', content: String(prompt) }], temperature, max_tokens };
      if (response_format) body.response_format = response_format;

      const res = await fetch(baseURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Erreur API Mistral: ${res.status} ${res.statusText} ${txt}`);
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Réponse Mistral invalide (content manquant)');
      return content;
    } catch (e) {
      // L'appel échoue, on laisse le consommateur gérer le fallback
      console.error('❌ generateCustomContent error:', e?.message || e);
    }
  }

  async generateVisionJSON(prompt, imageUrl, options = {}) {
    const model = process.env.REACT_APP_MISTRAL_VISION_MODEL || 'pixtral-12b';
    const temperature = typeof options.temperature === 'number' ? options.temperature : 0.2;
    const max_tokens = typeof options.max_tokens === 'number' ? options.max_tokens : 2048;
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: String(prompt) },
          { type: 'image_url', image_url: String(imageUrl) },
        ],
      },
    ];

    // 1) Essai SDK
    try {
      const client = await this.getMistralSDKClient();
      if (client) {
        try {
          if (client.chat?.complete) {
            const r = await client.chat.complete({ model, messages, temperature, max_tokens, response_format: { type: 'json_object' } });
            const content = r?.choices?.[0]?.message?.content || r?.output_text || r?.content || '';
            if (content) return content;
          } else if (client.chat) {
            const r = await client.chat({ model, messages, temperature, max_tokens, response_format: { type: 'json_object' } });
            const content = r?.choices?.[0]?.message?.content || r?.output_text || r?.content || '';
            if (content) return content;
          }
        } catch (e) {
          console.warn('⚠️ SDK Mistral Vision indisponible/erreur, fallback fetch:', e?.message || e);
        }
      }
    } catch {}

    // 2) Fallback fetch
    const apiKey = process.env.REACT_APP_MISTRAL_API_KEY;
    if (!apiKey) throw new Error('Clé API Mistral absente (REACT_APP_MISTRAL_API_KEY)');
    const baseURL = 'https://api.mistral.ai/v1/chat/completions';
    const body = { model, messages, temperature, max_tokens, response_format: { type: 'json_object' } };

    const res = await fetch(baseURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Erreur API Mistral (vision): ${res.status} ${res.statusText} ${txt}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Réponse Mistral vision invalide (content manquant)');
    return content;
  }

  async extractIngredientsFromImage(imageUrl) {
    const prompt = `Analyse l'image et renvoie UNIQUEMENT un JSON strict listant les ingrédients visibles du réfrigérateur.\n\nStructure: {\n  "ingredients": [ { "name": "string", "quantity": "string?", "confidence": 0.0-1.0, "freshness": 0-100 } ]\n}\n\nContraintes: noms simples (fr), quantité approximative si identifiable, fraîcheur estimée (0-100), pas de texte hors JSON.`;

    const content = await this.generateVisionJSON(prompt, imageUrl, { max_tokens: 1500 });
    const parsed = JSONParsingUtils.safeJSONParse(content, { ingredients: [] });
    const list = Array.isArray(parsed?.ingredients) ? parsed.ingredients : [];
    return list;
  }

  generateMockMealPlan() {
    return {
      planId: `plan_${Date.now()}`,
      title: 'Plan Nutritionnel Personnalisé',
      duration: 'weekly',
      days: [
        {
          date: new Date().toISOString().split('T')[0],
          dayOfWeek: 'lundi',
          meals: {
            breakfast: {
              name: 'Porridge aux Fruits',
              description: 'Petit-déjeuner énergisant',
              ingredients: [
                { name: 'avoine', quantity: '50g', unit: 'g' },
                { name: 'lait', quantity: '200ml', unit: 'ml' },
                { name: 'banane', quantity: '1', unit: 'pièce' }
              ],
              instructions: ['Cuire l\'avoine', 'Ajouter le lait', 'Garnir de banane'],
              prepTime: 10,
              cookTime: 5,
              nutrition: { calories: 320, protein: 12, carbs: 55, fat: 8 },
              difficulty: 'facile'
            },
            lunch: {
              name: 'Salade de Quinoa',
              description: 'Déjeuner équilibré',
              ingredients: [
                { name: 'quinoa', quantity: '80g', unit: 'g' },
                { name: 'légumes variés', quantity: '150g', unit: 'g' }
              ],
              instructions: ['Cuire le quinoa', 'Mélanger aux légumes'],
              prepTime: 15,
              cookTime: 15,
              nutrition: { calories: 380, protein: 15, carbs: 60, fat: 10 },
              difficulty: 'moyen'
            },
            dinner: {
              name: 'Saumon Grillé',
              description: 'Dîner riche en oméga-3',
              ingredients: [
                { name: 'saumon', quantity: '150g', unit: 'g' },
                { name: 'brocolis', quantity: '200g', unit: 'g' }
              ],
              instructions: ['Griller le saumon', 'Cuire les brocolis vapeur'],
              prepTime: 10,
              cookTime: 20,
              nutrition: { calories: 420, protein: 35, carbs: 15, fat: 25 },
              difficulty: 'moyen'
            },
            snack: {
              name: 'Yaourt aux Noix',
              description: 'Collation protéinée',
              ingredients: [
                { name: 'yaourt grec', quantity: '150g', unit: 'g' },
                { name: 'noix', quantity: '30g', unit: 'g' }
              ],
              instructions: ['Mélanger yaourt et noix'],
              prepTime: 2,
              cookTime: 0,
              nutrition: { calories: 200, protein: 15, carbs: 10, fat: 12 },
              difficulty: 'facile'
            }
          },
          dailyNutrition: { calories: 1320, protein: 77, carbs: 140, fat: 55 },
          dailyCost: 12.50,
          prepTimeTotal: 52
        }
      ],
      weeklyNutrition: { avgCalories: 1320, avgProtein: 77, avgCarbs: 140, avgFat: 55 },
      totalCost: 87.50,
      mealPrepAdvice: [
        'Préparez le quinoa en grande quantité',
        'Lavez les légumes à l\'avance'
      ]
    };
  }
}

export const mistralService = new SimpleMistralService();
export default mistralService;
