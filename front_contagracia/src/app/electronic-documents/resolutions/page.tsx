'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/shared/hooks';
import { resolutionsService, type Resolution } from '@/modules/electronic-documents/services/resolutions.service';
import { ResolutionFormDialog } from '@/modules/electronic-documents/components/ResolutionFormDialog';

export default function ResolutionsPage() {
  const { can } = usePermissions();
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const canCreate = can('electronic_documents.resolutions.create');
  const canEdit = can('electronic_documents.resolutions.edit');
  const canDelete = can('electronic_documents.resolutions.delete');

  useEffect(() => {
    loadResolutions();
  }, [includeInactive]);

  const loadResolutions = async () => {
    setLoading(true);
    try {
      const isActiveFilter = includeInactive ? undefined : 'active';
      const data = await resolutionsService.getAll(undefined, undefined, isActiveFilter);
      setResolutions(data);
    } catch (error: any) {
      toast.error('Error al cargar resoluciones');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!canCreate) {
      toast.error('No tienes permiso para crear resoluciones');
      return;
    }
    setSelectedResolution(null);
    setDialogOpen(true);
  };

  const handleEdit = (resolution: Resolution) => {
    if (!canEdit) {
      toast.error('No tienes permiso para editar resoluciones');
      return;
    }
    setSelectedResolution(resolution);
    setDialogOpen(true);
  };

  const handleDelete = async (resolution: Resolution) => {
    if (!canDelete) {
      toast.error('No tienes permiso para eliminar resoluciones');
      return;
    }

    if (!confirm(`¿Desactivar la resolución ${resolution.prefix} - ${resolution.resolution_number}?`)) {
      return;
    }

    try {
      await resolutionsService.delete(resolution.id);
      toast.success('Resolución desactivada exitosamente');
      loadResolutions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar la resolución');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-CO');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resoluciones DIAN</h1>
          <p className="text-muted-foreground">
            Gestión de resoluciones de facturación electrónica
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Resolución
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listado de Resoluciones</CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include_inactive"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="include_inactive" className="text-sm cursor-pointer">
                Mostrar inactivas
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando resoluciones...
            </div>
          ) : resolutions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay resoluciones registradas
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Tipo Documento</th>
                    <th className="text-left p-3 font-medium">Prefijo</th>
                    <th className="text-left p-3 font-medium">Número Resolución</th>
                    <th className="text-left p-3 font-medium">Rango</th>
                    <th className="text-left p-3 font-medium">Vigencia</th>
                    <th className="text-right p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resolutions.map((resolution) => (
                    <tr key={resolution.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        {resolution.is_active ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Activa</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Inactiva</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{resolution.type_document.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Código: {resolution.type_document.code}
                        </div>
                      </td>
                      <td className="p-3 font-mono">{resolution.prefix}</td>
                      <td className="p-3 font-mono">{resolution.resolution_number}</td>
                      <td className="p-3">
                        <div className="text-sm">
                          {formatNumber(resolution.range_from)} - {formatNumber(resolution.range_to)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Último externo: {formatNumber(resolution.last_external_consecutive)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">
                          {formatDate(resolution.date_from)} - {formatDate(resolution.date_to)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(resolution)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && resolution.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(resolution)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ResolutionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resolution={selectedResolution}
        onSuccess={loadResolutions}
      />
    </div>
  );
}
