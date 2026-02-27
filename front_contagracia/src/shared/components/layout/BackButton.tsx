'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function BackButton() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Verificar si hay historial de navegación
    setCanGoBack(typeof window !== 'undefined' && window.history.length > 1);
  }, []);

  const handleBack = () => {
    if (canGoBack) {
      router.back();
    }
  };

  const tooltipText = canGoBack ? 'Ir a la página anterior' : 'No hay página anterior';

  return (
    <div className="fixed bottom-2 right-1 z-40">
      <div className="relative">
        <Button
          onClick={handleBack}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          variant="secondary"
          size="icon"
          className="rounded-full shadow-lg h-10 w-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4 text-slate-700 dark:text-slate-200" />
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
              {tooltipText}
              {/* Flecha del tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-slate-700" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default BackButton;
