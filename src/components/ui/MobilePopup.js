import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Composant popup mobile réutilisable pour différents types d'informations
 * 
 * @param {Object} props - Les propriétés du composant
 * @param {string} props.type - Type de popup: 'alert', 'notification', 'info', 'success', 'error', 'profile', 'search'
 * @param {string} props.title - Titre du popup
 * @param {string|React.ReactNode} props.content - Contenu du popup (texte ou JSX)
 * @param {string} props.primaryButtonText - Texte du bouton principal
 * @param {string} props.secondaryButtonText - Texte du bouton secondaire (optionnel)
 * @param {Function} props.onPrimaryAction - Fonction pour le bouton principal
 * @param {Function} props.onSecondaryAction - Fonction pour le bouton secondaire
 * @param {Function} props.onClose - Fonction pour fermer le popup
 * @param {boolean} props.isVisible - Si le popup est visible
 * @param {boolean} props.fullScreen - Si le popup doit prendre tout l'écran
 */
const MobilePopup = ({
  type = 'info',
  title,
  content,
  primaryButtonText = 'OK',
  secondaryButtonText,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
  isVisible,
  fullScreen = false,
  children
}) => {
  // Déterminer les styles selon le type de popup
  const getTypeStyles = () => {
    switch (type) {      case 'error':
        return {
          icon: '❌',
          titleColor: 'text-red-600',
          buttonBg: 'bg-gradient-to-r from-red-600 to-red-700',
          iconBg: 'bg-red-100'
        };      case 'success':
        return {
          icon: '✓',
          titleColor: 'text-green-600',
          buttonBg: 'bg-gradient-to-r from-emerald-600 to-teal-700',
          iconBg: 'bg-green-100'
        };      case 'alert':
        return {
          icon: '⚠️',
          titleColor: 'text-yellow-600',
          buttonBg: 'bg-gradient-to-r from-orange-600 to-red-600',
          iconBg: 'bg-yellow-100'
        };      case 'profile':
        return {
          icon: '👤',
          titleColor: 'text-indigo-600',
          buttonBg: 'bg-gradient-to-r from-indigo-600 to-purple-700',
          iconBg: 'bg-indigo-100'
        };      case 'search':
        return {
          icon: '🔍',
          titleColor: 'text-blue-600',
          buttonBg: 'bg-gradient-to-r from-blue-600 to-indigo-700',
          iconBg: 'bg-blue-100'
        };      case 'info':
      default:
        return {
          icon: 'ℹ️',
          titleColor: 'text-blue-600',
          buttonBg: 'bg-gradient-to-r from-blue-600 to-indigo-700',
          iconBg: 'bg-blue-100'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`bg-white rounded-3xl overflow-hidden shadow-2xl mx-4 ${fullScreen ? 'w-full h-full max-w-full' : 'max-w-sm w-full max-h-[90vh]'}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Barre supérieure avec titre et bouton de fermeture */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center">
                <span className={`${styles.iconBg} w-8 h-8 rounded-full flex items-center justify-center text-lg mr-2`}>
                  {styles.icon}
                </span>
                <h3 className={`font-bold ${styles.titleColor}`}>{title}</h3>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            {/* Contenu du popup */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {content && <div className="text-gray-700 mb-4">{content}</div>}
              {children}
            </div>

            {/* Boutons d'action */}
            <div className="p-4 border-t border-gray-100">
              <div className="flex flex-col space-y-3">
                <button
                  onClick={onPrimaryAction || onClose}
                  className={`w-full ${styles.buttonBg} text-white py-3 rounded-xl font-semibold transition-all hover:shadow-lg active:scale-95`}
                >
                  {primaryButtonText}
                </button>
                
                {secondaryButtonText && (
                  <button
                    onClick={onSecondaryAction}
                    className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold transition-all hover:bg-gray-300 active:scale-95"
                  >
                    {secondaryButtonText}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobilePopup; 