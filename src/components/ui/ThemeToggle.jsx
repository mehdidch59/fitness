import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { persistenceService } from '../../services/persistenceService';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const appSettings = persistenceService.loadAppSettings();
      const initialDark = appSettings?.theme === 'dark';
      setIsDark(!!initialDark);
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next);
      }
      const settings = persistenceService.loadAppSettings();
      persistenceService.saveAppSettings({
        ...settings,
        theme: next ? 'dark' : 'light',
      });
    } catch {}
  };

  return (
    <button
      type="button"
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      onClick={toggleTheme}
      className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;

