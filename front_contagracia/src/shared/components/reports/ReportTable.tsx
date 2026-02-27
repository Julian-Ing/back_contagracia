import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface ReportColumn<T = any> {
  /** Clave del campo en el objeto fila */
  key: string;
  /** Texto del encabezado */
  label: string;
  /** Alineación de la celda */
  align?: 'left' | 'center' | 'right';
  /** Render personalizado. Si no se define, muestra row[key] ?? '-' */
  render?: (value: any, row: T) => React.ReactNode;
  /** Clases extra para th y td de esta columna */
  className?: string;
}

interface ReportTableProps<T = any> {
  columns: ReportColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  className?: string;
}

/**
 * Tabla genérica para reportes. Define las columnas con ReportColumn[]
 * y pasa el array de filas — el componente se encarga del render.
 *
 * Uso:
 *   const COLUMNS: ReportColumn<Movement>[] = [
 *     { key: 'date',        label: 'Fecha',       align: 'left' },
 *     { key: 'voucher',     label: 'Comprobante',  align: 'left' },
 *     { key: 'description', label: 'Descripción',  align: 'left' },
 *     { key: 'third_party', label: 'Tercero',      align: 'left' },
 *     { key: 'debit',       label: 'Débito',       align: 'right',
 *       render: (v) => formatNumberCO(v, 2) },
 *     { key: 'credit',      label: 'Crédito',      align: 'right',
 *       render: (v) => formatNumberCO(v, 2) },
 *     { key: 'balance',     label: 'Saldo',        align: 'right',
 *       render: (v) => formatNumberCO(v, 2) },
 *   ];
 *
 *   <ReportTable columns={COLUMNS} rows={movements} />
 */
export function ReportTable<T extends Record<string, any>>({
  columns,
  rows,
  emptyMessage = 'Sin movimientos',
  className,
}: ReportTableProps<T>) {
  return (
    <table className={cn('w-full text-sm border-collapse', className)}>
      <thead>
        <tr className="border-b border-gray-300 dark:border-gray-600">
          {columns.map((col) => (
            <th
              key={col.key}
              className={cn(
                'py-1.5 px-2 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide',
                col.align === 'right' && 'text-right',
                col.align === 'center' && 'text-center',
                (!col.align || col.align === 'left') && 'text-left',
                col.className,
              )}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="py-4 text-center text-xs text-gray-400 dark:text-gray-500"
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 print:hover:bg-transparent"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'py-1 px-2 text-gray-800 dark:text-gray-300 print:text-black',
                    col.align === 'right' && 'text-right tabular-nums',
                    col.align === 'center' && 'text-center',
                    (!col.align || col.align === 'left') && 'text-left',
                    col.className,
                  )}
                >
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
