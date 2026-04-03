import { useState, useCallback } from 'react';

interface FormStateOptions<T> {
  initialValues: T;
  onSubmit?: (values: T) => Promise<void> | void;
  validate?: (values: T) => Record<string, string>;
}

export function useFormState<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate,
}: FormStateOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      
      setValues((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      }));

      // Validar campo em tempo real se já foi tocado
      if (touched[name] && validate) {
        const fieldErrors = validate({ ...values, [name]: value } as T);
        setErrors((prev) => ({
          ...prev,
          [name]: fieldErrors[name] || '',
        }));
      }
    },
    [touched, validate, values]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;
      
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      // Validar campo ao sair do foco
      if (validate) {
        const fieldErrors = validate(values);
        setErrors((prev) => ({
          ...prev,
          [name]: fieldErrors[name] || '',
        }));
      }
    },
    [validate, values]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Marcar todos os campos como tocados
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched(allTouched);

      // Validar todos os campos
      if (validate) {
        const formErrors = validate(values);
        setErrors(formErrors);

        if (Object.keys(formErrors).length > 0) {
          return;
        }
      }

      // Submeter formulário
      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validate, onSubmit]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const setFieldValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const setFieldError = useCallback((name: string, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
  };
}
