/**
 * Service simple pour Mistral AI (version démo)
 */

class SimpleMistralService {
  constructor() {
    this.parsingStats = {
      directSuccessRate: 0,
      cleanedSuccessRate: 0,
      templateFallbackRate: 0,
      totalGenerations: 0
    };
  }

  getParsingStats() {
    return { ...this.parsingStats };
  }

  updateParsingStats(method) {
    this.parsingStats.totalGenerations++;
    
    switch(method) {
      case 'direct':
        this.parsingStats.directSuccessRate++;
        break;
      case 'cleaned':
        this.parsingStats.cleanedSuccessRate++;
        break;
      case 'template':
        this.parsingStats.templateFallbackRate++;
        break;
    }
  }
  async generateWorkoutPrograms(userProfile, query = '') {
    // Simulation d'une génération de programmes d'entraînement
    console.log('🏋️ Génération programmes workout (mode démo):', userProfile.goal);
    
    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mettre à jour les stats de parsing
    this.updateParsingStats('direct');
    
    return this.generateMockWorkoutPrograms(userProfile);
  }

  generateMockWorkoutPrograms(userProfile) {
    const programs = [
      {
        id: `program_fullbody_${Date.now()}`,
        title: 'Programme FullBody Débutant',
        description: 'Programme complet pour travailler tous les muscles',
        type: 'fullbody',
        level: 'débutant',
        duration: '4 semaines',
        frequency: '3x/semaine',
        sessionDuration: '45 min',
        equipment: userProfile.equipmentLocation === 'home' ? 'Poids du corps' : 'Salle complète',
        workouts: [
          {
            name: 'Séance FullBody A',
            day: 'Lundi',
            duration: '45 min',
            exercises: [
              {
                name: 'Squats',
                sets: '3',
                reps: '12-15',
                rest: '60s',
                type: 'compound',
                targetMuscles: ['quadriceps', 'fessiers'],
                instructions: 'Descendez jusqu\'à ce que vos cuisses soient parallèles au sol'
              },
              {
                name: 'Pompes',
                sets: '3',
                reps: '8-12',
                rest: '60s',
                type: 'compound',
                targetMuscles: ['pectoraux', 'triceps', 'épaules'],
                instructions: 'Gardez le corps droit, descendez jusqu\'à frôler le sol'
              },
              {
                name: 'Planche',
                sets: '3',
                reps: '30-60s',
                rest: '60s',
                type: 'core',
                targetMuscles: ['abdominaux', 'core'],
                instructions: 'Maintenez la position sans creuser le dos'
              }
            ]
          }
        ],
        schedule: ['Lundi', 'Mercredi', 'Vendredi'],
        tips: [
          'Échauffez-vous 10 minutes avant chaque séance',
          'Hydratez-vous régulièrement',
          'Respectez les temps de repos'
        ],
        aiGenerated: true
      },
      {
        id: `program_halfbody_${Date.now()}`,
        title: 'Programme HalfBody Intermédiaire',
        description: 'Alternance haut/bas du corps pour plus d\'intensité',
        type: 'halfbody',
        level: 'intermédiaire',
        duration: '6 semaines',
        frequency: '4x/semaine',
        sessionDuration: '60 min',
        equipment: userProfile.equipmentLocation === 'home' ? 'Haltères' : 'Salle complète',
        workouts: [
          {
            name: 'Haut du corps',
            day: 'Mardi',
            duration: '60 min',
            exercises: [
              {
                name: 'Développé couché',
                sets: '4',
                reps: '8-10',
                rest: '90s',
                type: 'compound',
                targetMuscles: ['pectoraux', 'triceps', 'épaules'],
                instructions: 'Contrôlez la descente, poussez explosif'
              }
            ]
          },
          {
            name: 'Bas du corps',
            day: 'Jeudi',
            duration: '60 min',
            exercises: [
              {
                name: 'Squats avec poids',
                sets: '4',
                reps: '10-12',
                rest: '90s',
                type: 'compound',
                targetMuscles: ['quadriceps', 'fessiers'],
                instructions: 'Ajoutez du poids progressivement'
              }
            ]
          }
        ],
        schedule: ['Mardi', 'Jeudi', 'Samedi', 'Dimanche'],
        tips: [
          'Augmentez progressivement les charges',
          'Alternez les groupes musculaires',
          'Prévoyez 48h de récupération'
        ],
        aiGenerated: true
      },
      {
        id: `program_split_${Date.now()}`,
        title: 'Programme Split Avancé',
        description: 'Spécialisation par groupe musculaire',
        type: 'split',
        level: 'avancé',
        duration: '8 semaines',
        frequency: '5x/semaine',
        sessionDuration: '75 min',
        equipment: 'Salle complète',
        workouts: [
          {
            name: 'Pectoraux / Triceps',
            day: 'Lundi',
            duration: '75 min',
            exercises: [
              {
                name: 'Développé incliné',
                sets: '4',
                reps: '6-8',
                rest: '2-3 min',
                type: 'compound',
                targetMuscles: ['pectoraux supérieurs'],
                instructions: 'Focus sur la partie haute des pectoraux'
              }
            ]
          }
        ],
        schedule: ['Lundi', 'Mardi', 'Jeudi', 'Vendredi', 'Samedi'],
        tips: [
          'Technique parfaite avant tout',
          'Variez les angles de travail',
          'Écoutez votre corps'
        ],
        aiGenerated: true
      }
    ];

    return programs;
  }

