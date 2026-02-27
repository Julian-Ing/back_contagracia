'use client';

import { useState } from 'react';
import { FileText, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Select } from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { usePortalPayslips } from '../../hooks/useEmployeePortal';
import { PortalPayslipDetail } from './PortalPayslipDetail';
import { SETTLEMENT_STATUS_COLORS, SETTLEMENT_STATUS_LABELS, SETTLEMENT_TYPE_LABELS } from '../../types';
import type { PortalPayslipSummary } from '../../services/portal.service';

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return { value: String(y), label: String(y) };
});

const MONTH_OPTIONS = [
  { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' }, { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

export function PortalPayslipsTab() {
  const { data, total, loading, error, setYearFilter, setMonthFilter } = usePortalPayslips();
  const [selectedDetail, setSelectedDetail] = useState<PortalPayslipSummary | null>(null);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-32">
          <Label className="text-xs mb-1 block">Año</Label>
          <Select
            options={[{ value: '', label: 'Todos' }, ...YEAR_OPTIONS]}
            placeholder="Todos"
            onChange={(v) => setYearFilter(v ? Number(v) : undefined)}
          />
        </div>
        <div className="w-40">
          <Label className="text-xs mb-1 block">Mes</Label>
          <Select
            options={[{ value: '', label: 'Todos' }, ...MONTH_OPTIONS]}
            placeholder="Todos"
            onChange={(v) => setMonthFilter(v ? Number(v) : undefined)}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 text-red-800 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          Cargando desprendibles...
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm">No tienes desprendibles de pago disponibles</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Liquidación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Devengado</TableHead>
                <TableHead className="text-right">Deducciones</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm max-w-[180px] truncate">
                    {item.settlement.settlement_name}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {SETTLEMENT_TYPE_LABELS?.[item.settlement.settlement_type as keyof typeof SETTLEMENT_TYPE_LABELS] ?? item.settlement.settlement_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {item.settlement.month}/{item.settlement.year}
                  </TableCell>
                  <TableCell className="text-right">
                    <FormattedNumber value={item.total_accrued} type="currency" />
                  </TableCell>
                  <TableCell className="text-right text-red-600 dark:text-red-400">
                    <FormattedNumber value={item.total_deductions} type="currency" />
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <FormattedNumber value={item.net_salary} type="currency" />
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SETTLEMENT_STATUS_COLORS[item.settlement.status as keyof typeof SETTLEMENT_STATUS_COLORS] ?? ''}`}>
                      {SETTLEMENT_STATUS_LABELS[item.settlement.status as keyof typeof SETTLEMENT_STATUS_LABELS] ?? item.settlement.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDetail(item)}
                      className="h-7 px-2"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > 0 && (
        <p className="text-xs text-muted-foreground text-right">{total} desprendible{total !== 1 ? 's' : ''} en total</p>
      )}

      {/* Detail modal */}
      {selectedDetail && (
        <PortalPayslipDetail
          detailId={selectedDetail.id}
          open={!!selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
}
