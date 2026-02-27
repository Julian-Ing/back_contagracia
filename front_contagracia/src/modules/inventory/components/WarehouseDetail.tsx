'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Loader2, ArrowLeft, Plus, Trash2, Warehouse, Users, Search, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { warehousesService } from '../services/warehouses.service';
import { usersService } from '@/modules/company/services/users.service';
import type { TenantUser } from '@/modules/company/types';
import type { WarehouseDetail as WarehouseDetailType, WarehouseUserItem } from '../types';

interface WarehouseDetailProps {
  warehouseId: string;
  canAssignUsers: boolean;
}

export const WarehouseDetail = ({
  warehouseId,
  canAssignUsers,
}: WarehouseDetailProps) => {
  const router = useRouter();
  const [warehouse, setWarehouse] = useState<WarehouseDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal asignar usuarios
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [availableUsers, setAvailableUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [savingUser, setSavingUser] = useState(false);
  const userDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string; description: string; confirmLabel: string;
    onConfirm: () => Promise<void>;
  }>({ title: '', description: '', confirmLabel: '', onConfirm: async () => {} });

  const fetchWarehouse = useCallback(async () => {
    setLoading(true);
    try {
      const data = await warehousesService.getOne(warehouseId);
      setWarehouse(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error cargando almacén');
      router.push('/dashboard/warehouses');
    } finally {
      setLoading(false);
    }
  }, [warehouseId, router]);

  useEffect(() => { fetchWarehouse(); }, [fetchWarehouse]);

  // ── Usuarios ──

  const handleRemoveUser = (u: WarehouseUserItem) => {
    setConfirmConfig({
      title: 'Desasignar Usuario',
      description: `¿Desasignar a "${u.full_name}" de este almacén?`,
      confirmLabel: 'Desasignar',
      onConfirm: async () => {
        try {
          await warehousesService.removeUser(warehouseId, u.tenant_user_id);
          toast.success('Usuario desasignado');
          fetchWarehouse();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Error desasignando usuario');
        }
      },
    });
    setConfirmOpen(true);
  };

  // ── Asignar usuarios ──

  const assignedIds = new Set(warehouse?.users.map((u) => u.tenant_user_id) ?? []);

  const fetchAvailableUsers = useCallback(async (search: string) => {
    setLoadingUsers(true);
    try {
      const res = await usersService.getUsers({ search: search || undefined, isActive: true, take: 20 });
      setAvailableUsers(res.data);
    } catch {
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const openUserModal = () => {
    setSelectedUserIds(new Set());
    setUserSearch('');
    setAvailableUsers([]);
    setUserModalOpen(true);
    // Carga inicial
    setTimeout(() => fetchAvailableUsers(''), 100);
  };

  useEffect(() => {
    if (!userModalOpen) return;
    if (userDebounceRef.current) clearTimeout(userDebounceRef.current);
    userDebounceRef.current = setTimeout(() => fetchAvailableUsers(userSearch), 300);
    return () => { if (userDebounceRef.current) clearTimeout(userDebounceRef.current); };
  }, [userSearch, userModalOpen, fetchAvailableUsers]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAssignUsers = async () => {
    if (selectedUserIds.size === 0) return;
    setSavingUser(true);
    try {
      await warehousesService.assignUsers(warehouseId, Array.from(selectedUserIds));
      toast.success(`${selectedUserIds.size} usuario(s) asignado(s)`);
      setUserModalOpen(false);
      fetchWarehouse();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error asignando usuarios');
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando almacén...</p>
        </div>
      </div>
    );
  }

  if (!warehouse) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/warehouses')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{warehouse.name}</h1>
              {warehouse.is_principal && (
                <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 dark:border-orange-500 dark:text-orange-400">
                  Principal
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono">{warehouse.consecutive}</p>
          </div>
        </div>
      </div>

      {/* Usuarios del almacén */}
      {canAssignUsers && (
        <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuarios con acceso
                <Badge variant="secondary" className="text-xs">{warehouse.users.length}</Badge>
              </CardTitle>
              <Button size="sm" onClick={openUserModal}>
                <Plus className="h-4 w-4 mr-1" />
                Asignar usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-slate-700">
                  <TableHead className="text-gray-600 dark:text-slate-300">Nombre</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300">Email</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 w-[160px]">Asignado</TableHead>
                  <TableHead className="text-gray-600 dark:text-slate-300 text-right w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouse.users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-gray-500 dark:text-slate-400"
                    >
                      No hay usuarios asignados a este almacén
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouse.users.map((u) => (
                    <TableRow key={u.id} className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40">
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">{u.full_name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-slate-400">{u.email}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(u.assigned_at).toLocaleDateString('es-CO')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleRemoveUser(u)}
                          title="Desasignar"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmLabel={confirmConfig.confirmLabel}
        onConfirm={confirmConfig.onConfirm}
      />

      {/* Modal Asignar Usuarios */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Usuarios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-md">
              {loadingUsers ? (
                <div className="py-8 text-center text-gray-500">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                </div>
              ) : availableUsers.filter((u) => !assignedIds.has(u.id)).length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  {availableUsers.length > 0 ? 'Todos los usuarios ya están asignados' : 'No se encontraron usuarios'}
                </div>
              ) : (
                availableUsers
                  .filter((u) => !assignedIds.has(u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors border-b border-gray-100 dark:border-slate-700/50 last:border-b-0"
                    >
                      <div className={`h-5 w-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        selectedUserIds.has(u.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 dark:border-slate-600'
                      }`}>
                        {selectedUserIds.has(u.id) && <Check className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{u.full_name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 truncate">{u.email}</div>
                      </div>
                      {u.role && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">{u.role.role_name}</Badge>
                      )}
                    </button>
                  ))
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500">
                {selectedUserIds.size > 0 ? `${selectedUserIds.size} seleccionado(s)` : 'Selecciona usuarios'}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setUserModalOpen(false)} disabled={savingUser}>Cancelar</Button>
                <Button onClick={handleAssignUsers} disabled={savingUser || selectedUserIds.size === 0}>
                  {savingUser && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Asignar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
