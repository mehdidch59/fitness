import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'generatedWorkoutPrograms';

const DAY_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const sortByDay = (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
const MIN_EXERCISES_PER_DAY = 4;

/* ─────────────────────────────
   Validation STRICTE (no fallback)
────────────────────────────── */
function validateProgramStrict(p = {}) {
  const errors = [];
  const schedule = Array.isArray(p.schedule) ? p.schedule.filter(Boolean) : [];
  const workouts = Array.isArray(p.workouts) ? p.workouts.filter(Boolean) : [];

  if (schedule.length < 3 || schedule.length > 7) errors.push('schedule length must be 3..7');
  if (new Set(schedule).size !== schedule.length) errors.push('schedule days must be unique');
  if (schedule.some((d) => !DAY_ORDER.includes(d))) errors.push('schedule must use FR day names');

  if (workouts.length !== schedule.length) {
    errors.push('workouts length must equal schedule length');
  } else {
    // indexer par jour
    const byDay = new Map(workouts.map((w) => [w?.day, w]));
    for (const day of schedule) {
      const w = byDay.get(day);
      if (!w) {
        errors.push(`missing workout for ${day}`);
        continue;
      }
      const ex = Array.isArray(w.exercises) ? w.exercises : [];
      if (ex.length < MIN_EXERCISES_PER_DAY) {
        errors.push(`not enough exercises on ${day} (>= ${MIN_EXERCISES_PER_DAY})`);
        continue;
      }
      for (const e of ex) {
        if (!e || !e.name || typeof e.sets !== 'number' || !e.reps) {
          errors.push(`exercise fields missing on ${day}`);
          break;
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Ne modifie pas la structure (pas de complétion). Trie uniquement. */
function sanitizeProgramForSave(p) {
  const copy = { ...p };
  if (Array.isArray(copy.workouts)) {
    copy.workouts = [...copy.workouts].sort(sortByDay);
  }
  return copy;
}

/** Pour la lecture : on trie, on ne comble rien. */
function sanitizeProgramForRead(p) {
  return sanitizeProgramForSave(p);
}

class WorkoutFirestoreService {
  constructor() {
    this.collectionName = COLLECTION;
  }

  /**
   * Sauvegarder les programmes générés pour un utilisateur
   * - Validation stricte (semaine complète, ≥4 exos/jour)
   * - AUCUN fallback / complétion
   */
  async saveGeneratedPrograms(userId, programs, userProfile) {
    if (!userId) throw new Error('saveGeneratedPrograms: userId requis');
    try {
      console.log('💾 Sauvegarde des programmes (validation stricte)...');

      // Nettoyage des anciens docs (on garde les 5 derniers)
      await this.cleanOldPrograms(userId);

      const input = Array.isArray(programs) ? programs : [];
      if (input.length === 0) {
        throw new Error('saveGeneratedPrograms: aucun programme à enregistrer');
      }

      // Valider tous les programmes
      const problems = [];
      const cleanedPrograms = input.map((p, idx) => {
        const res = validateProgramStrict(p);
        if (!res.ok) {
          problems.push({ index: idx, id: p.id, errors: res.errors });
        }
        return sanitizeProgramForSave(p);
      });

      if (problems.length) {
        console.error('❌ Programmes invalides:', problems);
        const err = new Error('Validation failed: some programs are invalid');
        err.details = problems;
        throw err;
      }

      const now = Timestamp.now();
      // Index helpers for querying (accent/type)
      const focusMuscles = Array.from(new Set(
        cleanedPrograms.map(p => (p.focusMuscle || '').trim()).filter(Boolean)
      ));
      const programTypes = Array.from(new Set(
        cleanedPrograms.map(p => (p.type || '').trim().toLowerCase()).filter(Boolean)
      ));
      const docData = {
        userId,
        programs: cleanedPrograms,
        userProfile: userProfile || {},
        aiGenerated: true,
        totalPrograms: cleanedPrograms.length,
        focusMuscles,
        programTypes,
        createdAt: now,
        generatedAt: now,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // +30 j
      };

      const docRef = await addDoc(collection(db, this.collectionName), docData);
      console.log('✅ Programmes sauvegardés avec ID:', docRef.id);

      // Debug jours/enregistrements
      if (cleanedPrograms[0]?.workouts) {
        console.log(
          '🗓️ Jours enregistrés (P0):',
          cleanedPrograms[0].workouts.map((w) => w.day).join(', ')
        );
        console.log(
          '🔢 Nb exos (P0):',
          cleanedPrograms[0].workouts.map((w) => w.exercises?.length ?? 0).join(', ')
        );
      }

      return docRef.id;
    } catch (error) {
      console.error('❌ Erreur sauvegarde programmes Firestore:', error);
      throw error;
    }
  }

  /**
   * Charger le dernier document valide (non expiré) de l'utilisateur
   * - Filtre les programmes invalides (aucune correction ni remplissage)
   */
  async loadGeneratedPrograms(userId) {
    if (!userId) throw new Error('loadGeneratedPrograms: userId requis');
    try {
      console.log('📚 Chargement des programmes depuis Firestore...');

      const q = query(collection(db, this.collectionName), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('📭 Aucun programme trouvé');
        return null;
      }

      const now = new Date();
      const validDocs = [];

      querySnapshot.forEach((snap) => {
        const data = snap.data();
        const expiresAt = data?.expiresAt?.toDate?.() ?? new Date(0);
        if (expiresAt <= now) return;

        const programs = Array.isArray(data.programs) ? data.programs : [];
        // garder uniquement les programmes valides
        const validPrograms = programs
          .map((p) => sanitizeProgramForRead(p))
          .filter((p) => validateProgramStrict(p).ok);

        if (validPrograms.length > 0) {
          validDocs.push({
            id: snap.id,
            userId: data.userId,
            userProfile: data.userProfile || {},
            programs: validPrograms,
            aiGenerated: !!data.aiGenerated,
            totalPrograms: validPrograms.length,
            createdAt: data.createdAt?.toDate?.() ?? null,
            generatedAt: data.generatedAt?.toDate?.() ?? null,
            expiresAt,
          });
        }
      });

      if (!validDocs.length) {
        console.log('📭 Aucun programme valide trouvé (tous expirés ou invalides)');
        return null;
      }

      validDocs.sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));
      const latest = validDocs[0];

      const p0 = latest.programs?.[0];
      const p0Days = p0?.workouts?.map((w) => w.day).join(', ') || '(aucun workout)';
      const p0Ex = p0?.workouts?.map((w) => w.exercises?.length ?? 0).join(', ') || '';
      console.log(
        `✅ ${latest.totalPrograms} programmes chargés (${latest.generatedAt?.toLocaleString?.()}) — Jours P0: ${p0Days} — Exos P0: ${p0Ex}`
      );

      return latest;
    } catch (error) {
      console.error('❌ Erreur chargement programmes Firestore:', error);
      throw error;
    }
  }

  /**
   * Charger les programmes filtrés via les métadonnées (accent/type)
   * - Utilise les tableaux focusMuscles / programTypes enregistrés au niveau du document
   * - Si les deux filtres sont fournis, interroge d'abord par focusMuscle puis filtre côté client par type
   */
  async loadProgramsFiltered(userId, { focusMuscle = '', type = '' } = {}) {
    if (!userId) throw new Error('loadProgramsFiltered: userId requis');
    try {
      const constraints = [where('userId', '==', userId)];

      // Firestore n'autorise qu'un seul array-contains par requête
      if (focusMuscle) {
        constraints.push(where('focusMuscles', 'array-contains', String(focusMuscle).trim()));
      } else if (type) {
        constraints.push(where('programTypes', 'array-contains', String(type).toLowerCase().trim()));
      }

      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;

      const now = new Date();
      const candidates = [];
      querySnapshot.forEach((snap) => {
        const data = snap.data();
        const expiresAt = data?.expiresAt?.toDate?.() ?? new Date(0);
        if (expiresAt <= now) return;
        candidates.push({ id: snap.id, ...data });
      });
      if (!candidates.length) return null;

      // Garder le plus récent
      candidates.sort((a, b) => (b.generatedAt?.toDate?.() ?? 0) - (a.generatedAt?.toDate?.() ?? 0));
      const latest = candidates[0];

      // Nettoyer/valider les programmes et filtrer par type si nécessaire
      const programs = (latest.programs || [])
        .map((p) => sanitizeProgramForRead(p))
        .filter((p) => validateProgramStrict(p).ok)
        .filter((p) => (type ? (String(p.type || '').toLowerCase() === String(type).toLowerCase()) : true))
        .filter((p) => (focusMuscle ? (String(p.focusMuscle || '').toLowerCase() === String(focusMuscle).toLowerCase()) : true));

      if (!programs.length) return null;

      return {
        id: latest.id,
        userId: latest.userId,
        userProfile: latest.userProfile || {},
        programs,
        aiGenerated: !!latest.aiGenerated,
        totalPrograms: programs.length,
        createdAt: latest.createdAt?.toDate?.() ?? null,
        generatedAt: latest.generatedAt?.toDate?.() ?? null,
        expiresAt: latest.expiresAt?.toDate?.() ?? null
      };
    } catch (error) {
      console.error('❌ Erreur chargement programmes filtrés:', error);
      throw error;
    }
  }

  /**
   * Supprime les anciens docs de l'utilisateur, garde les X plus récents
   */
  async cleanOldPrograms(userId, keepLast = 5) {
    if (!userId) return;
    try {
      console.log('🧹 Nettoyage des anciens programmes...');
      const q = query(collection(db, this.collectionName), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const docs = querySnapshot.docs
        .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))
        .sort(
          (a, b) =>
            (b.generatedAt?.toDate?.() ?? new Date(0)) -
            (a.generatedAt?.toDate?.() ?? new Date(0))
        );

      if (docs.length > keepLast) {
        const toDelete = docs.slice(keepLast);
        for (const d of toDelete) {
          await deleteDoc(d.ref);
          console.log(`🗑️ Programme supprimé: ${d.id}`);
        }
        console.log(`✅ ${toDelete.length} anciens programmes supprimés`);
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage programmes:', error);
      // non bloquant
    }
  }

  /**
   * Tâche de maintenance: supprime les docs expirés
   */
  async cleanExpiredPrograms() {
    try {
      console.log('🧹 Nettoyage des programmes expirés...');
      const q = query(collection(db, this.collectionName));
      const querySnapshot = await getDocs(q);

      const now = new Date();
      let deleted = 0;

      for (const snap of querySnapshot.docs) {
        const data = snap.data();
        const expiresAt = data?.expiresAt?.toDate?.() ?? new Date(0);
        if (expiresAt < now) {
          await deleteDoc(snap.ref);
          deleted++;
        }
      }
      console.log(`✅ ${deleted} programmes expirés supprimés`);
      return deleted;
    } catch (error) {
      console.error('❌ Erreur nettoyage programmes expirés:', error);
      throw error;
    }
  }

  /**
   * Stats basiques utilisateur
   */
  async getUserProgramStats(userId) {
    if (!userId) {
      return { totalGenerations: 0, lastGeneration: null, totalPrograms: 0 };
    }
    try {
      const q = query(collection(db, this.collectionName), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map((d) => d.data());

      if (!docs.length) {
        return { totalGenerations: 0, lastGeneration: null, totalPrograms: 0 };
      }

      const sorted = docs.sort(
        (a, b) =>
          (b.generatedAt?.toDate?.() ?? new Date(0)) -
          (a.generatedAt?.toDate?.() ?? new Date(0))
      );
      const latest = sorted[0];
      const totalPrograms = docs.reduce((acc, d) => acc + (d.totalPrograms || 0), 0);

      return {
        totalGenerations: docs.length,
        lastGeneration: latest.generatedAt?.toDate?.() ?? null,
        totalPrograms,
        expiresAt: latest.expiresAt?.toDate?.() ?? null,
      };
    } catch (error) {
      console.error('❌ Erreur récupération stats programmes:', error);
      return { totalGenerations: 0, lastGeneration: null, totalPrograms: 0 };
    }
  }

  /**
   * Génération illimitée (toujours autorisée)
   */
  async canGeneratePrograms() {
    console.log('📊 Vérification génération - MODE ILLIMITÉ ACTIVÉ');
    return {
      canGenerate: true,
      generationsToday: 0,
      maxPerDay: 999999,
      remainingGenerations: 999999,
    };
  }

  /**
   * Supprimer un ou plusieurs programmes (par id) du dernier document de l'utilisateur
   */
  async deletePrograms(userId, programIds = []) {
    if (!userId) throw new Error('deletePrograms: userId requis');
    if (!Array.isArray(programIds) || programIds.length === 0) return { updated: false, remaining: 0 };
    try {
      const q = query(collection(db, this.collectionName), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      // Trouver le doc le plus récent
      const docs = querySnapshot.docs
        .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))
        .sort(
          (a, b) =>
            (b.generatedAt?.toDate?.() ?? new Date(0)) -
            (a.generatedAt?.toDate?.() ?? new Date(0))
        );

      if (docs.length === 0) return { updated: false, remaining: 0 };

      const latest = docs[0];
      const current = Array.isArray(latest.programs) ? latest.programs : [];
      const idsSet = new Set(programIds);
      const nextPrograms = current.filter((p) => !idsSet.has(p.id));

      // Si aucun programme restant, supprimer le document pour éviter les docs vides
      if (nextPrograms.length === 0) {
        await deleteDoc(latest.ref);
        return { updated: true, remaining: 0, deletedDoc: true };
      }

      await updateDoc(latest.ref, {
        programs: nextPrograms,
        totalPrograms: nextPrograms.length,
        updatedAt: Timestamp.now(),
      });

      return { updated: true, remaining: nextPrograms.length, deletedDoc: false };
    } catch (error) {
      console.error('❌ Erreur suppression programmes:', error);
      throw error;
    }
  }
}

export const workoutFirestoreService = new WorkoutFirestoreService();
