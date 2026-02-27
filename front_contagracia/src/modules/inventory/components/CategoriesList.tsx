'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Pencil, Trash2, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { categoriesService } from '../services/categories.service';
import { ProductCategory } from '../types';

interface CategoriesListProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const CategoriesList = ({ canCreate, canEdit, canDelete }: CategoriesListProps) => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({ title: '', description: '', confirmLabel: '', onConfirm: async () => {} });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesService.getAll({
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setCategories(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando categorías');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setModalOpen(true);
  };

  const openEdit = (cat: ProductCategory) => {
    setEditing(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await categoriesService.update(editing.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        toast.success('Categoría actualizada');
      } else {
        await categoriesService.create({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        toast.success('Categoría creada');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: ProductCategory) => {
    setConfirmConfig({
      title: 'Eliminar Categoría',
      description: `¿Eliminar la categoría "${cat.name}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await categoriesService.delete(cat.id);
          toast.success('Categoría eliminada');
          fetchCategories();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error eliminando categoría');
        }
      },
    });
    setConfirmOpen(true);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando categorías...</p>
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
                <span>Categorías</span>
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
                  placeholder="Buscar..."
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
                  <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center w-[100px]">Productos</TableHead>
                  {(canEdit || canDelete) && (
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[100px]">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={(canEdit || canDelete) ? 5 : 4}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron categorías
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow
                      key={cat.id}
                      className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                    >
                      <TableCell>
                        <span className="font-mono text-xs text-gray-600 dark:text-slate-400">{cat.consecutive}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">{cat.name}</span>
                        {cat.is_aiu && (
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                            AIU
                          </Badge>
                        )}
                        {cat.is_bag && (
                          <Badge className="ml-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                            Bolsa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 dark:text-slate-400 text-sm">{cat.description || '-'}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-gray-900 dark:text-white">{cat.products_count}</span>
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && !cat.is_aiu && !cat.is_bag && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(cat)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && !cat.is_aiu && !cat.is_bag && cat.products_count === 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(cat)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Página {page} de {totalPages} ({total} registros)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1 || loading}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages || loading}
            >
              Siguiente
            </Button>
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

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nombre de la categoría"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descripción (opcional)"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                Cancelar
              </Button>
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
