import { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Target, Dumbbell, Apple } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import Input from '../ui/Input';

function SettingsView() {
  const { userProfile, equipmentProfile, nutritionProfile, actions } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    // Profil utilisateur
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    goal: '',
    activityLevel: '',
    // Équipement
    location: '',
    homeEquipment: [],
    gymFrequency: '',
    // Nutrition
    dietType: '',
    cookingTime: '',
    allergies: [],
    favorites: []
  });

  // Charger les données existantes
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    setFormData({
      firstName: userData.firstName || userProfile.firstName || '',
      lastName: userData.lastName || userProfile.lastName || '',
      age: userProfile.age || '',
      gender: userProfile.gender || '',
      weight: userProfile.weight || '',
      height: userProfile.height || '',
      goal: userProfile.goal || '',
      activityLevel: userProfile.activityLevel || '',
      location: equipmentProfile.location || '',
      homeEquipment: equipmentProfile.homeEquipment || [],
      gymFrequency: equipmentProfile.gymFrequency || '',
      dietType: nutritionProfile.dietType || '',
      cookingTime: nutritionProfile.cookingTime || '',
      allergies: nutritionProfile.allergies || [],
      favorites: nutritionProfile.favorites || []
    });
  }, [userProfile, equipmentProfile, nutritionProfile]);

  // Gérer les changements
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Gérer la sélection multiple d'équipements
  const handleEquipmentToggle = (equipment) => {
    setFormData(prev => ({
      ...prev,
      homeEquipment: prev.homeEquipment.includes(equipment)
        ? prev.homeEquipment.filter(item => item !== equipment)
        : [...prev.homeEquipment, equipment]
    }));
  };

  // Sauvegarder les modifications
  const handleSave = () => {
    // Mettre à jour le profil utilisateur
    actions.updateUserProfile({
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      age: formData.age,
      gender: formData.gender,
      weight: formData.weight,
      height: formData.height,
      goal: formData.goal,
      activityLevel: formData.activityLevel
    });

    // Mettre à jour le profil équipement
    actions.updateEquipmentProfile({
      location: formData.location,
      homeEquipment: formData.homeEquipment,
      gymFrequency: formData.gymFrequency
    });

    // Mettre à jour le profil nutrition
    actions.updateNutritionProfile({
      dietType: formData.dietType,
      cookingTime: formData.cookingTime,
      allergies: formData.allergies,
      favorites: formData.favorites
    });

    // Mettre à jour les données utilisateur
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    localStorage.setItem('userData', JSON.stringify({
      ...userData,
      firstName: formData.firstName,
      lastName: formData.lastName
    }));

    actions.setSearchStatus('Paramètres sauvegardés !');
    
    // Retourner au profil après 1 seconde
    setTimeout(() => {
      navigate('/auth');
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'goals', label: 'Objectifs', icon: Target },
    { id: 'equipment', label: 'Équipement', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Apple }
  ];

  return (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button 
          onClick={() => navigate('/auth')}
          className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h2 className="text-2xl font-bold">Paramètres</h2>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto mb-6 space-x-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} className="mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu des tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
        {activeTab === 'profile' && (
          <>
            <h3 className="text-xl font-bold mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                value={formData.firstName}
                onChange={(value) => handleInputChange('firstName', value)}
                placeholder="John"
              />
              <Input
                label="Nom"
                value={formData.lastName}
                onChange={(value) => handleInputChange('lastName', value)}
                placeholder="Doe"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Âge"
                type="number"
                value={formData.age}
                onChange={(value) => handleInputChange('age', value)}
                placeholder="25"
              />
              <Input
                label="Genre"
                type="select"
                value={formData.gender}
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
                value={formData.weight}
                onChange={(value) => handleInputChange('weight', value)}
                placeholder="70"
              />
              <Input
                label="Taille (cm)"
                type="number"
                value={formData.height}
                onChange={(value) => handleInputChange('height', value)}
                placeholder="175"
              />
            </div>
          </>
        )}

        {activeTab === 'goals' && (
          <>
            <h3 className="text-xl font-bold mb-4">Objectifs fitness</h3>
            <Input
              label="Objectif principal"
              type="select"
              value={formData.goal}
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
              value={formData.activityLevel}
              onChange={(value) => handleInputChange('activityLevel', value)}
              options={[
                { value: 'sedentary', label: 'Sédentaire' },
                { value: 'light', label: 'Léger (1-3 fois/sem)' },
                { value: 'moderate', label: 'Modéré (3-5 fois/sem)' },
                { value: 'active', label: 'Actif (6-7 fois/sem)' },
                { value: 'very_active', label: 'Très actif' }
              ]}
            />
          </>
        )}

        {activeTab === 'equipment' && (
          <>
            <h3 className="text-xl font-bold mb-4">Équipement disponible</h3>
            <Input
              label="Lieu d'entraînement"
              type="select"
              value={formData.location}
              onChange={(value) => handleInputChange('location', value)}
              options={[
                { value: 'home', label: 'À la maison' },
                { value: 'gym', label: 'En salle' },
                { value: 'both', label: 'Les deux' }
              ]}
            />

            {(formData.location === 'home' || formData.location === 'both') && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Équipement à domicile
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    'dumbbells', 'kettlebell', 'resistanceBands', 'pullupBar',
                    'bench', 'yoga', 'jumpRope', 'foam'
                  ].map(equipment => (
                    <button
                      key={equipment}
                      onClick={() => handleEquipmentToggle(equipment)}
                      className={`p-3 rounded-xl border-2 transition-colors ${
                        formData.homeEquipment.includes(equipment)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-200'
                      }`}
                    >
                      {equipment === 'dumbbells' && 'Haltères'}
                      {equipment === 'kettlebell' && 'Kettlebell'}
                      {equipment === 'resistanceBands' && 'Bandes élastiques'}
                      {equipment === 'pullupBar' && 'Barre de traction'}
                      {equipment === 'bench' && 'Banc'}
                      {equipment === 'yoga' && 'Tapis yoga'}
                      {equipment === 'jumpRope' && 'Corde à sauter'}
                      {equipment === 'foam' && 'Rouleau massage'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'nutrition' && (
          <>
            <h3 className="text-xl font-bold mb-4">Préférences nutritionnelles</h3>
            <Input
              label="Type de régime"
              type="select"
              value={formData.dietType}
              onChange={(value) => handleInputChange('dietType', value)}
              options={[
                { value: 'omnivore', label: 'Omnivore' },
                { value: 'vegetarian', label: 'Végétarien' },
                { value: 'vegan', label: 'Végan' }
              ]}
            />

            <Input
              label="Temps de cuisine"
              type="select"
              value={formData.cookingTime}
              onChange={(value) => handleInputChange('cookingTime', value)}
              options={[
                { value: 'quick', label: 'Express (< 15 min)' },
                { value: 'medium', label: 'Modéré (15-30 min)' },
                { value: 'long', label: 'J\'aime cuisiner (> 30 min)' }
              ]}
            />
          </>
        )}
      </div>

      {/* Bouton de sauvegarde */}
      <button
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold mt-6 flex items-center justify-center"
      >
        <Save className="mr-2" size={20} />
        Sauvegarder les modifications
      </button>
    </div>
  );
}

export default SettingsView;