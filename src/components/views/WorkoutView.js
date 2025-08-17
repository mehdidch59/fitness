import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  Dumbbell, BarChart2, Clock, ArrowRight, Search, Filter, 
  ArrowLeft, AlertCircle, Calendar,
  Play, RotateCcw, Timer, Award, BookOpen
} from 'lucide-react';
import Questionnaire from '../ui/Questionnaire';
import { mistralService } from '../../services/mistralService';
import { mistralSearchService } from '../../services/mistralIntegration';
import { workoutFirestoreService } from '../../services/workoutFirestoreService';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';

function UltraRobustWorkoutView() {
  const {
    isQuestionnaire,
    questionnaireStep,
    actions,
    userProfile,
    equipmentProfile
  } = useAppContext();

  const [user] = useAuthState(auth);

  const [generatedPrograms, setGeneratedPrograms] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');
  const [error, setError] = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [lastGeneration, setLastGeneration] = useState(null);
  const [programStats, setProgramStats] = useState(null);
  const [parsingStats, setParsingStats] = useState(null);
  const [lastParsingMethod, setLastParsingMethod] = useState(null);

  // Vérifier si l'utilisateur a déjà configuré son lieu d'entraînement
  const isLocationConfigured = Boolean(equipmentProfile.location);

  // Charger les programmes sauvegardés depuis Firestore
  useEffect(() => {
    const loadSavedPrograms = async () => {
      if (!user?.uid) return;

      setIsLoadingPrograms(true);
      try {
        console.log('📚 Chargement programmes réalistes...');

        const savedData = await workoutFirestoreService.loadGeneratedPrograms(user.uid);

        if (savedData && savedData.programs) {
          setGeneratedPrograms(savedData.programs);
          setLastGeneration(savedData.generatedAt);
          console.log(`✅ ${savedData.programs.length} programmes chargés`);
        }

        const stats = await workoutFirestoreService.getUserProgramStats(user.uid);
        setProgramStats(stats);

        // Charger les stats de parsing
        setParsingStats(mistralService.getParsingStats());
      } catch (err) {
        console.error('❌ Erreur chargement programmes:', err);
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    let isMounted = true;
    let setIsLoadingPrograms = (v) => {};
    setIsLoadingPrograms = (v) => { if (isMounted) {/* placeholder pour style existant */} };

    loadSavedPrograms();
    return () => { isMounted = false; };
  }, [user?.uid]);

  // Démarrer le questionnaire si nécessaire
  useEffect(() => {
    if (!isLocationConfigured && !isQuestionnaire) {
      actions.setQuestionnaire(true);
      actions.setQuestionnaireStep(0);
    }
  }, [isLocationConfigured, isQuestionnaire, actions]);

  // GÉNÉRATION PROGRAMMES RÉALISTES
  const handleRealisticGeneration = async () => {
    if (!user?.uid) {
      actions.setSearchStatus('Connectez-vous pour générer');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStage('Initialisation...');
    setLastParsingMethod(null);

    try {
      // Phase 1: Préparation
      setGenerationProgress(10);
      setGenerationStage('🏋️ Préparation programmes réalistes...');
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

      console.log('🚀 Génération programmes réalistes avec profil:', completeProfile);

      // Génération STRICTE (staged) via mistralIntegration
      const criteria = {
        location: completeProfile?.equipmentLocation || 'home',
        equipment: Array.isArray(completeProfile?.availableEquipment) ? completeProfile.availableEquipment : []
      };
      const programs = await mistralSearchService.searchWorkoutPrograms(criteria);
      if (!Array.isArray(programs) || programs.length === 0 || programs.error) {
        throw new Error(programs?.error || 'GENERATION_EMPTY');
      }
      // Vérification locale stricte : parité schedule/workouts
      programs.forEach((p, i) => {
        const s = Array.isArray(p.schedule) ? p.schedule.length : 0;
        const w = Array.isArray(p.workouts) ? p.workouts.length : 0;
        console.log(`P${i} ${p.id} schedule=${s} workouts=${w}`, p.schedule, (p.workouts||[]).map(x=>x.day));
        if (s !== w) throw new Error(`PROGRAM_${p.id}: schedule(${s}) != workouts(${w})`);
      });
      clearInterval(progressTimer);

      // Phase 3: Validation
      setGenerationProgress(90);
      setGenerationStage('✅ Validation programmes...');
      actions.setSearchStatus('✅ Validation structure hebdomadaire...');

      const newParsingStats = mistralService.getParsingStats();
      setParsingStats(newParsingStats);

      // Déterminer la méthode de parsing utilisée
      if (newParsingStats.directSuccessRate > 0) {
        setLastParsingMethod('direct');
      } else if (newParsingStats.cleanedSuccessRate > 0) {
        setLastParsingMethod('cleaned');
      } else {
        setLastParsingMethod('template');
      }

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
        <h1 className="text-3xl font-bold">Programmes Réalistes 💪</h1>
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
    <div className="p-4">
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
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    difficultyFilter === level
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
                className={`px-3 py-2 rounded-xl text-white text-sm flex items-center ${
                  isGenerating || !user ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RotateCcw size={16} className="mr-2 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" />
                    Générer (IA stricte)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="p-4">
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
        <div className="bg-white p-4 rounded-2xl shadow flex items-center">
          <Award className="text-yellow-500 mr-3" />
          <div>
            <p className="text-sm text-gray-600">Méthode parsing</p>
            <p className="text-2xl font-bold">{lastParsingMethod || '-'}</p>
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
        className={`w-full py-4 rounded-2xl font-semibold text-white transition-all relative overflow-hidden ${
          isGenerating || !user
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
              <span>Générer 3 programmes réalistes (IA stricte)</span>
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
    <div className="p-4">
      {generatedPrograms.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6 text-center text-gray-600">
          Aucun programme généré pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {generatedPrograms
            .filter(p => {
              const okLevel = difficultyFilter === 'all' || (p.level || '').toLowerCase() === difficultyFilter;
              const okSearch = !searchTerm || (p.title + ' ' + p.description).toLowerCase().includes(searchTerm.toLowerCase());
              return okLevel && okSearch;
            })
            .map((program, idx) => (
              <div key={program.id || idx} className="bg-white rounded-2xl shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{program.title || `Programme ${idx+1}`}</h3>
                    <p className="text-sm text-gray-600">{program.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      {program.level} • {program.duration}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProgramIndex(idx);
                        setShowDetails(true);
                      }}
                      className="mt-2 inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
                    >
                      Voir détails <ArrowRight size={16} className="ml-1" />
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
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:w-[700px] max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden">
          <div className="flex items-center p-4 border-b">
            <button onClick={() => setShowDetails(false)} className="mr-2 p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft size={20} />
            </button>
            <h3 className="font-semibold">{program.title}</h3>
          </div>
          <div className="p-4 overflow-y-auto max-h-[75vh]">
            {(program.workouts || []).map((w) => (
              <div key={w.day} className="mb-4 border rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{w.day}</span>
                  <span className="text-sm text-gray-600">{w.duration || program.sessionDuration || '60 min'}</span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(w.exercises || []).map((e, i) => (
                    <div key={i} className="text-sm bg-gray-50 rounded p-2">
                      <div className="font-medium">{e.name}</div>
                      <div className="text-gray-600">
                        {typeof e.sets === 'number' ? `${e.sets} séries • ` : ''}
                        {e.reps ? `${e.reps}` : ''}
                        {e.rest ? ` • repos ${e.rest}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20 bg-gradient-to-br from-gray-50 to-purple-50 min-h-screen">
      {renderHeader()}

      <div className="p-6 space-y-6">
        {renderStats()}
        {renderRealisticGenerationButton()}
        {renderFilters()}
        {renderProgramsList()}
      </div>

      {isQuestionnaire && (
        <Questionnaire />
      )}

      {showDetails && renderProgramDetails()}
    </div>
  );
}

export default UltraRobustWorkoutView;
