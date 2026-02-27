'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Ruler } from 'lucide-react';
import { CostCentersList } from '@/modules/cost-centers';

export default function CostCentersPage() {
  const { can } = usePermissions();

  const canCreate = can('cost_centers.create');
  const canEdit = can('cost_centers.edit');
  const canDelete = can('cost_centers.delete');

  return (
    <ProtectedRoute
      permission="cost_centers.view"
      deniedMessage="No tienes permisos para ver Centros de Costos."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centros de Costos</h1>
            <p className="text-sm text-muted-foreground">Gestiona la estructura jerárquica de centros de costos.</p>
          </div>
        </header>

        <CostCentersList
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>
    </ProtectedRoute>
  );
}
