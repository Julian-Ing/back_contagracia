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
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { prepaymentsService } from '@/modules/ar-ap';
import type { PrepaymentItem, PrepaymentType } from '@/modules/ar-ap';

/* ── Types ────────────────────────────────────────────────── */

export interface SelectedPrepayment {
  id: string;
  consecutive: string | null;
  prepayment_type: PrepaymentType;
  prepayment_date: string;
  original_amount: number;
  balance: number;
  account_code: string | null;
  account_name: string | null;
  notes: string | null;
  third_party_id: string;
  third_party_name: string;
  third_party_document: string | null;
}

interface SelectPrepaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (prep: SelectedPrepayment) => void;
  /** When provided, only show prepayments for this third party */
  thirdPartyId?: string;
  /** When provided, restrict to these prepayment types */
  allowedTypes?: PrepaymentType[];
}

/* ── Helpers ──────────────────────────────────────────────── */

const formatDate = (d?: string | null) => {
  if (!d) return '-';
  const str = String(d).split('T')[0];
  const [y, m, day] = str.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const TYPE_LABELS: Record<string, string> = {
  CLIENT: 'Cliente',
  SUPPLIER: 'Proveedor',
  EMPLOYEE: 'Empleado',
};

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'SUPPLIER', label: 'Proveedor' },
  { value: 'EMPLOYEE', label: 'Empleado' },
];

/* ── Component ────────────────────────────────────────────── */

export default function SelectPrepaymentModal({
  open, onClose, onSelect, thirdPartyId, allowedTypes,
}: SelectPrepaymentModalProps) {
  const filteredTypeOptions = allowedTypes
    ? TYPE_OPTIONS.filter(o => o.value === '' || allowedTypes.includes(o.value as PrepaymentType))
    : TYPE_OPTIONS;
  const fixedType = allowedTypes?.length === 1 ? allowedTypes[0] : '';

  const [items, setItems] = useState<PrepaymentItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(fixedType);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (opts?: { search?: string; prepayment_type?: string; page?: number }) => {
    setLoading(true);
    try {
      const result = await prepaymentsService.getAll({
        search: opts?.search || undefined,
        prepayment_type: (opts?.prepayment_type || undefined) as PrepaymentType | undefined,
        status: 'ACTIVE',
        third_party_id: thirdPartyId || undefined,
        page: opts?.page || 1,
        limit: 10,
      });
      // Solo los que tienen saldo > 0
      setItems(result.data.filter(p => p.balance > 0));
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [thirdPartyId]);

  useEffect(() => {
    if (open && !initialLoaded) {
      setInitialLoaded(true);
      fetchData({ prepayment_type: fixedType || undefined });
    }
  }, [open, initialLoaded, fetchData, fixedType]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      onClose();
      setSearch('');
      setTypeFilter(fixedType);
      setPage(1);
      setInitialLoaded(false);
    }
  }, [onClose, fixedType]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchData({ search: value, prepayment_type: typeFilter, page: 1 });
    }, 400);
  }, [typeFilter, fetchData]);

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value);
    setPage(1);
    fetchData({ search, prepayment_type: value, page: 1 });
  }, [search, fetchData]);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    fetchData({ search, prepayment_type: typeFilter, page: p });
  }, [search, typeFilter, fetchData]);

  const handleSelectPrepayment = useCallback((prep: PrepaymentItem) => {
    onSelect({
      id: prep.id,
      consecutive: prep.consecutive,
      prepayment_type: prep.prepayment_type,
      prepayment_date: String(prep.prepayment_date).split('T')[0],
      original_amount: prep.original_amount,
      balance: prep.balance,
      account_code: prep.account_code,
      account_name: (prep as any).account_name || null,
      notes: prep.notes,
      third_party_id: prep.third_party_id,
      third_party_name: prep.third_party_name,
      third_party_document: prep.third_party_document,
    });
    onClose();
  }, [onSelect, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seleccionar Anticipo</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por consecutivo, tercero, cuenta..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            {!fixedType && (
              <div className="w-[150px]">
                <SearchableSelect
                  options={filteredTypeOptions}
                  value={typeFilter}
                  onChange={handleTypeChange}
                  placeholder="Tipo..."
                  clearable={false}
                />
              </div>
            )}
          </div>

          <div className="rounded-md border relative">
            {loading && (
              <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consecutivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto Original</TableHead>
                  <TableHead className="text-right">Saldo Disponible</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {loading ? 'Cargando...' : 'No hay anticipos activos con saldo disponible'}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((prep) => (
                    <TableRow
                      key={prep.id}
                      className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      onClick={() => handleSelectPrepayment(prep)}
                    >
                      <TableCell className="font-mono font-medium text-sm">{prep.consecutive || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[prep.prepayment_type] || prep.prepayment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{prep.third_party_name}</span>
                          {prep.third_party_document && (
                            <span className="text-xs text-muted-foreground">{prep.third_party_document}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDate(prep.prepayment_date)}</TableCell>
                      <TableCell className="text-right text-sm"><FormattedNumber value={prep.original_amount} type="currency" /></TableCell>
                      <TableCell className="text-right text-sm font-medium text-purple-600">
                        <FormattedNumber value={prep.balance} type="currency" />
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground" title={prep.notes || ''}>
                        {prep.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{total} anticipo(s)</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => handlePageChange(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2 py-1">{page}/{totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
