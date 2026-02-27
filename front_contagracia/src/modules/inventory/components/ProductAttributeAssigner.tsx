'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/shared/components/ui/dialog';
import { Search, Settings2, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { productsService } from '../services/products.service';
import { attributesService } from '../services/attributes.service';
import type { AssignedAttribute, AttributeListItem } from '../types';

interface ProductAttributeAssignerProps {
  productId: string;
  canEdit: boolean;
  assignedAttributes: AssignedAttribute[];
  loadingAssigned: boolean;
  onAssignedChange: (attrs: AssignedAttribute[]) => void;
}

export const ProductAttributeAssigner = ({
  productId,
  canEdit,
  assignedAttributes,
  loadingAssigned,
  onAssignedChange,
}: ProductAttributeAssignerProps) => {
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allAttributes, setAllAttributes] = useState<AttributeListItem[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAllAttributes = useCallback(async () => {
    setLoadingAll(true);
    try {
      const data = await attributesService.getForSelect();
      // Apply client-side search filter if search is active
      const filtered = debouncedSearch
        ? data.filter(a => a.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
        : data;
      setAllAttributes(filtered.map(a => ({
        ...a,
        description: null,
        is_active: true,
        options_count: a.options.length,
        options: a.options.map(o => ({ ...o, consecutive: '', is_active: true, created_at: '' })),
        created_at: '',
      })));
    } catch {
      toast.error('Error cargando atributos');
    } finally {
      setLoadingAll(false);
    }
  }, [debouncedSearch]);

  // Fetch when dialog opens or search changes
  useEffect(() => {
    if (dialogOpen) fetchAllAttributes();
  }, [dialogOpen, fetchAllAttributes]);

  const handleOpenDialog = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedIds(new Set(assignedAttributes.map(a => a.id)));
    setDialogOpen(true);
  };

  const toggleAttribute = (attrId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(attrId)) next.delete(attrId);
      else next.add(attrId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await productsService.setProductAttributes(productId, [...selectedIds]);
      onAssignedChange(data);
      setDialogOpen(false);
      toast.success('Atributos actualizados');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando atributos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              Atributos asignados
            </h3>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={handleOpenDialog} className="h-8">
                <Settings2 className="h-3.5 w-3.5 mr-1" />
                Gestionar
              </Button>
            )}
          </div>
          {loadingAssigned ? (
            <div className="flex items-center gap-2 py-2 text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : assignedAttributes.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 italic">
              No hay atributos asignados. Asigna atributos para poder crear combinaciones.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedAttributes.map(attr => (
                <Badge key={attr.id} variant="outline" className="text-sm py-1 px-2.5">
                  {attr.name}
                  <span className="ml-1.5 text-xs text-gray-400">
                    ({attr.options.length} opción{attr.options.length !== 1 ? 'es' : ''})
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Attributes Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar atributos del producto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 dark:text-slate-400 -mt-1">
            Selecciona los atributos que aplican para las combinaciones de este producto.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar atributo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {loadingAll ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
            </div>
          ) : allAttributes.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4">
              {search ? 'No se encontraron atributos' : 'No hay atributos activos con opciones. Crea atributos primero.'}
            </p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto py-1">
              {allAttributes.map(attr => {
                const isSelected = selectedIds.has(attr.id);
                const activeOptions = attr.options.filter(o => o.is_active);
                return (
                  <button
                    key={attr.id}
                    type="button"
                    onClick={() => toggleAttribute(attr.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                        : 'bg-gray-50 dark:bg-slate-700/30 border border-transparent hover:bg-gray-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{attr.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {activeOptions.length} opción{activeOptions.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    {isSelected ? (
                      <Check className="h-4 w-4 text-orange-600 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded border border-gray-300 dark:border-slate-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || loadingAll}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
