import React from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      {/* ...existing sections... */}

      <div className="dashboard-section">
        <h3>🚀 Nouvelles Fonctionnalités</h3>
        <div className="advanced-features-preview">
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <h4>Scanner de Frigo</h4>
            <p>Analysez votre frigo et générez des recettes automatiquement</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h4>Meal Planning IA</h4>
            <p>Plans de repas personnalisés avec liste de courses intelligente</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎮</div>
            <h4>Système de Points</h4>
            <p>Gagnez des points, débloquez des badges et relevez des défis</p>
          </div>
        </div>
        <Link to="/advanced-demo" className="demo-button">
          🚀 Découvrir les Fonctionnalités Avancées
        </Link>
      </div>

      {/* ...existing sections... */}
    </div>
  );
};

export default Dashboard;