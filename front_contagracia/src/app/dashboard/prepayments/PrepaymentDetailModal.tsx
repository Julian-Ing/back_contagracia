'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Loader2, AlertCircle, FileText, Search, ChevronLeft, ChevronRight, Ban, RotateCcw,
} from 'lucide-react';
import { VoidPrepaymentModal } from './VoidPrepaymentModal';
import { RefundPrepaymentModal } from './RefundPrepaymentModal';
import { useCompanyModules } from '@/shared/hooks/useCompanyModules';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { prepaymentsService } from '@/modules/ar-ap';
import type {
  PrepaymentDetailData, PrepaymentType, PrepaymentStatus,
  PrepaymentMovementItem, PrepaymentMovementsResponse,
} from '@/modules/ar-ap';
import { JournalEntryDetail } from '@/modules/accounting/components/JournalEntryDetail';

const TYPE_LABELS: Record<PrepaymentType, string> = {
  CLIENT: 'Cliente',
  SUPPLIER: 'Proveedor',
  EMPLOYEE: 'Empleado',
};

const TYPE_COLORS: Record<PrepaymentType, string> = {
  CLIENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SUPPLIER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  EMPLOYEE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const STATUS_LABELS: Record<PrepaymentStatus, string> = {
  ACTIVE: 'Activo',
  APPLIED: 'Aplicado',
  REFUNDED: 'Devuelto',
  VOIDED: 'Anulado',
};

const STATUS_COLORS: Record<PrepaymentStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  APPLIED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  REFUNDED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  VOIDED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const VOIDED_OPTIONS = [
  { value: 'false', label: 'Activo' },
  { value: 'true', label: 'Anulado' },
];

const formatDate = (date: string) => {
  const [y, m, d] = date.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

interface PrepaymentDetailModalProps {
  prepaymentId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PrepaymentDetailModal({ prepaymentId, open, onClose, onSuccess }: PrepaymentDetailModalProps) {
  const { hasModule } = useCompanyModules();
  const { can } = usePermissions();
  const hasAccounting = hasModule('accounting');
  const canViewMovements = can('prepayments.view');
  const canVoid = can('prepayments.void');
  const canRefund = can('prepayments.refund');
  const canViewJournal = hasAccounting && can('journal_entries.view_detail');

  // Prepayment detail
  const [data, setData] = useState<PrepaymentDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Movements state
  const [movements, setMovements] = useState<PrepaymentMovementItem[]>([]);
  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const [movLoading, setMovLoading] = useState(false);
  const [movTotal, setMovTotal] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);
  const [movSearch, setMovSearch] = useState('');
  const [movSourceKey, setMovSourceKey] = useState('');
  const [movIsVoided, setMovIsVoided] = useState('');
  const [movFromDate, setMovFromDate] = useState('');
  const [movToDate, setMovToDate] = useState('');

  // Load prepayment detail
  useEffect(() => {
    if (!prepaymentId || !open) {
      setData(null);
      setError(null);
      resetMovementFilters();
      return;
    }

    setLoading(true);
    setError(null);

    prepaymentsService.getById(prepaymentId)
      .then(setData)
      .catch((err: any) => setError(err.response?.data?.message || 'Error al cargar el anticipo'))
      .finally(() => setLoading(false));
  }, [prepaymentId, open]);

  const refreshDetail = () => {
    if (!prepaymentId) return;
    prepaymentsService.getById(prepaymentId).then(setData).catch(() => {});
    fetchMovements();
    onSuccess?.();
  };

  const resetMovementFilters = () => {
    setMovements([]);
    setMovSearch('');
    setMovSourceKey('');
    setMovIsVoided('');
    setMovFromDate('');
    setMovToDate('');
    setMovPage(1);
    setMovTotal(0);
    setMovTotalPages(1);
  };

  // Load movements
  const fetchMovements = useCallback(async () => {
    if (!prepaymentId || !open || !canViewMovements) return;

    setMovLoading(true);
    try {
      const res = await prepaymentsService.getMovements(prepaymentId, {
        search: movSearch || undefined,
        source_key: movSourceKey || undefined,
        is_voided: movIsVoided || undefined,
        from_date: movFromDate || undefined,
        to_date: movToDate || undefined,
        page: movPage,
        limit: 10,
      });
      setMovements(res.data);
      if (res.sources) {
        setSourceOptions(res.sources.map((s) => ({ value: s.key, label: s.description })));
      }
      setMovTotal(res.total);
      setMovTotalPages(res.totalPages);
    } catch {
      setMovements([]);
    } finally {
      setMovLoading(false);
    }
  }, [prepaymentId, open, canViewMovements, movSearch, movSourceKey, movIsVoided, movFromDate, movToDate, movPage]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Reset page on filter change
  useEffect(() => {
    setMovPage(1);
  }, [movSearch, movSourceKey, movIsVoided, movFromDate, movToDate]);

  const usedAmount = data ? data.original_amount - data.balance : 0;
  const usedPercent = data && data.original_amount > 0 ? (usedAmount / data.original_amount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[950px] max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : error ? (
          <>
            <DialogHeader>
              <DialogTitle>Anticipo</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 text-red-500 py-4">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </>
        ) : data ? (
          <>
            {/* Header */}
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-xl">{data.consecutive || 'Anticipo'}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {TYPE_LABELS[data.prepayment_type]} — {data.third_party.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_COLORS[data.prepayment_type]}`}>
                    {TYPE_LABELS[data.prepayment_type]}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[data.status]}`}>
                    {STATUS_LABELS[data.status]}
                  </span>
                  {canRefund && data.status === 'ACTIVE' && (
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowRefundModal(true)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Devolver
                    </Button>
                  )}
                  {canVoid && data.status === 'ACTIVE' && (
                    <Button variant="destructive" size="sm" onClick={() => setShowVoidModal(true)}>
                      <Ban className="h-3.5 w-3.5 mr-1.5" />
                      Anular
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Info section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Amount + progress */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">Monto original</p>
                  <FormattedNumber value={data.original_amount} type="currency" className="text-2xl font-bold tabular-nums" />
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Saldo disponible</span>
                      <FormattedNumber value={data.balance} type="currency" className="font-medium tabular-nums" />
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <FormattedNumber value={usedAmount} type="currency" /> aplicado (<FormattedNumber value={usedPercent / 100} type="percent" />)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Details */}
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha</span>
                    <span>{formatDate(data.prepayment_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tercero</span>
                    <span className="text-right">
                      <span className="font-mono text-xs text-muted-foreground">{data.third_party.identification_number}</span>
                      {' '}{data.third_party.name}
                    </span>
                  </div>
                  {hasAccounting && data.account && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cuenta anticipo</span>
                      <span className="text-right">
                        <span className="font-mono text-xs">{data.account.code}</span> {data.account.name}
                      </span>
                    </div>
                  )}
                  {hasAccounting && data.counterpart_account && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contrapartida</span>
                      <span className="text-right">
                        <span className="font-mono text-xs">{data.counterpart_account.code}</span> {data.counterpart_account.name}
                      </span>
                    </div>
                  )}
                  {data.bank_account && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Banco</span>
                      <span>{data.bank_account.account_name}</span>
                    </div>
                  )}
                  {data.company_payment_method && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Metodo de pago</span>
                      <span>{data.company_payment_method.name}</span>
                    </div>
                  )}
                  {data.notes && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Notas</span>
                      <span className="text-right">{data.notes}</span>
                    </div>
                  )}
                  {canViewJournal && data.journal_entry_id && (
                    <div className="pt-2 border-t">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowJournalModal(true)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ver asiento contable
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Voided info */}
            {data.status === 'VOIDED' && data.voided_at && (
              <Card className="mt-4 border-red-200 dark:border-red-900/50">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Anticipo anulado</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha de anulacion</span>
                      <span>{formatDate(data.voided_at)}</span>
                    </div>
                    {data.voided_reason && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Razon</span>
                        <span className="text-right max-w-[60%]">{data.voided_reason}</span>
                      </div>
                    )}
                    {data.voided_by && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Anulado por</span>
                        <span className="font-mono text-xs">{data.voided_by}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refunded info */}
            {data.status === 'REFUNDED' && data.refunded_at && (
              <Card className="mt-4 border-amber-200 dark:border-amber-900/50">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">Anticipo devuelto</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha de devolución</span>
                      <span>{formatDate(data.refunded_at)}</span>
                    </div>
                    {data.refunded_reason && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Razón</span>
                        <span className="text-right max-w-[60%]">{data.refunded_reason}</span>
                      </div>
                    )}
                    {data.refunded_by && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Devuelto por</span>
                        <span className="font-mono text-xs">{data.refunded_by}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Movements */}
            {canViewMovements && (
              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-base font-semibold">Movimientos</h3>
                  <span className="text-sm text-muted-foreground">({movTotal})</span>
                </div>

                {/* Filters */}
                <div className="mb-3 flex flex-wrap items-end gap-2">
                  <div className="w-56">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar consecutivo, notas..."
                        value={movSearch}
                        onChange={(e) => setMovSearch(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="w-44">
                    <SearchableSelect
                      options={sourceOptions}
                      value={movSourceKey}
                      onChange={(v) => setMovSourceKey(v)}
                      placeholder="Tipo documento"
                      clearable
                    />
                  </div>
                  <div className="w-28">
                    <SearchableSelect
                      options={VOIDED_OPTIONS}
                      value={movIsVoided}
                      onChange={(v) => setMovIsVoided(v)}
                      placeholder="Estado"
                      clearable
                    />
                  </div>
                  <div className="w-32">
                    <DatePicker
                      value={movFromDate}
                      onChange={(v) => setMovFromDate(v)}
                      placeholder="Desde"
                      clearable
                    />
                  </div>
                  <div className="w-32">
                    <DatePicker
                      value={movToDate}
                      onChange={(v) => setMovToDate(v)}
                      placeholder="Hasta"
                      clearable
                    />
                  </div>
                </div>

                {/* Table */}
                <Card>
                  <CardContent className="p-0">
                    {movLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : movements.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No hay movimientos registrados
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Consecutivo</TableHead>
                            <TableHead className="w-[100px]">Fecha</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead>Aplicado a</TableHead>
                            <TableHead>Notas</TableHead>
                            <TableHead className="w-[80px]">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movements.map((mov) => (
                            <TableRow key={mov.id}>
                              <TableCell className="font-mono text-sm">
                                {mov.consecutive || '—'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(mov.application_date)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                <FormattedNumber value={mov.amount} type="currency" className="font-medium" />
                              </TableCell>
                              <TableCell className="text-sm">
                                {mov.applied_source ? (
                                  <>
                                    <span className="text-muted-foreground">{mov.applied_source.description}</span>
                                    {mov.applied_to_number && (
                                      <span className="ml-1 font-mono">{mov.applied_to_number}</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {mov.notes || '—'}
                              </TableCell>
                              <TableCell>
                                {mov.is_voided ? (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    Anulado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Activo
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Pagination */}
                {movTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground">
                      {movTotal} resultado(s) — Pagina {movPage} de {movTotalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={movPage <= 1}
                        onClick={() => setMovPage(movPage - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={movPage >= movTotalPages}
                        onClick={() => setMovPage(movPage + 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </DialogContent>

      {canViewJournal && data?.journal_entry_id && (
        <JournalEntryDetail
          entryId={data.journal_entry_id}
          mode="modal"
          open={showJournalModal}
          onClose={() => setShowJournalModal(false)}
        />
      )}

      {canVoid && data && (
        <VoidPrepaymentModal
          prepaymentId={data.id}
          consecutive={data.consecutive}
          open={showVoidModal}
          onClose={() => setShowVoidModal(false)}
          onSuccess={refreshDetail}
        />
      )}

      {canRefund && data && (
        <RefundPrepaymentModal
          prepaymentId={data.id}
          consecutive={data.consecutive}
          balance={data.balance}
          open={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onSuccess={refreshDetail}
        />
      )}
    </Dialog>
  );
}
