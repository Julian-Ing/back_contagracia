'use client';

import { ProtectedRoute } from '@/shared/components/auth';
import { DollarSign } from 'lucide-react';
import { PayrollDashboard } from '@/modules/hr/components/payroll/PayrollDashboard';

export default function PayrollPage() {
  return (
    <ProtectedRoute permission="payroll_settlements.view" deniedMessage="No tienes permisos para ver Nomina.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nomina</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona las liquidaciones de nomina de tu empresa.
              </p>
            </div>
          </div>
        </header>

        <PayrollDashboard />
      </div>
    </ProtectedRoute>
  );
}
