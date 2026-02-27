'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { ListTree, ChevronRight, ChevronDown, Plus, Loader2, Search, Trash2, Pencil } from 'lucide-react';
import { useChartOfAccounts, AccountForm, type ChartOfAccountNode, type AccountType } from '@/modules/accounting';
import { Button } from '@/shared/components/ui/button';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import toast from 'react-hot-toast';
import { usePermissions } from '@/shared/hooks';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: 'Activo',
  LIABILITY: 'Pasivo',
  EQUITY: 'Patrimonio',
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  COST: 'Costo',
  PRODUCTION_COST: 'Costo de Producción',
  DEBTOR_ACCOUNTS: 'Cuentas Deudoras',
  CREDITOR_ACCOUNTS: 'Cuentas Acreedoras',
};

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  ASSET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  LIABILITY: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  EQUITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  INCOME: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  EXPENSE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  COST: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  PRODUCTION_COST: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  DEBTOR_ACCOUNTS: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  CREDITOR_ACCOUNTS: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
};

const ACCOUNT_TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  ...Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

function AccountTreeNode({
  account,
  level = 0,
  defaultExpanded = false,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}: {
  account: ChartOfAccountNode;
  level?: number;
  defaultExpanded?: boolean;
  onEdit: (account: ChartOfAccountNode) => void;
  onDelete: (account: ChartOfAccountNode) => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 1);
  const hasChildren = account.children && account.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg group ${
          account._matched ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        <span
          className="w-5 h-5 flex items-center justify-center text-gray-400 cursor-pointer"
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="w-4" />
          )}
        </span>

        <span className="font-mono text-sm text-gray-500 dark:text-gray-400 min-w-[80px]">
          {account.code}
        </span>

        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
          {account.name}
        </span>

        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${ACCOUNT_TYPE_COLORS[account.type]}`}
        >
          {ACCOUNT_TYPE_LABELS[account.type]}
        </span>

        {canEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(account);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-opacity"
            title="Editar cuenta"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}

        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(account);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
            title="Eliminar cuenta"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {account.children.map((child) => (
            <AccountTreeNode
              key={child.code}
              account={child}
              level={level + 1}
              defaultExpanded={defaultExpanded}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const searchParams = useSearchParams();
  const {
    accounts,
    total,
    filtered,
    loading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    deleteAccount,
    refetch,
  } = useChartOfAccounts();

  const { can } = usePermissions();

  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccountNode | null>(null);
  const [accountToEdit, setAccountToEdit] = useState<ChartOfAccountNode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createPrefix, setCreatePrefix] = useState<string | undefined>(undefined);

  // Leer query params para abrir modal automáticamente
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    const prefix = searchParams.get('prefix') || undefined;

    if (shouldCreate) {
      setCreatePrefix(prefix);
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  const canCreate = can('chart_of_accounts.create');
  const canEdit = can('chart_of_accounts.edit');
  const canDelete = can('chart_of_accounts.delete');

  const hasFilters = search || typeFilter;

  const handleDelete = async () => {
    if (!accountToDelete) return;

    setDeleting(true);
    try {
      const result = await deleteAccount(accountToDelete.code);
      toast.success(result.message);
      setAccountToDelete(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar la cuenta');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ProtectedRoute permission="chart_of_accounts.view" deniedMessage="No tienes permisos para ver el Plan de Cuentas.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-emerald-500 text-white">
                <ListTree className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plan de Cuentas</h1>
                <p className="text-sm text-muted-foreground">
                  {hasFilters && filtered !== undefined
                    ? `${filtered} de ${total} cuentas`
                    : total > 0
                    ? `${total} cuentas registradas`
                    : 'Gestiona la estructura de tus cuentas contables.'}
                </p>
              </div>
            </div>

            {canCreate && (
              <Button onClick={() => { setCreatePrefix(undefined); setCreateModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Cuenta
              </Button>
            )}
          </div>
        </header>

        {/* Filtros */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400"
            />
          </div>
          <div className="w-full sm:w-64">
            <SearchableSelect
              options={ACCOUNT_TYPE_OPTIONS}
              value={typeFilter}
              onChange={setTypeFilter}
              placeholder="Filtrar por tipo"
              searchPlaceholder="Buscar tipo..."
              clearable
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20 text-red-500">
              <p>{error}</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
              <ListTree className="h-12 w-12 mb-4" />
              <p>{hasFilters ? 'No se encontraron cuentas con los filtros aplicados' : 'No hay cuentas registradas'}</p>
            </div>
          ) : (
            <div className="py-2">
              {accounts.map((account) => (
                <AccountTreeNode
                  key={account.code}
                  account={account}
                  defaultExpanded={!!hasFilters}
                  onEdit={setAccountToEdit}
                  onDelete={setAccountToDelete}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      <AlertDialog open={!!accountToDelete} onOpenChange={() => !deleting && setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar la cuenta <strong>{accountToDelete?.code} - {accountToDelete?.name}</strong>?
              <br />
              <span className="text-red-500">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de crear cuenta */}
      <Dialog
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setCreatePrefix(undefined);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createPrefix ? `Crear cuenta (prefijo ${createPrefix})` : 'Crear cuenta'}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            mode="create"
            codePrefix={createPrefix}
            onSuccess={() => {
              setCreateModalOpen(false);
              setCreatePrefix(undefined);
              refetch();
            }}
            onCancel={() => {
              setCreateModalOpen(false);
              setCreatePrefix(undefined);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de editar cuenta */}
      <Dialog open={!!accountToEdit} onOpenChange={() => setAccountToEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
          </DialogHeader>
          {accountToEdit && (
            <AccountForm
              mode="edit"
              initialData={{
                code: accountToEdit.code,
                name: accountToEdit.name,
              }}
              onSuccess={() => {
                setAccountToEdit(null);
                refetch();
              }}
              onCancel={() => setAccountToEdit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
