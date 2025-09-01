import React from 'react';
import { Activity, Search, Dumbbell, Apple } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { useI18n } from '../../utils/i18n';

function TrackingView() {
  const { stats } = useAppContext();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();

  // Générer des données fictives pour le graphique
  const chartData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'short' }),
    activité: Math.floor(Math.random() * 3)
  }));

  // Générer un historique fictif
  const generateHistory = () => {
    const history = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toLocaleDateString('fr-FR');
      
      if (i % 2 === 0) {
        history.push({
          type: 'workout',
          date: dateStr,
          source: 'Programme personnalisé'
        });
      } else {
        history.push({
          type: 'nutrition',
          date: dateStr,
          source: 'Plan nutritionnel'
        });
      }
    }
    
    return history;
  };
  
  const activityHistory = generateHistory();

  if (!isAuthenticated) {
    return (
      <div className="pb-20 p-4 sm:p-6 bg-gray-50 min-h-screen">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">{t('tracking.title', 'Statistiques')}</h2>
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-200 max-w-xl mx-auto text-center">
          <p className="text-gray-700 mb-4">{t('tracking.loginPrompt', 'Connectez-vous pour accéder au suivi.')}</p>
          <Link
            to="/auth"
            className="inline-block px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-semibold"
          >
            {t('common.login', 'Se connecter')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 p-4 sm:p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">{t('tracking.title', 'Statistiques')}</h2>

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-5xl mx-auto">
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 dark:from-indigo-600 dark:to-violet-700 text-white p-6 rounded-2xl">
          <Activity className="mb-3" size={28} />
          <p className="text-sm opacity-90">{t('tracking.sessions', 'Séances')}</p>
          <p className="text-3xl font-bold">{stats ? stats.workoutsCompleted : 0}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-6 rounded-2xl">
          <Search className="mb-3" size={28} />
          <p className="text-sm opacity-90">{t('tracking.minutes', 'Minutes')}</p>
          <p className="text-3xl font-bold">{stats ? stats.totalMinutes : 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 max-w-5xl mx-auto">
        <h3 className="font-bold text-lg mb-4">{t('tracking.weeklyActivity', 'Activité hebdomadaire')}</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="activité" 
              stroke="#8B5CF6" 
              strokeWidth={3} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-lg max-w-5xl mx-auto">
        <h3 className="font-bold text-lg mb-4">{t('tracking.history', 'Historique')}</h3>
        <div className="space-y-3">
          {activityHistory.map((log, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center">
                {log.type === 'workout' ? (
                  <Dumbbell className="text-purple-600 mr-3" size={20} />
                ) : (
                  <Apple className="text-green-600 mr-3" size={20} />
                )}
                <div>
                  <p className="font-semibold">
                    {log.type === 'workout' ? t('tracking.generatedProgram', 'Programme généré') : t('tracking.foundRecipes', 'Recettes trouvées')}
                  </p>
                  <p className="text-xs text-gray-500">{log.source}</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">{log.date}</span>
            </div>
          ))}
          
          {activityHistory.length === 0 && (
            <div className="text-center py-4">
              <p className="text-gray-500">{t('tracking.noActivity', 'Aucune activité enregistrée')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrackingView; 
