'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { CalendarCheck } from 'lucide-react';
import { AccountingPeriodsList } from '@/modules/accounting/components/AccountingPeriodsList';

export default function ClosingPage() {
  return (
    <ProtectedRoute permission="closing.view" deniedMessage="No tienes permisos para ver el Cierre Contable.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-slate-600 text-white">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cierre Contable</h1>
              <p className="text-sm text-muted-foreground">Gestiona los períodos contables y cierres.</p>
            </div>
          </div>
        </header>

        <AccountingPeriodsList />
      </div>
    </ProtectedRoute>
  );
}
