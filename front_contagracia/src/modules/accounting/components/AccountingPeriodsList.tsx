'use client';

import { useState } from 'react';
import { Search, RotateCcw, Lock, Unlock, Eye, Plus } from 'lucide-react';
import { PeriodFormModal } from './PeriodFormModal';
import { PeriodActionsModal } from './PeriodActionsModal';
import { PeriodConfirmModal } from './PeriodConfirmModal';
import { ClosingPreviewModal } from './ClosingPreviewModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { useAccountingPeriods } from '../hooks/useAccountingPeriods';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { formatDate } from '@/shared/utils/formatDate';
import type { AccountingPeriod, PeriodStatus, ClosingConfirmData } from '../types/accountingPeriods';

interface AccountingPeriodsListProps {
  onViewDetail?: (period: AccountingPeriod) => void;
}

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Abierto' },
  { value: 'CLOSED', label: 'Cerrado' },
  { value: 'REOPENED', label: 'Reabierto' },
];

const TYPE_OPTIONS = [
  { value: 'true', label: 'Anual' },
  { value: 'false', label: 'Mensual' },
];

const STATUS_COLORS: Record<PeriodStatus, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  CLOSED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  REOPENED: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
};

const STATUS_LABELS: Record<PeriodStatus, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
  REOPENED: 'Reabierto',
};

export function AccountingPeriodsList({ onViewDetail }: AccountingPeriodsListProps) {
  const { can } = usePermissions();
  const canCreateMonthly = can('closing.monthly.create');
  const canCreateAnnual = can('closing.annual.create');
  const canCloseMonthly = can('closing.monthly.close');
  const canCloseAnnual = can('closing.annual.close');
  const canReopenMonthly = can('closing.monthly.reopen');
  const canReopenAnnual = can('closing.annual.reopen');
  const canCreate = canCreateMonthly || canCreateAnnual;

  const {
    periods,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    filterByStatus,
    filterByAnnual,
    setPage,
    createPeriod,
    closePeriod,
    reopenPeriod,
    searchTerm: savedSearch,
    statusFilter: savedStatus,
    annualFilter: savedAnnual,
  } = useAccountingPeriods({ limit: PAGE_SIZE });

  const [searchInput, setSearchInput] = useState(savedSearch);
  const [statusFilter, setStatusFilter] = useState(savedStatus ?? '');
  const [typeFilter, setTypeFilter] = useState(savedAnnual === undefined ? '' : String(savedAnnual));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showClosingPreviewModal, setShowClosingPreviewModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(searchInput);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    filterByStatus(value as PeriodStatus || undefined);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    filterByAnnual(value ? value === 'true' : undefined);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setStatusFilter('');
    setTypeFilter('');
    search('');
    filterByStatus(undefined);
    filterByAnnual(undefined);
  };

  const handleOpenCloseModal = (period: AccountingPeriod) => {
    setSelectedPeriod(period);
    setShowClosingPreviewModal(true);
  };

  const handleOpenReopenModal = (period: AccountingPeriod) => {
    setSelectedPeriod(period);
    setShowReopenModal(true);
  };

  const handleConfirmClose = async (data: ClosingConfirmData) => {
    if (!selectedPeriod) return;
    await closePeriod(selectedPeriod.id, data);
  };

  const handleConfirmReopen = async (reason: string) => {
    if (!selectedPeriod) return;
    await reopenPeriod(selectedPeriod.id, reason);
  };

  if (loading && periods.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando períodos contables...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      )}

      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
                <span>Períodos Contables</span>
                <Badge variant="secondary">{total}</Badge>
              </CardTitle>
              {canCreate && (
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Período
                </Button>
              )}
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nombre o consecutivo..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-9 h-9"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
              </form>

              <div className="w-[150px]">
                <SearchableSelect
                  options={STATUS_OPTIONS}
                  value={statusFilter}
                  onChange={handleStatusChange}
                  placeholder="Estado..."
                />
              </div>

              <div className="w-[150px]">
                <SearchableSelect
                  options={TYPE_OPTIONS}
                  value={typeFilter}
                  onChange={handleTypeChange}
                  placeholder="Tipo..."
                />
              </div>

              <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters} title="Limpiar filtros">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Consecutivo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Año</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[120px]">Desde</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[120px]">Hasta</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Estado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[120px] text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron períodos contables
                    </TableCell>
                  </TableRow>
                ) : (
                  periods.map((period) => (
                    <TableRow
                      key={period.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                          {period.consecutive}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white text-sm">
                          {period.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 dark:text-slate-300 text-sm">
                          {period.year}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 dark:text-slate-300 text-sm">
                          {formatDate(period.start_date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 dark:text-slate-300 text-sm">
                          {formatDate(period.end_date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {period.is_annual ? 'Anual' : 'Mensual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[period.status].bg} ${STATUS_COLORS[period.status].text} font-normal`}>
                          {STATUS_LABELS[period.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(period.status === 'OPEN' || period.status === 'REOPENED') &&
                            (period.is_annual ? canCloseAnnual : canCloseMonthly) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCloseModal(period)}
                              title="Cerrar período"
                              className="h-8 w-8 p-0"
                            >
                              <Lock className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          {period.status === 'CLOSED' &&
                            (period.is_annual ? canReopenAnnual : canReopenMonthly) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReopenModal(period)}
                              title="Reabrir período"
                              className="h-8 w-8 p-0"
                            >
                              <Unlock className="h-4 w-4 text-amber-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPeriod(period);
                              setShowActionsModal(true);
                            }}
                            title="Ver historial de acciones"
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} períodos)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || loading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <PeriodFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createPeriod}
        canCreateMonthly={canCreateMonthly}
        canCreateAnnual={canCreateAnnual}
      />

      <PeriodActionsModal
        open={showActionsModal}
        onClose={() => {
          setShowActionsModal(false);
          setSelectedPeriod(null);
        }}
        period={selectedPeriod}
      />

      <ClosingPreviewModal
        open={showClosingPreviewModal}
        onClose={() => {
          setShowClosingPreviewModal(false);
          setSelectedPeriod(null);
        }}
        onConfirm={handleConfirmClose}
        period={selectedPeriod}
      />

      <PeriodConfirmModal
        open={showReopenModal}
        onClose={() => {
          setShowReopenModal(false);
          setSelectedPeriod(null);
        }}
        onConfirm={handleConfirmReopen}
        period={selectedPeriod}
        actionType="reopen"
      />
    </div>
  );
}
