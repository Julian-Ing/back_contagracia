'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useAuthHydrated } from '@/modules/auth';
import { useAuthStore } from '@/modules/auth';
import { AdminSidebar } from '@/shared/components/layout/AdminSidebar';
import { RealtimeProvider } from '@/shared/providers/RealtimeProvider';
import { SessionDisplacedOverlay } from '@/shared/components/overlays/SessionDisplacedOverlay';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, user } = useAuth();
  const hydrated = useAuthHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const isBuilder = pathname.includes('/builder');

  const userType = useAuthStore((s) => s.userType);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/');
    } else if (userType !== 'system_admin') {
      router.push('/dashboard');
    }
  }, [hydrated, isAuthenticated, userType, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-full"></div>
          <p className="text-gray-500 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Builder se renderiza fullscreen sin sidebar
  if (isBuilder) {
    return (
      <RealtimeProvider>
        {children}
        <SessionDisplacedOverlay />
      </RealtimeProvider>
    );
  }

  return (
    <RealtimeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
        {/* Admin Sidebar */}
        <AdminSidebar />

        {/* Main content */}
        <div className="pl-64 transition-all duration-300">
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Overlay de sesión desplazada (tipo WhatsApp Web) */}
      <SessionDisplacedOverlay />
    </RealtimeProvider>
  );
}
