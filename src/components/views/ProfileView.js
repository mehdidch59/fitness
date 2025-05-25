import React, { useState } from 'react';
import Input from '../ui/Input';
import { useAppContext } from '../../context/AppContext';
import { User, Edit, ChevronRight, Activity, Target, ArrowLeft } from 'lucide-react';

function ProfileView() {
  const { userProfile, actions } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);

  // Calculer l'IMC
  const calculateBMI = () => {
    if (!userProfile.weight || !userProfile.height) return null;
    
    const weightKg = parseFloat(userProfile.weight);
    const heightM = parseFloat(userProfile.height) / 100; // convertir cm en mètres
    
    if (isNaN(weightKg) || isNaN(heightM) || heightM === 0) return null;
    
    const bmi = weightKg / (heightM * heightM);
    return bmi.toFixed(1);
  };

  // Déterminer la catégorie d'IMC
  const getBMICategory = (bmi) => {
    if (!bmi) return { text: 'Non calculé', color: 'text-gray-500' };
    
    if (bmi < 18.5) return { text: 'Insuffisance pondérale', color: 'text-blue-500' };
    if (bmi < 25) return { text: 'Corpulence normale', color: 'text-green-500' };
    if (bmi < 30) return { text: 'Surpoids', color: 'text-yellow-500' };
    if (bmi < 35) return { text: 'Obésité modérée', color: 'text-orange-500' };
    if (bmi < 40) return { text: 'Obésité sévère', color: 'text-red-500' };
    return { text: 'Obésité morbide', color: 'text-red-700' };
  };

  // Vérifier si le profil est complet
  const isProfileComplete = () => {
    const { name, age, weight, height, gender, goal, activityLevel } = userProfile;
    return Boolean(name && age && weight && height && gender && goal && activityLevel);
  };

  // Gérer les mises à jour de profil
  const handleInputChange = (field, value) => {
    actions.updateUserProfile({ [field]: value });
  };
  
  // Vérifier si l'IMC est calculable
  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);
  const complete = isProfileComplete();

  // Traduire les valeurs en texte lisible
  const getGoalText = (goal) => {
    switch (goal) {
      case 'lose_weight': return 'Perdre du poids';
      case 'gain_muscle': return 'Prendre du muscle';
      case 'maintain': return 'Maintenir ma forme';
      default: return 'Non défini';
    }
  };
  
  const getActivityText = (level) => {
    switch (level) {
      case 'sedentary': return 'Sédentaire';
      case 'light': return 'Léger (1-3 fois/sem)';
      case 'moderate': return 'Modéré (3-5 fois/sem)';
      case 'active': return 'Actif (6-7 fois/sem)';
      case 'very_active': return 'Très actif';
      default: return 'Non défini';
    }
  };
  
  const getGenderText = (gender) => {
    switch (gender) {
      case 'male': return 'Homme';
      case 'female': return 'Femme';
      default: return 'Non défini';
    }
  };

  // Mode édition
  if (isEditing) {
    return (
      <div className="pb-20 p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center mb-6">
          <button onClick={() => setIsEditing(false)} className="mr-4">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h2 className="text-2xl font-bold">Modifier mon profil</h2>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <Input
            label="Nom"
            value={userProfile.name}
            onChange={(value) => handleInputChange('name', value)}
            placeholder="Votre nom"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Âge"
              type="number"
              value={userProfile.age}
              onChange={(value) => handleInputChange('age', value)}
              placeholder="25"
            />
            <Input
              label="Genre"
              type="select"
              value={userProfile.gender}
              onChange={(value) => handleInputChange('gender', value)}
              options={[
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Poids (kg)"
              type="number"
              value={userProfile.weight}
              onChange={(value) => handleInputChange('weight', value)}
              placeholder="70"
            />
            <Input
              label="Taille (cm)"
              type="number"
              value={userProfile.height}
              onChange={(value) => handleInputChange('height', value)}
              placeholder="175"
            />
          </div>

          <Input
            label="Objectif"
            type="select"
            value={userProfile.goal}
            onChange={(value) => handleInputChange('goal', value)}
            options={[
              { value: 'lose_weight', label: 'Perdre du poids' },
              { value: 'gain_muscle', label: 'Prendre du muscle' },
              { value: 'maintain', label: 'Maintenir ma forme' }
            ]}
          />

          <Input
            label="Niveau d'activité"
            type="select"
            value={userProfile.activityLevel}
            onChange={(value) => handleInputChange('activityLevel', value)}
            options={[
              { value: 'sedentary', label: 'Sédentaire' },
              { value: 'light', label: 'Léger (1-3 fois/sem)' },
              { value: 'moderate', label: 'Modéré (3-5 fois/sem)' },
              { value: 'active', label: 'Actif (6-7 fois/sem)' },
              { value: 'very_active', label: 'Très actif' }
            ]}
          />
          
          <button 
            onClick={() => setIsEditing(false)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold mt-4"
          >
            Enregistrer
          </button>
        </div>
      </div>
    );
  }

  // Mode affichage du résumé
  return (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-8 text-center">Mon Profil</h2>
      
      {complete ? (
        <>
          {/* Carte principale avec IMC */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-full mr-4">
                  <User size={28} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{userProfile.name}</h3>
                  <p className="text-gray-600">{userProfile.age} ans • {getGenderText(userProfile.gender)}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Edit size={20} className="text-gray-700" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-gray-600 text-sm mb-1">Taille</p>
                <p className="text-lg font-semibold">{userProfile.height} cm</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-gray-600 text-sm mb-1">Poids</p>
                <p className="text-lg font-semibold">{userProfile.weight} kg</p>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-xl mb-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-purple-900">IMC</h4>
                <span className={`font-bold text-xl ${bmiCategory.color}`}>{bmi}</span>
              </div>
              <p className={`text-sm ${bmiCategory.color}`}>{bmiCategory.text}</p>
              <div className="mt-3 bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500"
                  style={{ 
                    clipPath: `polygon(0 0, ${Math.min(Math.max((parseFloat(bmi) / 40) * 100, 0), 100)}% 0, ${Math.min(Math.max((parseFloat(bmi) / 40) * 100, 0), 100)}% 100%, 0 100%)` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>40</span>
              </div>
            </div>
          </div>
          
          {/* Cartes d'informations supplémentaires */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-md">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Target size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-600 text-sm">Objectif</h4>
                  <p className="font-semibold">{getGoalText(userProfile.goal)}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 shadow-md">
              <div className="flex items-center">
                <div className="bg-green-100 p-2 rounded-lg mr-3">
                  <Activity size={20} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-600 text-sm">Niveau d'activité</h4>
                  <p className="font-semibold">{getActivityText(userProfile.activityLevel)}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsEditing(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold mt-6"
          >
            Modifier mon profil
          </button>
        </>
      ) : (
        // Profil incomplet - afficher le formulaire
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          <div className="text-center mb-4">
            <div className="bg-yellow-100 p-3 rounded-full inline-flex mb-2">
              <User size={24} className="text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold">Complétez votre profil</h3>
            <p className="text-gray-600 text-sm">Pour calculer votre IMC et personnaliser votre expérience</p>
          </div>
          
          <Input
            label="Nom"
            value={userProfile.name}
            onChange={(value) => handleInputChange('name', value)}
            placeholder="Votre nom"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Âge"
              type="number"
              value={userProfile.age}
              onChange={(value) => handleInputChange('age', value)}
              placeholder="25"
            />
            <Input
              label="Genre"
              type="select"
              value={userProfile.gender}
              onChange={(value) => handleInputChange('gender', value)}
              options={[
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Poids (kg)"
              type="number"
              value={userProfile.weight}
              onChange={(value) => handleInputChange('weight', value)}
              placeholder="70"
            />
            <Input
              label="Taille (cm)"
              type="number"
              value={userProfile.height}
              onChange={(value) => handleInputChange('height', value)}
              placeholder="175"
            />
          </div>

          <Input
            label="Objectif"
            type="select"
            value={userProfile.goal}
            onChange={(value) => handleInputChange('goal', value)}
            options={[
              { value: 'lose_weight', label: 'Perdre du poids' },
              { value: 'gain_muscle', label: 'Prendre du muscle' },
              { value: 'maintain', label: 'Maintenir ma forme' }
            ]}
          />

          <Input
            label="Niveau d'activité"
            type="select"
            value={userProfile.activityLevel}
            onChange={(value) => handleInputChange('activityLevel', value)}
            options={[
              { value: 'sedentary', label: 'Sédentaire' },
              { value: 'light', label: 'Léger (1-3 fois/sem)' },
              { value: 'moderate', label: 'Modéré (3-5 fois/sem)' },
              { value: 'active', label: 'Actif (6-7 fois/sem)' },
              { value: 'very_active', label: 'Très actif' }
            ]}
          />
        </div>
      )}
    </div>
  );
}

export default ProfileView; 