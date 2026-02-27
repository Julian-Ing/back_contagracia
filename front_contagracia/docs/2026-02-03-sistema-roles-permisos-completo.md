# Sistema de Roles y Permisos - Implementación Completa

**Fecha:** 2026-02-03

## Resumen General

Implementación completa del sistema de gestión de roles con asignación de permisos, incluyendo:
- CRUD de roles con permisos
- Selector de acciones paginado con búsqueda fuzzy
- Corrección del filtrado de módulos/acciones en login
- Integración frontend completa

---

## BACKEND

### 1. auth-service

#### Archivo: `src/modules/auth/auth.service.ts`

**Cambios:**

1. **Nueva función `getVisibleModules`** - Filtra módulos según acciones del usuario:
```typescript
private getVisibleModules(
  planModules: { module: { module_key: string; actions: { action_key: string }[] } }[],
  userActions: string[],
): string[] {
  const userActionsSet = new Set(userActions);
  const visibleModules: string[] = [];

  for (const pm of planModules) {
    const hasActionInModule = pm.module.actions.some((a) => userActionsSet.has(a.action_key));
    if (hasActionInModule) {
      visibleModules.push(pm.module.module_key);
    }
  }

  return visibleModules;
}
```

2. **Modificación en `resolveUserPermissions`** - Mejor manejo de tipos y validación:
```typescript
private async resolveUserPermissions(
  tenantPrisma: TenantPrismaClient,
  tenantUser: { id: string; role_id: string | null; role: { role_key: string } | null },
  planModules: { module: { module_key: string; actions: { action_key: string }[] } }[],
): Promise<string[]> {
  const allPlanActions = planModules.flatMap((pm) =>
    pm.module.actions.map((a) => a.action_key),
  );

  // Owner y Admin bypass
  const roleKey = tenantUser.role?.role_key;
  if (roleKey === 'owner' || roleKey === 'admin') {
    return allPlanActions;
  }

  // Sin rol = sin permisos
  if (!tenantUser.role_id) {
    return [];
  }

  // Permisos del rol
  const rolePermissions = await tenantPrisma.rolePermission.findMany({
    where: { role_id: tenantUser.role_id, granted: true },
    select: { action_key: true },
  });

  const roleActions = new Set(rolePermissions.map((rp) => rp.action_key));

  // Overrides del usuario
  const userPermissions = await tenantPrisma.tenantUserPermission.findMany({
    where: { tenant_user_id: tenantUser.id },
    select: { action_key: true, granted: true },
  });

  for (const up of userPermissions) {
    if (up.granted) {
      roleActions.add(up.action_key);
    } else {
      roleActions.delete(up.action_key);
    }
  }

  // Filtrar solo acciones del plan
  const planActionSet = new Set(allPlanActions);
  return [...roleActions].filter((a) => planActionSet.has(a));
}
```

3. **Modificación en `login`** - Usar módulos filtrados:
```typescript
// Resolver permisos del usuario
const resolvedActions = await this.resolveUserPermissions(
  tenantPrisma,
  tenantUser,
  subscription.plan.plan_modules,
);

// Módulos visibles según rol
const isPrivileged = tenantUser.role.role_key === 'owner' || tenantUser.role.role_key === 'admin';
const visibleModules = isPrivileged
  ? this.getEnabledModules(subscription.plan.plan_modules)
  : this.getVisibleModules(subscription.plan.plan_modules, resolvedActions);

// Respuesta con módulos filtrados
return {
  // ...
  permissions: {
    modules: visibleModules,  // <-- Antes era enabledModules (todos)
    actions: resolvedActions,
  },
};
```

---

### 2. users-service

#### Archivo: `src/modules/roles/roles.controller.ts`

**Cambios:**

1. **Import de Patch**:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,  // <-- Nuevo
  Body,
  Param,
  Query,
  Request,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
