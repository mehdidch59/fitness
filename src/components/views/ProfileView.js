import React, { useState, useEffect, useCallback } from 'react';
import Input from '../ui/Input';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { User, Edit, ChevronRight, Activity, Target, ArrowLeft, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
// import { profileSyncService } from '../../services/profileSync';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // Assurez-vous d'importer votre config Firebase

function ProfileView() {
  const { userProfile, actions } = useAppContext();
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour récupérer le profil depuis Firestore (mémorisée avec useCallback)
  const fetchUserProfileFromFirestore = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const firestoreData = userDoc.data();
        
        // Mapper les données Firestore vers le format attendu par le composant
        const mappedProfile = {
          name: firestoreData.name || firestoreData.displayName || firestoreData.firstName || '',
          age: firestoreData.age || firestoreData.userProfile?.age || '',
          weight: firestoreData.weight || firestoreData.userProfile?.weight || '',
          height: firestoreData.height || firestoreData.userProfile?.height || '',
          gender: firestoreData.gender || firestoreData.userProfile?.gender || '',
          goal: firestoreData.goal || firestoreData.userProfile?.goal || firestoreData.userProfile?.fitnessGoal || '',
          activityLevel: firestoreData.activityLevel || firestoreData.userProfile?.activityLevel || ''
        };
        
        
        // ✅ UTILISATION DU FLAG SILENT pour éviter la sauvegarde Firestore
        // Lors de la lecture, on met à jour le contexte SANS déclencher la sauvegarde automatique
        actions.updateUserProfile(mappedProfile, { silent: true });
        
        // Sauvegarder dans localStorage
        localStorage.setItem('userProfile', JSON.stringify(mappedProfile));
      } else {
        console.log('❓ Aucun document utilisateur trouvé dans Firestore');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du profil:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, actions]);

  // useEffect pour récupérer les données au montage
  useEffect(() => {
    if (user?.uid) {
      fetchUserProfileFromFirestore();
    } else {
      setIsLoading(false);
    }
  }, [user?.uid, fetchUserProfileFromFirestore]);

  // Gérer les mises à jour de profil (uniquement contexte et localStorage)
  const handleInputChange = useCallback((field, value) => {
    // Mettre à jour le contexte local SANS sauvegarde Firestore automatique
    // (la sauvegarde se fera uniquement quand l'utilisateur clique sur "Enregistrer")
    actions.updateUserProfile({ [field]: value }, { silent: true });
    
    // Sauvegarder dans localStorage pour ne pas perdre les données
    setTimeout(() => {
      const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const updatedProfile = { ...currentProfile, [field]: value };
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    }, 0);
  }, [actions]);

  // Sauvegarder dans Firestore (appelée uniquement par les boutons)
  const saveProfileToFirestore = useCallback(async () => {
    if (!user?.uid) {
      console.error('Aucun utilisateur connecté pour sauvegarder');
      return;
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Récupérer le profil actuel depuis le contexte au moment de l'exécution
      const currentProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      
      // Créer un objet avec la structure Firestore complète
      const firestoreUpdate = {
        // Niveau racine (pour compatibilité)
        name: currentProfile.name || '',
        age: currentProfile.age || '',
        weight: currentProfile.weight || '',
        height: currentProfile.height || '',
        gender: currentProfile.gender || '',
        goal: currentProfile.goal || '',
        activityLevel: currentProfile.activityLevel || '',
        
        // Sous-objet userProfile (structure actuelle)
        userProfile: {
          age: currentProfile.age || '',
          weight: currentProfile.weight || '',
          height: currentProfile.height || '',
          gender: currentProfile.gender || '',
          goal: currentProfile.goal || '',
          fitnessGoal: currentProfile.goal || '',
          activityLevel: currentProfile.activityLevel || ''
        },
        
        // Métadonnées
        updatedAt: new Date().toISOString(),
        displayName: currentProfile.name || '',
        firstName: currentProfile.name?.split(' ')[0] || '',
        lastName: currentProfile.name?.split(' ')[1] || ''
      };
      
      await updateDoc(userDocRef, firestoreUpdate);
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
    }
  }, [user?.uid]);

  // Gérer la déconnexion
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  }, [logout]);

  // Calculer l'IMC
  const calculateBMI = () => {
    if (!userProfile.weight || !userProfile.height) return null;

    const weightKg = parseFloat(userProfile.weight);
    const heightM = parseFloat(userProfile.height) / 100;

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
    
    const checks = {
      hasName: !!name,
      hasGender: !!gender,
      hasGoal: !!goal,
      hasActivityLevel: !!activityLevel,
      hasValidAge: Number(age) > 0,
      hasValidWeight: Number(weight) > 0,
      hasValidHeight: Number(height) > 0
    };
    
    const isComplete = Object.values(checks).every(check => check === true);
    
    return isComplete;
  };

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

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="pb-20 p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre profil...</p>
          <p className="text-sm text-gray-400 mt-2">UID: {user?.uid}</p>
        </div>
      </div>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);
  const complete = isProfileComplete();

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
            value={userProfile.name || ''}
            onChange={(value) => handleInputChange('name', value)}
            placeholder="Votre nom"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Âge"
              type="number"
              value={userProfile.age || ''}
              onChange={(value) => handleInputChange('age', value)}
              placeholder="25"
            />
            <Input
              label="Genre"
              type="select"
              value={userProfile.gender || ''}
              onChange={(value) => handleInputChange('gender', value)}
              options={[
                { value: '', label: 'Sélectionner...' },
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Poids (kg)"
              type="number"
              value={userProfile.weight || ''}
              onChange={(value) => handleInputChange('weight', value)}
              placeholder="70"
            />
            <Input
              label="Taille (cm)"
              type="number"
              value={userProfile.height || ''}
              onChange={(value) => handleInputChange('height', value)}
              placeholder="175"
            />
          </div>

          <Input
            label="Objectif"
            type="select"
            value={userProfile.goal || ''}
            onChange={(value) => handleInputChange('goal', value)}
            options={[
              { value: '', label: 'Sélectionner...' },
              { value: 'lose_weight', label: 'Perdre du poids' },
              { value: 'gain_muscle', label: 'Prendre du muscle' },
              { value: 'maintain', label: 'Maintenir ma forme' }
            ]}
          />

          <Input
            label="Niveau d'activité"
            type="select"
            value={userProfile.activityLevel || ''}
            onChange={(value) => handleInputChange('activityLevel', value)}
            options={[
              { value: '', label: 'Sélectionner...' },
              { value: 'sedentary', label: 'Sédentaire' },
              { value: 'light', label: 'Léger (1-3 fois/sem)' },
              { value: 'moderate', label: 'Modéré (3-5 fois/sem)' },
              { value: 'active', label: 'Actif (6-7 fois/sem)' },
              { value: 'very_active', label: 'Très actif' }
            ]}
          />

          <button
            onClick={async () => {
              await saveProfileToFirestore();
              setIsEditing(false);
            }}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold mt-4"
          >
            Enregistrer
          </button>
        </div>
      </div>
    );
  }

  // Mode affichage
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

            {bmi && (
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
            )}
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

          <Link
            to="/settings"
            className="w-full mt-3 inline-flex items-center justify-center bg-white border border-gray-300 text-gray-800 py-3 rounded-xl font-semibold hover:bg-gray-50"
          >
            <SettingsIcon className="mr-2" size={18} />
            Paramètres
          </Link>

          <button
            onClick={handleLogout}
            className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold mt-4 flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <LogOut className="mr-2" size={20} />
            Se déconnecter
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
            value={userProfile.name || ''}
            onChange={(value) => handleInputChange('name', value)}
            placeholder="Votre nom"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Âge"
              type="number"
              value={userProfile.age || ''}
              onChange={(value) => handleInputChange('age', value)}
              placeholder="25"
            />
            <Input
              label="Genre"
              type="select"
              value={userProfile.gender || ''}
              onChange={(value) => handleInputChange('gender', value)}
              options={[
                { value: '', label: 'Sélectionner...' },
                { value: 'male', label: 'Homme' },
                { value: 'female', label: 'Femme' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Poids (kg)"
              type="number"
              value={userProfile.weight || ''}
              onChange={(value) => handleInputChange('weight', value)}
              placeholder="70"
            />
            <Input
              label="Taille (cm)"
              type="number"
              value={userProfile.height || ''}
              onChange={(value) => handleInputChange('height', value)}
              placeholder="175"
            />
          </div>

          <Input
            label="Objectif"
            type="select"
            value={userProfile.goal || ''}
            onChange={(value) => handleInputChange('goal', value)}
            options={[
              { value: '', label: 'Sélectionner...' },
              { value: 'lose_weight', label: 'Perdre du poids' },
              { value: 'gain_muscle', label: 'Prendre du muscle' },
              { value: 'maintain', label: 'Maintenir ma forme' }
            ]}
          />

          <Input
            label="Niveau d'activité"
            type="select"
            value={userProfile.activityLevel || ''}
            onChange={(value) => handleInputChange('activityLevel', value)}
            options={[
              { value: '', label: 'Sélectionner...' },
              { value: 'sedentary', label: 'Sédentaire' },
              { value: 'light', label: 'Léger (1-3 fois/sem)' },
              { value: 'moderate', label: 'Modéré (3-5 fois/sem)' },
              { value: 'active', label: 'Actif (6-7 fois/sem)' },
              { value: 'very_active', label: 'Très actif' }
            ]}
          />

          <button
            onClick={saveProfileToFirestore}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold mt-6"
          >
            Enregistrer mon profil
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileView;
