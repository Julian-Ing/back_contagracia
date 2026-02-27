/**
 * Utilidad centralizada para formateo de números.
 * Respeta la configuración de decimales del tenant (displayDecimals).
 *
 * Uso directo (sin React):
 *   formatCurrencyCO(1500000, 2)  → "$ 1.500.000,00"
 *   formatNumberCO(1500000, 0)    → "1.500.000"
 *   formatPercentCO(0.1534, 2)    → "15,34 %"
 */

import { Decimal } from 'decimal.js';

const DEFAULT_LOCALE = 'es-CO';
const DEFAULT_CURRENCY = 'COP';

export function formatCurrencyCO(value: number, decimals = 0): string {
  const rounded = new Decimal(value ?? 0).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
}

export function formatNumberCO(value: number, decimals = 0): string {
  const rounded = new Decimal(value ?? 0).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
}

export function formatPercentCO(value: number, decimals = 2): string {
  const rounded = new Decimal(value ?? 0).toDecimalPlaces(decimals + 2, Decimal.ROUND_HALF_UP).toNumber();
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
}
