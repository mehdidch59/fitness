/**
 * Service Mistral AI ULTRA-ROBUSTE avec programmes d'entraînement réalistes
 * Génère des programmes fullbody, halfbody et split avec structures réelles
 */

import { Mistral } from '@mistralai/mistralai';

class MistralService {
  constructor() {
    this.apiKey = process.env.REACT_APP_MISTRAL_API_KEY;
    this.client = null;
    
    // Cache intelligent
    this.responseCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxCacheSize = 50;
    
    // Déduplication des requêtes
    this.pendingRequests = new Map();
    
    // Statistiques de parsing
    this.parsingStats = {
      directSuccess: 0,
      cleanedSuccess: 0,
      repairedSuccess: 0,
      reconstructedSuccess: 0,
      fallbackUsed: 0,
      totalAttempts: 0
    };

    if (this.apiKey) {
      this.client = new Mistral({
        apiKey: this.apiKey,
        timeout: 20000,
        retryConfig: {
          maxRetries: 2,
          retryDelay: 1000
        }
      });
      console.log('✅ Client Mistral ultra-robuste initialisé');
    } else {
      console.warn('⚠️ Clé API Mistral manquante');
    }
  }

  /**
   * TEMPLATES DE PROGRAMMES RÉALISTES
   */
  getRealisticWorkoutTemplates() {
    return {
      fullbody: {
        title: "Programme FullBody",
        description: "Entraînement complet du corps 3x par semaine",
        type: "fullbody",
        frequency: "3x/semaine",
        duration: "4 semaines",
        sessionDuration: "60-75 min",
        level: "Débutant à Intermédiaire",
        goal: "Développement harmonieux",
        schedule: ["Lundi", "Mercredi", "Vendredi"],
        restDays: ["Mardi", "Jeudi", "Samedi", "Dimanche"],
        workouts: [
          {
            day: "Lundi",
            name: "FullBody A",
            duration: "70 min",
            exercises: [
              {
                name: "Échauffement cardio",
                sets: "1",
                reps: "10 min",
                rest: "-",
                instructions: "Vélo ou tapis, intensité modérée",
                targetMuscles: ["Cardio"],
                type: "warmup"
              },
              {
                name: "Squats",
                sets: "4",
                reps: "8-12",
                rest: "90s",
                instructions: "Descendez jusqu'aux cuisses parallèles au sol",
                targetMuscles: ["Quadriceps", "Fessiers", "Ischio-jambiers"],
                type: "compound"
              },
              {
                name: "Développé couché",
                sets: "4",
                reps: "8-10",
                rest: "2min",
                instructions: "Contrôlez la descente, poussez explosif",
                targetMuscles: ["Pectoraux", "Triceps", "Deltoïdes antérieurs"],
                type: "compound"
              },
              {
                name: "Tractions assistées",
                sets: "3",
                reps: "6-10",
                rest: "90s",
                instructions: "Tirez jusqu'au menton, contrôlez la descente",
                targetMuscles: ["Dorsaux", "Biceps", "Rhomboïdes"],
                type: "compound"
              },
              {
                name: "Développé militaire",
                sets: "3",
                reps: "8-12",
                rest: "90s",
                instructions: "Montez au-dessus de la tête, serrez les abdos",
                targetMuscles: ["Deltoïdes", "Triceps"],
                type: "compound"
              },
              {
                name: "Soulevé de terre",
                sets: "3",
                reps: "6-8",
                rest: "2-3min",
                instructions: "Gardez le dos droit, tirez avec les hanches",
                targetMuscles: ["Ischio-jambiers", "Fessiers", "Dorsaux", "Trapèzes"],
                type: "compound"
              },
              {
                name: "Planche",
                sets: "3",
                reps: "30-60s",
                rest: "60s",
                instructions: "Corps aligné, contractez tout",
                targetMuscles: ["Abdominaux", "Core"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Mercredi", 
            name: "FullBody B",
            duration: "70 min",
            exercises: [
              {
                name: "Échauffement dynamique",
                sets: "1",
                reps: "10 min",
                rest: "-",
                instructions: "Mouvements articulaires et activation",
                targetMuscles: ["Mobilité"],
                type: "warmup"
              },
              {
                name: "Fentes bulgares",
                sets: "3",
                reps: "10-12 chaque jambe",
                rest: "90s",
                instructions: "Pied arrière surélevé, descendez verticalement",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Développé incliné haltères",
                sets: "4",
                reps: "8-12",
                rest: "90s",
                instructions: "Banc à 30°, rapprochez les omoplates",
                targetMuscles: ["Pectoraux supérieurs", "Deltoïdes"],
                type: "compound"
              },
              {
                name: "Rowing haltères",
                sets: "4",
                reps: "8-12",
                rest: "90s",
                instructions: "Penché à 45°, tirez vers le bas du ventre",
                targetMuscles: ["Dorsaux", "Rhomboïdes", "Biceps"],
                type: "compound"
              },
              {
                name: "Élévations latérales",
                sets: "3",
                reps: "12-15",
                rest: "60s",
                instructions: "Montez jusqu'à l'horizontale, contrôlez",
                targetMuscles: ["Deltoïdes moyens"],
                type: "isolation"
              },
              {
                name: "Hip thrust",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Serrez les fessiers en haut, pause 2s",
                targetMuscles: ["Fessiers", "Ischio-jambiers"],
                type: "isolation"
              },
              {
                name: "Crunchs bicyclette",
                sets: "3",
                reps: "20-30",
                rest: "60s",
                instructions: "Alternez coude-genou opposé",
                targetMuscles: ["Abdominaux", "Obliques"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Vendredi",
            name: "FullBody C", 
            duration: "65 min",
            exercises: [
              {
                name: "Échauffement spécifique",
                sets: "1",
                reps: "8 min",
                rest: "-",
                instructions: "Préparation progressive des articulations",
                targetMuscles: ["Activation"],
                type: "warmup"
              },
              {
                name: "Goblet squats",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Haltère contre la poitrine, squatez profond",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Pompes",
                sets: "4",
                reps: "8-15",
                rest: "90s",
                instructions: "Corps aligné, descendez jusqu'au sol",
                targetMuscles: ["Pectoraux", "Triceps", "Deltoïdes"],
                type: "compound"
              },
              {
                name: "Rowing inversé",
                sets: "3",
                reps: "8-12",
                rest: "90s",
                instructions: "Sous la barre, tirez la poitrine vers la barre",
                targetMuscles: ["Dorsaux", "Biceps", "Rhomboïdes"],
                type: "compound"
              },
              {
                name: "Dips assistés",
                sets: "3",
                reps: "6-12",
                rest: "90s",
                instructions: "Descendez jusqu'à 90°, remontez explosif",
                targetMuscles: ["Triceps", "Pectoraux inférieurs"],
                type: "compound"
              },
              {
                name: "Soulevé de terre roumain",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Jambes tendues, tirez avec les fessiers",
                targetMuscles: ["Ischio-jambiers", "Fessiers"],
                type: "compound"
              },
              {
                name: "Mountain climbers",
                sets: "3",
                reps: "30s",
                rest: "60s",
                instructions: "Rythme soutenu, gardez les hanches stables",
                targetMuscles: ["Cardio", "Core"],
                type: "isolation"
              }
            ]
          }
        ]
      },

      halfbody: {
        title: "Programme HalfBody",
        description: "Séparation haut/bas du corps 4x par semaine",
        type: "halfbody",
        frequency: "4x/semaine",
        duration: "4 semaines", 
        sessionDuration: "50-60 min",
        level: "Intermédiaire",
        goal: "Développement ciblé",
        schedule: ["Lundi", "Mardi", "Jeudi", "Vendredi"],
        restDays: ["Mercredi", "Samedi", "Dimanche"],
        workouts: [
          {
            day: "Lundi",
            name: "Haut du corps A",
            duration: "60 min",
            exercises: [
              {
                name: "Échauffement haut du corps",
                sets: "1",
                reps: "8 min",
                rest: "-",
                instructions: "Rotations d'épaules, étirements dynamiques",
                targetMuscles: ["Mobilité"],
                type: "warmup"
              },
              {
                name: "Développé couché",
                sets: "4",
                reps: "6-8",
                rest: "2-3min",
                instructions: "Charge lourde, forme parfaite",
                targetMuscles: ["Pectoraux", "Triceps", "Deltoïdes"],
                type: "compound"
              },
              {
                name: "Tractions lestées",
                sets: "4",
                reps: "6-10",
                rest: "2-3min",
                instructions: "Ajoutez du poids si possible",
                targetMuscles: ["Dorsaux", "Biceps"],
                type: "compound"
              },
              {
                name: "Développé militaire",
                sets: "3",
                reps: "8-10",
                rest: "2min",
                instructions: "Debout, strict press",
                targetMuscles: ["Deltoïdes", "Triceps"],
                type: "compound"
              },
              {
                name: "Rowing barre",
                sets: "3",
                reps: "8-10",
                rest: "2min",
                instructions: "Penché, tirez vers le sternum",
                targetMuscles: ["Dorsaux", "Rhomboïdes"],
                type: "compound"
              },
              {
                name: "Élévations latérales",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Tempo contrôlé",
                targetMuscles: ["Deltoïdes moyens"],
                type: "isolation"
              },
              {
                name: "Curl biceps",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Contraction complète",
                targetMuscles: ["Biceps"],
                type: "isolation"
              },
              {
                name: "Extension triceps",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Coudes fixes",
                targetMuscles: ["Triceps"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Mardi",
            name: "Bas du corps A",
            duration: "55 min",
            exercises: [
              {
                name: "Échauffement bas du corps",
                sets: "1",
                reps: "10 min",
                rest: "-",
                instructions: "Vélo léger + mobilité hanches",
                targetMuscles: ["Cardio", "Mobilité"],
                type: "warmup"
              },
              {
                name: "Squats",
                sets: "4",
                reps: "6-8",
                rest: "3min",
                instructions: "Charge progressive, profondeur complète",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Soulevé de terre",
                sets: "4",
                reps: "5-6",
                rest: "3min",
                instructions: "Technique parfaite, charge lourde",
                targetMuscles: ["Ischio-jambiers", "Fessiers", "Dorsaux"],
                type: "compound"
              },
              {
                name: "Fentes marchées",
                sets: "3",
                reps: "12-15 chaque jambe",
                rest: "2min",
                instructions: "Pas longs, descendez bien",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Leg curls",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Contraction pic en haut",
                targetMuscles: ["Ischio-jambiers"],
                type: "isolation"
              },
              {
                name: "Extensions quadriceps",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Tempo lent sur la descente",
                targetMuscles: ["Quadriceps"],
                type: "isolation"
              },
              {
                name: "Mollets debout",
                sets: "4",
                reps: "15-20",
                rest: "60s",
                instructions: "Amplitude complète",
                targetMuscles: ["Mollets"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Jeudi",
            name: "Haut du corps B",
            duration: "60 min",
            exercises: [
              {
                name: "Échauffement spécifique",
                sets: "1",
                reps: "8 min",
                rest: "-",
                instructions: "Activation progressive",
                targetMuscles: ["Mobilité"],
                type: "warmup"
              },
              {
                name: "Développé incliné",
                sets: "4",
                reps: "8-10",
                rest: "2min",
                instructions: "Focus pectoraux supérieurs",
                targetMuscles: ["Pectoraux supérieurs", "Deltoïdes"],
                type: "compound"
              },
              {
                name: "Rowing haltères",
                sets: "4",
                reps: "8-10",
                rest: "2min",
                instructions: "Unilatéral, strict",
                targetMuscles: ["Dorsaux", "Rhomboïdes"],
                type: "compound"
              },
              {
                name: "Dips",
                sets: "3",
                reps: "8-12",
                rest: "2min",
                instructions: "Amplitude complète",
                targetMuscles: ["Triceps", "Pectoraux inférieurs"],
                type: "compound"
              },
              {
                name: "Tirage horizontal",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Serrez les omoplates",
                targetMuscles: ["Dorsaux", "Rhomboïdes"],
                type: "compound"
              },
              {
                name: "Oiseau",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Deltoïdes postérieurs",
                targetMuscles: ["Deltoïdes postérieurs"],
                type: "isolation"
              },
              {
                name: "Curl marteau",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Prise neutre",
                targetMuscles: ["Biceps", "Avant-bras"],
                type: "isolation"
              },
              {
                name: "Kickback triceps",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Extension complète",
                targetMuscles: ["Triceps"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Vendredi",
            name: "Bas du corps B",
            duration: "50 min",
            exercises: [
              {
                name: "Échauffement dynamique",
                sets: "1",
                reps: "8 min",
                rest: "-",
                instructions: "Activation neuromusculaire",
                targetMuscles: ["Activation"],
                type: "warmup"
              },
              {
                name: "Front squats",
                sets: "4",
                reps: "8-10",
                rest: "2-3min",
                instructions: "Barre devant, posture droite",
                targetMuscles: ["Quadriceps", "Core"],
                type: "compound"
              },
              {
                name: "Soulevé de terre roumain",
                sets: "4",
                reps: "8-10",
                rest: "2min",
                instructions: "Focus ischio-jambiers",
                targetMuscles: ["Ischio-jambiers", "Fessiers"],
                type: "compound"
              },
              {
                name: "Fentes bulgares",
                sets: "3",
                reps: "10-12 chaque jambe",
                rest: "90s",
                instructions: "Unilatéral intensif",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Hip thrust",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Contraction maximale",
                targetMuscles: ["Fessiers"],
                type: "isolation"
              },
              {
                name: "Leg press",
                sets: "3",
                reps: "15-20",
                rest: "90s",
                instructions: "Amplitude complète",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Mollets assis",
                sets: "4",
                reps: "20-25",
                rest: "60s",
                instructions: "Étirement en bas",
                targetMuscles: ["Mollets"],
                type: "isolation"
              }
            ]
          }
        ]
      },

      split: {
        title: "Programme Split",
        description: "Entraînement par groupes musculaires 5x par semaine",
        type: "split",
        frequency: "5x/semaine",
        duration: "4 semaines",
        sessionDuration: "45-60 min", 
        level: "Avancé",
        goal: "Spécialisation musculaire",
        schedule: ["Lundi", "Mardi", "Mercredi", "Vendredi", "Samedi"],
        restDays: ["Jeudi", "Dimanche"],
        workouts: [
          {
            day: "Lundi",
            name: "Pectoraux / Triceps",
            duration: "60 min",
            exercises: [
              {
                name: "Échauffement pectoraux",
                sets: "1",
                reps: "8 min",
                rest: "-",
                instructions: "Rotation d'épaules, étirements",
                targetMuscles: ["Mobilité"],
                type: "warmup"
              },
              {
                name: "Développé couché",
                sets: "4",
                reps: "6-8",
                rest: "3min",
                instructions: "Exercice roi des pectoraux",
                targetMuscles: ["Pectoraux", "Triceps"],
                type: "compound"
              },
              {
                name: "Développé incliné haltères",
                sets: "4",
                reps: "8-10",
                rest: "2-3min",
                instructions: "Pectoraux supérieurs",
                targetMuscles: ["Pectoraux supérieurs"],
                type: "compound"
              },
              {
                name: "Développé décliné",
                sets: "3",
                reps: "10-12",
                rest: "2min",
                instructions: "Pectoraux inférieurs",
                targetMuscles: ["Pectoraux inférieurs"],
                type: "compound"
              },
              {
                name: "Écarté couché",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Étirement maximal",
                targetMuscles: ["Pectoraux"],
                type: "isolation"
              },
              {
                name: "Dips",
                sets: "3",
                reps: "10-15",
                rest: "2min",
                instructions: "Transition vers triceps",
                targetMuscles: ["Triceps", "Pectoraux"],
                type: "compound"
              },
              {
                name: "Extension triceps allongé",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Skullcrushers",
                targetMuscles: ["Triceps"],
                type: "isolation"
              },
              {
                name: "Extension triceps poulie",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Finition triceps",
                targetMuscles: ["Triceps"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Mardi", 
            name: "Dos / Biceps",
            duration: "60 min",
            exercises: [
              {
                name: "Échauffement dos",
                sets: "1",
                reps: "8 min",
                rest: "-",
                instructions: "Tractions légères, rowing sans charge",
                targetMuscles: ["Activation"],
                type: "warmup"
              },
              {
                name: "Tractions",
                sets: "4",
                reps: "6-10",
                rest: "3min",
                instructions: "Exercice roi du dos",
                targetMuscles: ["Dorsaux", "Biceps"],
                type: "compound"
              },
              {
                name: "Rowing barre",
                sets: "4",
                reps: "8-10",
                rest: "2-3min",
                instructions: "Penché, tirez vers le sternum",
                targetMuscles: ["Dorsaux", "Rhomboïdes"],
                type: "compound"
              },
              {
                name: "Tirage vertical",
                sets: "3",
                reps: "10-12",
                rest: "2min",
                instructions: "Largeur du dos",
                targetMuscles: ["Dorsaux"],
                type: "compound"
              },
              {
                name: "Rowing haltère unilatéral",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Chaque bras séparément",
                targetMuscles: ["Dorsaux", "Rhomboïdes"],
                type: "compound"
              },
              {
                name: "Tirage horizontal",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Épaisseur du dos",
                targetMuscles: ["Rhomboïdes", "Trapèzes"],
                type: "compound"
              },
              {
                name: "Curl barre",
                sets: "4",
                reps: "8-12",
                rest: "90s",
                instructions: "Exercice de base biceps",
                targetMuscles: ["Biceps"],
                type: "isolation"
              },
              {
                name: "Curl haltères alternés",
                sets: "3",
                reps: "10-12",
                rest: "90s",
                instructions: "Contraction pic",
                targetMuscles: ["Biceps"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Mercredi",
            name: "Épaules / Abdominaux",
            duration: "55 min",
            exercises: [
              {
                name: "Échauffement épaules",
                sets: "1",
                reps: "10 min",
                rest: "-",
                instructions: "Rotations, bandes élastiques",
                targetMuscles: ["Mobilité"],
                type: "warmup"
              },
              {
                name: "Développé militaire",
                sets: "4",
                reps: "6-8",
                rest: "3min",
                instructions: "Debout, barre olympique",
                targetMuscles: ["Deltoïdes", "Triceps"],
                type: "compound"
              },
              {
                name: "Élévations latérales",
                sets: "4",
                reps: "12-15",
                rest: "90s",
                instructions: "Deltoïdes moyens",
                targetMuscles: ["Deltoïdes moyens"],
                type: "isolation"
              },
              {
                name: "Élévations frontales",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Deltoïdes antérieurs",
                targetMuscles: ["Deltoïdes antérieurs"],
                type: "isolation"
              },
              {
                name: "Oiseau",
                sets: "4",
                reps: "12-15",
                rest: "90s",
                instructions: "Deltoïdes postérieurs",
                targetMuscles: ["Deltoïdes postérieurs"],
                type: "isolation"
              },
              {
                name: "Shrugs",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Haussements d'épaules",
                targetMuscles: ["Trapèzes"],
                type: "isolation"
              },
              {
                name: "Crunchs",
                sets: "4",
                reps: "15-20",
                rest: "60s",
                instructions: "Abdominaux supérieurs",
                targetMuscles: ["Abdominaux"],
                type: "isolation"
              },
              {
                name: "Relevés de jambes",
                sets: "3",
                reps: "12-15",
                rest: "60s",
                instructions: "Abdominaux inférieurs",
                targetMuscles: ["Abdominaux inférieurs"],
                type: "isolation"
              },
              {
                name: "Planche",
                sets: "3",
                reps: "45-60s",
                rest: "90s",
                instructions: "Gainage statique",
                targetMuscles: ["Core"],
                type: "isolation"
              }
            ]
          },
          {
            day: "Vendredi",
            name: "Cuisses",
            duration: "60 min",
            exercises: [
              {
                name: "Échauffement jambes",
                sets: "1",
                reps: "10 min",
                rest: "-",
                instructions: "Vélo + mobilité hanches",
                targetMuscles: ["Cardio", "Mobilité"],
                type: "warmup"
              },
              {
                name: "Squats",
                sets: "5",
                reps: "6-8",
                rest: "3-4min",
                instructions: "Exercice roi des jambes",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Presse à cuisses",
                sets: "4",
                reps: "10-12",
                rest: "2-3min",
                instructions: "Pieds largeur épaules",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Extensions quadriceps",
                sets: "4",
                reps: "12-15",
                rest: "90s",
                instructions: "Isolation quadriceps",
                targetMuscles: ["Quadriceps"],
                type: "isolation"
              },
              {
                name: "Fentes marchées",
                sets: "3",
                reps: "12-15 chaque jambe",
                rest: "2min",
                instructions: "Alternez les jambes",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              },
              {
                name: "Hack squats",
                sets: "3",
                reps: "12-15",
                rest: "2min",
                instructions: "Machine ou barre derrière",
                targetMuscles: ["Quadriceps"],
                type: "compound"
              },
              {
                name: "Squats bulgares",
                sets: "3",
                reps: "10-12 chaque jambe",
                rest: "90s",
                instructions: "Pied arrière surélevé",
                targetMuscles: ["Quadriceps", "Fessiers"],
                type: "compound"
              }
            ]
          },
          {
            day: "Samedi",
            name: "Ischio-jambiers / Mollets",
            duration: "50 min",
            exercises: [
              {
                name: "Échauffement spécifique",
                sets: "1",
                reps: "8 min",
                rest: "-",
                instructions: "Activation ischio-jambiers",
                targetMuscles: ["Activation"],
                type: "warmup"
              },
              {
                name: "Soulevé de terre",
                sets: "4",
                reps: "6-8",
                rest: "3-4min",
                instructions: "Technique parfaite obligatoire",
                targetMuscles: ["Ischio-jambiers", "Fessiers", "Dorsaux"],
                type: "compound"
              },
              {
                name: "Soulevé de terre roumain",
                sets: "4",
                reps: "10-12",
                rest: "2-3min",
                instructions: "Focus ischio-jambiers",
                targetMuscles: ["Ischio-jambiers", "Fessiers"],
                type: "compound"
              },
              {
                name: "Leg curls allongé",
                sets: "4",
                reps: "12-15",
                rest: "90s",
                instructions: "Contraction pic",
                targetMuscles: ["Ischio-jambiers"],
                type: "isolation"
              },
              {
                name: "Hip thrust",
                sets: "3",
                reps: "15-20",
                rest: "90s",
                instructions: "Fessiers en feu",
                targetMuscles: ["Fessiers"],
                type: "isolation"
              },
              {
                name: "Good morning",
                sets: "3",
                reps: "12-15",
                rest: "90s",
                instructions: "Barre sur les épaules",
                targetMuscles: ["Ischio-jambiers", "Fessiers"],
                type: "compound"
              },
              {
                name: "Mollets debout",
                sets: "5",
                reps: "15-20",
                rest: "60s",
                instructions: "Amplitude maximale",
                targetMuscles: ["Mollets"],
                type: "isolation"
              },
              {
                name: "Mollets assis",
                sets: "4",
                reps: "20-25",
                rest: "60s",
                instructions: "Partie profonde",
                targetMuscles: ["Soléaires"],
                type: "isolation"
              }
            ]
          }
        ]
      }
    };
  }

  /**
   * NETTOYAGE JSON ULTRA-AGRESSIF - Version 2.0
   */
  ultraCleanJsonResponse(response) {
    console.log('🧹 Nettoyage ultra-agressif démarré...');
    
    let cleaned = response;
    
    try {
      // ÉTAPE 1: Supprimer tout le contenu non-JSON
      cleaned = cleaned
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/^[^{\[]*/, '') // Supprimer tout avant le premier { ou [
        .replace(/[^}\]]*$/, '') // Supprimer tout après le dernier } ou ]
        .trim();

      // ÉTAPE 2: Nettoyer les caractères problématiques
      cleaned = cleaned
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caractères de contrôle
        .replace(/[\u2000-\u206F]/g, ' ') // Espaces Unicode
        .replace(/[\u2E00-\u2E7F]/g, '') // Ponctuation spéciale
        .replace(/['']/g, "'") // Remplacer smart quotes
        .replace(/[""]/g, '"') // Remplacer smart quotes doubles
        .replace(/…/g, '...') // Remplacer ellipsis
        .replace(/–/g, '-') // Remplacer em-dash
        .replace(/—/g, '-'); // Remplacer en-dash

      // ÉTAPE 3: Nettoyer les chaînes de caractères problématiques
      cleaned = cleaned.replace(/"([^"]*?)"/g, (match, content) => {
        const safeContent = content
          .replace(/\\/g, '\\\\') // Échapper backslashes
          .replace(/"/g, '\\"') // Échapper guillemets
          .replace(/\n/g, '\\n') // Échapper nouvelles lignes
          .replace(/\r/g, '\\r') // Échapper retours chariot
          .replace(/\t/g, '\\t') // Échapper tabs
          .replace(/\f/g, '\\f') // Échapper form feeds
          .replace(/\b/g, '\\b') // Échapper backspaces
          .replace(/[\x00-\x1F\x7F]/g, ''); // Supprimer caractères de contrôle
        
        return `"${safeContent}"`;
      });

      // ÉTAPE 4: Corriger la structure JSON
      cleaned = cleaned
        .replace(/,(\s*[}\]])/g, '$1') // Supprimer virgules avant fermeture
        .replace(/([}\]])(\s*)([{\[])/g, '$1,$2$3') // Ajouter virgules entre objets
        .replace(/}(\s*){/g, '},$1{') // Virgules entre objets
        .replace(/](\s*)\[/g, '],$1[') // Virgules entre arrays
        .replace(/,+/g, ',') // Supprimer virgules multiples
        .replace(/,(\s*[}\]])/g, '$1'); // Re-supprimer virgules avant fermeture

      console.log('✅ Nettoyage ultra-agressif terminé');
      return cleaned;

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      return response; // Retourner l'original en cas d'erreur
    }
  }

  /**
   * PARSING JSON ULTRA-ROBUSTE avec fallback vers templates
   */
  async ultraParseJsonResponse(response, responseType = 'workout') {
    this.parsingStats.totalAttempts++;
    
    console.log('🔍 Début parsing ultra-robuste...');

    // MÉTHODE 1: Parsing direct
    try {
      console.log('🎯 Tentative 1: Parsing direct');
      const directResult = JSON.parse(response);
      this.parsingStats.directSuccess++;
      console.log('✅ Parsing direct réussi !');
      return this.validateAndNormalizeResponse(directResult, responseType);
    } catch (error1) {
      console.log('❌ Parsing direct échoué:', error1.message);
    }

    // MÉTHODE 2: Nettoyage + parsing
    try {
      console.log('🎯 Tentative 2: Nettoyage + parsing');
      const cleaned = this.ultraCleanJsonResponse(response);
      const cleanedResult = JSON.parse(cleaned);
      this.parsingStats.cleanedSuccess++;
      console.log('✅ Parsing avec nettoyage réussi !');
      return this.validateAndNormalizeResponse(cleanedResult, responseType);
    } catch (error2) {
      console.log('❌ Parsing avec nettoyage échoué:', error2.message);
    }

    // MÉTHODE 3: Fallback vers templates réalistes
    console.log('🆘 Utilisation des templates réalistes');
    this.parsingStats.fallbackUsed++;
    return this.generateRealisticFallbackResponse(responseType);
  }

  /**
   * FALLBACK VERS PROGRAMMES RÉALISTES
   */
  generateRealisticFallbackResponse(responseType) {
    console.log('🛡️ Génération programmes réalistes...');
    
    if (responseType === 'workout') {
      const templates = this.getRealisticWorkoutTemplates();
      const selectedTemplates = [templates.fullbody, templates.halfbody, templates.split];
      
      return selectedTemplates.map((template, index) => ({
        id: `realistic-program-${Date.now()}-${index}`,
        title: template.title,
        description: template.description,
        type: template.type,
        level: template.level,
        duration: template.duration,
        frequency: template.frequency,
        sessionDuration: template.sessionDuration,
        equipment: 'Salle de sport / Maison équipée',
        goal: template.goal,
        schedule: template.schedule,
        restDays: template.restDays,
        workouts: template.workouts,
        tips: [
          `Programme ${template.type} professionnel`,
          'Augmentez les charges progressivement',
          'Respectez les temps de repos',
          'Technique avant performance'
        ],
        progressionNotes: `Progression ${template.type} : semaine 1-2 adaptation, semaine 3-4 intensification`,
        aiGenerated: true,
        source: 'Template Réaliste',
        createdAt: new Date().toISOString(),
        weekStructure: this.generateWeekStructure(template.schedule, template.restDays)
      }));
    }
    
    if (responseType === 'mass-gain') {
      return this.generateRealisticMassGainRecipes();
    }
    
    return this.generateFallbackResponse(responseType);
  }

  /**
   * GÉNÉRATION DE RECETTES PRISE DE MASSE RÉALISTES
   */
  generateRealisticMassGainRecipes() {
    console.log('🥗 Génération recettes masse réalistes...');
    
    const massGainRecipes = [
      {
        id: `mass-recipe-${Date.now()}-1`,
        name: "Shake Protéiné Complet",
        description: "Shake riche en protéines et calories pour la prise de masse",
        calories: 650,
        protein: 45,
        carbs: 60,
        fats: 18,
        time: 5,
        difficulty: "Facile",
        servings: 1,
        mealType: "collation",
        ingredients: [
          { name: "Whey protéine", quantity: "40", unit: "g" },
          { name: "Banane", quantity: "1", unit: "pièce" },
          { name: "Avoine", quantity: "50", unit: "g" },
          { name: "Lait entier", quantity: "300", unit: "ml" },
          { name: "Beurre de cacahuète", quantity: "20", unit: "g" },
          { name: "Miel", quantity: "15", unit: "g" }
        ],
        instructions: [
          "Mixer tous les ingrédients ensemble",
          "Ajouter des glaçons si désiré",
          "Boire immédiatement après l'entraînement"
        ],
        tips: ["Parfait post-entraînement", "Riche en protéines complètes"],
        aiGenerated: true,
        source: "Template Réaliste"
      },
      {
        id: `mass-recipe-${Date.now()}-2`,
        name: "Overnight Oats Protéinés",
        description: "Petit-déjeuner riche et consistant pour la prise de masse",
        calories: 580,
        protein: 35,
        carbs: 65,
        fats: 16,
        time: 15,
        difficulty: "Facile",
        servings: 1,
        mealType: "petit-dejeuner",
        ingredients: [
          { name: "Avoine", quantity: "80", unit: "g" },
          { name: "Protéine en poudre", quantity: "30", unit: "g" },
          { name: "Yaourt grec", quantity: "150", unit: "g" },
          { name: "Lait d'amande", quantity: "200", unit: "ml" },
          { name: "Myrtilles", quantity: "100", unit: "g" },
          { name: "Amandes effilées", quantity: "20", unit: "g" },
          { name: "Graines de chia", quantity: "10", unit: "g" }
        ],
        instructions: [
          "Mélanger l'avoine, la protéine et les graines de chia",
          "Ajouter le lait et bien mélanger",
          "Laisser reposer au frigo toute la nuit",
          "Le matin, ajouter le yaourt et les fruits",
          "Garnir avec les amandes"
        ],
        tips: ["Préparer la veille", "Personnalisable avec différents fruits"],
        aiGenerated: true,
        source: "Template Réaliste"
      },
      {
        id: `mass-recipe-${Date.now()}-3`,
        name: "Pâtes au Saumon et Avocat",
        description: "Repas complet riche en protéines et bonnes graisses",
        calories: 720,
        protein: 42,
        carbs: 65,
        fats: 28,
        time: 25,
        difficulty: "Modéré",
        servings: 1,
        mealType: "dejeuner",
        ingredients: [
          { name: "Pâtes complètes", quantity: "100", unit: "g" },
          { name: "Filet de saumon", quantity: "150", unit: "g" },
          { name: "Avocat", quantity: "1", unit: "pièce" },
          { name: "Épinards frais", quantity: "100", unit: "g" },
          { name: "Tomates cerises", quantity: "150", unit: "g" },
          { name: "Huile d'olive", quantity: "15", unit: "ml" },
          { name: "Ail", quantity: "2", unit: "gousses" },
          { name: "Citron", quantity: "0.5", unit: "pièce" }
        ],
        instructions: [
          "Cuire les pâtes selon les instructions",
          "Faire griller le saumon à la poêle",
          "Faire revenir l'ail et les tomates",
          "Ajouter les épinards jusqu'à ce qu'ils flétrissent",
          "Mélanger les pâtes avec les légumes",
          "Ajouter le saumon émietté et l'avocat",
          "Assaisonner avec le citron et l'huile d'olive"
        ],
        tips: ["Riche en oméga-3", "Équilibré en macronutriments"],
        aiGenerated: true,
        source: "Template Réaliste"
      },
      {
        id: `mass-recipe-${Date.now()}-4`,
        name: "Pancakes Protéinés aux Bananes",
        description: "Petit-déjeuner gourmand et riche en protéines",
        calories: 620,
        protein: 38,
        carbs: 72,
        fats: 15,
        time: 20,
        difficulty: "Facile",
        servings: 2,
        mealType: "petit-dejeuner",
        ingredients: [
          { name: "Bananes mûres", quantity: "2", unit: "pièces" },
          { name: "Œufs entiers", quantity: "3", unit: "pièces" },
          { name: "Protéine en poudre", quantity: "40", unit: "g" },
          { name: "Avoine", quantity: "60", unit: "g" },
          { name: "Lait", quantity: "100", unit: "ml" },
          { name: "Cannelle", quantity: "5", unit: "g" },
          { name: "Huile de coco", quantity: "10", unit: "g" },
          { name: "Sirop d'érable", quantity: "20", unit: "ml" }
        ],
        instructions: [
          "Écraser les bananes dans un bol",
          "Ajouter les œufs et bien mélanger",
          "Incorporer la protéine et l'avoine",
          "Ajouter le lait et la cannelle",
          "Laisser reposer 5 minutes",
          "Cuire les pancakes dans une poêle avec l'huile",
          "Servir avec le sirop d'érable"
        ],
        tips: ["Sans farine raffinée", "Parfait avant l'entraînement"],
        aiGenerated: true,
        source: "Template Réaliste"
      },
      {
        id: `mass-recipe-${Date.now()}-5`,
        name: "Quinoa Bowl Complet",
        description: "Bowl nutritif et riche pour le déjeuner ou dîner",
        calories: 680,
        protein: 36,
        carbs: 58,
        fats: 24,
        time: 30,
        difficulty: "Modéré",
        servings: 1,
        mealType: "dejeuner",
        ingredients: [
          { name: "Quinoa", quantity: "80", unit: "g" },
          { name: "Poulet grillé", quantity: "120", unit: "g" },
          { name: "Avocat", quantity: "0.5", unit: "pièce" },
          { name: "Pois chiches", quantity: "100", unit: "g" },
          { name: "Concombre", quantity: "100", unit: "g" },
          { name: "Tomates", quantity: "100", unit: "g" },
          { name: "Feta", quantity: "30", unit: "g" },
          { name: "Huile d'olive", quantity: "15", unit: "ml" },
          { name: "Tahini", quantity: "20", unit: "g" }
        ],
        instructions: [
          "Cuire le quinoa selon les instructions",
          "Griller le poulet et le couper en dés",
          "Couper tous les légumes",
          "Disposer tous les ingrédients dans un bol",
          "Préparer une sauce avec tahini et huile d'olive",
          "Arroser le bowl avec la sauce"
        ],
        tips: ["Complet en acides aminés", "Riche en fibres"],
        aiGenerated: true,
        source: "Template Réaliste"
      },
      {
        id: `mass-recipe-${Date.now()}-6`,
        name: "Smoothie Bowl Énergétique",
        description: "Bowl frais et nutritif pour bien commencer la journée",
        calories: 590,
        protein: 32,
        carbs: 68,
        fats: 18,
        time: 15,
        difficulty: "Facile",
        servings: 1,
        mealType: "petit-dejeuner",
        ingredients: [
          { name: "Banane congelée", quantity: "1", unit: "pièce" },
          { name: "Mangue congelée", quantity: "100", unit: "g" },
          { name: "Protéine en poudre", quantity: "30", unit: "g" },
          { name: "Yaourt grec", quantity: "150", unit: "g" },
          { name: "Lait de coco", quantity: "100", unit: "ml" },
          { name: "Granola", quantity: "40", unit: "g" },
          { name: "Noix de coco râpée", quantity: "15", unit: "g" },
          { name: "Graines de tournesol", quantity: "15", unit: "g" }
        ],
        instructions: [
          "Mixer les fruits congelés avec la protéine",
          "Ajouter le yaourt et le lait de coco",
          "Mixer jusqu'à obtenir une texture épaisse",
          "Verser dans un bol",
          "Garnir avec le granola et les graines",
          "Ajouter la noix de coco râpée"
        ],
        tips: ["Rafraîchissant en été", "Riche en vitamines"],
        aiGenerated: true,
        source: "Template Réaliste"
      }
    ];

    return massGainRecipes;
  }

  /**
   * GÉNÉRATION STRUCTURE HEBDOMADAIRE
   */
  generateWeekStructure(schedule, restDays) {
    const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    
    return daysOfWeek.map(day => ({
      day,
      isTrainingDay: schedule.includes(day),
      isRestDay: restDays.includes(day),
      activity: schedule.includes(day) ? 'Entraînement' : 'Repos'
    }));
  }

  /**
   * VALIDATION ET NORMALISATION DES RÉPONSES
   */
  validateAndNormalizeResponse(data, responseType) {
    if (!data) {
      throw new Error('Données nulles ou undefined');
    }

    if (responseType === 'workout') {
      if (!Array.isArray(data)) {
        data = [data];
      }
      
      return data.map((program, index) => ({
        id: program.id || `validated-program-${Date.now()}-${index}`,
        title: program.title || `Programme ${index + 1}`,
        description: program.description || 'Programme validé',
        type: program.type || 'fullbody',
        level: program.level || 'Intermédiaire',
        duration: program.duration || '4 semaines',
        frequency: program.frequency || '3x/semaine',
        sessionDuration: program.sessionDuration || '45 min',
        equipment: program.equipment || 'Variable',
        goal: program.goal || 'Forme',
        schedule: program.schedule || ['Lundi', 'Mercredi', 'Vendredi'],
        restDays: program.restDays || ['Mardi', 'Jeudi', 'Samedi', 'Dimanche'],
        workouts: Array.isArray(program.workouts) && program.workouts.length > 0 
          ? program.workouts 
          : this.getRealisticWorkoutTemplates().fullbody.workouts,
        tips: Array.isArray(program.tips) ? program.tips : ['Échauffez-vous'],
        progressionNotes: program.progressionNotes || 'Progressez graduellement',
        weekStructure: program.weekStructure || this.generateWeekStructure(
          program.schedule || ['Lundi', 'Mercredi', 'Vendredi'],
          program.restDays || ['Mardi', 'Jeudi', 'Samedi', 'Dimanche']
        ),
        aiGenerated: true,
        source: 'Mistral AI (Validé)',
        createdAt: new Date().toISOString()
      }));
    }
    
    return data;
  }

  /**
   * GÉNÉRATION DE PROGRAMMES AVEC PROMPTS AMÉLIORÉS
   */
  buildOptimizedWorkoutPrompt(userProfile, additionalQuery = '') {
    const equipment = userProfile.availableEquipment?.length > 0 
      ? userProfile.availableEquipment.join(',') 
      : 'salle de sport complète';
    
    const level = userProfile.level || 'débutant';
    
    return `Génère 3 programmes d'entraînement réalistes JSON pour:
- Niveau: ${level}
- Objectif: ${userProfile.goal || 'forme'} 
- Équipement: ${equipment}
- Âge: ${userProfile.age || 25}ans
- ${userProfile.gender === 'male' ? 'Homme' : userProfile.gender === 'female' ? 'Femme' : 'Adulte'}

IMPORTANT: Génère 3 programmes différents :
1. Programme FULLBODY (3x/semaine) - débutant à intermédiaire
2. Programme HALFBODY (4x/semaine) - intermédiaire  
3. Programme SPLIT (5x/semaine) - avancé

Chaque programme doit avoir une structure hebdomadaire complète avec :
- Jours d'entraînement spécifiques
- Jours de repos planifiés
- Exercices détaillés avec séries/répétitions/repos
- Progression logique

Format JSON strict array de 3 programmes:
[{
  "title": "Programme [Type]",
  "description": "string",
  "type": "fullbody|halfbody|split", 
  "level": "Débutant|Intermédiaire|Avancé",
  "duration": "4 semaines",
  "frequency": "3x/semaine|4x/semaine|5x/semaine",
  "sessionDuration": "45-75 min",
  "equipment": "string",
  "goal": "string",
  "schedule": ["Lundi", "Mercredi", "Vendredi"],
  "restDays": ["Mardi", "Jeudi", "Samedi", "Dimanche"],
  "workouts": [
    {
      "day": "Lundi",
      "name": "Nom séance",
      "duration": "60 min",
      "exercises": [
        {
          "name": "Nom exercice",
          "sets": "3-4",
          "reps": "8-12",
          "rest": "90s-2min",
          "instructions": "Technique détaillée",
          "targetMuscles": ["Groupe musculaire"],
          "type": "compound|isolation|warmup"
        }
      ]
    }
  ]
}]

Réponse JSON uniquement, 3 programmes complets et réalistes.${additionalQuery ? ` Extra: ${additionalQuery}` : ''}`;
  }

  /**
   * MÉTHODES PUBLIQUES
   */
  
  async generateWorkoutPrograms(userProfile, additionalQuery = '') {
    try {
      console.log('🚀 Génération programmes ultra-robuste...');
      
      // Si pas de client API, utiliser directement les templates
      if (!this.client) {
        console.log('🛡️ Pas de client API, utilisation templates réalistes');
        return this.generateRealisticFallbackResponse('workout');
      }
      
      const prompt = this.buildOptimizedWorkoutPrompt(userProfile, additionalQuery);
      const messages = [
        {
          role: 'system',
          content: 'Tu es un coach expert. Génère UNIQUEMENT du JSON strict pour 3 programmes complets (fullbody, halfbody, split).'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callOptimizedAPI(messages, 'workout');
      return await this.ultraParseJsonResponse(response, 'workout');
      
    } catch (error) {
      console.error('❌ Erreur génération programmes:', error);
      return this.generateRealisticFallbackResponse('workout');
    }
  }

  async generateNutritionPlans(userProfile, additionalQuery = '') {
    try {
      console.log('🚀 Génération nutrition ultra-robuste...');
      
      const prompt = this.buildOptimizedNutritionPrompt(userProfile, additionalQuery);
      const messages = [
        {
          role: 'system',
          content: 'Tu es un nutritionniste expert. Génère UNIQUEMENT du JSON strict pour un plan complet.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callOptimizedAPI(messages, 'nutrition');
      return await this.ultraParseJsonResponse(response, 'nutrition');
      
    } catch (error) {
      console.error('❌ Erreur génération nutrition:', error);
      return this.generateFallbackResponse('nutrition');
    }
  }

  async generateMassGainRecipes(userProfile) {
    try {
      console.log('🚀 Génération recettes masse ultra-robuste...');
      
      const prompt = this.buildOptimizedMassGainPrompt(userProfile);
      const messages = [
        {
          role: 'system',
          content: 'Tu es un nutritionniste spécialisé. Génère UNIQUEMENT du JSON strict pour 4 recettes.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await this.callOptimizedAPI(messages, 'mass-gain');
      return await this.ultraParseJsonResponse(response, 'mass-gain');
      
    } catch (error) {
      console.error('❌ Erreur génération recettes masse:', error);
      return this.generateFallbackResponse('mass-gain');
    }
  }

  /**
   * STATISTIQUES DE PARSING
   */
  getParsingStats() {
    const total = this.parsingStats.totalAttempts || 1;
    return {
      totalAttempts: this.parsingStats.totalAttempts,
      directSuccessRate: Math.round((this.parsingStats.directSuccess / total) * 100),
      cleanedSuccessRate: Math.round((this.parsingStats.cleanedSuccess / total) * 100),
      repairedSuccessRate: Math.round((this.parsingStats.repairedSuccess / total) * 100),
      reconstructedSuccessRate: Math.round((this.parsingStats.reconstructedSuccess / total) * 100),
      fallbackRate: Math.round((this.parsingStats.fallbackUsed / total) * 100)
    };
  }

  /**
   * MÉTHODES UTILITAIRES
   */
  
  generateCacheKey(userProfile, requestType = 'workout') {
    const relevantFields = {
      level: userProfile.level || 'débutant',
      goal: userProfile.goal || 'forme',
      equipment: (userProfile.availableEquipment || []).sort().join(','),
      location: userProfile.equipmentLocation || 'home',
      age: Math.floor((userProfile.age || 25) / 10) * 10,
      weight: Math.floor((userProfile.weight || 70) / 10) * 10,
      gender: userProfile.gender || 'unspecified',
      type: requestType
    };
    
    return btoa(JSON.stringify(relevantFields));
  }

  buildOptimizedNutritionPrompt(userProfile, additionalQuery = '') {
    const calories = userProfile.weight ? Math.round(userProfile.weight * 30) : 2000;
    
    return `Génère plan nutrition JSON pour:
- ${userProfile.gender === 'male' ? 'Homme' : 'Femme'} ${userProfile.age || 25}ans
- ${userProfile.weight || 70}kg
- Objectif: ${userProfile.goal || 'équilibre'}
- Calories: ${calories}kcal/jour

Format JSON strict:
{
  "title": "string",
  "calorieTarget": ${calories},
  "recipes": [{"name": "string", "calories": number, "protein": number, "carbs": number, "fats": number, "ingredients": [{"name": "string", "quantity": "string", "unit": "string"}], "instructions": ["string"], "mealType": "petit-dejeuner|dejeuner|diner|collation"}]
}

6 recettes variées, JSON uniquement.${additionalQuery ? ` Extra: ${additionalQuery}` : ''}`;
  }

  buildOptimizedMassGainPrompt(userProfile) {
    const protein = userProfile.weight ? Math.round(userProfile.weight * 2.2) : 140;
    
    return `Génère 4 recettes prise de masse JSON:
- ${userProfile.weight || 70}kg, objectif ${protein}g protéines/jour
- Calories: 600+ par recette
- Protéines: 35+ par recette

Format JSON array:
[{"name": "string", "calories": number, "protein": number, "carbs": number, "fats": number, "ingredients": [{"name": "string", "quantity": "string", "unit": "string"}], "instructions": ["string"], "mealType": "string"}]

JSON uniquement, 4 recettes riches.`;
  }

  async callOptimizedAPI(messages, requestType = 'workout') {
    if (!this.client) {
      throw new Error('Client Mistral non initialisé');
    }

    const options = {
      model: 'mistral-small',
      temperature: 0.3,
      maxTokens: requestType === 'workout' ? 4000 : 2500,
      topP: 0.8,
      safePrompt: false
    };

    try {
      const chatResponse = await this.client.chat.complete({
        messages: messages,
        ...options
      });

      if (!chatResponse.choices?.[0]?.message?.content) {
        throw new Error('Réponse API malformée');
      }

      return chatResponse.choices[0].message.content;
    } catch (error) {
      console.error('❌ Erreur API:', error);
      throw error;
    }
  }

  generateFallbackResponse(responseType) {
    console.log('🆘 Génération fallback pour', responseType);
    
    if (responseType === 'nutrition') {
      return {
        id: `fallback-nutrition-${Date.now()}`,
        title: 'Plan Nutritionnel de Base',
        calorieTarget: 2000,
        recipes: [
          {
            name: 'Petit-déjeuner équilibré',
            calories: 400,
            protein: 25,
            carbs: 45,
            fats: 15,
            ingredients: [{ name: 'Avoine', quantity: '50', unit: 'g' }],
            instructions: ['Préparer', 'Servir'],
            mealType: 'petit-dejeuner'
          },
          {
            name: 'Déjeuner protéiné',
            calories: 550,
            protein: 35,
            carbs: 50,
            fats: 18,
            ingredients: [{ name: 'Poulet', quantity: '150', unit: 'g' }],
            instructions: ['Cuire', 'Assaisonner'],
            mealType: 'dejeuner'
          },
          {
            name: 'Dîner léger',
            calories: 450,
            protein: 30,
            carbs: 35,
            fats: 16,
            ingredients: [{ name: 'Poisson', quantity: '120', unit: 'g' }],
            instructions: ['Griller', 'Servir avec légumes'],
            mealType: 'diner'
          }
        ],
        weeklyTips: ['Plan de base', 'Consultez un nutritionniste'],
        aiGenerated: false,
        source: 'Fallback System'
      };
    }
    
    if (responseType === 'mass-gain') {
      return this.generateRealisticMassGainRecipes();
    }
    
    return null;
  }
}

export const mistralService = new MistralService();