'use client';

import { FileText, Calendar, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { usePortalContract } from '../../hooks/useEmployeePortal';

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  INDEFINIDO: 'Indefinido',
  FIJO: 'Fijo',
  OBRA_LABOR: 'Obra o Labor',
  PRESTACION_SERVICIOS: 'Prestación de Servicios',
  APRENDIZAJE: 'Aprendizaje',
};

const SALARY_TYPE_LABELS: Record<string, string> = {
  ORDINARIO: 'Ordinario',
  INTEGRAL: 'Integral',
};

export function PortalContractTab() {
  const { contract, loading, error } = usePortalContract();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Cargando contrato...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 text-red-800 dark:text-red-300 text-sm">
        {error}
      </div>
    );
  }

  if (!contract?.contract) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <FileText className="h-10 w-10 opacity-30" />
        <p className="text-sm">{contract?.message ?? 'No tienes un contrato activo registrado'}</p>
      </div>
    );
  }

  const c = contract.contract;
  const fmt = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CO') : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Detalles del Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Tipo de contrato" value={CONTRACT_TYPE_LABELS[c.contract_type] ?? c.contract_type} />
          <Row label="Tipo de salario" value={SALARY_TYPE_LABELS[c.salary_type] ?? c.salary_type} />
          <Row label="Tipo de trabajador" value={c.worker_type_code} />
          {c.notes && <Row label="Observaciones" value={c.notes} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Fechas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Fecha inicio" value={fmt(c.start_date)} />
          <Row label="Fecha fin" value={fmt(c.end_date) ?? <span className="text-emerald-600">Indefinido</span>} />
          <Row label="Fin periodo prueba" value={fmt(c.trial_end_date)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Salario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row
            label="Salario base"
            value={<FormattedNumber value={c.base_salary} type="currency" />}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value ?? <span className="text-muted-foreground italic">—</span>}</span>
    </div>
  );
}
