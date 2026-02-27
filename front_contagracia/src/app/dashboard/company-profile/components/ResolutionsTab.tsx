'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '@/shared/hooks';
import { resolutionsService, type Resolution } from '@/modules/electronic-documents/services/resolutions.service';
import { ResolutionFormDialog } from '@/modules/electronic-documents/components/ResolutionFormDialog';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { electronicDocsClient } from '@/shared/services/api/apiClient';

export default function ResolutionsTab() {
  const { can } = usePermissions();
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [typeDocumentId, setTypeDocumentId] = useState<string>('');
  const [isActive, setIsActive] = useState<string>('all'); // 'all', 'active', 'inactive'
  const [typeDocuments, setTypeDocuments] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const canCreate = can('electronic_documents.resolutions.create');
  const canEdit = can('electronic_documents.resolutions.edit');
  const canDelete = can('electronic_documents.resolutions.delete');

  useEffect(() => {
    loadTypeDocuments();
  }, []);

  useEffect(() => {
    loadResolutions();
  }, [search, typeDocumentId, isActive]);

  const loadTypeDocuments = async () => {
    try {
      const response = await electronicDocsClient.get('/type-documents', {
        params: { limit: 100 },
      });
      setTypeDocuments(response.data.data);
    } catch (error) {
      toast.error('Error al cargar tipos de documento');
    }
  };

  const loadResolutions = async () => {
    setLoading(true);
    try {
      const data = await resolutionsService.getAll(search, typeDocumentId || undefined, isActive);
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

  const typeDocumentOptions = [
    { value: '', label: 'Todos los tipos' },
    ...typeDocuments.map((doc) => ({
      value: doc.id,
      label: doc.name,
    })),
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resoluciones DIAN</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gestión de resoluciones de facturación electrónica
              </p>
            </div>
            {canCreate && (
              <Button onClick={handleCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nueva
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Prefijo, número..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <SearchableSelect
                  options={typeDocumentOptions}
                  value={typeDocumentId}
                  onChange={setTypeDocumentId}
                  placeholder="Seleccionar tipo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <SearchableSelect
                  options={[
                    { value: 'all', label: 'Todos' },
                    { value: 'active', label: 'Solo activas' },
                    { value: 'inactive', label: 'Solo inactivas' },
                  ]}
                  value={isActive}
                  onChange={setIsActive}
                  placeholder="Seleccionar estado"
                />
              </div>
            </div>

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
                      <th className="text-left p-3 font-medium text-sm">Estado</th>
                      <th className="text-left p-3 font-medium text-sm">Tipo Documento</th>
                      <th className="text-left p-3 font-medium text-sm">Prefijo</th>
                      <th className="text-left p-3 font-medium text-sm">Número</th>
                      <th className="text-left p-3 font-medium text-sm">Rango</th>
                      <th className="text-left p-3 font-medium text-sm">Vigencia</th>
                      <th className="text-right p-3 font-medium text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolutions.map((resolution) => (
                      <tr key={resolution.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          {resolution.is_active ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs">Activa</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs">Inactiva</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{resolution.type_document.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Cód: {resolution.type_document.code}
                          </div>
                        </td>
                        <td className="p-3 font-mono text-sm">{resolution.prefix}</td>
                        <td className="p-3 font-mono text-sm">{resolution.resolution_number}</td>
                        <td className="p-3">
                          <div className="text-sm">
                            {formatNumber(resolution.range_from)} - {formatNumber(resolution.range_to)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Último: {formatNumber(resolution.last_external_consecutive)}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-xs">
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
          </div>
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
