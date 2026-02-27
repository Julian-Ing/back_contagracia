'use client';

import { useState, useEffect } from 'react';
import { Search, Percent, ArrowDownFromLine, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { useTaxes, useTaxTypes } from '../hooks/useTaxes';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { TaxFormModal } from './TaxFormModal';
import { DeleteTaxModal } from './DeleteTaxModal';
import type { Tax } from '../types';

const PAGE_SIZE = 20;

export function TaxesList() {
  const [activeTab, setActiveTab] = useState<'taxes' | 'withholdings'>(() => {
    try {
      const v = localStorage.getItem('filters:active-tab:tax-withholdings');
      if (v === 'withholdings') return 'withholdings';
    } catch {}
    return 'taxes';
  });

  const { can } = usePermissions();
  const canAssignAccounts = can('accounting.tax.accounts.assign');
  const canCreate = can('tax.rates.create');
  const canEdit = can('tax.rates.edit');
  const canActivate = can('tax.rates.activate');
  const canDeactivate = can('tax.rates.deactivate');
  const canDelete = can('tax.rates.delete');

  const is_tax = activeTab === 'taxes';

  const {
    taxes,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    filterByTaxType,
    setPage,
    refetch,
    searchTerm: savedSearch,
    taxTypeFilter: savedTaxType,
  } = useTaxes({ limit: PAGE_SIZE, is_tax });

  const [searchInput, setSearchInput] = useState(savedSearch);
  const [taxTypeFilter, setTaxTypeFilter] = useState<string>(savedTaxType != null ? String(savedTaxType) : 'all');

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null);

  // Persist activeTab
  useEffect(() => {
    try { localStorage.setItem('filters:active-tab:tax-withholdings', activeTab); } catch {}
  }, [activeTab]);

  // Sync local state when tab changes (hook has different storage per tab)
  useEffect(() => {
    setSearchInput(savedSearch);
    setTaxTypeFilter(savedTaxType != null ? String(savedTaxType) : 'all');
  }, [activeTab, savedSearch, savedTaxType]);

  const { taxTypes } = useTaxTypes(is_tax);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(searchInput);
    }
  };

  const handleTaxTypeChange = (value: string) => {
    setTaxTypeFilter(value);
    filterByTaxType(value === 'all' ? undefined : parseInt(value, 10));
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'taxes' | 'withholdings');
    setSearchInput('');
    setTaxTypeFilter('all');
  };

  const handleCreate = () => {
    setSelectedTax(null);
    setFormModalOpen(true);
  };

  const handleEdit = (tax: Tax) => {
    setSelectedTax(tax);
    setFormModalOpen(true);
  };

  const handleDelete = (tax: Tax) => {
    setSelectedTax(tax);
    setDeleteModalOpen(true);
  };

  const handleFormSuccess = () => {
    refetch();
  };

  const handleDeleteSuccess = () => {
    refetch();
  };

  const taxTypeOptions = [
    { value: 'all', label: 'Todos los tipos' },
    ...taxTypes.map((tt) => ({ value: String(tt.id), label: tt.name })),
  ];

  if (loading && taxes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="taxes" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Impuestos
          </TabsTrigger>
          <TabsTrigger value="withholdings" className="flex items-center gap-2">
            <ArrowDownFromLine className="h-4 w-4" />
            Retenciones
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Error */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
                <span>{activeTab === 'taxes' ? 'Impuestos' : 'Retenciones'}</span>
                <Badge variant="secondary">{total}</Badge>
              </CardTitle>
              {canCreate && (
                <Button size="sm" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Crear
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-1 md:max-w-lg">
              <div className="w-[180px]">
                <SearchableSelect
                  options={taxTypeOptions}
                  value={taxTypeFilter}
                  onChange={handleTaxTypeChange}
                  placeholder="Tipo"
                  clearable={false}
                />
              </div>
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
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
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">Tasa %</TableHead>
                  {canAssignAccounts && (
                    <>
                      <TableHead className="text-gray-600 dark:text-slate-300">Cta Ventas</TableHead>
                      <TableHead className="text-gray-600 dark:text-slate-300">Cta Compras</TableHead>
                      {is_tax && <TableHead className="text-gray-600 dark:text-slate-300">Cta Costo</TableHead>}
                    </>
                  )}
                  <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                  {(canEdit || canDelete) && (
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canAssignAccounts ? (is_tax ? 8 : 7) : 5}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron {activeTab === 'taxes' ? 'impuestos' : 'retenciones'}
                    </TableCell>
                  </TableRow>
                ) : (
                  taxes.map((tax) => (
                    <TableRow
                      key={tax.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {tax.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            tax.tax_type?.is_tax
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
                          }
                        >
                          {tax.tax_type?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          <FormattedNumber value={tax.rate} type="number" />%
                        </span>
                      </TableCell>
                      {canAssignAccounts && (
                        <>
                          <TableCell>
                            {(() => {
                              const acc = is_tax ? tax.tax_sales_account : tax.withholding_sales_account;
                              return acc ? (
                                <span className="text-xs text-gray-600 dark:text-slate-400">
                                  <span className="font-mono">{acc.code}</span> - {acc.name}
                                </span>
                              ) : <span className="text-gray-400">-</span>;
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const acc = is_tax ? tax.tax_purchases_account : tax.withholding_purchases_account;
                              return acc ? (
                                <span className="text-xs text-gray-600 dark:text-slate-400">
                                  <span className="font-mono">{acc.code}</span> - {acc.name}
                                </span>
                              ) : <span className="text-gray-400">-</span>;
                            })()}
                          </TableCell>
                          {is_tax && (
                            <TableCell>
                              {tax.tax_cost_account ? (
                                <span className="text-xs text-gray-600 dark:text-slate-400">
                                  <span className="font-mono">{tax.tax_cost_account.code}</span> - {tax.tax_cost_account.name}
                                </span>
                              ) : <span className="text-gray-400">-</span>}
                            </TableCell>
                          )}
                        </>
                      )}
                      <TableCell>
                        <span className="text-gray-600 dark:text-slate-400 text-sm">
                          {tax.description || '-'}
                        </span>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && !tax.is_system && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(tax)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && !tax.is_system && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(tax)}
                                title="Eliminar"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
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
            Página {page} de {totalPages} ({total} registros)
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

      {/* Modals */}
      <TaxFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        tax={selectedTax}
        is_tax={is_tax}
        canActivate={canActivate}
        canDeactivate={canDeactivate}
        onSuccess={handleFormSuccess}
      />

      <DeleteTaxModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        tax={selectedTax}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
