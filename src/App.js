import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppBootstrap from './components/AppBootstrap';
import { useAuth } from './hooks/useAuth';
import './styles/main.css';

// Importer les providers
import { UserSessionProvider } from './components/UserSessionProvider';
import { I18nProvider } from './context/I18nContext';

// Importer les vues pour les routes
import HomeView from './components/views/HomeView';
import AuthView from './components/views/AuthView';
import Navbar from './components/ui/Navbar';
import ProfileView from './components/views/ProfileView';
import SettingsView from './components/views/SettingsView';
import WorkoutView from './components/views/WorkoutView';
import NutritionView from './components/views/NutritionView';
import TrackingView from './components/views/TrackingView';
import AdvancedFeaturesView from './components/views/IAView';

// Importer l'indicateur de sauvegarde
import SaveIndicator from './components/ui/SaveIndicator';

// Importer le service de persistance
import { persistenceService } from './services/persistenceService';

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
  const { user } = useAuth();
  const lastSyncTime = persistenceService.load(persistenceService.keys.LAST_SYNC);

  return (
    <I18nProvider>
      <UserSessionProvider>
        <Router>
        <AppBootstrap />
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/auth" element={<AuthProfileWrapper />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/workout" element={<WorkoutView />} />
          <Route path="/nutrition" element={<NutritionView />} />
          <Route path="/tracking" element={<TrackingView />} />
          <Route path="/advanced" element={<AdvancedFeaturesView userId={user?.uid} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Navbar />
        
        {/* Indicateur de sauvegarde */}
        <SaveIndicator 
          lastSaved={lastSyncTime}
          showDetails={false}
        />
        </Router>
      </UserSessionProvider>
    </I18nProvider>
  );
};

export default App;
