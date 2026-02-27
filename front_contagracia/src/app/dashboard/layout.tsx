'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth, useAuthHydrated, useAuthStore } from '@/modules/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/shared/components/layout/Header';
import { Sidebar } from '@/shared/components/layout/Sidebar';
import { BackButton } from '@/shared/components/layout/BackButton';
import { RealtimeProvider } from '@/shared/providers/RealtimeProvider';
import { CompanySettingsProvider } from '@/shared/providers/CompanySettingsProvider';
import { CompanyModulesProvider } from '@/shared/providers/CompanyModulesProvider';
import { SessionDisplacedOverlay } from '@/shared/components/overlays/SessionDisplacedOverlay';

const FloatingAIChat = dynamic(() => import('@/shared/components/ai/FloatingAIChat'), { ssr: false });

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated } = useAuth();
  const hydrated = useAuthHydrated();
  const router = useRouter();
  const userType = useAuthStore((s) => s.userType);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/');
    } else if (userType === 'system_admin') {
      router.push('/admin');
    }
  }, [hydrated, isAuthenticated, userType, router]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full"></div>
          <p className="text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <RealtimeProvider>
      <CompanyModulesProvider>
      <CompanySettingsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header fijo en la parte superior */}
        <Header />

        {/* Sidebar debajo del header */}
        <Sidebar />

        {/* Botón de navegación hacia atrás (abajo derecha) */}
        <BackButton />

        {/* Main content - con padding para header y sidebar */}
        <div className="pt-16 pl-17.5 transition-all duration-300">
          {children}
        </div>

        {/* Floating AI Chat */}
        <FloatingAIChat />
      </div>
      </CompanySettingsProvider>
      </CompanyModulesProvider>

      {/* Overlay de sesión desplazada (tipo WhatsApp Web) */}
      <SessionDisplacedOverlay />
    </RealtimeProvider>
  );
}
