'use client';

import { useRef, useCallback, useMemo } from 'react';
import Decimal from 'decimal.js';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { TaxSelect } from '@/shared/components/ui/tax-select';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { useCostCenterTree, CostCenterCascadeSelect } from '@/modules/cost-centers';
import { Trash2 } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────── */

export interface WithholdingLine {
  id: string;
  withholding_id: string;
  name: string;
  rate: number;
  tax_type_id: number; // 5=ReteIVA, 6=ReteFuente, 7=ReteICA
  cost_center_id: string;
  cost_center_label: string;
  cost_center_path: string[];
}

export interface DocumentWithholdingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: WithholdingLine[];
  onLinesChange: (lines: WithholdingLine[]) => void;
  subtotal: number;
  totalIVA: number;
}

/* ── Component ─────────────────────────────────────────── */

export function DocumentWithholdingsModal({
  open,
  onOpenChange,
  lines,
  onLinesChange,
  subtotal,
  totalIVA,
}: DocumentWithholdingsModalProps) {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const { hasModule } = useCompanyModules();
  const hasCCModule = hasModule('cost_centers');
  const { ccTree, ccFlatMap } = useCostCenterTree(hasCCModule);

  /* ── Computed amounts ──────────────────── */

  const lineAmounts = useMemo(() => {
    const sub = new Decimal(subtotal);
    const iva = new Decimal(totalIVA);
    return lines.map((wh) => {
      const base = wh.tax_type_id === 5 ? iva : sub;
      const amount = base.times(wh.rate).div(100);
      return { id: wh.id, base, amount };
    });
  }, [lines, subtotal, totalIVA]);

  const totalWithholdings = useMemo(() => {
    return lineAmounts.reduce((acc, l) => acc.plus(l.amount), new Decimal(0));
  }, [lineAmounts]);

  const getBase = (lineId: string): number => {
    return lineAmounts.find(l => l.id === lineId)?.base.toNumber() ?? 0;
  };

  const getAmount = (lineId: string): number => {
    return lineAmounts.find(l => l.id === lineId)?.amount.toNumber() ?? 0;
  };

  /* ── Line operations ──────────────────── */

  const addWithholding = useCallback((id: string, _label: string, data: { name: string; rate: number; taxTypeId: number }) => {
    if (!id) return;
    if (lines.some(w => w.withholding_id === id)) return;

    onLinesChange([...lines, {
      id: crypto.randomUUID(),
      withholding_id: id,
      name: data.name,
      rate: data.rate,
      tax_type_id: data.taxTypeId,
      cost_center_id: '',
      cost_center_label: '',
      cost_center_path: [],
    }]);
  }, [lines, onLinesChange]);

  const removeLine = useCallback((lineId: string) => {
    onLinesChange(lines.filter(w => w.id !== lineId));
  }, [lines, onLinesChange]);

  const updateCC = useCallback((lineId: string, ccId: string, ccLabel: string, ccPath: string[]) => {
    onLinesChange(lines.map(w =>
      w.id === lineId
        ? { ...w, cost_center_id: ccId, cost_center_label: ccLabel, cost_center_path: ccPath }
        : w
    ));
  }, [lines, onLinesChange]);

  /* ── Render ──────────────────────────── */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className={`${hasCCModule ? 'max-w-5xl' : 'max-w-3xl'} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>Retenciones del Documento</DialogTitle>
        </DialogHeader>

        {/* Add withholding */}
        <div className="w-72">
          <TaxSelect
            isTax={false}
            onChange={addWithholding}
            placeholder="Agregar retención..."
            clearable={false}
          />
        </div>

        {/* Lines table */}
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay retenciones. Agregue al menos una.
          </p>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Retención</th>
                  <th className="px-3 py-2 text-right font-medium w-[80px]">Tasa</th>
                  <th className="px-3 py-2 text-right font-medium w-[140px]">Base</th>
                  <th className="px-3 py-2 text-right font-medium w-[140px]">Monto</th>
                  {hasCCModule && (
                    <th className="px-3 py-2 text-left font-medium w-[220px]">Centro de Costos</th>
                  )}
                  <th className="px-3 py-2 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((wh) => (
                  <tr key={wh.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 text-sm">{wh.name}</td>
                    <td className="px-3 py-2 text-right text-sm">{wh.rate}%</td>
                    <td className="px-3 py-2 text-right text-sm text-muted-foreground">
                      <FormattedNumber value={getBase(wh.id)} type="currency" />
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium">
                      <FormattedNumber value={getAmount(wh.id)} type="currency" />
                    </td>
                    {hasCCModule && (
                      <td className="px-3 py-2">
                        <CostCenterCascadeSelect
                          ccTree={ccTree}
                          ccFlatMap={ccFlatMap}
                          value={wh.cost_center_id}
                          path={wh.cost_center_path}
                          onChange={(id, label, path) => updateCC(wh.id, id, label, path)}
                          size="sm"
                          itemWidth="fixed"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 text-center">
                      <span
                        role="button"
                        tabIndex={0}
                        title="Eliminar retención"
                        className="inline-flex items-center justify-center cursor-pointer text-red-500 hover:text-red-700"
                        onClick={() => removeLine(wh.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') removeLine(wh.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer total */}
        {lines.length > 0 && (
          <div className="flex items-center justify-end pt-2 border-t text-sm">
            <span className="text-muted-foreground">
              Total retenciones: <span className="font-medium text-red-600"><FormattedNumber value={totalWithholdings.toNumber()} type="currency" /></span>
            </span>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
