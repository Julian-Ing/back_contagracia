'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ShiftSwapRequest } from '../types';
import { SWAP_STATUS_LABELS, SWAP_STATUS_COLORS } from '../types';

interface Props {
  swaps: ShiftSwapRequest[];
  loading: boolean;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
}

export function ShiftSwapList({ swaps, loading, onApprove, onReject }: Props) {
  const { can } = usePermissions();
  const canApprove = can('shifts.swaps.approve');
  const canReject = can('shifts.swaps.reject');

  const fmtDate = (d?: string) => {
    if (!d) return '-';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: es }); } catch { return d; }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Solicitudes de Intercambio</h2>

      <div className="rounded-md border dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Solicitante</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Su Turno</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Objetivo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Turno Objetivo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Razón</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Cargando...</td></tr>
            ) : swaps.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No hay solicitudes de intercambio.</td></tr>
            ) : swaps.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3">{s.requester?.name || '-'}</td>
                <td className="px-4 py-3">
                  {s.requester_assignment?.shift_template?.name || '-'}
                  <span className="text-xs text-muted-foreground ml-1">({fmtDate(s.requester_assignment?.date)})</span>
                </td>
                <td className="px-4 py-3">{s.target?.name || '-'}</td>
                <td className="px-4 py-3">
                  {s.target_assignment?.shift_template?.name || '-'}
                  <span className="text-xs text-muted-foreground ml-1">({fmtDate(s.target_assignment?.date)})</span>
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate">{s.reason || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${SWAP_STATUS_COLORS[s.status]}`}>{SWAP_STATUS_LABELS[s.status]}</span>
                </td>
                <td className="px-4 py-3">
                  {s.status === 'PENDING' && (
                    <div className="flex gap-1">
                      {canApprove && (
                        <Button variant="ghost" size="sm" onClick={() => { if (confirm('¿Aprobar este intercambio?')) onApprove(s.id); }}>
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {canReject && (
                        <Button variant="ghost" size="sm" onClick={() => { const r = prompt('Razón del rechazo:'); onReject(s.id, r || undefined); }}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
