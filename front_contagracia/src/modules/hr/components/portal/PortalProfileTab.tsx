'use client';

import { UserCircle, Briefcase, Calendar, CreditCard, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import { usePortalProfile } from '../../hooks/useEmployeePortal';

export function PortalProfileTab() {
  const { profile, loading, error } = usePortalProfile();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Cargando perfil...
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

  if (!profile) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-primary" />
            Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Nombre" value={profile.full_name} />
          <Row label="Documento" value={`${profile.document_type ?? ''} ${profile.document ?? ''}`} />
          <Row label="Email" value={profile.email} />
          <Row label="Teléfono" value={profile.phone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Información Laboral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Cargo" value={profile.position} />
          <Row label="Tipo contrato" value={profile.contract_type} />
          <Row label="Tipo trabajador" value={profile.worker_type_code} />
          <Row
            label="Estado"
            value={
              <span className={profile.is_active ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                {profile.is_active ? 'Activo' : 'Inactivo'}
              </span>
            }
          />
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
          <Row
            label="Fecha de ingreso"
            value={profile.start_date ? new Date(profile.start_date + 'T12:00:00').toLocaleDateString('es-CO') : null}
          />
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
            value={profile.salary != null ? <FormattedNumber value={profile.salary} type="currency" /> : null}
          />
          <Row label="Tipo de salario" value={profile.salary_type} />
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
