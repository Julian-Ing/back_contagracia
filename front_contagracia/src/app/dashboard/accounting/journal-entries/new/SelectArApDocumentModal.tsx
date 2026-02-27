'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { DatePicker } from '@/shared/components/ui/date-picker';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Search, Loader2, ArrowLeft, ChevronLeft, ChevronRight, FilterX } from 'lucide-react';
import { arApService } from '@/modules/ar-ap';
import type { ArApType, ArApSummaryItem, ArApTransaction, BucketFilter } from '@/modules/ar-ap';

/* ── Types ────────────────────────────────────────────────── */

export interface SelectedDocument {
  id: string;
  consecutive: string | null;
  source_key: string;
  source_description: string;
  source_number: string | null;
  description: string | null;
  date: string;
  due_date: string | null;
  amount: number;
  paid: number;
  balance: number;
  status: string;
  third_party_id: string;
  third_party_name: string;
  third_party_document: string | null;
  account_code: string | null;
  account_name: string | null;
}

interface SelectArApDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (doc: SelectedDocument) => void;
  type: ArApType;
  /** When provided, skip step 1 (third-party selection) and go straight to documents */
  initialThirdParty?: { id: string; name: string; document: string | null };
}

/* ── Helpers ──────────────────────────────────────────────── */

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

/* ── Component ────────────────────────────────────────────── */

