'use client';

import * as React from 'react';
import { CompanySettingsContext } from '@/shared/providers/CompanySettingsProvider';
import { formatCurrencyCO, formatNumberCO, formatPercentCO } from '@/shared/utils/formatNumber';

export interface FormattedNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Valor numérico a formatear */
  value: number;
  /** Tipo de formato: moneda (COP), número plano o porcentaje */
  type?: 'currency' | 'number' | 'percent';
  /** Override manual de decimales (ignora displayDecimals del contexto) */
  decimals?: number;
}

/**
 * Componente display para mostrar números formateados según la configuración
 * de decimales del tenant (CompanySettingsProvider).
 *
 * @example
 * <FormattedNumber value={1500000} type="currency" />
 * // → $ 1.500.000 (con 0 decimales configurados)
 * // → $ 1.500.000,00 (con 2 decimales configurados)
 *
 * <FormattedNumber value={1500000} type="currency" className="text-green-600 text-2xl font-bold" />
 *
 * <FormattedNumber value={42} type="number" />
 * // → 42
 *
 * <FormattedNumber value={0.1534} type="percent" />
 * // → 15,34 %
 *
 * <FormattedNumber value={1234.567} decimals={3} />
 * // → 1.234,567 (override manual)
 */
const FormattedNumber = React.forwardRef<HTMLSpanElement, FormattedNumberProps>(
  ({ value, type = 'number', decimals: decimalsProp, className, ...props }, ref) => {
    const settingsContext = React.useContext(CompanySettingsContext);
    const decimals = decimalsProp ?? settingsContext?.displayDecimals ?? 2;

    const formatted = React.useMemo(() => {
      switch (type) {
        case 'currency':
          return formatCurrencyCO(value, decimals);
        case 'percent':
          return formatPercentCO(value, decimals);
        default:
          return formatNumberCO(value, decimals);
      }
    }, [value, type, decimals]);

    return (
      <span ref={ref} className={className} {...props}>
        {formatted}
      </span>
    );
  }
);
FormattedNumber.displayName = 'FormattedNumber';

/**
 * Hook que devuelve funciones de formateo con los decimales
 * del tenant ya aplicados. Usar en toasts, strings, títulos, etc.
 * donde no se puede usar el componente <FormattedNumber>.
 *
 * @example
 * const { fmtCurrency, fmtNumber, fmtPercent } = useFormatNumber();
 * toast.success(`Total: ${fmtCurrency(15000)}`);
 */
function useFormatNumber(overrideDecimals?: number) {
  const settingsContext = React.useContext(CompanySettingsContext);
  const decimals = overrideDecimals ?? settingsContext?.displayDecimals ?? 2;

  return React.useMemo(() => ({
    fmtCurrency: (value: number) => formatCurrencyCO(value, decimals),
    fmtNumber: (value: number) => formatNumberCO(value, decimals),
    fmtPercent: (value: number) => formatPercentCO(value, decimals),
    displayDecimals: decimals,
  }), [decimals]);
}

export { FormattedNumber, useFormatNumber };
