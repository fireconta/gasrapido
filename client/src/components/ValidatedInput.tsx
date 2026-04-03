import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  helperText?: string;
  success?: boolean;
}

export const ValidatedInput = React.forwardRef<
  HTMLInputElement,
  ValidatedInputProps
>(
  (
    {
      label,
      error,
      touched,
      required,
      helperText,
      success,
      className,
      ...props
    },
    ref
  ) => {
    const hasError = touched && error;
    const isValid = touched && !error && success;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <Label className="text-xs font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            className={`
              ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''}
              ${isValid ? 'border-green-500 focus-visible:ring-green-500' : ''}
              ${className}
            `}
            {...props}
          />
          {hasError && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
          )}
          {isValid && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          )}
        </div>
        {hasError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';
