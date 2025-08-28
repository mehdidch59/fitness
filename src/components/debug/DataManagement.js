/**
 * Composant de gestion et visualisation des données sauvegardées
 * Utile pour le debug et la maintenance
 */

import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, RefreshCw, Database, HardDrive } from 'lucide-react';
import { persistenceService } from '../../services/persistenceService';

const DataManagement = ({ isOpen, onClose }) => {
  const [storageStats, setStorageStats] = useState(null);
  const [savedData, setSavedData] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadDataInfo();
    }
  }, [isOpen]);

  const loadDataInfo = () => {
    const stats = persistenceService.getStorageStats();
    setStorageStats(stats); const data = {
      userProfile: persistenceService.loadUserProfile(),
      equipmentProfile: persistenceService.loadEquipmentProfile(),
      nutritionProfile: persistenceService.loadNutritionProfile(),
      questionnaireState: persistenceService.loadQuestionnaireState(),
      appSettings: persistenceService.loadAppSettings()
    };
    setSavedData(data);
  };

  const handleExportData = () => {
    const exportData = persistenceService.exportData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-app-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        const success = persistenceService.importData(importedData);
        if (success) {
          alert('Données importées avec succès !');
          loadDataInfo();
        } else {
          alert('Erreur lors de l\'importation des données');
        }
      } catch (error) {
        alert('Fichier invalide');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer toutes les données sauvegardées ?')) {
      persistenceService.clearUserData();
      loadDataInfo();
      alert('Données supprimées');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Database size={20} />
            Gestion des données
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Statistiques de stockage */}
        {storageStats && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <HardDrive size={16} />
              Utilisation du stockage
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Nombre de clés :</span>
                <span className="ml-2 font-medium">{storageStats.totalKeys}</span>
              </div>
              <div>
                <span className="text-gray-600">Taille totale :</span>
                <span className="ml-2 font-medium">{storageStats.totalSizeKB} KB</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Download size={16} />
            Exporter
          </button>

          <label className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer">
            <Upload size={16} />
            Importer
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>

          <button
            onClick={loadDataInfo}
            className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>

          <button
            onClick={handleClearData}
            className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            <Trash2 size={16} />
            Tout supprimer
          </button>
        </div>

        {/* Aperçu des données */}
        <div className="space-y-4">
          {Object.entries(savedData).map(([key, value]) => (
            <div key={key} className="border rounded-lg p-3">
              <h4 className="font-medium mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
              <div className="text-xs bg-gray-100 p-2 rounded max-h-32 overflow-y-auto">
                <pre>{JSON.stringify(value, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataManagement;