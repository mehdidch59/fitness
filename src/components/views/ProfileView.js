import { useState, useEffect, useCallback } from 'react';
// Overview only — editing moves to Settings
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { User, Activity, Target, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../utils/i18n';
import { MotionSection, MotionButton } from '../ui/animations';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

function ProfileView() {
  const { userProfile, actions } = useAppContext();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useI18n();

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
          name: firestoreData.name || firestoreData.displayName || `${firestoreData.firstName || ''} ${firestoreData.lastName || ''}`.trim(),
          firstName: firestoreData.firstName || firestoreData.userProfile?.firstName || '',
          lastName: firestoreData.lastName || firestoreData.userProfile?.lastName || '',
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

  // Édition supprimée ici — utilisons Paramètres pour modifier les données

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
    if (!bmi) return { text: t('profile.bmiCategory.unknown', 'Non calculé'), color: 'text-gray-500' };
    if (bmi < 18.5) return { text: t('profile.bmiCategory.underweight', 'Insuffisance pondérale'), color: 'text-blue-500' };
    if (bmi < 25) return { text: t('profile.bmiCategory.normal', 'Corpulence normale'), color: 'text-green-500' };
    if (bmi < 30) return { text: t('profile.bmiCategory.overweight', 'Surpoids'), color: 'text-yellow-500' };
    if (bmi < 35) return { text: t('profile.bmiCategory.obese1', 'Obésité modérée'), color: 'text-orange-500' };
    if (bmi < 40) return { text: t('profile.bmiCategory.obese2', 'Obésité sévère'), color: 'text-red-500' };
    return { text: t('profile.bmiCategory.obese3', 'Obésité morbide'), color: 'text-red-700' };
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
      case 'lose_weight': return t('profile.goalLabels.lose_weight', 'Perdre du poids');
      case 'gain_muscle': return t('profile.goalLabels.gain_muscle', 'Prendre du muscle');
      case 'maintain': return t('profile.goalLabels.maintain', 'Maintenir ma forme');
      default: return t('common.undefined', 'Non défini');
    }
  };

  const getActivityText = (level) => {
    switch (level) {
      case 'sedentary': return t('profile.activityLabels.sedentary', 'Sédentaire');
      case 'light': return t('profile.activityLabels.light', 'Léger (1-3 fois/sem)');
      case 'moderate': return t('profile.activityLabels.moderate', 'Modéré (3-5 fois/sem)');
      case 'active': return t('profile.activityLabels.active', 'Actif (6-7 fois/sem)');
      case 'very_active': return t('profile.activityLabels.very_active', 'Très actif');
      default: return t('common.undefined', 'Non défini');
    }
  };

  const getGenderText = (gender) => {
    switch (gender) {
      case 'male': return t('profile.gender.male', 'Homme');
      case 'female': return t('profile.gender.female', 'Femme');
      default: return t('common.undefined', 'Non défini');
    }
  };

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="pb-20 p-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Chargement de votre profil...</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">UID: {user?.uid}</p>
        </div>
      </div>
    );
  }

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);
  const complete = isProfileComplete();

  // Plus de mode édition — rediriger vers Paramètres pour modifier

  // Mode affichage
  return (
    <MotionSection className="pb-20 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">{t('profile.title', 'Mon Profil')}</h2>

      {complete ? (
        <>
          {/* Carte principale avec IMC */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 mb-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full mr-4">
                  <User size={28} className="text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{userProfile.name}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{userProfile.age} {t('profile.years','ans')} • {getGenderText(userProfile.gender)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">{t('profile.height','Taille')}</p>
                <p className="text-lg font-semibold">{userProfile.height} cm</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-1">{t('profile.weight','Poids')}</p>
                <p className="text-lg font-semibold">{userProfile.weight} kg</p>
              </div>
            </div>

            {bmi && (
              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl mb-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-200">{t('profile.bmi','IMC')}</h4>
                  <span className={`font-bold text-xl ${bmiCategory.color}`}>{bmi}</span>
                </div>
                <p className={`text-sm ${bmiCategory.color}`}>{bmiCategory.text}</p>
                <div className="mt-3 bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
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
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                  <Target size={20} className="text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-600 dark:text-gray-300 text-sm">{t('profile.goalLabel', 'Objectif')}</h4>
                  <p className="font-semibold">{getGoalText(userProfile.goal)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg mr-3">
                  <Activity size={20} className="text-green-600 dark:text-green-300" />
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-600 dark:text-gray-300 text-sm">{t('profile.activityLevelLabel', "Niveau d'activité")}</h4>
                  <p className="font-semibold">{getActivityText(userProfile.activityLevel)}</p>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/settings"
            className="w-full mt-4 inline-flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 py-4 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <SettingsIcon className="mr-2" size={18} />
            {t('settings.title','Paramètres')}
          </Link>

          <MotionButton
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-semibold mt-4 flex items-center justify-center transition-colors"
          >
            <LogOut className="mr-2" size={20} />
            {t('profile.logout','Se déconnecter')}
          </MotionButton>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6 text-center max-w-4xl mx-auto">
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-full inline-flex mb-2">
            <User size={24} className="text-yellow-600 dark:text-yellow-300" />
          </div>
          <h3 className="text-lg font-semibold">Complétez votre profil</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">{t('profile.completeDesc', 'Pour calculer votre IMC et personnaliser votre expérience')}</p>
          <Link
            to="/settings"
            className="w-full inline-flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 dark:from-indigo-500 dark:to-violet-600 text-white py-3 rounded-xl font-semibold mt-2"
          >
            <SettingsIcon className="mr-2" size={18} />
            {t('profile.openSettings', 'Ouvrir les paramètres')}
          </Link>
        </div>
      )}
    </MotionSection>
  );
}

export default ProfileView;
