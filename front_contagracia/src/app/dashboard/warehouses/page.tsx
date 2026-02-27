'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Warehouse } from 'lucide-react';
import { WarehousesList } from '@/modules/inventory';

export default function WarehousesPage() {
  const { can } = usePermissions();

  return (
    <ProtectedRoute
      module="inventory_management"
      anyPermission={['warehouses.view']}
      deniedMessage="No tienes permisos para ver Almacenes."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Almacenes</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus almacenes y sus bodegas.</p>
          </div>
        </header>

        <WarehousesList
          canCreate={can('warehouses.create')}
          canEdit={can('warehouses.edit')}
          canDelete={can('warehouses.delete')}
        />
      </div>
    </ProtectedRoute>
  );
}
