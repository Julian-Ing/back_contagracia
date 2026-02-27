'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { Users } from 'lucide-react';

export default function ThirdPartyLedgerPage() {
  return (
    <ProtectedRoute permission="third_parties.ledger.view" deniedMessage="No tienes permisos para ver el Auxiliar de Tercero.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-pink-500 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auxiliar de Tercero</h1>
              <p className="text-sm text-muted-foreground">Movimientos y saldos por tercero (CxC, CxP).</p>
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
