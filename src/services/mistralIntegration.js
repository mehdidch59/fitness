// src/services/mistralIntegration.js
import { mistralService } from './mistralService';

/* ───────── Config usage IA ───────── */
const USE_LOCAL_FALLBACK = false; // ↤ par défaut: on privilégie l'IA, pas de secours
const MAX_RETRIES_JSON = 4;       // plus d'essais côté IA avant d'abandonner
const DAY_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

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

  try { userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}'); } catch { }
  try { equipmentProfile = JSON.parse(localStorage.getItem('equipmentProfile') || '{}'); } catch { }
  try { nutritionProfile = JSON.parse(localStorage.getItem('nutritionProfile') || '{}'); } catch { }

  const profile = {
    ...userProfile,
    ...nutritionProfile,
    equipmentLocation: equipmentProfile.location || userProfile.equipmentLocation || 'home',
    homeEquipment: Array.isArray(equipmentProfile.homeEquipment) ? equipmentProfile.homeEquipment : [],
    height: toNumOrStr(userProfile.height),
    weight: toNumOrStr(userProfile.weight),
    age: toNumOrStr(userProfile.age),
    goal: userProfile.goal || userProfile.fitnessGoal || '',
    activityLevel: userProfile.activityLevel || '',
    gender: userProfile.gender || '',
    name: userProfile.name || ''
  };

  // Calculer IMC et morphologie simple (carrure) si possible
  try {
    const h = parseFloat(String(profile.height).replace(',', '.')); // cm
    const w = parseFloat(String(profile.weight).replace(',', '.')); // kg
    if (Number.isFinite(h) && h > 0 && Number.isFinite(w) && w > 0) {
      const meters = h / 100;
      const bmi = w / (meters * meters);
      profile.bmi = Math.round(bmi * 10) / 10;
      profile.bodyType = bmi < 18.5 ? 'lean' : (bmi < 25 ? 'normal' : (bmi < 30 ? 'overweight' : 'obese'));
    }
  } catch { }

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
function buildSchedulePromptSingle(profile, type, query, options = {}) {
  const typeLabel = type === 'fullbody' ? 'fullbody' : (type === 'halfbody' ? 'halfbody' : 'split');
  const focusMuscle = options.focusMuscleGroup ? String(options.focusMuscleGroup) : '';

  return [
    'Tu es un coach de musculation spécialisé en programmation personnalisée. Réponds STRICTEMENT en français.',
    `PROFIL: ${JSON.stringify(profile)}`,
    `TÂCHE: Propose exactement 1 programme de type "${typeLabel}" et renvoie UNIQUEMENT ses MÉTADONNÉES et son SCHEDULE au format JSON strict. Utilise l'objectif (goal), le niveau (activityLevel), l'IMC (bmi) et la carrure (bodyType), le sexe (gender) et le matériel (equipmentLocation, homeEquipment).`,
    focusMuscle ? `ACCENT MUSCULAIRE SEMAINE: ${focusMuscle} (répartis intelligemment le volume sans négliger le reste).` : '',
    '',
    'CONTRAINTES DE SORTIE (objet JSON unique) :',
    '{',
    `  "id": "program_${typeLabel}_<id>",`,
    '  "type": "' + typeLabel + '",',
    '  "title": "…",',
    '  "description": "Phrase très courte (<= 12 mots) résumant le type de programme.",',
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
    '- Varie le focus musculaire selon les jours (push/pull/legs/core selon type et pattern).',
    focusMuscle ? `- Ajoute un léger biais de volume (1-2 exercices/semaine en plus) sur: ${focusMuscle}.` : '',
    '- Ne renvoie AUCUN texte hors JSON.',
    '',
    'DIRECTIVES DE PERSONNALISATION:',
    '- Si goal = gain de muscle: hypertrophie (8–12 reps), 60–90s de repos, 5–6 exercices/séance pour intermédiaire, 6–8 pour avancé.',
    '- Si goal = perdre du poids: circuits métaboliques (12–20 reps), 30–60s de repos, 4–6 exercices/séance, priorité mouvements polyarticulaires.',
    '- Si goal = force: 3–6 reps lourds sur polyarticulaires, 120–180s de repos, accessoires 8–12 reps.',
    '- Adapte le volume avec l’IMC: bodyType = overweight/obese → volume modéré, plus de cardio/conditionning; lean/normal → volume standard ou progressif.',
    '- Utilise en priorité le matériel réellement disponible (homeEquipment) et évite d’inclure du matériel absent.',
    '- Évite les répétitions d’exercices exacts entre les jours: un même exercice ne doit pas apparaître 2 fois dans la semaine (sauf variations et core).',
    query ? `CONTEXTE: ${query}` : ''
  ].join('\n');
}

