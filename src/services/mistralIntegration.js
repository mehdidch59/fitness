import { mistralService } from './mistralService';

/* ───────── Jours FR ───────── */
const DAY_ORDER = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const EN2FR = {
  Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi', Thursday: 'Jeudi',
  Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche'
};

/* ───────── Utils profil ───────── */
function toNumOrStr(v) {
  if (v === null || v === undefined) return '';
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : String(v);
}

function getMergedProfile() {
  let userProfile = {};
  let equipmentProfile = {};
  let nutritionProfile = {};
  try { userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch {}
  try { equipmentProfile = JSON.parse(localStorage.getItem('equipmentProfile') || '{}'); } catch {}
  try { nutritionProfile = JSON.parse(localStorage.getItem('nutritionProfile') || '{}'); } catch {}

  const profile = {
    ...userProfile,
    ...nutritionProfile,
    equipmentLocation: equipmentProfile.location || userProfile.equipmentLocation || 'home',
    homeEquipment: Array.isArray(equipmentProfile.homeEquipment) ? equipmentProfile.homeEquipment : [],
    height: toNumOrStr(userProfile.height),
    weight: toNumOrStr(userProfile.weight),
    age:    toNumOrStr(userProfile.age),
    goal:   userProfile.goal || userProfile.fitnessGoal || '',
    activityLevel: userProfile.activityLevel || '',
    gender: userProfile.gender || '',
    name:   userProfile.name || ''
  };

  const missing = [];
  if (!profile.height) missing.push('height');
  if (!profile.weight) missing.push('weight');
  if (!profile.age) missing.push('age');
  if (!profile.goal) missing.push('goal');
  if (!profile.activityLevel) missing.push('activityLevel');

  const complete = missing.length === 0;
  return { profile, complete, missing };
}

/* ───────── Prompts ───────── */
function buildSchedulePromptSingle(profile, type, query) {
  const typeLabel = type === 'fullbody' ? 'fullbody' : (type === 'halfbody' ? 'halfbody' : 'split');
  return `Tu es un coach de musculation.
PROFIL: ${JSON.stringify(profile)}
TÂCHE: Propose exactement 1 programme de type "${typeLabel}" et renvoie UNIQUEMENT un objet JSON avec SES MÉTADONNÉES et SON SCHEDULE (pas de markdown, pas de texte).

CONTRAINTES DE SORTIE (JSON strict, un seul objet) :
{
  "id": "program_${typeLabel}_<timestamp>",
  "type": "${typeLabel}",
  "title": "…",
  "description": "…",
  "level": "débutant|intermédiaire|avancé",
  "duration": "4 à 12 semaines",
  "frequency": "3x/semaine|4x/semaine|5x/semaine|6x/semaine",
  "sessionDuration": "45-90 min",
  "tips": ["…","…"],
  "schedule": ["JOURS_FR"]
}

RÈGLES POUR "schedule":
- 3 à 7 jours, tous distincts, choisis parmi: ${JSON.stringify(DAY_ORDER)}.
- Respecte strictement les noms FR.
- Ne renvoie AUCUN texte hors JSON.${query ? `\nCONTEXTE: ${query}` : ''}`;
}

function buildSchedulePromptSingleV2(profile, type, query) {
  const typeLabel = type === 'fullbody' ? 'fullbody' : (type === 'halfbody' ? 'halfbody' : 'split');
  // few-shot ultra-explicite
  const example = {
    id: `program_${typeLabel}_1234567890`,
    type: typeLabel,
    title: "Exemple Programme",
    description: "Exemple strict",
    level: "intermédiaire",
    duration: "8 semaines",
    frequency: "4x/semaine",
    sessionDuration: "60 min",
    tips: ["Respiration contrôlée","Échauffement systématique"],
    schedule: ["Lundi","Mardi","Jeudi","Vendredi"]
  };
  return `Réponds UNIQUEMENT par un objet JSON strict, sans markdown et sans texte additionnel.
Exemple de format (à ADAPTER, pas à répéter) :
${JSON.stringify(example)}

Contexte:
PROFIL: ${JSON.stringify(profile)}
TYPE: "${typeLabel}"
JOURS AUTORISÉS: ${JSON.stringify(DAY_ORDER)}
RÈGLES:
- "schedule" contient 3 à 7 jours, uniques, choisis uniquement parmi les jours autorisés.
- Utilise les noms français exactement.
- AUCUN autre texte.

${query ? `CONTEXTE LIBRE: ${query}` : ''}`;
}

function buildDayPrompt(programMeta, day, profile) {
  return `Tu es un coach de musculation.
PROFIL: ${JSON.stringify(profile)}
PROGRAMME_META: ${JSON.stringify({
    id: programMeta.id,
    type: programMeta.type,
    level: programMeta.level,
    duration: programMeta.duration,
    frequency: programMeta.frequency,
    sessionDuration: programMeta.sessionDuration
  })}

TÂCHE: Génère le WORKOUT COMPLET pour le jour "${day}".
CONTRAINTES:
Réponds UNIQUEMENT avec un JSON strict:
{
  "day": "${day}",
  "name": "...",
  "duration": "${programMeta.sessionDuration || '60 min'}",
  "exercises": [
    { "name":"...", "sets":4, "reps":"8-12", "rest":"90s", "type":"compound|isolation|warmup", "targetMuscles":["..."] },
    { "name":"...", "sets":3, "reps":"10-12", "rest":"60-120s", "type":"isolation", "targetMuscles":["..."] },
    { "name":"...", "sets":3, "reps":"10-12", "rest":"60-120s", "type":"isolation", "targetMuscles":["..."] },
    { "name":"...", "sets":3, "reps":"10-12", "rest":"60-120s", "type":"isolation", "targetMuscles":["..."] }
  ]
}
- Minimum 4 exercices pertinents.
- AUCUN texte hors JSON.`;
}

/* ───────── Validation & parsing ───────── */
function extractJSON(text) {
  if (!text) return null;
  const t = String(text).trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) {
    try { return JSON.parse(m[1]); } catch {}
  }
  return null;
}

