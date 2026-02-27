'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { BarChart3 } from 'lucide-react';
import { ProjectionsList } from '@/modules/projections';

export default function ProjectionsPage() {
  const { can } = usePermissions();

  const canCreate = can('cost_centers.projections.create');
  const canEdit = can('cost_centers.projections.edit');
  const canDelete = can('cost_centers.projections.delete');

  return (
    <ProtectedRoute
      permission="cost_centers.projections.view"
      deniedMessage="No tienes permisos para ver Proyecciones."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-violet-500 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proyecciones</h1>
            <p className="text-sm text-muted-foreground">Gestiona presupuestos y proyecciones por centro de costos o globales.</p>
          </div>
        </header>

        <ProjectionsList
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>
    </ProtectedRoute>
  );
}
