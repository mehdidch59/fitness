import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  User, 
  Dumbbell, 
  Apple, 
  Activity 
} from 'lucide-react';

/**
 * Composant de navigation en bas de page
 */
function Navbar() {  const navItems = [
    { key: 'home', icon: Home, label: 'Accueil', path: '/' },
    { key: 'auth', icon: User, label: 'Profil', path: '/auth' },
    { key: 'workout', icon: Dumbbell, label: 'Training', path: '/workout' },
    { key: 'nutrition', icon: Apple, label: 'Nutrition', path: '/nutrition' },
    { key: 'tracking', icon: Activity, label: 'Suivi', path: '/tracking' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-1 py-2 z-40">
      <div className="flex justify-around items-center">
        {navItems.map(({ key, icon: Icon, label, path }) => (
          <NavLink
            key={key}
            to={path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center min-w-0 flex-1 px-1 py-1 text-xs
              ${isActive ? 'text-blue-600' : 'text-gray-500'}
              hover:text-blue-600 transition-colors duration-200
            `}
          >
            <Icon className="h-6 w-6 mb-1" />
            <span className="truncate w-full text-center">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default Navbar;