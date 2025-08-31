import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { persistenceService } from '../services/persistenceService';
import fr from '../locales/fr.json';
import en from '../locales/en.json';

const dictionaries = { fr, en };

function get(obj, path, fallback) {
  try {
    return String(path).split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj) ?? fallback;
  } catch {
    return fallback;
  }
}

const I18nContext = createContext({
  locale: 'fr',
  t: (key) => key,
  setLocale: () => {}
});

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    try { return persistenceService.loadAppSettings()?.language || 'fr'; } catch { return 'fr'; }
  });

  useEffect(() => {
    const onChange = (e) => {
      const next = (e?.detail && e.detail.language) || persistenceService.loadAppSettings()?.language;
      if (next) setLocale(next);
    };
    window.addEventListener('appSettingsChanged', onChange);
    return () => window.removeEventListener('appSettingsChanged', onChange);
  }, []);

  useEffect(() => {
    try {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', locale);
      }
    } catch {}
  }, [locale]);

  const dict = useMemo(() => dictionaries[locale] || dictionaries.fr, [locale]);
  const t = useMemo(() => (key, fallback) => get(dict, key, fallback || key), [dict]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export default I18nContext;

