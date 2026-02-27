'use client';

import { useState } from 'react';
import { Search, Eye, Pencil, Trash2, Banknote, Building2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
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
import { useBankAccounts } from '../hooks/useBankAccounts';
import { BankMovementsModal } from './BankMovementsModal';
import { BankAccountEditModal } from './BankAccountEditModal';
import { DeleteBankAccountModal } from './DeleteBankAccountModal';
import {
  BANK_ACCOUNT_TYPE_COLORS,
  BANK_ACCOUNT_TYPE_LABELS,
  type BankAccount,
  type BankAccountType,
} from '../types';

interface BankAccountsListProps {
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canViewMovements: boolean;
  hasAccountingModule: boolean;
}

const PAGE_SIZE = 20;

function getAccountIcon(type: BankAccountType) {
  switch (type) {
    case 'CASH':
      return <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    case 'SAVINGS':
      return <Banknote className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case 'CHECKING':
      return <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    default:
      return <Banknote className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
}

export function BankAccountsList({ canEdit, canDelete, canActivate, canDeactivate, canViewMovements, hasAccountingModule }: BankAccountsListProps) {
  const {
    bankAccounts,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    filterByType,
    setPage,
    refetch,
    searchTerm: savedSearch,
    typeFilter: savedType,
  } = useBankAccounts({ limit: PAGE_SIZE, includeInactive: true });

  const [searchInput, setSearchInput] = useState(savedSearch);
  const [typeFilter, setTypeFilter] = useState<string>(savedType ?? 'all');
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(searchInput);
    }
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    filterByType(value === 'all' ? undefined : (value as BankAccountType));
  };

  const handleViewMovements = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowMovementsModal(true);
  };

  const handleEdit = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowEditModal(true);
  };

  const handleDelete = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowDeleteModal(true);
  };

  const handleEditSuccess = () => {
    refetch();
  };

  const handleDeleteSuccess = () => {
    refetch();
  };

  if (loading && bankAccounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando cuentas bancarias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-red-600 dark:text-red-400">{error}</CardContent>
        </Card>
      )}

      {/* Table con Search integrado */}
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
              <span>Cuentas Bancarias</span>
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <div className="flex gap-2 flex-1 md:max-w-lg">
              <div className="w-[140px]">
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'SAVINGS', label: 'Ahorros' },
                    { value: 'CHECKING', label: 'Corriente' },
                    { value: 'CASH', label: 'Caja' },
                  ]}
                  value={typeFilter}
                  onChange={handleTypeChange}
                  placeholder="Tipo"
                  clearable={false}
                />
              </div>
              <form onSubmit={handleSearch} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar nombre o número..."
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
                  <TableHead className="text-gray-600 dark:text-slate-300">Cuenta</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Tipo</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Banco</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Número</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">
                    Saldo Actual
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center">
                    Estado
                  </TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron cuentas bancarias
                    </TableCell>
                  </TableRow>
                ) : (
                  bankAccounts.map((account) => (
                    <TableRow
                      key={account.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              account.account_type === 'CASH'
                                ? 'bg-amber-100 dark:bg-amber-900/30'
                                : account.account_type === 'SAVINGS'
                                  ? 'bg-blue-100 dark:bg-blue-900/30'
                                  : 'bg-green-100 dark:bg-green-900/30'
                            }`}
                          >
                            {getAccountIcon(account.account_type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {account.account_name}
                            </p>
                            {hasAccountingModule && account.account_id && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                                Cta: {account.account_id}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${BANK_ACCOUNT_TYPE_COLORS[account.account_type]}`}>
                          {BANK_ACCOUNT_TYPE_LABELS[account.account_type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white">
                          {account.bank_name || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white font-mono text-sm">
                          {account.account_number || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <FormattedNumber
                          value={account.current_balance}
                          type="currency"
                          className={`font-semibold ${
                            account.current_balance >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={account.is_active ? 'default' : 'secondary'}
                          className={
                            account.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          }
                        >
                          {account.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canViewMovements && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewMovements(account)}
                              title="Ver movimientos"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(account)}
                              title="Editar cuenta"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(account)}
                              title="Eliminar cuenta"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} cuentas)
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

      {/* Modal de Movimientos */}
      {selectedAccount && (
        <BankMovementsModal
          open={showMovementsModal}
          onOpenChange={setShowMovementsModal}
          bankAccount={selectedAccount}
        />
      )}

      {/* Modal de Edición */}
      <BankAccountEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        account={selectedAccount}
        hasAccountingModule={hasAccountingModule}
        canActivate={canActivate}
        canDeactivate={canDeactivate}
        onSuccess={handleEditSuccess}
      />

      {/* Modal de Eliminación */}
      <DeleteBankAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        account={selectedAccount}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
