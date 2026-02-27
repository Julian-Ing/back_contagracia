'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
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
import {
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  TrendingUp,
  TrendingDown,
  MinusCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { accountingPeriodsService } from '../services/accountingPeriods.service';
import { accountingConfigService, type AccountingConfigItem } from '../services/accountingConfig.service';
import { formatDate } from '@/shared/utils/formatDate';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { JournalEntryDetail } from './JournalEntryDetail';
import { AccountSelect } from '@/shared/components/ui/account-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import type { AccountingPeriod, ClosingPreviewResult, AccountMovement, AccountInfo, ClosingConfirmData } from '../types/accountingPeriods';

interface ClosingPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ClosingConfirmData) => Promise<void>;
  period: AccountingPeriod | null;
}

const ITEMS_PER_PAGE = 20;

export function ClosingPreviewModal({
  open,
  onClose,
  onConfirm,
  period,
}: ClosingPreviewModalProps) {
  const { can } = usePermissions();
  const canViewPreview = can('closing.periods.view');
  const canViewJournalDetail = can('journal_entries.view_detail');
  const canConfigureClosingAccounts = can('accounting.closing_accounts.configure');

  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [preview, setPreview] = useState<ClosingPreviewResult | null>(null);
  const [selectedJournalEntryId, setSelectedJournalEntryId] = useState<string | null>(null);

  // Cuentas de cierre
  const [retainedEarningsConfig, setRetainedEarningsConfig] = useState<AccountingConfigItem | null>(null);
  const [previousYearConfig, setPreviousYearConfig] = useState<AccountingConfigItem | null>(null);
  const [closingAccount, setClosingAccount] = useState('');
  const [openingAccount, setOpeningAccount] = useState('');

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'income' | 'expenses' | 'costs'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Cargar configuración de cuentas de cierre al abrir
  useEffect(() => {
    if (open && period) {
      loadClosingConfig();
    }
  }, [open, period]);

  const loadClosingConfig = async () => {
    setLoadingConfig(true);
    try {
      const [retained, previous] = await Promise.all([
        accountingConfigService.getByKey('accounting_retained_earnings'),
        accountingConfigService.getByKey('accounting_previous_year_results'),
      ]);
      setRetainedEarningsConfig(retained);
      setPreviousYearConfig(previous);
      setClosingAccount(retained?.account_code || '');
      setOpeningAccount(previous?.account_code || '');
    } catch (err) {
      console.error('Error loading closing config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Cargar preview cuando se expande el detalle
  useEffect(() => {
    if (showDetail && period && !preview) {
      loadPreview();
    }
  }, [showDetail, period]);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setReason('');
      setError(null);
      setShowDetail(false);
      setPreview(null);
      setSearchQuery('');
      setSelectedAccount('');
      setSelectedCategory('all');
      setCurrentPage(1);
      setRetainedEarningsConfig(null);
      setPreviousYearConfig(null);
      setClosingAccount('');
      setOpeningAccount('');
    }
  }, [open]);

  const loadPreview = async () => {
    if (!period) return;
    setLoadingPreview(true);
    try {
      const data = await accountingPeriodsService.getClosingPreview(period.id);
      setPreview(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el detalle');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Combinar todos los movimientos
  const allMovements = useMemo(() => {
    if (!preview) return [];
    const movements: (AccountMovement & { category: string })[] = [];

    preview.income.movements.forEach(m => movements.push({ ...m, category: 'income' }));
    preview.expenses.movements.forEach(m => movements.push({ ...m, category: 'expenses' }));
    preview.costs.movements.forEach(m => movements.push({ ...m, category: 'costs' }));

    return movements;
  }, [preview]);

  // Obtener cuentas únicas para el select
  const accountOptions = useMemo(() => {
    if (!preview) return [];
    const accounts = new Map<string, AccountInfo>();

    [...preview.income.accounts_included, ...preview.expenses.accounts_included, ...preview.costs.accounts_included]
      .forEach(a => accounts.set(a.code, a));

    return Array.from(accounts.values())
      .sort((a, b) => a.code.localeCompare(b.code))
      .map(a => ({ value: a.code, label: `${a.code} - ${a.name}` }));
  }, [preview]);

  // Filtrar movimientos
  const filteredMovements = useMemo(() => {
    let filtered = allMovements;

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    // Filtrar por cuenta
    if (selectedAccount) {
      filtered = filtered.filter(m => m.account_code === selectedAccount);
    }

    // Búsqueda fuzzy
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.description?.toLowerCase().includes(query) ||
        m.journal_entry_description?.toLowerCase().includes(query) ||
        m.journal_entry_consecutive.toLowerCase().includes(query) ||
        m.third_party_name?.toLowerCase().includes(query) ||
        m.third_party_identification?.toLowerCase().includes(query) ||
        m.bank_account_name?.toLowerCase().includes(query) ||
        m.account_name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allMovements, selectedCategory, selectedAccount, searchQuery]);

  // Paginación
  const totalPages = Math.ceil(filteredMovements.length / ITEMS_PER_PAGE);
  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedAccount, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!closingAccount) {
      setError('La cuenta de cierre es requerida');
      return;
    }

    if (!openingAccount) {
      setError('La cuenta de apertura es requerida');
      return;
    }

    if (!reason.trim()) {
      setError('La razón es requerida');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onConfirm({
        reason: reason.trim(),
        closingAccountCode: closingAccount,
        openingAccountCode: openingAccount,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al cerrar el período');
    } finally {
      setLoading(false);
    }
  };

  if (!period) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !loading && onClose()}>
      <DialogContent className={`${showDetail ? 'sm:max-w-[95vw] max-h-[90vh]' : 'sm:max-w-[500px]'} overflow-hidden flex flex-col`}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Cerrar Período</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                {period.name} ({period.consecutive})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-2">
          {/* Botón Ver Detalle */}
          {canViewPreview && (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setShowDetail(!showDetail)}
              disabled={loadingPreview}
            >
              <span className="flex items-center gap-2">
                {loadingPreview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showDetail ? 'Ocultar Detalle' : 'Ver Detalle de Cierre'}
              </span>
              {showDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}

          {/* Vista de Detalle */}
          {showDetail && preview && (
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50 dark:bg-slate-800/50">
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs font-medium">Ingresos (4)</span>
                  </div>
                  <p className="text-lg font-bold text-green-600"><FormattedNumber value={preview.income.balance} type="currency" /></p>
                  <p className="text-xs text-muted-foreground">{preview.income.movements_count} movimientos</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-red-600 mb-1">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-xs font-medium">Gastos (5)</span>
                  </div>
                  <p className="text-lg font-bold text-red-600"><FormattedNumber value={preview.expenses.balance} type="currency" /></p>
                  <p className="text-xs text-muted-foreground">{preview.expenses.movements_count} movimientos</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <MinusCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Costos (6)</span>
                  </div>
                  <p className="text-lg font-bold text-orange-600"><FormattedNumber value={preview.costs.balance} type="currency" /></p>
                  <p className="text-xs text-muted-foreground">{preview.costs.movements_count} movimientos</p>
                </div>

                <div className={`bg-white dark:bg-slate-800 rounded-lg p-3 border-2 ${preview.net_income >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">Utilidad Neta</span>
                  </div>
                  <p className={`text-lg font-bold ${preview.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <FormattedNumber value={preview.net_income} type="currency" />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {preview.net_income >= 0 ? 'Ganancia' : 'Pérdida'}
                  </p>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por descripción, consecutivo, tercero, banco..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="w-full md:w-[200px]">
                  <SearchableSelect
                    options={[
                      { value: 'all', label: 'Todas las categorías' },
                      { value: 'income', label: 'Ingresos (4)' },
                      { value: 'expenses', label: 'Gastos (5)' },
                      { value: 'costs', label: 'Costos (6)' },
                    ]}
                    value={selectedCategory}
                    onChange={(v) => setSelectedCategory(v as any)}
                    placeholder="Categoría..."
                  />
                </div>

                <div className="w-full md:w-[250px]">
                  <SearchableSelect
                    options={[{ value: '', label: 'Todas las cuentas' }, ...accountOptions]}
                    value={selectedAccount}
                    onChange={setSelectedAccount}
                    placeholder="Filtrar por cuenta..."
                  />
                </div>
              </div>

              {/* Tabla de movimientos */}
              <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50 dark:bg-slate-700">
                      <TableRow>
                        <TableHead className="text-xs w-[80px]">Fecha</TableHead>
                        <TableHead className="text-xs w-[90px]">Asiento</TableHead>
                        <TableHead className="text-xs">Cuenta</TableHead>
                        <TableHead className="text-xs">Descripción</TableHead>
                        <TableHead className="text-xs">Tercero</TableHead>
                        <TableHead className="text-xs">Banco</TableHead>
                        <TableHead className="text-xs text-right w-[100px]">Débito</TableHead>
                        <TableHead className="text-xs text-right w-[100px]">Crédito</TableHead>
                        <TableHead className="text-xs w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No se encontraron movimientos
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedMovements.map((m) => (
                          <TableRow key={m.id} className="text-xs">
                            <TableCell className="py-1.5">{formatDate(m.date)}</TableCell>
                            <TableCell className="py-1.5 font-mono">{m.journal_entry_consecutive}</TableCell>
                            <TableCell className="py-1.5">
                              <span className="font-mono text-muted-foreground">{m.account_code}</span>
                              <span className="ml-1">{m.account_name}</span>
                            </TableCell>
                            <TableCell className="py-1.5 max-w-[200px] truncate" title={m.description || m.journal_entry_description || ''}>
                              {m.description || m.journal_entry_description || '-'}
                            </TableCell>
                            <TableCell className="py-1.5">
                              {m.third_party_name ? (
                                <span title={m.third_party_identification || ''}>
                                  {m.third_party_name}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="py-1.5">{m.bank_account_name || '-'}</TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-green-600">
                              {m.type === 'DEBIT' ? <FormattedNumber value={m.amount} type="currency" /> : '-'}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-mono text-red-600">
                              {m.type === 'CREDIT' ? <FormattedNumber value={m.amount} type="currency" /> : '-'}
                            </TableCell>
                            <TableCell className="py-1.5">
                              {canViewJournalDetail && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => setSelectedJournalEntryId(m.journal_entry_id)}
                                  title="Ver asiento"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50 dark:bg-slate-700">
                    <p className="text-xs text-muted-foreground">
                      {filteredMovements.length} movimientos • Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-7 text-xs"
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-7 text-xs"
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading preview */}
          {showDetail && loadingPreview && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}

          {/* Configuración de cuentas de cierre */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="closingAccount">
                Cuenta de Cierre (Utilidad del Ejercicio) <span className="text-red-500">*</span>
              </Label>
              <AccountSelect
                value={closingAccount}
                valueLabel={closingAccount && retainedEarningsConfig?.account ? `${closingAccount} - ${retainedEarningsConfig.account.name}` : undefined}
                onChange={(code) => setClosingAccount(code)}
                placeholder="Seleccionar cuenta..."
                includePrefixes="36"
                disabled={!canConfigureClosingAccounts || loadingConfig}
                showCreateButton={false}
              />
              {retainedEarningsConfig?.default && (
                <p className="text-xs text-muted-foreground">
                  Por defecto: {retainedEarningsConfig.default}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingAccount">
                Cuenta de Apertura (Resultados Anteriores) <span className="text-red-500">*</span>
              </Label>
              <AccountSelect
                value={openingAccount}
                valueLabel={openingAccount && previousYearConfig?.account ? `${openingAccount} - ${previousYearConfig.account.name}` : undefined}
                onChange={(code) => setOpeningAccount(code)}
                placeholder="Seleccionar cuenta..."
                includePrefixes="37"
                disabled={!canConfigureClosingAccounts || loadingConfig}
                showCreateButton={false}
              />
              {previousYearConfig?.default && (
                <p className="text-xs text-muted-foreground">
                  Por defecto: {previousYearConfig.default}
                </p>
              )}
            </div>
          </div>

          {/* Formulario de confirmación */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Razón del cierre <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Ej: Cierre mensual de enero, cierre anual fiscal..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                disabled={loading}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={loading || !reason.trim() || !closingAccount || !openingAccount}
              >
                {loading ? 'Cerrando...' : 'Cerrar Período'}
              </Button>
            </div>
          </form>
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
    </Dialog>
  );
}
