import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Zap, Clock, TrendingUp, ShoppingCart, Eye, RefreshCw } from 'lucide-react';
import { fridgeScannerService } from '../../services/fridgeScannerService';
import { useAuth } from '../../context/AuthContext';
import { usePopup } from '../../context/PopupContext';

const FridgeScannerView = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('scanner');
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const { showInfoPopup, showErrorPopup } = usePopup();
  const handleImageCapture = useCallback(async (file) => {
    if (!user) {
      showErrorPopup('Connexion requise', 'Veuillez vous connecter pour utiliser le scanner de frigo');
      return;
    }

    setIsScanning(true);
    setSelectedImage(URL.createObjectURL(file));
    
    try {
      const result = await fridgeScannerService.scanFridge(file, user.uid);
      setScanResult(result);
      setActiveTab('results');
      
      // Sauvegarder dans l'historique
      await fridgeScannerService.saveScanHistory(result, user.uid);
      
      showInfoPopup(
        'Scan terminé !', 
        `${result.detectedIngredients.length} ingrédients détectés et ${result.suggestedRecipes.length} recettes générées`
      );
      
    } catch (error) {
      console.error('Erreur scan frigo:', error);
      showErrorPopup('Erreur de scan', 'Impossible d\'analyser l\'image. Veuillez réessayer.');
    } finally {
      setIsScanning(false);
    }
  }, [user, showInfoPopup, showErrorPopup]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImageCapture(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const renderScanner = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Scanner de Frigo</h2>
        <p className="text-gray-600">
          Photographiez votre frigo pour découvrir des recettes anti-gaspillage
        </p>
      </div>

      {/* Zone de capture */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {selectedImage && !scanResult ? (
          <div className="text-center">
            <img 
              src={selectedImage} 
              alt="Image sélectionnée" 
              className="max-w-full h-64 object-contain mx-auto rounded-xl mb-4"
            />
            {isScanning && (
              <div className="flex items-center justify-center space-x-2 text-purple-600">
                <RefreshCw className="animate-spin" size={20} />
                <span>Analyse en cours...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
            <Camera size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Prenez une photo de votre frigo
            </h3>
            <p className="text-gray-600 mb-4">
              Notre IA analysera vos ingrédients et suggérera des recettes
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={triggerFileInput}
                disabled={isScanning}
                className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={20} className="mr-2" />
                {isScanning ? 'Analyse...' : 'Choisir une image'}
              </button>
            </div>
          </div>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Conseils */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Conseils pour un meilleur scan</h4>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Prenez une photo claire avec un bon éclairage</li>
          <li>• Assurez-vous que les étiquettes sont visibles</li>
          <li>• Ouvrez les tiroirs et compartiments</li>
          <li>• Évitez les reflets sur les emballages</li>
        </ul>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Résultats du Scan</h2>
        <button
          onClick={() => {
            setScanResult(null);
            setSelectedImage(null);
            setActiveTab('scanner');
          }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          Nouveau scan
        </button>
      </div>

      {scanResult && (
        <>
          {/* Score anti-gaspillage */}
          <div className="bg-green-50 rounded-xl p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Score Anti-Gaspillage</h3>
                <p className="text-green-800 text-sm">Potentiel de réduction du gaspillage</p>
              </div>
              <div className="text-3xl font-bold text-green-700">
                {scanResult.wasteReductionScore}%
              </div>
            </div>
          </div>

          {/* Ingrédients détectés */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Eye size={24} className="mr-2 text-purple-600" />
              Ingrédients Détectés ({scanResult.detectedIngredients.length})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scanResult.detectedIngredients.map((ingredient) => (
                <div 
                  key={ingredient.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    ingredient.freshness === 'critical' ? 'bg-red-50 border-red-500' :
                    ingredient.freshness === 'use_soon' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-green-50 border-green-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900">{ingredient.name}</h4>
                      <p className="text-sm text-gray-600">{ingredient.quantity}</p>
                      <p className="text-xs text-gray-500">{ingredient.category}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Expire dans</div>
                      <div className={`text-sm font-semibold ${
                        ingredient.expiry <= 1 ? 'text-red-600' :
                        ingredient.expiry <= 3 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {ingredient.expiry} jour{ingredient.expiry > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analyse d'expiration */}
          {scanResult.expirationAnalysis && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Clock size={24} className="mr-2 text-orange-600" />
              Analyse d'Expiration
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-900">Critique</h4>
                  <p className="text-2xl font-bold text-red-700">{scanResult.expirationAnalysis.critical.count}</p>
                  <p className="text-red-800 text-sm">{scanResult.expirationAnalysis.critical.message}</p>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-900">À utiliser bientôt</h4>
                  <p className="text-2xl font-bold text-yellow-700">{scanResult.expirationAnalysis.useSoon.count}</p>
                  <p className="text-yellow-800 text-sm">{scanResult.expirationAnalysis.useSoon.message}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900">Frais</h4>
                  <p className="text-2xl font-bold text-green-700">{scanResult.expirationAnalysis.fresh.count}</p>
                  <p className="text-green-800 text-sm">{scanResult.expirationAnalysis.fresh.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recettes suggérées */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <Zap size={24} className="mr-2 text-yellow-600" />
              Recettes Suggérées ({scanResult.suggestedRecipes.length})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scanResult.suggestedRecipes.map((recipe, index) => (
                <div key={recipe.id || index} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{recipe.name}</h4>
                    <div className="flex items-center text-green-600 text-sm">
                      <TrendingUp size={16} className="mr-1" />
                      {recipe.wasteReduction}% anti-gaspi
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{recipe.description}</p>
                  
                  <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                    <span>{recipe.calories} kcal</span>
                    <span>{recipe.protein}g protéines</span>
                    <span>{recipe.time} min</span>
                  </div>
                  
                  {recipe.usedIngredients && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Ingrédients utilisés :</p>
                      <div className="flex flex-wrap gap-1">
                        {recipe.usedIngredients.slice(0, 3).map((ing, idx) => (
                          <span 
                            key={idx}
                            className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded"
                          >
                            {typeof ing === 'string' ? ing : ing.name}
                          </span>
                        ))}
                        {recipe.usedIngredients.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{recipe.usedIngredients.length - 3} autres
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    Voir la recette
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions d'achat */}
          {scanResult.shoppingSuggestions && scanResult.shoppingSuggestions.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <ShoppingCart size={24} className="mr-2 text-blue-600" />
                Suggestions d'Achat
              </h3>
              
              <div className="space-y-3">
                {scanResult.shoppingSuggestions.map((suggestion, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900">{suggestion.category}</h4>
                    <p className="text-blue-800 text-sm mb-2">{suggestion.reason}</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestion.items.map((item, itemIndex) => (
                        <span 
                          key={itemIndex}
                          className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insights nutritionnels */}
          {scanResult.nutritionInsights && scanResult.nutritionInsights.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">💡 Insights Nutritionnels</h3>
              
              <div className="space-y-3">
                {scanResult.nutritionInsights.map((insight, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg ${
                      insight.type === 'positive' ? 'bg-green-50 text-green-800' :
                      insight.type === 'suggestion' ? 'bg-yellow-50 text-yellow-800' :
                      'bg-blue-50 text-blue-800'
                    }`}
                  >
                    <strong>{insight.category}:</strong> {insight.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="pb-20 p-6 bg-gray-50 min-h-screen">
      {/* Navigation tabs */}
      <div className="flex bg-white rounded-xl shadow-sm p-1 mb-6">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'scanner'
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Scanner
        </button>
        <button
          onClick={() => setActiveTab('results')}
          disabled={!scanResult}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'results' && scanResult
              ? 'bg-purple-600 text-white'
              : 'text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          Résultats
        </button>
      </div>

      {activeTab === 'scanner' && renderScanner()}
      {activeTab === 'results' && scanResult && renderResults()}
    </div>
  );
};

export default FridgeScannerView;
