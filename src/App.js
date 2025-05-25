import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FitnessApp from './components/FitnessApp';
import AppBootstrap from './components/AppBootstrap';
import './styles/main.css';

// Importer les vues pour les routes
import HomeView from './components/views/HomeView';
import AuthView from './components/views/AuthView';
import SettingsView from './components/views/SettingsView';
import WorkoutView from './components/views/WorkoutView';
import NutritionView from './components/views/NutritionView';
import TrackingView from './components/views/TrackingView';

const App = () => {
  return (
    <Router>
      <AppBootstrap />
      <Routes>
        <Route path="/" element={<FitnessApp><HomeView /></FitnessApp>} />
        <Route path="/auth" element={<FitnessApp><AuthView /></FitnessApp>} />
        <Route path="/settings" element={<FitnessApp><SettingsView /></FitnessApp>} />
        <Route path="/workout" element={<FitnessApp><WorkoutView /></FitnessApp>} />
        <Route path="/nutrition" element={<FitnessApp><NutritionView /></FitnessApp>} />
        <Route path="/tracking" element={<FitnessApp><TrackingView /></FitnessApp>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;