'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { FileDigit } from 'lucide-react';

export default function TaxReportsPage() {
  return (
    <ProtectedRoute permission="tax_reports.view" deniedMessage="No tienes permisos para ver los Reportes de Impuestos.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-green-600 text-white">
              <FileDigit className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reporte de Impuestos</h1>
              <p className="text-sm text-muted-foreground">Prepara declaraciones de impuestos.</p>
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