function buildDayPrompt(programMeta, day, profile, extra = {}) {
  return [
    'Tu es un coach de musculation. Réponds STRICTEMENT en français.',
    `PROFIL: ${JSON.stringify(profile)}`,
    'PROGRAMME_META: ' + JSON.stringify({
      id: programMeta.id,
      type: programMeta.type,
      pattern: programMeta.pattern || undefined,
      level: programMeta.level,
      duration: programMeta.duration,
      frequency: programMeta.frequency,
      sessionDuration: programMeta.sessionDuration
    }),
    '',
    `TÂCHE: Génère le WORKOUT COMPLET pour le jour "${day}".`,
    (extra && extra.focus ? `FOCUS_JOUR: ${extra.focus}` : ''),
    (extra && extra.focusMuscleGroup ? `ACCENT_MUSCULAIRE: ${extra.focusMuscleGroup}` : ''),
    (extra && Array.isArray(extra.usedExercises) && extra.usedExercises.length > 0
      ? `EXERCICES_DEJA_UTILISES: ${JSON.stringify(extra.usedExercises.slice(0, 30))}`
      : ''),
    (extra && Array.isArray(extra.availableEquipment) && extra.availableEquipment.length > 0
      ? `MATERIEL_DISPONIBLE: ${JSON.stringify(extra.availableEquipment)}`
      : ''),
    'Réponds UNIQUEMENT avec un objet JSON strict (pas d\'exemple d\'exercice pré-rempli) :',
    '{',
    `  "day": "${day}",`,
    '  "name": "…",',
    `  "duration": "${programMeta.sessionDuration || '60 min'}",`,
    '  "exercises": []',
    '}',
    'RÈGLES POUR "exercises":',
    '- Tableau d\'objets: { name (string), sets (number), reps (string), rest (string), type (string), targetMuscles (string[]) }',
    '- Minimum 4 exercices pertinents.',
    '- Choisis le NOMBRE d’exercices selon le niveau (débutant: 4–5, intermédiaire: 5–6, avancé: 6–8).',
    '- Ajuste les RANGES de reps/repos selon goal: hypertrophie (8–12, 60–90s) / force (3–6, 120–180s) / perte de poids (12–20, 30–60s).',
    '- Varie les patterns (pousser/tirer/jambes/core) et évite de répéter un même exercice exact utilisé un autre jour de ce programme; propose des variations si besoin (incliné, prise différente, unilatéral).',
    '- Si ACCENT_MUSCULAIRE est présent cette semaine, augmente légèrement le volume (ex: 1 exercice supplémentaire ou variation ciblée) sans déséquilibrer la séance.',
    '- Si FOCUS_JOUR = Upper/Haut du corps: n\'inclure aucun exercice jambes. Si Lower/Bas du corps: n\'inclure aucun exercice du haut du corps (sauf core).',
    '- Utilise le matériel disponible, et varie l\'outil entre les jours si possible (poids du corps, élastiques, kettlebell, haltères selon disponibilité).',
    '- Utilise UNIQUEMENT le matériel disponible (homeEquipment).',
    '- Fais preuve de créativité: ne te base pas sur des modèles d\'exercices donnés en exemple.',
    '- Évite les répétitions d’exercices exacts entre les jours.',
    '- AUCUN texte hors JSON.'
  ].join('\n');
}

/* ───────── Recommandations type/pattern ───────── */
function inferLevelFromProfile(profile) {
  const lvl = String(profile.activityLevel || '').toLowerCase();
  if (lvl.includes('début') || lvl.includes('begin')) return 'débutant';
  if (lvl.includes('avanç') || lvl.includes('advance')) return 'avancé';
  return 'intermédiaire';
}

function recommendProgramSpec(profile) {
  const level = inferLevelFromProfile(profile);
  const goal = String(profile.goal || '').toLowerCase();
  const loc = (profile.equipmentLocation || 'home').toLowerCase();
  const eq = Array.isArray(profile.homeEquipment) ? profile.homeEquipment : [];
  const hasGym = loc === 'gym';
  const hasMinHomeEq = eq.length > 0;
  const bodyType = String(profile.bodyType || '').toLowerCase();

  // Defaults
  let type = 'fullbody';
  let pattern = 'FB-3';
  let frequency = 3;

  // Goal-driven selection
  const isFatLoss = goal.includes('perte') || goal.includes('maigr') || goal.includes('cut') || goal.includes('weight');
  const isStrength = goal.includes('force') || goal.includes('strength');
  const isHypertrophy = goal.includes('gain') || goal.includes('muscle') || goal.includes('hypert');

  if (isStrength) {
    if (hasGym || hasMinHomeEq) { type = 'halfbody'; pattern = 'UL-4'; frequency = 4; }
    else { type = 'fullbody'; pattern = 'FB-3'; frequency = 3; }
  } else if (isHypertrophy) {
    if (hasGym && level === 'avancé') { type = 'split'; pattern = 'PPL-5'; frequency = 5; }
    else if ((hasGym || hasMinHomeEq) && level !== 'débutant') { type = 'halfbody'; pattern = 'UL-4'; frequency = 4; }
    else { type = 'fullbody'; pattern = 'FB-3'; frequency = 3; }
  } else if (isFatLoss) {
    type = 'fullbody'; pattern = 'FB-3'; frequency = 3;
  } else {
    // default by level
    if (level === 'avancé' && hasGym) { type = 'split'; pattern = 'PPL-5'; frequency = 5; }
    else if (level !== 'débutant' && (hasGym || hasMinHomeEq)) { type = 'halfbody'; pattern = 'UL-4'; frequency = 4; }
  }

  // Adjust for bodyType
  if (bodyType === 'obese' || bodyType === 'overweight') {
    type = 'fullbody'; pattern = 'FB-3'; frequency = 3;
  }

  return { type, pattern, frequency, level };
}

