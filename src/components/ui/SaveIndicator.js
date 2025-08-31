/**
 * Indicateur de sauvegarde automatique
 * Affiche le statut de sauvegarde en temps réel
 */

import React, { useState, useEffect } from 'react';
import { useI18n } from '../../utils/i18n';
import { Check, Save, AlertCircle } from 'lucide-react';

const SaveIndicator = ({ 
  isSaving = false, 
  lastSaved = null, 
  hasUnsavedChanges = false,
  showDetails = false 
}) => {
  const { t } = useI18n();
  const [showStatus, setShowStatus] = useState(false);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (isSaving) {
      setStatusText(t('save.saving', 'Sauvegarde en cours...'));
      setShowStatus(true);
    } else if (lastSaved) {
      setStatusText(`${t('save.savedAt', 'Sauvegardé à')} ${new Date(lastSaved).toLocaleTimeString()}`);
      setShowStatus(true);
      
      // Masquer après 3 secondes
      const timer = setTimeout(() => {
        setShowStatus(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (hasUnsavedChanges) {
      setStatusText(t('save.unsaved', 'Modifications non sauvegardées'));
      setShowStatus(true);
    }
  }, [isSaving, lastSaved, hasUnsavedChanges, t]);

  if (!showStatus && !showDetails) return null;

  const getIcon = () => {
    if (isSaving) return <Save className="animate-spin" size={16} />;
    if (hasUnsavedChanges) return <AlertCircle size={16} className="text-orange-500" />;
    return <Check size={16} className="text-green-500" />;
  };

  const getStatusColor = () => {
    if (isSaving) return 'text-blue-600 bg-blue-50';
    if (hasUnsavedChanges) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className={`
      fixed bottom-4 right-4 z-50
      flex items-center gap-2 px-3 py-2 rounded-lg
      text-sm font-medium shadow-lg border
      ${getStatusColor()}
      transition-all duration-300 ease-in-out
      ${showStatus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
    `}>
      {getIcon()}
      <span>{statusText}</span>
      
      {showDetails && lastSaved && (
        <div className="ml-2 text-xs opacity-75">
          {t('save.lastSync', 'Dernière sync')}: {new Date(lastSaved).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default SaveIndicator;
