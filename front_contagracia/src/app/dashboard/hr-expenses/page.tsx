'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import { Receipt, Plus } from 'lucide-react';
import { TravelExpenseStats, TravelExpenseList, TravelExpenseForm, useHrExpenses } from '@/modules/hr-expenses';
import { employeesService } from '@/modules/hr';

interface SimpleEmployee {
  id: string;
  name: string;
}

export default function HrExpensesPage() {
  const { can } = usePermissions();
  const canCreate = can('hr_expenses.create');

  const {
    expenses,
    total,
    stats,
    loading,
    error,
    skip,
    take,
    statusFilter,
    categoryFilter,
    approve,
    reject,
    remove,
    paginate,
    filterByStatus,
    filterByCategory,
    refetch,
  } = useHrExpenses();

  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<SimpleEmployee[]>([]);

  useEffect(() => {
    if (!canCreate) return;
    const loadEmployees = async () => {
      try {
        const response = await employeesService.getAll({ limit: 500, status: 'ACTIVE' });
        setEmployees(
          response.data.map((e) => ({
            id: e.id,
            name: e.name || 'Sin nombre',
          }))
        );
      } catch {
        // silently fail
      }
    };
    loadEmployees();
  }, [canCreate]);

  const handleFormSuccess = () => {
    setShowForm(false);
    refetch();
  };

  return (
    <ProtectedRoute
      anyPermission={['hr_expenses.view', 'hr_expenses.request']}
      deniedMessage="No tienes permisos para ver Gastos Viaticos."
    >
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Gastos Viaticos
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona solicitudes de viaticos, anticipos y gastos de viaje.
                </p>
              </div>
            </div>
            {canCreate && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Viatico
              </Button>
            )}
          </div>
        </header>

        <TravelExpenseStats stats={stats} loading={loading} />

        <TravelExpenseList
          expenses={expenses}
          total={total}
          skip={skip}
          take={take}
          loading={loading}
          error={error}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          onPaginate={paginate}
          onFilterStatus={filterByStatus}
          onFilterCategory={filterByCategory}
          onApprove={approve}
          onReject={reject}
          onDelete={remove}
        />

        <TravelExpenseForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
          employees={employees}
        />
      </div>
    </ProtectedRoute>
  );
}