async function callJSONLoose(llmFn, prompt) {
  const raw = await llmFn(prompt, { temperature: 0.2 });
  const cleaned = String(raw || '').replace(/```json|```/g, '').trim();
  const parsed = extractJSON(cleaned);
  if (!parsed) throw new Error('invalid JSON');
  return parsed;
}

function normalizeSchedule(input) {
  // accepte array, string CSV, ou mélange anglais
  let arr = [];
  if (Array.isArray(input)) arr = input.slice();
  else if (typeof input === 'string') {
    arr = input.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
  }

  arr = arr.map(d => EN2FR[d] || d);            // map EN -> FR si besoin
  arr = arr.filter(d => DAY_ORDER.includes(d)); // garde FR valides uniquement

  // dédoublonnage en conservant l'ordre
  const seen = new Set();
  arr = arr.filter(d => (seen.has(d) ? false : (seen.add(d), true)));
  return arr;
}

function validateScheduleProg(p) {
  const errs = [];
  const s = normalizeSchedule(p && p.schedule);

  if (s.length < 3 || s.length > 7) errs.push('schedule length 3..7');
  if (s.some(d => !DAY_ORDER.includes(d))) errs.push('schedule must be FR names');

  ['id','type','title','description','level','duration','frequency','sessionDuration'].forEach(k=>{
    if (!p || !p[k]) errs.push(`missing ${k}`);
  });

  return { ok: errs.length === 0, errs, schedule: s };
}

function validateWorkoutDay(w, expectedDay) {
  const errs = [];
  if (!w || w.day !== expectedDay) errs.push(`day must be ${expectedDay}`);
  if (!Array.isArray(w && w.exercises) || w.exercises.length < 4) errs.push('exercises >= 4');
  for (const e of (w && w.exercises) || []) {
    if (!e || !e.name || typeof e.sets !== 'number' || !e.reps) {
      errs.push('exercise fields missing'); break;
    }
  }
  return { ok: errs.length === 0, errs };
}

