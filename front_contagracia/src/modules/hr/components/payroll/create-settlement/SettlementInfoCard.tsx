'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { FileText } from 'lucide-react';
import type { CreateSettlementFormState, SettlementType } from '../../../types';
import { SettlementTypeSelector } from './SettlementTypeSelector';
import { PeriodConfigRegular } from './PeriodConfigRegular';
import { PeriodConfigPrima } from './PeriodConfigPrima';
import { PeriodConfigCesantias } from './PeriodConfigCesantias';
import { PeriodConfigVacaciones } from './PeriodConfigVacaciones';
import { PeriodConfigTerminacion } from './PeriodConfigTerminacion';

interface SettlementInfoCardProps {
  form: CreateSettlementFormState;
  onUpdate: <K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => void;
}

const PERIOD_COMPONENTS: Record<SettlementType, React.ComponentType<{
  form: CreateSettlementFormState;
  onUpdate: <K extends keyof CreateSettlementFormState>(key: K, value: CreateSettlementFormState[K]) => void;
}>> = {
  REGULAR: PeriodConfigRegular,
  PRIMA: PeriodConfigPrima,
  CESANTIAS: PeriodConfigCesantias,
  VACACIONES: PeriodConfigVacaciones,
  TERMINACION: PeriodConfigTerminacion,
};

export function SettlementInfoCard({ form, onUpdate }: SettlementInfoCardProps) {
  const type = form.settlement_type ?? 'REGULAR';
  const PeriodConfig = PERIOD_COMPONENTS[type];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-indigo-500" />
          Datos de la Liquidacion
        </CardTitle>
        <CardDescription>Configura el tipo, periodo y fechas de la liquidacion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Name */}
        <div>
          <Label htmlFor="settlement_name">Nombre de la Liquidacion *</Label>
          <Input
            id="settlement_name"
            placeholder="Ej: Nomina Febrero 2026 Q1"
            value={form.settlement_name}
            onChange={(e) => onUpdate('settlement_name', e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Type selector */}
        <SettlementTypeSelector
          value={type}
          onChange={(v) => onUpdate('settlement_type', v)}
        />

        {/* Dynamic period config */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Periodo de Liquidacion</h3>
          <PeriodConfig form={form} onUpdate={onUpdate} />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            placeholder="Notas adicionales..."
            value={form.notes ?? ''}
            onChange={(e) => onUpdate('notes', e.target.value)}
            rows={2}
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
