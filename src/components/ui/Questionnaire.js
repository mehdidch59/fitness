import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../utils/i18n';

function Questionnaire() {
  const { questionnaireStep, equipmentProfile, nutritionProfile, actions } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [showEquipmentQuestion, setShowEquipmentQuestion] = useState(false);
  const { t } = useI18n();

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

  // Fonction pour sauvegarder dans Firestore
  const saveToFirestore = async (profileType, data) => {
    if (!user?.uid) {
      console.error('Aucun utilisateur connecté pour sauvegarder');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      if (profileType === 'equipmentProfile') {
        await updateDoc(userDocRef, {
          equipmentProfile: {
            ...equipmentProfile,
            ...data
          },
          updatedAt: new Date().toISOString()
        });
        // console.log('✅ EquipmentProfile sauvegardé dans Firestore:', data);
      } 
      else if (profileType === 'nutritionProfile') {
        await updateDoc(userDocRef, {
          nutritionProfile: {
            ...nutritionProfile,
            ...data
          },
          updatedAt: new Date().toISOString()
        });
        // console.log('✅ NutritionProfile sauvegardé dans Firestore:', data);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde Firestore:', error);
    }
  };

  // Questions du questionnaire - maintenant dynamique avec questions conditionnelles
  const getQuestions = () => {
    // Questions de base
    const baseQuestions = [
      {
        title: t('questionnaire.whereTrain', 'Où vous entraînez-vous ?'),
        field: 'location',
        options: [
          { value: 'home', label: t('questionnaire.location.home', '🏠 À la maison') },
          { value: 'gym', label: t('questionnaire.location.gym', '🏋️ En salle') },
          { value: 'both', label: t('questionnaire.location.both', '🔄 Les deux') }
        ],
        targetProfile: 'equipmentProfile'
      },
      {
        title: t('questionnaire.diet', 'Votre régime alimentaire ?'),
        field: 'dietType',
        options: [
          { value: 'omnivore', label: t('questionnaire.diet.omnivore', '🍖 Omnivore') },
          { value: 'vegetarian', label: t('questionnaire.diet.vegetarian', '🥗 Végétarien') },
          { value: 'vegan', label: t('questionnaire.diet.vegan', '🌱 Végan') }
        ],
        targetProfile: 'nutritionProfile'
      },
      {
        title: t('questionnaire.cookingTime', 'Temps de cuisine ?'),
        field: 'cookingTime',
        options: [
          { value: 'quick', label: t('questionnaire.cooking.quick', '⚡ Express (< 15 min)') },
          { value: 'medium', label: t('questionnaire.cooking.medium', '🕐 Modéré (15-30 min)') },
          { value: 'long', label: t('questionnaire.cooking.long', '🍳 J\'aime cuisiner (> 30 min)') }
        ],
        targetProfile: 'nutritionProfile'
      }
    ];
    
    // Ajouter conditionnellement la question d'équipement
    if (showEquipmentQuestion) {
      const equipmentQuestion = {
        title: t('questionnaire.homeEquipment.title', 'Quel équipement avez-vous à la maison ?'),
        field: 'homeEquipment',
        type: 'multiselect',
        options: [
          { value: 'dumbbells', label: t('questionnaire.equipment.dumbbells', 'Haltères') },
          { value: 'kettlebell', label: t('questionnaire.equipment.kettlebell', 'Kettlebell') },
          { value: 'resistanceBands', label: t('questionnaire.equipment.resistanceBands', 'Bandes élastiques') },
          { value: 'pullupBar', label: t('questionnaire.equipment.pullupBar', 'Barre de traction') },
          { value: 'bench', label: t('questionnaire.equipment.bench', 'Banc de musculation') },
          { value: 'yoga', label: t('questionnaire.equipment.yoga', 'Tapis de yoga/fitness') },
          { value: 'jumpRope', label: t('questionnaire.equipment.jumpRope', 'Corde à sauter') },
          { value: 'foam', label: t('questionnaire.equipment.foam', 'Rouleau de massage') }
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
  const handleOptionSelect = async (value) => {
    const updateData = { [currentQuestion.field]: value };
    
    // Mettre à jour le contexte local
    if (currentQuestion.targetProfile === 'equipmentProfile') {
      actions.updateEquipmentProfile(updateData);
    } else if (currentQuestion.targetProfile === 'nutritionProfile') {
      actions.updateNutritionProfile(updateData);
    }
    
    // Sauvegarder dans Firestore
    await saveToFirestore(currentQuestion.targetProfile, updateData);
    
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
  const handleEquipmentSave = async () => {
    const updateData = { homeEquipment: selectedEquipment };
    
    // Mettre à jour le contexte local
    actions.updateEquipmentProfile(updateData);
    
    // Sauvegarder dans Firestore
    await saveToFirestore('equipmentProfile', updateData);
    
    handleNext();
  };
  // Gérer le passage à la question suivante
  const handleNext = () => {
    if (questionnaireStep < questions.length - 1) {
      actions.setQuestionnaireStep(questionnaireStep + 1);
    } else {      // Terminer le questionnaire
      actions.completeQuestionnaire();
      actions.setSearchStatus(t('questionnaire.done', 'Configuration terminée !'));
      console.log('🎉 Questionnaire terminé !');
      console.log('📊 EquipmentProfile final:', equipmentProfile);
      console.log('🍽️ NutritionProfile final:', nutritionProfile);
    }
  };

  // Fonction pour passer une question sans répondre
  const handleSkip = async () => {
    // Si c'est la question d'équipement, on sauvegarde un tableau vide
    if (currentQuestion.type === 'multiselect' && currentQuestion.field === 'homeEquipment') {
      const updateData = { homeEquipment: [] };
      actions.updateEquipmentProfile(updateData);
      await saveToFirestore('equipmentProfile', updateData);
    }
    
    handleNext();
  };

  // Si l'utilisateur n'est pas connecté, empêcher l'accès au QCM et proposer la connexion
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-center">
          <h3 className="text-2xl font-bold mb-2">{t('questionnaire.authRequired', 'Connexion requise')}</h3>
          <p className="text-gray-600 mb-6">
            {t('questionnaire.authMessage', 'Vous devez être connecté pour effectuer le questionnaire de configuration.')}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                actions.setQuestionnaire(false);
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-2xl font-semibold hover:bg-gray-300 transition-colors"
            >
              {t('common.back', 'Retour')}
            </button>
            <button
              onClick={() => {
                actions.setQuestionnaire(false);
                navigate('/auth');
              }}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-indigo-500 dark:to-violet-600 text-white py-3 rounded-2xl font-semibold"
            >
              {t('common.login', 'Se connecter')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-2xl font-bold mb-6 text-center">{t('questionnaire.title', 'Configuration')}</h3>

        <div className="bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-indigo-500 dark:to-violet-600 h-2 rounded-full transition-all"
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
                onClick={handleSkip}
                className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-300 transition-colors"
              >
                {t('questionnaire.skip', 'Passer')}
              </button>
              <button
                onClick={handleEquipmentSave}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-indigo-500 dark:to-violet-600 text-white py-4 rounded-2xl font-semibold text-lg"
                disabled={selectedEquipment.length === 0}
              >
                {t('questionnaire.save', 'Enregistrer')} {selectedEquipment.length > 0 && `(${selectedEquipment.length})`}
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
              onClick={handleSkip}
              className="w-full bg-gray-300 text-gray-700 py-3 rounded-2xl font-semibold text-lg mb-3 hover:bg-gray-400 transition-colors"
            >
              {t('questionnaire.skipThis', 'Passer cette question')}
            </button>
          </>
        )}

        {/* Debug info - à retirer en production */}
        <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
          <p className="font-semibold">🔍 Debug:</p>
          <p>{t('questionnaire.debug.question', 'Question')} {questionnaireStep + 1}/{questions.length}</p>
          <p>{t('questionnaire.debug.type', 'Type')}: {currentQuestion.targetProfile}</p>
          <p>{t('questionnaire.debug.field', 'Champ')}: {currentQuestion.field}</p>
          {currentQuestion.type === 'multiselect' && (
            <p>{t('questionnaire.debug.selected', 'Sélectionnés')}: {selectedEquipment.length} {t('questionnaire.debug.items', 'équipements')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Questionnaire;
