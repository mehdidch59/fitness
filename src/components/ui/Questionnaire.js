import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Check } from 'lucide-react';

function Questionnaire() {
  const { questionnaireStep, equipmentProfile, actions } = useAppContext();
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [showEquipmentQuestion, setShowEquipmentQuestion] = useState(false);

  // Réinitialiser les équipements sélectionnés lorsque le questionnaire se ferme
  useEffect(() => {
    if (questionnaireStep === 0) {
      setSelectedEquipment([]);
    }
  }, [questionnaireStep]);

  // Mettre à jour l'affichage de la question d'équipement basé sur le profil
  useEffect(() => {
    setShowEquipmentQuestion(
      equipmentProfile.location === 'home' || equipmentProfile.location === 'both'
    );
    
    // Initialiser les équipements sélectionnés depuis le profil si disponible
    if (equipmentProfile.homeEquipment && equipmentProfile.homeEquipment.length > 0) {
      setSelectedEquipment(equipmentProfile.homeEquipment);
    }
  }, [equipmentProfile.location, equipmentProfile.homeEquipment]);

  // Questions du questionnaire - maintenant dynamique avec questions conditionnelles
  const getQuestions = () => {
    // Questions de base
    const baseQuestions = [
      {
        title: "Où vous entraînez-vous ?",
        field: 'location',
        options: [
          { value: 'home', label: '🏠 À la maison' },
          { value: 'gym', label: '🏋️ En salle' },
          { value: 'both', label: '🔄 Les deux' }
        ],
        targetProfile: 'equipmentProfile'
      },
      {
        title: "Votre régime alimentaire ?",
        field: 'dietType',
        options: [
          { value: 'omnivore', label: '🍖 Omnivore' },
          { value: 'vegetarian', label: '🥗 Végétarien' },
          { value: 'vegan', label: '🌱 Végan' }
        ],
        targetProfile: 'nutritionProfile'
      },
      {
        title: "Temps de cuisine ?",
        field: 'cookingTime',
        options: [
          { value: 'quick', label: '⚡ Express (< 15 min)' },
          { value: 'medium', label: '🕐 Modéré (15-30 min)' },
          { value: 'long', label: '🍳 J\'aime cuisiner (> 30 min)' }
        ],
        targetProfile: 'nutritionProfile'
      }
    ];
    
    // Ajouter conditionnellement la question d'équipement
    if (showEquipmentQuestion) {
      const equipmentQuestion = {
        title: "Quel équipement avez-vous à la maison ?",
        field: 'homeEquipment',
        type: 'multiselect',
        options: [
          { value: 'dumbbells', label: 'Haltères' },
          { value: 'kettlebell', label: 'Kettlebell' },
          { value: 'resistanceBands', label: 'Bandes élastiques' },
          { value: 'pullupBar', label: 'Barre de traction' },
          { value: 'bench', label: 'Banc de musculation' },
          { value: 'yoga', label: 'Tapis de yoga/fitness' },
          { value: 'jumpRope', label: 'Corde à sauter' },
          { value: 'foam', label: 'Rouleau de massage' }
        ],
        targetProfile: 'equipmentProfile'
      };
      
      // Insérer la question après la première (lieu d'entraînement)
      return [
        baseQuestions[0],
        equipmentQuestion,
        ...baseQuestions.slice(1)
      ];
    }
    
    return baseQuestions;
  };
  
  const questions = getQuestions();
  const currentQuestion = questions[questionnaireStep] || questions[0];

  // Gérer la sélection d'option pour les questions à choix unique
  const handleOptionSelect = (value) => {
    // Mettre à jour le profil selon le type
    if (currentQuestion.targetProfile === 'equipmentProfile') {
      actions.updateEquipmentProfile({ [currentQuestion.field]: value });
    } else if (currentQuestion.targetProfile === 'nutritionProfile') {
      actions.updateNutritionProfile({ [currentQuestion.field]: value });
    }
    
    // Passer à la question suivante ou terminer
    handleNext();
  };
  
  // Gérer la sélection multiple pour les équipements
  const handleEquipmentToggle = (value) => {
    setSelectedEquipment(prev => {
      // Ajouter ou retirer l'équipement selon qu'il est déjà sélectionné ou non
      if (prev.includes(value)) {
        return prev.filter(item => item !== value);
      } else {
        return [...prev, value];
      }
    });
  };
  
  // Sauvegarder les équipements sélectionnés et passer à la question suivante
  const handleEquipmentSave = () => {
    actions.updateEquipmentProfile({ homeEquipment: selectedEquipment });
    handleNext();
  };

  // Gérer le passage à la question suivante
  const handleNext = () => {
    if (questionnaireStep < questions.length - 1) {
      actions.setQuestionnaireStep(questionnaireStep + 1);
    } else {
      // Terminer le questionnaire
      actions.setQuestionnaire(false);
      actions.setQuestionnaireStep(0);
      actions.setSearchStatus('Configuration terminée !');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-2xl font-bold mb-6 text-center">Configuration</h3>

        <div className="bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
            style={{ width: `${((questionnaireStep + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h4 className="text-xl font-semibold mb-6">{currentQuestion.title}</h4>

        {currentQuestion.type === 'multiselect' ? (
          // Affichage pour sélection multiple (équipement)
          <>
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleEquipmentToggle(option.value)}
                  className={`w-full p-4 border-2 rounded-2xl text-left transition-all flex items-center justify-between ${
                    selectedEquipment.includes(option.value)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="text-lg">{option.label}</div>
                  {selectedEquipment.includes(option.value) && (
                    <div className="bg-purple-500 text-white p-1 rounded-full">
                      <Check size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleNext}
                className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-300 transition-colors"
              >
                Passer
              </button>
              <button
                onClick={handleEquipmentSave}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-semibold text-lg"
              >
                Enregistrer
              </button>
            </div>
          </>
        ) : (
          // Affichage pour questions à choix unique
          <>
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  className="w-full p-4 border-2 rounded-2xl text-left transition-all hover:shadow-md border-gray-200 hover:border-purple-500"
                >
                  <div className="text-lg">{option.label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-semibold text-lg"
            >
              {questionnaireStep === questions.length - 1 ? 'Terminer' : 'Passer'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Questionnaire; 