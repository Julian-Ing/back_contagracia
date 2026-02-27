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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Loader2, Pencil, Trash2, Search, Plus, ChevronRight, ChevronDown, Tags, Palette, Power, X, ListPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { attributesService } from '../services/attributes.service';
import type { AttributeListItem } from '../types';

interface AttributesListProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateOption: boolean;
  canEditOption: boolean;
  canDeleteOption: boolean;
}

export const AttributesList = ({
  canCreate, canEdit, canDelete,
  canCreateOption, canEditOption, canDeleteOption,
}: AttributesListProps) => {
  const [attributes, setAttributes] = useState<AttributeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Expandidos
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modal atributo
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<AttributeListItem | null>(null);
  const [attrName, setAttrName] = useState('');
  const [attrDescription, setAttrDescription] = useState('');
  const [savingAttr, setSavingAttr] = useState(false);

  // Modal opción
  const [optModalOpen, setOptModalOpen] = useState(false);
  const [optParentId, setOptParentId] = useState('');
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [optName, setOptName] = useState('');
  const [savingOpt, setSavingOpt] = useState(false);

  // Modal masivo: múltiples atributos
  const [bulkAttrModalOpen, setBulkAttrModalOpen] = useState(false);
  const [bulkAttrItems, setBulkAttrItems] = useState<Array<{ name: string; description: string }>>([{ name: '', description: '' }]);
  const [savingBulkAttr, setSavingBulkAttr] = useState(false);

  // Modal masivo: múltiples opciones a un atributo existente
  const [bulkOptModalOpen, setBulkOptModalOpen] = useState(false);
  const [bulkOptParentId, setBulkOptParentId] = useState('');
  const [bulkOptParentName, setBulkOptParentName] = useState('');
  const [bulkOptNames, setBulkOptNames] = useState<string[]>(['']);
  const [savingBulkOpt, setSavingBulkOpt] = useState(false);

  // Modal fusión: atributos con sus opciones
  const [bulkWithOptsModalOpen, setBulkWithOptsModalOpen] = useState(false);
  const [bulkWithOptsItems, setBulkWithOptsItems] = useState<Array<{ name: string; description: string; options: string[] }>>([{ name: '', description: '', options: [''] }]);
  const [savingBulkWithOpts, setSavingBulkWithOpts] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; confirmLabel: string;
    variant?: 'destructive' | 'default';
    onConfirm: () => Promise<void>;
  }>({ title: '', description: '', confirmLabel: '', onConfirm: async () => {} });

  const fetchAttributes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await attributesService.getAll({
        search: debouncedSearch || undefined,
        page,
        limit: 50,
      });
      setAttributes(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando atributos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchAttributes(); }, [fetchAttributes]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  // Helper: detecta índices con nombre duplicado en un array de strings
  const getDuplicateIndices = (names: string[]): Set<number> => {
    const dupes = new Set<number>();
    const seen = new Map<string, number>();
    names.forEach((n, i) => {
      const key = n.trim().toLowerCase();
      if (!key) return;
      if (seen.has(key)) {
        dupes.add(seen.get(key)!);
        dupes.add(i);
      } else {
        seen.set(key, i);
      }
    });
    return dupes;
  };

  // Duplicados en tiempo real
  const bulkAttrDupes = getDuplicateIndices(bulkAttrItems.map(i => i.name));
  const bulkOptDupes = getDuplicateIndices(bulkOptNames);
  const bulkWithOptsDupeAttrs = getDuplicateIndices(bulkWithOptsItems.map(i => i.name));
  const bulkWithOptsDupeOpts = bulkWithOptsItems.map(item => getDuplicateIndices(item.options));
  const hasBulkAttrDupes = bulkAttrDupes.size > 0;
  const hasBulkOptDupes = bulkOptDupes.size > 0;
  const hasBulkWithOptsDupes = bulkWithOptsDupeAttrs.size > 0 || bulkWithOptsDupeOpts.some(s => s.size > 0);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Atributo CRUD ──

  const openCreateAttr = () => {
    setEditingAttr(null);
    setAttrName('');
    setAttrDescription('');
    setAttrModalOpen(true);
  };

  const openEditAttr = (attr: AttributeListItem) => {
    setEditingAttr(attr);
    setAttrName(attr.name);
    setAttrDescription(attr.description || '');
    setAttrModalOpen(true);
  };

  const handleSaveAttr = async () => {
    if (!attrName.trim()) { toast.error('El nombre es requerido'); return; }
    setSavingAttr(true);
    try {
      if (editingAttr) {
        await attributesService.update(editingAttr.id, {
          name: attrName.trim(),
          description: attrDescription.trim() || undefined,
        });
        toast.success('Atributo actualizado');
      } else {
        await attributesService.create({
          name: attrName.trim(),
          description: attrDescription.trim() || undefined,
        });
        toast.success('Atributo creado');
      }
      setAttrModalOpen(false);
      fetchAttributes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando atributo');
    } finally {
      setSavingAttr(false);
    }
  };

  const handleDeleteAttr = (attr: AttributeListItem) => {
    setConfirmConfig({
      title: 'Eliminar Atributo',
      description: `¿Eliminar el atributo "${attr.name}" y todas sus opciones?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await attributesService.delete(attr.id);
          toast.success('Atributo eliminado');
          fetchAttributes();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error eliminando atributo');
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleToggleAttr = (attr: AttributeListItem) => {
    const action = attr.is_active ? 'desactivar' : 'activar';
    const isDeactivate = attr.is_active;
    setConfirmConfig({
      title: `${isDeactivate ? 'Desactivar' : 'Activar'} Atributo`,
      description: `¿${isDeactivate ? 'Desactivar' : 'Activar'} el atributo "${attr.name}"?${isDeactivate ? ' Esto desactivará también todas sus opciones.' : ''}`,
      confirmLabel: isDeactivate ? 'Desactivar' : 'Activar',
      variant: isDeactivate ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          const res = await attributesService.toggleActive(attr.id);
          toast.success(res.message);
          fetchAttributes();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || `Error al ${action} atributo`);
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleToggleOpt = async (optionId: string, optionName: string, isActive: boolean) => {
    const action = isActive ? 'desactivar' : 'activar';
    try {
      const res = await attributesService.toggleOptionActive(optionId);
      toast.success(res.message);
      fetchAttributes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Error al ${action} opción`);
    }
  };

  // ── Opción CRUD ──

  const openCreateOpt = (attributeId: string) => {
    setOptParentId(attributeId);
    setEditingOptId(null);
    setOptName('');
    setOptModalOpen(true);
  };

  const openEditOpt = (attributeId: string, optionId: string, currentName: string) => {
    setOptParentId(attributeId);
    setEditingOptId(optionId);
    setOptName(currentName);
    setOptModalOpen(true);
  };

  const handleSaveOpt = async () => {
    if (!optName.trim()) { toast.error('El nombre es requerido'); return; }
    setSavingOpt(true);
    try {
      if (editingOptId) {
        await attributesService.updateOption(editingOptId, { name: optName.trim() });
        toast.success('Opción actualizada');
      } else {
        await attributesService.createOption(optParentId, { name: optName.trim() });
        toast.success('Opción creada');
        setExpanded(prev => new Set(prev).add(optParentId));
      }
      setOptModalOpen(false);
      fetchAttributes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando opción');
    } finally {
      setSavingOpt(false);
    }
  };

  const handleDeleteOpt = (optionId: string, optionName: string) => {
    setConfirmConfig({
      title: 'Eliminar Opción',
      description: `¿Eliminar la opción "${optionName}"?`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await attributesService.deleteOption(optionId);
          toast.success('Opción eliminada');
          fetchAttributes();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error eliminando opción');
        }
      },
    });
    setConfirmOpen(true);
  };

  // ── Masivo: múltiples atributos ──

  const openBulkAttr = () => {
    setBulkAttrItems([{ name: '', description: '' }]);
    setBulkAttrModalOpen(true);
  };

  const handleSaveBulkAttr = async () => {
    const valid = bulkAttrItems.filter(i => i.name.trim());
    if (valid.length === 0) { toast.error('Agrega al menos un atributo con nombre'); return; }

    // Validar duplicados en front
    const names = valid.map(i => i.name.trim().toLowerCase());
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) { toast.error(`Nombres duplicados: ${[...new Set(dupes)].join(', ')}`); return; }

    setSavingBulkAttr(true);
    try {
      const res = await attributesService.bulkCreateAttributes({
        attributes: valid.map(i => ({ name: i.name.trim(), description: i.description.trim() || undefined })),
      });
      toast.success(res.message);
      setBulkAttrModalOpen(false);
      fetchAttributes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creando atributos');
    } finally {
      setSavingBulkAttr(false);
    }
  };

  // ── Masivo: múltiples opciones a atributo existente ──

  const openBulkOpt = (attributeId: string, attributeName: string) => {
    setBulkOptParentId(attributeId);
    setBulkOptParentName(attributeName);
    setBulkOptNames(['']);
    setBulkOptModalOpen(true);
  };

  const handleSaveBulkOpt = async () => {
    const valid = bulkOptNames.filter(n => n.trim());
    if (valid.length === 0) { toast.error('Agrega al menos una opción con nombre'); return; }

    const names = valid.map(n => n.trim().toLowerCase());
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length > 0) { toast.error(`Nombres duplicados: ${[...new Set(dupes)].join(', ')}`); return; }

    setSavingBulkOpt(true);
    try {
      const res = await attributesService.bulkCreateOptions(bulkOptParentId, {
        names: valid.map(n => n.trim()),
      });
      toast.success(res.message);
      setBulkOptModalOpen(false);
      setExpanded(prev => new Set(prev).add(bulkOptParentId));
      fetchAttributes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creando opciones');
    } finally {
      setSavingBulkOpt(false);
    }
  };

  // ── Masivo: atributos con opciones (fusión) ──

  const openBulkWithOpts = () => {
    setBulkWithOptsItems([{ name: '', description: '', options: [''] }]);
    setBulkWithOptsModalOpen(true);
  };

  const handleSaveBulkWithOpts = async () => {
    const valid = bulkWithOptsItems.filter(i => i.name.trim());
    if (valid.length === 0) { toast.error('Agrega al menos un atributo con nombre'); return; }

    // Validar nombres de atributos duplicados
    const attrNames = valid.map(i => i.name.trim().toLowerCase());
    const attrDupes = attrNames.filter((n, i) => attrNames.indexOf(n) !== i);
    if (attrDupes.length > 0) { toast.error(`Atributos duplicados: ${[...new Set(attrDupes)].join(', ')}`); return; }

    // Validar opciones duplicadas dentro de cada atributo
    for (const item of valid) {
      const optNames = item.options.filter(o => o.trim()).map(o => o.trim().toLowerCase());
      const optDupes = optNames.filter((n, i) => optNames.indexOf(n) !== i);
      if (optDupes.length > 0) {
        toast.error(`Opciones duplicadas en "${item.name}": ${[...new Set(optDupes)].join(', ')}`);
        return;
      }
    }

    setSavingBulkWithOpts(true);
    try {
      const res = await attributesService.bulkCreateWithOptions({
        attributes: valid.map(i => ({
          name: i.name.trim(),
          description: i.description.trim() || undefined,
          options: i.options.filter(o => o.trim()).map(o => o.trim()),
        })),
      });
      toast.success(res.message);
      setBulkWithOptsModalOpen(false);
      fetchAttributes();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error creando atributos con opciones');
    } finally {
      setSavingBulkWithOpts(false);
    }
  };

  const hasActions = canEdit || canDelete || canCreateOption;
  const hasOptActions = canEditOption || canDeleteOption;
  const hasBulkActions = canCreate || (canCreate && canCreateOption);

  if (loading && attributes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando atributos...</p>
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
                <span>Atributos y Opciones</span>
                <Badge variant="secondary">{total}</Badge>
              </CardTitle>
              {(canCreate || hasBulkActions) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Crear
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {canCreate && (
                      <DropdownMenuItem onClick={openCreateAttr}>
                        <Plus className="h-4 w-4 mr-2" />
                        Un atributo
                      </DropdownMenuItem>
                    )}
                    {canCreate && (
                      <DropdownMenuItem onClick={openBulkAttr}>
                        <ListPlus className="h-4 w-4 mr-2" />
                        Múltiples atributos
                      </DropdownMenuItem>
                    )}
                    {canCreate && canCreateOption && (
                      <DropdownMenuItem onClick={openBulkWithOpts}>
                        <Tags className="h-4 w-4 mr-2" />
                        Atributos con opciones
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <div className="flex gap-2 flex-1 md:max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar atributo u opción..."
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
                  <TableHead className="w-[40px]" />
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[100px]">Código</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center w-[100px]">Opciones</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-center w-[100px]">Estado</TableHead>
                  {(hasActions || hasOptActions) && (
                    <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[140px]">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={(hasActions || hasOptActions) ? 7 : 6}
                      className="text-center py-12 text-gray-500 dark:text-slate-400"
                    >
                      No se encontraron atributos
                    </TableCell>
                  </TableRow>
                ) : (
                  attributes.map((attr) => {
                    const isExpanded = expanded.has(attr.id);
                    return (
                      <AttributeRow
                        key={attr.id}
                        attribute={attr}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleExpand(attr.id)}
                        hasActions={hasActions}
                        hasOptActions={hasOptActions}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canCreateOption={canCreateOption}
                        canEditOption={canEditOption}
                        canDeleteOption={canDeleteOption}
                        onEditAttr={() => openEditAttr(attr)}
                        onDeleteAttr={() => handleDeleteAttr(attr)}
                        onToggleAttr={() => handleToggleAttr(attr)}
                        onCreateOpt={() => openCreateOpt(attr.id)}
                        onBulkCreateOpt={() => openBulkOpt(attr.id, attr.name)}
                        onEditOpt={(optId, name) => openEditOpt(attr.id, optId, name)}
                        onDeleteOpt={handleDeleteOpt}
                        onToggleOpt={handleToggleOpt}
                      />
                    );
                  })
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
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1 || loading}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || loading}>
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
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
      />

      {/* Modal Atributo (individual) */}
      <Dialog open={attrModalOpen} onOpenChange={setAttrModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAttr ? 'Editar Atributo' : 'Nuevo Atributo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={attrName}
                onChange={(e) => setAttrName(e.target.value)}
                placeholder="Ej: Color, Talla, Material"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={attrDescription}
                onChange={(e) => setAttrDescription(e.target.value)}
                placeholder="Descripción (opcional)"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAttrModalOpen(false)} disabled={savingAttr}>
                Cancelar
              </Button>
              <Button onClick={handleSaveAttr} disabled={savingAttr || !attrName.trim()}>
                {savingAttr && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingAttr ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Opción (individual) */}
      <Dialog open={optModalOpen} onOpenChange={setOptModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingOptId ? 'Editar Opción' : 'Nueva Opción'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={optName}
                onChange={(e) => setOptName(e.target.value)}
                placeholder="Ej: Rojo, Grande, Algodón"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOptModalOpen(false)} disabled={savingOpt}>
                Cancelar
              </Button>
              <Button onClick={handleSaveOpt} disabled={savingOpt || !optName.trim()}>
                {savingOpt && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editingOptId ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Masivo: Múltiples Atributos */}
      <Dialog open={bulkAttrModalOpen} onOpenChange={setBulkAttrModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Múltiples Atributos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {bulkAttrItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <Input
                    value={item.name}
                    onChange={(e) => {
                      const next = [...bulkAttrItems];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setBulkAttrItems(next);
                    }}
                    placeholder={`Atributo ${idx + 1} (ej: Color)`}
                    autoFocus={idx === 0}
                    className={bulkAttrDupes.has(idx) ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {bulkAttrDupes.has(idx) && (
                    <p className="text-xs text-red-500">Nombre duplicado</p>
                  )}
                  <Input
                    value={item.description}
                    onChange={(e) => {
                      const next = [...bulkAttrItems];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setBulkAttrItems(next);
                    }}
                    placeholder="Descripción (opcional)"
                    className="h-8 text-sm"
                  />
                </div>
                {bulkAttrItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-red-500 hover:text-red-700"
                    onClick={() => setBulkAttrItems(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAttrItems(prev => [...prev, { name: '', description: '' }])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar otro atributo
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBulkAttrModalOpen(false)} disabled={savingBulkAttr}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveBulkAttr}
                disabled={savingBulkAttr || !bulkAttrItems.some(i => i.name.trim()) || hasBulkAttrDupes}
              >
                {savingBulkAttr && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Crear {bulkAttrItems.filter(i => i.name.trim()).length} atributo(s)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Masivo: Múltiples Opciones a Atributo Existente */}
      <Dialog open={bulkOptModalOpen} onOpenChange={setBulkOptModalOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Opciones a &quot;{bulkOptParentName}&quot;</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {bulkOptNames.map((name, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex gap-2 items-center">
                  <Input
                    value={name}
                    onChange={(e) => {
                      const next = [...bulkOptNames];
                      next[idx] = e.target.value;
                      setBulkOptNames(next);
                    }}
                    placeholder={`Opción ${idx + 1} (ej: Rojo)`}
                    autoFocus={idx === 0}
                    className={bulkOptDupes.has(idx) ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {bulkOptNames.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setBulkOptNames(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {bulkOptDupes.has(idx) && (
                  <p className="text-xs text-red-500">Nombre duplicado</p>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOptNames(prev => [...prev, ''])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar otra opción
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBulkOptModalOpen(false)} disabled={savingBulkOpt}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveBulkOpt}
                disabled={savingBulkOpt || !bulkOptNames.some(n => n.trim()) || hasBulkOptDupes}
              >
                {savingBulkOpt && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Crear {bulkOptNames.filter(n => n.trim()).length} opción(es)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Fusión: Atributos con Opciones */}
      <Dialog open={bulkWithOptsModalOpen} onOpenChange={setBulkWithOptsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Atributos con Opciones</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bulkWithOptsItems.map((item, attrIdx) => (
              <Card key={attrIdx} className={`border-gray-200 dark:border-slate-700 ${bulkWithOptsDupeAttrs.has(attrIdx) ? 'border-red-500' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const next = [...bulkWithOptsItems];
                          next[attrIdx] = { ...next[attrIdx], name: e.target.value };
                          setBulkWithOptsItems(next);
                        }}
                        placeholder={`Atributo ${attrIdx + 1} (ej: Color)`}
                        autoFocus={attrIdx === 0}
                        className={`font-medium ${bulkWithOptsDupeAttrs.has(attrIdx) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {bulkWithOptsDupeAttrs.has(attrIdx) && (
                        <p className="text-xs text-red-500">Nombre de atributo duplicado</p>
                      )}
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const next = [...bulkWithOptsItems];
                          next[attrIdx] = { ...next[attrIdx], description: e.target.value };
                          setBulkWithOptsItems(next);
                        }}
                        placeholder="Descripción (opcional)"
                        className="h-8 text-sm"
                      />
                    </div>
                    {bulkWithOptsItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 text-red-500 hover:text-red-700"
                        onClick={() => setBulkWithOptsItems(prev => prev.filter((_, i) => i !== attrIdx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="pl-4 border-l-2 border-orange-200 dark:border-orange-800 space-y-2">
                    <Label className="text-xs text-gray-500 dark:text-slate-400">Opciones</Label>
                    {item.options.map((opt, optIdx) => (
                      <div key={optIdx} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const next = [...bulkWithOptsItems];
                              const opts = [...next[attrIdx].options];
                              opts[optIdx] = e.target.value;
                              next[attrIdx] = { ...next[attrIdx], options: opts };
                              setBulkWithOptsItems(next);
                            }}
                            placeholder={`Opción ${optIdx + 1}`}
                            className={`h-8 text-sm ${bulkWithOptsDupeOpts[attrIdx]?.has(optIdx) ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          />
                          {item.options.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                              onClick={() => {
                                const next = [...bulkWithOptsItems];
                                next[attrIdx] = { ...next[attrIdx], options: next[attrIdx].options.filter((_, i) => i !== optIdx) };
                                setBulkWithOptsItems(next);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {bulkWithOptsDupeOpts[attrIdx]?.has(optIdx) && (
                          <p className="text-xs text-red-500">Opción duplicada</p>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const next = [...bulkWithOptsItems];
                        next[attrIdx] = { ...next[attrIdx], options: [...next[attrIdx].options, ''] };
                        setBulkWithOptsItems(next);
                      }}
                      className="text-xs h-7"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar opción
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkWithOptsItems(prev => [...prev, { name: '', description: '', options: [''] }])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar otro atributo
            </Button>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBulkWithOptsModalOpen(false)} disabled={savingBulkWithOpts}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveBulkWithOpts}
                disabled={savingBulkWithOpts || !bulkWithOptsItems.some(i => i.name.trim()) || hasBulkWithOptsDupes}
              >
                {savingBulkWithOpts && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Crear todo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Sub-componente: fila de atributo con opciones expandibles ──

interface AttributeRowProps {
  attribute: AttributeListItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasActions: boolean;
  hasOptActions: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateOption: boolean;
  canEditOption: boolean;
  canDeleteOption: boolean;
  onEditAttr: () => void;
  onDeleteAttr: () => void;
  onToggleAttr: () => void;
  onCreateOpt: () => void;
  onBulkCreateOpt: () => void;
  onEditOpt: (optionId: string, name: string) => void;
  onDeleteOpt: (optionId: string, name: string) => void;
  onToggleOpt: (optionId: string, name: string, isActive: boolean) => void;
}

const AttributeRow = ({
  attribute: attr, isExpanded, onToggleExpand,
  hasActions, hasOptActions,
  canEdit, canDelete, canCreateOption, canEditOption, canDeleteOption,
  onEditAttr, onDeleteAttr, onToggleAttr, onCreateOpt, onBulkCreateOpt, onEditOpt, onDeleteOpt, onToggleOpt,
}: AttributeRowProps) => {
  return (
    <>
      {/* Fila atributo (padre) */}
      <TableRow className={`border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40 ${!attr.is_active ? 'opacity-50' : ''}`}>
        <TableCell className="px-2">
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </TableCell>
        <TableCell>
          <span className="font-mono text-xs text-gray-600 dark:text-slate-400">{attr.consecutive}</span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-orange-500 shrink-0" />
            <span className="font-medium text-gray-900 dark:text-white">{attr.name}</span>
            <Badge variant="outline" className="text-xs">{attr.options_count}</Badge>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-gray-600 dark:text-slate-400">{attr.description || '-'}</span>
        </TableCell>
        <TableCell className="text-center">
          <span className="text-gray-900 dark:text-white">{attr.options_count}</span>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={attr.is_active ? 'default' : 'secondary'} className={`text-xs ${attr.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
            {attr.is_active ? 'Activo' : 'Inactivo'}
          </Badge>
        </TableCell>
        {(hasActions || hasOptActions) && (
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              {canCreateOption && attr.is_active && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" title="Agregar opciones">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onCreateOpt}>
                      <Plus className="h-4 w-4 mr-2" />
                      Una opción
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onBulkCreateOpt}>
                      <ListPlus className="h-4 w-4 mr-2" />
                      Múltiples opciones
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={onToggleAttr} title={attr.is_active ? 'Desactivar atributo' : 'Activar atributo'}>
                  <Power className={`h-4 w-4 ${attr.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                </Button>
              )}
              {canEdit && attr.is_active && (
                <Button variant="ghost" size="sm" onClick={onEditAttr} title="Editar atributo">
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canDelete && attr.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDeleteAttr}
                  title="Eliminar atributo"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        )}
      </TableRow>

      {/* Filas de opciones (expandidas) */}
      {isExpanded && attr.options.map((opt) => (
        <TableRow
          key={opt.id}
          className={`border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30 hover:bg-gray-100 dark:hover:bg-slate-700/30 ${!opt.is_active ? 'opacity-50' : ''}`}
        >
          <TableCell className="px-2">
            <div className="w-6" />
          </TableCell>
          <TableCell>
            <span className="font-mono text-xs text-gray-400 dark:text-slate-500 pl-4">{opt.consecutive}</span>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2 pl-4">
              <Palette className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 dark:text-slate-300">{opt.name}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="secondary" className="text-xs">Opción</Badge>
          </TableCell>
          <TableCell />
          <TableCell className="text-center">
            <Badge variant={opt.is_active ? 'default' : 'secondary'} className={`text-xs ${opt.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'}`}>
              {opt.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          </TableCell>
          {(hasActions || hasOptActions) && (
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                {canEditOption && (
                  <Button variant="ghost" size="sm" onClick={() => onToggleOpt(opt.id, opt.name, opt.is_active)} title={opt.is_active ? 'Desactivar opción' : 'Activar opción'}>
                    <Power className={`h-4 w-4 ${opt.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </Button>
                )}
                {canEditOption && opt.is_active && (
                  <Button variant="ghost" size="sm" onClick={() => onEditOpt(opt.id, opt.name)} title="Editar opción">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDeleteOption && opt.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteOpt(opt.id, opt.name)}
                    title="Eliminar opción"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          )}
        </TableRow>
      ))}

      {/* Fila vacía si expandido y sin opciones */}
      {isExpanded && attr.options.length === 0 && (
        <TableRow className="border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
          <TableCell className="px-2"><div className="w-6" /></TableCell>
          <TableCell colSpan={(hasActions || hasOptActions) ? 6 : 5} className="text-sm text-gray-400 dark:text-slate-500 pl-8 py-4">
            Sin opciones — {canCreateOption ? 'usa el botón + para agregar' : 'no hay opciones aún'}
          </TableCell>
        </TableRow>
      )}
    </>
  );
};
