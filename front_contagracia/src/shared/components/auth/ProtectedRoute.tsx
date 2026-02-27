'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { AccessDenied } from './AccessDenied';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Permiso requerido para acceder (action_key) */
  permission?: string;
  /** Módulo requerido para acceder (module_key) */
  module?: string;
  /** Cualquiera de estos permisos permite acceso (OR) */
  anyPermission?: string[];
  /** Todos estos permisos son requeridos (AND) */
  allPermissions?: string[];
  /** Mensaje personalizado de acceso denegado */
  deniedMessage?: string;
}

export function ProtectedRoute({
  children,
  permission,
  module,
  anyPermission,
  allPermissions,
  deniedMessage,
}: ProtectedRouteProps) {
  const { can, canAccessModule, canAny, canAll } = usePermissions();

  let hasAccess = true;

  // Verificar permiso específico
  if (permission) {
    hasAccess = can(permission);
  }

  // Verificar acceso a módulo
  if (module && hasAccess) {
    hasAccess = canAccessModule(module);
  }

  // Verificar cualquiera de los permisos (OR)
  if (anyPermission && anyPermission.length > 0 && hasAccess) {
    hasAccess = canAny(anyPermission);
  }

  // Verificar todos los permisos (AND)
  if (allPermissions && allPermissions.length > 0 && hasAccess) {
    hasAccess = canAll(allPermissions);
  }

  if (!hasAccess) {
    return <AccessDenied message={deniedMessage} />;
  }

  return <>{children}</>;
}
