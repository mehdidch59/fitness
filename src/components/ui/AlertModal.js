import React from 'react';
import { useI18n } from '../../utils/i18n';

/**
 * Composant modal d'alerte réutilisable
 */
const AlertModal = ({
  title,
  message,
  buttonText,
  type = 'warning',
  onClose,
  secondaryButtonText = null,
  onSecondaryClick = null
}) => {
  const { t } = useI18n();
  // Déterminer les couleurs selon le type d'alerte
  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          title: 'text-red-600',
          button: 'bg-gradient-to-r from-red-500 to-pink-500'
        };
      case 'success':
        return {
          title: 'text-green-600',
          button: 'bg-gradient-to-r from-green-500 to-emerald-500'
        };
      case 'info':
        return {
          title: 'text-blue-600',
          button: 'bg-gradient-to-r from-blue-500 to-indigo-500'
        };
      case 'warning':
      default:
        return {
          title: 'text-yellow-600',
          button: 'bg-gradient-to-r from-purple-500 to-pink-500'
        };
    }
  };

  const colors = getColors();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
        {title && (
          <h3 className={`text-xl font-bold mb-4 ${colors.title}`}>{title}</h3>
        )}

        {message && (
          <p className="mb-6 text-gray-700">{message}</p>
        )}

        <div className="flex flex-col space-y-3">
          <button
            onClick={onClose}
            className={`w-full ${colors.button} text-white py-3 rounded-xl font-semibold transition-all hover:shadow-lg active:scale-98`}
          >
            {buttonText || t('common.ok','OK')}
          </button>

          {secondaryButtonText && onSecondaryClick && (
            <button
              onClick={onSecondaryClick}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-semibold transition-all hover:bg-gray-300 active:scale-98"
            >
              {secondaryButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertModal; 
