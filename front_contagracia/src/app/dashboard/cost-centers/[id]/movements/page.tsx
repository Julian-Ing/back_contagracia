'use client';

import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/shared/components/auth';
import { Ruler } from 'lucide-react';
import { CostCenterMovements } from '@/modules/cost-centers';

export default function CostCenterMovementsPage() {
  const params = useParams();
  const router = useRouter();
  const costCenterId = params.id as string;

  return (
    <ProtectedRoute
      permission="cost_centers.movements.view"
      deniedMessage="No tienes permisos para ver movimientos de Centros de Costos."
    >
      <div className="p-6">
        <header className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-lg bg-orange-500 text-white">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centros de Costos</h1>
            <p className="text-sm text-muted-foreground">Movimientos del centro de costos.</p>
          </div>
        </header>

        <CostCenterMovements
          costCenterId={costCenterId}
          onBack={() => router.push('/dashboard/cost-centers')}
        />
      </div>
    </ProtectedRoute>
  );
}