async function generateWorkoutProgramsAuto(profile, rec, query = '', focusMuscleGroup = '') {
  // Build contextual query for the LLM
  const patternHint = rec.pattern === 'UL-4'
    ? 'pattern Upper/Lower 4 jours (Haut/Bas alternés)'
    : rec.pattern === 'PPL-5'
      ? 'pattern Push/Pull/Legs 5 jours'
      : 'pattern FullBody 3 jours (séances globales)';

  const enrichedQuery = `${query} ${patternHint}. Fréquence souhaitée: ${rec.frequency} jours/semaine. Niveau: ${rec.level}.`;

  // 1) Métadonnées IA pour le type recommandé
  let meta;
  try {
    // Essayer avec accent musculaire si demandé
    meta = await requestScheduleMetaStrict(profile, rec.type, enrichedQuery, { focusMuscleGroup });
  } catch (e) {
    console.warn('[IA] Échec avec accent musculaire, nouvelle tentative sans accent:', e?.message || e);
    // Fallback: réessayer sans accent musculaire pour maximiser les chances
    meta = await requestScheduleMetaStrict(profile, rec.type, enrichedQuery);
    // Ne pas propager l'accent aux jours si le meta a nécessité un fallback
    focusMuscleGroup = '';
  }
  // Annotate with pattern for day prompts
  meta.pattern = rec.pattern;

  // 2) Générer les jours séquentiellement pour pouvoir bannir les doublons
  const workouts = [];
  const used = new Set();
  // Déterminer un focus par jour en fonction du pattern
  const schedule = Array.isArray(meta.schedule) ? meta.schedule : [];
  const focuses = (rec.pattern || '').startsWith('UL')
    ? schedule.map((_, idx) => (idx % 2 === 0 ? 'Upper' : 'Lower'))
    : (rec.pattern || '').startsWith('PPL')
      ? schedule.map((_, idx) => ['Push','Pull','Legs','Push','Pull','Legs'][idx % 6])
      : schedule.map(() => 'FullBody');

  for (let i = 0; i < schedule.length; i++) {
    const day = schedule[i];
    const extra = {
      focus: focuses[i],
      usedExercises: Array.from(used),
      availableEquipment: profile.homeEquipment || [],
      focusMuscleGroup
    };
    let w;
    try {
      w = await requestWorkoutDayStrict(meta, day, profile, extra);
    } catch (e) {
      console.warn(`[IA] Échec jour "${day}" avec accent, 2e tentative sans accent:`, e?.message || e);
      const extraNoAccent = { ...extra, focusMuscleGroup: '' };
      w = await requestWorkoutDayStrict(meta, day, profile, extraNoAccent);
    }
    workouts.push(w);
    // Mémoriser les exos utilisés pour éviter les doublons les jours suivants
    (Array.isArray(w?.exercises) ? w.exercises : []).forEach(ex => {
      if (ex && typeof ex.name === 'string') used.add(ex.name.trim());
    });
  }
  workouts.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  return [{
    id: meta.id,
    type: meta.type,
    pattern: meta.pattern,
    title: meta.title,
    description: meta.description,
    level: meta.level,
    duration: meta.duration,
    frequency: meta.frequency,
    sessionDuration: meta.sessionDuration,
    schedule: meta.schedule,
    workouts
  }];
}

