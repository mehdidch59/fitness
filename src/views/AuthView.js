import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/authService';
import * as userService from '../services/userService';
import { advancedSearchService, contextualSearchService } from '../services/searchService';
import profileSyncService from '../services/profileSyncService';

const AuthView = () => {
  const [formData, setFormData] = useState({});
  const [actions, setActions] = useState({
    setSearchStatus: (message) => console.log(message),
    updateUserProfile: (profile) => console.log('User profile updated', profile),
  });
  const navigate = useNavigate();

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
      
      // Créer le profil complet dans Firestore avec recherche automatique
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
        userProfile: {
          goal: formData.goal,
          activityLevel: formData.activityLevel,
          fitnessLevel: formData.activityLevel
        },
        equipmentProfile: {
          location: 'home', // Par défaut
          homeEquipment: []
        },
        nutritionProfile: {
          dietType: null,
          cookingTime: 30, // Par défaut 30 minutes
          allergies: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Sauvegarder dans Firestore via le service amélioré
      await userService.saveCompleteProfileWithValidation(firebaseUser.uid, profileData);
      
      // Pré-charger des suggestions personnalisées pour l'utilisateur
      try {
        const suggestions = await contextualSearchService.getPersonalizedSuggestions(profileData.userProfile);
        if (suggestions.length > 0) {
          // Stocker les suggestions pour l'affichage ultérieur
          localStorage.setItem('personalizedSuggestions', JSON.stringify(suggestions));
        }
      } catch (suggestionError) {
        console.log('Impossible de charger les suggestions personnalisées:', suggestionError);
      }
      
      // Mettre à jour le contexte local
      actions.updateUserProfile(profileData);
      
      // Synchroniser avec localStorage
      profileSyncService.syncAllProfilesToLocalStorage(profileData);
      
      actions.setSearchStatus('Compte créé avec succès ! Suggestions personnalisées préparées.');
      navigate('/');
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      actions.setSearchStatus('Erreur d\'inscription: ' + error.message);
    }
  };

  return (
    <div>
      <h2>Inscription</h2>
      <form onSubmit={handleRegister}>
        {/* Champs de formulaire pour email, mot de passe, prénom, etc. */}
        <button type="submit">S'inscrire</button>
      </form>
    </div>
  );
};

export default AuthView;