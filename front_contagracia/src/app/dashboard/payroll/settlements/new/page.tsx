'use client';

import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { CreateSettlementForm } from '@/modules/hr/components/payroll/CreateSettlementForm';

export default function NewSettlementPage() {
  const router = useRouter();

  return (
    <ProtectedRoute permission="payroll_settlements.create" deniedMessage="No tienes permisos para crear Liquidaciones.">
      <div className="p-6">
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/payroll/settlements')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 grid place-items-center rounded-lg bg-indigo-500 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nueva Liquidacion</h1>
              <p className="text-sm text-muted-foreground">
                Configura y crea una nueva liquidacion de nomina.
              </p>
            </div>
          </div>
        </header>

        <CreateSettlementForm />
      </div>
    </ProtectedRoute>
  );
}
