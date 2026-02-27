import { useAuthStore } from '@/modules/auth/stores/authStore';

/**
 * Hook para verificar permisos del usuario
 * Utiliza los permissions almacenados en el authStore
 * Owner y Admin tienen acceso total a los módulos de su plan
 */
export const usePermissions = () => {
  const permissions = useAuthStore((state) => state.permissions);
  const role = useAuthStore((state) => state.role);

  // Owner y Admin tienen bypass total
  const isPrivileged = role === 'owner' || role === 'admin';

  /**
   * Verifica si el usuario puede realizar una acción específica
   * El backend ya resuelve los permisos según el rol:
   * - Owner/Admin: tienen todas las acciones de sus módulos
   * - Usuarios normales: solo las acciones de su rol + overrides
   * @param action - El identificador de la acción (ej: 'chart_of_accounts.view')
   */
  const can = (action: string): boolean => {
    return permissions?.actions?.includes(action) ?? false;
  };

  /**
   * Verifica si el usuario tiene acceso a un módulo específico
   * @param moduleKey - El identificador del módulo (ej: 'invoicing', 'inventory', 'payroll')
   */
  const canAccessModule = (moduleKey: string): boolean => {
    return permissions?.modules?.includes(moduleKey) ?? false;
  };

  /**
   * Verifica si el usuario puede realizar cualquiera de las acciones especificadas
   * @param actions - Array de acciones a verificar
   */
  const canAny = (actions: string[]): boolean => {
    return actions.some((action) => can(action));
  };

  /**
   * Verifica si el usuario puede realizar todas las acciones especificadas
   * @param actions - Array de acciones a verificar
   */
  const canAll = (actions: string[]): boolean => {
    return actions.every((action) => can(action));
  };

  /**
   * Verifica si el usuario tiene acceso a cualquiera de los módulos especificados
   * @param modules - Array de módulos a verificar
   */
  const canAccessAnyModule = (modules: string[]): boolean => {
    return modules.some((module) => canAccessModule(module));
  };

  /**
   * Verifica si el usuario tiene acceso a todos los módulos especificados
   * @param modules - Array de módulos a verificar
   */
  const canAccessAllModules = (modules: string[]): boolean => {
    return modules.every((module) => canAccessModule(module));
  };

  return {
    permissions,
    role,
    isPrivileged,
    can,
    canAccessModule,
    canAny,
    canAll,
    canAccessAnyModule,
    canAccessAllModules,
  };
};
