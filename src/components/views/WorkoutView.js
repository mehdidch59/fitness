import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  Dumbbell, BarChart2, Clock, ArrowRight, Search, Filter, 
  ArrowLeft, AlertCircle, Calendar,
  Play, RotateCcw, Timer, Award, BookOpen
} from 'lucide-react';
import Questionnaire from '../ui/Questionnaire';
import { mistralService } from '../../services/mistralService';
import { workoutFirestoreService } from '../../services/workoutFirestoreService';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';

function UltraRobustWorkoutView() {
  const {
    isQuestionnaire,
    searchStatus,
    workoutPrograms,
    equipmentProfile,
    actions
  } = useAppContext();

  const [user, loading, error] = useAuthState(auth);
  const [isFiltering, setIsFiltering] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState('');

  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [generatedPrograms, setGeneratedPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
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

      } catch (error) {
        console.error('❌ Erreur chargement programmes:', error);
        actions.setSearchStatus('Erreur lors du chargement');
      } finally {
        setIsLoadingPrograms(false);
      }
    };

    if (user && !loading) {
      loadSavedPrograms();
    }
  }, [user, loading, actions]);

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

      const programs = await mistralService.generateWorkoutPrograms(completeProfile);
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

        // Nettoyer après 5 secondes
        setTimeout(() => {
          setGenerationProgress(0);
          setGenerationStage('');
        }, 5000);
      } else {
        setGenerationStage('❌ Aucun programme généré');
        actions.setSearchStatus('❌ Erreur génération');
      }

    } catch (error) {
      console.error('❌ Erreur génération programmes:', error);
      setGenerationProgress(0);
      setGenerationStage('❌ Erreur');
      setLastParsingMethod('error');
      actions.setSearchStatus(`❌ Erreur de génération`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Tous les programmes (générés + trouvés)
  const allPrograms = [...generatedPrograms, ...workoutPrograms];

  // Filtrer les programmes selon difficulté et type
  const filteredPrograms = allPrograms.filter(program => {
    const matchesDifficulty = difficultyFilter === 'all' || 
      program.level?.toLowerCase().includes(difficultyFilter.toLowerCase());
    const matchesType = typeFilter === 'all' || 
      program.type?.toLowerCase() === typeFilter.toLowerCase();
    return matchesDifficulty && matchesType;
  });

  // COMPOSANT: Bouton de génération réaliste
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
          ) : !user ? (
            <>
              <AlertCircle size={20} className="mr-2" />
              Connectez-vous pour générer
            </>
          ) : (
            <div className="flex items-center">
              <Award size={20} className="mr-2" />
              <div className="flex flex-col">
                <span>Génération Programmes</span>
                <span className="text-xs opacity-90">
                  🏋️ FullBody • HalfBody • Split • Structure hebdomadaire complète
                </span>
              </div>
            </div>
          )}
        </div>
      </button>
      
      {/* Statistiques de performance */}
      {lastGeneration && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Dernière génération: {new Date(lastGeneration).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          {lastParsingMethod && (
            <p className="text-xs text-blue-600 font-medium">
              Méthode: {lastParsingMethod === 'template' ? 'Template réaliste' : lastParsingMethod}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // COMPOSANT: Afficher les filtres
  const renderFilters = () => (
    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Filtres</h3>
        <button
          onClick={() => setIsFiltering(false)}
          className="text-purple-600 text-sm font-medium"
        >
          Fermer
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Type de programme</p>
          <div className="flex gap-2 flex-wrap">
            {['all', 'fullbody', 'halfbody', 'split'].map(type => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  typeFilter === type
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? 'Tous' : 
                 type === 'fullbody' ? 'FullBody' :
                 type === 'halfbody' ? 'HalfBody' : 
                 'Split'}
              </button>
            ))}
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
                {level === 'all' ? 'Tous' : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // COMPOSANT: Badge de type de programme
  const renderProgramTypeBadge = (type) => {
    const colors = {
      fullbody: 'bg-green-100 text-green-800',
      halfbody: 'bg-blue-100 text-blue-800', 
      split: 'bg-purple-100 text-purple-800'
    };
    
    const labels = {
      fullbody: 'FullBody',
      halfbody: 'HalfBody',
      split: 'Split'
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    );
  };

  // COMPOSANT: Vue détaillée d'un workout spécifique
  const WorkoutDetail = ({ workout, program, onBack }) => (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft size={20} className="mr-2" />
          Retour au programme
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* En-tête du workout */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{workout.name}</h1>
              <p className="text-purple-100">{workout.day} • {workout.duration}</p>
            </div>
            <div className="text-right">
              <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full">
                <span className="text-sm font-medium">{program.type?.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Liste des exercices */}
          <div className="space-y-4">
            {workout.exercises?.map((exercise, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-l-4 ${
                  exercise.type === 'warmup' ? 'bg-yellow-50 border-yellow-400' :
                  exercise.type === 'compound' ? 'bg-blue-50 border-blue-400' :
                  'bg-purple-50 border-purple-400'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{exercise.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    exercise.type === 'warmup' ? 'bg-yellow-200 text-yellow-800' :
                    exercise.type === 'compound' ? 'bg-blue-200 text-blue-800' :
                    'bg-purple-200 text-purple-800'
                  }`}>
                    {exercise.type === 'warmup' ? 'Échauffement' :
                     exercise.type === 'compound' ? 'Composé' : 'Isolation'}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <div className="font-bold text-purple-600">{exercise.sets}</div>
                    <div className="text-xs text-gray-600">Séries</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-blue-600">{exercise.reps}</div>
                    <div className="text-xs text-gray-600">Répétitions</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">{exercise.rest}</div>
                    <div className="text-xs text-gray-600">Repos</div>
                  </div>
                </div>

                <p className="text-gray-700 text-sm mb-2">{exercise.instructions}</p>
                
                <div className="flex flex-wrap gap-1">
                  {exercise.targetMuscles?.map((muscle, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // COMPOSANT: Vue détaillée d'un programme avec semaine
  const ProgramDetail = ({ program, onBack }) => (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      <div className="mb-4">
        <button
          onClick={onBack}
          className="flex items-center text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft size={20} className="mr-2" />
          Retour aux programmes
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
        {/* En-tête du programme */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{program.title}</h1>
              <p className="text-blue-100">{program.description}</p>
            </div>
            <div className="text-right">
              {renderProgramTypeBadge(program.type)}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Informations du programme */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-purple-50 p-4 rounded-xl">
              <div className="text-purple-600 font-semibold">{program.level}</div>
              <div className="text-purple-700 text-sm">Niveau</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-blue-600 font-semibold">{program.frequency}</div>
              <div className="text-blue-700 text-sm">Fréquence</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="text-green-600 font-semibold">{program.sessionDuration}</div>
              <div className="text-green-700 text-sm">Durée/séance</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl">
              <div className="text-orange-600 font-semibold">{program.duration}</div>
              <div className="text-orange-700 text-sm">Programme</div>
            </div>
          </div>

          {/* Structure hebdomadaire */}
          {program.weekStructure && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center">
                <Calendar size={20} className="mr-2 text-purple-600" />
                Structure de la semaine
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {program.weekStructure.map((day, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-center text-xs ${
                      day.isTrainingDay 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <div className="font-medium">{day.day.substring(0, 3)}</div>
                    <div className="mt-1">
                      {day.isTrainingDay ? (
                        <Dumbbell size={14} className="mx-auto" />
                      ) : (
                        <RotateCcw size={14} className="mx-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conseils */}
          {program.tips && program.tips.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 flex items-center">
                <BookOpen size={20} className="mr-2 text-blue-600" />
                Conseils d'entraînement
              </h3>
              <div className="bg-blue-50 p-4 rounded-xl">
                <ul className="space-y-2">
                  {program.tips.map((tip, index) => (
                    <li key={index} className="text-blue-800 text-sm flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Séances d'entraînement */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center">
          <Play size={24} className="mr-2 text-green-600" />
          Séances d'entraînement
        </h2>
        
        {program.workouts?.map((workout, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200"
            onClick={() => setSelectedWorkout(workout)}
          >
            <div className="bg-gradient-to-r from-green-500 to-teal-500 px-4 py-3 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold">{workout.name}</h3>
                  <p className="text-green-100 text-sm">{workout.day}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm">{workout.duration}</div>
                  <div className="text-xs text-green-100">
                    {workout.exercises?.length || 0} exercices
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Timer size={14} className="mr-1" />
                    {workout.duration}
                  </div>
                  <div className="flex items-center">
                    <Dumbbell size={14} className="mr-1" />
                    {workout.exercises?.length || 0} exercices
                  </div>
                </div>
                <ArrowRight size={16} className="text-purple-500" />
              </div>
              
              {/* Aperçu des exercices */}
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {workout.exercises?.slice(0, 3).map((exercise, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                      {exercise.name}
                    </span>
                  ))}
                  {workout.exercises?.length > 3 && (
                    <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                      +{workout.exercises.length - 3} autres
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Affichage de chargement
  if (loading || isLoadingPrograms) {
    return (
      <div className="pb-20 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Dumbbell size={32} className="text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-blue-700 font-medium">Chargement programmes...</p>
          <p className="text-xs text-gray-500 mt-1">🏋️ Programmes réalistes avec structure hebdomadaire</p>
        </div>
      </div>
    );
  }

  // Si un workout est sélectionné, afficher ses détails
  if (selectedWorkout) {
    return (
      <WorkoutDetail
        workout={selectedWorkout}
        program={selectedProgram}
        onBack={() => setSelectedWorkout(null)}
      />
    );
  }

  // Si un programme est sélectionné, afficher ses détails
  if (selectedProgram) {
    return (
      <ProgramDetail
        program={selectedProgram}
        onBack={() => setSelectedProgram(null)}
      />
    );
  }

  return (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Programmes d'Entraînement</h2>

        <div className="flex space-x-2">
          <button
            onClick={() => setIsFiltering(!isFiltering)}
            className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <Filter size={20} className="text-gray-600" />
          </button>
          <button
            onClick={() => actions.setQuestionnaire(true)}
            className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
          >
            <Search size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Afficher les filtres si nécessaire */}
      {isFiltering && renderFilters()}

      {/* Bouton de génération réaliste */}
      {renderRealisticGenerationButton()}

      {/* Afficher le statut de recherche */}
      {searchStatus && (
        <div className="bg-white rounded-xl p-4 shadow mb-4 text-center">
          <p className="text-purple-600 font-medium">{searchStatus}</p>
        </div>
      )}

      {/* Liste de programmes */}
      {filteredPrograms.length > 0 ? (
        <div className="space-y-4">
          {filteredPrograms.map((program, index) => (
            <div
              key={`${program.id}-${index}`}
              className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1"
              onClick={() => setSelectedProgram(program)}
            >
              <div className={`px-4 py-3 text-white ${
                program.type === 'fullbody' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                program.type === 'halfbody' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                program.type === 'split' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                'bg-gradient-to-r from-gray-500 to-gray-600'
              }`}>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{program.title}</h3>
                  <div className="flex space-x-2">
                    {program.type && renderProgramTypeBadge(program.type)}
                    {program.aiGenerated && (
                      <span className="bg-white bg-opacity-20 text-xs px-2 py-1 rounded-full">
                        🤖 IA
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex space-x-4 mb-3">
                  <div className="flex items-center">
                    <BarChart2 size={16} className="text-purple-500 mr-1" />
                    <span className="text-sm">{program.level}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock size={16} className="text-purple-500 mr-1" />
                    <span className="text-sm">{program.frequency}</span>
                  </div>
                  <div className="flex items-center">
                    <Timer size={16} className="text-purple-500 mr-1" />
                    <span className="text-sm">{program.sessionDuration}</span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3">{program.description}</p>

                {/* Planning de la semaine en aperçu */}
                {program.schedule && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Planning</p>
                    <div className="flex flex-wrap gap-1">
                      {program.schedule.map((day, idx) => (
                        <span key={idx} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {program.workouts?.length || 0} séances • Cliquez pour détails
                  </span>
                  <ArrowRight size={16} className="text-purple-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !searchStatus && !isGenerating && (
        <div className="bg-white rounded-xl p-6 shadow-md text-center">
          <div className="bg-blue-100 p-3 rounded-full inline-flex mb-3">
            <Dumbbell size={24} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Aucun programme trouvé</h3>
          <p className="text-gray-600 mb-4">
            {!user
              ? 'Connectez-vous pour générer des programmes réalistes'
              : 'Générez des programmes FullBody, HalfBody et Split'
            }
          </p>
          <div className="space-y-2">
            {user && (
              <button
                onClick={handleRealisticGeneration}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 flex items-center justify-center"
                disabled={isGenerating}
              >
                <Award size={20} className="mr-2" />
                Générer Programmes Réalistes
              </button>
            )}
            <button
              onClick={() => actions.setQuestionnaire(true)}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Configurer préférences
            </button>
          </div>
        </div>
      )}

      {/* Questionnaire */}
      {isQuestionnaire && <Questionnaire />}
    </div>
  );
}

export default UltraRobustWorkoutView;