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
                sets: 3,
                reps: '12-15',
                rest: '60s',
                type: 'compound',
                targetMuscles: ['quadriceps', 'fessiers'],
                instructions: 'Descendez jusqu\'à ce que vos cuisses soient parallèles au sol'
              },
              {
                name: 'Pompes',
                sets: 3,
                reps: '8-12',
                rest: '60s',
                type: 'compound',
                targetMuscles: ['pectoraux', 'triceps', 'épaules'],
                instructions: 'Gardez le corps droit, descendez jusqu\'à frôler le sol'
              },
              {
                name: 'Planche',
                sets: 3,
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
                sets: 4,
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
                sets: 4,
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
                sets: 4,
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

    // If prompt requests exactly one program metadata (schedule generation)
    if (/Propose exactement 1 programme|TÂCHE: Propose exactement 1 programme|CONTRAINTES DE SORTIE.*schedule/i.test(prompt)) {
      // detect requested type in prompt (fullbody|halfbody|split)
      const typeMatch = prompt.match(/Propose exactement 1 programme de type\s*["'“]?(\w+)/i) ||
        prompt.match(/de type\s*["'“]?(fullbody|halfbody|split)/i);
      const requestedType = typeMatch ? String(typeMatch[1]).toLowerCase() : null;
      // detect requested level (débutant/intermédiaire/avancé)
      const levelMatch = prompt.match(/niveau\s*[:-]?\s*(débutant|intermédiaire|intermediaire|avancé|avance)/i);
      let requestedLevel = levelMatch ? String(levelMatch[1]).toLowerCase() : null;
      if (requestedLevel === 'intermediaire') requestedLevel = 'intermédiaire';
      if (requestedLevel === 'avance') requestedLevel = 'avancé';

      // obtain prototypes and pick the one matching requestedType
      const protos = this.generateMockWorkoutPrograms({ equipmentLocation: 'home' });
      let proto = null;
      if (requestedType) {
        proto = protos.find(p => String(p.type).toLowerCase() === requestedType);
      }
      proto = proto || protos.find(p => String(p.type).toLowerCase() === 'fullbody') || protos[0];

      const meta = {
        // ensure id unique per type+level so downstream day-generation can seed variations
        id: `program_${requestedType || proto.type || 'program'}_${(requestedLevel || proto.level || 'interm')}_${Date.now()}`,
        type: requestedType || proto.type || 'fullbody',
        title: proto.title ? `${proto.title} - ${requestedLevel || proto.level}` : `Programme Démo ${requestedLevel || proto.type}`,
        description: proto.description || 'Programme démo généré localement.',
        level: requestedLevel || proto.level || 'intermédiaire',
        duration: proto.duration || '8 semaines',
        frequency: proto.frequency || '3x/semaine',
        sessionDuration: proto.sessionDuration || '60 min',
        tips: Array.isArray(proto.tips) ? proto.tips : ['Échauffement 10 min', 'Hydrate-toi'],
        schedule: Array.isArray(proto.schedule) && proto.schedule.length >= 3 ? proto.schedule : ['Lundi','Mercredi','Vendredi']
      };
      this.updateParsingStats('direct');
      return meta;
    }
    
    // If prompt requests the workout for a specific day
    if (/Génère le WORKOUT COMPLET pour le jour|TÂCHE: Génère le WORKOUT COMPLET pour le jour/i.test(prompt)) {
      // Extract day
      const dayMatch = prompt.match(/jour\s*["'“]?([A-Za-zÀ-ÿ-]+)["'”]?/i);
      const day = (dayMatch && dayMatch[1]) ? normalizeDayName(dayMatch[1]) : 'Lundi';

      // Try to extract PROGRAMME_META JSON if present to know program type
      let programMeta = null;
      const metaMatch = prompt.match(/PROGRAMME_META:\s*(\{[\s\S]*\})/);
      if (metaMatch) {
        try { programMeta = JSON.parse(metaMatch[1]); } catch { programMeta = null; }
      }
      const pType = (programMeta && programMeta.type) ? String(programMeta.type).toLowerCase() : 'fullbody';
      const pLevel = (programMeta && programMeta.level) ? String(programMeta.level).toLowerCase() : 'intermédiaire';

      // Extraire le profil pour adapter selon le matériel disponible
      let profileData = {};
      try {
        const profMatch = prompt.match(/PROFIL:\s*(\{[\s\S]*?\})/);
        if (profMatch) profileData = JSON.parse(profMatch[1]);
      } catch {}
      const equipLoc = String(profileData.equipmentLocation || 'home').toLowerCase();
      const homeEq = Array.isArray(profileData.homeEquipment) ? profileData.homeEquipment : [];
      const hasDumbbells = homeEq.includes('dumbbells');
      const hasKB = homeEq.includes('kettlebell');
      const hasBands = homeEq.includes('resistanceBands');
      const hasBar = homeEq.includes('pullupBar');

      // compute seed from program id to vary selections deterministically
      const seed = idSeed((programMeta && programMeta.id) ? String(programMeta.id) : String(Date.now()));
      
      // Small pools per program type to vary exercises by day
      let fullbodyPools = [
        [
          { name: 'Squat', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Quadriceps', 'Fessiers'] },
          { name: 'Développé couché', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Pectoraux', 'Triceps'] },
          { name: 'Rowing barre', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Dos', 'Biceps'] },
          { name: 'Planche', sets: 3, reps: '45-60s', rest: '60s', type: 'isolation', targetMuscles: ['Core'] }
        ],
        [
          { name: 'Soulevé de terre', sets: 4, reps: '6-8', rest: '120s', type: 'compound', targetMuscles: ['Dos', 'Ischio'] },
          { name: 'Développé militaire', sets: 3, reps: '8-10', rest: '90s', type: 'compound', targetMuscles: ['Épaules', 'Triceps'] },
          { name: 'Fentes', sets: 3, reps: '10-12', rest: '90s', type: 'compound', targetMuscles: ['Jambes'] },
          { name: 'Russian twist', sets: 3, reps: '20', rest: '60s', type: 'isolation', targetMuscles: ['Abdominaux'] }
        ],
        [
          { name: 'Presse à cuisses', sets: 4, reps: '10-12', rest: '90s', type: 'compound', targetMuscles: ['Quadriceps'] },
          { name: 'Tractions', sets: 4, reps: '6-10', rest: '120s', type: 'compound', targetMuscles: ['Dos', 'Biceps'] },
          { name: 'Pompes déclinées', sets: 3, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Pectoraux'] },
          { name: 'Gainage latéral', sets: 3, reps: '30-45s', rest: '60s', type: 'isolation', targetMuscles: ['Core'] }
        ]
      ];

      // Variantes sans matériel
      const bwUpper = [
        { name: 'Pompes', sets: 3, reps: '12-20', rest: '60s', type: 'compound', targetMuscles: ['Pectoraux','Triceps'] },
        { name: 'Pompes diamant', sets: 3, reps: '8-12', rest: '60-90s', type: 'compound', targetMuscles: ['Triceps','Pectoraux'] },
        { name: 'Dips bancs', sets: 3, reps: '10-15', rest: '60-90s', type: 'compound', targetMuscles: ['Triceps','Épaules'] },
        { name: 'Élévations latérales à vide', sets: 3, reps: '15-20', rest: '45-60s', type: 'isolation', targetMuscles: ['Épaules'] }
      ];
      const bwLower = [
        { name: 'Squat poids du corps', sets: 4, reps: '15-25', rest: '60-90s', type: 'compound', targetMuscles: ['Quadriceps','Fessiers'] },
        { name: 'Fentes marchées', sets: 3, reps: '12-20', rest: '60-90s', type: 'compound', targetMuscles: ['Jambes'] },
        { name: 'Hip thrust au sol', sets: 3, reps: '12-20', rest: '60s', type: 'isolation', targetMuscles: ['Fessiers'] },
        { name: 'Mollets debout', sets: 3, reps: '15-25', rest: '45-60s', type: 'isolation', targetMuscles: ['Mollets'] }
      ];
      const bwFull = [
        [ { name: 'Squat poids du corps', sets: 4, reps: '15-25', rest: '60-90s', type: 'compound', targetMuscles: ['Quadriceps'] }, { name: 'Pompes', sets: 3, reps: '12-20', rest: '60s', type: 'compound', targetMuscles: ['Pectoraux'] }, { name: 'Superman', sets: 3, reps: '12-15', rest: '60s', type: 'isolation', targetMuscles: ['Dos'] }, { name: 'Planche', sets: 3, reps: '45-60s', rest: '60s', type: 'isolation', targetMuscles: ['Core'] } ],
        [ { name: 'Fentes', sets: 3, reps: '12-20', rest: '60-90s', type: 'compound', targetMuscles: ['Jambes'] }, { name: 'Pompes pieds surélevés', sets: 3, reps: '8-12', rest: '60-90s', type: 'compound', targetMuscles: ['Pectoraux'] }, { name: 'Rowing inversé table', sets: 3, reps: '8-12', rest: '60-90s', type: 'compound', targetMuscles: ['Dos'] }, { name: 'Gainage latéral', sets: 3, reps: '30-45s', rest: '60s', type: 'isolation', targetMuscles: ['Core'] } ],
        [ { name: 'Sauts en squat', sets: 3, reps: '12-15', rest: '60-90s', type: 'compound', targetMuscles: ['Quadriceps'] }, { name: 'Pompes serrées', sets: 3, reps: '8-12', rest: '60-90s', type: 'compound', targetMuscles: ['Triceps'] }, { name: 'Good morning au poids du corps', sets: 3, reps: '12-15', rest: '60s', type: 'isolation', targetMuscles: ['Ischio'] }, { name: 'Hollow hold', sets: 3, reps: '30-45s', rest: '60s', type: 'isolation', targetMuscles: ['Abdominaux'] } ]
      ];

      // Matériel spécifique
      const kbPool = [
        { name: 'Kettlebell swing', sets: 4, reps: '12-15', rest: '60-90s', type: 'compound', targetMuscles: ['Chaîne postérieure'] },
        { name: 'Goblet squat', sets: 4, reps: '10-15', rest: '60-90s', type: 'compound', targetMuscles: ['Jambes'] },
        { name: 'Clean & press kettlebell', sets: 3, reps: '8-10', rest: '90s', type: 'compound', targetMuscles: ['Total body'] },
        { name: 'Rowing kettlebell', sets: 3, reps: '10-12', rest: '60-90s', type: 'compound', targetMuscles: ['Dos'] }
      ];
      const bandPool = [
        { name: 'Tirage horizontal élastiques', sets: 4, reps: '12-15', rest: '60-90s', type: 'compound', targetMuscles: ['Dos'] },
        { name: 'Développé élastiques', sets: 3, reps: '12-15', rest: '60-90s', type: 'compound', targetMuscles: ['Pectoraux'] },
        { name: 'Squat élastiques', sets: 4, reps: '12-20', rest: '60-90s', type: 'compound', targetMuscles: ['Jambes'] },
        { name: 'Face pull élastiques', sets: 3, reps: '12-15', rest: '45-60s', type: 'isolation', targetMuscles: ['Épaules'] }
      ];

      let upperPool = [
        { name: 'Développé couché', sets: 4, reps: '6-10', rest: '90s', type: 'compound', targetMuscles: ['Pectoraux'] },
        { name: 'Rowing haltère', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Dos'] },
        { name: 'Élévations latérales', sets: 3, reps: '12-15', rest: '60s', type: 'isolation', targetMuscles: ['Épaules'] },
        { name: 'Curl biceps', sets: 3, reps: '10-12', rest: '60s', type: 'isolation', targetMuscles: ['Biceps'] }
      ];
      let lowerPool = [
        { name: 'Squat', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Quadriceps'] },
        { name: 'Soulevé de terre jambes tendues', sets: 3, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Ischio'] },
        { name: 'Fentes', sets: 3, reps: '10-12', rest: '90s', type: 'compound', targetMuscles: ['Fessiers'] },
        { name: 'Mollets debout', sets: 3, reps: '12-15', rest: '60s', type: 'isolation', targetMuscles: ['Mollets'] }
      ];

      let splitPools = [
        [ // chest
          { name: 'Développé incliné', sets: 4, reps: '6-8', rest: '120s', type: 'compound', targetMuscles: ['Pectoraux'] },
          { name: 'Écarté couché', sets: 3, reps: '10-12', rest: '60s', type: 'isolation', targetMuscles: ['Pectoraux'] },
          { name: 'Dips', sets: 3, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Pectoraux', 'Triceps'] },
          { name: 'Pec deck', sets: 3, reps: '12', rest: '60s', type: 'isolation', targetMuscles: ['Pectoraux'] }
        ],
        [ // back
          { name: 'Tractions', sets: 4, reps: '6-10', rest: '120s', type: 'compound', targetMuscles: ['Dos'] },
          { name: 'Rowing barre', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Dos'] },
          { name: 'Tirage horizontal', sets: 3, reps: '10-12', rest: '90s', type: 'compound', targetMuscles: ['Dos'] },
          { name: 'Curl marteau', sets: 3, reps: '10-12', rest: '60s', type: 'isolation', targetMuscles: ['Biceps'] }
        ],
        [ // legs
          { name: 'Squat', sets: 4, reps: '8-12', rest: '120s', type: 'compound', targetMuscles: ['Jambes'] },
          { name: 'Presse', sets: 4, reps: '10-12', rest: '90s', type: 'compound', targetMuscles: ['Quadriceps'] },
          { name: 'Fentes', sets: 3, reps: '10-12', rest: '90s', type: 'compound', targetMuscles: ['Fessiers'] },
          { name: 'Leg curl', sets: 3, reps: '12', rest: '60s', type: 'isolation', targetMuscles: ['Ischio'] }
        ],
        [ // shoulders/arms
          { name: 'Développé militaire', sets: 4, reps: '8-10', rest: '90s', type: 'compound', targetMuscles: ['Épaules'] },
          { name: 'Élévations frontales', sets: 3, reps: '12', rest: '60s', type: 'isolation', targetMuscles: ['Épaules'] },
          { name: 'Curl incliné', sets: 3, reps: '10-12', rest: '60s', type: 'isolation', targetMuscles: ['Biceps'] },
          { name: 'Extension triceps poulie', sets: 3, reps: '10-12', rest: '60s', type: 'isolation', targetMuscles: ['Triceps'] }
        ]
      ];

      // Adapter selon le contexte matériel
      const minimalEquipment = equipLoc === 'home' && !hasDumbbells && !hasKB && !hasBands && !hasBar;
      if (minimalEquipment) {
        fullbodyPools = bwFull;
        upperPool = bwUpper;
        lowerPool = bwLower;
        splitPools = [bwUpper, bwLower, bwUpper, bwLower];
      }

      // choose set based on program type/day and requested level (débutant/intermédiaire/avancé)
      let exercises = [];
      const dayIndex = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'].indexOf(day);

      if (pType === 'halfbody') {
        // alternate upper/lower based on parity of (dayIndex + seed) to vary between programs
        const upperFirst = ((dayIndex + seed) % 2) === 0;
        exercises = upperFirst ? upperPool : lowerPool;
        // rotate to vary ordering per program
        exercises = rotateArray(exercises, seed % exercises.length);
      } else if (pType === 'split') {
        // offset pool index by seed to pick different split focus per program
        const poolIdx = (dayIndex + (seed % splitPools.length)) % splitPools.length;
        exercises = rotateArray(splitPools[poolIdx], seed % splitPools[poolIdx].length);
      } else { // fullbody
        // offset pool index by seed so different fullbody metas won't always pick same pool
        const poolIdx = (dayIndex + (seed % fullbodyPools.length)) % fullbodyPools.length;
        exercises = rotateArray(fullbodyPools[poolIdx], seed % fullbodyPools[poolIdx].length);
      }

      // Mélanger avec des mouvements kettlebell/élastiques si dispo pour varier
      function mixInAlternates(base, alternates) {
        if (!alternates || alternates.length === 0) return base;
        const mixed = [...base];
        for (let i = 0; i < mixed.length; i++) {
          if ((i + seed) % 3 === 0) {
            mixed[i] = { ...alternates[(i + seed) % alternates.length] };
          }
        }
        return mixed;
      }
      if (hasKB) exercises = mixInAlternates(exercises, kbPool);
      if (hasBands) exercises = mixInAlternates(exercises, bandPool);

      // Desired count by level (débutant=4, intermédiaire=5, avancé=6) with minor seed variation
      const baseCount = pLevel && pLevel.includes('début') ? 4 : (pLevel && pLevel.includes('avancé') ? 6 : 5);
      const extra = (seed % 2); // 0 or 1 to slightly vary counts across programs
      const desiredCount = Math.max(4, baseCount + (extra === 1 ? 0 : 0)); // keep deterministic but could be adjusted

      // Expand or trim to desiredCount (clone items if needed) and ensure numeric sets
      const expanded = [];
      for (let i = 0; expanded.length < desiredCount; i++) {
        const src = exercises[i % exercises.length];
        const clone = { ...src };
        // ensure sets are numbers
        if (typeof clone.sets !== 'number') {
          const n = parseInt(String(clone.sets).replace(/\D/g,'')) || (pLevel.includes('début') ? 3 : 4);
          clone.sets = n;
        }
        // Ajuster reps/repos selon le niveau + légère variation de nom si dupliqué
        if (pLevel.includes('début')) {
          clone.reps = clone.reps || '12-15';
          clone.rest = clone.rest || '60-90s';
        } else if (pLevel.includes('avancé')) {
          clone.reps = clone.reps || '5-8';
          clone.rest = clone.rest || '120s';
        } else {
          clone.reps = clone.reps || '8-12';
          clone.rest = clone.rest || '90s';
        }
        // minor name variation if duplicated
        if (i >= exercises.length) clone.name = `${clone.name} (var.)`;
        expanded.push(clone);
      }

      const dayObj = {
        day,
        name: `${day} - Séance ${pType.toUpperCase()} (${pLevel || 'intermédiaire'})`,
        duration: (programMeta && programMeta.sessionDuration) ? programMeta.sessionDuration : '60 min',
        exercises: expanded.map(e => ({ ...e }))
      };
      this.updateParsingStats('direct');
      return dayObj;
    }

    if (prompt.includes('recettes')) {
      this.updateParsingStats('direct');
      const lower = prompt.toLowerCase();
      const theme = lower.includes('énergisant') || lower.includes('énergie') ? 'energy'
        : lower.includes('budget') || lower.includes('économique') ? 'budget'
        : lower.includes('saison') ? 'seasonal'
        : lower.includes('apaisantes') || lower.includes('stress') ? 'calm'
        : 'balanced';
      return this.generateMockRecipes(theme);
    }

    if (prompt.includes('plan de repas')) {
      this.updateParsingStats('direct');
      return this.generateMockMealPlan();
    }

    // Default generic response (unchanged)
    this.updateParsingStats('cleaned');
    return {
      response: 'Contenu généré par l\'IA (mode démo)',
      timestamp: new Date().toISOString()
    };
  }

  generateMockRecipes(theme = 'balanced') {
    const base = [
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

    const adds = {
      energy: [{
        name: 'Smoothie Avoine-Banane',
        description: 'Boost énergétique naturel',
        category: 'breakfast',
        cookTime: 5,
        difficulty: 'facile',
        servings: 1,
        ingredients: [
          { name: 'banane', quantity: '1', unit: 'pièce', available: true },
          { name: 'flocons d\'avoine', quantity: '40', unit: 'g', available: true },
          { name: 'lait d\'amande', quantity: '200', unit: 'ml', available: true }
        ],
        instructions: ['Mixer tous les ingrédients'],
        nutrition: { calories: 350, protein: 12, carbs: 60, fat: 6 },
        fridgeUsage: 60,
        tips: ['Ajouter une cuillère de beurre de cacahuète pour plus d\'énergie']
      }],
      budget: [{
        name: 'Riz aux Légumes Sauté',
        description: 'Économique et nourrissant',
        category: 'diner',
        cookTime: 18,
        difficulty: 'facile',
        servings: 2,
        ingredients: [
          { name: 'riz', quantity: '160', unit: 'g', available: true },
          { name: 'mélange de légumes surgelés', quantity: '300', unit: 'g', available: true },
          { name: 'sauce soja', quantity: '1', unit: 'cuillère', available: true }
        ],
        instructions: ['Cuire le riz', 'Sauter les légumes', 'Mélanger avec le riz et assaisonner'],
        nutrition: { calories: 520, protein: 14, carbs: 90, fat: 10 },
        fridgeUsage: 80,
        tips: ['Ajouter un œuf pour plus de protéines']
      }],
      seasonal: [{
        name: 'Velouté de Potimarron',
        description: 'Réconfort automnal',
        category: 'diner',
        cookTime: 25,
        difficulty: 'facile',
        servings: 2,
        ingredients: [
          { name: 'potimarron', quantity: '500', unit: 'g', available: true },
          { name: 'crème', quantity: '50', unit: 'ml', available: true }
        ],
        instructions: ['Cuire le potimarron', 'Mixer avec la crème'],
        nutrition: { calories: 300, protein: 6, carbs: 40, fat: 10 },
        fridgeUsage: 70,
        tips: ['Ajouter de la muscade']
      }],
      calm: [{
        name: 'Infusion Camomille-Miel',
        description: 'Apaisante et relaxante',
        category: 'drink',
        cookTime: 5,
        difficulty: 'facile',
        servings: 1,
        ingredients: [
          { name: 'camomille', quantity: '1', unit: 'sachet', available: true },
          { name: 'miel', quantity: '1', unit: 'cuillère', available: true }
        ],
        instructions: ['Infuser', 'Sucrer avec le miel'],
        nutrition: { calories: 60, protein: 0, carbs: 15, fat: 0 },
        fridgeUsage: 0,
        tips: ['Boire tiède le soir']
      }]
    };

    return base.concat(adds[theme] || []);
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

// Add small deterministic hash helper to vary pools/order per program id
function idSeed(id) {
	// simple deterministic hash: sum of char codes
	if (!id) return 0;
	let s = 0;
	for (let i = 0; i < id.length; i++) s += id.charCodeAt(i);
	return Math.abs(s);
}

function rotateArray(arr, by) {
	if (!Array.isArray(arr) || arr.length === 0) return arr;
	const n = arr.length;
	const k = ((by % n) + n) % n;
	return arr.slice(k).concat(arr.slice(0, k));
}

// Add local helper to normalize French day names (used by generateCustomContent)
function normalizeDayName(d) {
  if (!d) return d;
  const map = {
    'lundi': 'Lundi', 'mardi': 'Mardi', 'mercredi': 'Mercredi', 'jeudi': 'Jeudi',
    'vendredi': 'Vendredi', 'samedi': 'Samedi', 'dimanche': 'Dimanche'
  };
  const key = String(d).trim().toLowerCase();
  return map[key] || d;
}

export const mistralService = new SimpleMistralService();
export default mistralService;