/* ───────── Génération “staged” robuste ───────── */
async function requestScheduleMetaStrict(profile, type, query, maxRetries = 3) {
  let lastErr = 'init';
  // passe 1: prompt simple
  for (let i = 1; i <= maxRetries; i++) {
    const prompt = i === 1
      ? buildSchedulePromptSingle(profile, type, query)
      : buildSchedulePromptSingle(profile, type, `${query}\nCorrige: ${lastErr}`);
    try {
      const obj = await callJSONLoose(mistralService.generateCustomContent, prompt);
      const { ok, errs, schedule } = validateScheduleProg(obj);
      if (!ok) throw new Error(errs.join(', '));
      obj.schedule = schedule; // injecte la version normalisée
      return obj;
    } catch (e) {
      lastErr = e.message || 'invalid JSON';
      // eslint-disable-next-line no-console
      console.warn(`[LLM] schedule ${type} retry#${i} -> ${lastErr}`);
    }
  }

  // passe 2: few-shot exemple strict
  for (let i = 1; i <= maxRetries; i++) {
    const prompt = i === 1
      ? buildSchedulePromptSingleV2(profile, type, query)
      : buildSchedulePromptSingleV2(profile, type, `${query}\nCorrige: ${lastErr}`);
    try {
      const obj = await callJSONLoose(mistralService.generateCustomContent, prompt);
      const { ok, errs, schedule } = validateScheduleProg(obj);
      if (!ok) throw new Error(errs.join(', '));
      obj.schedule = schedule;
      return obj;
    } catch (e) {
      lastErr = e.message || 'invalid JSON';
      console.warn(`[LLM] schedule-v2 ${type} retry#${i} -> ${lastErr}`);
    }
  }

  // Si toutes les tentatives échouent, construire un fallback local et logging
  console.warn(`[LLM] schedule generation failed for ${type}, using local fallback`);

  // Heuristique de fallback : définir une fréquence par défaut suivant le type
  const defaultSessionsByType = { fullbody: 3, halfbody: 4, split: 5 };
  const sessions = defaultSessionsByType[type] || 3;

  // Choisir des jours distribués sur la semaine
  const interval = Math.floor(7 / sessions) || 1;
  const schedule = [];
  for (let i = 0; i < sessions; i++) {
    schedule.push(DAY_ORDER[(i * interval) % 7]);
  }

  // Construire un objet meta minimal valide attendu par le reste du pipeline
  const timestamp = Date.now();
  const fallbackMeta = {
    id: `program_${type}_${timestamp}`,
    type,
    title: `Programme ${type.charAt(0).toUpperCase() + type.slice(1)} (fallback)`,
    description: `Programme généré en fallback après échec LLM pour le type ${type}`,
    level: 'intermédiaire',
    duration: `${4 + (type === 'split' ? 4 : 0)} semaines`,
    frequency: `${sessions}x/semaine`,
    sessionDuration: type === 'split' ? '75 min' : (type === 'halfbody' ? '60 min' : '45 min'),
    tips: ['Échauffez-vous', 'Respectez les temps de repos'],
    schedule: schedule
  };

  return fallbackMeta;
}

async function generateWorkoutProgramsStaged(profile, query = '', maxRetries = 3) {
  // 1) Génère 1 meta par type
  const types = ['fullbody','halfbody','split'];
  const metas = [];
  for (const type of types) {
    const meta = await requestScheduleMetaStrict(profile, type, query, maxRetries);
    metas.push(meta);
  }

  // 2) Génère les workouts jour par jour pour chaque meta
  const programs = [];
  for (const meta of metas) {
    const workouts = [];
    for (const day of meta.schedule) {
      let w = null;
      let lastErr = 'init';
      for (let i = 1; i <= maxRetries; i++) {
        const prompt = i === 1
          ? buildDayPrompt(meta, day, profile)
          : buildDayPrompt(meta, day, profile) + `\nCorrige: ${lastErr}`;
        try {
          const obj = await callJSONLoose(mistralService.generateCustomContent, prompt);
          const v = validateWorkoutDay(obj, day);
          if (!v.ok) throw new Error(v.errs.join(', '));
          w = obj;
          break;
        } catch (e) {
          lastErr = e.message || 'invalid JSON';
          console.warn(`[LLM] day "${day}" retry#${i} -> ${lastErr}`);
        }
      }
      if (!w) throw new Error(`Day generation failed for ${day}`);
      workouts.push(w);
    }
    workouts.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));
    programs.push({
      id: meta.id,
      type: meta.type,
      title: meta.title,
      description: meta.description,
      level: meta.level,
      duration: meta.duration,
      frequency: meta.frequency,
      sessionDuration: meta.sessionDuration,
      tips: Array.isArray(meta.tips) ? meta.tips : [],
      schedule: meta.schedule.slice(),
      workouts
    });
  }

  return programs;
}

