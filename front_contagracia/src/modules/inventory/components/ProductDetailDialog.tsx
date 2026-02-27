'use client';

import {
  Dialog, DialogContent,
} from '@/shared/components/ui/dialog';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { ProductDetail } from './ProductDetail';

interface ProductDetailDialogProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductDetailDialog = ({ productId, open, onOpenChange }: ProductDetailDialogProps) => {
  const { can } = usePermissions();

  if (!productId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <ProductDetail
          productId={productId}
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
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
