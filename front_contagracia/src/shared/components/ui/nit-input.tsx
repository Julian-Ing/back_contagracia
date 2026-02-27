'use client';

import * as React from 'react';
import { cn } from '@/shared/lib/utils';

// Calcular dígito de verificación del NIT (algoritmo DIAN Colombia)
const FACTORES_DV = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

function calcularDV(nit: string): string {
  if (!/^\d+$/.test(nit)) return '';
  let suma = 0;
  const nitReverso = nit.split('').reverse();
  for (let i = 0; i < nitReverso.length && i < FACTORES_DV.length; i++) {
    suma += parseInt(nitReverso[i], 10) * FACTORES_DV[i];
  }
  const resto = suma % 11;
  return String(resto > 1 ? 11 - resto : resto);
}

export interface NITInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Callback cuando el NIT cambia - recibe solo dígitos */
  onNITChange?: (nit: string, dv: string) => void;
  /** Callback estándar de onChange */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Valor del NIT (solo dígitos) */
  value?: string;
  /** Mostrar el DV calculado automáticamente */
  showDV?: boolean;
  /** Separador entre NIT y DV */
  dvSeparator?: string;
}

const NITInput = React.forwardRef<HTMLInputElement, NITInputProps>(
  (
    { className, onChange, onNITChange, value = '', showDV = true, dvSeparator = '-', ...props },
    ref
  ) => {
    // Extraer solo dígitos del NIT
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 10);
    const dv = calcularDV(digits);

    // Valor a mostrar
    const displayValue = React.useMemo(() => {
      if (!digits) return '';
      if (showDV && dv) return `${digits}${dvSeparator}${dv}`;
      return digits;
    }, [digits, dv, showDV, dvSeparator]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Extraer solo dígitos (ignorar el DV si lo escriben)
      const inputValue = e.target.value;
      const newDigits = inputValue.split(dvSeparator)[0].replace(/\D/g, '').slice(0, 10);
      const newDV = calcularDV(newDigits);

      if (onNITChange) {
        onNITChange(newDigits, newDV);
      }

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
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9\-]*"
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          autoComplete="off"
          value={displayValue}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);
NITInput.displayName = 'NITInput';

// Exportar también la función de cálculo de DV por si se necesita
export { NITInput, calcularDV };
