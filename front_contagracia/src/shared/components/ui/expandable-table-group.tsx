'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { TableRow, TableCell } from './table';

export interface ExpandableTableGroupProps<T> {
  /** Items del grupo */
  items: T[];
  /** Key única del grupo */
  groupKey: string;
  /** ¿Está expandido? */
  isExpanded: boolean;
  /** Toggle expand/collapse */
  onToggle: () => void;
  /** Renderiza las celdas de la fila padre (sin <TableRow>) */
  renderParentCells: (items: T[]) => React.ReactNode;
  /** Renderiza una fila hijo completa (<TableRow> con <TableCell>s) */
  renderChildRow: (item: T, index: number) => React.ReactNode;
  /** Total de columnas de la tabla (para colSpan en empty) */
  colCount: number;
  /** Clase CSS para la fila padre */
  parentClassName?: string;
  /** Clase CSS para las filas hijo */
  childClassName?: string;
}

export function ExpandableTableGroup<T>({
  items,
  groupKey,
  isExpanded,
  onToggle,
  renderParentCells,
  renderChildRow,
  colCount,
  parentClassName,
  childClassName,
}: ExpandableTableGroupProps<T>) {
  const isMulti = items.length > 1;

  return (
    <React.Fragment key={groupKey}>
      {/* Fila padre */}
      <TableRow
        className={cn(
          'border-gray-200 dark:border-slate-700',
          isMulti && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40',
          !isMulti && 'hover:bg-gray-50 dark:hover:bg-slate-700/40',
          parentClassName,
        )}
        onClick={isMulti ? onToggle : undefined}
      >
        {/* Columna chevron */}
        <TableCell className="w-8 px-2">
          {isMulti && (
            <ChevronRight
              className={cn(
                'h-4 w-4 text-gray-400 dark:text-slate-500 transition-transform duration-200',
                isExpanded && 'rotate-90',
              )}
            />
          )}
        </TableCell>
        {renderParentCells(items)}
      </TableRow>

      {/* Filas hijo (solo si multi y expandido) */}
      {isMulti &&
        isExpanded &&
        items.map((item, index) => (
          <TableRow
            key={`${groupKey}-child-${index}`}
            className={cn(
              'border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/30',
              childClassName,
            )}
          >
            {renderChildRow(item, index)}
          </TableRow>
        ))}
    </React.Fragment>
  );
}
