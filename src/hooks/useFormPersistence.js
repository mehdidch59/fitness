/**
 * Hook pour la sauvegarde automatique des formulaires
 * Évite la perte de données lors du refresh
 */

import { useEffect, useMemo, useCallback } from 'react';
import { persistenceService } from '../services/persistenceService';

export const useFormPersistence = (formId, formData, options = {}) => {
  const { 
    debounceMs = 1000,
    saveOnChange = true
  } = options;

  // Sauvegarder les données du formulaire avec debounce
  const debouncedSaveFormData = useMemo(() => 
    debounce((data) => {
      if (data && Object.keys(data).length > 0) {
        persistenceService.saveFormData(formId, data);
        console.log(`💾 Formulaire ${formId} sauvegardé automatiquement`);
      }
    }, debounceMs)
  , [formId, debounceMs]);

  // Charger les données sauvegardées
  const loadSavedData = useCallback(() => {
    const savedData = persistenceService.loadFormData(formId);
    console.log(`📚 Données formulaire ${formId} chargées:`, savedData);
    return savedData;
  }, [formId]);

  // Nettoyer les données du formulaire
  const clearSavedData = useCallback(() => {
    persistenceService.saveFormData(formId, {});
    console.log(`🗑️ Données formulaire ${formId} nettoyées`);
  }, [formId]);

  // Sauvegarder automatiquement quand les données changent
  useEffect(() => {
    if (saveOnChange && formData) {
      debouncedSaveFormData(formData);
    }
  }, [formData, saveOnChange, debouncedSaveFormData]);

  // Nettoyer les données expirées au montage
  useEffect(() => {
    persistenceService.cleanExpiredFormData();
  }, []);

  return {
    loadSavedData,
    clearSavedData,
    saveFormData: (data) => persistenceService.saveFormData(formId, data)
  };
};

// Fonction utilitaire debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default useFormPersistence;
