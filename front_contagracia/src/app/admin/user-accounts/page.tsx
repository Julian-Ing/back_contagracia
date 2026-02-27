'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  X,
  Loader2,
  Building2,
  UserX,
  UserPlus,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import toast from 'react-hot-toast';
import { adminService } from '@/modules/admin/services/admin.service';
import type { UserAccount } from '@/modules/admin';

export default function UserAccountsPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getUsers(1, 100);
      setUsers(response.data);
    } catch (err) {
      toast.error('Error al cargar usuarios');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(term) ||
        user.full_name?.toLowerCase().includes(term) ||
        user.company_name?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await adminService.updateUserStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: newStatus as 'active' | 'inactive' } : u
        )
      );
      toast.success(newStatus === 'active' ? 'Usuario activado' : 'Usuario desactivado');
    } catch (err) {
      toast.error('Error al actualizar el estado del usuario');
      console.error(err);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast.success('Usuario eliminado permanentemente');
      setDeleteTarget(null);
    } catch (err) {
      toast.error('Error al eliminar el usuario');
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email.trim() || !createForm.password.trim()) return;

    setCreating(true);
    try {
      await adminService.createUser({
        email: createForm.email,
        password: createForm.password,
        full_name: createForm.full_name || undefined,
        phone: createForm.phone || undefined,
      });
      toast.success('Usuario creado exitosamente');
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '', full_name: '', phone: '' });
      setShowPassword(false);
      fetchUsers();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al crear usuario';
      toast.error(message);
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      {/* Header */}
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gestión de Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Administra usuarios y sus membresías en las compañías
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Crear Usuario
        </Button>
      </header>

      {/* Card */}
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-transparent">
        {/* Card Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Usuarios Registrados</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Lista de todos los usuarios del sistema con sus membresías
          </p>

          {/* Search */}
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-12 w-12 mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                No se encontraron usuarios
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm
                  ? 'Intenta con otro término de búsqueda'
                  : 'No hay usuarios registrados'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.full_name || user.email}
                      </span>
                      {user.full_name && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </span>
                      )}
                      <Badge
                        className={
                          user.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30'
                        }
                      >
                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600">
                        {user.role === 'admin' ? 'Admin' : 'Usuario'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span>Registrado: {formatDate(user.created_at)}</span>

                      {user.company_id && user.company_name ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{user.company_name}</span>
                          <Badge className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600 text-xs">
                            {user.company_role === 'admin' ? 'Administrador' : 'Usuario'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-orange-400">Sin compañía asignada</span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      className={
                        user.status === 'active'
                          ? 'bg-red-900 hover:bg-red-800 text-red-300'
                          : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-300'
                      }
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      {user.status === 'active' ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(user)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Usuario Permanentemente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Estás a punto de eliminar a <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>. Esta acción es irreversible y eliminará:
            </p>
            <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1 list-disc pl-5">
              <li>La cuenta del usuario</li>
              <li>Todas las sesiones activas</li>
              {deleteTarget?.company_name && (
                <>
                  <li>La compañía <strong>{deleteTarget.company_name}</strong></li>
                  <li>La base de datos del tenant (todos los datos de la empresa)</li>
                  <li>Subscripciones, permisos y notificaciones</li>
                </>
              )}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                className="border-gray-300 dark:border-slate-600"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar Permanentemente'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Usuario</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={8}
                  className="pr-10 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                placeholder="Juan Pérez"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="+573001234567"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              El usuario se creará con email verificado y podrá iniciar sesión inmediatamente.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="border-gray-300 dark:border-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating || !createForm.email.trim() || !createForm.password.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Usuario'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
