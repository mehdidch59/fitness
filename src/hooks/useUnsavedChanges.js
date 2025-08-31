/**
 * Hook pour détecter les changements non sauvegardés
 * et prévenir la perte de données lors de la navigation
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useUnsavedChanges = (hasUnsavedChanges, message = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?') => {
  const navigate = useNavigate();
  const hasUnsavedRef = useRef(hasUnsavedChanges);

  // Mettre à jour la référence
  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Prévenir la fermeture de l'onglet/navigateur
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedRef.current) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [message]);

  // Fonction pour naviguer avec confirmation
  const navigateWithConfirmation = (to, options = {}) => {
    if (hasUnsavedRef.current) {
      const shouldLeave = window.confirm(message);
      if (!shouldLeave) {
        return false;
      }
    }
    
    navigate(to, options);
    return true;
  };

  return {
    hasUnsavedChanges: hasUnsavedRef.current,
    navigateWithConfirmation
  };
};

export default useUnsavedChanges;