/* ───────── Validation & Normalisation ───────── */
function normalizeDayName(d) {
  if (!d) return d;
  const map = {
    'lundi': 'Lundi', 'mardi': 'Mardi', 'mercredi': 'Mercredi', 'jeudi': 'Jeudi',
    'vendredi': 'Vendredi', 'samedi': 'Samedi', 'dimanche': 'Dimanche'
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

  ['id', 'type', 'title', 'description', 'level', 'duration', 'frequency', 'sessionDuration'].forEach(k => {
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
  try { return JSON.parse(t); } catch { }

  // balises de code
  const cleaned = t.replace(/```json|```/gi, '').trim();
  try { return JSON.parse(cleaned); } catch { }

  // premier objet/tableau
  const m = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (m) {
    try { return JSON.parse(m[1]); } catch { }
  }

  // micro-réparations: quotes droites, trailing commas
  const fixed = cleaned
    .replace(/[“”]/g, '"')
    .replace(/,\s*([}\]])/g, '$1');
  try { return JSON.parse(fixed); } catch { }

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
async function requestScheduleMetaStrict(profile, type, query, options = {}) {
  let lastErr = 'init';
  for (let i = 1; i <= MAX_RETRIES_JSON; i++) {
    const prompt = i === 1
      ? buildSchedulePromptSingle(profile, type, query, options)
      : buildSchedulePromptSingle(profile, type, `${query}\nCorrige: ${lastErr}\n(Rappelle-toi: JSON strict, aucun texte hors JSON)`, options);

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
      id: `program_${type}_${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`,
      type,
      title: type === 'fullbody' ? 'Fullbody 3 jours' : (type === 'halfbody' ? 'Halfbody 4 jours' : 'Split 5 jours'),
      description: 'Programme généré en secours local.',
      level: 'intermédiaire',
      duration: '8 semaines',
      frequency: type === 'fullbody' ? '3x/semaine' : (type === 'halfbody' ? '4x/semaine' : '5x/semaine'),
      sessionDuration: '60 min',
      tips: ['Hydrate-toi', 'Échauffement 10 min'],
      schedule: type === 'fullbody'
        ? ['Lundi', 'Mercredi', 'Vendredi']
        : type === 'halfbody'
          ? ['Lundi', 'Mardi', 'Jeudi', 'Vendredi']
          : ['Lundi', 'Mardi', 'Jeudi', 'Vendredi', 'Samedi']
    };
    return fallback;
  }
  throw new Error(`Schedule generation failed for ${type}`);
}

async function requestWorkoutDayStrict(meta, day, profile, extra = {}) {
  let lastErr = 'init';
  for (let i = 1; i <= MAX_RETRIES_JSON; i++) {
    const prompt = i === 1
      ? buildDayPrompt(meta, day, profile, extra)
      : buildDayPrompt(meta, day, profile, extra) + `\nCorrige: ${lastErr}\n(Rappelle-toi: JSON strict, aucun texte hors JSON)`;
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
        { name: 'Squat', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Quadriceps', 'Fessiers'] },
        { name: 'Développé couché', sets: 4, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Pectoraux', 'Triceps'] },
        { name: 'Rowing barre', sets: 3, reps: '8-12', rest: '90s', type: 'compound', targetMuscles: ['Dos', 'Biceps'] },
        { name: 'Plank', sets: 3, reps: '45-60s', rest: '60s', type: 'isolation', targetMuscles: ['Core'] },
      ]
    };
  }
  throw new Error(`Day generation failed for ${day}`);
}

async function generateWorkoutProgramsStaged(profile, query = '') {
  // 1) Métadonnées IA pour chaque type x niveau
  const types = ['fullbody', 'halfbody', 'split'];
  const levels = ['débutant', 'intermédiaire', 'avancé'];
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
      console.log('💪 Génération de programmes d\'entraînement (auto, IA first)');
      let queryTxt = '';
      const loc = criteria?.location || profile.equipmentLocation;
      if (loc === 'home') queryTxt += 'à domicile ';
      if (loc === 'gym') queryTxt += 'en salle ';

      const equip = (criteria?.equipment && criteria.equipment.length ? criteria.equipment : profile.homeEquipment) || [];
      if (equip.length > 0) queryTxt += `avec ${equip.join(' ')} `;

      // Recommander automatiquement type/pattern/frequence, ou forcer depuis critères manuels
      let rec = recommendProgramSpec(profile);
      const forceType = criteria?.forceType;
      if (forceType) {
        const t = String(forceType).toLowerCase();
        const defaultPattern = t === 'halfbody' ? 'UL-4' : (t === 'split' ? 'PPL-5' : 'FB-3');
        rec = {
          type: t,
          pattern: criteria?.forcePattern || defaultPattern,
          frequency: criteria?.forceFrequency || (t === 'split' ? 5 : (t === 'halfbody' ? 4 : 3)),
          level: inferLevelFromProfile(profile)
        };
      }
      const focusMuscleGroup = criteria?.focusMuscle || criteria?.focusMuscleGroup || '';
      if (focusMuscleGroup) queryTxt += `accent sur ${focusMuscleGroup} `;
      const programs = await generateWorkoutProgramsAuto(profile, rec, queryTxt, focusMuscleGroup);

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
        pattern: program.pattern,
        goal: profile.goal,
        focusMuscle: focusMuscleGroup || '',
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
