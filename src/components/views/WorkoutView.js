import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  Dumbbell, BarChart2, Clock, ArrowRight, Search,
  X, ChevronDown, ChevronUp, Trash2, CheckSquare, Square,
  AlertCircle, Calendar,
  Play, RotateCcw, Timer, BookOpen, RefreshCw
} from 'lucide-react';
import Questionnaire from '../ui/Questionnaire';
import { useI18n } from '../../utils/i18n';
import { mistralSearchService } from '../../services/mistralIntegration';
import { workoutFirestoreService } from '../../services/workoutFirestoreService';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';

function UltraRobustWorkoutView() {
  const {
    isQuestionnaire,
    actions,
  } = useAppContext();

  const [user] = useAuthState(auth);

  const [generatedPrograms, setGeneratedPrograms] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [error, setError] = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modeAuto, setModeAuto] = useState(true);
  const [manualType, setManualType] = useState('fullbody');
  const [manualDays, setManualDays] = useState(3);
  const [focusMuscle, setFocusMuscle] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedDayIndex, setExpandedDayIndex] = useState(0);
  const [detailsAnim, setDetailsAnim] = useState(false);
  const [lastGeneration, setLastGeneration] = useState(null);
  const [programStats, setProgramStats] = useState(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProgramIds, setSelectedProgramIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const { t } = useI18n();

  // Persist selected filters in localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wf_filters') || '{}');
      if (saved.focusMuscle) setFocusMuscle(saved.focusMuscle);
      if (saved.typeFilter) setTypeFilter(saved.typeFilter);
      if (saved.difficultyFilter) setDifficultyFilter(saved.difficultyFilter);
      if (typeof saved.searchTerm === 'string') setSearchTerm(saved.searchTerm);
    } catch { }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('wf_filters', JSON.stringify({
        focusMuscle,
        typeFilter,
        difficultyFilter,
        searchTerm
      }));
    } catch { }
  }, [focusMuscle, typeFilter, difficultyFilter, searchTerm]);


  // Charger les programmes sauvegardés depuis Firestore
  useEffect(() => {
    const loadSavedPrograms = async () => {
      if (!user?.uid) return;

      setIsLoadingPrograms(true);
      try {
        console.log('📚 Chargement programmes...');

        const savedData = await workoutFirestoreService.loadGeneratedPrograms(user.uid);

        if (savedData && savedData.programs) {
          setGeneratedPrograms(savedData.programs);
          setLastGeneration(savedData.generatedAt);
          console.log(`✅ ${savedData.programs.length} programmes chargés`);
        }

        const stats = await workoutFirestoreService.getUserProgramStats(user.uid);
        setProgramStats(stats);

        // Charger les stats de parsing (optionnel)
      } catch (err) {
        console.error('❌ Erreur chargement programmes:', err);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    let isMounted = true;
    let setIsLoadingPrograms = (v) => { };
    setIsLoadingPrograms = (v) => { if (isMounted) {/* placeholder pour style existant */ } };

    loadSavedPrograms();
    return () => { isMounted = false; };
  }, [user?.uid]);

  // Ne plus démarrer automatiquement le questionnaire

  // Lock scroll on body while sheet is open
  useEffect(() => {
    if (showDetails) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [showDetails]);

  // Animate sheet on open
  useEffect(() => {
    if (showDetails) {
      // next tick to allow transition from translate-y-full -> 0
      const t = setTimeout(() => setDetailsAnim(true), 0);
      return () => clearTimeout(t);
    } else {
      setDetailsAnim(false);
    }
  }, [showDetails]);

  const closeDetails = () => {
    setDetailsAnim(false);
    // Allow slide-down animation before unmount
    setTimeout(() => setShowDetails(false), 180);
  };

  // GÉNÉRATION PROGRAMMES RÉALISTES
  const handleRealisticGeneration = async () => {
    if (!user?.uid) {
      actions.setSearchStatus('Connectez-vous pour générer');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage('Initialisation...');

    try {
      // Phase 1: Préparation
      setGenerationProgress(10);
      setGenerationStage('🏋️ Préparation programmes...');
      actions.setSearchStatus('🏋️ Génération programmes FullBody, HalfBody, Split...');

      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const equipmentProfile = JSON.parse(localStorage.getItem('equipmentProfile') || '{}');

      const completeProfile = {
        ...userProfile,
        equipmentLocation: equipmentProfile.location,
        availableEquipment: equipmentProfile.homeEquipment || [],
        ...equipmentProfile
      };

      // Phase 2: Génération IA
      setGenerationProgress(30);
      setGenerationStage('🤖 Génération IA des 3 programmes...');
      actions.setSearchStatus('🤖 Création FullBody + HalfBody + Split...');

      // Simuler le progrès pendant la génération
      const progressTimer = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 5, 80));
      }, 500);

      console.log('🚀 Génération programmes avec profil:', completeProfile);

      // Génération STRICTE (staged) via mistralIntegration
      const criteria = {
        location: completeProfile?.equipmentLocation || 'home',
        equipment: Array.isArray(completeProfile?.availableEquipment) ? completeProfile.availableEquipment : [],
        focusMuscle,
        ...(modeAuto ? {} : {
          forceType: manualType,
          forcePattern: manualType === 'halfbody' ? 'UL-' + manualDays : (manualType === 'split' ? 'PPL-' + manualDays : 'FB-' + manualDays),
          forceFrequency: manualDays
        })
      };
      const programs = await mistralSearchService.searchWorkoutPrograms(criteria);
      if (!Array.isArray(programs) || programs.length === 0 || programs.error) {
        throw new Error(programs?.error || 'GENERATION_EMPTY');
      }
      // Vérification locale stricte : parité schedule/workouts
      programs.forEach((p, i) => {
        const s = Array.isArray(p.schedule) ? p.schedule.length : 0;
        const w = Array.isArray(p.workouts) ? p.workouts.length : 0;
        console.log(`P${i} ${p.id} schedule=${s} workouts=${w}`, p.schedule, (p.workouts || []).map(x => x.day));
        if (s !== w) throw new Error(`PROGRAM_${p.id}: schedule(${s}) != workouts(${w})`);
      });
      clearInterval(progressTimer);

      // Phase 3: Validation
      setGenerationProgress(90);
      setGenerationStage('✅ Validation programmes...');
      actions.setSearchStatus('✅ Validation structure hebdomadaire...');

      // Phase 4: Sauvegarde
      setGenerationProgress(95);
      setGenerationStage('💾 Sauvegarde...');
      actions.setSearchStatus('💾 Sauvegarde programmes validés...');

      if (programs && programs.length > 0) {
        await workoutFirestoreService.saveGeneratedPrograms(user.uid, programs, completeProfile);

        setGeneratedPrograms(programs);
        setLastGeneration(new Date());

        const newStats = await workoutFirestoreService.getUserProgramStats(user.uid);
        setProgramStats(newStats);

        // Phase 5: Succès
        setGenerationProgress(100);
        setGenerationStage('🎉 Programmes générés !');

        const programTypes = programs.map(p => p.type || 'programme').join(' + ');
        actions.setSearchStatus(
          `🎉 ${programs.length} programmes générés ! ` +
          `(${programTypes})`
        );
      } else {
        throw new Error('Aucun programme généré.');
      }
    } catch (err) {
      console.error('❌ Erreur génération programmes:', err);
      setError(err?.message || 'Erreur inconnue');
      actions.setSearchStatus('❌ Échec de la génération');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationStage(''), 1500);
    }
  };

  // --- UI existante (inchangée) ---

  const renderHeader = () => (
    <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-8 rounded-b-3xl shadow-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Programmes 💪</h1>
        <BookOpen className="opacity-90" />
      </div>
      <p className="opacity-90 text-lg mt-2">
        Des programmes complets (FullBody, HalfBody, Split) alignés sur ton profil
      </p>
      {lastGeneration && (
        <div className="mt-3 text-sm opacity-90 flex items-center">
          <Clock size={16} className="mr-2" />
          Dernière génération : {new Date(lastGeneration).toLocaleString()}
        </div>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="bg-white shadow rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Recherche</p>
            <div className="flex items-center bg-gray-100 rounded-xl p-2">
              <Search size={18} className="text-gray-500 mr-2" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrer par titre / description..."
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Niveau de difficulté</p>
            <div className="flex gap-2 flex-wrap">
              {['all', 'débutant', 'intermédiaire', 'avancé'].map(level => (
                <button
                  key={level}
                  onClick={() => setDifficultyFilter(level)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${difficultyFilter === level
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Actions</p>
            <div className="flex gap-2">
              <button
                onClick={handleRealisticGeneration}
                disabled={isGenerating || !user}
                className={`px-3 py-2 rounded-xl text-white text-sm flex items-center ${isGenerating || !user ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <RotateCcw size={16} className="mr-2 animate-spin" />
                    {t('workout.generate')}...
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" />
                    {t('workout.generate')}
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  if (!user?.uid) return;
                  setIsGenerating(true);
                  setGenerationStage('Chargement historique filtré...');
                  try {
                    const res = await workoutFirestoreService.loadProgramsFiltered(user.uid, {
                      focusMuscle,
                      type: typeFilter !== 'all' ? typeFilter : ''
                    });
                    if (res?.programs?.length) {
                      setGeneratedPrograms(res.programs);
                      setLastGeneration(res.generatedAt || new Date());
                      actions.setSearchStatus('Historique chargé (filtres appliqués)');
                    } else {
                      actions.setSearchStatus('Aucun programme trouvé avec ces filtres');
                    }
                  } catch (e) {
                    actions.setSearchStatus(`Erreur chargement historique: ${e.message}`);
                  } finally {
                    setIsGenerating(false);
                    setGenerationStage('');
                  }
                }}
                className="px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Charger historiques (filtres)
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDifficultyFilter('all');
                  setTypeFilter('all');
                  setFocusMuscle('');
                  try { localStorage.removeItem('wf_filters'); } catch { }
                }}
                className="px-3 py-2 rounded-xl text-sm bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
              >
                Réinitialiser filtres
              </button>
            </div>
          </div>
        </div>
        {/* Mode Auto / Manuel */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <p className="text-sm text-gray-600 mb-2">{t('workout.mode')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setModeAuto(true)}
                className={`px-3 py-1 rounded-lg text-sm ${modeAuto ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >{t('workout.auto')}</button>
              <button
                onClick={() => setModeAuto(false)}
                className={`px-3 py-1 rounded-lg text-sm ${!modeAuto ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >{t('workout.manual')}</button>
            </div>
          </div>
          {!modeAuto && (
            <>
              <div>
                <p className="text-sm text-gray-600 mb-2">{t('workout.type')}</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'fullbody', label: 'FullBody' },
                    { key: 'halfbody', label: 'Upper/Lower' },
                    { key: 'split', label: 'PPL' }
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setManualType(t.key)}
                      className={`px-3 py-1 rounded-full text-sm ${manualType === t.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">{t('workout.daysPerWeek')}</p>
                <div className="flex gap-2">
                  {[3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setManualDays(n)} className={`px-3 py-1 rounded-full text-sm ${manualDays === n ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{n}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-2">{t('workout.muscleAccent')}</p>
            <select
              value={focusMuscle}
              onChange={(e) => setFocusMuscle(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Aucun</option>
              <option value="pectoraux">Pectoraux</option>
              <option value="dos">Dos</option>
              <option value="épaules">Épaules</option>
              <option value="bras">Bras</option>
              <option value="jambes">Jambes</option>
              <option value="fessiers">Fessiers</option>
              <option value="abdos">Abdos / Core</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow flex items-center">
          <Calendar className="text-purple-500 mr-3" />
          <div>
            <p className="text-sm text-gray-600">Programmes</p>
            <p className="text-2xl font-bold">{generatedPrograms?.length || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow flex items-center">
          <BarChart2 className="text-blue-500 mr-3" />
          <div>
            <p className="text-sm text-gray-600">Générations</p>
            <p className="text-2xl font-bold">{programStats?.totalGenerations || 0}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow flex items-center">
          <Timer className="text-green-500 mr-3" />
          <div>
            <p className="text-sm text-gray-600">Dernière</p>
            <p className="text-2xl font-bold">
              {programStats?.lastGeneration
                ? new Date(programStats.lastGeneration).toLocaleDateString()
                : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRealisticGenerationButton = () => (
    <div className="mb-6">
      <button
        onClick={handleRealisticGeneration}
        disabled={isGenerating || !user}
        className={`w-full py-4 rounded-2xl font-semibold text-white transition-all relative overflow-hidden ${isGenerating || !user
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
          }`}
      >
        {/* Barre de progression animée */}
        {isGenerating && (
          <div
            className="absolute left-0 top-0 h-full bg-white bg-opacity-20 transition-all duration-500 ease-out"
            style={{ width: `${generationProgress}%` }}
          />
        )}

        <div className="relative z-10 flex items-center justify-center">
          {isGenerating ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center mb-1">
                <Dumbbell size={20} className="mr-2 animate-pulse" />
                <span>Génération programmes...</span>
              </div>
              <div className="flex items-center text-xs opacity-90 mb-1">
                <span className="mr-2">{generationProgress}%</span>
              </div>
              <div className="text-xs opacity-75">
                {generationStage}
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <Play size={20} className="mr-2" />
              <span>Générer programme de musculation</span>
            </div>
          )}
        </div>
      </button>

      {error && (
        <div className="mt-2 text-red-600 text-sm flex items-center">
          <AlertCircle size={16} className="mr-1" /> {error}
        </div>
      )}
    </div>
  );

  const renderProgramsList = () => (
    <div className="p-4 max-w-5xl mx-auto">
      {generatedPrograms.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6 text-center text-gray-600">
          Aucun programme généré pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => {
                if (selectionMode) setSelectedProgramIds(new Set());
                setSelectionMode(!selectionMode);
              }}
              className={`px-3 py-1 rounded-lg text-sm ${selectionMode ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {selectionMode ? 'Annuler sélection' : 'Sélectionner'}
            </button>
            <button
              onClick={async () => {
                if (!user?.uid) return;
                setIsGenerating(true);
                setGenerationStage('Rafraîchissement des programmes...');
                try {
                  const saved = await workoutFirestoreService.loadGeneratedPrograms(user.uid);
                  setGeneratedPrograms(saved?.programs || []);
                  setLastGeneration(saved?.generatedAt || new Date());
                  actions.setSearchStatus('Programmes rafraîchis');
                } catch (e) {
                  actions.setSearchStatus(`Erreur rafraîchissement: ${e.message}`);
                } finally {
                  setIsGenerating(false);
                  setGenerationStage('');
                }
              }}
              className="px-3 py-2 rounded-xl text-sm bg-gray-100 text-gray-800 hover:bg-gray-200 flex items-center"
            >
              <RefreshCw size={16} className="mr-2" /> {t('workout.refresh')}
            </button>
            {selectionMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Sélectionner tous les programmes actuellement filtrés
                    const filteredIds = generatedPrograms
                      .filter(p => {
                        const okLevel = difficultyFilter === 'all' || (p.level || '').toLowerCase() === difficultyFilter;
                        const okSearch = !searchTerm || (p.title + ' ' + p.description).toLowerCase().includes(searchTerm.toLowerCase());
                        const okAccent = !focusMuscle || ((p.focusMuscle || '').toLowerCase() === focusMuscle.toLowerCase());
                        const okType = typeFilter === 'all' || (p.type || '').toLowerCase() === typeFilter;
                        return okLevel && okSearch && okAccent && okType;
                      })
                      .map(p => p.id)
                      .filter(Boolean);
                    setSelectedProgramIds(prev => {
                      const next = new Set(prev);
                      filteredIds.forEach(id => next.add(id));
                      return next;
                    });
                  }}
                  className="px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Tout sélectionner
                </button>
                <span className="text-sm text-gray-600 mr-2">{selectedProgramIds.size} sélectionné(s)</span>
                <button
                  onClick={() => {
                    const ids = Array.from(selectedProgramIds);
                    if (!ids.length) return;
                    setPendingDeleteIds(ids);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={selectedProgramIds.size === 0}
                  className={`px-3 py-1 rounded-lg text-sm flex items-center ${selectedProgramIds.size === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  <Trash2 size={14} className="mr-1" /> Supprimer
                </button>
              </div>
            )}
          </div>
          {generatedPrograms
            .filter(p => {
              const okLevel = difficultyFilter === 'all' || (p.level || '').toLowerCase() === difficultyFilter;
              const okSearch = !searchTerm || (p.title + ' ' + p.description).toLowerCase().includes(searchTerm.toLowerCase());
              const okAccent = !focusMuscle || ((p.focusMuscle || '').toLowerCase() === focusMuscle.toLowerCase());
              return okLevel && okSearch && okAccent;
            })
            .map((program, idx) => (
              <div key={program.id || idx} className={`relative bg-white rounded-2xl shadow p-4 ${selectionMode ? 'pl-10' : ''}`}>
                {selectionMode && (
                  <button
                    onClick={() => {
                      setSelectedProgramIds(prev => {
                        const next = new Set(prev);
                        if (next.has(program.id)) next.delete(program.id); else next.add(program.id);
                        return next;
                      });
                    }}
                    className="absolute top-4 left-4 p-1 rounded-md hover:bg-gray-100"
                    aria-label="Sélectionner le programme"
                  >
                    {selectedProgramIds.has(program.id) ? <CheckSquare size={18} className="text-purple-600" /> : <Square size={18} className="text-gray-400" />}
                  </button>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span>{program.title || `Programme ${idx + 1}`}</span>
                      {program.focusMuscle && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium whitespace-nowrap">
                          Accent: {program.focusMuscle}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">{program.description}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {program.type && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Type: {program.type}</span>
                      )}
                      {program.pattern && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">Pattern: {program.pattern}</span>
                      )}
                      {program.frequency && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{program.frequency}</span>
                      )}
                      {program.sessionDuration && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{program.sessionDuration}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {program.level} • {program.duration}
                    </div>
                    <button
                      onClick={() => {
                        if (selectionMode) {
                          setSelectedProgramIds(prev => {
                            const next = new Set(prev);
                            if (next.has(program.id)) next.delete(program.id); else next.add(program.id);
                            return next;
                          });
                          return;
                        }
                        setSelectedProgramIndex(idx);
                        setExpandedDayIndex(0);
                        setShowDetails(true);
                      }}
                      className="mt-2 inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
                    >
                      {t('workout.details')} <ArrowRight size={16} className="ml-1" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {(program.workouts || []).map((w) => (
                    <span key={w.day} className="text-xs bg-gray-100 rounded px-2 py-1">
                      {w.day}: {(w.exercises || []).length} exos
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderProgramDetails = () => {
    const program = generatedPrograms[selectedProgramIndex];
    if (!program) return null;

    return (
      <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-300 ease-in-out ${detailsAnim ? 'bg-black/60 opacity-100' : 'bg-black/60 opacity-0'}`}>
        <div className={`bg-white w-full sm:w-[640px] max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden transform transition-transform duration-300 ease-in-out ${detailsAnim ? 'translate-y-0' : 'translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0'}`}>
          {/* Drag handle */}
          <div className="w-full flex justify-center pt-2 sm:hidden">
            <div className="h-1.5 w-12 bg-gray-300 rounded-full" />
          </div>
          {/* Header sticky */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
            <div className="flex items-center justify-between p-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate pr-3 flex items-center gap-2">
                  <span className="truncate">{program.title}</span>
                  {program.focusMuscle && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium whitespace-nowrap">
                      Accent: {program.focusMuscle}
                    </span>
                  )}
                </h3>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-700">
                  {program.type && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100">Type: {program.type}</span>
                  )}
                  {program.pattern && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100">Pattern: {program.pattern}</span>
                  )}
                  {program.frequency && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100">{program.frequency}</span>
                  )}
                  {(program.sessionDuration || program.sessionDuration === 0) && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100">{program.sessionDuration}</span>
                  )}
                </div>
              </div>
              <button
                onClick={closeDetails}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="p-4 overflow-y-auto max-h-[75vh] touch-pan-y">
            {(program.workouts || []).map((w, idx) => {
              const isExpanded = expandedDayIndex === idx;
              const exercises = Array.isArray(w.exercises) ? w.exercises : [];
              return (
                <div key={w.day || idx} className="mb-3 border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedDayIndex(isExpanded ? -1 : idx)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-2 text-left">
                      <span className="font-medium text-sm">{w.day || `Jour ${idx + 1}`}</span>
                      <span className="text-xs text-gray-500">
                        {exercises.length} exos • {w.duration || program.sessionDuration || '60 min'}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                  </button>

                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {exercises.map((e, i) => (
                        <div key={i} className="text-sm bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <div className="font-medium pr-2 truncate">{e.name}</div>
                            <div className="text-xs text-gray-600 whitespace-nowrap">
                              {typeof e.sets === 'number' ? `${e.sets}x` : ''}{e.reps || ''}{e.rest ? ` • repos ${e.rest}` : ''}
                            </div>
                          </div>
                          {e.notes && (
                            <div className="text-xs text-gray-500 mt-1">{e.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen">
      {renderHeader()}

      <div className="p-4 sm:p-6 space-y-6">
        {renderStats()}
        {renderRealisticGenerationButton()}
        {renderFilters()}
        {renderProgramsList()}
      </div>

      {isQuestionnaire && (
        <Questionnaire />
      )}

      {showDetails && renderProgramDetails()}

      {/* Confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h4 className="text-lg font-semibold mb-2">Confirmer la suppression</h4>
            <p className="text-sm text-gray-600 mb-4">Supprimer définitivement {pendingDeleteIds.length} programme(s) ?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!user?.uid || pendingDeleteIds.length === 0) return;
                    await workoutFirestoreService.deletePrograms(user.uid, pendingDeleteIds);
                    // Recharger depuis Firestore pour s'assurer que la MAJ est bien persistée
                    const saved = await workoutFirestoreService.loadGeneratedPrograms(user.uid);
                    setGeneratedPrograms(saved?.programs || []);
                    setSelectedProgramIds(new Set());
                    setSelectionMode(false);
                  } catch (e) {
                    console.error('Suppression programmes échouée:', e);
                  } finally {
                    setShowDeleteConfirm(false);
                    setPendingDeleteIds([]);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UltraRobustWorkoutView;
