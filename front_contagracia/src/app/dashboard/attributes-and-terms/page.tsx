'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Tags } from 'lucide-react';
import { AttributesList } from '@/modules/inventory';

export default function AttributesAndTermsPage() {
  const { can } = usePermissions();

  return (
    <ProtectedRoute
      anyPermission={['inventory.attributes.view']}
      deniedMessage="No tienes permisos para ver Atributos."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Atributos y Opciones</h1>
            <p className="text-sm text-muted-foreground">Gestiona los atributos y sus opciones para combinaciones de productos.</p>
          </div>
        </header>

        <AttributesList
          canCreate={can('inventory.attributes.create')}
          canEdit={can('inventory.attributes.edit')}
          canDelete={can('inventory.attributes.delete')}
          canCreateOption={can('inventory.attribute_options.create')}
          canEditOption={can('inventory.attribute_options.edit')}
          canDeleteOption={can('inventory.attribute_options.delete')}
        />
      </div>
    </ProtectedRoute>
  );
}
