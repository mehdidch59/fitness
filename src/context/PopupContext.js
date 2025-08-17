import React, { createContext, useContext, useReducer } from 'react';
import MobilePopup from '../components/ui/MobilePopup';

// Création du contexte
const PopupContext = createContext();

// Types d'actions pour le reducer
const SHOW_POPUP = 'SHOW_POPUP';
const HIDE_POPUP = 'HIDE_POPUP';
const HIDE_ALL_POPUPS = 'HIDE_ALL_POPUPS';

// État initial
const initialState = {
  popups: [],
};

// Reducer pour gérer les actions
const popupReducer = (state, action) => {
  switch (action.type) {
    case SHOW_POPUP:
      return {
        ...state,
        popups: [...state.popups, action.payload],
      };
    case HIDE_POPUP:
      return {
        ...state,
        popups: state.popups.filter(popup => popup.id !== action.payload),
      };
    case HIDE_ALL_POPUPS:
      return {
        ...state,
        popups: [],
      };
    default:
      return state;
  }
};

// Fournisseur du contexte
export const PopupProvider = ({ children }) => {
  const [state, dispatch] = useReducer(popupReducer, initialState);
  // const [currentPopup, setCurrentPopup] = useState(null);

  // Afficher un popup
  const showPopup = (popupData) => {
    const id = Date.now().toString();
    const newPopup = {
      id,
      ...popupData,
    };
    
    dispatch({ type: SHOW_POPUP, payload: newPopup });
    return id; // Retourner l'ID pour permettre de fermer ce popup spécifique
  };

  // Fermer un popup spécifique
  const hidePopup = (id) => {
    dispatch({ type: HIDE_POPUP, payload: id });
  };

  // Fermer tous les popups
  const hideAllPopups = () => {
    dispatch({ type: HIDE_ALL_POPUPS });
  };

  // Méthodes pour des popups spécifiques
  const showInfoPopup = (title, content, onClose) => {
    const id = showPopup({
      type: 'info',
      title,
      content,
      onClose: () => {
        if (onClose) onClose();
        hidePopup(id);
      }
    });
    return id;
  };

  const showErrorPopup = (title, content, onClose) => {
    const id = showPopup({
      type: 'error',
      title,
      content,
      onClose: () => {
        if (onClose) onClose();
        hidePopup(id);
      }
    });
    return id;
  };

  const showProfileIncompletePopup = () => {
    const id = showPopup({
      type: 'profile',
      title: 'Profil incomplet',
      content: 'Veuillez compléter votre profil pour accéder à cette fonctionnalité.',
      primaryButtonText: 'Compléter mon profil',
      secondaryButtonText: 'Plus tard',      onPrimaryAction: () => {
        // Rediriger vers la page d'authentification
        window.location.href = '/auth';
        hidePopup(id);
      },
      onClose: () => hidePopup(id)
    });
    return id;
  };

  const showSearchResultsPopup = (results, onItemClick) => {
    const id = showPopup({
      type: 'search',
      title: 'Résultats de recherche',
      content: (
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-center text-gray-500">Aucun résultat trouvé</p>
          ) : (
            results.map((item, index) => (
              <div 
                key={index} 
                className="p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  onItemClick(item);
                  hidePopup(id);
                }}
              >
                <h4 className="font-medium">{item.title || item.name}</h4>
                <p className="text-sm text-gray-600 truncate">{item.description || item.snippet}</p>
              </div>
            ))
          )}
        </div>
      ),
      fullScreen: true,
      primaryButtonText: 'Fermer',
      onClose: () => hidePopup(id)
    });
    return id;
  };

  return (
    <PopupContext.Provider
      value={{
        popups: state.popups,
        showPopup,
        hidePopup,
        hideAllPopups,
        showInfoPopup,
        showErrorPopup,
        showProfileIncompletePopup,
        showSearchResultsPopup
      }}
    >
      {children}
      
      {/* Rendre tous les popups actifs */}
      {state.popups.map((popup) => (
        <MobilePopup
          key={popup.id}
          isVisible={true}
          {...popup}
          onClose={() => {
            popup.onClose?.();
            hidePopup(popup.id);
          }}
        />
      ))}
    </PopupContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte
export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup doit être utilisé à l\'intérieur d\'un PopupProvider');
  }
  return context;
};

export default PopupContext; 