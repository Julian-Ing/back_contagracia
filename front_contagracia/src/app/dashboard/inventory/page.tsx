'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Package } from 'lucide-react';
import { CategoriesList, ProductsList } from '@/modules/inventory';

export default function InventoryPage() {
  const { can } = usePermissions();

  const canViewProducts = can('inventory.items.view');
  const canCreateProduct = can('inventory.items.create');
  const canEditProduct = can('inventory.items.edit');
  const canViewCategories = can('inventory.categories.view');
  const canCreateCategory = can('inventory.categories.create');
  const canEditCategory = can('inventory.categories.edit');
  const canDeleteCategory = can('inventory.categories.delete');

  const defaultTab = canViewProducts ? 'products' : 'categories';

  return (
    <ProtectedRoute
      anyPermission={['inventory.items.view', 'inventory.categories.view']}
      deniedMessage="No tienes permisos para ver Inventario."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventario</h1>
            <p className="text-sm text-muted-foreground">Gestiona tus productos y categorías.</p>
          </div>
        </header>

        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {canViewProducts && <TabsTrigger value="products">Productos y Servicios</TabsTrigger>}
            {canViewCategories && <TabsTrigger value="categories">Categorías</TabsTrigger>}
          </TabsList>

          {canViewProducts && (
            <TabsContent value="products" className="mt-4">
              <ProductsList
                canCreate={canCreateProduct}
                canEdit={canEditProduct}
              />
            </TabsContent>
          )}

          {canViewCategories && (
            <TabsContent value="categories" className="mt-4">
              <CategoriesList
                canCreate={canCreateCategory}
                canEdit={canEditCategory}
                canDelete={canDeleteCategory}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
