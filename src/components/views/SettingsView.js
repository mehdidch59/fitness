import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, User, Target, Dumbbell, Apple, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useFormPersistence } from '../../hooks/useFormPersistence';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import Input from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../firebase';
import DataManagement from '../debug/DataManagement';

function SettingsView() {
  const { userProfile, equipmentProfile, nutritionProfile, actions } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [showDataManagement, setShowDataManagement] = useState(false);
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

  // Compte (email / mot de passe)
  const [accountEmail, setAccountEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [currentPasswordForPwd, setCurrentPasswordForPwd] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  // Hook pour la persistance automatique du formulaire
  const { loadSavedData, clearSavedData } = useFormPersistence('settings_form', formData, {
    debounceMs: 500,
    saveOnChange: true
  });

  // Détecter les changements non sauvegardés
  const hasUnsavedChanges = useMemo(() => {
    return (
      formData.firstName !== (userProfile.firstName || '') ||
      formData.lastName !== (userProfile.lastName || '') ||
      formData.age !== (userProfile.age || '') ||
      formData.gender !== (userProfile.gender || '') ||
      formData.weight !== (userProfile.weight || '') ||
      formData.height !== (userProfile.height || '') ||
      formData.goal !== (userProfile.goal || '') ||
      formData.activityLevel !== (userProfile.activityLevel || '') ||
      formData.location !== (equipmentProfile.location || '') ||
      JSON.stringify(formData.homeEquipment) !== JSON.stringify(equipmentProfile.homeEquipment || []) ||
      formData.dietType !== (nutritionProfile.dietType || '') ||
      formData.cookingTime !== (nutritionProfile.cookingTime || '')
    );
  }, [formData, userProfile, equipmentProfile, nutritionProfile]);

  // Hook pour gérer les changements non sauvegardés
  const { navigateWithConfirmation } = useUnsavedChanges(
    hasUnsavedChanges,
    'Vous avez des modifications non sauvegardées dans vos paramètres. Voulez-vous vraiment quitter ?'
  );

  // Charger les données existantes
  useEffect(() => {
    // D'abord essayer de charger les données sauvegardées du formulaire
    const savedFormData = loadSavedData();
    
    // Puis charger les données des profils ou utiliser les données sauvegardées
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    const initialData = {
      firstName: savedFormData.firstName || userData.firstName || userProfile.firstName || '',
      lastName: savedFormData.lastName || userData.lastName || userProfile.lastName || '',
      age: savedFormData.age || userProfile.age || '',
      gender: savedFormData.gender || userProfile.gender || '',
      weight: savedFormData.weight || userProfile.weight || '',
      height: savedFormData.height || userProfile.height || '',
      goal: savedFormData.goal || userProfile.goal || '',
      activityLevel: savedFormData.activityLevel || userProfile.activityLevel || '',
      location: savedFormData.location || equipmentProfile.location || '',
      homeEquipment: savedFormData.homeEquipment || equipmentProfile.homeEquipment || [],
      gymFrequency: savedFormData.gymFrequency || equipmentProfile.gymFrequency || '',
      dietType: savedFormData.dietType || nutritionProfile.dietType || '',
      cookingTime: savedFormData.cookingTime || nutritionProfile.cookingTime || '',
      allergies: savedFormData.allergies || nutritionProfile.allergies || [],
      favorites: savedFormData.favorites || nutritionProfile.favorites || []
    };
    
    setFormData(initialData);
    setAccountEmail(user?.email || '');
    
    // Si on a des données sauvegardées, informer l'utilisateur
    if (Object.keys(savedFormData).length > 0) {
      console.log('🔄 Données de formulaire restaurées depuis la sauvegarde automatique');
    }
  }, [userProfile, equipmentProfile, nutritionProfile, loadSavedData, user?.email]);

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

    // Nettoyer les données temporaires du formulaire
    clearSavedData();

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
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => navigateWithConfirmation('/auth')}
            className="mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h2 className="text-2xl font-bold">Paramètres</h2>
          {hasUnsavedChanges && (
            <span className="ml-3 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
              Modifications non sauvegardées
            </span>
          )}
        </div>
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

            <div className="mt-8 border-t pt-6">
              <h3 className="text-xl font-bold mb-4">Compte</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Email actuel"
                    value={accountEmail}
                    onChange={setAccountEmail}
                    placeholder="email@exemple.com"
                    disabled
                  />
                  {!user?.emailVerified && (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-orange-700 bg-orange-100 px-2 py-1 rounded">Email non vérifié</span>
                      <button
                        onClick={async () => {
                          setAccountLoading(true);
                          try {
                            await authService.sendVerificationEmail();
                            actions.setSearchStatus('Email de vérification envoyé');
                          } catch (e) {
                            actions.setSearchStatus(`Erreur: ${e.message}`);
                          } finally {
                            setAccountLoading(false);
                          }
                        }}
                        className="text-sm px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                        disabled={accountLoading}
                      >
                        Vérifier mon email
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-medium mb-2">Changer l'email</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Input label="Nouvel email" value={newEmail} onChange={setNewEmail} placeholder="nouvel.email@exemple.com" />
                    <Input label="Mot de passe actuel" type="password" value={currentPasswordForEmail} onChange={setCurrentPasswordForEmail} placeholder="••••••••" />
                    <button
                      onClick={async () => {
                        if (!newEmail || !currentPasswordForEmail) {
                          actions.setSearchStatus('Veuillez saisir un nouvel email et votre mot de passe actuel');
                          return;
                        }
                        setAccountLoading(true);
                        try {
                          await authService.changeEmail(newEmail, currentPasswordForEmail);
                          actions.setSearchStatus('Email mis à jour');
                          setAccountEmail(newEmail);
                          setNewEmail('');
                          setCurrentPasswordForEmail('');
                        } catch (e) {
                          actions.setSearchStatus(`Erreur: ${e.message}`);
                        } finally {
                          setAccountLoading(false);
                        }
                      }}
                      className="mt-2 px-3 py-2 rounded bg-gray-800 text-white hover:bg-black disabled:opacity-50"
                      disabled={accountLoading}
                    >
                      Changer l'email
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-medium mb-2">Changer le mot de passe</p>
                  <Input label="Mot de passe actuel" type="password" value={currentPasswordForPwd} onChange={setCurrentPasswordForPwd} placeholder="••••••••" />
                  <Input label="Nouveau mot de passe" type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
                  <button
                    onClick={async () => {
                      if (!currentPasswordForPwd || !newPassword) {
                        actions.setSearchStatus('Veuillez saisir votre mot de passe actuel et le nouveau');
                        return;
                      }
                      setAccountLoading(true);
                      try {
                        await authService.changePassword(currentPasswordForPwd, newPassword);
                        actions.setSearchStatus('Mot de passe mis à jour');
                        setCurrentPasswordForPwd('');
                        setNewPassword('');
                      } catch (e) {
                        actions.setSearchStatus(`Erreur: ${e.message}`);
                      } finally {
                        setAccountLoading(false);
                      }
                    }}
                    className="mt-2 px-3 py-2 rounded bg-gray-800 text-white hover:bg-black disabled:opacity-50"
                    disabled={accountLoading}
                  >
                    Changer le mot de passe
                  </button>
                </div>
              </div>
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
      </div>      {/* Bouton de sauvegarde */}
      <button
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold mt-6 flex items-center justify-center"
      >
        <Save className="mr-2" size={20} />
        Sauvegarder les modifications
      </button>

      {/* Bouton debug pour la gestion des données */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setShowDataManagement(true)}
          className="w-full bg-gray-500 text-white py-2 rounded-lg mt-4 flex items-center justify-center text-sm"
        >
          <Database className="mr-2" size={16} />
          Gérer les données (Debug)
        </button>
      )}

      {/* Composant de gestion des données */}
      <DataManagement 
        isOpen={showDataManagement}
        onClose={() => setShowDataManagement(false)}
      />
    </div>
  );
}

export default SettingsView;
