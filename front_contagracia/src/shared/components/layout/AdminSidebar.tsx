'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/modules/auth';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Tags,
  UserCheck,
  Package,
  Calculator,
  UserCog,
  FileSpreadsheet,
  Newspaper,
  FileText,
  Edit2,
  BarChart2,
  Megaphone,
  Plug,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import { ThemeToggle } from '@/shared/components/ui/ThemeToggle';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const ADMIN_NAVIGATION: NavSection[] = [
  {
    id: 'main',
    label: '',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { id: 'companies', label: 'Gestión de Compañías', href: '/admin/companies', icon: Users },
      { id: 'categories', label: 'Categorías de Compañías', href: '/admin/categories', icon: Tags },
      { id: 'plans', label: 'Gestión de Planes', href: '/admin/plans', icon: Package },
      { id: 'users', label: 'Gestión de Usuarios', href: '/admin/user-accounts', icon: UserCog },
    ],
  },
  {
    id: 'content',
    label: 'Contenido',
    items: [
      { id: 'blog', label: 'Gestión de Blog', href: '/admin/blog', icon: Newspaper },
      { id: 'landing', label: 'Gestión Landing Page', href: '/admin/landing', icon: FileText },
      { id: 'cms', label: 'Páginas de Contenido', href: '/admin/cms', icon: Edit2 },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [
      { id: 'notifications', label: 'Enviar Notificaciones', href: '/admin/notifications', icon: Megaphone },
      { id: 'integrations', label: 'Integraciones', href: '/admin/integrations', icon: Plug },
      { id: 'site-settings', label: 'Configuración del Sitio', href: '/admin/site-settings', icon: Settings },
    ],
  },
];

function NavItemComponent({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group font-semibold',
        isActive
          ? 'bg-indigo-600 text-white shadow-md'
          : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm truncate">{item.label}</span>
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const isItemActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Gracia ERP</span>
            <span className="text-xs text-gray-500 dark:text-slate-400">Administración</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Current Session */}
      {user && (
        <div className="mx-4 mt-4 px-3 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500 dark:text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-slate-400">Sesión actual:</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={user.email}>
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {ADMIN_NAVIGATION.map((section) => (
          <div key={section.id}>
            {section.label && (
              <div className="mt-4 mb-2 px-1 text-xs uppercase tracking-wide text-gray-400 dark:text-slate-500/80 font-medium">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemComponent
                  key={item.id}
                  item={item}
                  isActive={isItemActive(item.href)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="pt-2">
          <Button
            onClick={() => setShowLogoutModal(true)}
            variant="ghost"
            className="w-full justify-start text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión
          </Button>
        </div>
      </nav>

      {/* Modal de confirmación */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cerrar Sesión</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cerrar tu sesión?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.aside>
  );
}

export default AdminSidebar;
