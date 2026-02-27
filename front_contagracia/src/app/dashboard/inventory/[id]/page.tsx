'use client';

import { use } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ProductDetail } from '@/modules/inventory/components/ProductDetail';

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { id } = use(params);
  const { can } = usePermissions();

  return (
    <ProtectedRoute
      anyPermission={['inventory.items.view_detail']}
      deniedMessage="No tienes permisos para ver el detalle del producto."
    >
      <div className="p-6">
        <ProductDetail
          productId={id}
          canCreate={can('inventory.items.create')}
          canEdit={can('inventory.items.edit')}
          canDelete={can('inventory.items.delete')}
          canViewStock={can('inventory.stock.view')}
          canManageProductAttributes={can('inventory.combinations.manage_attributes')}
          canViewCombinations={can('inventory.combinations.view')}
          canCreateCombination={can('inventory.combinations.create')}
          canEditCombination={can('inventory.combinations.edit')}
          canDeleteCombination={can('inventory.combinations.delete')}
          canViewProductTransfers={can('inventory.product_transfers.view')}
          canCreateProductTransfer={can('inventory.product_transfers.create')}
          canApproveRejectProductTransfer={can('inventory.product_transfers.approve_reject')}
          canCreateAdjustment={can('inventory.adjustments.create')}
        />
      </div>
    </ProtectedRoute>
  );
}
