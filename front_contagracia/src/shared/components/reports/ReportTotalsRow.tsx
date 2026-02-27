import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { formatNumberCO } from '@/shared/utils/formatNumber';

interface ReportTotalsRowProps {
  /** Etiqueta izquierda (default según isGrand) */
  label?: string;
  /** Columna Débito */
  debit?: number;
  /** Columna Crédito */
  credit?: number;
  /** Columna Saldo */
  balance?: number;
  /** Decimales para el formateo (default: 2) */
  decimals?: number;
  /**
   * Si true, aplica estilos más prominentes (totales generales).
   * Si false (default), son totales de sección.
   */
  isGrand?: boolean;
  className?: string;
}

/**
 * Fila de totales para reportes contables.
 *
 * Se usa dos veces en el Libro Mayor:
 *  1. Al final de cada cuenta (Total 11050501:)
 *  2. Al final del reporte (TOTALES GENERALES:)
 *
 * Uso:
 *   // Totales de sección
 *   <ReportTotalsRow
 *     label="Total 11050501:"
 *     debit={140236.56}
 *     credit={0}
 *     balance={140236.56}
 *   />
 *
 *   // Totales generales
 *   <ReportTotalsRow
 *     debit={198395.02}
 *     credit={198395.02}
 *     balance={378790.04}
 *     isGrand
 *   />
 */
export function ReportTotalsRow({
  label,
  debit,
  credit,
  balance,
  decimals = 2,
  isGrand = false,
  className,
}: ReportTotalsRowProps) {
  const defaultLabel = isGrand ? 'TOTALES GENERALES:' : 'Total:';

  return (
    <div
      className={cn(
        'flex items-center justify-between px-2 py-1.5',
        isGrand
          ? 'border-t-2 border-gray-400 dark:border-gray-500 mt-2 bg-gray-50 dark:bg-gray-800/50 print:bg-gray-50'
          : 'border-t border-gray-200 dark:border-gray-700',
        className,
      )}
    >
      <span
        className={cn(
          'font-semibold text-gray-700 dark:text-gray-300 print:text-black',
          isGrand ? 'text-xs uppercase tracking-wide text-gray-900 dark:text-white' : 'text-sm',
        )}
      >
        {label ?? defaultLabel}
      </span>

      <div className="flex gap-2 tabular-nums">
        {debit !== undefined && (
          <span
            className={cn(
              'w-32 text-right font-semibold text-gray-800 dark:text-gray-200 print:text-black',
              isGrand ? 'text-sm' : 'text-sm',
            )}
          >
            {formatNumberCO(debit, decimals)}
          </span>
        )}
        {credit !== undefined && (
          <span
            className={cn(
              'w-32 text-right font-semibold text-gray-800 dark:text-gray-200 print:text-black',
              isGrand ? 'text-sm' : 'text-sm',
            )}
          >
            {formatNumberCO(credit, decimals)}
          </span>
        )}
        {balance !== undefined && (
          <span
            className={cn(
              'w-32 text-right font-semibold print:text-black',
              balance < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-800 dark:text-gray-200',
              isGrand ? 'text-sm' : 'text-sm',
            )}
          >
            {formatNumberCO(balance, decimals)}
          </span>
        )}
      </div>
    </div>
  );
}