```

2. **Import de UpdateRoleDto**:
```typescript
import { UpdateRoleDto } from './dto/update-role.dto';
```

3. **Nuevo endpoint PATCH**:
```typescript
@Patch(':id')
@ApiOperation({ summary: 'Actualizar un rol existente' })
@ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
@ApiResponse({ status: 403, description: 'Sin permisos o rol de sistema' })
@ApiResponse({ status: 404, description: 'Rol no encontrado' })
async update(
  @Request() req: any,
  @Param('id') id: string,
  @Body() dto: UpdateRoleDto,
) {
  return this.rolesService.update(req.user.company_id, req.user.sub, id, dto);
}
```

#### Archivo: `src/modules/roles/roles.service.ts`

**Cambios:**

1. **Imports**:
```typescript
import { Injectable, Logger, UnauthorizedException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UpdateRoleDto } from './dto/update-role.dto';
```

2. **Nuevo método `update`**:
```typescript
async update(companyId: string, currentUserId: string, roleId: string, dto: UpdateRoleDto) {
  const tenantDb = await this.getTenantDb(companyId);

  // Verificar que el usuario actual es admin
  const currentUser = await tenantDb.tenantUser.findUnique({
    where: { id: currentUserId },
    include: { role: true },
  });

  if (!currentUser?.role || !['owner', 'admin'].includes(currentUser.role.role_key)) {
    throw new ForbiddenException('Solo administradores pueden editar roles');
  }

  // Verificar que el rol existe
  const existingRole = await tenantDb.role.findUnique({
    where: { id: roleId },
  });

  if (!existingRole) {
    throw new NotFoundException('Rol no encontrado');
  }

  // No permitir editar roles del sistema
  if (existingRole.is_system) {
    throw new ForbiddenException('No se pueden editar roles del sistema');
  }

  // Actualizar en transacción
  await tenantDb.$transaction(async (tx: any) => {
    // Actualizar datos básicos
    const updateData: any = {};
    if (dto.role_name !== undefined) updateData.role_name = dto.role_name;
    if (dto.description !== undefined) updateData.description = dto.description;

    if (Object.keys(updateData).length > 0) {
      await tx.role.update({
        where: { id: roleId },
        data: updateData,
      });
    }

    // Actualizar permisos (replace)
    if (dto.permissions !== undefined) {
      await tx.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      if (dto.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissions.map((p) => ({
            role_id: roleId,
            action_key: p.action_key,
            granted: p.granted !== false,
          })),
        });
      }
    }
  });

  // Retornar rol actualizado
  const roleWithPermissions = await tenantDb.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });

  return {
    message: 'Rol actualizado exitosamente',
    role: {
      id: roleWithPermissions!.id,
      role_key: roleWithPermissions!.role_key,
      role_name: roleWithPermissions!.role_name,
      description: roleWithPermissions!.description,
      is_system: roleWithPermissions!.is_system,
      permissions: roleWithPermissions!.permissions.map((p: any) => ({
        action_key: p.action_key,
        granted: p.granted,
      })),
    },
  };
}
```

#### Archivo: `src/modules/roles/dto/update-role.dto.ts` (NUEVO)

```typescript
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionDto } from './create-role.dto';

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Nombre del rol', example: 'Supervisor' })
  @IsString()
  @IsOptional()
  role_name?: string;

  @ApiPropertyOptional({ description: 'Descripción del rol' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Permisos del rol', type: [PermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  @IsOptional()
  permissions?: PermissionDto[];
}
```

---

## FRONTEND

### 1. Hooks

#### Archivo: `src/shared/hooks/useDebounce.ts` (NUEVO)

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

#### Archivo: `src/shared/hooks/index.ts`

```typescript
export { usePermissions } from '@/shared/hooks/usePermissions';
export { useCatalogs } from '@/shared/hooks/useCatalogs';
export { useDebounce } from '@/shared/hooks/useDebounce';  // <-- Nuevo
```

#### Archivo: `src/modules/company/hooks/useUsers.ts`

**Cambios en `useRoles`:**
```typescript
export function useRoles() {
  // ... estado existente ...

  const getRole = async (id: string) => {
    return usersService.getRole(id);
  };

  const updateRole = async (id: string, data: Partial<CreateRoleDto>) => {
    const result = await usersService.updateRole(id, data);
    await fetchRoles();
    return result;
  };

  return {
    roles,
    loading,
    error,
    refetch: fetchRoles,
    createRole,
    getRole,      // <-- Nuevo
    updateRole,   // <-- Nuevo
  };
}
```

**Nuevo hook `useAvailableActions`:**
```typescript
export function useAvailableActions(options?: { limit?: number; autoLoad?: boolean }) {
  const { limit = 50, autoLoad = false } = options || {};

  const [actions, setActions] = useState<PlanAction[]>([]);
  const [modules, setModules] = useState<PlanModuleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1, limit, total: 0, totalPages: 0,
  });

  const debouncedSearch = useDebounce(search, 300);

  const fetchActions = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersService.getAvailableActions({
        page: pageNum,
        limit,
        search: debouncedSearch || undefined,
        module: selectedModule || undefined,
      });
      setActions(response.data);
      setModules(response.modules);
      setPagination(response.pagination);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar acciones');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedModule, limit]);

  useEffect(() => {
    if (autoLoad || debouncedSearch || selectedModule) {
      fetchActions(1);
    }
  }, [debouncedSearch, selectedModule, autoLoad, fetchActions]);

  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      fetchActions(pageNum);
    }
  };

  return {
    actions, modules, loading, error, pagination, page,
    search, setSearch, selectedModule, setSelectedModule,
    fetchActions, goToPage,
    nextPage: () => goToPage(page + 1),
    prevPage: () => goToPage(page - 1),
    reset: () => { setSearch(''); setSelectedModule(''); setPage(1); setActions([]); },
  };
}
```

---

### 2. Services

#### Archivo: `src/modules/company/services/users.service.ts`

**Nuevos métodos:**
```typescript
async updateRole(id: string, data: Partial<CreateRoleDto>): Promise<{ message: string; role: Role }> {
  const response = await usersClient.patch<{ message: string; role: Role }>(`/roles/${id}`, data);
  return response.data;
},

