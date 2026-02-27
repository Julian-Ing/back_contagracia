'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Loader2, Pencil, Trash2, Search, Plus, ChevronRight, ChevronDown,
  RotateCcw, FolderTree, ArrowRightLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { costCentersService } from '../services/costCenters.service';
import { CostCenterTreeNode } from '../types';

interface CostCentersListProps {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const CostCentersList = ({ canCreate, canEdit, canDelete }: CostCentersListProps) => {
  const router = useRouter();
  const [tree, setTree] = useState<CostCenterTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const debouncedSearch = useDebounce(search, 300);

  // Expanded nodes
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formParentName, setFormParentName] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({ title: '', description: '', confirmLabel: '', onConfirm: async () => {} });

  const filterInactive = (nodes: CostCenterTreeNode[]): CostCenterTreeNode[] => {
    return nodes
      .map((n) => ({ ...n, children: filterInactive(n.children) }))
      .filter((n) => !n.is_active || n.children.length > 0);
  };

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await costCentersService.getTree({
        search: debouncedSearch || undefined,
        includeInactive: statusFilter !== 'active' || undefined,
      });
      // Filter client-side when showing only inactive
      const filtered = statusFilter === 'inactive'
        ? filterInactive(res.data)
        : res.data;
      setTree(filtered);
      // Auto-expand all when searching
      if (debouncedSearch) {
        const allIds = new Set<string>();
        const collectIds = (nodes: CostCenterTreeNode[]) => {
          for (const n of nodes) {
            if (n.children.length > 0) {
              allIds.add(n.id);
              collectIds(n.children);
            }
          }
        };
        collectIds(res.data);
        setExpanded(allIds);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando centros de costos');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: CostCenterTreeNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) {
          allIds.add(n.id);
          collectIds(n.children);
        }
      }
    };
    collectIds(tree);
    setExpanded(allIds);
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const countAll = (nodes: CostCenterTreeNode[]): number => {
    let count = 0;
    for (const n of nodes) {
      count += 1 + countAll(n.children);
    }
    return count;
  };

  // --- CRUD handlers ---

  const openCreate = (parentId?: string, parentName?: string) => {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormParentId(parentId || null);
    setFormParentName(parentName || '');
    setModalOpen(true);
  };

  const openEdit = (node: CostCenterTreeNode) => {
    setEditingId(node.id);
    setFormName(node.name);
    setFormDescription(node.description || '');
    setFormParentId(node.parent_id);
    setFormParentName('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await costCentersService.update(editingId, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
        });
        toast.success('Centro de costos actualizado');
      } else {
        await costCentersService.create({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          parent_id: formParentId || undefined,
        });
        toast.success('Centro de costos creado');
      }
      setModalOpen(false);
      fetchTree();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error guardando centro de costos');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (node: CostCenterTreeNode) => {
    setConfirmConfig({
      title: 'Eliminar Centro de Costos',
      description: `¿Eliminar "${node.consecutive} - ${node.name}"? Si tiene relaciones se desactivará en lugar de eliminar.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          const res = await costCentersService.delete(node.id);
          if (res.type === 'soft_delete') {
            toast.success(`${res.message}: ${res.reason}`);
          } else {
            toast.success(res.message);
          }
          fetchTree();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error eliminando centro de costos');
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleReactivate = async (node: CostCenterTreeNode) => {
    try {
      await costCentersService.reactivate(node.id);
      toast.success('Centro de costos reactivado');
      fetchTree();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error reactivando');
    }
  };

  // --- Tree rendering ---

  const renderNode = (node: CostCenterTreeNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isInactive = !node.is_active;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/40 group ${
            isInactive ? 'opacity-60' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {/* Expand toggle */}
          <button
            className="w-5 h-5 flex items-center justify-center flex-shrink-0"
            onClick={() => hasChildren && toggleExpand(node.id)}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {/* Consecutive */}
          <span className="font-mono text-xs text-gray-500 dark:text-slate-400 w-[80px] flex-shrink-0">
            {node.consecutive}
          </span>

          {/* Name */}
          <span className={`font-medium flex-1 min-w-0 truncate ${
            isInactive
              ? 'text-gray-400 dark:text-slate-500 line-through'
              : 'text-gray-900 dark:text-white'
          }`}>
            {node.name}
          </span>

          {/* Description */}
          {node.description && (
            <span className="text-xs text-gray-400 dark:text-slate-500 hidden lg:inline truncate max-w-[200px]">
              {node.description}
            </span>
          )}

          {/* Status badge */}
          {isInactive && (
            <Badge variant="secondary" className="text-xs">Inactivo</Badge>
          )}

          {/* Counts */}
          {(node.movements_count > 0 || node.projections_count > 0 || node.journal_items_count > 0) && (
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
              {node.movements_count > 0 && <span>{node.movements_count} mov</span>}
              {node.projections_count > 0 && <span>{node.projections_count} proy</span>}
              {node.journal_items_count > 0 && <span>{node.journal_items_count} asientos</span>}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => router.push(`/dashboard/cost-centers/${node.id}/movements`)}
              title="Ver movimientos"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
            {canCreate && node.is_active && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => openCreate(node.id, `${node.consecutive} - ${node.name}`)}
                title="Crear sub-centro"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && node.is_active && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => openEdit(node)}
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && isInactive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() => handleReactivate(node)}
                title="Reactivar"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
            {canDelete && node.is_active && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => handleDelete(node)}
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // --- Loading state ---

  if (loading && tree.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando centros de costos...</p>
        </div>
      </div>
    );
  }

  const totalCount = countAll(tree);

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-3 text-base">
                <span>Centros de Costos</span>
                <Badge variant="secondary">{totalCount}</Badge>
              </CardTitle>
              {canCreate && (
                <Button size="sm" onClick={() => openCreate()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Crear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[150px]">
                <SearchableSelect
                  options={[
                    { value: 'active', label: 'Activos' },
                    { value: 'inactive', label: 'Inactivos' },
                    { value: 'all', label: 'Todos' },
                  ]}
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as 'active' | 'inactive' | 'all')}
                  placeholder="Estado"
                  clearable={false}
                />
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={expandAll} title="Expandir todo">
                  <FolderTree className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAll} title="Colapsar todo">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative flex-1 md:w-64">
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
          {tree.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
              No se encontraron centros de costos
            </div>
          ) : (
            <div className="overflow-x-auto">
              {tree.map(node => renderNode(node, 0))}
            </div>
          )}
        </CardContent>
      </Card>

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
            <DialogTitle>
              {editingId ? 'Editar Centro de Costos' : 'Nuevo Centro de Costos'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && formParentId && (
              <div className="space-y-2">
                <Label className="text-gray-500">Centro padre</Label>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formParentName}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nombre del centro de costos"
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
                {editingId ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
