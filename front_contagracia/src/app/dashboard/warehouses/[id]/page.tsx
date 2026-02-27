'use client';

import { use } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { WarehouseDetail } from '@/modules/inventory/components/WarehouseDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default function WarehouseDetailPage({ params }: Props) {
  const { id } = use(params);
  const { can } = usePermissions();

  return (
    <ProtectedRoute
      module="inventory_management"
      anyPermission={['warehouses.view']}
      deniedMessage="No tienes permisos para ver este almacén."
    >
      <div className="p-6">
        <WarehouseDetail
          warehouseId={id}
          canAssignUsers={can('warehouses.users.assign')}
        />
      </div>
    </ProtectedRoute>
  );
}