export default function SelectArApDocumentModal({
  open, onClose, onSelect, type, initialThirdParty,
}: SelectArApDocumentModalProps) {
  const isReceivable = type === 'RECEIVABLE';
  const title = isReceivable ? 'Seleccionar CxC a Cobrar' : 'Seleccionar CxP a Pagar';
  const cxLabel = isReceivable ? 'CxC' : 'CxP';

  // ─ Step 1: Third parties ─
  const [thirdParties, setThirdParties] = useState<ArApSummaryItem[]>([]);
  const [tpSearch, setTpSearch] = useState('');
  const [tpBucket, setTpBucket] = useState<BucketFilter>('all');
  const [tpDateFrom, setTpDateFrom] = useState('');
  const [tpDateTo, setTpDateTo] = useState('');
  const [tpDueDateFrom, setTpDueDateFrom] = useState('');
  const [tpDueDateTo, setTpDueDateTo] = useState('');
  const [tpPage, setTpPage] = useState(1);
  const [tpTotalPages, setTpTotalPages] = useState(0);
  const [tpTotal, setTpTotal] = useState(0);
  const [tpLoading, setTpLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // ─ Step 2: Documents ─
  const [selectedThirdParty, setSelectedThirdParty] = useState<ArApSummaryItem | null>(null);
  const [documents, setDocuments] = useState<ArApTransaction[]>([]);
  const [docSearch, setDocSearch] = useState('');
  const [docStatuses, setDocStatuses] = useState<string[]>(['PENDING', 'PARTIAL']);
  const [docOverdue, setDocOverdue] = useState<'all' | 'overdue' | 'current'>('all');
  const [docPage, setDocPage] = useState(1);
  const [docTotalPages, setDocTotalPages] = useState(0);
  const [docTotal, setDocTotal] = useState(0);
  const [docLoading, setDocLoading] = useState(false);

  const tpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─ Fetch third parties ─
  const fetchThirdParties = useCallback(async (opts?: {
    search?: string; bucket?: BucketFilter; page?: number;
    dateFrom?: string; dateTo?: string; dueDateFrom?: string; dueDateTo?: string;
  }) => {
    setTpLoading(true);
    try {
      const result = await arApService.getSummaryByThirdParty({
        type,
        search: opts?.search || undefined,
        bucket: opts?.bucket || undefined,
        tab: 'pending',
        dateFrom: opts?.dateFrom || undefined,
        dateTo: opts?.dateTo || undefined,
        dueDateFrom: opts?.dueDateFrom || undefined,
        dueDateTo: opts?.dueDateTo || undefined,
        page: opts?.page || 1,
        limit: 10,
      });
      setThirdParties(result.data);
      setTpTotal(result.total);
      setTpTotalPages(result.totalPages);
    } catch {
      setThirdParties([]);
    } finally {
      setTpLoading(false);
    }
  }, [type]);

  // ─ Fetch documents for third party ─
  const fetchDocuments = useCallback(async (thirdPartyId: string, opts?: {
    search?: string; page?: number; statuses?: string[]; overdue?: 'all' | 'overdue' | 'current';
    dateFrom?: string; dateTo?: string; dueDateFrom?: string; dueDateTo?: string;
  }) => {
    setDocLoading(true);
    try {
      const result = await arApService.getThirdPartyDetail(thirdPartyId, {
        type,
        search: opts?.search || undefined,
        statuses: (opts?.statuses && opts.statuses.length > 0 ? opts.statuses : ['PENDING', 'PARTIAL']) as any,
        overdue: opts?.overdue || 'all',
        dateFrom: opts?.dateFrom || tpDateFrom || undefined,
        dateTo: opts?.dateTo || tpDateTo || undefined,
        dueDateFrom: opts?.dueDateFrom || tpDueDateFrom || undefined,
        dueDateTo: opts?.dueDateTo || tpDueDateTo || undefined,
        page: opts?.page || 1,
        limit: 10,
      });
      setDocuments(result.transactions.filter(t => t.balance > 0));
      setDocTotal(result.txTotal);
      setDocTotalPages(result.txTotalPages);
    } catch {
      setDocuments([]);
    } finally {
      setDocLoading(false);
    }
  }, [type, tpDateFrom, tpDateTo, tpDueDateFrom, tpDueDateTo]);

  // Current third party filter state (for reuse)
  const tpFilters = useCallback(() => ({
    search: tpSearch, bucket: tpBucket,
    dateFrom: tpDateFrom, dateTo: tpDateTo,
    dueDateFrom: tpDueDateFrom, dueDateTo: tpDueDateTo,
  }), [tpSearch, tpBucket, tpDateFrom, tpDateTo, tpDueDateFrom, tpDueDateTo]);

  // ─ Reset when dialog closes (covers programmatic close AND user close) ─
  useEffect(() => {
    if (!open) {
      setThirdParties([]);
      setSelectedThirdParty(null);
      setDocuments([]);
      setDocSearch('');
      setDocStatuses(['PENDING', 'PARTIAL']);
      setDocOverdue('all');
      setDocPage(1);
      setTpSearch('');
      setTpBucket('all');
      setTpDateFrom('');
      setTpDateTo('');
      setTpDueDateFrom('');
      setTpDueDateTo('');
      setTpPage(1);
      setInitialLoaded(false);
    }
  }, [open]);

  // ─ Initial load on open ─
  useEffect(() => {
    if (open && !initialLoaded) {
      setInitialLoaded(true);
      if (initialThirdParty) {
        const syntheticTp: ArApSummaryItem = {
          third_party_id: initialThirdParty.id,
          third_party_name: initialThirdParty.name,
          third_party_document: initialThirdParty.document || '',
          total_amount: 0, total_paid: 0, total_balance: 0,
          total_docs: 0, pending_docs: 0, paid_docs: 0,
          last_doc_date: null, last_payment_date: null, avg_overdue_days: 0,
        };
        setSelectedThirdParty(syntheticTp);
        fetchDocuments(initialThirdParty.id, { statuses: ['PENDING', 'PARTIAL'] });
      } else {
        fetchThirdParties();
      }
    }
  }, [open, initialLoaded, fetchThirdParties, initialThirdParty, fetchDocuments]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) onClose();
  }, [onClose]);

  // ─ Third party fuzzy search (debounced) ─
  const handleTpSearch = useCallback((value: string) => {
    setTpSearch(value);
    if (tpTimerRef.current) clearTimeout(tpTimerRef.current);
    tpTimerRef.current = setTimeout(() => {
      setTpPage(1);
      fetchThirdParties({ ...tpFilters(), search: value, page: 1 });
    }, 400);
  }, [tpFilters, fetchThirdParties]);

  // ─ Third party filter changes ─
  const handleTpBucketChange = useCallback((v: string) => {
    const bucket = v as BucketFilter;
    setTpBucket(bucket);
    setTpPage(1);
    fetchThirdParties({ ...tpFilters(), bucket, page: 1 });
  }, [tpFilters, fetchThirdParties]);

  const submitTpFilters = useCallback(() => {
    setTpPage(1);
    fetchThirdParties({ ...tpFilters(), page: 1 });
  }, [tpFilters, fetchThirdParties]);

  const hasTpDateFilters = tpDateFrom || tpDateTo || tpDueDateFrom || tpDueDateTo;

  const clearTpDateFilters = useCallback(() => {
    setTpDateFrom('');
    setTpDateTo('');
    setTpDueDateFrom('');
    setTpDueDateTo('');
    setTpPage(1);
    fetchThirdParties({ search: tpSearch, bucket: tpBucket, page: 1 });
  }, [tpSearch, tpBucket, fetchThirdParties]);

  const handleTpPageChange = useCallback((p: number) => {
    setTpPage(p);
    fetchThirdParties({ ...tpFilters(), page: p });
  }, [tpFilters, fetchThirdParties]);

  // ─ Select third party → show documents ─
  const handleSelectThirdParty = useCallback((tp: ArApSummaryItem) => {
    setSelectedThirdParty(tp);
    setDocSearch('');
    setDocStatuses(['PENDING', 'PARTIAL']);
    setDocOverdue('all');
    setDocPage(1);
    fetchDocuments(tp.third_party_id, { statuses: ['PENDING', 'PARTIAL'] });
  }, [fetchDocuments]);

  // ─ Document fuzzy search (debounced) ─
  const handleDocSearch = useCallback((value: string) => {
    setDocSearch(value);
    if (docTimerRef.current) clearTimeout(docTimerRef.current);
    docTimerRef.current = setTimeout(() => {
      setDocPage(1);
      if (selectedThirdParty) fetchDocuments(selectedThirdParty.third_party_id, { search: value, page: 1, statuses: docStatuses, overdue: docOverdue });
    }, 400);
  }, [selectedThirdParty, fetchDocuments, docStatuses, docOverdue]);

  const handleDocStatusToggle = useCallback((status: string) => {
    const next = docStatuses.includes(status)
      ? docStatuses.filter(s => s !== status)
      : [...docStatuses, status];
    setDocStatuses(next);
    setDocPage(1);
    if (selectedThirdParty) fetchDocuments(selectedThirdParty.third_party_id, { search: docSearch, page: 1, statuses: next, overdue: docOverdue });
  }, [selectedThirdParty, docSearch, docStatuses, docOverdue, fetchDocuments]);

  const handleDocOverdueChange = useCallback((ov: 'all' | 'overdue' | 'current') => {
    setDocOverdue(ov);
    setDocPage(1);
    if (selectedThirdParty) fetchDocuments(selectedThirdParty.third_party_id, { search: docSearch, page: 1, statuses: docStatuses, overdue: ov });
  }, [selectedThirdParty, docSearch, docStatuses, fetchDocuments]);

  const handleDocPageChange = useCallback((p: number) => {
    setDocPage(p);
    if (selectedThirdParty) fetchDocuments(selectedThirdParty.third_party_id, { search: docSearch, page: p, statuses: docStatuses, overdue: docOverdue });
  }, [selectedThirdParty, docSearch, docStatuses, docOverdue, fetchDocuments]);

  // ─ Back to third parties ─
  const handleBack = useCallback(() => {
    setSelectedThirdParty(null);
    setDocuments([]);
    setDocSearch('');
    setDocStatuses(['PENDING', 'PARTIAL']);
    setDocOverdue('all');
    setDocPage(1);
  }, []);

  // ─ Select document ─
  const handleSelectDocument = useCallback((doc: ArApTransaction) => {
    if (!selectedThirdParty) return;
    onSelect({
      id: doc.id,
      consecutive: doc.consecutive,
      source_key: doc.source_key,
      source_description: doc.source_description,
      source_number: doc.source_number,
      description: doc.description,
      date: doc.date,
      due_date: doc.due_date,
      amount: doc.amount,
      paid: doc.paid,
      balance: doc.balance,
      status: doc.status,
      third_party_id: selectedThirdParty.third_party_id,
      third_party_name: selectedThirdParty.third_party_name,
      third_party_document: selectedThirdParty.third_party_document,
      account_code: doc.account_code || null,
      account_name: (doc as any).account_name || null,
    });
    onClose();
  }, [selectedThirdParty, onSelect, onClose]);

  // ─ Days badge for documents ─
  const getDaysBadge = (doc: ArApTransaction) => {
    if (doc.balance <= 0) return null;
    if (!doc.due_date) return null;
    if (doc.days_overdue > 0) return <span className="text-xs font-medium text-red-600">-{doc.days_overdue}d</span>;
    if (doc.days_due > 0) return <span className="text-xs font-medium text-green-600">{doc.days_due}d</span>;
    return <span className="text-xs font-medium text-orange-600">Hoy</span>;
  };

  const getStatusBadge = (doc: ArApTransaction) => {
    if (doc.days_overdue > 0 && doc.balance > 0) return <Badge variant="destructive">Vencido</Badge>;
    if (doc.balance === 0) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Pagada</Badge>;
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedThirdParty && !initialThirdParty && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="h-7 w-7 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedThirdParty
              ? `${title} — ${selectedThirdParty.third_party_name}`
              : title
            }
          </DialogTitle>
        </DialogHeader>

        {/* ═══ Step 1: Third Parties ═══ */}
        {!selectedThirdParty && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tercero por nombre o documento..."
                  value={tpSearch}
                  onChange={(e) => handleTpSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Vencimiento</Label>
                <SearchableSelect
                  options={BUCKET_OPTIONS}
                  value={tpBucket}
                  onChange={handleTpBucketChange}
                  placeholder="Rango de días"
                  className="w-[150px]"
                  clearable={false}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Emisión desde</Label>
                <DatePicker value={tpDateFrom} onChange={setTpDateFrom} placeholder="Desde" className="w-[140px]" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Emisión hasta</Label>
                <DatePicker value={tpDateTo} onChange={setTpDateTo} placeholder="Hasta" className="w-[140px]" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Vencimiento desde</Label>
                <DatePicker value={tpDueDateFrom} onChange={setTpDueDateFrom} placeholder="Desde" className="w-[140px]" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Vencimiento hasta</Label>
                <DatePicker value={tpDueDateTo} onChange={setTpDueDateTo} placeholder="Hasta" className="w-[140px]" />
              </div>
              {hasTpDateFilters && (
                <Button variant="ghost" size="sm" onClick={clearTpDateFilters} title="Limpiar fechas">
                  <FilterX className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" onClick={submitTpFilters} disabled={tpLoading}>
                <Search className="h-4 w-4 mr-1" />
                Buscar
              </Button>
            </div>

            {/* Third parties table */}
            <div className="rounded-md border relative">
              {tpLoading && (
                <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tercero</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Total {cxLabel}</TableHead>
                    <TableHead className="text-right">Recaudado</TableHead>
                    <TableHead className="text-right">Saldo Pend.</TableHead>
                    <TableHead className="text-center">Docs</TableHead>
                    <TableHead>Último Doc.</TableHead>
                    <TableHead>Último Pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thirdParties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {tpLoading ? 'Cargando...' : 'No se encontraron terceros con saldo pendiente'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    thirdParties.map((t) => (
                      <TableRow
                        key={t.third_party_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSelectThirdParty(t)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            {t.third_party_name}
                            {t.avg_overdue_days > 0 && (
                              <Badge variant="destructive" className="ml-2 text-[10px]">{t.avg_overdue_days}d vencido</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{t.third_party_document}</TableCell>
                        <TableCell className="text-right text-sm"><FormattedNumber value={t.total_amount} type="currency" /></TableCell>
                        <TableCell className="text-right text-sm"><FormattedNumber value={t.total_paid} type="currency" /></TableCell>
                        <TableCell className="text-right font-medium text-orange-600"><FormattedNumber value={t.total_balance} type="currency" /></TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-medium">{t.total_docs} total</span>
                            {t.pending_docs > 0 && <Badge variant="outline" className="text-[10px]">{t.pending_docs} pend.</Badge>}
                            {t.paid_docs > 0 && <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]">{t.paid_docs} pag.</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(t.last_doc_date)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(t.last_payment_date)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {tpTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tpTotal} tercero(s)</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={tpPage <= 1} onClick={() => handleTpPageChange(tpPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 py-1">{tpPage}/{tpTotalPages}</span>
                  <Button variant="outline" size="sm" disabled={tpPage >= tpTotalPages} onClick={() => handleTpPageChange(tpPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ Step 2: Documents ═══ */}
        {selectedThirdParty && (
          <div className="space-y-3">
            {/* Document filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por consecutivo, número, descripción..."
                  value={docSearch}
                  onChange={(e) => handleDocSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              {/* Status filters */}
              <div className="flex gap-1 items-center">
                {(['PENDING', 'PARTIAL', 'PAID'] as const).map(s => {
                  const active = docStatuses.includes(s);
                  const label = { PENDING: 'Pendiente', PARTIAL: 'Parcial', PAID: 'Pagado' }[s];
                  return (
                    <Button key={s} size="sm" variant={active ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => handleDocStatusToggle(s)}>
                      {label}
                    </Button>
                  );
                })}
              </div>
              {/* Overdue filter */}
              <div className="flex gap-1 items-center">
                {([
                  { key: 'all' as const, label: 'Todos' },
                  { key: 'overdue' as const, label: 'Vencidos' },
                  { key: 'current' as const, label: 'Al día' },
                ]).map(f => (
                  <Button key={f.key} size="sm" variant={docOverdue === f.key ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => handleDocOverdueChange(f.key)}>
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Documents table */}
            <div className="rounded-md border relative">
              {docLoading && (
                <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Consecutivo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        {docLoading ? 'Cargando...' : 'No hay documentos con saldo pendiente'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        onClick={() => handleSelectDocument(doc)}
                      >
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{doc.source_description}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div>{doc.consecutive || '-'}</div>
                          {doc.source_number && doc.source_number !== doc.consecutive && (
                            <div className="text-[10px] text-muted-foreground">{doc.source_number}</div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground" title={doc.description || ''}>
                          {doc.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(doc.date)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(doc.due_date)}</TableCell>
                        <TableCell className="text-center">{getDaysBadge(doc)}</TableCell>
                        <TableCell className="text-right text-sm"><FormattedNumber value={doc.amount} type="currency" /></TableCell>
                        <TableCell className="text-right text-sm text-green-600"><FormattedNumber value={doc.paid} type="currency" /></TableCell>
                        <TableCell className="text-right text-sm font-medium text-orange-600">
                          <FormattedNumber value={doc.balance} type="currency" />
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(doc)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {docTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{docTotal} documento(s)</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={docPage <= 1} onClick={() => handleDocPageChange(docPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 py-1">{docPage}/{docTotalPages}</span>
                  <Button variant="outline" size="sm" disabled={docPage >= docTotalPages} onClick={() => handleDocPageChange(docPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