  async generateCustomContent(prompt) {
    // Simulation d'une réponse IA pour la démo
    console.log('🤖 Génération contenu IA (mode démo):', prompt.substring(0, 100) + '...');
    
    // Simuler un délai de traitement
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (prompt.includes('recettes')) {
      return this.generateMockRecipes();
    }
    
    if (prompt.includes('plan de repas')) {
      return this.generateMockMealPlan();
    }
    
    return {
      response: 'Contenu généré par l\'IA (mode démo)',
      timestamp: new Date().toISOString()
    };
  }

  generateMockRecipes() {
    return [
      {
        name: 'Salade Méditerranéenne Express',
        description: 'Une salade fraîche et nutritive',
        category: 'lunch',
        cookTime: 15,
        difficulty: 'facile',
        servings: 2,
        ingredients: [
          { name: 'tomates', quantity: '2', unit: 'pièces', available: true },
          { name: 'concombre', quantity: '1', unit: 'pièce', available: false },
          { name: 'fromage feta', quantity: '100', unit: 'g', available: true },
          { name: 'huile d\'olive', quantity: '2', unit: 'cuillères', available: true }
        ],
        instructions: [
          'Couper les tomates en dés',
          'Émincer le concombre',
          'Mélanger avec la feta émiettée',
          'Assaisonner avec l\'huile d\'olive'
        ],
        nutrition: { calories: 180, protein: 8, carbs: 12, fat: 12 },
        fridgeUsage: 75,
        tips: ['Ajouter des herbes fraîches', 'Servir frais']
      },
      {
        name: 'Omelette aux Épinards',
        description: 'Riche en protéines et fer',
        category: 'breakfast',
        cookTime: 10,
        difficulty: 'facile',
        servings: 1,
        ingredients: [
          { name: 'œufs', quantity: '3', unit: 'pièces', available: true },
          { name: 'épinards', quantity: '100', unit: 'g', available: true },
          { name: 'fromage râpé', quantity: '30', unit: 'g', available: true }
        ],
        instructions: [
          'Battre les œufs',
          'Faire revenir les épinards',
          'Verser les œufs et ajouter le fromage',
          'Plier l\'omelette et servir'
        ],
        nutrition: { calories: 280, protein: 22, carbs: 4, fat: 20 },
        fridgeUsage: 100,
        tips: ['Cuire à feu moyen', 'Ne pas trop cuire']
      }
    ];
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