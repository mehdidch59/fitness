import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePopup } from '../context/PopupContext';
import { useAuth } from '../hooks/useAuth';
import { profileSyncService } from '../services/profileSync';
import { initApiWithPopups } from '../services/api';
import { persistenceService } from '../services/persistenceService';
import { useI18n } from '../utils/i18n';

/**
 * Composant d'initialisation de l'application
 * Connecte les services avec le système de popup
 */
const AppBootstrap = () => {
  const popupManager = usePopup();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const hasInitialized = useRef(false);
  useEffect(() => {
    // Éviter la double initialisation
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Initialiser le service API avec le gestionnaire de popups
    initApiWithPopups(popupManager);

    // Appliquer thème et langue dès le démarrage
    try {
      const appSettings = persistenceService.loadAppSettings();
      const isDark = appSettings?.theme === 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', !!isDark);
        if (appSettings?.language) {
          document.documentElement.setAttribute('lang', appSettings.language);
        }
      }
    } catch {}

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
        // Vérifier si le profil appartient bien à l'utilisateur actuel
      if (user && userProfile.firebaseUid && userProfile.firebaseUid !== user.uid) {
        console.warn('Profil ne correspond pas à l\'utilisateur actuel, nettoyage complet...');
        
        // Nettoyer complètement toutes les données de l'ancien utilisateur
        const keysToRemove = [
          'userProfile',
          'equipmentProfile', 
          'nutritionProfile',
          'stats',
          'personalizedSuggestions',
          'user',
          'userData',
          'nutrition_recipes',
          'nutrition_favorites',
          'nutrition_mass_gain_recipes',
          'hasSeenWelcome',
          'authToken',
          'refreshToken'
        ];
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        userProfile = {};
      }

      const isProfileComplete = userProfile.height && userProfile.weight && userProfile.age && userProfile.goal;
      
      // Afficher popup de bienvenue pour nouveaux utilisateurs
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
      if (!hasSeenWelcome) {
        const timeoutId = setTimeout(() => {
          popupManager.showPopup({
            type: 'info',
            title: t('welcome.title', 'Bienvenue dans votre app fitness'),
            content: t('welcome.content', 'Cette application va vous aider à atteindre vos objectifs fitness avec des programmes personnalisés.'),
            primaryButtonText: t('welcome.primary', 'Commencer'),
            secondaryButtonText: t('welcome.secondary', 'Compléter mon profil'),
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
            title: t('profileIncomplete.title', 'Complétez votre profil'),
            content: t('profileIncomplete.content', 'Pour une expérience optimale, veuillez compléter votre profil.'),
            primaryButtonText: t('profileIncomplete.primary', 'Compléter maintenant'),
            secondaryButtonText: t('profileIncomplete.secondary', 'Plus tard'),
            onPrimaryAction: () => {
              navigate('/auth');
            }
          });
        }, 2000);

        return () => clearTimeout(profileTimeoutId);
      }
    };

    checkProfile();
  }, [popupManager, navigate, user, t]);

  return null;
};

export default AppBootstrap;
