import { ActionDef } from '../types';

// ===== MÓDULO 4: USER_MANAGEMENT (16 permisos) =====
export const user_managementActions: ActionDef[] = [
    { action_key: 'users.view', action_name: 'Ver Usuarios', description: 'Ver usuarios' },
    { action_key: 'users.invite', action_name: 'Invitar Usuario', description: 'Invitar usuario' },
    { action_key: 'users.create', action_name: 'Crear Usuario', description: 'Crear usuario' },
    { action_key: 'users.edit', action_name: 'Editar Usuario', description: 'Editar usuario' },
    { action_key: 'users.delete', action_name: 'Eliminar Usuario', description: 'Eliminar usuario' },
    { action_key: 'users.activate', action_name: 'Activar Usuario', description: 'Activar usuario' },
    { action_key: 'users.deactivate', action_name: 'Desactivar Usuario', description: 'Desactivar usuario' },
    { action_key: 'users.role.assign', action_name: 'Asignar Rol', description: 'Asignar rol' },
    { action_key: 'users.modules.assign', action_name: 'Asignar Módulos', description: 'Asignar módulos' },
    { action_key: 'users.permissions.view', action_name: 'Ver Permisos', description: 'Ver permisos' },
    { action_key: 'users.permissions.edit', action_name: 'Editar Permisos', description: 'Editar permisos' },
    { action_key: 'roles.view', action_name: 'Ver Roles', description: 'Ver roles' },
    { action_key: 'roles.create', action_name: 'Crear Rol', description: 'Crear rol' },
    { action_key: 'roles.edit', action_name: 'Editar Rol', description: 'Editar rol' },
    { action_key: 'roles.delete', action_name: 'Eliminar Rol', description: 'Eliminar rol' },
    { action_key: 'roles.permissions.assign', action_name: 'Asignar Permisos a Rol', description: 'Asignar permisos a rol' },
  ];
