'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { Layers } from 'lucide-react';

export default function AccountsLedgerPage() {
  return (
    <ProtectedRoute permission="auxiliary_books.view" deniedMessage="No tienes permisos para ver el Auxiliar por Cuentas.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-sky-600 text-white">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auxiliar por Cuentas</h1>
              <p className="text-sm text-muted-foreground">Movimientos y saldos por cuenta de toda la compañía.</p>
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
