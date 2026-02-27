'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { FormattedNumber } from '@/shared/components/ui/formatted-number';
import {
  FileText,
  Calculator,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Users,
  List,
  DollarSign,
  History,
} from 'lucide-react';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { usePayrollSettlements } from '../../hooks/usePayrollSettlements';
import {
  SETTLEMENT_STATUS_COLORS,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_TYPE_LABELS,
} from '../../types';
import type { SettlementStatus, SettlementType } from '../../types';

const MONTH_LABELS: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr',
  5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Ago',
  9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
};

export function PayrollDashboard() {
  const router = useRouter();
  const { can } = usePermissions();
  const canCreate = can('payroll_settlements.create');

  const { settlements, total, loading } = usePayrollSettlements({ limit: 5 });

  const stats = useMemo(() => {
    const draft = settlements.filter((s) => s.status === 'DRAFT').length;
    const calculated = settlements.filter((s) => s.status === 'CALCULATED').length;
    const approved = settlements.filter((s) => s.status === 'APPROVED').length;
    return { draft, calculated, approved };
  }, [settlements]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4 text-indigo-500" />
              Total Liquidaciones
            </div>
            <p className="text-2xl font-bold">{loading ? '—' : total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              En Borrador
            </div>
            <p className="text-2xl font-bold text-yellow-600">{loading ? '—' : stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calculator className="h-4 w-4 text-blue-500" />
              Calculadas
            </div>
            <p className="text-2xl font-bold text-blue-600">{loading ? '—' : stats.calculated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aprobadas
            </div>
            <p className="text-2xl font-bold text-green-600">{loading ? '—' : stats.approved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content: Recent + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Settlements */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Liquidaciones Recientes</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/payroll/settlements')}
              >
                Ver Todas
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
              </div>
            ) : settlements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No hay liquidaciones aun.</p>
                {canCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => router.push('/dashboard/payroll/settlements/new')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Crear Primera Liquidacion
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {settlements.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-indigo-400/60 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/payroll/settlements/${s.id}`)}
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.settlement_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {SETTLEMENT_TYPE_LABELS[s.settlement_type as SettlementType] ?? s.settlement_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {MONTH_LABELS[s.month] ?? s.month}/{s.year}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-sm">
                        <FormattedNumber value={s.total_net_salary ?? 0} type="currency" />
                      </p>
                      <Badge className={`text-[10px] mt-0.5 ${SETTLEMENT_STATUS_COLORS[s.status as SettlementStatus]}`}>
                        {SETTLEMENT_STATUS_LABELS[s.status as SettlementStatus] ?? s.status}
                      </Badge>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acciones Rapidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canCreate && (
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => router.push('/dashboard/payroll/settlements/new')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Liquidacion
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/payroll/settlements')}
            >
              <List className="h-4 w-4 mr-2" />
              Ver Liquidaciones
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/payroll/employee-history')}
            >
              <History className="h-4 w-4 mr-2" />
              Historial por Empleado
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/employees')}
            >
              <Users className="h-4 w-4 mr-2" />
              Gestionar Empleados
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
