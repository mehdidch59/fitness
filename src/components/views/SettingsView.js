import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, User, Target, Dumbbell, Apple } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MotionSection, MotionButton } from '../ui/animations';
import { useAppContext } from '../../context/AppContext';
import { useFormPersistence } from '../../hooks/useFormPersistence';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import Input from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../firebase';
import { persistenceService } from '../../services/persistenceService';
import { useI18n } from '../../utils/i18n';

function SettingsView() {
  const { userProfile, equipmentProfile, nutritionProfile, actions } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
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

  // Compte (email / mot de passe)
  const [accountEmail, setAccountEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [currentPasswordForPwd, setCurrentPasswordForPwd] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [currentPasswordForDelete, setCurrentPasswordForDelete] = useState('');
  // Préférences app
  const [appTheme, setAppTheme] = useState(() => {
    try { return persistenceService.loadAppSettings()?.theme || 'light'; } catch { return 'light'; }
  });
  const [appLanguage, setAppLanguage] = useState(() => {
    try { return persistenceService.loadAppSettings()?.language || 'fr'; } catch { return 'fr'; }
  });
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
    t('settings.unsavedLeaveWarning', 'Vous avez des modifications non sauvegardées dans vos paramètres. Voulez-vous vraiment quitter ?')
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
    // Charger préférences app
    try {
      const settings = persistenceService.loadAppSettings();
      if (settings?.theme) setAppTheme(settings.theme);
      if (settings?.language) setAppLanguage(settings.language);
    } catch {}

    // Si on a des données sauvegardées, informer l'utilisateur
    if (Object.keys(savedFormData).length > 0) {
      console.log('🔄 Données de formulaire restaurées depuis la sauvegarde automatique');
    }
  }, [userProfile, equipmentProfile, nutritionProfile, loadSavedData, user?.email]);

  // Appliquer le thème/langue quand on change
  useEffect(() => {
    try {
      const current = persistenceService.loadAppSettings() || {};
      const next = { ...current, theme: appTheme, language: appLanguage };
      persistenceService.saveAppSettings(next);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', appTheme === 'dark');
        document.documentElement.setAttribute('lang', appLanguage || 'fr');
      }
      // Notifier l'application du changement
      window.dispatchEvent(new CustomEvent('appSettingsChanged', { detail: next }));
    } catch {}
  }, [appTheme, appLanguage]);

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

    actions.setSearchStatus(t('settings.saved', 'Paramètres sauvegardés !'));

    // Retourner au profil après 1 seconde
    setTimeout(() => {
      navigate('/auth');
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile', 'Profil'), icon: User },
    { id: 'goals', label: t('settings.tabs.goals', 'Objectifs'), icon: Target },
    { id: 'equipment', label: t('settings.tabs.equipment', 'Équipement'), icon: Dumbbell },
    { id: 'nutrition', label: t('settings.tabs.nutrition', 'Nutrition'), icon: Apple }
  ];

  return (
    <MotionSection className="pb-20 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
        <div className="flex items-center">
          <button
            onClick={() => navigateWithConfirmation('/auth')}
            className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700 dark:text-gray-200" />
          </button>
          <h2 className="text-2xl font-bold">{t('settings.title', 'Paramètres')}</h2>
          {hasUnsavedChanges && (
            <span className="ml-3 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 text-xs rounded-full">
              {t('settings.unsaved', 'Modifications non sauvegardées')}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto mb-6 space-x-2 max-w-5xl mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
            >
              <Icon size={18} className="mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu des tabs */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6 max-w-5xl mx-auto">
        {activeTab === 'profile' && (
          <>
            <h3 className="text-xl font-bold mb-4">{t('settings.personalInfo', 'Informations personnelles')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('settings.form.firstName', 'Prénom')}
                value={formData.firstName}
                onChange={(value) => handleInputChange('firstName', value)}
                placeholder={t('settings.form.firstNamePlaceholder', 'John')}
              />
              <Input
                label={t('settings.form.lastName', 'Nom')}
                value={formData.lastName}
                onChange={(value) => handleInputChange('lastName', value)}
                placeholder={t('settings.form.lastNamePlaceholder', 'Doe')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('settings.form.age', 'Âge')}
                type="number"
                value={formData.age}
                onChange={(value) => handleInputChange('age', value)}
                placeholder={t('settings.form.agePlaceholder', '25')}
              />
              <Input
                label={t('settings.form.gender', 'Genre')}
                type="select"
                value={formData.gender}
                onChange={(value) => handleInputChange('gender', value)}
                options={[
                  { value: 'male', label: t('profile.gender.male', 'Homme') },
                  { value: 'female', label: t('profile.gender.female', 'Femme') }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('auth.weight', 'Poids (kg)')}
                type="number"
                value={formData.weight}
                onChange={(value) => handleInputChange('weight', value)}
                placeholder={t('settings.form.weightPlaceholder', '70')}
              />
              <Input
                label={t('auth.height', 'Taille (cm)')}
                type="number"
                value={formData.height}
                onChange={(value) => handleInputChange('height', value)}
                placeholder={t('settings.form.heightPlaceholder', '175')}
              />
            </div>

            <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-xl font-bold mb-4">{t('settings.accountSection', 'Compte')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label={t('settings.account.currentEmail', 'Email actuel')}
                    value={accountEmail}
                    onChange={setAccountEmail}
                    placeholder={t('settings.account.emailPlaceholder', 'email@exemple.com')}
                    disabled
                  />
                  {!user?.emailVerified ? (
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-orange-700 dark:text-orange-200 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">{t('settings.account.emailUnverified', 'Email non vérifié')}</span>
                      <button
                        onClick={async () => {
                          setAccountLoading(true);
                          try {
                            await authService.sendVerificationEmail();
                            actions.setSearchStatus(t('settings.account.verificationSent', 'Email de vérification envoyé'));
                          } catch (e) {
                            actions.setSearchStatus(`${t('settings.errorPrefix', 'Erreur')}: ${e.message}`);
                          } finally {
                            setAccountLoading(false);
                          }
                        }}
                        className="text-sm px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white disabled:opacity-50"
                        disabled={accountLoading}
                      >
                        {t('settings.account.verifyEmail', 'Vérifier mon email')}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <span className="text-sm text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">{t('settings.account.emailVerified', 'Email vérifié')}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-medium mb-2">{t('settings.account.changeEmail', "Changer l'email")}</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Input label={t('settings.account.newEmail', 'Nouvel email')} value={newEmail} onChange={setNewEmail} placeholder={t('settings.account.newEmailPlaceholder', 'nouvel.email@exemple.com')} />
                    <Input label={t('settings.account.currentPassword', 'Mot de passe actuel')} type="password" value={currentPasswordForEmail} onChange={setCurrentPasswordForEmail} placeholder="••••••••" />
                    <button
                      onClick={async () => {
                        if (!newEmail || !currentPasswordForEmail) {
                          actions.setSearchStatus(t('settings.account.fillEmailAndPassword', 'Veuillez saisir un nouvel email et votre mot de passe actuel'));
                          return;
                        }
                        setAccountLoading(true);
                        try {
                          await authService.changeEmail(newEmail, currentPasswordForEmail);
                          actions.setSearchStatus(t('settings.account.emailUpdated', 'Email mis à jour'));
                          setAccountEmail(newEmail);
                          setNewEmail('');
                          setCurrentPasswordForEmail('');
                        } catch (e) {
                          actions.setSearchStatus(`${t('settings.errorPrefix', 'Erreur')}: ${e.message}`);
                        } finally {
                          setAccountLoading(false);
                        }
                      }}
                      className="mt-2 px-3 py-2 rounded bg-gray-800 text-white hover:bg-black disabled:opacity-50"
                      disabled={accountLoading}
                    >
                      {t('settings.account.changeEmailCta', "Changer l'email")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-medium mb-2">{t('settings.account.changePassword', 'Changer le mot de passe')}</p>
                  <Input label={t('settings.account.currentPassword', 'Mot de passe actuel')} type="password" value={currentPasswordForPwd} onChange={setCurrentPasswordForPwd} placeholder="••••••••" />
                  <Input label={t('settings.account.newPassword', 'Nouveau mot de passe')} type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
                  <button
                    onClick={async () => {
                      if (!currentPasswordForPwd || !newPassword) {
                        actions.setSearchStatus(t('settings.account.fillPasswords', 'Veuillez saisir votre mot de passe actuel et le nouveau'));
                        return;
                      }
                      setAccountLoading(true);
                      try {
                        await authService.changePassword(currentPasswordForPwd, newPassword);
                        actions.setSearchStatus(t('settings.account.passwordUpdated', 'Mot de passe mis à jour'));
                        setCurrentPasswordForPwd('');
                        setNewPassword('');
                      } catch (e) {
                        actions.setSearchStatus(`${t('settings.errorPrefix', 'Erreur')}: ${e.message}`);
                      } finally {
                        setAccountLoading(false);
                      }
                    }}
                    className="mt-2 px-3 py-2 rounded bg-gray-800 text-white hover:bg-black disabled:opacity-50"
                    disabled={accountLoading}
                  >
                    {t('settings.account.updatePasswordCta', 'Mettre à jour le mot de passe')}
                  </button>
                </div>

                <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <p className="text-sm font-semibold mb-2 text-red-800">{t('settings.account.deleteAccount', 'Supprimer le compte')}</p>
                  <p className="text-xs text-red-700 mb-3">{t('settings.account.deleteIrreversible', 'Action irréversible. Votre profil et vos données principales seront supprimés.')}</p>
                  <Input label={t('settings.account.currentPassword', 'Mot de passe actuel')} type="password" value={currentPasswordForDelete} onChange={setCurrentPasswordForDelete} placeholder="••••••••" />
                  <button
                    onClick={async () => {
                      if (!currentPasswordForDelete) {
                        actions.setSearchStatus(t('settings.account.fillPassword', 'Veuillez saisir votre mot de passe pour confirmer'));
                        return;
                      }
                      if (!window.confirm(t('settings.account.deleteConfirm', 'Confirmez-vous la suppression définitive de votre compte ?'))) return;
                      setAccountLoading(true);
                      try {
                        await authService.deleteAccount(currentPasswordForDelete);
                        actions.setSearchStatus(t('settings.account.deleted', 'Compte supprimé'));
                        navigate('/auth');
                      } catch (e) {
                        actions.setSearchStatus(`${t('settings.errorPrefix', 'Erreur')}: ${e.message}`);
                      } finally {
                        setAccountLoading(false);
                      }
                    }}
                    className="mt-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 w-full"
                    disabled={accountLoading}
                  >
                    {t('settings.account.deleteAccountCta', 'Supprimer mon compte')}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t pt-6">
              <h3 className="text-xl font-bold mb-4">{t('settings.preferences', 'Préférences de l\'application')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">{t('settings.language', 'Langue')}</label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg px-3 py-2"
                    value={appLanguage}
                    onChange={(e) => setAppLanguage(e.target.value)}
                  >
                    <option value="fr">{t('settings.languageFr', 'Français')}</option>
                    <option value="en">{t('settings.languageEn', 'English')}</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'goals' && (
          <>
            <h3 className="text-xl font-bold mb-4">{t('settings.goals.title', 'Objectifs fitness')}</h3>
            <Input
              label={t('settings.goals.mainGoal', 'Objectif principal')}
              type="select"
              value={formData.goal}
              onChange={(value) => handleInputChange('goal', value)}
              options={[
                { value: 'lose_weight', label: t('profile.goalLabels.lose_weight', 'Perdre du poids') },
                { value: 'gain_muscle', label: t('profile.goalLabels.gain_muscle', 'Prendre du muscle') },
                { value: 'maintain', label: t('profile.goalLabels.maintain', 'Maintenir ma forme') }
              ]}
            />

            <Input
              label={t('settings.goals.activityLevel', "Niveau d'activité")}
              type="select"
              value={formData.activityLevel}
              onChange={(value) => handleInputChange('activityLevel', value)}
              options={[
                { value: 'sedentary', label: t('profile.activityLabels.sedentary', 'Sédentaire') },
                { value: 'light', label: t('profile.activityLabels.light', 'Léger (1-3 fois/sem)') },
                { value: 'moderate', label: t('profile.activityLabels.moderate', 'Modéré (3-5 fois/sem)') },
                { value: 'active', label: t('profile.activityLabels.active', 'Actif (6-7 fois/sem)') },
                { value: 'very_active', label: t('profile.activityLabels.very_active', 'Très actif') }
              ]}
            />
          </>
        )}

        {activeTab === 'equipment' && (
          <>
            <h3 className="text-xl font-bold mb-4">{t('settings.equipment.title', 'Équipement disponible')}</h3>
            <Input
              label={t('settings.equipment.location', "Lieu d'entraînement")}
              type="select"
              value={formData.location}
              onChange={(value) => handleInputChange('location', value)}
              options={[
                { value: 'home', label: t('questionnaire.location.home', 'À la maison') },
                { value: 'gym', label: t('questionnaire.location.gym', 'En salle') },
                { value: 'both', label: t('questionnaire.location.both', 'Les deux') }
              ]}
            />

            {(formData.location === 'home' || formData.location === 'both') && (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('settings.equipment.homeEquipmentTitle', 'Équipement à domicile')}
                </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                'dumbbells', 'kettlebell', 'resistanceBands', 'pullupBar',
                'bench', 'yoga', 'jumpRope', 'foam'
              ].map(equipment => (
                <button
                  key={equipment}
                  onClick={() => handleEquipmentToggle(equipment)}
                  className={`p-3 rounded-xl border-2 transition-colors ${formData.homeEquipment.includes(equipment)
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-purple-200 dark:hover:border-purple-400/50'
                        }`}
                >
                      {equipment === 'dumbbells' && t('questionnaire.equipment.dumbbells', 'Haltères')}
                      {equipment === 'kettlebell' && t('questionnaire.equipment.kettlebell', 'Kettlebell')}
                      {equipment === 'resistanceBands' && t('questionnaire.equipment.resistanceBands', 'Bandes élastiques')}
                      {equipment === 'pullupBar' && t('questionnaire.equipment.pullupBar', 'Barre de traction')}
                      {equipment === 'bench' && t('questionnaire.equipment.bench', 'Banc')}
                      {equipment === 'yoga' && t('questionnaire.equipment.yoga', 'Tapis yoga')}
                      {equipment === 'jumpRope' && t('questionnaire.equipment.jumpRope', 'Corde à sauter')}
                      {equipment === 'foam' && t('questionnaire.equipment.foam', 'Rouleau massage')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'nutrition' && (
          <>
            <h3 className="text-xl font-bold mb-4">{t('settings.nutrition.title', 'Préférences nutritionnelles')}</h3>
            <Input
              label={t('settings.nutrition.dietType', 'Type de régime')}
              type="select"
              value={formData.dietType}
              onChange={(value) => handleInputChange('dietType', value)}
              options={[
                { value: 'omnivore', label: t('questionnaire.diet.omnivore', 'Omnivore') },
                { value: 'vegetarian', label: t('questionnaire.diet.vegetarian', 'Végétarien') },
                { value: 'vegan', label: t('questionnaire.diet.vegan', 'Végan') }
              ]}
            />

            <Input
              label={t('settings.nutrition.cookingTime', 'Temps de cuisine')}
              type="select"
              value={formData.cookingTime}
              onChange={(value) => handleInputChange('cookingTime', value)}
              options={[
                { value: 'quick', label: t('questionnaire.cooking.quick', 'Express (< 15 min)') },
                { value: 'medium', label: t('questionnaire.cooking.medium', 'Modéré (15-30 min)') },
                { value: 'long', label: t('questionnaire.cooking.long', "J'aime cuisiner (> 30 min)") }
              ]}
            />
          </>
        )}
      </div>      {/* Bouton de sauvegarde */}
      <MotionButton
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 dark:from-indigo-500 dark:to-violet-600 text-white py-4 rounded-xl font-semibold mt-6 flex items-center justify-center hover:shadow-md transition-shadow"
      >
        <Save className="mr-2" size={20} />
        {t('settings.save', 'Sauvegarder les modifications')}
      </MotionButton>
    </MotionSection>
  );
}

export default SettingsView;
