'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useDebounce } from '@/shared/hooks';
import { PaymentReceiptForm } from '@/modules/ar-ap/components/PaymentReceiptForm';
import { arApService } from '@/modules/ar-ap/services/arAp.service';
import { companyPaymentMethodsService } from '@/modules/ar-ap/services/companyPaymentMethods.service';
import type { ThirdPartyPaymentItem, ArApSourceItem, CompanyPaymentMethod } from '@/modules/ar-ap/types';
import {
  DollarSign, Clock, FileText, CreditCard, Download, Eye, Ban, Pencil, Search, FilterX, Loader2,
} from 'lucide-react';

/* ── types ────────────────────────────────────────────────── */
interface Transaction {
  id: string;
  type_label: string;
  number: string;
  date: string;
  due_date: string;
  amount: number;
  paid: number;
  balance: number;
  status: string;
  days_overdue: number;
  days_due: number;
  description?: string;
  tax_type?: string;
  /* Campos extra para precargar pago */
  consecutive?: string | null;
  source_number?: string | null;
  source_key?: string;
  account_code?: string | null;
  account_name?: string | null;
}

type OverdueFilter = 'all' | 'overdue' | 'current';

interface BalanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  thirdPartyId: string;
  thirdPartyName: string;
  thirdPartyDocument?: string | null;
  type: 'client' | 'supplier';
  onRefresh?: () => void;
  details?: {
    transactions?: Transaction[];
  };
  summary: {
    total_invoiced: number;
    total_paid: number;
    total_balance: number;
  };
  /* Search & pagination */
  tx_search?: string;
  onTxSearch?: (search: string) => void;
  tx_page?: number;
  tx_total_pages?: number;
  tx_total?: number;
  onTxPageChange?: (page: number) => void;
  loading?: boolean;
  /* Filters */
  statuses?: string[];
  onStatusesChange?: (statuses: string[]) => void;
  overdue?: OverdueFilter;
  onOverdueChange?: (overdue: OverdueFilter) => void;
}

