import React from 'react';
import { useI18n } from '../../utils/i18n';

/**
 * Composant Input optimisé pour éviter les problèmes de focus
 */
function Input({ 
  label, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  options = [],
  className = "",
  required = false,
  error = null
}) {
  const { t } = useI18n();
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  // Configuration commune pour les entrées
  const inputClasses = `w-full p-3 border ${error ? 'border-red-500' : 'border-gray-300'} 
    rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all
    ${className}`;

  // Rendu du select si type="select"
  if (type === "select") {
    return (
      <div className="mb-4">
        {label && (
          <label className="block text-gray-700 mb-2">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          value={value || ''}
          onChange={handleChange}
          className={inputClasses}
          required={required}
        >
          <option value="">{t('common.select', 'Sélectionner...')}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Rendu des champs textarea
  if (type === "textarea") {
    return (
      <div className="input-field">
        {label && (
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          value={value || ""}
          onChange={handleChange}
          className={`${inputClasses} min-h-[100px]`}
          placeholder={placeholder}
          required={required}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Rendu par défaut (input standard)
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-gray-700 mb-2">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        className={inputClasses}
        required={required}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default Input; 