/* ───────── Helpers format ───────── */
function formatNutritionAsSearchResults(nutritionPlan) {
  if (!nutritionPlan || !nutritionPlan.recipes) return [];
  return nutritionPlan.recipes.map((recipe) => ({
    title: recipe.name,
    snippet: recipe.description,
    link: `#recipe-${recipe.id}`,
    displayLink: 'mistral.ai',
    pagemap: { cse_image: [{ src: recipe.image }] },
    calories: recipe.calories,
    protein: recipe.protein,
    time: recipe.time,
    aiGenerated: true,
    source: 'Mistral AI'
  }));
}

function formatWorkoutsAsSearchResults(programs) {
  return programs.map((program) => ({
    title: program.title,
    snippet: program.description,
    link: `#program-${program.id}`,
    displayLink: 'mistral.ai',
    pagemap: { cse_image: [{ src: program.thumbnail }] },
    level: program.level,
    duration: program.duration,
    equipment: program.equipment,
    aiGenerated: true,
    source: 'Mistral AI'
  }));
}

/* ───────── Service principal ───────── */
export const mistralSearchService = {
  searchGoogle: async (query, userGoal = null) => {
    console.log(`🤖 Génération Mistral pour: "${query}" (objectif: ${userGoal})`);
    try {
      const { profile } = getMergedProfile();
      const q = (query || '').toLowerCase();

      if (q.includes('recette') || q.includes('nutrition') || q.includes('protéine')) {
        const nutritionPlan = await mistralService.generateNutritionPlans(profile, query);
        return formatNutritionAsSearchResults(nutritionPlan);
      } else if (q.includes('programme') || q.includes('musculation') || q.includes('entraînement')) {
        const programs = await generateWorkoutProgramsStaged(profile, query);
        return formatWorkoutsAsSearchResults(programs);
      } else {
        if (userGoal === 'gain_muscle' || userGoal === 'lose_weight') {
          const programs = await generateWorkoutProgramsStaged(profile, query);
          return formatWorkoutsAsSearchResults(programs);
        } else {
          const nutritionPlan = await mistralService.generateNutritionPlans(profile, query);
          return formatNutritionAsSearchResults(nutritionPlan);
        }
      }
    } catch (error) {
      console.error('Erreur génération Mistral:', error);
      return mistralSearchService.getFallbackSearchResults(query, userGoal);
    }
  },

  searchMassGainRecipes: async () => {
    const { profile, complete, missing } = getMergedProfile();
    if (!complete) {
      console.warn('Profil partiellement renseigné (mass gain), génération quand même. Champs manquants:', missing);
    }
    try {
      console.log('🥗 Génération de recettes prise de masse avec Mistral');
      const recipes = await mistralService.generateMassGainRecipes(profile);
      return recipes.map((recipe) => ({
        ...recipe,
        webSearched: false,
        extractedFrom: 'mistral_ai',
        targetCalories: Math.round((recipe.calories || 600) / 4)
      }));
    } catch (error) {
      console.error('Erreur génération recettes prise de masse:', error);
      return { error: 'GENERATION_FAILED' };
    }
  },

  searchWorkoutPrograms: async (criteria) => {
    const { profile, complete, missing } = getMergedProfile();
    if (!complete) {
      console.warn('Profil partiellement renseigné (workouts), génération quand même. Champs manquants:', missing);
    }
    try {
      console.log('💪 Génération de programmes d\'entraînement (staged)');
      let queryTxt = '';
      const loc = criteria?.location || profile.equipmentLocation;
      if (loc === 'home') queryTxt += 'à domicile ';
      if (loc === 'gym')  queryTxt += 'en salle ';

      const equip = (criteria?.equipment && criteria.equipment.length ? criteria.equipment : profile.homeEquipment) || [];
      if (equip.length > 0) queryTxt += `avec ${equip.join(' ')} `;

      const programs = await generateWorkoutProgramsStaged(profile, queryTxt);

      return programs.map((program) => ({
        id: program.id,
        title: program.title,
        description: program.description,
        level: program.level,
        duration: program.duration,
        equipment: equip.length > 0 ? equip.join(', ') : 'Aucun',
        source: 'Mistral AI',
        thumbnail: program.thumbnail || `https://source.unsplash.com/400x300/?fitness+${loc || 'workout'}`,
        workouts: program.workouts,
        schedule: program.schedule,
        goal: profile.goal,
        aiGenerated: true
      }));
    } catch (error) {
      console.error('Erreur génération programmes (staged):', error);
      return { error: 'GENERATION_FAILED' };
    }
  },

  searchNutritionPlans: async (criteria) => {
    const { profile, complete, missing } = getMergedProfile();
    if (!complete) {
      console.warn('Profil partiellement renseigné (nutrition), génération quand même. Champs manquants:', missing);
    }
    try {
      console.log('🍽️ Génération de plans nutritionnels avec Mistral');

      let queryTxt = '';
      if (criteria?.dietType) queryTxt += `régime ${criteria.dietType} `;
      if (criteria?.cookingTime === 'quick') queryTxt += 'préparation rapide ';
      if (criteria?.allergies && criteria.allergies.length > 0) queryTxt += `sans ${criteria.allergies.join(' sans ')} `;

      const nutritionPlan = await mistralService.generateNutritionPlans(profile, queryTxt);

      return {
        id: nutritionPlan.id,
        title: nutritionPlan.title,
        dietType: criteria?.dietType,
        source: 'Mistral AI',
        calorieTarget: nutritionPlan.calorieTarget,
        goal: profile.goal,
        recipes: (nutritionPlan.recipes || []).map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          source: 'Mistral AI',
          calories: r.calories,
          protein: r.protein,
          time: r.time,
          image: r.image,
          aiGenerated: true
        }))
      };
    } catch (error) {
      console.error('Erreur génération plans nutritionnels:', error);
      return { error: 'GENERATION_FAILED' };
    }
  },

  formatNutritionAsSearchResults,
  formatWorkoutsAsSearchResults,

  getFallbackSearchResults() {
    console.log('🔄 Utilisation des résultats de fallback');
    return [{
      title: 'Programme personnalisé généré automatiquement',
      snippet: 'Programme adapté à votre profil et vos objectifs.',
      link: '#generated-program',
      displayLink: 'fitness-app.local',
      pagemap: { cse_image: [{ src: 'https://source.unsplash.com/400x300/?fitness' }] },
      aiGenerated: false,
      source: 'Fallback'
    }];
  }
};

