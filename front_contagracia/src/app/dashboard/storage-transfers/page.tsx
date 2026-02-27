'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ArrowLeftRight } from 'lucide-react';
import { StorageTransfersList } from '@/modules/inventory';

export default function StorageTransfersPage() {
  const { can } = usePermissions();

  return (
    <ProtectedRoute
      module="inventory_management"
      permission="transfers.view"
      deniedMessage="No tienes permisos para ver Transferencias."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transferencias entre Bodegas</h1>
            <p className="text-sm text-muted-foreground">Gestiona las transferencias de stock entre bodegas.</p>
          </div>
        </header>

        <StorageTransfersList
          canCreate={can('transfers.create')}
          canApprove={can('transfers.approve')}
          canReject={can('transfers.reject')}
        />
      </div>
    </ProtectedRoute>
  );
}
