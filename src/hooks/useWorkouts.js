import { useCallback, useMemo, useState } from 'react';
import { persistenceService } from '../services/persistenceService';
import { useAppContext } from '../context/AppContext';
import { mistralSearchService } from '../services/mistralIntegration';

function getDayOrder() {
  try {
    const lang = persistenceService.loadAppSettings()?.language || 'fr';
    return lang === 'en'
      ? ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
      : ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  } catch { return ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche']; }
}

/** Validation/tri stricts : aucune complétion ni fallback */
function normalizeStrict(program) {
  const schedule = Array.isArray(program.schedule) ? program.schedule : [];
  const workouts = Array.isArray(program.workouts) ? program.workouts : [];
  if (schedule.length !== workouts.length) {
    throw new Error(`normalizeStrict: mismatch schedule/workouts for ${program.id || 'unknown'}`);
  }
  const byDay = new Map(workouts.map(w => [w.day, w]));
  const ordered = schedule.map(day => {
    const w = byDay.get(day);
    if (!w) throw new Error(`normalizeStrict: missing workout for ${day} (${program.id || 'unknown'})`);
    return w;
  });
  const DAY_ORDER = getDayOrder();
  return {
    ...program,
    workouts: ordered.sort((a,b)=>DAY_ORDER.indexOf(a.day)-DAY_ORDER.indexOf(b.day))
  };
}

export function useWorkouts() {
  const { equipmentProfile, actions } = useAppContext();

  const [workoutPrograms, setWorkoutPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Critères dérivés (style conservé)
  const criteria = useMemo(() => ({
    location: equipmentProfile?.location || 'home',
    equipment: Array.isArray(equipmentProfile?.homeEquipment) ? equipmentProfile.homeEquipment : []
  }), [equipmentProfile]);

  /** Génère des programmes via Mistral (staged/strict), puis valide localement */
  const findSuitableWorkouts = useCallback(async () => {
    setIsLoading(true);
    actions.setSearchStatus('Génération IA des programmes...');
    try {
      const result = await mistralSearchService.searchWorkoutPrograms(criteria);
      if (!Array.isArray(result) || result.length === 0 || result?.error) {
        throw new Error(result?.error || 'GENERATION_FAILED');
      }

      // Validation/tri stricts
      const normalized = result.map(normalizeStrict);

      setWorkoutPrograms(normalized);
      actions.setSearchStatus('Programmes trouvés ✅');
      return normalized;
    } catch (e) {
      console.error('❌ useWorkouts: génération échouée', e);
      actions.setSearchStatus('Échec de la génération');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [criteria, actions]);

  return {
    workoutPrograms,
    isLoading,
    findSuitableWorkouts
  };
}

export default useWorkouts;
