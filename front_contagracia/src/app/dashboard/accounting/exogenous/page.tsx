'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { FileSpreadsheet } from 'lucide-react';

export default function ExogenousPage() {
  return (
    <ProtectedRoute permission="exogenous.view" deniedMessage="No tienes permisos para ver la Información Exógena.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-violet-600 text-white">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Información Exógena</h1>
              <p className="text-sm text-muted-foreground">Genera y descarga formatos exógenos DIAN.</p>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-gray-500">
          <p>Página en construcción...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
