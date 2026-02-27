'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { MapPin } from 'lucide-react';
import { StoragesList } from '@/modules/inventory';

export default function StoragesPage() {
  const { can } = usePermissions();

  return (
    <ProtectedRoute
      module="inventory_management"
      anyPermission={['storages.view']}
      deniedMessage="No tienes permisos para ver Bodegas."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bodegas</h1>
            <p className="text-sm text-muted-foreground">Gestiona las bodegas de tus almacenes.</p>
          </div>
        </header>

        <StoragesList
          canCreate={can('storages.create')}
          canEdit={can('storages.edit')}
          canDelete={can('storages.delete')}
        />
      </div>
    </ProtectedRoute>
  );
}
