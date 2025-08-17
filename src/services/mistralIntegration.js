// src/services/mistralIntegration.js
import { mistralService } from './mistralService';

/* ───────── Config usage IA ───────── */
const USE_LOCAL_FALLBACK = false; // ↤ par défaut: on privilégie l'IA, pas de secours
const MAX_RETRIES_JSON = 4;       // plus d'essais côté IA avant d'abandonner
const DAY_ORDER = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

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

  return [
    'Tu es un coach de musculation.',
    `PROFIL: ${JSON.stringify(profile)}`,
    `TÂCHE: Propose exactement 1 programme de type "${typeLabel}" et renvoie UNIQUEMENT ses MÉTADONNÉES et son SCHEDULE au format JSON strict.`,
    '',
    'CONTRAINTES DE SORTIE (objet JSON unique) :',
    '{',
    '  "id": "program_${typeLabel}_<id>",',
    '  "type": "' + typeLabel + '",',
    '  "title": "…",',
    '  "description": "…",',
    '  "level": "débutant|intermédiaire|avancé",',
    '  "duration": "4-12 semaines",',
    '  "frequency": "3x/semaine|4x/semaine|5x/semaine|6x/semaine",',
    '  "sessionDuration": "45-90 min",',
    '  "tips": ["…","…"],',
    '  "schedule": ["JOURS_FR"]',
    '}',
    '',
    'RÈGLES POUR "schedule":',
    `- 3 à 7 jours, tous distincts, choisis parmi: ${JSON.stringify(DAY_ORDER)}.`,
    '- Respecte strictement les noms en français (exactement comme dans la liste).',
    '- Ne renvoie AUCUN texte hors JSON.',
    query ? `CONTEXTE: ${query}` : ''
  ].join('\n');
}

function buildDayPrompt(programMeta, day, profile) {
  return [
    'Tu es un coach de musculation.',
    `PROFIL: ${JSON.stringify(profile)}`,
    'PROGRAMME_META: ' + JSON.stringify({
      id: programMeta.id,
      type: programMeta.type,
      level: programMeta.level,
      duration: programMeta.duration,
      frequency: programMeta.frequency,
      sessionDuration: programMeta.sessionDuration
    }),
    '',
    `TÂCHE: Génère le WORKOUT COMPLET pour le jour "${day}".`,
    'Réponds UNIQUEMENT avec un objet JSON strict de la forme:',
    '{',
    `  "day": "${day}",`,
    '  "name": "…",',
    `  "duration": "${programMeta.sessionDuration || '60 min'}",`,
    '  "exercises": [',
    '    { "name":"…", "sets":4, "reps":"8-12", "rest":"90s", "type":"compound|isolation|warmup", "targetMuscles":["…"] },',
    '    { "name":"…", "sets":3, "reps":"10-12", "rest":"60-120s", "type":"isolation", "targetMuscles":["…"] },',
    '    { "name":"…", "sets":3, "reps":"10-12", "rest":"60-120s", "type":"isolation", "targetMuscles":["…"] },',
    '    { "name":"…", "sets":3, "reps":"10-12", "rest":"60-120s", "type":"isolation", "targetMuscles":["…"] }',
    '  ]',
    '}',
    '- Minimum 4 exercices pertinents.',
    '- AUCUN texte hors JSON.'
  ].join('\n');
}

/* ───────── Validation & Normalisation ───────── */
function normalizeDayName(d) {
  if (!d) return d;
  const map = {
    'lundi':'Lundi','mardi':'Mardi','mercredi':'Mercredi','jeudi':'Jeudi',
    'vendredi':'Vendredi','samedi':'Samedi','dimanche':'Dimanche'
  };
  const key = String(d).trim().toLowerCase();
  return map[key] || d;
}

