import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Dumbbell, BarChart2, Clock, ArrowRight, Search, Filter } from 'lucide-react';
import Questionnaire from '../ui/Questionnaire';

function WorkoutView() {
  const { 
    isQuestionnaire, 
    searchStatus, 
    workoutPrograms, 
    equipmentProfile, 
    actions 
  } = useAppContext();
  
  const [isFiltering, setIsFiltering] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  
  // Vérifier si l'utilisateur a déjà configuré son lieu d'entraînement
  const isLocationConfigured = Boolean(equipmentProfile.location);
  
  // Démarrer le questionnaire si nécessaire
  useEffect(() => {
    if (!isLocationConfigured && !isQuestionnaire) {
      actions.setQuestionnaire(true);
      actions.setQuestionnaireStep(0);
    }
  }, [isLocationConfigured, isQuestionnaire, actions]);
  
  // Déclencher la recherche de programmes adaptés
  useEffect(() => {
    if (isLocationConfigured && workoutPrograms.length === 0 && !searchStatus) {
      actions.findSuitableWorkouts();
    }
  }, [isLocationConfigured, workoutPrograms.length, searchStatus, actions]);
  
  // Filtrer les programmes selon la difficulté
  const filteredPrograms = difficultyFilter === 'all'
    ? workoutPrograms
    : workoutPrograms.filter(program => program.level.toLowerCase() === difficultyFilter);
  
  // Afficher les équipements utilisés dans le programme
  const renderEquipment = (equipment) => {
    if (!equipment || equipment === 'Aucun') {
      return <span className="text-gray-600">Aucun équipement nécessaire</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {equipment.split(', ').map((item, index) => (
          <span key={index} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
            {item}
          </span>
        ))}
      </div>
    );
  };
  
  // Afficher les filtres
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
      
      <div>
        <p className="text-sm text-gray-600 mb-2">Niveau de difficulté</p>
        <div className="flex gap-2">
          <button
            onClick={() => setDifficultyFilter('all')}
            className={`px-3 py-1 rounded-full text-sm ${
              difficultyFilter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setDifficultyFilter('débutant')}
            className={`px-3 py-1 rounded-full text-sm ${
              difficultyFilter === 'débutant'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Débutant
          </button>
          <button
            onClick={() => setDifficultyFilter('intermédiaire')}
            className={`px-3 py-1 rounded-full text-sm ${
              difficultyFilter === 'intermédiaire'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Intermédiaire
          </button>
          <button
            onClick={() => setDifficultyFilter('avancé')}
            className={`px-3 py-1 rounded-full text-sm ${
              difficultyFilter === 'avancé'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Avancé
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Programmes</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setIsFiltering(!isFiltering)}
            className="p-2 bg-white rounded-full shadow-sm"
          >
            <Filter size={20} className="text-gray-600" />
          </button>
          <button
            onClick={() => actions.setQuestionnaire(true)}
            className="p-2 bg-white rounded-full shadow-sm"
          >
            <Search size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Afficher les filtres si nécessaire */}
      {isFiltering && renderFilters()}
      
      {/* Afficher le statut de recherche */}
      {searchStatus && (
        <div className="bg-white rounded-xl p-4 shadow mb-4 text-center">
          <p className="text-purple-600 font-medium">{searchStatus}</p>
        </div>
      )}
      
      {/* Équipement disponible (si configuré) */}
      {equipmentProfile.location === 'home' && equipmentProfile.homeEquipment && equipmentProfile.homeEquipment.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-md mb-4">
          <h3 className="text-sm text-gray-600 mb-2">Votre équipement</h3>
          <div className="flex flex-wrap gap-2">
            {equipmentProfile.homeEquipment.map((item, index) => (
              <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Liste de programmes */}
      {filteredPrograms.length > 0 ? (
        <div className="space-y-4">
          {filteredPrograms.map((program, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-white">
                <h3 className="font-bold text-lg">{program.title}</h3>
              </div>
              
              <div className="p-4">
                <div className="flex space-x-4 mb-3">
                  <div className="flex items-center">
                    <BarChart2 size={16} className="text-purple-500 mr-1" />
                    <span className="text-sm">{program.level}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock size={16} className="text-purple-500 mr-1" />
                    <span className="text-sm">{program.duration}</span>
                  </div>
                  <div className="flex items-center">
                    <Dumbbell size={16} className="text-purple-500 mr-1" />
                    <span className="text-sm">{equipmentProfile.location}</span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-3">{program.description}</p>
                
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Équipement</p>
                  {renderEquipment(program.equipment)}
                </div>
                
                <button className="w-full bg-purple-100 text-purple-800 py-2 rounded-lg flex justify-center items-center font-medium hover:bg-purple-200 transition-colors">
                  Voir le programme <ArrowRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !searchStatus && (
        <div className="bg-white rounded-xl p-6 shadow-md text-center">
          <div className="bg-purple-100 p-3 rounded-full inline-flex mb-3">
            <Dumbbell size={24} className="text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Aucun programme trouvé</h3>
          <p className="text-gray-600 mb-4">Configurez vos préférences d'entraînement pour trouver des programmes adaptés</p>
          <button
            onClick={() => actions.setQuestionnaire(true)}
            className="bg-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-600 transition-colors"
          >
            Configurer maintenant
          </button>
        </div>
      )}
      
      {/* Questionnaire */}
      {isQuestionnaire && <Questionnaire />}
    </div>
  );
}

export default WorkoutView; 