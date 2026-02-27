'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { ClipboardList, Calendar, Hash, User, Clock, FileText, CreditCard } from 'lucide-react';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { PayrollTooltipCustom } from '../PayrollTooltip';
import type { PayrollTooltipInfo } from '../../../constants/payroll-tooltips';
import {
  SETTLEMENT_TYPE_LABELS,
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
} from '../../../types';
import type { PayrollSettlement, SettlementType, SettlementStatus } from '../../../types';

interface ProcessingMetadataProps {
  settlement: PayrollSettlement;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface MetaItem {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  tooltip?: { info: PayrollTooltipInfo; color: string };
}

const META_TOOLTIPS: Record<string, { info: PayrollTooltipInfo; color: string }> = {
  Tipo: {
    info: {
      title: 'Tipo de Liquidacion',
      description: 'Define el tipo de procesamiento de nomina: Quincenal (Q1/Q2), Mensual, Prima, Cesantias, Vacaciones, o Liquidacion definitiva.',
      note: 'El tipo determina que conceptos se calculan y como se distribuyen los periodos.',
    },
    color: 'bg-slate-600',
  },
  Estado: {
    info: {
      title: 'Estado de la Liquidacion',
      description: 'BORRADOR: En preparacion, editable. CALCULADA: Nomina procesada, pendiente revision. APROBADA: Revisada y lista para pago. PAGADA: Transferencias realizadas. ANULADA: Cancelada sin efecto.',
      note: 'Solo las liquidaciones en estado BORRADOR pueden ser recalculadas.',
    },
    color: 'bg-slate-600',
  },
  Periodo: {
    info: {
      title: 'Periodo de Nomina',
      description: 'Formato YYYY-MM QN donde N indica la quincena. Q1 = dias 1-15, Q2 = dias 16-30/31 del mes.',
      note: 'Para liquidaciones mensuales, el periodo cubre el mes completo.',
    },
    color: 'bg-slate-600',
  },
};

export function ProcessingMetadata({ settlement }: ProcessingMetadataProps) {
  // Build items, filtering out empty values
  const allItems: (MetaItem | null)[] = [
    {
      icon: Hash,
      iconColor: 'text-indigo-500',
      label: 'Numero',
      value: settlement.settlement_number ?? 'Pendiente',
    },
    {
      icon: FileText,
      iconColor: 'text-blue-500',
      label: 'Estado',
      value: (
        <Badge className={SETTLEMENT_STATUS_COLORS[settlement.status as SettlementStatus]}>
          {SETTLEMENT_STATUS_LABELS[settlement.status as SettlementStatus] ?? settlement.status}
        </Badge>
      ),
      tooltip: META_TOOLTIPS['Estado'],
    },
    {
      icon: ClipboardList,
      iconColor: 'text-purple-500',
      label: 'Tipo',
      value: (
        <Badge variant="outline">
          {SETTLEMENT_TYPE_LABELS[settlement.settlement_type as SettlementType] ?? settlement.settlement_type}
        </Badge>
      ),
      tooltip: META_TOOLTIPS['Tipo'],
    },
    {
      icon: Calendar,
      iconColor: 'text-cyan-500',
      label: 'Periodo',
      value: `${settlement.year}-${String(settlement.month).padStart(2, '0')} Q${settlement.period_number}`,
      tooltip: META_TOOLTIPS['Periodo'],
    },
    {
      icon: Calendar,
      iconColor: 'text-teal-500',
      label: 'Rango',
      value: (() => {
        const start = formatDateShort(settlement.start_date);
        const end = formatDateShort(settlement.end_date);
        return start && end ? `${start} — ${end}` : null;
      })(),
    },
    settlement.payment_date ? {
      icon: CreditCard,
      iconColor: 'text-green-500',
      label: 'Fecha de Pago',
      value: formatDateShort(settlement.payment_date),
    } : null,
    settlement.calculated_at ? {
      icon: Clock,
      iconColor: 'text-orange-500',
      label: 'Calculado',
      value: formatDate(settlement.calculated_at),
    } : null,
    settlement.approved_by_id ? {
      icon: User,
      iconColor: 'text-emerald-500',
      label: 'Aprobado por',
      value: settlement.approved_by_id,
    } : null,
    settlement.approved_at ? {
      icon: Clock,
      iconColor: 'text-emerald-500',
      label: 'Fecha Aprobacion',
      value: formatDate(settlement.approved_at),
    } : null,
    {
      icon: Calendar,
      iconColor: 'text-gray-500',
      label: 'Creado',
      value: formatDate(settlement.created_at),
    },
  ];

  const items = allItems.filter((item): item is MetaItem => item !== null && item.value !== null);

  return (
    <TooltipProvider delayDuration={200}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-indigo-500" />
            Informacion del Procesamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {items.map(({ icon: Icon, iconColor, label, value, tooltip }) => (
              <div key={label} className="rounded-lg border border-border bg-muted/50 dark:bg-muted/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                  {label}
                  {tooltip && <PayrollTooltipCustom info={tooltip.info} color={tooltip.color} />}
                </div>
                <div className="text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>
          {settlement.notes && (
            <div className="mt-3 rounded-lg border border-border bg-muted/50 dark:bg-muted/20 p-3">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1.5">Notas</p>
              <p className="text-sm">{settlement.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