function validateScheduleProg(p) {
  const errs = [];
  const s = Array.isArray(p && p.schedule) ? p.schedule.map(normalizeDayName) : [];

  if (s.length < 3 || s.length > 7) errs.push('schedule length 3..7');
  if (new Set(s).size !== s.length) errs.push('schedule unique days');
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
    if (!e || !e.name || typeof e.sets !== 'number' || !e.reps) { errs.push('exercise fields missing'); break; }
  }
  return { ok: errs.length === 0, errs };
}

/* ───────── Parse JSON robuste ───────── */
function extractJSON(text) {
  if (!text) return null;
  const t = String(text).trim();

  // direct
  try { return JSON.parse(t); } catch {}

  // balises de code
  const cleaned = t.replace(/```json|```/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}

  // premier objet/tableau
  const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) {
    try { return JSON.parse(m[1]); } catch {}
  }

  // micro-réparations: quotes droites, trailing commas
  const fixed = cleaned
    .replace(/[“”]/g, '"')
    .replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(fixed); } catch {}

  return null;
}

// Replace callJSONStrict and callJSONBestEffort with tolerant implementations
async function callJSONStrict(llmFn, prompt) {
  // call LLM in "json" mode if supported, and accept object results or wrapped content
  const raw = await llmFn(prompt, { temperature: 0.2, response_format: 'json', stop: [] });

  // Helper to extract text/content from common wrapper shapes
  function extractContentFromWrapper(r) {
    if (r == null) return null;
    if (Array.isArray(r)) return r;
    if (typeof r === 'object') {
      // Already a likely JSON object (e.g., the desired object)
      const keys = Object.keys(r || {});
      if (keys.includes('id') || keys.includes('schedule') || keys.includes('exercises')) return r;

      // OpenAI-like: choices[0].message.content or choices[0].text
      if (Array.isArray(r.choices) && r.choices[0]) {
        const c = r.choices[0];
        if (c.message && (typeof c.message.content === 'object' || typeof c.message.content === 'string')) return c.message.content;
        if (typeof c.text !== 'undefined') return c.text;
        if (c.content) return c.content;
      }

      // Some APIs: message/content at root
      if (r.message && r.message.content) return r.message.content;
      if (r.content) return r.content;

      // Some APIs: data/output arrays
      if (Array.isArray(r.data) && r.data[0] && (r.data[0].text || r.data[0].content)) {
        return r.data[0].text || r.data[0].content;
      }
      if (Array.isArray(r.output) && r.output[0] && r.output[0].content) {
        return r.output[0].content;
      }

      // Fallback: return the object itself (it might already be the parsed JSON)
      return r;
    }
    // string or other
    return r;
  }

  const candidate = extractContentFromWrapper(raw);

  // If candidate is object/array -> accept it
  if (candidate && (typeof candidate === 'object')) return candidate;

  // Otherwise try to parse string content robustly
  const text = String(candidate || '').trim();
  const parsed = extractJSON(text);
  if (!parsed) throw new Error('invalid JSON');
  return parsed;
}

async function callJSONBestEffort(llmFn, prompt) {
  // Try strict first, then fall back to a non-formatted call and tolerant parsing
  try {
    return await callJSONStrict(llmFn, prompt);
  } catch (strictErr) {
    // Best-effort: ask without forcing JSON format
    const raw = await llmFn(prompt, { temperature: 0.2 });
    // Reuse wrapper extraction logic
    function extractContentFromWrapper(r) {
      if (r == null) return null;
      if (Array.isArray(r)) return r;
      if (typeof r === 'object') {
        if (r.id || r.schedule || r.exercises) return r;
        if (Array.isArray(r.choices) && r.choices[0]) {
          const c = r.choices[0];
          if (c.message && (typeof c.message.content === 'object' || typeof c.message.content === 'string')) return c.message.content;
          if (typeof c.text !== 'undefined') return c.text;
          if (c.content) return c.content;
        }
        if (r.message && r.message.content) return r.message.content;
        if (r.content) return r.content;
        if (Array.isArray(r.data) && r.data[0] && (r.data[0].text || r.data[0].content)) {
          return r.data[0].text || r.data[0].content;
        }
        if (Array.isArray(r.output) && r.output[0] && r.output[0].content) {
          return r.output[0].content;
        }
        return r;
      }
      return r;
    }

    const candidate = extractContentFromWrapper(raw);

    if (candidate && typeof candidate === 'object') return candidate;

    const parsed = extractJSON(String(candidate || ''));
    if (!parsed) throw new Error('invalid JSON');
    return parsed;
  }
}

