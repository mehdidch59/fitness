import { useForm } from 'react-hook-form';

/**
 * Hook personnalisé pour faciliter l'utilisation de react-hook-form
 * @param {Object} options - Options pour configurer le formulaire
 * @param {Object} options.defaultValues - Valeurs par défaut du formulaire
 * @param {Function} options.onSubmit - Fonction appelée à la soumission du formulaire
 * @param {Object} options.validationSchema - Schéma de validation yup (optionnel)
 */
export function useFormWithValidation(options = {}) {
  const {
    defaultValues = {},
    onSubmit = () => {},
    validationSchema = null
  } = options;

  // Configuration de react-hook-form
  const formMethods = useForm({
    defaultValues,
    mode: 'onBlur',
    resolver: validationSchema ? async (data) => {
      try {
        const values = await validationSchema.validate(data, {
          abortEarly: false
        });
        return {
          values,
          errors: {}
        };
      } catch (errors) {
        return {
          values: {},
          errors: errors.inner.reduce(
            (allErrors, currentError) => ({
              ...allErrors,
              [currentError.path]: {
                type: currentError.type ?? 'validation',
                message: currentError.message
              }
            }),
            {}
          )
        };
      }
    } : undefined
  });

  const { handleSubmit, formState } = formMethods;

  // Fonction de soumission qui capture les erreurs
  const submitHandler = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Erreur lors de la soumission du formulaire:', error);
    }
  });

  return {
    ...formMethods,
    submitHandler,
    isSubmitting: formState.isSubmitting,
    errors: formState.errors
  };
}