'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { Banknote } from 'lucide-react';
import { TaxesList } from '@/modules/taxes';

export default function TaxWithholdingsPage() {
  return (
    <ProtectedRoute permission="tax.rates.view" deniedMessage="No tienes permisos para ver Impuestos y Retenciones.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-purple-500 text-white">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Impuestos y Retenciones</h1>
              <p className="text-sm text-muted-foreground">Cambia porcentajes de impuestos, crea y elimina.</p>
            </div>
          </div>
        </header>

        <TaxesList />
      </div>
    </ProtectedRoute>
  );
}
