'use client';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowLeft, XCircle, Trash2 } from 'lucide-react';
import {
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_TYPE_LABELS,
} from '../../../types';
import type { PayrollSettlement, SettlementStatus, SettlementType } from '../../../types';

const TYPE_GRADIENT: Record<string, string> = {
  REGULAR: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
  PRIMA: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  VACACIONES: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
  CESANTIAS: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  INTERESES_CESANTIAS: 'bg-gradient-to-r from-violet-500 to-purple-500 text-white',
  LIQUIDACION: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
};

interface WorkspaceHeaderProps {
  settlement: PayrollSettlement;
  canVoid: boolean;
  canDelete: boolean;
  onBack: () => void;
  onVoid: () => void;
  onDelete: () => void;
}

export function WorkspaceHeader({
  settlement,
  canVoid,
  canDelete,
  onBack,
  onVoid,
  onDelete,
}: WorkspaceHeaderProps) {
  const isDraft = settlement.status === 'DRAFT';
  const isCancelled = settlement.status === 'CANCELLED';
  const typeGradient =
    TYPE_GRADIENT[settlement.settlement_type] ??
    'bg-gradient-to-r from-gray-500 to-gray-600 text-white';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {settlement.settlement_name}
          </h1>
          <p className="text-muted-foreground">
            {settlement.settlement_number ? `#${settlement.settlement_number} · ` : ''}
            Periodo {settlement.month}/{settlement.year} - Q{settlement.period_number}
            {' · '}{settlement.total_employees} empleados
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Badge className={`${typeGradient} font-semibold px-3 py-1 text-sm`}>
          {SETTLEMENT_TYPE_LABELS[settlement.settlement_type as SettlementType] ??
            settlement.settlement_type}
        </Badge>
        <Badge className={SETTLEMENT_STATUS_COLORS[settlement.status as SettlementStatus]}>
          {SETTLEMENT_STATUS_LABELS[settlement.status as SettlementStatus] ?? settlement.status}
        </Badge>
        {!isCancelled && !isDraft && canVoid && (
          <Button size="sm" variant="destructive" onClick={onVoid}>
            <XCircle className="h-4 w-4 mr-1" />
            Anular
          </Button>
        )}
        {isDraft && canDelete && (
          <Button size="sm" variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}
