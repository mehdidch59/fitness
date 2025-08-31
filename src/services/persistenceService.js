/**
 * Service central de persistance pour gérer toutes les données localStorage
 * Assure la cohérence et la réhydratation des données
 */

class PersistenceService {
  constructor() {
    this.prefix = 'fitness_app_';
    this.keys = {
      // Profils utilisateur
      USER_PROFILE: 'userProfile',
      EQUIPMENT_PROFILE: 'equipmentProfile', 
      NUTRITION_PROFILE: 'nutritionProfile',
      
      // Configuration application
      APP_SETTINGS: 'appSettings',
      USER_PREFERENCES: 'userPreferences',
      
      // Données temporaires
      FORM_DATA: 'formData',
      LAST_ROUTE: 'lastRoute',
      
      // Cache données
      SUGGESTIONS: 'personalizedSuggestions',
      RECIPES_CACHE: 'recipesCache',
      PROGRAMS_CACHE: 'programsCache',
      
      // État application
      QUESTIONNAIRE_STATE: 'questionnaireState',
      ONBOARDING_STATE: 'onboardingState',
      
      // Métadonnées
      LAST_SYNC: 'lastSync',
      USER_SESSION: 'userSession',
      APP_VERSION: 'appVersion'
    };
    
    this.currentAppVersion = '1.0.0';
  }

