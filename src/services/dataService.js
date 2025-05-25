/**
 * Service de gestion des données avec persistance localStorage
 */

// Clé utilisée pour stocker les données dans localStorage
const STORAGE_KEY = 'fitnessAppState';

// Sauvegarde l'état complet dans localStorage
export const saveState = (state) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données:', error);
    return false;
  }
};

// Charge l'état depuis localStorage
export const loadState = () => {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (!serializedState) return undefined;
    return JSON.parse(serializedState);
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    return undefined;
  }
};

// Efface les données sauvegardées
export const clearState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression des données:', error);
    return false;
  }
};

// Sauvegarde uniquement une partie spécifique de l'état
export const savePartialState = (key, data) => {
  try {
    const currentState = loadState() || {};
    const newState = {
      ...currentState,
      [key]: data
    };
    return saveState(newState);
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde partielle (${key}):`, error);
    return false;
  }
};

// Charge une partie spécifique de l'état
export const loadPartialState = (key) => {
  try {
    const state = loadState();
    return state ? state[key] : undefined;
  } catch (error) {
    console.error(`Erreur lors du chargement partiel (${key}):`, error);
    return undefined;
  }
};

// Exporte une seule donnée (format compatible pour l'export utilisateur)
export const exportData = (data, filename = 'fitness-export.json') => {
  try {
    const serializedData = JSON.stringify(data, null, 2);
    const blob = new Blob([serializedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement et le déclencher
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'export des données:', error);
    return false;
  }
};

// Importe des données depuis un fichier
export const importData = async (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          resolve(data);
        } catch (parseError) {
          reject(new Error('Format de fichier invalide'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
      
      reader.readAsText(file);
    } catch (error) {
      reject(error);
    }
  });
}; 