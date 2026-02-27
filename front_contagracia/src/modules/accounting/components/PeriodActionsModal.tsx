'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { DatePicker } from '@/shared/components/ui/date-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Search, RotateCcw, FileText, Upload, Download, Undo2, Loader2, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import toast from 'react-hot-toast';
import { accountingPeriodsService } from '../services/accountingPeriods.service';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { JournalEntryDetail } from './JournalEntryDetail';
import type {
  AccountingPeriod,
  AccountingPeriodAction,
  PeriodActionType,
  OpeningBalancePreviewResult,
} from '../types/accountingPeriods';

interface PeriodActionsModalProps {
  open: boolean;
  onClose: () => void;
  period: AccountingPeriod | null;
}

const ACTION_TYPE_OPTIONS = [
  { value: 'OPEN', label: 'Apertura' },
  { value: 'CLOSE', label: 'Cierre' },
  { value: 'REOPEN', label: 'Reapertura' },
  { value: 'ADJUST', label: 'Ajuste' },
];

const ACTION_LABELS: Record<PeriodActionType, string> = {
  OPEN: 'Apertura',
  CLOSE: 'Cierre',
  REOPEN: 'Reapertura',
  ADJUST: 'Ajuste',
};

const ACTION_COLORS: Record<PeriodActionType, string> = {
  OPEN: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  REOPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ADJUST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PAGE_SIZE = 10;

export function PeriodActionsModal({ open, onClose, period }: PeriodActionsModalProps) {
  const [actions, setActions] = useState<AccountingPeriodAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJournalEntryId, setSelectedJournalEntryId] = useState<string | null>(null);

  // Permissions
  const { can } = usePermissions();
  const canViewClosingEntries = can('accounting.closing_entries.view');
  const canImportOpeningBal = can('accounting.opening_balance.import');
  const canReverseOpeningBal = can('accounting.opening_balance.reverse');

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importDescription, setImportDescription] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<OpeningBalancePreviewResult | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reverse state
  const [reversingActionId, setReversingActionId] = useState<string | null>(null);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [reversing, setReversing] = useState(false);

  const fetchActions = useCallback(async () => {
    if (!period) return;

    setLoading(true);
    setError(null);

    try {
      const response = await accountingPeriodsService.getActions(period.id, {
        search: searchQuery || undefined,
        action: (actionFilter as PeriodActionType) || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        limit: PAGE_SIZE,
      });

      setActions(response.data);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar acciones');
    } finally {
      setLoading(false);
    }
  }, [period, searchQuery, actionFilter, fromDate, toDate, page]);

  useEffect(() => {
    if (open && period) {
      fetchActions();
    }
  }, [open, period, fetchActions]);

  // Reset filters when modal opens
  useEffect(() => {
    if (open) {
      setSearchInput('');
      setSearchQuery('');
      setActionFilter('');
      setFromDate('');
      setToDate('');
      setPage(1);
    }
  }, [open]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setActionFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  // Check if period can have opening balance import
  // Show import if: annual + OPEN/REOPENED + no OPEN action with an active JE (auto or manual)
  const canImportOpeningBalance = period?.is_annual && (period.status === 'OPEN' || period.status === 'REOPENED');
  const hasActiveOpeningBalance = actions.some(
    (a) => a.action === 'OPEN' && a.journal_entry_id && !a.journal_entry_is_reversed,
  );
  const showImportButton = canImportOpeningBal && canImportOpeningBalance && !hasActiveOpeningBalance;
  const hasManualActions = actions.some((a) => a.is_manual);

  // ========== Import handlers ==========
  const handleOpenImportDialog = () => {
    setImportDescription(`Saldos iniciales ${period?.year || ''}`);
    setImportFile(null);
    setPreviewData(null);
    setPreviewSearch('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowImportDialog(true);
  };

  const handlePreview = async () => {
    if (!period || !importFile) return;
    setPreviewing(true);
    try {
      const result = await accountingPeriodsService.previewOpeningBalance(period.id, importFile);
      setPreviewData(result);
    } catch (err: any) {
      const data = err?.response?.data;
      // If backend returns errors array, show as preview with errors
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        setPreviewData({
          saldoRows: [], cxcRows: [], cxpRows: [], prepaymentRows: [],
          totalDebit: '0', totalCredit: '0',
          errors: data.errors,
        });
      } else {
        toast.error(data?.message || err?.message || 'Error al generar vista previa');
      }
    } finally {
      setPreviewing(false);
    }
  };

  const handleBackToUpload = () => {
    setPreviewData(null);
    setPreviewSearch('');
  };

  const handleDownloadTemplate = async () => {
    if (!period) return;
    setDownloadingTemplate(true);
    try {
      const blob = await accountingPeriodsService.downloadOpeningBalanceTemplate(period.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_saldos_iniciales.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al descargar la plantilla');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!period || !importFile) return;
    setImporting(true);
    try {
      const result = await accountingPeriodsService.importOpeningBalance(
        period.id,
        importFile,
        importDescription || undefined,
      );
      toast.success(
        `Saldos importados: ${result.items_count} líneas, ${result.cxc_count} CxC, ${result.cxp_count} CxP, ${result.prepayments_count} anticipos (${result.consecutive})`,
      );
      setShowImportDialog(false);
      setPreviewData(null);
      fetchActions();
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.errors && Array.isArray(data.errors)) {
        // Show first 5 errors
        const msg = data.errors.slice(0, 5).join('\n');
        const suffix = data.errors.length > 5 ? `\n...y ${data.errors.length - 5} error(es) más` : '';
        toast.error(`${data.message || 'Errores de validación'}:\n${msg}${suffix}`, { duration: 10000 });
      } else {
        toast.error(data?.message || err?.message || 'Error al importar saldos');
      }
    } finally {
      setImporting(false);
    }
  };

  // ========== Reverse handlers ==========
  const handleReverseClick = (actionId: string) => {
    setReversingActionId(actionId);
    setShowReverseConfirm(true);
  };

  const handleConfirmReverse = async () => {
    if (!period || !reversingActionId) return;
    setReversing(true);
    try {
      const result = await accountingPeriodsService.reverseOpeningBalance(period.id, reversingActionId);
      toast.success(`Saldos iniciales reversados (${result.reversal_consecutive})`);
      setShowReverseConfirm(false);
      setReversingActionId(null);
      fetchActions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Error al reversar');
    } finally {
      setReversing(false);
    }
  };

  if (!period) return null;

  const colCount = (canViewClosingEntries ? 5 : 4) + (hasManualActions ? 1 : 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[1000px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Historial de Acciones - {period.name}
            </DialogTitle>
            {showImportButton && (
              <Button
                variant="default"
                size="sm"
                onClick={handleOpenImportDialog}
                className="ml-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Saldos Iniciales
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por razón..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
              </form>

              <div className="w-[150px]">
                <SearchableSelect
                  options={ACTION_TYPE_OPTIONS}
                  value={actionFilter}
                  onChange={handleActionFilterChange}
                  placeholder="Tipo..."
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <div className="w-[160px]">
                <DatePicker
                  value={fromDate}
                  onChange={(value) => {
                    setFromDate(value);
                    setPage(1);
                  }}
                  placeholder="Desde..."
                  maxDate={toDate || undefined}
                />
              </div>
              <span className="text-gray-400">-</span>
              <div className="w-[160px]">
                <DatePicker
                  value={toDate}
                  onChange={(value) => {
                    setToDate(value);
                    setPage(1);
                  }}
                  placeholder="Hasta..."
                  minDate={fromDate || undefined}
                />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters} title="Limpiar filtros">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[120px]">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Razón</TableHead>
                  {canViewClosingEntries && (
                    <TableHead className="text-gray-600 dark:text-slate-300 w-[120px]">Asiento</TableHead>
                  )}
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[150px]">Usuario</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[180px]">Fecha</TableHead>
                  {hasManualActions && (
                    <TableHead className="text-gray-600 dark:text-slate-300 w-[80px]">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center py-8 text-gray-500">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : actions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colCount} className="text-center py-8 text-gray-500">
                      No se encontraron acciones
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((action) => {
                    const canReverse =
                      canReverseOpeningBal &&
                      action.is_manual &&
                      action.action === 'OPEN' &&
                      action.journal_entry_id &&
                      !action.journal_entry_is_reversed;

                    return (
                      <TableRow key={action.id} className="border-gray-200 dark:border-slate-700">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={ACTION_COLORS[action.action]}>
                              {ACTION_LABELS[action.action]}
                            </Badge>
                            {action.is_manual && (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            )}
                            {action.journal_entry_is_reversed && (
                              <Badge variant="outline" className="text-xs text-red-500 border-red-300">
                                Reversado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-white text-sm">
                          {action.reason || '-'}
                        </TableCell>
                        {canViewClosingEntries && (
                          <TableCell className="text-sm">
                            {action.journal_entry_id ? (
                              <button
                                onClick={() => setSelectedJournalEntryId(action.journal_entry_id)}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                {action.journal_entry_consecutive}
                              </button>
                            ) : (
                              <span className="text-gray-400 dark:text-slate-500">Sin asiento</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-gray-600 dark:text-slate-300 text-sm">
                          {action.created_by || 'Sistema'}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-slate-300 text-sm">
                          {formatDateTime(action.created_at)}
                        </TableCell>
                        {hasManualActions && (
                          <TableCell>
                            {canReverse && (
                              <span
                                role="button"
                                onClick={() => handleReverseClick(action.id)}
                                title="Reversar saldos iniciales"
                                className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer text-red-600 dark:text-red-400"
                              >
                                <Undo2 className="h-4 w-4" />
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Página {page} de {totalPages} ({total} acciones)
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

          {/* Close button */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Modal de detalle de asiento */}
      {selectedJournalEntryId && (
        <JournalEntryDetail
          entryId={selectedJournalEntryId}
          mode="modal"
          open={!!selectedJournalEntryId}
          onClose={() => setSelectedJournalEntryId(null)}
          onNavigateToEntry={setSelectedJournalEntryId}
        />
      )}

      {/* Import dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className={previewData ? 'sm:max-w-[1200px] max-h-[85vh] flex flex-col' : 'sm:max-w-[500px]'}>
          <DialogHeader>
            <DialogTitle>
              {previewData ? 'Vista Previa - Saldos Iniciales' : 'Importar Saldos Iniciales'}
            </DialogTitle>
          </DialogHeader>

          {!previewData ? (
            /* Step 1: Upload */
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Descripción</label>
                <Input
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                  placeholder={`Saldos iniciales ${period?.year || ''}`}
                  className="mt-1"
                />
              </div>

              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="w-full"
                >
                  {downloadingTemplate ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar Plantilla Excel
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Archivo Excel</label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={previewing}>
                  Cancelar
                </Button>
                <Button onClick={handlePreview} disabled={previewing || !importFile}>
                  {previewing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    'Vista Previa'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Preview */
            <ImportPreviewContent
              previewData={previewData}
              previewSearch={previewSearch}
              onSearchChange={setPreviewSearch}
              onBack={handleBackToUpload}
              onConfirm={handleImport}
              importing={importing}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reverse confirmation */}
      <AlertDialog open={showReverseConfirm} onOpenChange={setShowReverseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reversar Saldos Iniciales</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción reversará el asiento de saldos iniciales, anulando todas las CxC, CxP y anticipos creados.
              Después de reversar podrá importar nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReverse}
              disabled={reversing}
              className="bg-red-600 hover:bg-red-700"
            >
              {reversing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reversando...
                </>
              ) : (
                'Reversar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

// ============ Import Preview Component ============

const PREPAYMENT_TYPE_LABELS: Record<string, string> = {
  customer: 'Cliente',
  supplier: 'Proveedor',
  employee: 'Empleado',
};

interface ImportPreviewContentProps {
  previewData: OpeningBalancePreviewResult;
  previewSearch: string;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  importing: boolean;
}

function ImportPreviewContent({
  previewData,
  previewSearch,
  onSearchChange,
  onBack,
  onConfirm,
  importing,
}: ImportPreviewContentProps) {
  const searchLower = previewSearch.toLowerCase();

  const filteredSaldos = previewData.saldoRows.filter((r) =>
    !searchLower ||
    r.account_code.toLowerCase().includes(searchLower) ||
    r.account_name.toLowerCase().includes(searchLower) ||
    r.description?.toLowerCase().includes(searchLower) ||
    r.third_party_name?.toLowerCase().includes(searchLower) ||
    r.bank_account_name?.toLowerCase().includes(searchLower)
  );

  const filteredCxc = previewData.cxcRows.filter((r) =>
    !searchLower ||
    r.third_party_name.toLowerCase().includes(searchLower) ||
    r.description?.toLowerCase().includes(searchLower) ||
    r.account_code.toLowerCase().includes(searchLower) ||
    r.account_name.toLowerCase().includes(searchLower)
  );

  const filteredCxp = previewData.cxpRows.filter((r) =>
    !searchLower ||
    r.third_party_name.toLowerCase().includes(searchLower) ||
    r.description?.toLowerCase().includes(searchLower) ||
    r.account_code.toLowerCase().includes(searchLower) ||
    r.account_name.toLowerCase().includes(searchLower)
  );

  const filteredPrepayments = previewData.prepaymentRows.filter((r) =>
    !searchLower ||
    r.third_party_name.toLowerCase().includes(searchLower) ||
    r.account_code.toLowerCase().includes(searchLower) ||
    r.account_name.toLowerCase().includes(searchLower) ||
    PREPAYMENT_TYPE_LABELS[r.type]?.toLowerCase().includes(searchLower)
  );

  const hasErrors = previewData.errors.length > 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-3">
      {/* Errors */}
      {hasErrors && (
        <div className="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-md p-3 max-h-[200px] overflow-auto">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
            Errores de validación ({previewData.errors.length})
          </p>
          <ul className="text-sm text-red-600 dark:text-red-300 space-y-1">
            {previewData.errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary + Search */}
      {!hasErrors && (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500 dark:text-slate-400">Total Débitos:</span>
          <FormattedNumber value={Number(previewData.totalDebit)} type="currency" className="font-semibold text-gray-900 dark:text-white" />
          <span className="text-gray-300 dark:text-slate-600">|</span>
          <span className="text-gray-500 dark:text-slate-400">Total Créditos:</span>
          <FormattedNumber value={Number(previewData.totalCredit)} type="currency" className="font-semibold text-gray-900 dark:text-white" />
        </div>
        <div className="flex-1" />
        <div className="relative w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar..."
            value={previewSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>
      )}

      {/* Tabs */}
      {!hasErrors && (
      <Tabs defaultValue="saldos" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-fit">
          <TabsTrigger value="saldos">
            Saldos ({previewData.saldoRows.length})
          </TabsTrigger>
          <TabsTrigger value="cxc">
            CxC ({previewData.cxcRows.length})
          </TabsTrigger>
          <TabsTrigger value="cxp">
            CxP ({previewData.cxpRows.length})
          </TabsTrigger>
          <TabsTrigger value="prepayments">
            Anticipos ({previewData.prepaymentRows.length})
          </TabsTrigger>
        </TabsList>

        {/* Saldos tab */}
        <TabsContent value="saldos" className="flex-1 overflow-auto border rounded-md mt-3">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-slate-700">
                <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Nombre Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 w-[80px]">Tipo</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[130px]">Monto</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Tercero</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Banco</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">CC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSaldos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                    {previewData.saldoRows.length === 0 ? 'Sin registros' : 'Sin resultados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSaldos.map((row, idx) => (
                  <TableRow key={idx} className="border-gray-200 dark:border-slate-700">
                    <TableCell className="text-sm font-mono">{row.account_code}</TableCell>
                    <TableCell className="text-sm">{row.account_name}</TableCell>
                    <TableCell>
                      <Badge className={row.type === 'DEBIT'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }>
                        {row.type === 'DEBIT' ? 'DB' : 'CR'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={row.amount} type="currency" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">{row.description || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">{row.third_party_name || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">{row.bank_account_name || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">
                      {row.cost_center_name
                        ? `${row.cost_center_name}${row.cost_center_movement_type_name ? ` (${row.cost_center_movement_type_name})` : ''}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* CxC tab */}
        <TabsContent value="cxc" className="flex-1 overflow-auto border rounded-md mt-3">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-slate-700">
                <TableHead className="text-gray-600 dark:text-slate-300">Tercero</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[130px]">Monto</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 w-[110px]">Vencimiento</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Nombre Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">CC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCxc.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    {previewData.cxcRows.length === 0 ? 'Sin registros' : 'Sin resultados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCxc.map((row, idx) => (
                  <TableRow key={idx} className="border-gray-200 dark:border-slate-700">
                    <TableCell className="text-sm">{row.third_party_name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">{row.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={row.amount} type="currency" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-sm">{new Date(row.due_date).toLocaleDateString('es-CO')}</TableCell>
                    <TableCell className="text-sm font-mono">{row.account_code}</TableCell>
                    <TableCell className="text-sm">{row.account_name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">
                      {row.cost_center_name
                        ? `${row.cost_center_name}${row.cost_center_movement_type_name ? ` (${row.cost_center_movement_type_name})` : ''}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* CxP tab */}
        <TabsContent value="cxp" className="flex-1 overflow-auto border rounded-md mt-3">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-slate-700">
                <TableHead className="text-gray-600 dark:text-slate-300">Tercero</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[130px]">Monto</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 w-[110px]">Vencimiento</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Nombre Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">CC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCxp.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    {previewData.cxpRows.length === 0 ? 'Sin registros' : 'Sin resultados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCxp.map((row, idx) => (
                  <TableRow key={idx} className="border-gray-200 dark:border-slate-700">
                    <TableCell className="text-sm">{row.third_party_name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">{row.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={row.amount} type="currency" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-sm">{new Date(row.due_date).toLocaleDateString('es-CO')}</TableCell>
                    <TableCell className="text-sm font-mono">{row.account_code}</TableCell>
                    <TableCell className="text-sm">{row.account_name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">
                      {row.cost_center_name
                        ? `${row.cost_center_name}${row.cost_center_movement_type_name ? ` (${row.cost_center_movement_type_name})` : ''}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Anticipos tab */}
        <TabsContent value="prepayments" className="flex-1 overflow-auto border rounded-md mt-3">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-slate-700">
                <TableHead className="text-gray-600 dark:text-slate-300">Tercero</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Tipo</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[130px]">Monto</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">Nombre Cuenta</TableHead>
                <TableHead className="text-gray-600 dark:text-slate-300">CC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrepayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    {previewData.prepaymentRows.length === 0 ? 'Sin registros' : 'Sin resultados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrepayments.map((row, idx) => (
                  <TableRow key={idx} className="border-gray-200 dark:border-slate-700">
                    <TableCell className="text-sm">{row.third_party_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {PREPAYMENT_TYPE_LABELS[row.type] || row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <FormattedNumber value={row.amount} type="currency" className="text-sm" />
                    </TableCell>
                    <TableCell className="text-sm font-mono">{row.account_code}</TableCell>
                    <TableCell className="text-sm">{row.account_name}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-slate-300">
                      {row.cost_center_name
                        ? `${row.cost_center_name}${row.cost_center_movement_type_name ? ` (${row.cost_center_movement_type_name})` : ''}`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button onClick={onConfirm} disabled={importing || hasErrors}>
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Confirmar Importación
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
