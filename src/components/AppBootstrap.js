import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePopup } from '../context/PopupContext';
import { useAuth } from '../hooks/useAuth';
import { profileSyncService } from '../services/profileSync';
import { initApiWithPopups } from '../services/api';

/**
 * Composant d'initialisation de l'application
 * Connecte les services avec le système de popup
 */
const AppBootstrap = () => {
  const popupManager = usePopup();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Éviter la double initialisation
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialiser le service API avec le gestionnaire de popups
    initApiWithPopups(popupManager);

    // Fonction pour vérifier le profil
    const checkProfile = async () => {
      let userProfile = null;
      
      // Si utilisateur connecté, essayer de charger depuis Firestore
      if (user) {
        try {
          userProfile = await profileSyncService.loadProfileFromFirestore();
        } catch (error) {
          console.error('Erreur lors du chargement du profil Firestore:', error);
        }
      }
      
      // Fallback sur localStorage si pas de profil Firestore
      if (!userProfile) {
        const localProfile = localStorage.getItem('userProfile');
        userProfile = localProfile ? JSON.parse(localProfile) : {};
      }
      
      const isProfileComplete = userProfile.height && userProfile.weight && userProfile.age && userProfile.goal;
      
      // Afficher popup de bienvenue pour nouveaux utilisateurs
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        const timeoutId = setTimeout(() => {
          popupManager.showPopup({
            type: 'info',
            title: 'Bienvenue dans votre app fitness',
            content: 'Cette application va vous aider à atteindre vos objectifs fitness avec des programmes personnalisés.',
            primaryButtonText: 'Commencer',
            secondaryButtonText: 'Compléter mon profil',
            onPrimaryAction: () => {
              localStorage.setItem('hasSeenWelcome', 'true');
            },
            onSecondaryAction: () => {
              localStorage.setItem('hasSeenWelcome', 'true');
              navigate('/auth');
            },
            onClose: () => {
              localStorage.setItem('hasSeenWelcome', 'true');
            }
          });
        }, 500);

        return () => clearTimeout(timeoutId);
      }

      // Popup pour profil incomplet
      if (!isProfileComplete && hasSeenWelcome) {
        const profileTimeoutId = setTimeout(() => {
          popupManager.showPopup({
            type: 'warning',
            title: 'Complétez votre profil',
            content: 'Pour une expérience optimale, veuillez compléter votre profil.',
            primaryButtonText: 'Compléter maintenant',
            secondaryButtonText: 'Plus tard',
            onPrimaryAction: () => {
              navigate('/auth');
            }
          });
        }, 2000);

        return () => clearTimeout(profileTimeoutId);
      }
    };

    checkProfile();
  }, [popupManager, navigate, user]);

  return null;
};

export default AppBootstrap;