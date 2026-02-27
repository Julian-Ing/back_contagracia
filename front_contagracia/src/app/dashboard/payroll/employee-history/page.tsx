'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, History } from 'lucide-react';
import { EmployeePayrollHistory } from '@/modules/hr/components/payroll/EmployeePayrollHistory';

export default function EmployeeHistoryPage() {
  const router = useRouter();

  return (
    <ProtectedRoute permission="payroll_settlements.view" deniedMessage="No tienes permisos para ver Liquidaciones.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/payroll')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial por Empleado</h1>
              <p className="text-sm text-muted-foreground">
                Busca un empleado para ver todas sus liquidaciones de nomina.
              </p>
            </div>
          </div>
        </header>

        <EmployeePayrollHistory />
      </div>
    </ProtectedRoute>
  );
}
