'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Search, Send, Loader2, CheckCircle, XCircle, AlertCircle, Mail } from 'lucide-react';
import { EmployeeListItem } from '../create-settlement/EmployeeListItem';
import { payrollSettlementsService } from '../../../services/payroll-settlements.service';
import type { PayrollSettlement, PayrollSettlementDetailSummary, SendPayslipsResult } from '../../../types';
import toast from 'react-hot-toast';

interface SendPayslipsModalProps {
  open: boolean;
  onClose: () => void;
  settlement: PayrollSettlement;
  employees: PayrollSettlementDetailSummary[];
}

export function SendPayslipsModal({ open, onClose, settlement, employees }: SendPayslipsModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(employees.map((e) => e.third_party_id)));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendPayslipsResult | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const term = search.toLowerCase();
    return employees.filter(
      (e) =>
        (e.employee_name ?? '').toLowerCase().includes(term) ||
        (e.employee_document ?? '').includes(term),
    );
  }, [employees, search]);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.third_party_id)));
    }
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    try {
      const data = await payrollSettlementsService.sendPayslips(settlement.id, Array.from(selectedIds));
      setResult(data);
      if (data.sent > 0) {
        toast.success(`${data.sent} desprendibles enviados`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al enviar desprendibles');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setSearch('');
    setSelectedIds(new Set(employees.map((e) => e.third_party_id)));
    onClose();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'no_email':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Enviado';
      case 'no_email':
        return 'Sin email';
      default:
        return 'Error';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-500" />
            Enviar Desprendibles de Pago
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Select all */}
            <div className="flex items-center gap-2 py-2 border-b">
              <Checkbox
                checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} seleccionados` : 'Seleccionar todos'}
              </span>
            </div>

            {/* Employee list */}
            <div className="max-h-[400px] overflow-y-auto space-y-1 p-1">
              {filteredEmployees.map((emp) => (
                <EmployeeListItem
                  key={emp.third_party_id}
                  employee={{
                    id: emp.third_party_id,
                    name: emp.employee_name,
                    identification_number: emp.employee_document,
                    employee_position: emp.employee_position,
                  }}
                  selected={selectedIds.has(emp.third_party_id)}
                  onToggle={(id) => toggleEmployee(id)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancelar
              </Button>
              <Button onClick={handleSend} disabled={sending || selectedIds.size === 0}>
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Enviar ({selectedIds.size})
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-green-100 text-green-800">
                {result.sent} enviados
              </Badge>
              {result.failed > 0 && (
                <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                  {result.failed} fallidos
                </Badge>
              )}
              <Badge variant="outline">{result.total} total</Badge>
            </div>

            {/* Results list */}
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {result.results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  {statusIcon(r.status)}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{r.employee_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{r.email ?? 'Sin email'}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {statusLabel(r.status)}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
