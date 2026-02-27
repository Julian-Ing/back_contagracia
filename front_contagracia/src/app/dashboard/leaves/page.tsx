'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import { Calendar, Plus } from 'lucide-react';
import { LeaveStats, LeaveList, LeaveForm, useLeaves } from '@/modules/leaves';
import { employeesService } from '@/modules/hr';

interface SimpleEmployee {
  id: string;
  name: string;
}

export default function LeavesPage() {
  const { can } = usePermissions();
  const canCreate = can('leaves.create');

  const {
    leaves,
    total,
    stats,
    loading,
    error,
    skip,
    take,
    statusFilter,
    typeFilter,
    approve,
    reject,
    remove,
    paginate,
    filterByStatus,
    filterByType,
    refetch,
  } = useLeaves();

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
      anyPermission={['leaves.view', 'leaves.request']}
      deniedMessage="No tienes permisos para ver Vacaciones y Ausencias."
    >
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-teal-500 text-white">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Vacaciones y Ausencias
                </h1>
                <p className="text-sm text-muted-foreground">
                  Gestiona las solicitudes de vacaciones, licencias e incapacidades.
                </p>
              </div>
            </div>
            {canCreate && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Solicitud
              </Button>
            )}
          </div>
        </header>

        <LeaveStats stats={stats} loading={loading} />

        <LeaveList
          leaves={leaves}
          total={total}
          skip={skip}
          take={take}
          loading={loading}
          error={error}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          onPaginate={paginate}
          onFilterStatus={filterByStatus}
          onFilterType={filterByType}
          onApprove={approve}
          onReject={reject}
          onDelete={remove}
        />

        <LeaveForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
          employees={employees}
        />
      </div>
    </ProtectedRoute>
  );
}