  /**
   * Sauvegarder une valeur avec préfixe et validation
   */
  save(key, data, options = {}) {
    try {
      const { 
        expiry = null
      } = options;
      
      const storageKey = this.prefix + key;
      
      let valueToStore = {
        data,
        timestamp: Date.now(),
        version: this.currentAppVersion
      };
      
      if (expiry) {
        valueToStore.expiry = Date.now() + expiry;
      }
      
      localStorage.setItem(storageKey, JSON.stringify(valueToStore));
      
      // Log pour debug
      console.log(`💾 Sauvegardé: ${key}`, data);
      
      return true;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde ${key}:`, error);
      return false;
    }
  }

  /**
   * Charger une valeur avec validation d'expiration
   */
  load(key, defaultValue = null) {
    try {
      const storageKey = this.prefix + key;
      const stored = localStorage.getItem(storageKey);
      
      if (!stored) {
        return defaultValue;
      }
      
      const parsed = JSON.parse(stored);
      
      // Vérifier l'expiration
      if (parsed.expiry && Date.now() > parsed.expiry) {
        this.remove(key);
        return defaultValue;
      }
      
      // Log pour debug
      console.log(`📚 Chargé: ${key}`, parsed.data);
      
      return parsed.data;
    } catch (error) {
      console.error(`❌ Erreur chargement ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Supprimer une clé
   */
  remove(key) {
    try {
      const storageKey = this.prefix + key;
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Supprimé: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur suppression ${key}:`, error);
      return false;
    }
  }

  /**
   * Vérifier si une clé existe
   */
  exists(key) {
    const storageKey = this.prefix + key;
    return localStorage.getItem(storageKey) !== null;
  }

  /**
   * Sauvegarder le profil utilisateur complet
   */
  saveUserProfile(profile) {
    return this.save(this.keys.USER_PROFILE, profile);
  }

  /**
   * Charger le profil utilisateur complet
   */
  loadUserProfile() {
    return this.load(this.keys.USER_PROFILE, {});
  }

  /**
   * Sauvegarder la configuration de l'équipement
   */
  saveEquipmentProfile(equipment) {
    return this.save(this.keys.EQUIPMENT_PROFILE, equipment);
  }

  /**
   * Charger la configuration de l'équipement
   */
  loadEquipmentProfile() {
    return this.load(this.keys.EQUIPMENT_PROFILE, {});
  }

  /**
   * Sauvegarder les préférences nutritionnelles
   */
  saveNutritionProfile(nutrition) {
    return this.save(this.keys.NUTRITION_PROFILE, nutrition);
  }

  /**
   * Charger les préférences nutritionnelles
   */
  loadNutritionProfile() {
    return this.load(this.keys.NUTRITION_PROFILE, {});
  }

  /**
   * Sauvegarder l'état du questionnaire
   */
  saveQuestionnaireState(state) {
    return this.save(this.keys.QUESTIONNAIRE_STATE, state);
  }

  /**
   * Charger l'état du questionnaire
   */
  loadQuestionnaireState() {
    return this.load(this.keys.QUESTIONNAIRE_STATE, {
      isActive: false,
      currentStep: 0,
      answers: {},
      completed: false
    });
  }

  /**
   * Sauvegarder les paramètres de l'application
   */
  saveAppSettings(settings) {
    return this.save(this.keys.APP_SETTINGS, settings);
  }

  /**
   * Charger les paramètres de l'application
   */
  loadAppSettings() {
    return this.load(this.keys.APP_SETTINGS, {
      theme: 'light',
      language: 'fr',
      notifications: true,
      autoSync: true
    });
  }

  /**
   * Sauvegarder les données de formulaire temporaires
   */
  saveFormData(formId, data) {
    const allForms = this.load(this.keys.FORM_DATA, {});
    allForms[formId] = {
      ...data,
      savedAt: Date.now()
    };
    return this.save(this.keys.FORM_DATA, allForms);
  }

  /**
   * Charger les données de formulaire temporaires
   */
  loadFormData(formId) {
    const allForms = this.load(this.keys.FORM_DATA, {});
    return allForms[formId]?.data || {};
  }

  /**
   * Nettoyer les données de formulaire expirées (plus de 24h)
   */
  cleanExpiredFormData() {
    const allForms = this.load(this.keys.FORM_DATA, {});
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    Object.keys(allForms).forEach(formId => {
      if (now - allForms[formId].savedAt > dayMs) {
        delete allForms[formId];
      }
    });
    
    return this.save(this.keys.FORM_DATA, allForms);
  }

  /**
   * Réhydrater toutes les données au démarrage de l'application
   */
  rehydrateApp() {
    console.log('🔄 Réhydratation de l\'application...');
    
    const appData = {
      userProfile: this.loadUserProfile(),
      equipmentProfile: this.loadEquipmentProfile(),
      nutritionProfile: this.loadNutritionProfile(),
      questionnaireState: this.loadQuestionnaireState(),
      appSettings: this.loadAppSettings(),
      suggestions: this.load(this.keys.SUGGESTIONS, []),
      lastSync: this.load(this.keys.LAST_SYNC, null)
    };
    
    console.log('✅ Données réhydratées:', appData);
    return appData;
  }

  /**
   * Nettoyer toutes les données utilisateur (déconnexion)
   */
  clearUserData() {
    console.log('🧹 Nettoyage des données utilisateur...');
    
    const userKeys = [
      this.keys.USER_PROFILE,
      this.keys.EQUIPMENT_PROFILE,
      this.keys.NUTRITION_PROFILE,
      this.keys.SUGGESTIONS,
      this.keys.RECIPES_CACHE,
      this.keys.PROGRAMS_CACHE,
      this.keys.QUESTIONNAIRE_STATE,
      this.keys.USER_SESSION
    ];
    
    userKeys.forEach(key => this.remove(key));
    
    // Nettoyer aussi les données avec userId
    this.clearUserSpecificData();
    
    console.log('✅ Données utilisateur nettoyées');
  }

  /**
   * Nettoyer les données spécifiques à un utilisateur
   */
  clearUserSpecificData() {
    const allKeys = Object.keys(localStorage);
    const userDataPattern = new RegExp(`^${this.prefix}.*_user_|_favorites|_recipes`);
    
    allKeys.forEach(key => {
      if (userDataPattern.test(key)) {
        localStorage.removeItem(key);
      }
    });
  }
  /**
   * Sauvegarder automatiquement l'état de l'application
   */
  autoSave(appState) {
    try {
      // Sauvegarder les profils
      if (appState.userProfile) {
        this.saveUserProfile(appState.userProfile);
      }
      
      if (appState.equipmentProfile) {
        this.saveEquipmentProfile(appState.equipmentProfile);
      }
      
      if (appState.nutritionProfile) {
        this.saveNutritionProfile(appState.nutritionProfile);
      }
      
      // Sauvegarder l'état du questionnaire
      if (appState.isQuestionnaire !== undefined || appState.questionnaireStep !== undefined) {
        this.saveQuestionnaireState({
          isActive: appState.isQuestionnaire || false,
          currentStep: appState.questionnaireStep || 0,
          timestamp: Date.now()
        });
      }
      
      // Marquer la dernière sauvegarde
      this.save(this.keys.LAST_SYNC, Date.now());
      
      return true;
    } catch (error) {
      console.error('❌ Erreur auto-sauvegarde:', error);
      return false;
    }
  }

  /**
   * Obtenir des statistiques sur le stockage
   */
  getStorageStats() {
    const allKeys = Object.keys(localStorage);
    const appKeys = allKeys.filter(key => key.startsWith(this.prefix));
    
    let totalSize = 0;
    const keyStats = {};
    
    appKeys.forEach(key => {
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      totalSize += size;
      keyStats[key.replace(this.prefix, '')] = {
        size,
        sizeKB: Math.round(size / 1024 * 100) / 100
      };
    });
    
    return {
      totalKeys: appKeys.length,
      totalSize,
      totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
      keyStats
    };
  }

  /**
   * Exporter toutes les données
   */
  exportData() {
    const allKeys = Object.keys(localStorage);
    const appKeys = allKeys.filter(key => key.startsWith(this.prefix));
    
    const exportData = {};
    appKeys.forEach(key => {
      const value = localStorage.getItem(key);
      exportData[key.replace(this.prefix, '')] = JSON.parse(value);
    });
    
    return {
      exportedAt: new Date().toISOString(),
      appVersion: this.currentAppVersion,
      data: exportData
    };
  }

  /**
   * Importer des données
   */
  importData(importedData) {
    try {
      if (!importedData.data) {
        throw new Error('Format d\'import invalide');
      }
      
      Object.entries(importedData.data).forEach(([key, value]) => {
        const storageKey = this.prefix + key;
        localStorage.setItem(storageKey, JSON.stringify(value));
      });
      
      console.log('✅ Données importées avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur import:', error);
      return false;
    }
  }

  /**
   * Vérifier si la configuration utilisateur est complète
   */
  isConfigurationComplete() {
    const equipmentProfile = this.loadEquipmentProfile();
    const nutritionProfile = this.loadNutritionProfile();
    const questionnaireState = this.loadQuestionnaireState();
    
    // Vérifier si le questionnaire a été complété récemment
    if (questionnaireState.completed) {
      return true;
    }
    
    // Vérifier les champs essentiels
    const hasLocation = equipmentProfile.location && equipmentProfile.location.trim() !== '';
    const hasDietType = nutritionProfile.dietType && nutritionProfile.dietType.trim() !== '';
    const hasCookingTime = nutritionProfile.cookingTime && nutritionProfile.cookingTime.trim() !== '';
    
    return hasLocation && hasDietType && hasCookingTime;
  }

  /**
   * Détecter si le questionnaire doit être relancé
   */
  shouldRestartQuestionnaire() {
    const questionnaireState = this.loadQuestionnaireState();
    const configComplete = this.isConfigurationComplete();
    
    // Si la config n'est pas complète et le questionnaire n'est pas actif
    if (!configComplete && !questionnaireState.isActive) {
      return true;
    }
    
    // Si le questionnaire était en cours mais abandonné (plus de 30 min)
    if (questionnaireState.isActive && questionnaireState.timestamp) {
      const thirtyMinutes = 30 * 60 * 1000;
      const isStale = Date.now() - questionnaireState.timestamp > thirtyMinutes;
      return isStale;
    }
    
    return false;
  }
}

// Instance singleton
export const persistenceService = new PersistenceService();
export default persistenceService;
