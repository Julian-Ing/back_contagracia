'use client';

import { useState, useCallback } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Users, Plus } from 'lucide-react';
import { ThirdPartyForm, ThirdPartiesList, thirdPartiesService } from '@/modules/third-parties';
import type { ThirdParty } from '@/modules/third-parties';
import toast from 'react-hot-toast';

export default function ThirdPartiesPage() {
  const { can } = usePermissions();
  const canCreate = can('third_parties.create');
  const canEdit = can('third_parties.edit');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedThirdParty, setSelectedThirdParty] = useState<ThirdParty | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setRefreshKey((k) => k + 1);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedThirdParty(null);
    setRefreshKey((k) => k + 1);
  };

  const handleEdit = useCallback(async (thirdParty: ThirdParty) => {
    setLoadingEdit(true);
    try {
      // Cargar datos completos del tercero para edición
      const fullData = await thirdPartiesService.getOne(thirdParty.id);
      setSelectedThirdParty(fullData);
      setShowEditModal(true);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar tercero');
    } finally {
      setLoadingEdit(false);
    }
  }, []);

  return (
    <ProtectedRoute permission="third_parties.view" deniedMessage="No tienes permisos para ver Terceros.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 grid place-items-center rounded-lg bg-violet-500 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Terceros</h1>
                <p className="text-sm text-muted-foreground">Gestiona clientes, proveedores y entidades.</p>
              </div>
            </div>
            {canCreate && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tercero
              </Button>
            )}
          </div>
        </header>

        {/* Lista de terceros */}
        <ThirdPartiesList
          key={refreshKey}
          canEdit={canEdit}
          onEdit={handleEdit}
        />

        {/* Loading overlay for edit */}
        {loadingEdit && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
              <span>Cargando...</span>
            </div>
          </div>
        )}

        {/* Modal Crear */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Tercero</DialogTitle>
            </DialogHeader>
            <ThirdPartyForm
              mode="create"
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateModal(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Modal Editar */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tercero</DialogTitle>
            </DialogHeader>
            {selectedThirdParty && (
              <ThirdPartyForm
                mode="edit"
                initialData={selectedThirdParty}
                onSuccess={handleEditSuccess}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedThirdParty(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