/* ───────── IA d’abord : génération staged ───────── */
async function requestScheduleMetaStrict(profile, type, query) {
  let lastErr = 'init';
  for (let i = 1; i <= MAX_RETRIES_JSON; i++) {
    const prompt = i === 1
      ? buildSchedulePromptSingle(profile, type, query)
      : buildSchedulePromptSingle(profile, type, `${query}\nCorrige: ${lastErr}\n(Rappelle-toi: JSON strict, aucun texte hors JSON)`);

    try {
      // pass bound method so "this" inside generateCustomContent is correct
      const obj = await callJSONBestEffort(mistralService.generateCustomContent.bind(mistralService), prompt);
      const v = validateScheduleProg(obj);
      if (!v.ok) throw new Error(v.errs.join(', '));
      // normalise les jours si l'IA a mis des minuscules
      obj.schedule = v.schedule;
      return obj;
    } catch (e) {
      lastErr = e?.message || 'invalid JSON';
      console.warn(`[LLM] schedule ${type} retry#${i} -> ${lastErr}`);
    }
  }
  if (USE_LOCAL_FALLBACK) {
    console.warn(`[LLM] schedule generation failed for ${type} , using local fallback`);
    // petit secours formaté (facultatif)
    const fallback = {
      id: `program_${type}_${Math.floor(Math.random()*1e6).toString().padStart(6,'0')}`,
      type,
      title: type === 'fullbody' ? 'Fullbody 3 jours' : (type === 'halfbody' ? 'Halfbody 4 jours' : 'Split 5 jours'),
      description: 'Programme généré en secours local.',
      level: 'intermédiaire',
      duration: '8 semaines',
      frequency: type === 'fullbody' ? '3x/semaine' : (type === 'halfbody' ? '4x/semaine' : '5x/semaine'),
      sessionDuration: '60 min',
      tips: ['Hydrate-toi', 'Échauffement 10 min'],
      schedule: type === 'fullbody'
        ? ['Lundi','Mercredi','Vendredi']
        : type === 'halfbody'
          ? ['Lundi','Mardi','Jeudi','Vendredi']
          : ['Lundi','Mardi','Jeudi','Vendredi','Samedi']
    };
    return fallback;
  }
  throw new Error(`Schedule generation failed for ${type}`);
}

