'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Callback cuando el valor cambia - recibe solo dígitos */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Valor controlado */
  value?: string;
  /** Formato de teléfono: 'co' (Colombia: 310 123 4567), 'us' (USA: (123) 456-7890) */
  format?: 'co' | 'us' | 'none';
  /** Longitud máxima de dígitos */
  maxLength?: number;
}

// Formatear teléfono colombiano: 310 123 4567
function formatColombian(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

// Formatear teléfono USA: (123) 456-7890
function formatUSA(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, value, format = 'co', maxLength = 10, ...props }, ref) => {
    // Extraer solo dígitos del valor
    const digits = (value ?? '').replace(/\D/g, '').slice(0, maxLength);

    // Formatear para mostrar
    const displayValue = React.useMemo(() => {
      if (format === 'co') return formatColombian(digits);
      if (format === 'us') return formatUSA(digits);
      return digits;
    }, [digits, format]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Extraer solo dígitos
      const newDigits = e.target.value.replace(/\D/g, '').slice(0, maxLength);

      if (onChange) {
        onChange({
          ...e,
          target: {
            ...e.target,
            value: newDigits,
            id: e.target?.id,
            name: e.target?.name,
          },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <input
        type="tel"
        inputMode="tel"
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        autoComplete="tel"
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };
