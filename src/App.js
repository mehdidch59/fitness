import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FitnessApp from './components/FitnessApp';
import AppBootstrap from './components/AppBootstrap';
import { useAuth } from './hooks/useAuth';
import './styles/main.css';

// Importer les providers
import { UserSessionProvider } from './components/UserSessionProvider';

// Importer les vues pour les routes
import HomeView from './components/views/HomeView';
import AuthView from './components/views/AuthView';
import ProfileView from './components/views/ProfileView';
import SettingsView from './components/views/SettingsView';
import WorkoutView from './components/views/WorkoutView';
import NutritionView from './components/views/NutritionView';
import TrackingView from './components/views/TrackingView';

// Composant wrapper pour gérer l'affichage conditionnel Auth/Profile
const AuthProfileWrapper = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return user ? <ProfileView /> : <AuthView />;
};

const App = () => {
  return (
    <UserSessionProvider>
      <Router>
        <AppBootstrap />
        <Routes>
          <Route path="/" element={<FitnessApp><HomeView /></FitnessApp>} />
          <Route path="/auth" element={<FitnessApp><AuthProfileWrapper /></FitnessApp>} />
          <Route path="/settings" element={<FitnessApp><SettingsView /></FitnessApp>} />
          <Route path="/workout" element={<FitnessApp><WorkoutView /></FitnessApp>} />
          <Route path="/nutrition" element={<FitnessApp><NutritionView /></FitnessApp>} />
          <Route path="/tracking" element={<FitnessApp><TrackingView /></FitnessApp>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserSessionProvider>
  );
};

export default App;