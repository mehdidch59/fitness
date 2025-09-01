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
  const { t, locale } = useI18n();

  // Données de graphique cohérentes (pas de valeurs aléatoires)
  const chartData = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(locale || 'fr-FR', { weekday: 'short' }),
    activité: 0
  }));

  // Pas d'historique fictif: laisser vide si aucune activité
  const activityHistory = [];

  if (!isAuthenticated) {
    return (
      <div className="pb-20 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">{t('tracking.title', 'Statistiques')}</h2>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-purple-200 dark:border-purple-700/50 max-w-xl mx-auto text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">{t('tracking.loginPrompt', 'Connectez-vous pour accéder au suivi.')}</p>
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
    <div className="pb-20 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-900 dark:to-gray-900 min-h-screen">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">{t('tracking.title', 'Statistiques')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-5xl mx-auto">
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

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm mb-6 max-w-5xl mx-auto">
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

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm max-w-5xl mx-auto">
        <h3 className="font-bold text-lg mb-4">{t('tracking.history', 'Historique')}</h3>
        <div className="space-y-3">
          {activityHistory.map((log, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
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
              <p className="text-gray-500 dark:text-gray-400">{t('tracking.noActivity', 'Aucune activité enregistrée')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TrackingView; 
