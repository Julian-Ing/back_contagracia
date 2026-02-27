'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import { Loader2, Search, Plus, Pencil, Trash2, Warehouse, MapPin, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { warehousesService } from '../services/warehouses.service';
import type { WarehouseListItem } from '../types';

interface WarehousesListProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const WarehousesList = ({ canCreate, canEdit, canDelete }: WarehousesListProps) => {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<WarehouseListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseListItem | null>(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({ title: '', description: '', confirmLabel: '', onConfirm: async () => {} });

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehousesService.getAll({
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setWarehouses(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando almacenes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setModalOpen(true);
  };

  const openEdit = (w: WarehouseListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(w);
    setFormName(w.name);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      if (editing) {
        await warehousesService.update(editing.id, { name: formName.trim() });
        toast.success('Almacén actualizado');
      } else {
        await warehousesService.create({ name: formName.trim() });
        toast.success('Almacén creado');
      }
      setModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando almacén');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (w: WarehouseListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      title: 'Eliminar Almacén',
      description: `¿Eliminar el almacén "${w.name}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await warehousesService.delete(w.id);
          toast.success('Almacén eliminado');
          fetchWarehouses();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error eliminando almacén');
        }
      },
    });
    setConfirmOpen(true);
  };

  if (loading && warehouses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando almacenes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
                <span>Almacenes</span>
                <Badge variant="secondary">{total}</Badge>
              </CardTitle>
              {canCreate && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Crear
                </Button>
              )}
            </div>
            <div className="flex gap-2 flex-1 md:max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar almacén..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Código</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center w-[100px]">Bodegas</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center w-[100px]">Usuarios</TableHead>
                  {(canEdit || canDelete) && (
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[100px]">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={(canEdit || canDelete) ? 5 : 4}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron almacenes
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((w) => (
                    <TableRow
                      key={w.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 cursor-pointer"
                      onClick={() => router.push(`/dashboard/warehouses/${w.id}`)}
                    >
                      <TableCell>
                        <span className="font-mono text-xs text-gray-600 dark:text-slate-400">{w.consecutive}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4 text-orange-500 shrink-0" />
                          <span className="font-medium text-gray-900 dark:text-white">{w.name}</span>
                          {w.is_principal && (
                            <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 dark:border-orange-500 dark:text-orange-400">
                              Principal
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">{w.storages_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">{w.users_count}</span>
                        </div>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <Button variant="ghost" size="sm" onClick={(e) => openEdit(w, e)} title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && !w.is_principal && (
                              <Button
                                variant="ghost" size="sm"
                                onClick={(e) => handleDelete(w, e)}
                                title="Eliminar"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1 || loading}>Anterior</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || loading}>Siguiente</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Almacén' : 'Nuevo Almacén'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Almacén Principal, Bodega Central"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editing ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