/* ── helpers ──────────────────────────────────────────────── */
const formatDate = (d?: string) => {
  if (!d) return '-';
  const [y, m, day] = d.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const paymentMethodLabel = (name?: string | null) => name || 'Asiento Manual';

/* ── component ───────────────────────────────────────────── */
export default function BalanceDetailModal({
  isOpen,
  onClose,
  thirdPartyId,
  thirdPartyName,
  thirdPartyDocument,
  type,
  details,
  summary,
  tx_search = '',
  onTxSearch,
  tx_page = 1,
  tx_total_pages = 0,
  tx_total = 0,
  onTxPageChange,
  loading,
  statuses = [],
  onStatusesChange,
  overdue = 'all',
  onOverdueChange,
  onRefresh,
}: BalanceDetailModalProps) {
  const { can } = usePermissions();
  const isClient = type === 'client';
  const transactions = details?.transactions || [];

  // Permissions
  const canCreateReceipt = isClient ? can('cash_receipts.create') : can('payment_vouchers.create');
  const canVoidReceipt = isClient ? can('cash_receipts.void') : can('payment_vouchers.void');
  const canViewReceipt = isClient ? can('cash_receipts.view') : can('payment_vouchers.view');
  const canEditReceipt = isClient ? can('cash_receipts.edit') : can('payment_vouchers.edit');

  // Receipt form state
  const [viewReceiptId, setViewReceiptId] = useState<string | null>(null);
  const [reverseReceiptId, setReverseReceiptId] = useState<string | null>(null);
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);
  const [payDocTx, setPayDocTx] = useState<Transaction | null>(null);

  /* ── Payments tab state (fetched independently) ──────── */
  const [paymentsList, setPaymentsList] = useState<ThirdPartyPaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(0);
  const [paySearch, setPaySearch] = useState('');
  const [payDateFrom, setPayDateFrom] = useState('');
  const [payDateTo, setPayDateTo] = useState('');
  const [paySourceKey, setPaySourceKey] = useState('');
  const [payMethodId, setPayMethodId] = useState('');

  const debouncedPaySearch = useDebounce(paySearch, 400);

  // Reference data for filters
  const [sourceOptions, setSourceOptions] = useState<ArApSourceItem[]>([]);
  const [methodOptions, setMethodOptions] = useState<CompanyPaymentMethod[]>([]);
  const sourcesFetched = useRef(false);
  const methodsFetched = useRef(false);

  // Fetch sources and payment methods (once)
  useEffect(() => {
    if (!isOpen) return;
    if (!sourcesFetched.current) {
      arApService.getSources().then(setSourceOptions).catch(() => {});
      sourcesFetched.current = true;
    }
    if (!methodsFetched.current) {
      companyPaymentMethodsService.getAll({ limit: 100 }).then(res => setMethodOptions(res.data)).catch(() => {});
      methodsFetched.current = true;
    }
  }, [isOpen]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    if (!isOpen || !thirdPartyId) return;
    setPaymentsLoading(true);
    try {
      const res = await arApService.getThirdPartyPayments(thirdPartyId, {
        type: isClient ? 'RECEIVABLE' : 'PAYABLE',
        search: debouncedPaySearch || undefined,
        dateFrom: payDateFrom || undefined,
        dateTo: payDateTo || undefined,
        sourceKey: paySourceKey || undefined,
        paymentMethodId: payMethodId || undefined,
        page: paymentsPage,
        limit: 10,
      });
      setPaymentsList(res.data);
      setPaymentsTotal(res.total);
      setPaymentsTotalPages(res.totalPages);
    } catch {
      setPaymentsList([]);
      setPaymentsTotal(0);
      setPaymentsTotalPages(0);
    } finally {
      setPaymentsLoading(false);
    }
  }, [isOpen, thirdPartyId, isClient, debouncedPaySearch, payDateFrom, payDateTo, paySourceKey, payMethodId, paymentsPage]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // Reset payments filters when modal opens with different third party
  const prevThirdPartyId = useRef(thirdPartyId);
  useEffect(() => {
    if (thirdPartyId !== prevThirdPartyId.current) {
      prevThirdPartyId.current = thirdPartyId;
      setPaySearch('');
      setPayDateFrom('');
      setPayDateTo('');
      setPaySourceKey('');
      setPayMethodId('');
      setPaymentsPage(1);
    }
  }, [thirdPartyId]);

  // Reset page when filters change
  useEffect(() => { setPaymentsPage(1); }, [debouncedPaySearch, payDateFrom, payDateTo, paySourceKey, payMethodId]);

  const hasPayFilters = !!(paySearch || payDateFrom || payDateTo || paySourceKey || payMethodId);
  const clearPayFilters = () => {
    setPaySearch('');
    setPayDateFrom('');
    setPayDateTo('');
    setPaySourceKey('');
    setPayMethodId('');
    setPaymentsPage(1);
  };

  // Combined refresh: parent + payments
  const handleRefresh = useCallback(() => {
    onRefresh?.();
    fetchPayments();
  }, [onRefresh, fetchPayments]);

  /* Days badge */
  const getDaysBadge = (tx: Transaction) => {
    if (tx.balance <= 0) return null;
    if (!tx.due_date) return null;
    if (tx.days_overdue > 0) {
      return <span className="text-xs font-medium text-red-600">-{tx.days_overdue}d</span>;
    }
    if (tx.days_due > 0) {
      return <span className="text-xs font-medium text-green-600">{tx.days_due}d</span>;
    }
    return <span className="text-xs font-medium text-orange-600">Hoy</span>;
  };

  /* Status badge */
  const getStatusBadge = (tx: Transaction) => {
    if (tx.days_overdue > 0 && tx.balance > 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    }
    if (tx.balance === 0) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Pagada</Badge>;
    }
    if (tx.balance > 0) {
      return <Badge variant="secondary">Pendiente</Badge>;
    }
    return <Badge variant="outline">{tx.status || '-'}</Badge>;
  };

  /* Toggle status filter */
  const toggleStatus = (status: string) => {
    if (!onStatusesChange) return;
    const next = statuses.includes(status)
      ? statuses.filter(s => s !== status)
      : [...statuses, status];
    onStatusesChange(next);
  };

  /* Stats */
  const stats = useMemo(() => ({
    total_docs: tx_total || transactions.length,
    pending: transactions.filter((t) => t.balance > 0).length,
    overdue: transactions.filter((t) => t.days_overdue > 0 && t.balance > 0).length,
    paid: transactions.filter((t) => t.balance === 0).length,
  }), [transactions, tx_total]);

  /* SearchableSelect options */
  const sourceSelectOptions = useMemo(() =>
    sourceOptions.map(s => ({ value: s.key, label: s.description })),
    [sourceOptions],
  );
  const methodSelectOptions = useMemo(() =>
    methodOptions.map(m => ({ value: m.id, label: m.name })),
    [methodOptions],
  );

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Balance Detallado - Tercero
              </DialogTitle>
              <p className="text-muted-foreground mt-1">{thirdPartyName}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled title="Exportar Excel">
                <Download className="h-4 w-4 mr-1" />
                Excel
              </Button>
              <Button variant="outline" size="sm" disabled title="Exportar PDF">
                <FileText className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total {isClient ? 'CxC' : 'CxP'}
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <FormattedNumber value={summary.total_invoiced} type="currency" className="text-xl font-bold" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total_docs} documento(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pagado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <FormattedNumber value={summary.total_paid} type="currency" className="text-xl font-bold text-green-600" />
              <p className="text-xs text-muted-foreground mt-1">
                {paymentsTotal} pago(s) registrado(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Pendiente
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <FormattedNumber value={summary.total_balance} type="currency" className="text-xl font-bold text-orange-500" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pending} pendiente(s){stats.overdue > 0 && <span className="text-red-500 font-medium"> · {stats.overdue} vencido(s)</span>}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
              {stats.pending > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{stats.pending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagos
              <Badge variant="secondary" className="ml-1 text-xs">{paymentsTotal}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-4 space-y-3">
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {onTxSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, descripción..."
                    value={tx_search}
                    onChange={(e) => onTxSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              )}

              {/* Status filters */}
              {onStatusesChange && (
                <div className="flex gap-1.5 items-center">
                  {(['PENDING', 'PARTIAL', 'PAID'] as const).map(s => {
                    const active = statuses.includes(s);
                    const label = { PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado' }[s];
                    return (
                      <Button
                        key={s}
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        className="h-8 text-xs"
                        onClick={() => toggleStatus(s)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Overdue filter */}
              {onOverdueChange && (
                <div className="flex gap-1.5 items-center">
                  {([
                    { key: 'all' as const, label: 'Todos' },
                    { key: 'overdue' as const, label: 'Vencidos' },
                    { key: 'current' as const, label: 'Al día' },
                  ]).map(f => (
                    <Button
                      key={f.key}
                      size="sm"
                      variant={overdue === f.key ? 'default' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() => onOverdueChange(f.key)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    {canCreateReceipt && <TableHead className="text-center w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {tx_search ? 'Sin resultados para la búsqueda' : 'No hay documentos registrados'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{tx.type_label || 'Documento'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-sm">{tx.number}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground" title={tx.description}>
                          {tx.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                        <TableCell className="text-sm">{formatDate(tx.due_date)}</TableCell>
                        <TableCell className="text-center">{getDaysBadge(tx)}</TableCell>
                        <TableCell className="text-right text-sm"><FormattedNumber value={tx.amount} type="currency" /></TableCell>
                        <TableCell className="text-right text-sm"><FormattedNumber value={tx.paid} type="currency" className="text-green-600" /></TableCell>
                        <TableCell className="text-right text-sm">
                          {tx.balance > 0 ? (
                            <FormattedNumber value={tx.balance} type="currency" className="text-orange-600 font-medium" />
                          ) : (
                            <FormattedNumber value={0} type="currency" className="text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(tx)}</TableCell>
                        {canCreateReceipt && (
                          <TableCell className="text-center">
                            {tx.balance > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPayDocTx(tx)}
                                title={isClient ? 'Cobrar' : 'Pagar'}
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                  {/* Totals row */}
                  {transactions.length > 0 && (
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={6} className="text-right font-bold">TOTALES</TableCell>
                      <TableCell className="text-right">
                        <FormattedNumber value={transactions.reduce((s, t) => s + t.amount, 0)} type="currency" className="font-bold" />
                      </TableCell>
                      <TableCell className="text-right">
                        <FormattedNumber value={transactions.reduce((s, t) => s + t.paid, 0)} type="currency" className="font-bold text-green-600" />
                      </TableCell>
                      <TableCell className="text-right">
                        <FormattedNumber value={transactions.reduce((s, t) => s + t.balance, 0)} type="currency" className="font-bold text-orange-600" />
                      </TableCell>
                      <TableCell />
                      {canCreateReceipt && <TableCell />}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {tx_total_pages > 1 && onTxPageChange && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {tx_total} registro(s) - Página {tx_page} de {tx_total_pages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={tx_page <= 1 || loading} onClick={() => onTxPageChange(tx_page - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={tx_page >= tx_total_pages || loading} onClick={() => onTxPageChange(tx_page + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-4 space-y-3">
            {/* Filters row */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por consecutivo, descripción, doc CxC/CxP..."
                    value={paySearch}
                    onChange={(e) => setPaySearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                {hasPayFilters && (
                  <Button variant="ghost" size="sm" className="h-9" onClick={clearPayFilters} title="Limpiar filtros">
                    <FilterX className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DatePicker
                  value={payDateFrom}
                  onChange={setPayDateFrom}
                  placeholder="Fecha desde"
                  clearable
                />
                <DatePicker
                  value={payDateTo}
                  onChange={setPayDateTo}
                  placeholder="Fecha hasta"
                  clearable
                />
                <SearchableSelect
                  options={sourceSelectOptions}
                  value={paySourceKey}
                  onChange={setPaySourceKey}
                  placeholder="Tipo documento"
                  clearable
                />
                <SearchableSelect
                  options={methodSelectOptions}
                  value={payMethodId}
                  onChange={setPayMethodId}
                  placeholder="Método de pago"
                  clearable
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border relative">
              {paymentsLoading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isClient ? 'CxC' : 'CxP'}</TableHead>
                    <TableHead>Doc. Origen</TableHead>
                    <TableHead>Consecutivo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo Documento</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {paymentsLoading ? 'Cargando...' : hasPayFilters ? 'Sin resultados para los filtros' : 'No hay pagos registrados'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentsList.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-medium text-sm">{p.ar_ap_consecutive || '-'}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{p.ar_ap_source_number || '-'}</TableCell>
                        <TableCell className="font-mono font-medium text-sm">{p.consecutive || '-'}</TableCell>
                        <TableCell className="text-sm">{formatDate(p.date)}</TableCell>
                        <TableCell className="text-right">
                          <FormattedNumber value={p.amount} type="currency" className="text-green-600 font-medium" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{paymentMethodLabel(p.payment_method_name)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground" title={p.description || ''}>
                          {p.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.source_description || 'Asiento Manual'}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            {p.receipt_id && canViewReceipt && (
                              <Button size="sm" variant="ghost" onClick={() => setViewReceiptId(p.receipt_id)} title="Ver">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {p.receipt_id && p.payment_method_name && canEditReceipt && (
                              <Button size="sm" variant="ghost" onClick={() => setEditReceiptId(p.receipt_id)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {p.receipt_id && canVoidReceipt && (
                              <Button size="sm" variant="ghost" onClick={() => setReverseReceiptId(p.receipt_id)}
                                title="Anular" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Totals row */}
                  {paymentsList.length > 0 && (
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={4} className="text-right font-bold">TOTAL PAGOS (página)</TableCell>
                      <TableCell className="text-right">
                        <FormattedNumber value={paymentsList.reduce((s, p) => s + p.amount, 0)} type="currency" className="font-bold text-green-600" />
                      </TableCell>
                      <TableCell colSpan={4} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {paymentsTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {paymentsTotal} pago(s) - Página {paymentsPage} de {paymentsTotalPages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={paymentsPage <= 1 || paymentsLoading} onClick={() => setPaymentsPage(p => p - 1)}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={paymentsPage >= paymentsTotalPages || paymentsLoading} onClick={() => setPaymentsPage(p => p + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Ver recibo */}
    {viewReceiptId && (
      <PaymentReceiptForm
        open
        onClose={() => setViewReceiptId(null)}
        type={isClient ? 'RECEIVABLE' : 'PAYABLE'}
        receiptId={viewReceiptId}
        mode="view"
      />
    )}

    {/* Editar recibo */}
    {editReceiptId && (
      <PaymentReceiptForm
        open
        onClose={() => setEditReceiptId(null)}
        type={isClient ? 'RECEIVABLE' : 'PAYABLE'}
        receiptId={editReceiptId}
        mode="edit"
        onSuccess={handleRefresh}
      />
    )}

    {/* Anular recibo */}
    {reverseReceiptId && (
      <PaymentReceiptForm
        open
        onClose={() => setReverseReceiptId(null)}
        type={isClient ? 'RECEIVABLE' : 'PAYABLE'}
        receiptId={reverseReceiptId}
        mode="reverse"
        onSuccess={handleRefresh}
      />
    )}

    {/* Pagar/Cobrar documento */}
    {payDocTx && (
      <PaymentReceiptForm
        open
        onClose={() => setPayDocTx(null)}
        type={isClient ? 'RECEIVABLE' : 'PAYABLE'}
        mode="create"
        initialThirdParty={{ id: thirdPartyId, name: thirdPartyName, document: thirdPartyDocument || null }}
        initialDocument={{
          id: payDocTx.id,
          balance: payDocTx.balance,
          consecutive: payDocTx.consecutive || null,
          source_description: payDocTx.type_label,
          source_number: payDocTx.source_number || null,
          account_code: payDocTx.account_code || null,
          account_name: payDocTx.account_name || null,
          description: payDocTx.description || null,
        }}
        onSuccess={handleRefresh}
      />
    )}
    </>
  );
}