async function requestWorkoutDayStrict(meta, day, profile) {
  let lastErr = 'init';
  for (let i = 1; i <= MAX_RETRIES_JSON; i++) {
    const prompt = i === 1
      ? buildDayPrompt(meta, day, profile)
      : buildDayPrompt(meta, day, profile) + `\nCorrige: ${lastErr}\n(Rappelle-toi: JSON strict, aucun texte hors JSON)`;
    try {
      // pass bound method so "this" inside generateCustomContent is correct
      const obj = await callJSONBestEffort(mistralService.generateCustomContent.bind(mistralService), prompt);
      const v = validateWorkoutDay(obj, day);
      if (!v.ok) throw new Error(v.errs.join(', '));
      return obj;
    } catch (e) {
      lastErr = e?.message || 'invalid JSON';
      console.warn(`[LLM] day "${day}" retry#${i} -> ${lastErr}`);
    }
  }
  if (USE_LOCAL_FALLBACK) {
    console.warn(`[LLM] day generation failed for ${day}, using local fallback`);
    return {
      day,
      name: `${meta.type.toUpperCase()} - ${day}`,
      duration: meta.sessionDuration || '60 min',
      exercises: [
        { name: 'Squat', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Quadriceps','Fessiers'] },
        { name: 'Développé couché', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Pectoraux','Triceps'] },
        { name: 'Rowing barre', sets: 3, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Dos','Biceps'] },
        { name: 'Plank', sets: 3, reps: '45-60s', rest: '60s', type: 'isolation', targetMuscles: ['Core'] },
      ]
    };
  }
  throw new Error(`Day generation failed for ${day}`);
}

async function generateWorkoutProgramsStaged(profile, query = '') {
  // 1) Métadonnées IA pour chaque type x niveau
  const types = ['fullbody','halfbody','split'];
  const levels = ['débutant','intermédiaire','avancé'];
  const metas = [];
  // request one meta per (type, level) to produce multiple variations
  for (const type of types) {
    for (const level of levels) {
      const levelQuery = `${query} niveau: ${level}`;
      const meta = await requestScheduleMetaStrict(profile, type, levelQuery);
      // ensure meta.level reflects requested level (some LLMs may ignore; we enforce)
      meta.level = meta.level || level;
      metas.push(meta);
    }
  }

  // 2) Jours IA pour chaque programme
  const programs = [];
  for (const meta of metas) {
    const workouts = [];
    for (const day of meta.schedule) {
      const w = await requestWorkoutDayStrict(meta, day, profile);
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
    console.log(`🤖 Génération Mistral (IA first) pour: "${query}" (objectif: ${userGoal})`);
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
      // IA first: on NE bascule PAS sur des résultats simulés, on renvoie un message d’erreur clair
      return { error: 'GENERATION_FAILED', reason: String(error?.message || error) };
    }
  },

  searchMassGainRecipes: async () => {
    const { profile, complete, missing } = getMergedProfile();
    if (!complete) {
      console.warn('Profil partiellement renseigné (mass gain), génération quand même. Champs manquants:', missing);
    }
    try {
      console.log('🥗 Génération de recettes prise de masse (IA first)');
      const recipes = await mistralService.generateMassGainRecipes(profile);
      return recipes.map((recipe) => ({
        ...recipe,
        webSearched: false,
        extractedFrom: 'mistral_ai',
        targetCalories: Math.round((recipe.calories || 600) / 4)
      }));
    } catch (error) {
      console.error('Erreur génération recettes prise de masse:', error);
      return { error: 'GENERATION_FAILED', reason: String(error?.message || error) };
    }
  },

  searchWorkoutPrograms: async (criteria) => {
    const { profile, complete, missing } = getMergedProfile();
    if (!complete) {
      console.warn('Profil partiellement renseigné (workouts), génération quand même. Champs manquants:', missing);
    }
    try {
      console.log('💪 Génération de programmes d\'entraînement (staged, IA first)');
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
      console.error('Erreur génération programmes (IA first):', error);
      return { error: 'GENERATION_FAILED', reason: String(error?.message || error) };
    }
  },

  searchNutritionPlans: async (criteria) => {
    const { profile, complete, missing } = getMergedProfile();
    if (!complete) {
      console.warn('Profil partiellement renseigné (nutrition), génération quand même. Champs manquants:', missing);
    }
    try {
      console.log('🍽️ Génération de plans nutritionnels (IA first)');
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
      return { error: 'GENERATION_FAILED', reason: String(error?.message || error) };
    }
  },

  // Helpers d’affichage
  formatNutritionAsSearchResults,
  formatWorkoutsAsSearchResults,

  // (facultatif) Fallback générique — non utilisé si USE_LOCAL_FALLBACK=false
  getFallbackSearchResults(query, userGoal) {
    if (!USE_LOCAL_FALLBACK) {
      return [{ error: 'GENERATION_FAILED', reason: 'Fallback disabled (IA first)' }];
    }
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
    const programs = await generateWorkoutProgramsStaged(base, prompt);
    const nutrition = await mistralService.generateNutritionPlans(base, prompt);
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
