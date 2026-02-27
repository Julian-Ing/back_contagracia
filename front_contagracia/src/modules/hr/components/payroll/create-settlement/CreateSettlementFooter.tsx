'use client';

import { Button } from '@/shared/components/ui/button';
import { Loader2, Plus } from 'lucide-react';

interface CreateSettlementFooterProps {
  selectedCount: number;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function CreateSettlementFooter({
  selectedCount,
  submitting,
  onCancel,
  onSubmit,
}: CreateSettlementFooterProps) {
  return (
    <div className="flex items-center justify-between pb-6">
      <Button variant="outline" onClick={onCancel} disabled={submitting}>
        Cancelar
      </Button>
      <Button onClick={onSubmit} disabled={submitting} className="gap-2">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creando...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Crear Liquidacion{selectedCount > 0 ? ` (${selectedCount} empleados)` : ''}
          </>
        )}
      </Button>
    </div>
  );
}
