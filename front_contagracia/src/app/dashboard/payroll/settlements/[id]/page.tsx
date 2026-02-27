'use client';

import { use } from 'react';
import { ProtectedRoute } from '@/shared/components/auth';
import { SettlementWorkspace } from '@/modules/hr/components/payroll/SettlementWorkspace';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SettlementWorkspacePage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <ProtectedRoute permission="payroll_settlements.view" deniedMessage="No tienes permisos para ver Liquidaciones.">
      <div className="p-6">
        <SettlementWorkspace settlementId={id} />
      </div>
    </ProtectedRoute>
  );
}
