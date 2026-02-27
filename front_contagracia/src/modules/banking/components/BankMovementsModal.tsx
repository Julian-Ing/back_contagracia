'use client';

import { useState } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
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
import { useBankMovements } from '../hooks/useBankMovements';
import { formatDate } from '@/shared/utils/formatDate';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  getMovementTypeColor,
  INCOME_MOVEMENT_TYPES,
  EXPENSE_MOVEMENT_TYPES,
  type BankAccount,
} from '../types';

interface BankMovementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccount: BankAccount;
}


function getMovementIcon(typeKey: string) {
  if (INCOME_MOVEMENT_TYPES.includes(typeKey)) {
    return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
  }
  if (EXPENSE_MOVEMENT_TYPES.includes(typeKey)) {
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  }
  return <RefreshCw className="h-4 w-4 text-blue-600" />;
}

export function BankMovementsModal({
  open,
  onOpenChange,
  bankAccount,
}: BankMovementsModalProps) {
  const [searchInput, setSearchInput] = useState('');

  const {
    movements,
    total,
    page,
    totalPages,
    loading,
    error,
    search,
    setPage,
  } = useBankMovements({
    bankAccountId: bankAccount.id,
    limit: 15,
    enabled: open,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search(searchInput);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b dark:border-slate-700">
          <DialogTitle className="flex items-center gap-3">
            <span className="text-lg">Movimientos de</span>
            <Badge variant="outline" className="text-base font-normal">
              {bankAccount.account_name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4 py-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por consecutivo, descripción o referencia..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg dark:border-slate-700">
            {loading && movements.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
                  <p className="text-gray-500 dark:text-slate-400 text-sm">
                    Cargando movimientos...
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                    <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">
                      Fecha
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">
                      Consecutivo
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">
                      Tipo
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">
                      Descripción
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300">
                      Referencia
                    </TableHead>
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right">
                      Monto
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-12 text-gray-500 dark:text-slate-400"
                      >
                        No hay movimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((movement) => (
                      <TableRow
                        key={movement.id}
                        className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                      >
                        <TableCell className="text-sm text-gray-600 dark:text-slate-400">
                          {formatDate(movement.transaction_date)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {movement.consecutive}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMovementIcon(movement.type_key)}
                            <Badge className={`${getMovementTypeColor(movement.type_key)} text-xs`}>
                              {movement.type_description}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-700 dark:text-slate-300 line-clamp-1">
                            {movement.description || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 dark:text-slate-400 font-mono">
                            {movement.reference_consecutive}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold ${
                              INCOME_MOVEMENT_TYPES.includes(movement.type_key)
                                ? 'text-green-600 dark:text-green-400'
                                : EXPENSE_MOVEMENT_TYPES.includes(movement.type_key)
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {INCOME_MOVEMENT_TYPES.includes(movement.type_key) ? '+' : ''}
                            {EXPENSE_MOVEMENT_TYPES.includes(movement.type_key) ? '-' : ''}
                            <FormattedNumber value={Math.abs(movement.amount)} type="currency" />
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Página {page} de {totalPages} ({total} movimientos)
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