async getAvailableActions(params?: AvailableActionsParams): Promise<AvailableActionsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.search) queryParams.append('search', params.search);
  if (params?.module) queryParams.append('module', params.module);

  const query = queryParams.toString();
  const url = query ? `/roles/available-actions?${query}` : '/roles/available-actions';
  const response = await usersClient.get<AvailableActionsResponse>(url);
  return response.data;
},
```

---

### 3. Types

#### Archivo: `src/modules/company/types/index.ts`

**Nuevos tipos:**
```typescript
export interface PlanAction {
  action_key: string;
  action_name: string;
  module_key: string;
  module_name: string;
}

export interface PlanModuleOption {
  module_key: string;
  module_name: string;
}

export interface AvailableActionsParams {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
}

export interface AvailableActionsResponse {
  data: PlanAction[];
  modules: PlanModuleOption[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

### 4. Components

#### Archivo: `src/shared/components/ui/action-selector.tsx` (NUEVO)

Componente completo para seleccionar acciones/permisos:

**Props:**
```typescript
export interface ActionSelectorProps {
  selectedActions: Set<string>;
  onChange: (actions: Set<string>) => void;
  className?: string;
  pageSize?: number;  // Default: 20
}
```

**Características:**
- Búsqueda con debounce (300ms)
- Filtro por módulo (SearchableSelect)
- Paginación con números de página
- Checkbox "Seleccionar página"
- Agrupación visual por módulo
- Estados de carga y vacío

---

### 5. Page

#### Archivo: `src/app/dashboard/company-users/page.tsx`

**Nuevos estados:**
```typescript
const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
```

**Nueva función `openEditRole`:**
```typescript
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
```

**Función `handleSaveRole` (renombrada de handleCreateRole):**
```typescript
const handleSaveRole = async () => {
  if (!roleFormData.role_key || !roleFormData.role_name) return;
  try {
    setSubmitting(true);
    const roleData = {
      role_key: roleFormData.role_key.toLowerCase().replace(/\s+/g, '_'),
      role_name: roleFormData.role_name,
      description: roleFormData.description || undefined,
      permissions: Array.from(selectedPermissions).map((action_key) => ({
        action_key,
        granted: true,
      })),
    };

    if (editingRoleId) {
      await updateRole(editingRoleId, roleData);
    } else {
      await createRole(roleData);
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
```

**Dialog unificado crear/editar:**
```tsx
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
      {/* Campos del formulario */}
      <Input
        id="role_key"
        value={roleFormData.role_key}
        onChange={(e) => setRoleFormData({ ...roleFormData, role_key: e.target.value })}
        disabled={!!editingRoleId}  // <-- Deshabilitado al editar
      />

      {/* ActionSelector */}
      <ActionSelector
        selectedActions={selectedPermissions}
        onChange={setSelectedPermissions}
        pageSize={20}
      />
    </div>
    <DialogFooter>
      <Button onClick={handleSaveRole}>
        {editingRoleId ? 'Guardar Cambios' : 'Crear Rol'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Flujo de Permisos

```
┌─────────────────────────────────────────────────────────────────┐
│                           LOGIN                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐                                                │
│  │ Credenciales│ NIT + Email + Password                         │
│  └──────┬──────┘                                                │
│         ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ Obtener TenantUser con Role             │                    │
│  │ Obtener Plan con Módulos y Acciones     │                    │
│  └──────┬──────────────────────────────────┘                    │
│         ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ ¿Es Owner o Admin?                      │                    │
│  └──────┬──────────────────────────────────┘                    │
│         │                                                        │
│    SÍ ──┼──► Todas las acciones del plan                        │
│         │    Todos los módulos del plan                         │
│         │                                                        │
│    NO ──┼──► Solo acciones de RolePermission                    │
│         │    Solo módulos donde tiene acciones                  │
│         ▼                                                        │
│  ┌─────────────────────────────────────────┐                    │
│  │ Response: { permissions: { modules, actions } }              │
│  └─────────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         SIDEBAR                                  │
├─────────────────────────────────────────────────────────────────┤
│  permissions.modules → Filtra qué menús mostrar                 │
│  permissions.actions → Filtra items con permission específico   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Protección de Rutas y Tipos de Usuario

### Corrección del tipo `system_admin`

Se corrigió la confusión entre `owner` y `system_admin`:

- **`system_admin`**: Usuario administrador del sistema (tabla `User` en master DB). Va a `/admin`.
- **`owner`**: Dueño de una empresa (tenant). Es un `TenantUser` con rol `owner`. Va a `/dashboard`.
- **`company_user`**: Usuario normal de empresa. Va a `/dashboard`.

#### Archivo: `src/modules/auth/stores/authStore.ts`

```typescript
// Antes
userType: 'owner' | 'company_user' | null;

// Después
userType: 'system_admin' | 'owner' | 'company_user' | null;
```

#### Archivo: `src/modules/auth/services/authService.ts`

```typescript
// Antes: se normalizaba system_admin a owner (INCORRECTO)
const normalizedUserType = user_type === 'system_admin' ? 'owner' : user_type;

// Después: se usa el tipo tal cual viene del backend
userType: user_type,
```

#### Archivo: `src/modules/auth/components/AuthModal.tsx`

```typescript
// Antes
if (response.user_type === 'owner' || response.user_type === 'system_admin') {
  router.push('/admin');
}

// Después: Solo system_admin va a /admin
if (response.user_type === 'system_admin') {
  router.push('/admin');
}
```

#### Archivo: `src/app/page.tsx` (Landing)

```typescript
// Redirige según tipo de usuario
router.replace(userType === 'system_admin' ? '/admin' : '/dashboard');
```

#### Archivo: `src/app/admin/layout.tsx`

```typescript
// Protege /admin solo para system_admin
if (userType !== 'system_admin') {
  router.push('/dashboard');
}
```

#### Archivo: `src/app/dashboard/layout.tsx`

```typescript
// Protege /dashboard: redirige system_admin a /admin
if (userType === 'system_admin') {
  router.push('/admin');
}
```

---

### Permiso en Navegación

#### Archivo: `src/config/navigation.ts`

Se agregó `permission: 'users.view'` al item de Usuarios:

```typescript
{
  id: 'usuarios',
  label: 'Usuarios',
  href: '/dashboard/company-users',
  icon: UserPlus,
  modules: ['user_management'],
  permission: 'users.view',  // <-- NUEVO: requiere este permiso
},
```

---

### Tipos Actualizados

#### Archivo: `src/shared/types/user.types.ts`

```typescript
// LoginResponse ahora incluye system_admin
user_type: 'system_admin' | 'owner' | 'company_user';

// Company ahora incluye user_plus
interface Company {
  // ...
  user_plus: number; // Usuarios adicionales comprados
}

// Subscription ahora incluye max_users
interface Subscription {
  // ...
  max_users: number; // Límite de usuarios del plan
}
```

---

### Exports del módulo company

#### Archivo: `src/modules/company/index.ts`

```typescript
// Services
export { companyService } from '@/modules/company/services/company.service';
export { usersService } from '@/modules/company/services/users.service';

// Hooks
export { useUsers, useRoles } from '@/modules/company/hooks/useUsers';

// Types
export type {
  Company,
  RegisterCompanyDto,
  RegisterCompanyResponse,
  UpdateCompanyDto,
  TenantUser,
  TenantUserRole,
  TenantUsersResponse,
  CreateTenantUserDto,
  UpdateTenantUserDto,
  Role,
  RolesResponse,
} from '@/modules/company/types';
```

---

### Documentación actualizada

#### Archivo: `FASE3_INTEGRACION_FRONTEND.md`

Se eliminó referencia a `hierarchy` en equipos:

```diff
-| 11 | Equipos | `/dashboard/crm/team-management` | `GET /team/members`, hierarchy | ✅ |
+| 11 | Equipos | `/dashboard/crm/team-management` | `GET /team/members` | ✅ |
```

---

## Archivos Modificados

### Backend
- `auth-service/src/modules/auth/auth.service.ts`
- `users-service/src/modules/roles/roles.controller.ts`
- `users-service/src/modules/roles/roles.service.ts`
- `users-service/src/modules/roles/dto/update-role.dto.ts` (NUEVO)

### Frontend
- `src/shared/hooks/useDebounce.ts` (NUEVO)
- `src/shared/hooks/index.ts`
- `src/modules/company/hooks/useUsers.ts`
- `src/modules/company/services/users.service.ts`
- `src/modules/company/types/index.ts`
- `src/shared/components/ui/action-selector.tsx` (NUEVO)
- `src/app/dashboard/company-users/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/admin/layout.tsx`
- `src/app/page.tsx`
- `src/config/navigation.ts`
- `src/modules/auth/components/AuthModal.tsx`
- `src/modules/auth/services/authService.ts`
- `src/modules/auth/stores/authStore.ts`
- `src/modules/company/index.ts`
- `src/shared/types/user.types.ts`
- `FASE3_INTEGRACION_FRONTEND.md`
