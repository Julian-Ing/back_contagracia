import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { formatNumberCO } from '@/shared/utils/formatNumber';

interface ReportSectionHeaderProps {
  /**
   * Título de la sección, normalmente "código - nombre"
   * (ej: "11050501 - Caja general")
   */
  title: string;
  /**
   * Saldo inicial de la cuenta al inicio del período.
   * Si no se pasa, no se muestra.
   */
  initialBalance?: number;
  /** Decimales para formatear el saldo inicial (default: 2) */
  decimals?: number;
  className?: string;
}

/**
 * Encabezado de sección para reportes con estructura por cuentas.
 *
 * Muestra el código + nombre de la cuenta en un bloque con fondo gris
 * y, opcionalmente, el saldo inicial alineado a la derecha.
 *
 * Uso:
 *   <ReportSectionHeader
 *     title="11050501 - Caja general"
 *     initialBalance={0}
 *   />
 */
export function ReportSectionHeader({
  title,
  initialBalance,
  decimals = 2,
  className,
}: ReportSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between mt-5 px-3 py-1.5',
        'bg-gray-100 dark:bg-gray-800 print:bg-gray-100',
        className,
      )}
    >
      <span className="text-sm font-semibold text-gray-900 dark:text-white print:text-black">
        {title}
      </span>

      {initialBalance !== undefined && (
        <span className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600 tabular-nums">
          Saldo Inicial:&nbsp;
          <span className="font-semibold">
            {formatNumberCO(initialBalance, decimals)}
          </span>
        </span>
      )}
    </div>
  );
}
