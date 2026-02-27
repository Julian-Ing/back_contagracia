import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from './styles';
import type { Style } from '@react-pdf/types';

export interface PdfColumn<T = any> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  /** Ancho de la columna: número (flex) o string ('80pt') */
  width?: number | string;
  render?: (value: any, row: T) => string;
}

interface PdfTableProps<T = any> {
  columns: PdfColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}

/**
 * Tabla genérica para documentos PDF.
 *
 * Uso:
 *   const COLS: PdfColumn<Movement>[] = [
 *     { key: 'date',    label: 'Fecha',       width: 55 },
 *     { key: 'voucher', label: 'Comprobante',  width: 55 },
 *     { key: 'desc',    label: 'Descripción',  width: 1  },  // flex: 1
 *     { key: 'third',   label: 'Tercero',      width: 70 },
 *     { key: 'debit',   label: 'Débito',       width: 60, align: 'right',
 *       render: (v) => formatNumberCO(v, 2) },
 *     ...
 *   ];
 *   <PdfTable columns={COLS} rows={movements} />
 */
export function PdfTable<T extends Record<string, any>>({
  columns,
  rows,
  emptyMessage = 'Sin movimientos',
}: PdfTableProps<T>) {
  return (
    <View>
      {/* Encabezado */}
      <View style={pdfStyles.tableHeader}>
        {columns.map((col) => {
          const cellStyle: Style = {
            ...pdfStyles.tableHeaderCell,
            textAlign: col.align ?? 'left',
            ...(typeof col.width === 'number' && col.width <= 3
              ? { flex: col.width }
              : col.width
              ? { width: col.width }
              : { flex: 1 }),
          };
          return (
            <Text key={col.key} style={cellStyle}>
              {col.label}
            </Text>
          );
        })}
      </View>

      {/* Filas */}
      {rows.length === 0 ? (
        <View style={pdfStyles.tableRow}>
          <Text style={{ ...pdfStyles.tableCell, flex: 1, textAlign: 'center', color: '#9CA3AF' }}>
            {emptyMessage}
          </Text>
        </View>
      ) : (
        rows.map((row, i) => (
          <View key={i} style={pdfStyles.tableRow}>
            {columns.map((col) => {
              const cellStyle: Style = {
                ...pdfStyles.tableCell,
                textAlign: col.align ?? 'left',
                ...(typeof col.width === 'number' && col.width <= 3
                  ? { flex: col.width }
                  : col.width
                  ? { width: col.width }
                  : { flex: 1 }),
              };
              const value = col.render
                ? col.render(row[col.key], row)
                : String(row[col.key] ?? '-');
              return (
                <Text key={col.key} style={cellStyle}>
                  {value}
                </Text>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}
