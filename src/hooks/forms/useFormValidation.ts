import { useState, useCallback } from "react";
import { isAddress } from "viem";

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean;
  message: string;
}

export interface FormFieldConfig<T = any> {
  rules: ValidationRule<T>[];
  initialValue: T;
}

export interface FormConfig {
  [key: string]: FormFieldConfig;
}

export function useFormValidation<T extends Record<string, any>>(config: FormConfig) {
  const [values, setValues] = useState<T>(() => {
    const initialValues = {} as T;
    Object.keys(config).forEach((key) => {
      initialValues[key as keyof T] = config[key].initialValue;
    });
    return initialValues;
  });

  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = useCallback(
    (name: keyof T, value: any): string | null => {
      const fieldConfig = config[name as string];
      if (!fieldConfig) return null;

      for (const rule of fieldConfig.rules) {
        if (!rule.validate(value)) {
          return rule.message;
        }
      }
      return null;
    },
    [config],
  );

  const setValue = useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Validate immediately if field has been touched
      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error || undefined }));
      }
    },
    [validateField, touched],
  );

  const setFieldTouched = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));

      // Validate when field becomes touched
      const error = validateField(name, values[name]);
      setErrors((prev) => ({ ...prev, [name]: error || undefined }));
    },
    [validateField, values],
  );

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(config).forEach((key) => {
      const error = validateField(key as keyof T, values[key as keyof T]);
      if (error) {
        newErrors[key as keyof T] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(config).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    return isValid;
  }, [config, validateField, values]);

  const reset = useCallback(() => {
    const initialValues = {} as T;
    Object.keys(config).forEach((key) => {
      initialValues[key as keyof T] = config[key].initialValue;
    });
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [config]);

  const isFieldValid = useCallback(
    (name: keyof T): boolean => {
      return !errors[name];
    },
    [errors],
  );

  const isFormValid = Object.keys(config).every((key) => isFieldValid(key as keyof T));

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
    isFieldValid,
    isFormValid,
  };
}

// Commonly used validation rules
export const validationRules = {
  required: <T>(message = "This field is required"): ValidationRule<T> => ({
    validate: (value: T) => value !== null && value !== undefined && String(value).trim() !== "",
    message,
  }),

  ethereumAddress: (message = "Please enter a valid Ethereum address"): ValidationRule<string> => ({
    validate: (value: string) => !value || isAddress(value),
    message,
  }),

  positiveNumber: (message = "Must be a positive number"): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      return !isNaN(num) && num > 0;
    },
    message,
  }),

  maxAmount: (max: number, message?: string): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      return isNaN(num) || num <= max;
    },
    message: message || `Amount cannot exceed ${max}`,
  }),

  minAmount: (min: number, message?: string): ValidationRule<string | number> => ({
    validate: (value: string | number) => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      return isNaN(num) || num >= min;
    },
    message: message || `Amount must be at least ${min}`,
  }),

  decimalString: (message = "Please enter a valid decimal number"): ValidationRule<string> => ({
    validate: (value: string) => !value || /^\d*\.?\d*$/.test(value),
    message,
  }),
};
