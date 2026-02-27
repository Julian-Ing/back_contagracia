'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
import { ChevronDown } from 'lucide-react';
import { NAVIGATION_CONFIG, shouldShowNavItem, type NavItemConfig } from '@/config/navigation';
import { usePermissions } from '@/shared/hooks/usePermissions';

/** Resuelve el label de un item: usa altLabel si el usuario NO tiene altLabelPermission */
function resolveLabel(item: NavItemConfig, userActions: string[]): string {
  if (item.altLabel && item.altLabelPermission) {
    return userActions.includes(item.altLabelPermission) ? item.label : item.altLabel;
  }
  return item.label;
}

// Componente NavItem simple (sin hijos)
function NavItem({
  item,
  isCollapsed,
  isActive,
}: {
  item: NavItemConfig;
  isCollapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-40 cursor-not-allowed font-medium"
        title="Próximamente"
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium truncate text-slate-400 dark:text-slate-500">{item.label}</span>
            {item.badge && (
              <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </span>
    );
  }

  return (
    <Link
      href={item.href || '#'}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group font-medium',
        isActive
          ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300'
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{item.label}</span>
      )}
      {item.badge && !isCollapsed && (
        <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// Componente ExpandableMenu (con hijos)
function ExpandableMenu({
  item,
  isCollapsed,
  pathname,
  enabledModules,
  userActions,
  level = 0,
}: {
  item: NavItemConfig;
  isCollapsed: boolean;
  pathname: string;
  enabledModules: string[];
  userActions: string[];
  level?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;

  // Verificar si algún hijo está activo
  const isChildActive = item.children?.some((child) => {
    if (child.href && pathname.startsWith(child.href)) return true;
    if (child.children) {
      return child.children.some((grandchild) => grandchild.href && pathname.startsWith(grandchild.href));
    }
    return false;
  });

  // Sincronizar con la ruta activa: abrir si un hijo está activo, cerrar si no
  useEffect(() => {
    setIsOpen(!!isChildActive);
  }, [isChildActive]);

  // Filtrar hijos según módulos habilitados y permisos
  const visibleChildren = item.children?.filter((child) => shouldShowNavItem(child, enabledModules, userActions)) || [];

  if (visibleChildren.length === 0) return null;

  return (
    <div className={cn(level > 0 && 'ml-2')}>
      {/* Header del menú expandible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 px-3 rounded-lg transition-all duration-150 group font-medium',
          level === 0 ? 'py-2' : 'py-1.5',
          isChildActive
            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
            : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300'
        )}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!isCollapsed && (
          <>
            <span className="text-sm font-medium truncate flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {/* Hijos */}
      {isOpen && !isCollapsed && (
        <div className="mt-0.5 ml-3 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-px">
          {visibleChildren.map((child) => {
            // Si el hijo tiene hijos, renderizar como ExpandableMenu recursivo
            if (child.children && child.children.length > 0) {
              return (
                <ExpandableMenu
                  key={child.id}
                  item={child}
                  isCollapsed={isCollapsed}
                  pathname={pathname}
                  enabledModules={enabledModules}
                  userActions={userActions}
                  level={level + 1}
                />
              );
            }

            // Renderizar como NavItem simple
            // Check if other siblings have paths that start with this child's path
            // If so, use exact match only to avoid conflicts (e.g., /dashboard/crm vs /dashboard/crm/campaigns)
            const hasSiblingWithSamePrefix = child.href && visibleChildren.some(
              (sibling) => sibling.id !== child.id && sibling.href?.startsWith(child.href + '/')
            );
            const isActive = child.href
              ? hasSiblingWithSamePrefix
                ? pathname === child.href
                : pathname === child.href || pathname.startsWith(child.href + '/')
              : false;
            const ChildIcon = child.icon;

            if (child.disabled) {
              return (
                <span
                  key={child.id}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md opacity-40 cursor-not-allowed text-sm"
                  title="Próximamente"
                >
                  <ChildIcon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap text-slate-400 dark:text-slate-500">{resolveLabel(child, userActions)}</span>
                  {child.badge && (
                    <span className="ml-auto px-1.5 py-0.5 text-[10px] font-medium bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full">
                      {child.badge}
                    </span>
                  )}
                </span>
              );
            }

            return (
              <Link
                key={child.id}
                href={child.href || '#'}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1 rounded-md transition-all duration-150 text-sm',
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-indigo-50/70 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300'
                )}
              >
                <ChildIcon className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{resolveLabel(child, userActions)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Componente Sidebar principal
export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { permissions } = usePermissions();

  // Módulos y acciones del usuario (el backend ya resuelve permisos según rol)
  const enabledModules = permissions?.modules ?? [];
  const userActions = permissions?.actions ?? [];

  // Manejar hover
  const handleMouseEnter = () => {
    setIsCollapsed(false);
  };

  const handleMouseLeave = () => {
    setIsCollapsed(true);
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        // Posición: debajo del header
        'fixed left-0 top-16 bottom-0 z-40',
        // Fondo con soporte claro/oscuro
        'bg-slate-50 dark:bg-slate-900/95',
        'border-r border-slate-200 dark:border-slate-800',
        'flex flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-17.5' : 'w-65 shadow-lg'
      )}
    >
      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {NAVIGATION_CONFIG.filter((item) => shouldShowNavItem(item, enabledModules, userActions)).map((item) => {
          // Si tiene hijos, renderizar como ExpandableMenu
          if (item.children && item.children.length > 0) {
            return (
              <ExpandableMenu
                key={item.id}
                item={item}
                isCollapsed={isCollapsed}
                pathname={pathname}
                enabledModules={enabledModules}
                userActions={userActions}
              />
            );
          }

          // Renderizar como NavItem simple
          // For /dashboard, only exact match (not subroutes like /dashboard/crm/...)
          const isActive = item.href
            ? item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/')
            : false;
          return (
            <NavItem
              key={item.id}
              item={item}
              isCollapsed={isCollapsed}
              isActive={isActive}
            />
          );
        })}
      </nav>

      {/* Footer del sidebar */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Contagracia v2.0
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
