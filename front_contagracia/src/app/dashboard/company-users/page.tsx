'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Pencil,
  Shield,
  Mail,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { ActionSelector } from '@/shared/components/ui/action-selector';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { ThirdPartySelect } from '@/shared/components/ui/third-party-select';
import { Label } from '@/shared/components/ui/label';
import { ProtectedRoute } from '@/shared/components/auth';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { useAuthStore } from '@/modules/auth/stores/authStore';
import { useUsers, useRoles } from '@/modules/company/hooks/useUsers';
import type { TenantUser, CreateTenantUserDto, UpdateTenantUserDto, Role } from '@/modules/company/types';

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getRoleBadgeColor(roleKey?: string) {
  switch (roleKey) {
    case 'owner':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'admin':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

const PAGE_SIZE = 20;

export default function CompanyUsersPage() {
  const { can, canAny } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const { users, total, maxUsers, loading, error, params, createUser, updateUser, toggleUserStatus, changeUserRole, search, paginate } = useUsers({ take: PAGE_SIZE });
  const { roles, createRole, getRole, updateRole, deleteRole } = useRoles();

  // Verificar si puede crear más usuarios (total < maxUsers del plan + user_plus)
  // maxUsers === -1 significa ilimitado
  const isUnlimited = maxUsers === -1;
  const canCreateMoreUsers = isUnlimited || total < maxUsers;

  // Verificar si puede editar un usuario específico
  // El owner solo puede ser editado por sí mismo
  const canEditUser = (user: TenantUser) => {
    if (!can('users.edit')) return false;
    if (user.role?.role_key === 'owner') {
      return currentUser?.id === user.id;
    }
    return true;
  };

  // Verificar si el usuario tiene algún permiso de acción
  const hasAnyActionPermission = canAny(['users.edit', 'users.role.assign', 'users.activate', 'users.deactivate']);

  const currentPage = Math.floor((params.skip || 0) / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [formData, setFormData] = useState<CreateTenantUserDto & { third_party_id?: string }>({
    email: '',
    password: '',
    full_name: '',
    role_id: '',
    third_party_id: '',
  });
  const [thirdPartyLabel, setThirdPartyLabel] = useState('');
  const [roleFormData, setRoleFormData] = useState({
    role_key: '',
    role_name: '',
    description: '',
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleteRoleName, setDeleteRoleName] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchTerm);
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const payload: any = { ...formData };
      if (!payload.third_party_id) delete payload.third_party_id;
      await createUser(payload);
      setIsCreateOpen(false);
      setFormData({ email: '', password: '', full_name: '', role_id: '', third_party_id: '' });
      setThirdPartyLabel('');
    } catch (err) {
      console.error('Error creating user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    try {
      setSubmitting(true);
      const updateData: UpdateTenantUserDto = {};
      if (formData.email && formData.email !== selectedUser.email) updateData.email = formData.email;
      if (formData.full_name && formData.full_name !== selectedUser.full_name) updateData.full_name = formData.full_name;
      if (formData.password) updateData.password = formData.password;

      await updateUser(selectedUser.id, updateData);
      setIsEditOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: TenantUser) => {
    try {
      await toggleUserStatus(user.id, !user.is_active);
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRoleId) return;
    try {
      setSubmitting(true);
      await changeUserRole(selectedUser.id, selectedRoleId);
      setIsRoleOpen(false);
      setSelectedUser(null);
      setSelectedRoleId('');
    } catch (err) {
      console.error('Error changing role:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRole = async () => {
    if (!roleFormData.role_key || !roleFormData.role_name) return;
    try {
      setSubmitting(true);
      const permissions = Array.from(selectedPermissions).map((action_key) => ({
        action_key,
        granted: true,
      }));

      if (editingRoleId) {
        // Update: solo enviar campos permitidos (sin role_key)
        await updateRole(editingRoleId, {
          role_name: roleFormData.role_name,
          description: roleFormData.description || undefined,
          permissions,
        });
      } else {
        // Create: incluir role_key
        await createRole({
          role_key: roleFormData.role_key.toLowerCase().replace(/\s+/g, '_'),
          role_name: roleFormData.role_name,
          description: roleFormData.description || undefined,
          permissions,
        });
      }

      setIsCreateRoleOpen(false);
      setRoleFormData({ role_key: '', role_name: '', description: '' });
      setSelectedPermissions(new Set());
      setEditingRoleId(null);
    } catch (err) {
      console.error('Error saving role:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleId) return;
    try {
      setSubmitting(true);
      await deleteRole(deleteRoleId);
      setDeleteRoleId(null);
      setDeleteRoleName('');
      toast.success('Rol eliminado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar rol');
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteRole = (role: Role) => {
    setDeleteRoleId(role.id);
    setDeleteRoleName(role.role_name);
  };

  const openEditRole = async (role: Role) => {
    try {
      setSubmitting(true);
      const fullRole = await getRole(role.id);
      setRoleFormData({
        role_key: fullRole.role_key,
        role_name: fullRole.role_name,
        description: fullRole.description || '',
      });
      setSelectedPermissions(new Set(fullRole.permissions?.map((p) => p.action_key) || []));
      setEditingRoleId(role.id);
      setIsCreateRoleOpen(true);
    } catch (err) {
      console.error('Error loading role:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (user: TenantUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role_id: user.role?.id || '',
    });
    setIsEditOpen(true);
  };

  const openRoleChange = (user: TenantUser) => {
    setSelectedUser(user);
    setSelectedRoleId(user.role?.id || '');
    setIsRoleOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute permission="users.view" deniedMessage="No tienes permisos para ver usuarios.">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Usuarios y Roles
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Gestiona los usuarios y roles de tu empresa
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Gestión de Roles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6 space-y-6">
            {/* Límite y Botón Nuevo Usuario */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-slate-400">
                <span className="font-medium text-gray-700 dark:text-slate-300">{total}</span> de{' '}
                <span className="font-medium text-gray-700 dark:text-slate-300">{isUnlimited ? 'Ilimitados' : maxUsers}</span> usuarios
              </div>
              {can('users.create') && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  disabled={!canCreateMoreUsers}
                  title={!canCreateMoreUsers ? 'Has alcanzado el límite de usuarios de tu plan' : undefined}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              )}
            </div>

            {/* Alerta de límite alcanzado */}
            {!canCreateMoreUsers && (
              <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Has alcanzado el límite de <strong>{maxUsers} usuarios</strong> de tu plan.
                    Contacta a soporte para aumentar tu límite.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Search */}
            <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardContent className="p-4">
                <form onSubmit={handleSearch} className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" variant="secondary">
                    Buscar
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <CardContent className="p-4 text-red-600 dark:text-red-400">
                  {error}
                </CardContent>
              </Card>
            )}

            {/* Users Table */}
            <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Lista de Usuarios</span>
                  <Badge variant="secondary">{total} usuarios</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-700">
                        <TableHead className="text-gray-600 dark:text-slate-300">Usuario</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">Rol</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">Estado</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">Último acceso</TableHead>
                        {hasAnyActionPermission && (
                          <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={hasAnyActionPermission ? 5 : 4} className="text-center py-8 text-gray-500 dark:text-slate-400">
                            No hay usuarios registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow
                            key={user.id}
                            className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {user.full_name}
                                </span>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.role ? (
                                <Badge className={getRoleBadgeColor(user.role.role_key)}>
                                  {user.role.role_name}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">Sin rol</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.is_active ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  Activo
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                  Inactivo
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                                <Calendar className="h-3 w-3" />
                                {formatDate(user.last_login_at)}
                              </div>
                            </TableCell>
                            {hasAnyActionPermission && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {canEditUser(user) && (
                                      <DropdownMenuItem onClick={() => openEdit(user)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                    )}
                                    {can('users.role.assign') && user.role?.role_key !== 'owner' && (
                                      <DropdownMenuItem onClick={() => openRoleChange(user)}>
                                        <Shield className="h-4 w-4 mr-2" />
                                        Cambiar Rol
                                      </DropdownMenuItem>
                                    )}
                                    {user.is_active && can('users.deactivate') && user.role?.role_key !== 'owner' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                          <UserX className="h-4 w-4 mr-2" />
                                          Desactivar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {!user.is_active && can('users.activate') && user.role?.role_key !== 'owner' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Activar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Página {currentPage} de {totalPages} ({total} usuarios)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate((currentPage - 2) * PAGE_SIZE)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage * PAGE_SIZE)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="roles" className="mt-6 space-y-6">
            {/* Botón Crear Rol */}
            {can('roles.create') && (
              <div className="flex justify-end">
                <Button onClick={() => setIsCreateRoleOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Rol
                </Button>
              </div>
            )}

            {/* Roles Management */}
            <Card className="bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Roles Disponibles</span>
                  <Badge variant="secondary">{roles.length} roles</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-700">
                        <TableHead className="text-gray-600 dark:text-slate-300">Rol</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">Descripción</TableHead>
                        <TableHead className="text-gray-600 dark:text-slate-300">Usuarios</TableHead>
                        {canAny(['roles.edit', 'roles.delete', 'roles.permissions.assign']) && (
                          <TableHead className="text-gray-600 dark:text-slate-300 text-right">Acciones</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={canAny(['roles.edit', 'roles.delete', 'roles.permissions.assign']) ? 4 : 3} className="text-center py-8 text-gray-500 dark:text-slate-400">
                            No hay roles configurados
                          </TableCell>
                        </TableRow>
                      ) : (
                        roles.map((role) => (
                          <TableRow
                            key={role.id}
                            className="border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/40"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadgeColor(role.role_key)}>
                                  {role.role_name}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-slate-400">
                              {role.description || 'Sin descripción'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {users.filter(u => u.role?.id === role.id).length} usuarios
                              </Badge>
                            </TableCell>
                            {canAny(['roles.edit', 'roles.delete', 'roles.permissions.assign']) && (
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {can('roles.edit') && (
                                      <DropdownMenuItem onClick={() => openEditRole(role)}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                    )}
                                    {can('roles.delete') && role.role_key !== 'owner' && !role.is_system && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => openDeleteRole(role)}
                                          className="text-red-600 dark:text-red-400"
                                        >
                                          <UserX className="h-4 w-4 mr-2" />
                                          Eliminar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <SearchableSelect
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.role_name,
                    description: role.description || undefined,
                  }))}
                  value={formData.role_id}
                  onChange={(value) => setFormData({ ...formData, role_id: value })}
                  placeholder="Seleccionar rol"
                  searchPlaceholder="Buscar rol..."
                />
              </div>
              <div className="space-y-2">
                <Label>Vincular a tercero (opcional)</Label>
                <ThirdPartySelect
                  value={formData.third_party_id || ''}
                  valueLabel={thirdPartyLabel}
                  onChange={(id, tp) => {
                    setFormData({ ...formData, third_party_id: id || '' });
                    setThirdPartyLabel(tp ? `${tp.identification_number} - ${tp.name}` : '');
                  }}
                  placeholder="Buscar tercero..."
                />
                <p className="text-xs text-gray-500">
                  Vincula este usuario a un tercero existente (copropietario, arrendatario, etc.)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Nombre completo</Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_password">Nueva contraseña (dejar vacío para no cambiar)</Label>
                <Input
                  id="edit_password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nueva contraseña"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={isRoleOpen} onOpenChange={setIsRoleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambiar Rol</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Cambiar rol de <strong>{selectedUser?.full_name}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="new_role">Nuevo Rol</Label>
                <SearchableSelect
                  options={roles.map((role) => ({
                    value: role.id,
                    label: role.role_name,
                    description: role.description || undefined,
                  }))}
                  value={selectedRoleId}
                  onChange={setSelectedRoleId}
                  placeholder="Seleccionar rol"
                  searchPlaceholder="Buscar rol..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleChangeRole} disabled={submitting}>
                {submitting ? 'Cambiando...' : 'Cambiar Rol'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create/Edit Role Dialog */}
        <Dialog open={isCreateRoleOpen} onOpenChange={(open) => {
          setIsCreateRoleOpen(open);
          if (!open) {
            setRoleFormData({ role_key: '', role_name: '', description: '' });
            setSelectedPermissions(new Set());
            setEditingRoleId(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoleId ? 'Editar Rol' : 'Crear Nuevo Rol'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role_key">Clave del Rol *</Label>
                  <Input
                    id="role_key"
                    placeholder="ej: supervisor, vendedor"
                    value={roleFormData.role_key}
                    onChange={(e) => setRoleFormData({ ...roleFormData, role_key: e.target.value })}
                    disabled={!!editingRoleId}
                  />
                  {!editingRoleId && (
                    <p className="text-xs text-gray-500">
                      Se convertirá a minúsculas sin espacios
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role_name">Nombre del Rol *</Label>
                  <Input
                    id="role_name"
                    placeholder="ej: Supervisor, Vendedor"
                    value={roleFormData.role_name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, role_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role_description">Descripción</Label>
                <Input
                  id="role_description"
                  placeholder="Descripción del rol (opcional)"
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Permisos del Rol</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Selecciona las acciones que podrán realizar los usuarios con este rol
                </p>
                <ActionSelector
                  selectedActions={selectedPermissions}
                  onChange={setSelectedPermissions}
                  pageSize={20}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={submitting || !roleFormData.role_key || !roleFormData.role_name}
              >
                {submitting ? 'Guardando...' : (editingRoleId ? 'Guardar Cambios' : 'Crear Rol')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Role Confirmation Dialog */}
        <Dialog open={!!deleteRoleId} onOpenChange={(open) => !open && setDeleteRoleId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Rol</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600 dark:text-slate-400">
              ¿Estás seguro de que deseas eliminar el rol <strong>{deleteRoleName}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-500">
              Esta acción no se puede deshacer. Si el rol tiene usuarios asignados, deberás reasignarlos primero.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteRoleId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRole}
                disabled={submitting}
              >
                {submitting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
