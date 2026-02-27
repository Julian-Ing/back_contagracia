'use client';

/**
 * CellSelector - Modal visual para seleccionar celda de destino en el grid
 * El usuario hace click en celda inicio y arrastra hasta celda fin
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

interface CellSelection {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

interface OccupiedCell {
  row: number;
  col: number;
}

interface CellSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: CellSelection) => void;
  rows: number;
  cols: number;
  componentLabel: string;
  occupiedCells?: OccupiedCell[];
}

export function CellSelector({ open, onClose, onSelect, rows, cols, componentLabel, occupiedCells = [] }: CellSelectorProps) {
  const [startCell, setStartCell] = useState<{ row: number; col: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getSelection = useCallback((): CellSelection | null => {
    if (!startCell || !hoverCell) return null;
    return {
      rowStart: Math.min(startCell.row, hoverCell.row),
      rowEnd: Math.max(startCell.row, hoverCell.row) + 1,
      colStart: Math.min(startCell.col, hoverCell.col),
      colEnd: Math.max(startCell.col, hoverCell.col) + 1,
    };
  }, [startCell, hoverCell]);

  const occupiedSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const c of occupiedCells) set.add(`${c.row},${c.col}`);
    return set;
  }, [occupiedCells]);

  const isOccupied = useCallback((row: number, col: number) => occupiedSet.has(`${row},${col}`), [occupiedSet]);

  const isInSelection = useCallback((row: number, col: number) => {
    const sel = getSelection();
    if (!sel) return false;
    return row >= sel.rowStart && row < sel.rowEnd && col >= sel.colStart && col < sel.colEnd;
  }, [getSelection]);

  const handleMouseDown = (row: number, col: number) => {
    if (isOccupied(row, col)) return;
    setStartCell({ row, col });
    setHoverCell({ row, col });
    setIsDragging(true);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && !isOccupied(row, col)) {
      setHoverCell({ row, col });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = () => {
    const sel = getSelection();
    if (sel) {
      onSelect(sel);
      reset();
    }
  };

  const reset = () => {
    setStartCell(null);
    setHoverCell(null);
    setIsDragging(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sel = getSelection();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar posición: {componentLabel}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Haz click y arrastra para seleccionar las celdas donde colocar el componente.
        </p>

        {/* Grid */}
        <div
          className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden select-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(${rows}, 48px)`,
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 1,
              backgroundColor: '#e5e7eb',
            }}
          >
            {Array.from({ length: rows }).map((_, r) =>
              Array.from({ length: cols }).map((_, c) => {
                const inSel = isInSelection(r, c);
                const occupied = isOccupied(r, c);
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`flex items-center justify-center text-[10px] transition-colors ${
                      occupied
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-400 cursor-not-allowed'
                        : inSel
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 cursor-crosshair'
                        : 'bg-white dark:bg-slate-800 text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-crosshair'
                    }`}
                    onMouseDown={() => handleMouseDown(r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                  >
                    {occupied ? '✕' : `${r + 1},${c + 1}`}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {sel && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Selección: fila {sel.rowStart + 1}-{sel.rowEnd}, columna {sel.colStart + 1}-{sel.colEnd}
            {' '}({sel.rowEnd - sel.rowStart} × {sel.colEnd - sel.colStart} celdas)
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!sel}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
