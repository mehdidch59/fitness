/**
 * Vue principale pour les fonctionnalités avancées
 */

import React from 'react';
import AdvancedFeaturesDemo from '../AdvancedFeaturesDemo';
import { useAuth } from '../../hooks/useAuth';

const AdvancedFeaturesView = () => {
  const { user } = useAuth();

  return (
    <div className="advanced-features-view pb-20 min-h-screen bg-gray-50">
      <div className="view-header">
        <h1>🚀 Fonctionnalités Avancées</h1>
        <p>Découvrez les nouvelles fonctionnalités IA : Scanner Frigo, Meal Planning, Gamification</p>
      </div>
      
      <AdvancedFeaturesDemo userId={user?.uid || 'demo_user'} />
    </div>
  );
};

export default AdvancedFeaturesView;