/* ───────── Service avancé ───────── */
export const enhancedMistralService = {
  generateByGoal: async (goal, userProf) => {
    const { profile } = getMergedProfile();
    const base = userProf || profile;
    const goalPrompts = {
      'lose_weight': 'programmes cardio et nutrition hypocalorique',
      'gain_muscle': 'programmes musculation et nutrition hyperprotéinée',
      'tone_up': 'programmes tonification et nutrition équilibrée',
      'endurance': 'programmes cardio endurance et nutrition énergétique',
      'flexibility': 'programmes étirement yoga et nutrition anti-inflammatoire'
    };
    const prompt = goalPrompts[goal] || 'programmes fitness équilibrés';
    const [programs, nutrition] = await Promise.all([
      generateWorkoutProgramsStaged(base, prompt),
      mistralService.generateNutritionPlans(base, prompt)
    ]);
    return { programs, nutrition, goal, generatedAt: new Date().toISOString() };
  },

  generateProgressiveContent: async (userProf, currentWeek = 1) => {
    const { profile } = getMergedProfile();
    const base = userProf || profile;
    const progressPrompt = `semaine ${currentWeek}, progression adaptée au niveau`;
    const programs = await generateWorkoutProgramsStaged(base, progressPrompt);
    return programs.map((p) => ({ ...p, week: currentWeek, progressive: true }));
  },

  generateWeeklyMealPlan: async (userProf, preferences = {}) => {
    const { profile } = getMergedProfile();
    const base = userProf || profile;
    const mealPrompt = `plan repas semaine complète ${preferences.focus || ''}`;
    const nutritionPlan = await mistralService.generateNutritionPlans(base, mealPrompt);
    const weeklyPlan = organizeRecipesByWeek(nutritionPlan.recipes || []);
    return { ...nutritionPlan, weeklyPlan, organized: true };
  }
};

function organizeRecipesByWeek(recipes) {
  const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const meals = ['petit-dejeuner', 'dejeuner', 'collation', 'diner'];
  const weekPlan = {};
  days.forEach((day, dayIndex) => {
    weekPlan[day] = {};
    meals.forEach((meal, mealIndex) => {
      const recipeIndex = (dayIndex * meals.length + mealIndex) % (recipes.length || 1);
      weekPlan[day][meal] = recipes[recipeIndex] || null;
    });
  });
  return weekPlan;
}

export default mistralSearchService;