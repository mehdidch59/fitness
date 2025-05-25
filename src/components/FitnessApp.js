import { useAppContext } from '../context/AppContext';

// Importer les composants UI
import Navbar from './ui/Navbar.jsx';
import Questionnaire from './ui/Questionnaire';

/**
 * Composant principal de l'application Fitness IA
 * Maintenant utilisé comme layout wrapper pour React Router
 */
function FitnessApp({ children }) {
  const { 
    isQuestionnaire
  } = useAppContext();

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      <Navbar />
      
      {isQuestionnaire && <Questionnaire />}
    </div>
  );
}

export default FitnessApp; 