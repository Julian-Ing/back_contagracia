'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Label } from '@/shared/components/ui/label';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Users, DollarSign, Clock, TrendingDown, Search, Eye, AlertCircle,
  Download, CreditCard, PlusCircle, Loader2, FileText, Pencil, FilterX, Ban,
} from 'lucide-react';
import { useArApSummary, usePaymentReceipts, arApService, PaymentReceiptForm } from '@/modules/ar-ap';
import type { ArApSummaryItem, ArApDetailResponse, BucketFilter } from '@/modules/ar-ap';
import BalanceDetailModal from '../accounts-receivable/components/BalanceDetailModal';

/* ── helpers ─────────────────────────────────────────────── */
const formatDate = (d?: string | null) => {
  if (!d) return '-';
  const [y, m, day] = d.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};
const BUCKET_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'overdue', label: 'Vencidos' },
  { value: '0-30', label: '0 - 30 días' },
  { value: '31-60', label: '31 - 60 días' },
  { value: '60+', label: '60+ días' },
];

/* ── component ───────────────────────────────────────────── */
export default function AccountsPayablePage() {
  const { can } = usePermissions();
  const canView = can('ap.view');
  const canRegisterPayment = can('ap.payments.register');
  const canViewPayments = can('ap.payments.view');
  const canExport = can('ap.export');
  const canCreateReceipt = can('payment_vouchers.create');
  const canViewReceipt = can('payment_vouchers.view');
  const canEditReceipt = can('payment_vouchers.edit');
  const canVoidReceipt = can('payment_vouchers.void');

  const [activeTab, setActiveTab] = useState<'pending' | 'vouchers'>(() => {
    try { const v = localStorage.getItem('filters:active-tab:accounts-payable'); if (v === 'vouchers') return 'vouchers'; } catch {}
    return 'pending';
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [reverseReceiptId, setReverseReceiptId] = useState<string | null>(null);
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);
  const [receiptThirdParty, setReceiptThirdParty] = useState<{ id: string; name: string; document: string | null } | undefined>();
  const [selectedThirdParty, setSelectedThirdParty] = useState<ArApSummaryItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetails, setModalDetails] = useState<ArApDetailResponse | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalPage, setModalPage] = useState(1);
  const [modalStatuses, setModalStatuses] = useState<string[]>(['PENDING', 'PARTIAL']);
  const [modalOverdue, setModalOverdue] = useState<'all' | 'overdue' | 'current'>('all');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Data hooks */
  const summary = useArApSummary({ type: 'PAYABLE' });
  const receipts = usePaymentReceipts({ type: 'PAYABLE', enabled: activeTab === 'vouchers' });

  /* Sync tab → hook tab */
  const handleTabChange = useCallback((t: 'pending' | 'vouchers') => {
    setActiveTab(t);
    if (t === 'pending') {
      setTimeout(() => summary.submitSearch(), 0);
    } else {
      setTimeout(() => receipts.submitSearch(), 0);
    }
  }, [summary.submitSearch, receipts.submitSearch]);

  useEffect(() => {
    try { localStorage.setItem('filters:active-tab:accounts-payable', activeTab); } catch {}
  }, [activeTab]);

  /* Summary cards */
  const tabSummary = useMemo(() => ({
    totalCount: summary.total,
    totalAmount: summary.items.reduce((s, c) => s + c.total_amount, 0),
    totalPaid: summary.items.reduce((s, c) => s + c.total_paid, 0),
    totalBalance: summary.items.reduce((s, c) => s + c.total_balance, 0),
  }), [summary.items, summary.total]);

  /* Fetch detail with search, pagination & filters */
  const fetchDetail = useCallback(async (
    thirdPartyId: string,
    opts?: { search?: string; page?: number; statuses?: string[]; overdue?: 'all' | 'overdue' | 'current' },
  ) => {
    setModalLoading(true);
    try {
      const detail = await arApService.getThirdPartyDetail(thirdPartyId, {
        type: 'PAYABLE',
        search: opts?.search || undefined,
        page: opts?.page || 1,
        limit: 10,
        statuses: (opts?.statuses && opts.statuses.length > 0 ? opts.statuses : undefined) as any,
        overdue: opts?.overdue || 'all',
        dateFrom: summary.dateFrom || undefined,
        dateTo: summary.dateTo || undefined,
        dueDateFrom: summary.dueDateFrom || undefined,
        dueDateTo: summary.dueDateTo || undefined,
      });
      setModalDetails(detail);
    } catch {
      toast.error('Error al cargar detalle del tercero');
    } finally {
      setModalLoading(false);
    }
  }, [summary.dateFrom, summary.dateTo, summary.dueDateFrom, summary.dueDateTo]);

  const handleViewBalance = useCallback(async (item: ArApSummaryItem) => {
    setSelectedThirdParty(item);
    setModalOpen(true);
    setModalSearch('');
    setModalPage(1);
    const initStatuses = ['PENDING', 'PARTIAL'];
    setModalStatuses(initStatuses);
    setModalOverdue('all');
    setModalDetails(null);
    await fetchDetail(item.third_party_id, { statuses: initStatuses });
  }, [fetchDetail, activeTab]);

  const handleModalSearch = useCallback((search: string) => {
    setModalSearch(search);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setModalPage(1);
      if (selectedThirdParty) {
        fetchDetail(selectedThirdParty.third_party_id, { search, page: 1, statuses: modalStatuses, overdue: modalOverdue });
      }
    }, 400);
  }, [selectedThirdParty, fetchDetail, modalStatuses, modalOverdue]);

  const handleModalPageChange = useCallback((page: number) => {
    setModalPage(page);
    if (selectedThirdParty) {
      fetchDetail(selectedThirdParty.third_party_id, { search: modalSearch, page, statuses: modalStatuses, overdue: modalOverdue });
    }
  }, [selectedThirdParty, modalSearch, fetchDetail, modalStatuses, modalOverdue]);

  const handleModalStatusesChange = useCallback((statuses: string[]) => {
    setModalStatuses(statuses);
    setModalPage(1);
    if (selectedThirdParty) {
      fetchDetail(selectedThirdParty.third_party_id, { search: modalSearch, page: 1, statuses, overdue: modalOverdue });
    }
  }, [selectedThirdParty, modalSearch, fetchDetail, modalOverdue]);

  const handleModalOverdueChange = useCallback((ov: 'all' | 'overdue' | 'current') => {
    setModalOverdue(ov);
    setModalPage(1);
    if (selectedThirdParty) {
      fetchDetail(selectedThirdParty.third_party_id, { search: modalSearch, page: 1, statuses: modalStatuses, overdue: ov });
    }
  }, [selectedThirdParty, modalSearch, fetchDetail, modalStatuses]);

  const getOverdueBadge = (days: number) => {
    if (!days || days <= 0) return null;
    return <Badge variant="destructive" className="ml-2">{days}d vencido</Badge>;
  };

  const handleTodo = (label: string) => () => toast(`${label}: Próximamente`, { icon: '🔧' });

  const hasDateFilters = summary.dateFrom || summary.dateTo || summary.dueDateFrom || summary.dueDateTo;
  const hasReceiptDateFilters = receipts.dateFrom || receipts.dateTo;

  const clearSummaryDates = () => {
    summary.setDateFrom('');
    summary.setDateTo('');
    summary.setDueDateFrom('');
    summary.setDueDateTo('');
  };

  const clearReceiptDates = () => {
    receipts.setDateFrom('');
    receipts.setDateTo('');
  };

  /* ── render ─────────────────────────────────────────────── */
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-center text-muted-foreground">No tienes permisos para ver las cuentas por pagar</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = activeTab === 'vouchers'
    ? (receipts.loading || !receipts.loaded)
    : summary.loading;
  const dataError = activeTab === 'vouchers' ? receipts.error : summary.error;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cuentas por Pagar</h1>
          <p className="text-muted-foreground">Balance consolidado agrupado por tercero</p>
        </div>
        <div className="flex gap-2">
          {canCreateReceipt && (
            <Button variant="default" onClick={() => { setReceiptThirdParty(undefined); setShowReceiptModal(true); }}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Nuevo Comprobante de Egreso
            </Button>
          )}
          {canExport && (
            <>
              <Button variant="outline" onClick={handleTodo('Exportar Excel')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={handleTodo('Exportar PDF')}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-2">
        <div className="inline-flex rounded-md border p-1">
          <Button size="sm" variant={activeTab === 'pending' ? 'default' : 'ghost'} onClick={() => handleTabChange('pending')}>Pendientes</Button>
          {canViewPayments && (
            <Button size="sm" variant={activeTab === 'vouchers' ? 'default' : 'ghost'} onClick={() => handleTabChange('vouchers')}>Comprobantes de Egreso</Button>
          )}
        </div>
      </div>

      {/* Error state */}
      {dataError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-center text-muted-foreground">{dataError}</p>
            <Button variant="outline" onClick={activeTab === 'vouchers' ? receipts.submitSearch : summary.submitSearch}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      {/* ═══ Tab: Comprobantes de Egreso ═══ */}
      {!dataError && activeTab === 'vouchers' && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Buscar comprobante..."
                  value={receipts.searchTerm}
                  onChange={(e) => receipts.setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && receipts.submitSearch()}
                  className="pl-9 w-[220px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Fecha desde</Label>
                <DatePicker value={receipts.dateFrom} onChange={receipts.setDateFrom} placeholder="Desde" className="w-[160px]" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Fecha hasta</Label>
                <DatePicker value={receipts.dateTo} onChange={receipts.setDateTo} placeholder="Hasta" className="w-[160px]" />
              </div>
              {hasReceiptDateFilters && (
                <Button variant="ghost" size="sm" onClick={clearReceiptDates} title="Limpiar fechas">
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
              <Button type="button" onClick={() => receipts.submitSearch()}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consecutivo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Beneficiario</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Movimientos</TableHead>
                    <TableHead className="text-right">Anticipos</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.receipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        No hay comprobantes de egreso registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    receipts.receipts.map((r) => {
                      const hasMovements = r.income_amount > 0 || r.expense_amount > 0 || r.bank_amount > 0 || r.document_amount > 0;
                      const hasAnticipos = r.client_prepayment_amount > 0 || r.supplier_prepayment_amount > 0;
                      return (
                        <TableRow key={r.id} className={r.status === 'VOIDED' ? 'opacity-60' : ''}>
                          <TableCell className="font-mono font-medium">{r.consecutive}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{r.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{r.third_party_name || 'Sin asignar'}</span>
                              {r.third_party_document && <span className="text-xs text-muted-foreground">{r.third_party_document}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                          <TableCell className="text-right align-top">
                            {hasMovements ? (
                              <div className="flex flex-col items-stretch text-right gap-0.5">
                                {r.income_amount > 0 && <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Ingresos</span><FormattedNumber value={r.income_amount} type="currency" className="tabular-nums" /></div>}
                                {r.expense_amount > 0 && <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Gastos</span><FormattedNumber value={r.expense_amount} type="currency" className="tabular-nums" /></div>}
                                {r.bank_amount > 0 && <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Banco</span><FormattedNumber value={r.bank_amount} type="currency" className="tabular-nums" /></div>}
                                {r.document_amount > 0 && <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Documentos</span><FormattedNumber value={r.document_amount} type="currency" className="tabular-nums" /></div>}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right align-top">
                            {hasAnticipos ? (
                              <div className="flex flex-col items-stretch text-right gap-1">
                                {r.client_prepayment_amount > 0 && (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Creado</Badge>
                                    <FormattedNumber value={r.client_prepayment_amount} type="currency" className="tabular-nums" />
                                  </div>
                                )}
                                {r.supplier_prepayment_amount > 0 && (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0">Usado</Badge>
                                    <FormattedNumber value={r.supplier_prepayment_amount} type="currency" className="tabular-nums" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={r.status === 'ACTIVE' ? 'default' : 'destructive'}>
                              {r.status === 'ACTIVE' ? 'Activo' : 'Anulado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              {r.has_journal && (
                                <Button size="sm" variant="outline" onClick={handleTodo('Ver asiento contable')} title="Ver asiento contable">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              {canViewReceipt && (
                                <Button size="sm" variant="ghost" onClick={handleTodo('Ver comprobante')} title="Ver comprobante">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {r.status === 'ACTIVE' && (
                                <>
                                  {canEditReceipt && (
                                    <Button size="sm" variant="ghost" onClick={() => setEditReceiptId(r.id)} title="Editar comprobante">
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canVoidReceipt && (
                                    <Button size="sm" variant="ghost" onClick={() => setReverseReceiptId(r.id)} title="Anular comprobante"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                      <Ban className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {receipts.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">{receipts.total} comprobante(s) en total</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={receipts.page <= 1} onClick={() => receipts.goToPage(receipts.page - 1)}>Anterior</Button>
                  <span className="text-sm py-1 px-2">Pág. {receipts.page} de {receipts.totalPages}</span>
                  <Button size="sm" variant="outline" disabled={receipts.page >= receipts.totalPages} onClick={() => receipts.goToPage(receipts.page + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ Tabs: Pendientes / Pagados ═══ */}
      {!dataError && activeTab !== 'vouchers' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Total Terceros
                </CardTitle>
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{tabSummary.totalCount}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Total CxP
                </CardTitle>
              </CardHeader>
              <CardContent><FormattedNumber value={tabSummary.totalAmount} type="currency" className="text-2xl font-bold text-red-600" /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  Total Pagado
                </CardTitle>
              </CardHeader>
              <CardContent><FormattedNumber value={tabSummary.totalPaid} type="currency" className="text-2xl font-bold text-green-600" /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Saldo Pendiente
                </CardTitle>
              </CardHeader>
              <CardContent><FormattedNumber value={tabSummary.totalBalance} type="currency" className="text-2xl font-bold text-orange-600" /></CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Buscar tercero..."
                    value={summary.searchTerm}
                    onChange={(e) => summary.setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && summary.submitSearch()}
                    className="pl-9 w-[220px]"
                  />
                </div>
                {activeTab === 'pending' && (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Vencimiento</Label>
                    <SearchableSelect
                      options={BUCKET_OPTIONS}
                      value={summary.bucket}
                      onChange={(v) => summary.setBucket(v as BucketFilter)}
                      placeholder="Rango de días"
                      className="w-[170px]"
                      clearable={false}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Emisión desde</Label>
                  <DatePicker value={summary.dateFrom} onChange={summary.setDateFrom} placeholder="Desde" className="w-[160px]" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Emisión hasta</Label>
                  <DatePicker value={summary.dateTo} onChange={summary.setDateTo} placeholder="Hasta" className="w-[160px]" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Vencimiento desde</Label>
                  <DatePicker value={summary.dueDateFrom} onChange={summary.setDueDateFrom} placeholder="Desde" className="w-[160px]" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Vencimiento hasta</Label>
                  <DatePicker value={summary.dueDateTo} onChange={summary.setDueDateTo} placeholder="Hasta" className="w-[160px]" />
                </div>
                {hasDateFilters && (
                  <Button variant="ghost" size="sm" onClick={clearSummaryDates} title="Limpiar fechas">
                    <FilterX className="h-4 w-4" />
                  </Button>
                )}
                <Button type="button" onClick={() => summary.submitSearch()}>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </CardHeader>

            <CardContent className="relative">
              {isLoading && (
                <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-md">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tercero</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Total CxP</TableHead>
                      <TableHead className="text-right">Total Pagado</TableHead>
                      <TableHead className="text-right">Saldo Pendiente</TableHead>
                      <TableHead className="text-center">Docs</TableHead>
                      <TableHead>Último Doc.</TableHead>
                      <TableHead>Último Pago</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No se encontraron terceros con cuentas por pagar
                        </TableCell>
                      </TableRow>
                    ) : (
                      summary.items.map((c) => (
                        <TableRow key={c.third_party_id}>
                          <TableCell className="font-medium">
                            <div>
                              {c.third_party_name}
                              {getOverdueBadge(c.avg_overdue_days)}
                            </div>
                          </TableCell>
                          <TableCell>{c.third_party_document}</TableCell>
                          <TableCell className="text-right"><FormattedNumber value={c.total_amount} type="currency" className="font-medium" /></TableCell>
                          <TableCell className="text-right"><FormattedNumber value={c.total_paid} type="currency" /></TableCell>
                          <TableCell className="text-right"><FormattedNumber value={c.total_balance} type="currency" className="font-medium text-orange-600" /></TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs font-medium">{c.total_docs} total</span>
                              {c.pending_docs > 0 && <Badge variant="outline" className="text-[10px]">{c.pending_docs} pend.</Badge>}
                              {c.paid_docs > 0 && <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]">{c.paid_docs} pag.</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(c.last_doc_date)}</TableCell>
                          <TableCell>{formatDate(c.last_payment_date)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button size="sm" variant="ghost" onClick={() => handleViewBalance(c)} title="Ver detalle">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canCreateReceipt && (
                                <Button size="sm" variant="ghost" onClick={() => {
                                  setReceiptThirdParty({ id: c.third_party_id, name: c.third_party_name, document: c.third_party_document });
                                  setShowReceiptModal(true);
                                }} title="Generar pago">
                                  <CreditCard className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {summary.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">{summary.total} tercero(s) en total</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={summary.page <= 1} onClick={() => summary.goToPage(summary.page - 1)}>Anterior</Button>
                    <span className="text-sm py-1 px-2">Pág. {summary.page} de {summary.totalPages}</span>
                    <Button size="sm" variant="outline" disabled={summary.page >= summary.totalPages} onClick={() => summary.goToPage(summary.page + 1)}>Siguiente</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Balance Detail Modal */}
      {selectedThirdParty && (
        <BalanceDetailModal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedThirdParty(null); setModalDetails(null); }}
          thirdPartyId={selectedThirdParty.third_party_id}
          thirdPartyName={selectedThirdParty.third_party_name}
          thirdPartyDocument={selectedThirdParty.third_party_document}
          type="supplier"
          details={modalDetails && !modalLoading ? {
            transactions: modalDetails.transactions.map((t) => ({
              id: t.id,
              type_label: t.source_description,
              number: t.source_number || t.consecutive || '-',
              date: t.date,
              due_date: t.due_date || '',
              amount: t.amount,
              paid: t.paid,
              balance: t.balance,
              status: t.status,
              days_overdue: t.days_overdue,
              days_due: t.days_due,
              description: t.description || '',
              consecutive: t.consecutive,
              source_number: t.source_number,
              source_key: t.source_key,
              account_code: t.account_code,
              account_name: t.account_name,
            })),
          } : undefined}
          summary={{
            total_invoiced: selectedThirdParty.total_amount,
            total_paid: selectedThirdParty.total_paid,
            total_balance: selectedThirdParty.total_balance,
          }}
          tx_search={modalSearch}
          onTxSearch={handleModalSearch}
          tx_page={modalDetails?.txPage || modalPage}
          tx_total_pages={modalDetails?.txTotalPages || 0}
          tx_total={modalDetails?.txTotal || 0}
          onTxPageChange={handleModalPageChange}
          loading={modalLoading}
          statuses={modalStatuses}
          onStatusesChange={handleModalStatusesChange}
          overdue={modalOverdue}
          onOverdueChange={handleModalOverdueChange}
          onRefresh={() => {
            if (selectedThirdParty) fetchDetail(selectedThirdParty.third_party_id, { search: modalSearch, page: modalPage, statuses: modalStatuses, overdue: modalOverdue });
            summary.submitSearch();
          }}
        />
      )}

      {/* Nuevo Comprobante de Egreso */}
      <PaymentReceiptForm
        open={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        type="PAYABLE"
        initialThirdParty={receiptThirdParty}
        onSuccess={() => { summary.submitSearch(); receipts.submitSearch(); }}
      />

      {/* Editar Comprobante */}
      {editReceiptId && (
        <PaymentReceiptForm
          open={!!editReceiptId}
          onClose={() => setEditReceiptId(null)}
          type="PAYABLE"
          receiptId={editReceiptId}
          mode="edit"
          onSuccess={() => { summary.submitSearch(); receipts.submitSearch(); }}
        />
      )}

      {/* Anular Comprobante */}
      {reverseReceiptId && (
        <PaymentReceiptForm
          open={!!reverseReceiptId}
          onClose={() => setReverseReceiptId(null)}
          type="PAYABLE"
          receiptId={reverseReceiptId}
          mode="reverse"
          onSuccess={() => { summary.submitSearch(); receipts.submitSearch(); }}
        />
      )}
    </div>
  );
}
