import { useState } from 'react';
import { User, Mail, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { profileSyncService } from '../../services/profileSync';
import Input from '../ui/Input';

function AuthView() {
  const { userProfile, actions } = useAppContext();
  const { user, login, register, logout, loading, error } = useAuth(); // Utiliser Firebase
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    weight: '',
    height: '',
    goal: '',
    activityLevel: ''
  });

  // Gérer les changements de formulaire
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  // Connexion avec Firebase
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      await login(formData.email, formData.password);
      actions.setSearchStatus('Connexion réussie !');
      navigate('/');
    } catch (error) {
      console.error('Erreur de connexion:', error);
      actions.setSearchStatus('Erreur de connexion: ' + error.message);
    }
  };
  // Inscription avec Firebase
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.firstName) {
      actions.setSearchStatus('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const displayName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Créer l'utilisateur dans Firebase
      const firebaseUser = await register(formData.email, formData.password, displayName);
      
      // Créer le profil complet dans Firestore
      const profileData = {
        name: displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        age: formData.age || null,
        gender: formData.gender || '',
        weight: formData.weight || null,
        height: formData.height || null,
        goal: formData.goal || '',
        activityLevel: formData.activityLevel || '',
        firebaseUid: firebaseUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Sauvegarder dans Firestore via le service de synchronisation
      await profileSyncService.saveProfileToFirestore(profileData);
      
      // Mettre à jour le contexte local
      actions.updateUserProfile(profileData);
      
      actions.setSearchStatus('Compte créé avec succès !');
      navigate('/');
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      actions.setSearchStatus('Erreur d\'inscription: ' + error.message);
    }
  };  // Déconnexion avec Firebase
  const handleLogout = async () => {
    try {
      // Nettoyer AVANT la déconnexion pour éviter les résidus
      localStorage.clear(); // Nettoyage complet
      
      await logout();
      
      // Nettoyer les données locales
      actions.updateUserProfile({});
      actions.updateEquipmentProfile({});
      actions.updateNutritionProfile({});
      
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        age: '',
        gender: '',
        weight: '',
        height: '',
        goal: '',
        activityLevel: ''
      });
      
      // Forcer le rechargement de la page pour s'assurer du nettoyage complet
      setTimeout(() => {
        window.location.href = '/';  // Forcer la navigation vers la page d'accueil
      }, 100);
      
      actions.setSearchStatus('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      actions.setSearchStatus('Erreur de déconnexion: ' + error.message);
    }
  };// Afficher un état de chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Formulaire de connexion/inscription
  return (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="bg-purple-100 p-4 rounded-full inline-flex mb-4">
            <User size={32} className="text-purple-600" />
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {isLogin ? 'Connexion' : 'Inscription'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Bon retour parmi nous !' : 'Créez votre compte fitness'}
          </p>
        </div>        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Afficher l'erreur Firebase s'il y en a une */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {/* Toggle connexion/inscription */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                isLogin ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              Connexion
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                !isLogin ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {/* Champs d'inscription */}
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    value={formData.firstName}
                    onChange={(value) => handleInputChange('firstName', value)}
                    placeholder="John"
                    required
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
                    required
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
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Poids (kg)"
                    type="number"
                    value={formData.weight}
                    onChange={(value) => handleInputChange('weight', value)}
                    placeholder="70"
                    required
                  />
                  <Input
                    label="Taille (cm)"
                    type="number"
                    value={formData.height}
                    onChange={(value) => handleInputChange('height', value)}
                    placeholder="175"
                    required
                  />
                </div>

                <Input
                  label="Objectif"
                  type="select"
                  value={formData.goal}
                  onChange={(value) => handleInputChange('goal', value)}
                  options={[
                    { value: 'lose_weight', label: 'Perdre du poids' },
                    { value: 'gain_muscle', label: 'Prendre du muscle' },
                    { value: 'maintain', label: 'Maintenir ma forme' }
                  ]}
                  required
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
                  required
                />
              </>
            )}

            {/* Email et mot de passe */}
            <div className="relative">
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                placeholder="john@example.com"
                required
              />
              <Mail className="absolute right-3 top-9 text-gray-400" size={20} />
            </div>

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(value) => handleInputChange('password', value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-xl font-semibold mt-6"
            >
              {isLogin ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthView;