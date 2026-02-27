'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { Shield, LayoutDashboard, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/modules/auth';

interface AdminViewToggleProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function AdminViewToggle({ position = 'top-right' }: AdminViewToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [overlay, setOverlay] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Por ahora, mostrar siempre para desarrollo
  // En producción, verificar si el usuario es admin
  const isAdmin = true; // TODO: Verificar rol desde el backend

  if (!user || !isAdmin) return null;

  const onToggle = () => {
    setOverlay(true);
    setTimeout(() => {
      const goingToAdmin = !pathname.startsWith('/admin');
      router.push(goingToAdmin ? '/admin' : '/dashboard');
      setTimeout(() => setOverlay(false), 400);
    }, 200);
  };

  const isInAdmin = pathname.startsWith('/admin');
  const btnLabel = isInAdmin ? 'Vista Usuario' : 'Vista Admin';
  const BtnIcon = isInAdmin ? LayoutDashboard : Shield;

  const posClasses: Record<string, string> = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <>
      <AnimatePresence>
        {overlay && (
          <motion.div
            key="admin-toggle-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="fixed inset-0 z-[60] pointer-events-none"
          >
            {/* Fondo con gradiente animado */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-indigo-500/40 via-indigo-500/20 to-transparent"
            />
            <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
            <Sparkles className="absolute left-6 top-6 h-6 w-6 text-indigo-500/70" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`fixed z-[61] ${posClasses[position]}`}>
        <div className="relative">
          <Button
            onClick={onToggle}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            variant="secondary"
            size="icon"
            className="shadow-lg rounded-full h-10 w-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <BtnIcon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          </Button>

          {/* Tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-900 dark:bg-slate-700 text-white text-sm font-medium rounded-md whitespace-nowrap"
              >
                {btnLabel}
                {/* Flecha del tooltip */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-slate-700" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export default AdminViewToggle;
