'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { formatDate } from '@/shared/utils/formatDate';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { Loader2, Search, ArrowLeft, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Decimal from 'decimal.js';
import { costCentersService } from '../services/costCenters.service';
import type { CostCenterMovement, MovementType, CostCenterMovementsFilters } from '../types';

interface CostCenterMovementsProps {
  costCenterId: string;
  onBack?: () => void;
}

const PAGE_SIZE = 20;

const SIGN_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'POSITIVE', label: 'Positivo (+)' },
  { value: 'NEGATIVE', label: 'Negativo (-)' },
];

export const CostCenterMovements = ({ costCenterId, onBack }: CostCenterMovementsProps) => {
  // Data
  const [movements, setMovements] = useState<CostCenterMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [costCenterInfo, setCostCenterInfo] = useState<{ name: string; consecutive: string } | null>(null);

  // Filter catalogs
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [referenceTypes, setReferenceTypes] = useState<MovementType[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [typeKey, setTypeKey] = useState('');
  const [referenceTypeKey, setReferenceTypeKey] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sign, setSign] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  // Load catalogs on mount
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [types, refTypes] = await Promise.all([
          costCentersService.getMovementTypes(),
          costCentersService.getMovementReferenceTypes(),
        ]);
        setMovementTypes(types);
        setReferenceTypes(refTypes);
      } catch {
        toast.error('Error cargando catálogos de movimientos');
      }
    };
    loadCatalogs();
  }, []);

  // Fetch movements
  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const filters: CostCenterMovementsFilters = { page, limit: PAGE_SIZE };
      if (debouncedSearch) filters.search = debouncedSearch;
      if (typeKey) filters.type_key = typeKey;
      if (referenceTypeKey) filters.reference_type_key = referenceTypeKey;
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;
      if (sign) filters.sign = sign;

      const res = await costCentersService.getMovements(costCenterId, filters);
      setMovements(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setCostCenterInfo(res.costCenter);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando movimientos');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [costCenterId, page, debouncedSearch, typeKey, referenceTypeKey, fromDate, toDate, sign]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, typeKey, referenceTypeKey, fromDate, toDate, sign]);

  const handleClearFilters = () => {
    setSearch('');
    setTypeKey('');
    setReferenceTypeKey('');
    setFromDate('');
    setToDate('');
    setSign('');
  };

  const hasActiveFilters = debouncedSearch || typeKey || referenceTypeKey || fromDate || toDate || sign;

  // Compute totals from current page data
  const totals = movements.reduce(
    (acc, m) => {
      const amt = new Decimal(m.amount);
      if (m.sign === 'POSITIVE') {
        acc.positive = acc.positive.plus(amt);
      } else {
        acc.negative = acc.negative.plus(amt);
      }
      return acc;
    },
    { positive: new Decimal(0), negative: new Decimal(0) },
  );
  const netTotal = totals.positive.minus(totals.negative);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Movimientos
            {costCenterInfo && (
              <span className="ml-2 text-base font-normal text-gray-500 dark:text-slate-400">
                {costCenterInfo.consecutive} - {costCenterInfo.name}
              </span>
            )}
          </h2>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                Movimientos
                <Badge variant="secondary">{total}</Badge>
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Search */}
              <div className="w-full sm:w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar en descripción..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="w-[180px]">
                <SearchableSelect
                  options={[
                    { value: '', label: 'Todos los tipos' },
                    ...movementTypes.map((t) => ({ value: t.key, label: t.name })),
                  ]}
                  value={typeKey}
                  onChange={(v) => setTypeKey(v)}
                  placeholder="Tipo"
                  clearable
                />
              </div>

              {/* Reference type */}
              <div className="w-[180px]">
                <SearchableSelect
                  options={[
                    { value: '', label: 'Todas las ref.' },
                    ...referenceTypes.map((t) => ({ value: t.key, label: t.name })),
                  ]}
                  value={referenceTypeKey}
                  onChange={(v) => setReferenceTypeKey(v)}
                  placeholder="Referencia"
                  clearable
                />
              </div>

              {/* Sign */}
              <div className="w-[160px]">
                <SearchableSelect
                  options={SIGN_OPTIONS}
                  value={sign}
                  onChange={(v) => setSign(v)}
                  placeholder="Signo"
                  clearable
                />
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 w-[150px]"
                  placeholder="Desde"
                />
                <span className="text-gray-400 text-sm">—</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 w-[150px]"
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && movements.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              <span className="ml-2 text-gray-500 dark:text-slate-400">Cargando...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              No se encontraron movimientos
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Fecha</TableHead>
                      <TableHead className="w-[140px]">Tipo</TableHead>
                      <TableHead className="w-[140px]">Referencia</TableHead>
                      <TableHead className="w-[70px] text-center">Signo</TableHead>
                      <TableHead className="w-[120px] text-right">Monto</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-[100px]">Ref. ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">
                          {formatDate(m.movement_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {m.type.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-slate-400">
                          {m.reference_type.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono font-bold text-sm ${
                            m.sign === 'POSITIVE'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {m.sign === 'POSITIVE' ? '+' : '−'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-mono text-sm ${
                            m.sign === 'POSITIVE'
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}>
                            <FormattedNumber value={Number(m.amount)} type="currency" />
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-slate-400 max-w-[250px] truncate">
                          {m.description || '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-gray-400 dark:text-slate-500 truncate max-w-[100px]">
                          {m.reference_id ? m.reference_id.substring(0, 8) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-slate-400">Positivos:</span>
                  <span className="font-mono font-medium text-green-700 dark:text-green-400">
                    <FormattedNumber value={totals.positive.toNumber()} type="currency" />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-slate-400">Negativos:</span>
                  <span className="font-mono font-medium text-red-700 dark:text-red-400">
                    <FormattedNumber value={totals.negative.toNumber()} type="currency" />
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-slate-400">Neto:</span>
                  <span className={`font-mono font-semibold ${
                    netTotal.gte(0)
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  }`}>
                    <FormattedNumber value={netTotal.toNumber()} type="currency" />
                  </span>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-slate-400">
                    Página {page} de {totalPages} ({total} registros)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
