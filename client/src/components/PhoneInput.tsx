import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { applyPhoneMask, isValidPhone } from "../../../shared/phoneUtils";

interface PhoneInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      onChange,
      onBlur,
      value,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = applyPhoneMask(e.target.value);
      e.target.value = formatted;
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const isValid = isValidPhone(e.target.value);
      if (e.target.value && !isValid) {
        // Pode adicionar validação visual aqui
      }
      onBlur?.(e);
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <Input
          ref={ref}
          type="tel"
          placeholder="(11) 99999-9999"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={error ? "border-red-500" : ""}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
