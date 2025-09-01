import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  User, 
  Dumbbell, 
  Apple, 
  Activity,
  Zap
} from 'lucide-react';
import { useI18n } from '../../utils/i18n';
import ThemeToggle from './ThemeToggle';

/**
 * Composant de navigation en bas de page
 */
function Navbar() {
  const { t } = useI18n();
  const navItems = [
    { key: 'home', icon: Home, labelKey: 'nav.home', fallback: 'Accueil', path: '/' },
    { key: 'auth', icon: User, labelKey: 'nav.profile', fallback: 'Profil', path: '/auth' },
    { key: 'workout', icon: Dumbbell, labelKey: 'nav.workout', fallback: 'Training', path: '/workout' },
    { key: 'nutrition', icon: Apple, labelKey: 'nav.nutrition', fallback: 'Nutrition', path: '/nutrition' },
    { key: 'tracking', icon: Activity, labelKey: 'nav.tracking', fallback: 'Suivi', path: '/tracking' },
    { key: 'advanced', icon: Zap, labelKey: 'nav.advanced', fallback: 'IA+', path: '/advanced' }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 shadow-md"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex-1 flex justify-around items-center">
            {navItems.map(({ key, icon: Icon, labelKey, fallback, path }) => (
              <NavLink
                key={key}
                to={path}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center min-w-0 flex-1 px-3 py-2 text-[11px] sm:text-xs rounded-xl
                  ${isActive ? 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20' : 'text-gray-600 dark:text-gray-300'}
                  hover:text-blue-600 transition-all duration-200 hover:scale-[1.04] active:scale-95
                `}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="truncate w-full text-center hidden sm:block">{t(labelKey, fallback)}</span>
              </NavLink>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
