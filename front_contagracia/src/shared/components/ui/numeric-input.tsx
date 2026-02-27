'use client';

import * as React from 'react';
import { Decimal } from 'decimal.js';
import { cn } from '@/shared/lib/utils';
import { CompanySettingsContext } from '@/shared/providers/CompanySettingsProvider';

// Obtener símbolos de formato según locale
function getLocaleSymbols(locale = 'es-CO') {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = parts.find((p) => p.type === 'group')?.value || '.';
  const decimal = parts.find((p) => p.type === 'decimal')?.value || ',';
  return { group, decimal, nf: new Intl.NumberFormat(locale) };
}

// Normalizar string de entrada a formato numérico estándar (con punto decimal)
function normalizeForChange(inputStr: string | null | undefined, _group: string, _decimal: string): string {
  if (inputStr == null) return '';
  let s = String(inputStr).replace(/\s/g, '');

  const neg = s.startsWith('-') ? '-' : '';
  if (neg) s = s.slice(1);
  s = s.replace(/-/g, '');

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const hasDot = lastDot !== -1;
  const hasComma = lastComma !== -1;
  const decSep =
    hasDot && hasComma
      ? lastDot > lastComma
        ? '.'
        : ','
      : hasDot
        ? '.'
        : hasComma
          ? ','
          : null;

  const endedWithSep = !!decSep && s.endsWith(decSep);

  let intRaw = s,
    decRaw = '';
  if (decSep) {
    const idx = s.lastIndexOf(decSep);
    intRaw = s.slice(0, idx);
    decRaw = s.slice(idx + 1);
  }

  const intDigits = intRaw.replace(/\D/g, '');
  const decDigits = decRaw.replace(/\D/g, '');

  if (!intDigits && !decDigits && !endedWithSep) return neg;

  const finalInt = intDigits || '0';
  return neg + finalInt + (decDigits ? '.' + decDigits : endedWithSep ? '.' : '');
}

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Locale para formato de números (default: 'es-CO') */
  locale?: string;
  /** Callback cuando el valor cambia - recibe el valor normalizado (con punto decimal) */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Valor controlado */
  value?: string | number;
  /** Valor por defecto (no controlado) */
  defaultValue?: string | number;
  /** Permitir números negativos */
  allowNegative?: boolean;
  /** Número máximo de decimales permitidos */
  maxDecimals?: number;
  /** Mostrar prefijo de moneda ($) */
  currency?: boolean;
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      className,
      onChange,
      onFocus,
      onBlur,
      value,
      defaultValue,
      locale = 'es-CO',
      allowNegative = true,
      maxDecimals: maxDecimalsProp,
      currency = false,
      ...props
    },
    ref
  ) => {
    // Si no se pasa maxDecimals explícito, usar el del contexto del tenant (o undefined fuera del provider)
    const settingsContext = React.useContext(CompanySettingsContext);
    const maxDecimals = maxDecimalsProp !== undefined ? maxDecimalsProp : settingsContext?.displayDecimals;

    const { group, decimal, nf } = React.useMemo(() => getLocaleSymbols(locale), [locale]);

    const [focused, setFocused] = React.useState(false);
    const isControlled = value !== undefined;

    const [internal, setInternal] = React.useState<string>(() =>
      isControlled ? '' : String(defaultValue ?? '')
    );

    const rawBase = isControlled ? String(value ?? '') : String(internal ?? '');

    // Auto-correct: if incoming value has more decimals than maxDecimals, fire onChange with rounded value
    React.useEffect(() => {
      if (maxDecimals === undefined || !isControlled || !onChange) return;
      const norm = normalizeForChange(String(value), group, decimal);
      if (!norm || !norm.includes('.')) return;
      const [, decPart] = norm.split('.');
      if (decPart && decPart.length > maxDecimals) {
        const corrected = new Decimal(norm).toDecimalPlaces(maxDecimals, Decimal.ROUND_HALF_UP).toNumber();
        onChange({
          target: { value: String(corrected), name: props.name ?? '', id: props.id ?? '' },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }, [value, maxDecimals]);

    // Valor a mostrar en el input
    const displayValue = React.useMemo(() => {
      if (focused) {
        // Mientras está enfocado, mostrar con separador decimal del locale
        let norm = normalizeForChange(rawBase, group, decimal);
        // Respetar maxDecimals también en focus (redondear exceso)
        if (maxDecimals !== undefined && norm && !norm.endsWith('.') && norm !== '-' && norm !== '-.') {
          const dotIdx = norm.indexOf('.');
          if (dotIdx !== -1) {
            const decPart = norm.slice(dotIdx + 1);
            if (decPart.length > maxDecimals) {
              const rounded = new Decimal(norm).toDecimalPlaces(maxDecimals, Decimal.ROUND_HALF_UP);
              norm = maxDecimals === 0 ? rounded.toFixed(0) : rounded.toFixed(maxDecimals);
            }
          }
        }
        return norm.replace(/\./g, decimal);
      }

      // Sin foco, mostrar formateado con separadores de miles
      const norm = normalizeForChange(rawBase, group, decimal);
      if (!norm || norm === '-' || norm === '.' || norm === '-.') return '';
      const num = Number(norm);
      if (!Number.isFinite(num)) return '';

      // Aplicar máximo de decimales si está definido
      if (maxDecimals !== undefined) {
        const rounded = new Decimal(num).toDecimalPlaces(maxDecimals, Decimal.ROUND_HALF_UP).toNumber();
        return nf.format(rounded);
      }
      return nf.format(num);
    }, [focused, rawBase, group, decimal, nf, maxDecimals]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let typed = e.target.value;

      // Si no permite negativos, remover el signo
      if (!allowNegative) {
        typed = typed.replace(/-/g, '');
      }

      if (!isControlled) setInternal(typed);

      let normalized = normalizeForChange(typed, group, decimal);

      // Aplicar límite de decimales
      if (maxDecimals !== undefined && normalized.includes('.')) {
        const [intPart, decPart] = normalized.split('.');
        if (decPart && decPart.length > maxDecimals) {
          normalized = intPart + '.' + decPart.slice(0, maxDecimals);
        }
      }

      if (onChange) {
        onChange({
          ...e,
          target: {
            ...e.target,
            value: normalized,
            id: e.target?.id,
            name: e.target?.name,
          },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const inputEl = (
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9.,\-]*"
        className={cn(
          'flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100',
          currency ? 'pl-8 text-left' : 'text-right',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        autoComplete="off"
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      />
    );

    if (currency) {
      return (
        <div className="relative w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">$</span>
          {inputEl}
        </div>
      );
    }

    return inputEl;
  }
);
NumericInput.displayName = 'NumericInput';

export { NumericInput };
