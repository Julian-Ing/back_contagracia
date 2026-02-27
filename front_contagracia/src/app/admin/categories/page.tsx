'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tags, PlusCircle, MoreHorizontal, Edit, Trash2, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import type { CategoryWithCount, CategoryFormData } from '@/modules/admin/types';
import { adminService } from '@/modules/admin/services/admin.service';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#64748b', // Slate
];

interface CategoryFormProps {
  category: CategoryWithCount | null;
  onSave: (formData: CategoryFormData) => void;
  onClose: () => void;
  loading: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ category, onSave, onClose, loading }) => {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#6366f1',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#6366f1',
      });
    } else {
      setFormData({ name: '', description: '', color: '#6366f1' });
    }
  }, [category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-800 dark:text-gray-200">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Premium, Enterprise, Trial..."
              required
              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-800 dark:text-gray-200">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción opcional de la categoría"
              rows={3}
              className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-800 dark:text-gray-200">Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-white scale-110 ring-2 ring-offset-2 ring-offset-slate-900'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color, boxShadow: formData.color === color ? `0 0 0 2px ${color}40` : 'none' }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="customColor" className="text-xs text-gray-500 dark:text-gray-400">Personalizado:</Label>
              <input
                id="customColor"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-12 h-8 p-0 border-0 cursor-pointer bg-transparent"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">{formData.color}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-slate-800">
            <span className="text-sm text-gray-700 dark:text-gray-300">Vista previa:</span>
            <Badge style={{ backgroundColor: formData.color, color: '#fff' }}>
              {formData.name || 'Categoría'}
            </Badge>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryWithCount | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async (formData: CategoryFormData) => {
    setSaving(true);
    try {
      if (editingCategory) {
        await adminService.updateCategory(editingCategory.id, formData);
        toast.success('Categoría actualizada exitosamente');
      } else {
        await adminService.createCategory(formData);
        toast.success('Categoría creada exitosamente');
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      await fetchCategories();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al guardar la categoría';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await adminService.deleteCategory(categoryToDelete.id);
      toast.success('Categoría eliminada exitosamente');
      setCategoryToDelete(null);
      await fetchCategories();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Error al eliminar la categoría';
      toast.error(message);
    }
  };

  const handleEdit = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  return (
    <div>
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Tags className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de Categorías</h1>
            <p className="text-gray-500 dark:text-gray-400">Crea y administra categorías para clasificar compañías.</p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </header>

      {/* Card with Table */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Categorías de Compañías</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total: {categories.length} categoría{categories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10">
              <Tags className="h-12 w-12 mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">No hay categorías</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Crea tu primera categoría para clasificar compañías.
              </p>
              <Button onClick={handleCreate}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Crear Categoría
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50">
                  <TableHead className="text-gray-700 dark:text-gray-300">Categoría</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Descripción</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 text-center">Compañías</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:bg-slate-800/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge style={{ backgroundColor: category.color, color: '#fff' }}>
                          {category.name}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {category.description || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{category.company_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                          <DropdownMenuItem
                            onClick={() => handleEdit(category)}
                            className="text-gray-800 dark:text-gray-200 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-gray-900 dark:text-gray-100 cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:bg-gray-100 dark:focus:bg-slate-700 focus:text-red-300 cursor-pointer"
                            onClick={() => setCategoryToDelete(category)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Category Form Dialog */}
      {isFormOpen && (
        <CategoryForm
          category={editingCategory}
          onSave={handleSave}
          onClose={() => {
            setIsFormOpen(false);
            setEditingCategory(null);
          }}
          loading={saving}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
              {categoryToDelete && categoryToDelete.company_count > 0 ? (
                <>
                  Esta categoría tiene <strong className="text-gray-800 dark:text-gray-200">{categoryToDelete.company_count}</strong> compañía{categoryToDelete.company_count !== 1 ? 's' : ''} asignada{categoryToDelete.company_count !== 1 ? 's' : ''}.
                  Al eliminarla, se desasignarán automáticamente.
                </>
              ) : (
                'Esta acción no se puede deshacer.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
