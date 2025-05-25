import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer les données dans localStorage
 * @param {string} key - Clé de stockage dans localStorage
 * @param {any} initialValue - Valeur initiale si aucune valeur n'est trouvée
 * @returns {Array} - Tableau contenant la valeur et la fonction setter
 */
const useLocalStorage = (key, initialValue) => {
  // Fonction d'initialisation pour récupérer la valeur depuis localStorage
  const initialize = () => {
    try {
      const item = localStorage.getItem(key);
      // Si la clé existe, parser et retourner la valeur
      if (item) {
        return JSON.parse(item);
      }
      
      // Sinon, initialiser avec la valeur par défaut
      localStorage.setItem(key, JSON.stringify(initialValue));
      return initialValue;
    } catch (error) {
      console.error(`Erreur lors de l'accès à localStorage (${key}):`, error);
      return initialValue;
    }
  };

  // État local avec fonction d'initialisation
  const [storedValue, setStoredValue] = useState(initialize);

  // Fonction pour mettre à jour la valeur
  const setValue = (value) => {
    try {
      // Permettre d'utiliser une fonction comme avec setState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Mettre à jour l'état local
      setStoredValue(valueToStore);
      
      // Mettre à jour localStorage
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde dans localStorage (${key}):`, error);
    }
  };

  // Mettre à jour le state si la clé change
  useEffect(() => {
    setStoredValue(initialize());
  }, [key]);

  // Surveiller les changements de localStorage depuis d'autres onglets/fenêtres
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === key) {
        try {
          // Mettre à jour le state si la clé actuelle est modifiée
          setStoredValue(JSON.parse(event.newValue || JSON.stringify(initialValue)));
        } catch (error) {
          console.error(`Erreur lors de la synchronisation de localStorage (${key}):`, error);
        }
      }
    };

    // Ajouter l'écouteur d'événement
    window.addEventListener('storage', handleStorageChange);
    
    // Nettoyer l'écouteur lors du démontage
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
};

export default useLocalStorage; 